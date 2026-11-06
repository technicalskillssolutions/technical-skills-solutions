import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Keep the PDF.js worker on the same origin as the deployed static site.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.394/build/pdf.worker.min.mjs';

const $ = (id: string): any => document.getElementById(id);
const MAX_PDF_PAGES = 1000;
const MAX_FILE_BYTES = 300 * 1024 * 1024;
const MAX_CANVAS_PIXELS = 16_000_000;
const MAX_CANVAS_EDGE = 10_000;
const RESULT_DB_NAME = 'tss-ocr-results-v2';
const RESULT_DB_VERSION = 1;
const allowedLanguages = new Set(['eng+hin', 'hin', 'eng', 'ben', 'guj', 'mar', 'pan', 'tam', 'tel', 'urd', 'san']);

let worker = null;
let workerLanguage = '';
let busy = false;
let pauseRequested = false;
let cancelled = false;
let resumeWaiter = null;
let resultDbPromise = null;
const pendingResultWrites = new Set();
let failedPages = [];
let activeFiles = [];
let completedUnits = 0;
let totalUnits = 0;
let storageWarning = false;

function announce(message) {
  const region = $('live-region');
  if (region) region.textContent = message;
}

function setStatus(message, detail = '') {
  const status = $('ocr-status');
  if (status) status.textContent = detail ? `${message} ${detail}` : message;
  announce(message);
}

function updateProgress() {
  const bar = $('ocr-progress');
  if (!bar) return;
  bar.value = totalUnits > 0 ? Math.min(100, Math.round((completedUnits / totalUnits) * 100)) : 0;
  bar.setAttribute('aria-valuetext', `${completedUnits} of ${totalUnits} pages processed`);
}

function openResultDatabase() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB is unavailable.'));
  if (!resultDbPromise) {
    resultDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(RESULT_DB_NAME, RESULT_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('pages')) db.createObjectStore('pages', { autoIncrement: true });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open the OCR result database.'));
      request.onblocked = () => reject(new Error('The OCR result database is blocked by another tab.'));
    }).catch(error => { resultDbPromise = null; throw error; });
  }
  return resultDbPromise;
}

function persistPageResult(text) {
  const task = openResultDatabase().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction('pages', 'readwrite');
    transaction.objectStore('pages').add({ text, savedAt: Date.now() });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Could not save an OCR page.'));
    transaction.onabort = () => reject(transaction.error || new Error('OCR result save was aborted.'));
  }));
  const settled = task.catch(() => {
    if (!storageWarning) {
      storageWarning = true;
      setStatus('OCR is continuing, but browser storage could not save a page. Download the TXT result before closing this tab.');
    }
  }).then(() => undefined).finally(() => pendingResultWrites.delete(settled));
  pendingResultWrites.add(settled);
  return settled;
}

async function flushResultWrites() {
  if (pendingResultWrites.size) await Promise.allSettled([...pendingResultWrites]);
}

async function restoreSavedResults() {
  const output = $('ocr-output');
  if (!output) return;
  try {
    const db = await openResultDatabase();
    const rows: Array<{ text: string }> = await new Promise<Array<{ text: string }>>((resolve, reject) => {
      const transaction = db.transaction('pages', 'readonly');
      const request = transaction.objectStore('pages').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('Could not restore saved OCR results.'));
    });
    if (rows.length) {
      output.value = rows.map(row => row.text).join('\n\n');
      setStatus(`Restored ${rows.length} saved OCR page result(s) from this browser. Select the original files again to continue OCR.`);
    }
  } catch {
    // OCR still works if the browser blocks persistent storage.
  }
}

function appendOutput(text) {
  const output = $('ocr-output');
  if (!output || !text) return;
  output.value += `${output.value ? '\n\n' : ''}${text}`;
}

function refreshRetryButton() {
  const button = $('ocr-retry');
  if (!button) return;
  button.textContent = `Retry failed pages (${failedPages.length})`;
  button.disabled = busy || failedPages.length === 0;
}

function setRunningState(running) {
  busy = running;
  for (const id of ['ocr-start', 'ocr-file', 'ocr-language', 'ocr-mode', 'ocr-scale', 'ocr-batch', 'ocr-clear']) {
    const element = $(id);
    if (element) element.disabled = running;
  }
  if ($('ocr-pause')) $('ocr-pause').disabled = !running || pauseRequested;
  if ($('ocr-resume')) $('ocr-resume').disabled = !running || !pauseRequested;
  if ($('ocr-cancel')) $('ocr-cancel').disabled = !running;
  refreshRetryButton();
}

async function waitIfPaused() {
  while (pauseRequested && !cancelled) {
    setStatus('OCR paused. Press Resume to continue, or Cancel to stop.');
    await new Promise(resolve => { resumeWaiter = resolve; });
    resumeWaiter = null;
  }
}

async function ensureWorker(language) {
  if (!allowedLanguages.has(language)) throw new Error('Choose a supported recognition language.');
  if (worker && workerLanguage === language) return worker;
  if (worker) {
    await worker.terminate();
    worker = null;
    workerLanguage = '';
  }
  setStatus('Preparing the local OCR engine…');
  // Tesseract.js supplies the local recognition runtime; language data is cached in IndexedDB.
  // Let Tesseract.js resolve its version-matched worker and WASM core from
  // its official CDN defaults. No stale Colab/Cloudflare tunnel or missing
  // /wasm files are required. OCR image/PDF bytes stay in this browser.
  worker = await createWorker(language.split('+'), 1, {
    // Pin the worker and WASM runtime to the same Tesseract.js release.
    // Explicit URLs avoid bundler-relative worker paths on static GitHub Pages.
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    cacheMethod: 'write',
    cachePath: 'tss-tesseract-v7',
    gzip: true,
    logger: progress => {
      if (progress?.status && progress.status !== 'recognizing text') { const statusNode = $('ocr-status'); if (statusNode) statusNode.textContent = `OCR engine: ${progress.status}${Number.isFinite(progress.progress) ? ` ${Math.round(progress.progress * 100)}%` : ''}`; }
    },
    errorHandler: error => console.error('Tesseract OCR worker error:', error)
  });
  workerLanguage = language;
  await worker.setParameters({
    tessedit_pageseg_mode: '3',
    preserve_interword_spaces: '1',
    user_defined_dpi: '300'
  });
  return worker;
}

async function resetRecognitionWorker() {
  if (worker) {
    try { await worker.terminate(); } catch {}
  }
  worker = null;
  workerLanguage = '';
}

function enhanceImage(imageData, mode) {
  // Image preprocessing is implemented in JavaScript; no custom native module is built.
  jsEnhance(imageData, mode === 3 ? 2 : mode);
  return imageData;
}

function otsuThreshold(histogram, total) {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let sumBackground = 0;
  let weightBackground = 0;
  let bestVariance = -1;
  let threshold = 128;
  for (let i = 0; i < 256; i++) {
    weightBackground += histogram[i];
    if (weightBackground === 0) continue;
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;
    sumBackground += i * histogram[i];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (variance > bestVariance) { bestVariance = variance; threshold = i; }
  }
  return threshold;
}

function jsEnhance(imageData, mode) {
  const data = imageData.data;
  const histogram = new Uint32Array(256);
  const gray = new Uint8Array(data.length / 4);
  for (let pixel = 0, offset = 0; offset < data.length; pixel++, offset += 4) {
    const value = Math.round(data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114);
    gray[pixel] = value;
    histogram[value]++;
  }
  const total = gray.length;
  let low = 0;
  let high = 255;
  const clip = Math.floor(total * 0.015);
  let sum = 0;
  for (let i = 0; i < 256; i++) { sum += histogram[i]; if (sum > clip) { low = i; break; } }
  sum = 0;
  for (let i = 255; i >= 0; i--) { sum += histogram[i]; if (sum > clip) { high = i; break; } }
  const threshold = mode === 2 ? otsuThreshold(histogram, total) : 0;
  const span = Math.max(1, high - low);
  for (let pixel = 0, offset = 0; offset < data.length; pixel++, offset += 4) {
    let value = mode === 0 ? gray[pixel] : Math.max(0, Math.min(255, Math.round(((gray[pixel] - low) / span) * 255)));
    if (mode === 2) value = value > threshold ? 255 : 0;
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = 255;
  }
  return imageData;
}

async function prepareImageBlob(source, scale, variant = 'original') {
  const bitmap = await createImageBitmap(source);
  const factor = Math.min(scale, 3, MAX_CANVAS_EDGE / Math.max(bitmap.width, bitmap.height), Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, bitmap.width * bitmap.height)));
  const width = Math.max(1, Math.round(bitmap.width * factor));
  const height = Math.max(1, Math.round(bitmap.height * factor));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) { bitmap.close(); throw new Error('This browser could not create an image-processing canvas.'); }
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  if (variant !== 'original') {
    const imageData = context.getImageData(0, 0, width, height);
    const mode = variant === 'contrast' ? 1 : variant === 'otsu' ? 2 : 3;
    enhanceImage(imageData, mode);
    context.putImageData(imageData, 0, 0);
  }

  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not prepare the page image.')), 'image/png'));
  canvas.width = 1;
  canvas.height = 1;
  return blob;
}

async function recognizeVariants(recognitionWorker, imageBlob, mode, scale) {
  const variants = mode === 'fast' ? ['original'] : mode === 'balanced' ? ['original', 'contrast', 'adaptive'] : ['original', 'contrast', 'otsu', 'adaptive'];
  let best = null;
  const errors = [];
  for (const variant of variants) {
    try {
      const blob = variant === 'original'
        ? await prepareImageBlob(imageBlob, scale, 'original')
        : await prepareImageBlob(imageBlob, scale, variant);
      const result = await recognitionWorker.recognize(blob);
      const confidence = Number(result?.data?.confidence ?? 0);
      const text = String(result?.data?.text || '').trim();
      if (!best || confidence > best.confidence || (text.length > best.text.length && confidence >= best.confidence - 5)) {
        best = { text, confidence, variant };
      }
    } catch (error) {
      errors.push(`${variant}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!best) throw new Error(`Every OCR recognition pass failed. ${errors.join(' | ') || 'No result was returned by the OCR engine.'}`);
  return best;
}

function textFromPdfItems(items) {
  const lines = new Map();
  for (const item of items || []) {
    if (!item || typeof item.str !== 'string' || !item.str.trim()) continue;
    const y = Math.round(Number(item.transform?.[5] || 0));
    const line = lines.get(y) || [];
    line.push({ x: Number(item.transform?.[4] || 0), text: item.str });
    lines.set(y, line);
  }
  return [...lines.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, line]) => line.sort((a, b) => a.x - b.x).map(item => item.text).join(' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean).join('\n');
}

async function renderPdfPage(page, renderScale = 1) {
  const initial = page.getViewport({ scale: 1 });
  const factor = Math.min(renderScale, 2, MAX_CANVAS_EDGE / Math.max(initial.width, initial.height), Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, initial.width * initial.height)));
  const viewport = page.getViewport({ scale: factor });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  try {
    const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!context) throw new Error('This browser could not create a PDF page canvas.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    return await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not render PDF page image.')), 'image/png'));
  } finally {
    canvas.width = 1;
    canvas.height = 1;
  }
}

function appendPage(fileName, pageNumber, text, note = '') {
  const header = `===== ${fileName} — Page ${pageNumber}${note ? ` — ${note}` : ''} =====`;
  const record = `${header}\n${text || '[No text was recognized on this page.]'}`;
  appendOutput(record);
  void persistPageResult(record);
}

async function processImage(file, settings, pageNumber = 1) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const retrySettings = attempt === 1 ? settings : { ...settings, mode: 'fast', scale: Math.min(settings.scale, 1.5) };
      const recognitionWorker = await ensureWorker(settings.language);
      const result = await recognizeVariants(recognitionWorker, file, retrySettings.mode, retrySettings.scale);
      appendPage(file.name, pageNumber, result.text, `${Math.round(result.confidence)}% confidence estimate; ${result.variant}`);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt === 1) await resetRecognitionWorker();
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Image OCR failed twice.');
}

async function processPdfPageOnce(pdf, pageNumber, file, settings) {
  const page = await pdf.getPage(pageNumber);
  try {
    let embedded = '';
    try {
      const content = await page.getTextContent({ includeMarkedContent: false });
      embedded = textFromPdfItems(content.items);
    } catch (error) {
      console.warn(`PDF text-layer extraction failed on ${file.name}, page ${pageNumber}; trying image OCR.`, error);
    }
    const usable = embedded.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/g, '').trim();
    if (usable.length >= 8) {
      appendPage(file.name, pageNumber, embedded, 'embedded PDF text');
      return;
    }

    const renderScales = [1, 0.8];
    const renderErrors = [];
    for (const renderScale of renderScales) {
      try {
        const pageBlob = await renderPdfPage(page, renderScale);
        const recognitionWorker = await ensureWorker(settings.language);
        const result = await recognizeVariants(recognitionWorker, pageBlob, settings.mode, settings.scale);
        appendPage(file.name, pageNumber, result.text, `${Math.round(result.confidence)}% confidence estimate; ${result.variant}`);
        return;
      } catch (error) {
        renderErrors.push(error instanceof Error ? error.message : String(error));
      }
    }
    throw new Error(`PDF page rendering or recognition failed after two render attempts. ${renderErrors.join(' | ')}`);
  } finally {
    try { page.cleanup(); } catch {}
  }
}

async function processPdfPage(pdf, pageNumber, file, settings) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const retrySettings = attempt === 1
        ? settings
        : { ...settings, mode: 'fast', scale: Math.min(settings.scale, 1.5) };
      await processPdfPageOnce(pdf, pageNumber, file, retrySettings);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        setStatus(`${file.name}, page ${pageNumber}: first attempt failed; restarting the OCR engine and retrying with a lower-memory setting.`);
        await resetRecognitionWorker();
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('PDF page processing failed twice.');
}

async function preflightFiles(files) {
  const jobs = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      setStatus(`Skipped ${file.name}: file is larger than 300 MB.`);
      continue;
    }
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      let pdf = null;
      try {
        pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false, useSystemFonts: true, stopAtErrors: false, maxImageSize: 16_000_000 }).promise;
        if (pdf.numPages > MAX_PDF_PAGES) {
          setStatus(`Skipped ${file.name}: it contains ${pdf.numPages} pages; the per-PDF limit is ${MAX_PDF_PAGES}.`);
          await pdf.destroy();
          continue;
        }
        jobs.push({ file, type: 'pdf', pages: pdf.numPages });
        await pdf.destroy();
      } catch (error) {
        if (pdf) { try { await pdf.destroy(); } catch {} }
        setStatus(`Skipped ${file.name}: PDF could not be opened. ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (file.type.startsWith('image/')) {
      jobs.push({ file, type: 'image', pages: 1 });
    } else {
      setStatus(`Skipped ${file.name}: choose a PDF or supported image file.`);
    }
  }
  return jobs;
}

async function runJobs(jobs, settings) {
  const batchSize = settings.batchSize;
  for (const job of jobs) {
    if (cancelled) break;
    if (job.type === 'image') {
      await waitIfPaused();
      if (cancelled) break;
      try { await processImage(job.file, settings); }
      catch (error) { failedPages.push({ ...job, pageNumber: 1, settings }); appendPage(job.file.name, 1, `OCR failed: ${error instanceof Error ? error.message : String(error)}`); }
      completedUnits++;
      updateProgress();
      await flushResultWrites();
      continue;
    }

    let pdf = null;
    try {
      pdf = await pdfjsLib.getDocument({ data: await job.file.arrayBuffer(), isEvalSupported: false, useSystemFonts: true, stopAtErrors: false, maxImageSize: 16_000_000 }).promise;
      const batches = Math.ceil(job.pages / batchSize);
      for (let start = 1; start <= job.pages && !cancelled; start += batchSize) {
        const end = Math.min(job.pages, start + batchSize - 1);
        setStatus(`${job.file.name}: batch ${Math.ceil(start / batchSize)} of ${batches}, pages ${start} to ${end}.`);
        for (let pageNumber = start; pageNumber <= end && !cancelled; pageNumber++) {
          await waitIfPaused();
          if (cancelled) break;
          try { await processPdfPage(pdf, pageNumber, job.file, settings); }
          catch (error) {
            failedPages.push({ file: job.file, type: 'pdf', pageNumber, settings });
            appendPage(job.file.name, pageNumber, `OCR failed: ${error instanceof Error ? error.message : String(error)}`);
          }
          completedUnits++;
          updateProgress();
        }
        await flushResultWrites();
      }
    } finally {
      if (pdf) { try { await pdf.destroy(); } catch {} }
    }
  }
}

async function processFailedPage(item) {
  if (item.type === 'image') return processImage(item.file, item.settings, item.pageNumber);
  const pdf = await pdfjsLib.getDocument({ data: await item.file.arrayBuffer(), isEvalSupported: false, useSystemFonts: true, stopAtErrors: false, maxImageSize: 16_000_000 }).promise;
  try { await processPdfPage(pdf, item.pageNumber, item.file, item.settings); }
  finally { await pdf.destroy(); }
}

async function startProcessing() {
  if (busy) return;
  const input = $('ocr-file');
  const files = Array.from(input?.files || []);
  if (!files.length) { setStatus('Choose at least one image or PDF file.'); input?.focus(); return; }
  const settings = {
    language: $('ocr-language')?.value || 'eng+hin',
    mode: $('ocr-mode')?.value || 'balanced',
    scale: Number($('ocr-scale')?.value || 2),
    batchSize: Number($('ocr-batch')?.value || 10)
  };
  if (!allowedLanguages.has(settings.language)) { setStatus('Choose a supported recognition language.'); return; }
  cancelled = false;
  pauseRequested = false;
  failedPages = [];
  completedUnits = 0;
  setRunningState(true);
  setStatus('Checking selected files and page counts…');
  try {
    const jobs = await preflightFiles(files);
    totalUnits = jobs.reduce((sum, job) => sum + job.pages, 0);
    updateProgress();
    if (!jobs.length) { setStatus('No valid files are ready for OCR. Check the file formats and page limits.'); return; }
    activeFiles = files;
    setStatus(`Ready to process ${totalUnits} page(s) in sequential batches of ${settings.batchSize}; each PDF may contain up to ${MAX_PDF_PAGES} pages.`);
    await runJobs(jobs, settings);
    await flushResultWrites();
    if (cancelled) setStatus(`Processing cancelled after ${completedUnits} of ${totalUnits} pages.`);
    else setStatus(`Processing finished. ${completedUnits} of ${totalUnits} pages processed; ${failedPages.length} page(s) failed and can be retried.`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    setStatus(`OCR could not continue: ${detail}. Check that this site is online and the OCR worker/language files are not blocked by a browser extension or network filter.`);
  } finally {
    await flushResultWrites();
    pauseRequested = false;
    resumeWaiter?.();
    setRunningState(false);
    refreshRetryButton();
  }
}

async function retryFailedPages() {
  if (busy || !failedPages.length) return;
  cancelled = false;
  pauseRequested = false;
  const pending = [...failedPages];
  failedPages = [];
  setRunningState(true);
  try {
    for (const item of pending) {
      await waitIfPaused();
      if (cancelled) { failedPages.push(item); continue; }
      try {
        setStatus(`Retrying ${item.file.name}, page ${item.pageNumber}.`);
        await processFailedPage(item);
      } catch {
        failedPages.push(item);
      }
    }
    setStatus(cancelled ? `Retry cancelled. ${failedPages.length} page(s) remain failed.` : `Retry finished. ${failedPages.length} page(s) still need attention.`);
  } finally {
    await flushResultWrites();
    pauseRequested = false;
    resumeWaiter?.();
    setRunningState(false);
    refreshRetryButton();
  }
}

function setupControls() {
  const start = $('ocr-start');
  start?.addEventListener('click', () => { void startProcessing(); });
  $('ocr-pause')?.addEventListener('click', () => {
    if (!busy || pauseRequested) return;
    pauseRequested = true;
    if ($('ocr-pause')) $('ocr-pause').disabled = true;
    if ($('ocr-resume')) $('ocr-resume').disabled = false;
    setStatus('Pause requested. The current page will finish before processing pauses.');
  });
  $('ocr-resume')?.addEventListener('click', () => {
    if (!pauseRequested) return;
    pauseRequested = false;
    if ($('ocr-pause')) $('ocr-pause').disabled = false;
    if ($('ocr-resume')) $('ocr-resume').disabled = true;
    resumeWaiter?.();
    setStatus('OCR resumed.');
  });
  $('ocr-cancel')?.addEventListener('click', () => {
    cancelled = true;
    pauseRequested = false;
    resumeWaiter?.();
    setStatus('Cancel requested. The current page will finish before OCR stops.');
  });
  $('ocr-retry')?.addEventListener('click', () => { void retryFailedPages(); });
  $('ocr-copy')?.addEventListener('click', async () => {
    const text = $('ocr-output')?.value || '';
    if (!text) { setStatus('There is no recognized text to copy.'); return; }
    try { await navigator.clipboard.writeText(text); setStatus('Recognized text copied.'); }
    catch { setStatus('Clipboard is unavailable. Select the output text and copy it manually.'); }
  });
  $('ocr-download')?.addEventListener('click', () => {
    const text = $('ocr-output')?.value || '';
    if (!text) { setStatus('There is no recognized text to download.'); return; }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'technical-skills-solutions-ocr.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('OCR text download started.');
  });
  $('ocr-clear')?.addEventListener('click', () => {
    if (busy) return;
    if ($('ocr-output')) $('ocr-output').value = '';
    if ($('ocr-file')) $('ocr-file').value = '';
    void openResultDatabase().then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction('pages', 'readwrite');
      transaction.objectStore('pages').clear();
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    })).catch(() => setStatus('Visible OCR results cleared. Browser storage could not be cleared.'));
    failedPages = [];
    completedUnits = 0;
    totalUnits = 0;
    updateProgress();
    refreshRetryButton();
    setStatus('OCR results cleared.');
  });
  void restoreSavedResults();
}

setupControls();
window.addEventListener('pagehide', () => {
  if (worker) { const current = worker; worker = null; void current.terminate(); }
}, { once: true });

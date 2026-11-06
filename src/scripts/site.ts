import { parseHttpDestination } from '../lib/shortener.js';
const APP_NAME = 'Technical Skills Solutions';
const base = '/technical-skills-solutions/';
const appPath = location.pathname.startsWith(base) ? location.pathname.slice(base.length - 1) : location.pathname;
const rawPath = appPath.toLowerCase().replace(/index\.html$/, '').replace(/\/+$/, '');
const pathParts = rawPath.split('/').filter(Boolean);
const inBlogDirectory = pathParts[0] === 'blogs';
const fileName = pathParts.at(-1) || 'index';
const routeMap = {
    index: 'home', about: 'about', tools: 'tools', shop: 'store', store: 'store',
    software: 'software', android: 'android', privacy: 'privacy', terms: 'terms',
    contact: 'contact', ocr: 'ocr', 'password-generator': 'password',
    'sip-calculator': 'sip', 'chat-link-generator': 'chat', 'chat_link_generator': 'chat',
    'email-signature': 'signature', 'url-shortener': 'shortener',
    'temporary-mail': 'temp-mail', 'temp-mail': 'temp-mail'
};
const route = inBlogDirectory ? 'blogs' : (routeMap[fileName] || 'home');
const blogSlug = inBlogDirectory && fileName !== 'blogs' ? fileName : '';
const isBlogIndex = inBlogDirectory && !blogSlug;
type QRCodeBrowserApi = { toCanvas?: (canvas: HTMLCanvasElement, text: string, options?: Record<string, unknown>) => Promise<void> | void; toDataURL?: (text: string, options?: Record<string, unknown>) => Promise<string> | string };
let qrCodePromise: Promise<QRCodeBrowserApi> | null = null;
async function getQRCode(): Promise<QRCodeBrowserApi> {
    if (!qrCodePromise) qrCodePromise = import('qrcode').then((loaded: unknown) => {
    const namespace = loaded as Record<string, any>;
    const candidates = [namespace, namespace.default, namespace.default?.default];
    const api = candidates.find(candidate => candidate && (typeof candidate.toCanvas === 'function' || typeof candidate.toDataURL === 'function'));
    if (!api) throw new Error('QR code module loaded, but it does not expose a supported canvas or image API.');
    return api as QRCodeBrowserApi;
    });
    return qrCodePromise;
}
async function renderQRCode(canvas: HTMLCanvasElement, value: string, options: Record<string, unknown> = {}) {
    const api = await getQRCode();
    if (typeof api.toCanvas === 'function') {
        await api.toCanvas(canvas, value, options);
        return;
    }
    if (typeof api.toDataURL !== 'function') throw new Error('No supported QR rendering method is available.');
    const dataUrl = await api.toDataURL(value, options);
    await new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const context = canvas.getContext('2d');
            if (!context) { reject(new Error('Could not prepare the QR canvas.')); return; }
            const width = Number(options.width) || 240;
            canvas.width = width; canvas.height = width;
            context.clearRect(0, 0, width, width);
            context.drawImage(image, 0, 0, width, width);
            resolve();
        };
        image.onerror = () => reject(new Error('Could not load the generated QR image.'));
        image.src = dataUrl;
    });
}
const $ = (id: string): any => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
function announce(message) { const region = $('live-region'); if (region)
    region.textContent = message; }
function greetingForHour(hour) {
    return hour < 12 ? 'Good morning!' : hour < 17 ? 'Good afternoon!' : hour < 21 ? 'Good evening!' : 'Good night!';
}
function updateClock() {
    const now = new Date();
    const welcome = $('welcome-greeting');
    const clock = $('welcome-clock');
    if (welcome) welcome.textContent = greetingForHour(now.getHours());
    if (clock) {
        const formatted = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(now);
        clock.textContent = formatted;
        clock.dateTime = now.toISOString();
    }
}

let pendingInstallPrompt = null;
window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingInstallPrompt = event;
    announce('This website can be installed as an app. Open the Android guide to install it.');
});
window.addEventListener('appinstalled', () => {
    pendingInstallPrompt = null;
    announce('Technical Skills Solutions was installed.');
});
function insertAccessibleButtonBreaks() {
    document.querySelectorAll('.button-row').forEach((row) => {
        const buttons = [...row.children].filter((node) => node instanceof HTMLButtonElement);
        for (const button of buttons) {
            const next = button.nextElementSibling;
            if (next instanceof HTMLButtonElement) row.insertBefore(document.createElement('br'), next);
        }
    });
}

function initializeShell() {
    // Keep desktop keyboard access keys, but do not expose conflicting browser shortcuts on Android.
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) document.querySelectorAll('[accesskey]').forEach(element => element.removeAttribute('accesskey'));
    const root = document.documentElement;
    let fontPx = Number(localStorage.getItem('tss-font-px') || '16');
    if (!Number.isFinite(fontPx) || fontPx < 14 || fontPx > 24)
        fontPx = 16;
    const applyFontSize = () => {
        root.style.fontSize = `${fontPx}px`;
        const readout = $('font-size-value');
        if (readout)
            readout.textContent = `Text size: ${fontPx} px`;
    };
    applyFontSize();
    const theme = localStorage.getItem('tss-theme') || 'dark';
    root.dataset.theme = theme;
    const contrast = localStorage.getItem('tss-high-contrast') === 'true';
    root.dataset.contrast = String(contrast);
    const themeButton = $('theme-toggle');
    const contrastButton = $('contrast-toggle');
    const setThemeLabel = () => { if (!themeButton)
        return; const isDark = root.dataset.theme === 'dark'; const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'; themeButton.textContent = label; themeButton.setAttribute('aria-label', label); themeButton.setAttribute('aria-pressed', String(isDark)); };
    const setContrastLabel = () => { if (!contrastButton)
        return; const enabled = root.dataset.contrast === 'true'; const label = enabled ? 'Disable high contrast' : 'Enable high contrast'; contrastButton.textContent = label; contrastButton.setAttribute('aria-label', label); contrastButton.setAttribute('aria-pressed', String(enabled)); };
    setThemeLabel();
    setContrastLabel();
    $('font-down')?.addEventListener('click', () => { fontPx = Math.max(14, fontPx - 2); applyFontSize(); localStorage.setItem('tss-font-px', String(fontPx)); announce(`Text size is ${fontPx} pixels.`); });
    $('font-up')?.addEventListener('click', () => { fontPx = Math.min(24, fontPx + 2); applyFontSize(); localStorage.setItem('tss-font-px', String(fontPx)); announce(`Text size is ${fontPx} pixels.`); });
    $('font-reset')?.addEventListener('click', () => { fontPx = 16; applyFontSize(); localStorage.setItem('tss-font-px', '16'); announce('Text size reset to 16 pixels.'); });
    themeButton?.addEventListener('click', () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('tss-theme', root.dataset.theme); setThemeLabel(); announce(`${root.dataset.theme} theme enabled.`); });
    contrastButton?.addEventListener('click', () => { root.dataset.contrast = root.dataset.contrast === 'true' ? 'false' : 'true'; localStorage.setItem('tss-high-contrast', root.dataset.contrast); setContrastLabel(); announce(root.dataset.contrast === 'true' ? 'High contrast enabled.' : 'Standard contrast enabled.'); });
    const menuButton = $('menu-toggle');
    const setMobileNavigation = (open) => { const nav = $('main-nav'); if (!nav || !menuButton)
        return; nav.classList.toggle('is-open', open); menuButton.setAttribute('aria-expanded', String(open)); const label = $('menu-toggle-label'); if (label)
        label.textContent = open ? 'Close navigation menu' : 'Open navigation menu'; };
    menuButton?.addEventListener('click', () => { const nav = $('main-nav'); if (!nav)
        return; const open = !nav.classList.contains('is-open'); setMobileNavigation(open); announce(open ? 'Navigation menu expanded.' : 'Navigation menu collapsed.'); });
    $('main-nav')?.addEventListener('click', event => { const target = event.target; if (target instanceof Element && target.closest('a') && window.innerWidth <= 980)
        setMobileNavigation(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('main-nav')?.classList.contains('is-open')) {
        setMobileNavigation(false);
        menuButton?.focus();
        announce('Navigation menu closed.');
    } });
    const installButton = $('android-install-app');
    installButton?.addEventListener('click', async () => {
        const note = $('android-install-note');
        if (!pendingInstallPrompt) {
            if (note)
                note.textContent = 'Open Chrome menu (three dots), then choose Install app or Add to Home screen. If the option is absent, confirm that this site is opened over HTTPS.';
            announce('Use the Chrome menu to install this website as an app.');
            return;
        }
        try {
            await pendingInstallPrompt.prompt();
            const choice = await pendingInstallPrompt.userChoice;
            announce(choice.outcome === 'accepted' ? 'Installation accepted.' : 'Installation was dismissed.');
            if (note)
                note.textContent = choice.outcome === 'accepted' ? 'Installation accepted. Check your home screen or app launcher.' : 'Installation was not completed. You can try again from the browser menu.';
        }
        catch {
            announce('The installation prompt could not be opened. Use the Chrome menu instead.');
        }
        pendingInstallPrompt = null;
    });
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
        const swUrl = new URL(`${base}sw.js`, location.href);
        navigator.serviceWorker.register(swUrl).catch(() => announce('Offline app support could not be registered in this browser.'));
    }
    updateClock();
    window.setInterval(updateClock, 1000);
}
const toolsData = [
    { title: 'Document OCR & Extractor', description: 'Extract text from images and PDFs, including scanned pages, with local multilingual OCR.', href: 'ocr.html', category: 'Documents' },
    { title: 'Advanced Password Generator', description: 'Create random cryptographic passwords or memorable multi-word passphrases.', href: 'password-generator.html', category: 'Security' },
    { title: 'SIP Calculator', description: 'Estimate monthly investment growth with a transparent contribution and return breakdown.', href: 'sip-calculator.html', category: 'Finance' },
    { title: 'Direct Chat Link Generator', description: 'Create supported WhatsApp, Telegram, Messenger profile, Instagram profile, Viber, Signal, email and phone links.', href: 'chat_link_generator.html', category: 'Communication' },
    { title: 'Gmail Email Signature Maker', description: 'Create a transparent signature image and an accessible email footer for Gmail.', href: 'email-signature.html', category: 'Communication' },
    { title: 'URL Shortener & QR Generator', description: 'Create a short URL and generate QR codes locally from the short link.', href: 'url-shortener.html', category: 'Communication' },
    { title: 'Temporary Mail Inbox', description: 'Create a receive-only temporary inbox through an external provider. Do not use for sensitive accounts.', href: 'temp-mail.html', category: 'Privacy' }
];
// Tools hub search and sorting.
if (route === 'tools') {
    const search = $('tool-search');
    const sort = $('tool-sort');
    const grid = $('tool-grid');
    const updateTools = () => {
        if (!search || !sort || !grid)
            return;
        const query = search.value.trim().toLowerCase();
        const cards = Array.from(grid.querySelectorAll('.tool-card')) as HTMLElement[];
        cards.sort((a, b) => sort.value === 'asc' ? (a.dataset.title || '').localeCompare(b.dataset.title || '') : sort.value === 'desc' ? (b.dataset.title || '').localeCompare(a.dataset.title || '') : Number(a.dataset.order || 0) - Number(b.dataset.order || 0));
        cards.forEach((card, index) => { if (!card.dataset.order)
            card.dataset.order = String(toolsData.findIndex(tool => tool.title.toLowerCase() === (card.dataset.title || ''))); grid.append(card); });
        let visible = 0;
        cards.forEach(card => { const match = (card.dataset.title || '').includes(query) || (card.dataset.search || '').includes(query); card.hidden = !match; if (match)
            visible++; });
        const count = $('tool-count');
        if (count)
            count.textContent = `${visible} ${visible === 1 ? 'tool' : 'tools'} found.`;
        const empty = $('tool-empty');
        if (empty)
            empty.hidden = visible !== 0;
    };
    search?.addEventListener('input', updateTools);
    sort?.addEventListener('change', updateTools);
    updateTools();
}
// Shop product search and category filters.
if (route === 'store') {
    const search = $('product-search');
    const category = $('product-category-filter');
    const updateProducts = () => {
        if (!search || !category)
            return;
        const query = search.value.trim().toLowerCase();
        let shown = 0;
        document.querySelectorAll<HTMLElement>('.product-card').forEach(card => {
            const matchesText = (card.dataset.title || '').includes(query);
            const matchesCategory = category.value === 'all' || card.dataset.category === category.value;
            const visible = matchesText && matchesCategory;
            card.hidden = !visible;
            if (visible)
                shown += 1;
        });
        document.querySelectorAll<HTMLElement>('[data-category-section]').forEach(section => {
            section.hidden = section.querySelectorAll('.product-card:not([hidden])').length === 0;
        });
        const count = $('product-count');
        if (count)
            count.textContent = `Showing ${shown} ${shown === 1 ? 'product' : 'products'}.`;
        const empty = $('product-empty');
        if (empty)
            empty.hidden = shown !== 0;
        announce(`Showing ${shown} ${shown === 1 ? 'product' : 'products'}.`);
    };
    search?.addEventListener('input', updateProducts);
    category?.addEventListener('change', updateProducts);
}
// Blog index filters.
if (route === 'blogs' && isBlogIndex) {
    const search = $('blog-search');
    const category = $('blog-category');
    const grid = $('blog-grid');
    const updateBlogs = () => {
        if (!grid || !search || !category)
            return;
        const query = search.value.trim().toLowerCase();
        let shown = 0;
        grid.querySelectorAll('.blog-list-card').forEach(card => { const text = `${card.dataset.title || ''} ${card.dataset.search || ''}`; const match = (!query || text.includes(query)) && (category.value === 'all' || card.dataset.category === category.value); card.hidden = !match; if (match)
            shown++; });
        const count = $('blog-count');
        if (count)
            count.textContent = `Showing ${shown} ${shown === 1 ? 'article' : 'articles'}.`;
        const empty = $('blog-empty');
        if (empty)
            empty.hidden = shown !== 0;
    };
    search?.addEventListener('input', updateBlogs);
    category?.addEventListener('change', updateBlogs);
    updateBlogs();
}
// Common utility helpers.
async function copyText(value, successMessage) {
    if (!value) { announce('There is no content to copy.'); return false; }
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            announce(successMessage);
            return true;
        }
    } catch { /* Continue with the keyboard-accessible legacy clipboard fallback. */ }
    const helper = document.createElement('textarea');
    helper.value = value;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed'; helper.style.opacity = '0'; helper.style.inset = '0 auto auto 0';
    document.body.append(helper); helper.select(); helper.setSelectionRange(0, helper.value.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { copied = false; }
    helper.remove();
    announce(copied ? successMessage : 'Clipboard access is unavailable. The text remains selected or can be copied from its field.');
    return copied;
}
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function secureRandomIndex(max) {
    if (!Number.isSafeInteger(max) || max < 1)
        throw new Error('Invalid random range.');
    const ceiling = Math.floor(0x100000000 / max) * max;
    const value = new Uint32Array(1);
    do {
        crypto.getRandomValues(value);
    } while (value[0] >= ceiling);
    return value[0] % max;
}
// Password generator.
if (route === 'password') {
    const words = ['amber', 'anchor', 'apricot', 'arrow', 'atlas', 'autumn', 'badge', 'bamboo', 'beacon', 'bluebird', 'brisk', 'cactus', 'candle', 'canyon', 'cedar', 'cello', 'cinder', 'cobalt', 'comet', 'coral', 'cricket', 'crystal', 'dawn', 'delta', 'desert', 'dolphin', 'drift', 'eagle', 'ember', 'engine', 'falcon', 'fern', 'fjord', 'flame', 'forest', 'frost', 'galaxy', 'garden', 'glacier', 'harbor', 'hazel', 'honey', 'horizon', 'indigo', 'island', 'jasmine', 'jigsaw', 'journey', 'jungle', 'kernel', 'lantern', 'lemon', 'lilac', 'lotus', 'marble', 'meadow', 'meteor', 'midnight', 'mint', 'mountain', 'nebula', 'nectar', 'north', 'oasis', 'ocean', 'olive', 'orbit', 'orchid', 'panda', 'paper', 'pebble', 'pepper', 'phoenix', 'piano', 'planet', 'pluto', 'quartz', 'quiet', 'raven', 'river', 'rocket', 'saffron', 'shadow', 'silver', 'solar', 'spruce', 'starling', 'summit', 'thunder', 'timber', 'topaz', 'tulip', 'velvet', 'violet', 'willow', 'winter', 'zephyr'];
    let mode = 'random';
    const generate = () => {
        const output = $('pw-output');
        if (!output)
            return;
        if (mode === 'random') {
            const length = Number($('pw-length').value);
            const sets = [['pw-upper', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], ['pw-lower', 'abcdefghijklmnopqrstuvwxyz'], ['pw-numbers', '0123456789'], ['pw-symbols', '!@#$%^&*()-_=+[]{};:,.?']];
            const enabled = sets.filter(([id]) => $(id).checked);
            if (!enabled.length) {
                announce('Select at least one character set.');
                output.value = '';
                return;
            }
            const chars = enabled.map(([, set]) => set).join('');
            const result = enabled.map(([, set]) => set[secureRandomIndex(set.length)]);
            while (result.length < length)
                result.push(chars[secureRandomIndex(chars.length)]);
            for (let i = result.length - 1; i > 0; i--) {
                const j = secureRandomIndex(i + 1);
                [result[i], result[j]] = [result[j], result[i]];
            }
            output.value = result.join('');
        }
        else {
            const count = Number($('pw-words').value);
            const selected = Array.from({ length: count }, () => words[secureRandomIndex(words.length)]);
            output.value = selected.map((word, index) => index % 2 === 0 ? word[0].toUpperCase() + word.slice(1) : word).join('-') + `-${secureRandomIndex(10)}`;
        }
        const entropy = mode === 'random' ? Number($('pw-length').value) * Math.log2(enabledCharCount()) : Number($('pw-words').value) * Math.log2(words.length);
        const score = Math.min(100, Math.round(entropy / 1.5));
        const strength = $('pw-strength');
        if (strength)
            strength.textContent = `Estimated strength: ${entropy >= 100 ? 'Very strong' : entropy >= 70 ? 'Strong' : entropy >= 45 ? 'Moderate' : 'Low'} (${Math.round(entropy)} bits of theoretical entropy)`;
        const bar = $('pw-strength-progress');
        if (bar)
            bar.value = score;
        const detail = $('pw-entropy');
        if (detail)
            detail.textContent = 'Entropy is a mathematical estimate based on the generator’s selection pool. Reuse and phishing risks are not measured.';
        announce('A new password has been generated.');
    };
    function enabledCharCount() { return (['pw-upper', 'pw-lower', 'pw-numbers', 'pw-symbols'].reduce((sum, id) => sum + (($(id).checked) ? ({ 'pw-upper': 26, 'pw-lower': 26, 'pw-numbers': 10, 'pw-symbols': 23 }[id] || 0) : 0), 0)); }
    const randomButton = $('pw-mode-random');
    const phraseButton = $('pw-mode-phrase');
    randomButton?.addEventListener('click', () => { mode = 'random'; $('pw-random-settings')?.removeAttribute('hidden'); $('pw-phrase-settings')?.setAttribute('hidden', ''); randomButton.setAttribute('aria-pressed', 'true'); phraseButton?.setAttribute('aria-pressed', 'false'); announce('Random password mode selected.'); });
    phraseButton?.addEventListener('click', () => { mode = 'phrase'; $('pw-random-settings')?.setAttribute('hidden', ''); $('pw-phrase-settings')?.removeAttribute('hidden'); phraseButton.setAttribute('aria-pressed', 'true'); randomButton?.setAttribute('aria-pressed', 'false'); announce('Passphrase mode selected.'); });
    $('pw-length')?.addEventListener('input', () => { const value = $('pw-length').value; $('pw-length-value').textContent = value; });
    $('pw-words')?.addEventListener('input', () => { const value = $('pw-words').value; $('pw-words-value').textContent = value; });
    $('pw-generate')?.addEventListener('click', generate);
    $('pw-copy')?.addEventListener('click', () => copyText($('pw-output').value, 'Password copied to clipboard.'));
}
// SIP calculator.
if (route === 'sip') {
    let reportText = '';
    $('sip-calculate')?.addEventListener('click', () => {
        const monthly = Number($('sip-monthly').value);
        const annual = Number($('sip-rate').value);
        const years = Number($('sip-years').value);
        if (!(monthly > 0 && annual >= 0 && annual <= 100 && years > 0 && years <= 80)) {
            announce('Enter a monthly amount above zero, an annual return from zero to one hundred, and a duration from one to eighty years.');
            return;
        }
        const months = Math.round(years * 12);
        const rate = annual / 1200;
        const invested = monthly * months;
        const value = rate === 0 ? invested : monthly * ((Math.pow(1 + rate, months) - 1) / rate) * (1 + rate);
        const gain = value - invested;
        const currency = (amount) => amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
        const data = [['Monthly investment', currency(monthly)], ['Assumed annual return', `${annual}%`], ['Investment period', `${years} years (${months} months)`], ['Total amount invested', currency(invested)], ['Estimated wealth gain', currency(gain)], ['Estimated maturity value', currency(value)]];
        const ids = ['sip-monthly-result', 'sip-rate-result', 'sip-years-result', 'sip-invested-result', 'sip-gain-result', 'sip-value-result'];
        data.forEach(([_, v], i) => { const target = $(ids[i]); if (target)
            target.textContent = v; });
        reportText = `${APP_NAME}\nSIP Investment Estimate\n\n${data.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nIllustrative estimate only. Market returns are variable and are not guaranteed.`;
        $('sip-result')?.removeAttribute('hidden');
        $('sip-pdf')?.removeAttribute('disabled');
        announce(`SIP estimate calculated. Estimated maturity value ${currency(value)}.`);
    });
    $('sip-pdf')?.addEventListener('click', () => { if (!reportText) {
        announce('Calculate the SIP before preparing a report.');
        return;
    } const printWindow = window.open('', '_blank'); if (!printWindow) {
        announce('The report window was blocked. Allow pop-ups for this site and try again.');
        return;
    } const safe = esc(reportText).replace(/\n/g, '<br>'); printWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>SIP Estimate Report</title><style>body{font:16px Arial,sans-serif;line-height:1.7;max-width:760px;margin:40px auto;padding:24px;color:#172033}h1{color:#075fc5}@media print{button{display:none}}</style></head><body><h1>${APP_NAME}</h1><h2>SIP Investment Estimate</h2><p>${safe}</p><button onclick="window.print()">Print or save as PDF</button><script>window.onload=()=>window.print()<\/script></body></html>`); printWindow.document.close(); announce('SIP report opened. Use the print dialog and choose Save as PDF.'); });
}
// Direct chat link generator. Results are always shown before optional QR rendering.
if (route === 'chat') {
    const configs = {
        whatsapp: { label: 'Phone number with country code', hint: 'Digits only, including country code; for example 919876543210.', placeholder: '919876543210' },
        'whatsapp-business': { label: 'Phone number with country code', hint: 'Digits only, including country code.', placeholder: '919876543210' },
        telegram: { label: 'Telegram username', hint: 'Enter a public username, with or without @. A prefilled message is not supported for this profile link.', placeholder: 'username' },
        messenger: { label: 'Facebook page or profile username', hint: 'Opens the public Messenger conversation route. Message prefill is not supported by this profile link.', placeholder: 'username' },
        instagram: { label: 'Instagram username', hint: 'Creates a public Instagram profile link, not a direct-message link.', placeholder: 'username' },
        viber: { label: 'Phone number with country code', hint: 'Digits only, including country code.', placeholder: '919876543210' },
        signal: { label: 'Phone number with country code', hint: 'Use the international phone number format.', placeholder: '+919876543210' },
        email: { label: 'Email address', hint: 'Enter a valid email address.', placeholder: 'person@example.com' },
        phone: { label: 'Phone number with country code', hint: 'Use international format, such as +919876543210.', placeholder: '+919876543210' }
    };
    const updateChatLabel = () => {
        const key = $('chat-platform')?.value; const c = configs[key]; if (!c) return;
        $('chat-recipient-label').textContent = c.label; $('chat-recipient').placeholder = c.placeholder; $('chat-hint').textContent = c.hint;
        const supportsPrefill = ['whatsapp', 'whatsapp-business', 'email'].includes(key); const message = $('chat-message');
        message.disabled = !supportsPrefill; message.setAttribute('aria-describedby', 'chat-hint'); if (!supportsPrefill) message.value = '';
    };
    $('chat-platform')?.addEventListener('change', updateChatLabel); updateChatLabel();
    $('chat-generate')?.addEventListener('click', async () => {
        const key = $('chat-platform')?.value; const recipient = $('chat-recipient')?.value.trim() || ''; const message = $('chat-message')?.value.trim() || '';
        if (!recipient) { announce('Enter the recipient first.'); $('chat-recipient')?.focus(); return; }
        const digits = recipient.replace(/\D/g, ''); const user = recipient.replace(/^@/, '').trim(); let url = '';
        if (['whatsapp', 'whatsapp-business', 'viber', 'signal', 'phone'].includes(key) && (digits.length < 7 || digits.length > 15)) { announce('Enter a valid international phone number with 7 to 15 digits.'); $('chat-recipient')?.focus(); return; }
        if (key === 'whatsapp' || key === 'whatsapp-business') url = `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
        else if (key === 'telegram') { if (!/^[A-Za-z0-9_]{5,32}$/.test(user)) { announce('Enter a valid Telegram username.'); $('chat-recipient')?.focus(); return; } url = `https://t.me/${encodeURIComponent(user)}`; }
        else if (key === 'messenger') { if (!/^[A-Za-z0-9.]{3,100}$/.test(user)) { announce('Enter a valid public Facebook username.'); $('chat-recipient')?.focus(); return; } url = `https://m.me/${encodeURIComponent(user)}`; }
        else if (key === 'instagram') { if (!/^[A-Za-z0-9._]{1,30}$/.test(user)) { announce('Enter a valid Instagram username.'); $('chat-recipient')?.focus(); return; } url = `https://www.instagram.com/${encodeURIComponent(user)}/`; }
        else if (key === 'viber') url = `viber://chat?number=${encodeURIComponent(`+${digits}`)}`;
        else if (key === 'signal') url = `https://signal.me/#p/${encodeURIComponent(`+${digits}`)}`;
        else if (key === 'email') { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) { announce('Enter a valid email address.'); $('chat-recipient')?.focus(); return; } url = `mailto:${recipient}${message ? `?body=${encodeURIComponent(message)}` : ''}`; }
        else url = `tel:+${digits}`;
        const output = $('chat-output'); const result = $('chat-result'); const open = $('chat-open');
        output.value = url; open.href = url; result.hidden = false;
        const qrStatus = $('chat-qr-status'); if (qrStatus) qrStatus.textContent = 'Creating QR code…';
        // Put the result on screen and move keyboard/screen-reader focus before any optional QR work.
        output.focus(); output.select(); announce('Chat link generated. The Shareable link field and Copy generated chat link button are now available.');
        try {
            await renderQRCode($('chat-qr'), url, { width: 220, margin: 2, errorCorrectionLevel: 'H' });
            $('chat-qr').setAttribute('aria-label', `QR code for generated chat link: ${url}`);
            if (qrStatus) qrStatus.textContent = 'QR code created successfully.';
            announce('Chat link and QR code generated. Use Copy generated chat link to copy the link.');
        } catch (error) {
            if (qrStatus) qrStatus.textContent = 'The chat link is ready. QR generation failed: ' + (error instanceof Error ? error.message : String(error));
            announce('Chat link generated and displayed. QR creation failed, but you can still copy the link.');
        }
    });
    $('chat-copy')?.addEventListener('click', () => { void copyText($('chat-output')?.value || '', 'Chat link copied.'); });
    $('chat-qr-download')?.addEventListener('click', () => { const canvas = $('chat-qr'); if (!canvas || !canvas.width) { announce('Create a QR code first.'); return; } canvas.toBlob(blob => { if (blob) downloadBlob(blob, 'chat-link-qr.png'); else announce('Could not create QR download.'); }); });
    $('chat-clear')?.addEventListener('click', () => { $('chat-recipient').value = ''; $('chat-message').value = ''; $('chat-output').value = ''; $('chat-result').hidden = true; $('chat-qr-status').textContent = ''; $('chat-recipient').focus(); announce('Chat link form cleared.'); });
}
// URL shortener. QR generation is local; short links are created by the public shortening API.
if (route === 'shortener') {
    let currentShortUrl = '';
    const status = $('shortener-status');
    const announceStatus = message => { if (status) status.textContent = message; announce(message); };
    const getDestination = () => { const parsed = parseHttpDestination($('long-url')?.value || ''); if (!parsed) { announceStatus('Enter a complete HTTP or HTTPS destination URL.'); $('long-url')?.focus(); return null; } return parsed; };
    const makeQr = async (canvas, value, label) => { await renderQRCode(canvas, value, { width: 240, margin: 2, errorCorrectionLevel: 'H' }); canvas.setAttribute('aria-label', label + ': ' + value); };
    $('shorten-url')?.addEventListener('click', async () => {
        const destination = getDestination(); if (!destination) return;
        const button = $('shorten-url'); button.disabled = true; announceStatus('Creating your short link…');
        try {
            const endpoint = 'https://is.gd/create.php?format=json&url=' + encodeURIComponent(destination.href);
            const response = await fetch(endpoint, { method: 'GET', mode: 'cors', cache: 'no-store' });
            if (!response.ok) throw new Error('The shortening service returned HTTP ' + response.status + '.');
            const data = await response.json();
            if (data.errorcode) throw new Error(data.errormessage || ('The shortening service returned error ' + data.errorcode + '.'));
            const parsed = parseHttpDestination(data.shorturl || '');
            if (!parsed || !/^https?:\/\/is\.gd\//i.test(parsed.href)) throw new Error('The shortening service returned an invalid short URL.');
            currentShortUrl = parsed.href; $('short-url-output').value = currentShortUrl; $('short-url-open').href = currentShortUrl; $('shortener-result').hidden = false;
            announceStatus('Short link created. The result is displayed below.'); $('short-url-output').focus(); $('short-url-output').select();
            try { await makeQr($('short-url-qr'), currentShortUrl, 'QR code for short link'); $('short-qr-status').textContent = 'QR code created successfully.'; }
            catch (qrError) { $('short-qr-status').textContent = 'Short link created, but QR generation failed: ' + (qrError instanceof Error ? qrError.message : String(qrError)); }
        } catch (error) { announceStatus('Could not shorten the URL. ' + (error instanceof Error ? error.message : String(error)) + ' The shortening service may be temporarily unavailable on this network; retry later or use the original URL QR option.'); }
        finally { button.disabled = false; }
    });
    $('copy-original-url')?.addEventListener('click', () => { const d = getDestination(); if (d) void copyText(d.href, 'Original URL copied.'); });
    $('make-original-qr')?.addEventListener('click', async () => { const d = getDestination(); if (!d) return; try { await makeQr($('original-url-qr-canvas'), d.href, 'QR code for original URL'); $('original-qr-result').hidden = false; $('original-qr-status').textContent = 'QR code created successfully.'; announceStatus('QR code for original URL created locally.'); } catch (e) { $('original-qr-status').textContent = 'QR generation failed: ' + String(e); announceStatus('QR generation failed: ' + String(e)); } });
    $('original-url-qr-download')?.addEventListener('click', () => { $('original-url-qr-canvas')?.toBlob(blob => { if (blob) downloadBlob(blob, 'original-url-qr.png'); }); });
    $('short-url-copy')?.addEventListener('click', () => { void copyText(currentShortUrl, 'Short URL copied.'); });
    $('short-url-qr-download')?.addEventListener('click', () => { $('short-url-qr')?.toBlob(blob => { if (blob) downloadBlob(blob, 'technical-skills-solutions-short-url-qr.png'); }); });
    $('shorten-clear')?.addEventListener('click', () => { $('long-url').value = ''; $('short-url-output').value = ''; currentShortUrl = ''; $('shortener-result').hidden = true; $('original-qr-result').hidden = true; $('short-qr-status').textContent = ''; $('original-qr-status').textContent = ''; announceStatus('URL shortener form cleared.'); $('long-url').focus(); });
}
// Gmail email signature creator: local image rendering and accessible contact-text export.
if (route === 'signature') {
    const sourceSelect = $('sig-source');
    const nameInput = $('sig-name');
    const previewCanvas = $('sig-preview-canvas');
    const previewContext = previewCanvas?.getContext('2d');
    const drawCanvas = $('sig-draw-canvas');
    const drawContext = drawCanvas?.getContext('2d');
    let uploadedBitmap = null;
    let drawing = false;
    let hasDrawing = false;
    const setSignatureStatus = (message) => {
        const status = $('email-sig-status');
        if (status)
            status.textContent = message;
        const description = $('sig-preview-description');
        if (description)
            description.textContent = message;
        announce(message);
    };
    const signatureName = () => nameInput.value.trim();
    const updateSourceControls = () => {
        const mode = sourceSelect.value;
        const typed = $('sig-typed-controls');
        const upload = $('sig-upload-controls');
        const draw = $('sig-draw-controls');
        if (typed)
            typed.hidden = mode !== 'typed';
        if (upload)
            upload.hidden = mode !== 'upload';
        if (draw)
            draw.hidden = mode !== 'draw';
        renderSignaturePreview();
    };
    const fitInto = (context, width, height) => {
        if (sourceSelect.value === 'upload' && uploadedBitmap) {
            const work = document.createElement('canvas');
            const resizeFactor = Math.min(1, 2000 / uploadedBitmap.width, 1200 / uploadedBitmap.height);
            work.width = Math.max(1, Math.round(uploadedBitmap.width * resizeFactor));
            work.height = Math.max(1, Math.round(uploadedBitmap.height * resizeFactor));
            const workContext = work.getContext('2d', { willReadFrequently: true });
            if (!workContext)
                throw new Error('Image processing is not available in this browser.');
            workContext.drawImage(uploadedBitmap, 0, 0, work.width, work.height);
            if ($('sig-remove-white').checked) {
                const pixels = workContext.getImageData(0, 0, work.width, work.height);
                const data = pixels.data;
                for (let i = 0; i < data.length; i += 4) {
                    const min = Math.min(data[i], data[i + 1], data[i + 2]);
                    if (min > 242)
                        data[i + 3] = 0;
                    else if (min > 220)
                        data[i + 3] = Math.round(data[i + 3] * (242 - min) / 22);
                }
                workContext.putImageData(pixels, 0, 0);
            }
            const scale = Math.min(width / work.width, height / work.height);
            const w = work.width * scale;
            const h = work.height * scale;
            context.drawImage(work, (400 - w) / 2, (100 - h) / 2, w, h);
            work.width = 1;
            work.height = 1;
            return;
        }
        if (sourceSelect.value === 'draw' && hasDrawing) {
            const scale = Math.min(width / drawCanvas.width, height / drawCanvas.height);
            const w = drawCanvas.width * scale;
            const h = drawCanvas.height * scale;
            context.drawImage(drawCanvas, (400 - w) / 2, (100 - h) / 2, w, h);
            return;
        }
        const name = signatureName();
        if (!name)
            throw new Error('Enter your name or choose an uploaded or drawn signature image.');
        const family = $('sig-font').value;
        const colour = $('sig-colour').value;
        let fontSize = Number($('sig-size').value);
        context.fillStyle = colour;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = `${fontSize}px ${family}`;
        while (context.measureText(name).width > width - 28 && fontSize > 18) {
            fontSize -= 1;
            context.font = `${fontSize}px ${family}`;
        }
        context.fillText(name, 200, 48, width - 28);
        if ($('sig-underline').checked) {
            const textWidth = Math.min(width - 50, context.measureText(name).width);
            context.strokeStyle = colour;
            context.lineWidth = 1.8;
            context.beginPath();
            context.moveTo(200 - textWidth / 2, 79);
            context.lineTo(200 + textWidth / 2, 79);
            context.stroke();
        }
    };
    function renderSignaturePreview() {
        if (!previewCanvas || !previewContext)
            return;
        previewCanvas.width = 400;
        previewCanvas.height = 100;
        previewContext.clearRect(0, 0, 400, 100);
        if ($('sig-background').value === 'white') {
            previewContext.fillStyle = '#ffffff';
            previewContext.fillRect(0, 0, 400, 100);
        }
        try {
            fitInto(previewContext, 360, 78);
            const source = sourceSelect.value;
            const description = source === 'upload' && uploadedBitmap ? 'Preview updated from your uploaded handwritten signature.' : source === 'draw' && hasDrawing ? 'Preview updated from your drawn signature.' : signatureName() ? `Preview updated for ${signatureName()}.` : 'Enter a name to preview a typed signature, upload an image, or draw a signature.';
            const node = $('sig-preview-description');
            if (node)
                node.textContent = description;
        }
        catch (error) {
            const node = $('sig-preview-description');
            if (node)
                node.textContent = error instanceof Error ? error.message : String(error);
        }
    }
    const updateSizeValue = () => { const slider = $('sig-size'); const output = $('sig-size-value'); if (output)
        output.textContent = slider.value; };
    ['sig-name', 'sig-font', 'sig-colour', 'sig-size', 'sig-underline', 'sig-background', 'sig-remove-white'].forEach(id => $(id)?.addEventListener('input', () => { updateSizeValue(); renderSignaturePreview(); }));
    sourceSelect?.addEventListener('change', updateSourceControls);
    $('sig-preview-update')?.addEventListener('click', () => { renderSignaturePreview(); setSignatureStatus(($('sig-preview-description')?.textContent || 'Signature preview updated.')); });
    $('sig-upload')?.addEventListener('change', async () => {
        const file = $('sig-upload').files?.[0];
        if (!file)
            return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
            setSignatureStatus('Choose a PNG, JPG or WebP image smaller than 8 MB.');
            return;
        }
        try {
            uploadedBitmap?.close();
            uploadedBitmap = await createImageBitmap(file);
            sourceSelect.value = 'upload';
            updateSourceControls();
            setSignatureStatus(`Uploaded signature image loaded: ${file.name}. Check the preview before downloading.`);
        }
        catch (error) {
            setSignatureStatus(`Could not open the signature image: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    if (drawContext) {
        drawContext.lineWidth = 4;
        drawContext.lineCap = 'round';
        drawContext.lineJoin = 'round';
        drawContext.strokeStyle = '#172b4d';
        drawCanvas.addEventListener('pointerdown', event => {
            drawing = true;
            hasDrawing = true;
            drawCanvas.setPointerCapture(event.pointerId);
            const rect = drawCanvas.getBoundingClientRect();
            drawContext.beginPath();
            drawContext.moveTo((event.clientX - rect.left) * drawCanvas.width / rect.width, (event.clientY - rect.top) * drawCanvas.height / rect.height);
        });
        drawCanvas.addEventListener('pointermove', event => {
            if (!drawing)
                return;
            const rect = drawCanvas.getBoundingClientRect();
            drawContext.lineTo((event.clientX - rect.left) * drawCanvas.width / rect.width, (event.clientY - rect.top) * drawCanvas.height / rect.height);
            drawContext.stroke();
        });
        const stopDrawing = () => { if (!drawing)
            return; drawing = false; sourceSelect.value = 'draw'; updateSourceControls(); setSignatureStatus('Drawn signature updated.'); };
        drawCanvas.addEventListener('pointerup', stopDrawing);
        drawCanvas.addEventListener('pointercancel', stopDrawing);
        drawCanvas.addEventListener('lostpointercapture', stopDrawing);
    }
    $('sig-draw-clear')?.addEventListener('click', () => { drawContext?.clearRect(0, 0, drawCanvas.width, drawCanvas.height); hasDrawing = false; renderSignaturePreview(); setSignatureStatus('Drawn signature cleared.'); });
    $('sig-download-png')?.addEventListener('click', () => {
        try {
            renderSignaturePreview();
            if (sourceSelect.value === 'upload' && !uploadedBitmap)
                throw new Error('Choose your handwritten signature image first.');
            if (sourceSelect.value === 'draw' && !hasDrawing)
                throw new Error('Draw your signature first, or choose the typed-name option.');
            if (sourceSelect.value === 'typed' && !signatureName())
                throw new Error('Enter your name before downloading.');
            previewCanvas.toBlob(blob => {
                if (!blob) {
                    setSignatureStatus('Could not export the PNG image.');
                    return;
                }
                downloadBlob(blob, 'gmail-email-signature.png');
                setSignatureStatus('Gmail signature PNG downloaded. It is 400 by 100 pixels.');
            }, 'image/png');
        }
        catch (error) {
            setSignatureStatus(error instanceof Error ? error.message : String(error));
        }
    });
    const emailData = () => ({
        name: $('email-sig-name').value.trim(), role: $('email-sig-role').value.trim(),
        org: $('email-sig-org').value.trim(), email: $('email-sig-address').value.trim(),
        phone: $('email-sig-phone').value.trim(), website: $('email-sig-website').value.trim()
    });
    const updateEmailDetails = () => {
        const d = emailData();
        const lines = [d.name, d.role, d.org, d.email, d.phone, d.website].filter(Boolean);
        const preview = $('email-sig-details-preview');
        if (preview)
            preview.textContent = lines.length ? lines.join(' | ') : 'Your email contact details will appear here.';
    };
    ['email-sig-name', 'email-sig-role', 'email-sig-org', 'email-sig-address', 'email-sig-phone', 'email-sig-website'].forEach(id => $(id)?.addEventListener('input', updateEmailDetails));
    $('email-sig-copy-text')?.addEventListener('click', () => {
        const d = emailData();
        const details = [d.name, d.role, d.org, d.email, d.phone, d.website].filter(Boolean).join('\n');
        if (!details) {
            setSignatureStatus('Enter at least your name or one contact detail before copying.');
            return;
        }
        void copyText(details, 'Contact details copied. Paste them into the Gmail signature editor as text.');
    });
    updateSizeValue();
    renderSignaturePreview();
    updateEmailDetails();
    window.addEventListener('pagehide', () => { uploadedBitmap?.close(); }, { once: true });
}
// Temporary inbox integration using the provider's documented public REST API.
if (route === 'temp-mail') {
    const MAIL_PROVIDERS = ['https://api.mail.tm', 'https://api.mail.gw'];
    const STORE_KEY = 'tss-mail-session-v2';
    let account = null;
    let pollTimer = 0;
    let refreshing = false;
    const status = message => { const node = $('temp-status'); if (node) node.textContent = message; announce(message); };
    const setControls = active => { for (const id of ['temp-refresh', 'temp-copy', 'temp-forget']) { const node = $(id); if (node) node.disabled = !active; } };
    const safeText = (tag, value) => { const node = document.createElement(tag); node.textContent = String(value ?? ''); return node; };
    async function api(path: string, options: any = {}): Promise<any> {
        const { baseUrl, ...requestOptions } = options;
        const apiBase = baseUrl || account?.apiBase || MAIL_PROVIDERS[0];
        const headers = new Headers(requestOptions.headers || {}); headers.set('Accept', 'application/ld+json, application/json');
        if (requestOptions.body) headers.set('Content-Type', 'application/json');
        if (options.auth !== false && account?.token) headers.set('Authorization', `Bearer ${account.token}`);
        const controller = new AbortController(); const timer = window.setTimeout(() => controller.abort(), 20000);
        let response;
        try { response = await fetch(`${apiBase}${path}`, { ...requestOptions, headers, signal: controller.signal, cache: 'no-store' }); }
        catch (error) { if (error instanceof DOMException && error.name === 'AbortError') throw new Error('The temporary mail provider timed out. Try again later.'); throw new Error(`Could not connect to ${apiBase.replace('https://api.', '')}. Your network, DNS or browser privacy extension may be blocking this provider.`); }
        finally { window.clearTimeout(timer); }
        const raw = await response.text(); let data: any = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch { data = { detail: raw }; }
        if (!response.ok) {
            const detail = data['hydra:description'] || data.detail || data.message || data.title || `HTTP ${response.status}`;
            const retry = response.status === 429 ? ' The provider rate limit was reached; wait at least one second before retrying.' : '';
            throw new Error(`Mail provider error ${response.status}: ${String(detail).slice(0, 260)}.${retry}`);
        }
        return data;
    }
    function saveSession() { if (account) sessionStorage.setItem(STORE_KEY, JSON.stringify(account)); else sessionStorage.removeItem(STORE_KEY); }
    function stopPolling() { if (pollTimer) window.clearInterval(pollTimer); pollTimer = 0; }
    function startPolling() { stopPolling(); if (account?.token) pollTimer = window.setInterval(() => { void refreshInbox(true); }, 30000); }
    function randomHex(bytes = 16) { const data = crypto.getRandomValues(new Uint8Array(bytes)); return [...data].map(v => v.toString(16).padStart(2, '0')).join(''); }
    function randomPassword() { return randomHex(32) + 'Tss!9'; }
    async function createInbox() {
        let lastConnectionError = null;
        for (const provider of MAIL_PROVIDERS) {
            let domainData: any;
            try { domainData = await api('/domains?page=1', { auth: false, baseUrl: provider }); }
            catch (error) {
                lastConnectionError = error;
                // Try the second independently operated public API only when the first cannot be reached.
                continue;
            }
            const domains = (domainData['hydra:member'] || []).filter(item => item.isActive && !item.isPrivate && typeof item.domain === 'string');
            if (!domains.length) { lastConnectionError = new Error(`${provider.replace('https://api.', '')} has no public domains available right now.`); continue; }
            let lastError: any = null;
            for (let attempt = 0; attempt < Math.min(3, domains.length); attempt++) {
                const domain = domains[attempt % domains.length].domain;
                const address = `tss${randomHex(6)}@${domain}`;
                const password = randomPassword();
                try {
                    const created = await api('/accounts', { method: 'POST', auth: false, baseUrl: provider, body: JSON.stringify({ address, password }) });
                    const token = await api('/token', { method: 'POST', auth: false, baseUrl: provider, body: JSON.stringify({ address, password }) });
                    if (!token.token) throw new Error('Provider did not return an access token for the new inbox.');
                    account = { address, token: token.token, accountId: created.id || token.id, apiBase: provider, createdAt: new Date().toISOString() };
                    saveSession(); return;
                } catch (error) {
                    lastError = error;
                    // Respect provider rate limits and service errors; do not switch providers to evade them.
                    if (error instanceof Error && !/422|already exists|already used|taken/i.test(error.message)) throw error;
                }
            }
            if (lastError) throw lastError;
        }
        throw lastConnectionError || new Error('No temporary email provider is reachable right now. Please try again later.');
    }
    function renderMessages(payload) {
        const list = $('temp-messages'); const messages = payload['hydra:member'] || [];
        list.replaceChildren();
        if (!messages.length) { list.append(safeText('p', 'No messages have arrived yet. Refresh this inbox after sending a message to its address.')); return; }
        for (const item of messages) {
            const article = document.createElement('article'); article.className = 'message-card';
            article.append(safeText('h3', item.subject || '(No subject)'), safeText('p', `From: ${item.from?.name ? item.from.name + ' ' : ''}${item.from?.address || 'Unknown sender'}`), safeText('p', `Received: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Time unavailable'}`));
            const open = document.createElement('button'); open.type = 'button'; open.className = 'button-primary'; open.textContent = 'Read message'; open.addEventListener('click', () => { void openMessage(String(item.id)); });
            article.append(open); list.append(article);
        }
        status(`${messages.length} message(s) loaded in the temporary inbox.`);
    }
    async function refreshInbox(silent = false) {
        if (!account?.token || refreshing) return; refreshing = true;
        try { const payload = await api('/messages?page=1'); renderMessages(payload); }
        catch (error) { if (!silent) status(`Could not refresh the inbox: ${error instanceof Error ? error.message : String(error)}`); }
        finally { refreshing = false; }
    }
    async function openMessage(id) {
        if (!id) return; const detail = $('temp-message-detail'); detail.hidden = false; detail.textContent = 'Loading message…';
        try {
            const message = await api(`/messages/${encodeURIComponent(id)}`);
            const body = String(message.text || message.intro || 'No plain-text body was provided.');
            detail.replaceChildren(safeText('h3', message.subject || '(No subject)'), safeText('p', `From: ${message.from?.address || 'Unknown sender'}`), safeText('p', `Received: ${message.createdAt ? new Date(message.createdAt).toLocaleString() : 'Time unavailable'}`));
            const otp = body.match(/\b([0-9]{4,8})\b/);
            if (otp) { const row = safeText('p', `Possible verification code: ${otp[1]}`); const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'button-secondary'; copy.textContent = 'Copy possible verification code'; copy.addEventListener('click', () => { void copyText(otp[1], 'Verification code copied.'); }); row.append(' ', copy); detail.append(row); }
            detail.append(safeText('h4', 'Message body'), safeText('pre', body)); detail.focus();
            if (!message.seen) void api(`/messages/${encodeURIComponent(id)}`, { method: 'PATCH', body: '{}' }).catch(() => {});
            status('Message opened as plain text. Email HTML is not executed.');
        } catch (error) { detail.textContent = `Could not open message: ${error instanceof Error ? error.message : String(error)}`; status('Could not open this message. The inbox may have expired or the provider may be unavailable.'); }
    }
    $('temp-create')?.addEventListener('click', async () => {
        if (!$('temp-consent')?.checked) { status('Confirm the temporary inbox safety notice before creating an address.'); $('temp-consent')?.focus(); return; }
        const button = $('temp-create'); button.disabled = true; status('Finding an available public email domain…');
        try { await createInbox(); $('temp-address').value = account.address; $('temp-expiry').textContent = 'Inbox retention is controlled by the email provider. This page does not promise a fixed expiry time.'; $('temp-message-detail').hidden = true; setControls(true); $('temp-create').disabled = true; status(`Temporary inbox created: ${account.address}. Copy the address and refresh to check incoming messages.`); await refreshInbox(true); startPolling(); }
        catch (error) { status(`Inbox creation failed: ${error instanceof Error ? error.message : String(error)}`); }
        finally { button.disabled = false; }
    });
    $('temp-copy')?.addEventListener('click', () => { void copyText(account?.address || '', 'Temporary email address copied.'); });
    $('temp-refresh')?.addEventListener('click', () => { status('Refreshing temporary inbox…'); void refreshInbox(); });
    $('temp-forget')?.addEventListener('click', async () => {
        const old = account; stopPolling(); account = null; $('temp-create').disabled = false; saveSession(); $('temp-address').value = ''; $('temp-messages').replaceChildren(safeText('p', 'No messages loaded.')); $('temp-message-detail').hidden = true; $('temp-expiry').textContent = 'Inbox retention is controlled by the provider.'; setControls(false);
        if (old?.accountId) { try { await api(`/accounts/${encodeURIComponent(old.accountId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${old.token}` } }); status('The temporary account deletion request was sent to the provider, and this device has forgotten its access token.'); } catch { status('This device has forgotten the temporary inbox token. The provider may retain the account until its own retention rules apply.'); } }
        else status('This device has forgotten the temporary inbox.');
    });
    try { const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null'); if (saved?.address && saved?.token) { account = saved; $('temp-address').value = account.address; $('temp-create').disabled = true; setControls(true); $('temp-expiry').textContent = 'Inbox retention is controlled by the email provider.'; status('Restoring your temporary inbox from this browser tab…'); void refreshInbox(true); startPolling(); } else setControls(false); } catch { sessionStorage.removeItem(STORE_KEY); setControls(false); }
    window.addEventListener('pagehide', stopPolling, { once: true });
}
if (route === 'ocr') {
    import('./ocr.js').catch(error => { const status = $('ocr-status'); if (status)
        status.textContent = `OCR could not be started: ${error instanceof Error ? error.message : String(error)}. Check your internet connection and reload the page.`; announce(status.textContent); console.error('OCR startup failure:', error); });
}
initializeShell();
insertAccessibleButtonBreaks();

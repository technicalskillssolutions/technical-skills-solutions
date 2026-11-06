import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import pageMeta from '../src/data/page-meta.mjs';

const root = process.cwd();
const dist = path.join(root, 'dist');
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });
await fs.cp(path.join(root, 'public'), dist, { recursive: true });

// Compile TypeScript to plain browser ES modules. The import map below resolves third-party modules.
const localTypeScriptCompiler = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
if (await fs.stat(localTypeScriptCompiler).then(() => true).catch(() => false)) {
  execFileSync(process.execPath, [localTypeScriptCompiler, '--project', path.join(root, 'tsconfig.json')], { cwd: root, stdio: 'inherit' });
} else {
  execFileSync(process.platform === 'win32' ? 'tsc.cmd' : 'tsc', ['--project', path.join(root, 'tsconfig.json')], { cwd: root, stdio: 'inherit' });
}

const routeMap = {
  home:'/', about:'/about/', tools:'/tools/', shop:'/shop/', software:'/software/', android:'/android/',
  privacy:'/privacy/', terms:'/terms/', contact:'/contact/', ocr:'/ocr/', password:'/password-generator/',
  sip:'/sip-calculator/', chat:'/chat-link-generator/', signature:'/email-signature/',
  shortener:'/url-shortener/', fileIntegrity:'/file-integrity-checker/', blogs:'/blogs/'
};
const files = {
  home:'home.html', about:'about.html', tools:'tools.html', shop:'shop.html', software:'software.html',
  android:'android.html', privacy:'privacy.html', terms:'terms.html', contact:'contact.html', ocr:'ocr.html',
  password:'password.html', sip:'sip.html', chat:'chat.html', signature:'signature.html',
  shortener:'shortener.html', fileIntegrity:'file-integrity-checker.html', blogs:'blogs-index.html'
};
const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const importMap = {
  imports: {
    'qrcode': 'https://esm.sh/qrcode@1.5.4',
    'tesseract.js': 'https://esm.sh/tesseract.js@6.0.1',
    'pdfjs-dist': 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.394/build/pdf.mjs'
  }
};
async function writePage(key, markup, metaOverride = {}) {
  const meta = { ...(pageMeta[key] || {}), ...metaOverride };
  const url = 'https://technicalskillssolutions.in' + (meta.path || routeMap[key] || '/');
  const title = meta.title || 'Technical Skills Solutions';
  const description = meta.description || 'Accessible technology resources, browser tools and practical technical guides.';
  const keywords = meta.keywords || 'Technical Skills Solutions, accessible technology, NVDA, JAWS, screen reader tools';
  const html = `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="color-scheme" content="dark light"><meta name="theme-color" content="#081426"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="keywords" content="${esc(keywords)}"><meta name="author" content="Technical Skills Solutions"><meta name="robots" content="${esc(meta.robots || 'index,follow')}"><link rel="canonical" href="${esc(url)}"><link rel="icon" href="/images/logo.svg" type="image/svg+xml"><link rel="manifest" href="/manifest.webmanifest"><meta property="og:type" content="website"><meta property="og:site_name" content="Technical Skills Solutions"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="https://technicalskillssolutions.in/images/og-default.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="https://technicalskillssolutions.in/images/og-default.png"><link rel="stylesheet" href="/css/style.css"><script type="importmap">${JSON.stringify(importMap)}</script><script type="module" src="/scripts/site.js"></script></head><body><div id="app">${markup}</div></body></html>`;
  const route = meta.path || routeMap[key] || '/';
  const target = route === '/' ? path.join(dist, 'index.html') : path.join(dist, route.replace(/^\//,'').replace(/\/$/,''), 'index.html');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, html);
}
for (const [key, file] of Object.entries(files)) {
  const markup = await fs.readFile(path.join(root, 'src/content', file), 'utf8');
  await writePage(key, markup);
}
const blogs = JSON.parse(await fs.readFile(path.join(root, 'src/data/blogs.json'), 'utf8'));
for (const post of blogs) {
  let body = '';
  for (const section of post.sections || []) {
    if (section.heading) body += `<h2>${esc(section.heading)}</h2>`;
    for (const paragraph of section.paragraphs || []) body += `<p>${esc(paragraph)}</p>`;
    if (section.bullets?.length) body += '<ul>' + section.bullets.map(item => `<li>${esc(item)}</li>`).join('') + '</ul>';
  }
  const markup = `<a class="skip-link" href="#main-content">Skip to main content</a><div class="home-greeting" role="group" aria-label="Welcome"><p id="welcome-greeting">Good evening</p><time class="clock" id="welcome-clock" aria-live="off">--:--:--</time></div><div class="access access-toolbar" role="group" aria-label="Accessibility Controls"><div class="toolbar-inner access-inner"><button class="toolbar-button" id="font-down" type="button" aria-label="Decrease font size">Decrease font</button><button class="toolbar-button" id="font-reset" type="button" aria-label="Reset font size">Reset font</button><button class="toolbar-button" id="font-up" type="button" aria-label="Increase font size">Increase font</button><span id="font-size-value">Text size: 16 px</span><button class="toolbar-button" id="theme-toggle" type="button" aria-pressed="false">Dark/Light Mode</button><button class="toolbar-button" id="contrast-toggle" type="button" aria-pressed="false">High Contrast</button></div></div><header class="site-header main-header"><div class="header-inner"><a class="brand logo" href="/" aria-label="Technical Skills Solutions home"><img src="/images/logo.svg" alt="" width="54" height="54"><span><strong>Technical Skills Solutions</strong><small>Technology Without Barriers</small></span></a><button id="menu-toggle" class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav"><span aria-hidden="true">☰</span><span id="menu-toggle-label">Open navigation menu</span></button><nav id="main-nav" class="main-nav mobile-nav" aria-label="Primary navigation"><a href="/">Home</a><a href="/about/">About</a><a href="/tools/">Tools</a><a href="/software/">Software</a><a href="/shop/">Shop</a><a href="/blogs/" accesskey="b">Blogs</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact/">Contact</a></nav></div></header><main id="main-content" tabindex="-1"><article class="container content-card editorial-article"><p class="eyebrow">${esc(post.category || 'Technology')}</p><h1>${esc(post.title)}</h1><p class="lead">${esc(post.dek || '')}</p><p class="article-meta">Published ${esc(post.published || '')} · ${esc(post.readTime || '')}</p>${body}<h2>Sources and further reading</h2><ul>${(post.sources || []).map(source => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label || source.url)}</a></li>`).join('')}</ul><p><a href="/blogs/">Back to Blogs</a></p></article></main><footer class="site-footer"><div class="footer-container"><p>Technical Skills Solutions — Technology Without Barriers</p><p><a href="/privacy/">Privacy Policy</a> · <a href="/terms/">Terms of Service</a></p><p>© 2026 Technical Skills Solutions. All rights reserved.</p></div></footer><div id="live-region" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>`;
  await writePage('blogs', markup, { title:`${post.title} - Technical Skills Solutions`, description:post.dek || pageMeta.blogs.description, keywords:pageMeta.blogs.keywords, path:`/blogs/${post.slug}/` });
}
await fs.copyFile(path.join(root, 'src/styles/site.css'), path.join(dist, 'css/style.css'));

// Generate sitemap entries from the routes that actually exist in this build.
const sitemapPaths = Object.values(routeMap).filter((value, index, all) => all.indexOf(value) === index);
for (const post of blogs) sitemapPaths.push(`/blogs/${post.slug}/`);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapPaths.map(route => `  <url><loc>https://technicalskillssolutions.in${route}</loc></url>`).join('\n')}\n</urlset>\n`;
await fs.writeFile(path.join(dist, 'sitemap.xml'), sitemap);

// A useful accessible fallback for unknown routes on GitHub Pages.
await fs.writeFile(path.join(dist, '404.html'), `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found - Technical Skills Solutions</title><meta name="description" content="The requested page could not be found. Return to Technical Skills Solutions or browse the available tools."><meta name="robots" content="noindex,follow"><meta name="theme-color" content="#081426"><link rel="stylesheet" href="/css/style.css"></head><body><main class="container section-block"><article class="content-card"><h1>Page not found</h1><p>The page may have moved or the address may be incorrect.</p><p><a class="button-link" href="/">Go to homepage</a></p><p><a href="/tools/">Browse all tools</a></p></article></main></body></html>`);
console.log(`Built ${Object.keys(files).length + blogs.length} static HTML pages and compiled TypeScript browser modules.`);

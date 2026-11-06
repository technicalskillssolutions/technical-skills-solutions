# Migration notes — Technical Skills Solutions v17

- The website source is plain HTML, CSS and TypeScript; Astro source and Astro routing have been removed.
- `npm run build` type-checks/compiles the browser TypeScript and produces the complete deployable site in `dist/`.
- GitHub Actions installs the pinned TypeScript compiler, builds the site and deploys `dist/` to GitHub Pages.
- The website uses directory routes such as `/ocr/`, `/url-shortener/` and `/temporary-mail/`, so GitHub Pages does not depend on the old Astro `.html` route names.
- OCR runs in the browser. Tesseract.js worker/core, language data and PDF.js modules are loaded from pinned public CDN locations. The selected document itself is not uploaded to the website server.
- QR generation is loaded on demand from a pinned public CDN module; if that module is unavailable, the rest of the website and generated chat link remain usable.
- URL shortening sends the submitted destination URL to the external shortening API. QR rendering takes place in the browser.
- Temporary Mail calls the public Mail.tm API directly. It does not request the visitor's personal name, contact email or phone number. The provider controls availability and rate limits.
- The Service Worker cache namespace is bumped to remove stale scripts from previous site versions after the new worker activates.

# Final fixes included in Version 17

- Static website source uses HTML, CSS and TypeScript; Astro routing and dependencies have been removed.
- The build produces all site pages, tool routes, SEO metadata, sitemap and an accessible 404 page.
- QR code module loading is lazy and supports either the `toCanvas` or `toDataURL` browser API. A QR CDN problem does not prevent the global accessibility interface from initializing.
- The generated chat link is displayed and focused before optional QR rendering. A Copy button remains available if QR creation fails.
- OCR uses version-pinned Tesseract.js, Tesseract worker/core, language assets and PDF.js worker locations. OCR startup failures are shown in the page status.
- URL Shortener shows its short-link result and copy control separately from QR generation. The public site does not name the former shortening provider.
- Temporary Mail uses a direct public API, creates a random inbox without requesting personal contact details, keeps its access token in the current browser tab session, renders email content as plain text and offers account deletion.
- The Service Worker cache namespace is bumped so old scripts are removed after the new worker activates.
- Exactly one `<br>` is inserted between adjacent buttons in each `.button-row`.

External APIs and CDNs remain subject to provider policies, browser network restrictions, availability and rate limits. The source build and local static route checks have been run; third-party live-service availability must be confirmed after deployment.

# OCR and button accessibility notes

- OCR loads Tesseract.js and PDF.js as browser ESM modules from pinned CDN versions.
- Tesseract worker and language assets are loaded on demand. The selected document remains in browser memory and is not uploaded to the website server.
- Detailed OCR startup errors are displayed in the page status area instead of being hidden.
- Each `.button-row` receives exactly one `<br>` between adjacent button controls when the page initializes.
- Button status messages use accessible status regions; the clock remains readable without announcing every second.

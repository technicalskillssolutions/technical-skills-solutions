# Technical Skills Solutions — Final Static Website v17

यह पूरा source project और पहले से तैयार `dist/` deployment folder है। Project HTML + CSS + TypeScript पर आधारित है; Astro की जरूरत नहीं है।

## मुख्य tool routes

- `/ocr/`
- `/url-shortener/`
- `/chat-link-generator/`
- `/password-generator/`
- `/sip-calculator/`
- `/email-signature/`

साथ में Home, About, Tools, Shop, Software, Android guide, Blogs, Privacy, Terms और Contact pages शामिल हैं।

## जाँच

- TypeScript typecheck: सफल
- Static build: सफल; 24 content pages generated
- HTML documents: 26, जिनमें 404 और offline pages भी हैं
- Sitemap: 24 routes
- सभी local root-relative links/assets: मौजूद
- सभी प्रमुख tool routes पर local static server से HTTP 200
- Generated JavaScript syntax checks: सफल

## बाहरी सेवाओं की सीमा

OCR engine, PDF.js, language files और QR module pinned public CDN से लोड होते हैं। URL shortener third-party API पर निर्भर है। उनकी live availability, provider-side rate limits, CORS/browser policy और account/domain capacity इस package के build test से प्रमाणित नहीं होते। Tool में provider की त्रुटि छिपाने के बजाय status में दिखाई जाती है। File Integrity & Hash Checker browser के built-in Web Crypto API पर चलता है; इसमें external API या model download नहीं है।

## Deploy

1. ZIP extract करें।
2. Extracted folder के अंदर की files अपने GitHub repository root में रखें। `.git` folder को delete या replace न करें।
3. `git add -A`, `git commit` और `git push origin main` चलाएँ।
4. GitHub repository के Settings → Pages → Build and deployment में Source = GitHub Actions रखें।
5. Actions workflow सफल होने पर website deploy हो जाएगी।

Local development के लिए `npm install` के बाद `npm run dev` चलाएँ। पहले से बने static output को देखने के लिए `npm run preview` चलाएँ।


## 2026-11-06 minor update
- Accessibility toolbar note removed from every content page and generated blog template.
- Font control accessible labels simplified to Decrease font size / Reset font size / Increase font size.

- File Integrity & Hash Checker `/file-integrity-checker/` पर SHA-256, SHA-384 और SHA-512 प्रदान करता है। Files browser में ही रहती हैं; कोई model download या file upload नहीं होता।

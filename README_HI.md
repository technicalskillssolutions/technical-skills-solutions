# Technical Skills Solutions — Complete Static Website

यह प्रोजेक्ट static HTML + CSS + TypeScript पर आधारित है। Astro, Cloudflare Worker या अपनी वेबसाइट का backend आवश्यक नहीं है।

## आवश्यक चीजें
- Node.js 20 या 22
- npm
- Build के समय TypeScript compiler install करने के लिए इंटरनेट
- OCR, short-link API और temporary inbox के लिए ब्राउज़र में इंटरनेट

## Local preview

```bash
npm install
npm run build
npm run preview
```

ब्राउज़र में `http://localhost:4321` खोलें। `npm run dev` भी build करके वही preview server चलाता है।

## GitHub Pages पर प्रकाशित करना
1. ZIP extract करें।
2. Folder के अंदर की सभी files GitHub repository के root में रखें; folder को nested folder के रूप में upload न करें।
3. Windows Terminal या CMD में repository folder के अंदर ये commands चलाएँ:

   ```bat
   git add -A
   git commit -m "Deploy Technical Skills Solutions static website"
   git push origin main
   ```

   इसके बाद GitHub Actions अपने-आप build और deploy करेगा।
4. GitHub में **Settings → Pages → Build and deployment → Source** में **GitHub Actions** चुनें।
5. **Deploy static website** workflow के सफल होने के बाद custom domain खोलें और एक बार hard refresh करें।

GitHub Actions source से TypeScript compile करता है और `dist/` deploy करता है। Repository में `dist/` को source के रूप में upload करने की आवश्यकता नहीं है।

## Tools and external services
- **OCR:** Images/PDFs browser में process होते हैं। Tesseract.js, PDF.js और language assets pinned CDN locations से load होते हैं। Selected PDF/image files इस साइट के server पर upload नहीं किए जाते।
- **URL Shortener:** Destination URL external shortening API को भेजा जाता है। QR image browser में bundled QRCode module से बनती है। Private links shorten न करें।
- **Chat Link Generator:** Link result हमेशा दिखाई देता है और copy किया जा सकता है; QR बनाने में समस्या हो तो भी link उपलब्ध रहता है। Platform restrictions लागू होती हैं।

## Accessibility
Skip to main content, semantic headings, field labels, keyboard access, visible focus, screen-reader status messages, accessibility controls, high contrast and non-live clock are retained. Consecutive action buttons in `.button-row` are separated by a single `<br>`.

- **File Integrity & Hash Checker:** SHA-256, SHA-384 और SHA-512 checksums browser के Web Crypto API से स्थानीय रूप से calculate और verify करता है। कोई file upload या AI model download नहीं।

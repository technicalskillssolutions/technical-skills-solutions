# GitHub Pages Project URL Fix

This project is deployed from the repository `technicalskillssolutions/technical-skills-solutions`.

GitHub Project Pages serves it below `/technical-skills-solutions/`, not from the domain root. The build now prefixes internal page links and static assets with that repository path, updates the browser route detection, scopes the web app manifest and service worker to the project path, and omits the unconfigured custom-domain CNAME file.

## Build verification

Run:

```bash
npm install
npm run typecheck
npm run build
```

The GitHub Actions workflow publishes the generated `dist` folder.

## Publish the fix

Copy the contents of this project folder into the existing local Git working folder for this repository, keeping its `.git` directory. Then run:

```bash
git status
git add .
git commit -m "Fix GitHub Pages project base path"
git push origin main
```

After the GitHub Actions workflow succeeds, open:

`https://technicalskillssolutions.github.io/technical-skills-solutions/`

This build targets the GitHub Pages repository URL. Reconfigure the custom domain separately after its DNS records are ready.

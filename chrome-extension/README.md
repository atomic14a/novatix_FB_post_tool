# Novatix Extension Lab

This folder contains the new Chrome extension foundation for the extension-based module.

## Flow B
1. Load this folder as an unpacked extension in Chrome.
2. Open the popup and log in with the same email/password you use on the website.
3. After login, the extension opens `/extension/bridge` on the website.
4. The website creates the matching logged-in session and redirects to `/dashboard/extension`.
5. Use the website Test Lab page to create jobs and the popup to sync, fetch, and execute them.

## Files
- `manifest.json` - Chrome extension manifest
- `config.js` - website/app connection config
- `background.js` - auth, sync, polling, job execution
- `content.js` - Facebook page context detection
- `popup.html` - popup UI
- `popup.css` - popup styling
- `popup.js` - popup UI logic

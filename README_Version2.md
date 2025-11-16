# Zombiesurvive Mods (GitHub Pages host)

This repository hosts JavaScript mod files for use with a Tampermonkey user script. The files are served via GitHub Pages so your Tampermonkey script can load them by URL.

Repository name suggested: `zombiesurvive-mods` (under GitHub user: `thebluds123-jpg`).
After you create the repo and push these files, enable GitHub Pages: Settings → Pages → Branch: `main` (or `gh-pages`) and Folder: `/ (root)`.

Included files
- `modloader.js` — lightweight mod loader and overlay helper.
- `mods/dev-controls.js` — example dev controls (health/ammo buttons).
- `index.html` — simple landing page.
- `CNAME` — optional; place a custom domain here if desired.
- `.nojekyll` — empty file so GitHub Pages serves files as-is.
- `tampermonkey.user.js` — example Tampermonkey script to load the hosted files.

Tampermonkey installation
1. Create a new repository on GitHub named `zombiesurvive-mods` (or another name you choose).
2. Add these files and commit to the `main` branch (or any branch you’ll point Pages at).
3. In the repo Settings → Pages set the source to `main` (root).
4. After Pages publishes, the files will be available at:
   - https://thebluds123-jpg.github.io/zombiesurvive-mods/modloader.js
   - https://thebluds123-jpg.github.io/zombiesurvive-mods/mods/dev-controls.js

Use this Tampermonkey user script (already included as `tampermonkey.user.js`) — it will load the mod files from GitHub Pages:

```javascript
// ==UserScript==
// @name         Zombiesurvive Dev Injection
// @match        *://zombiesurvive.io/*
// @run-at       document-start
// ==/UserScript==
(function(){
   const mods=[
     "https://thebluds123-jpg.github.io/zombiesurvive-mods/modloader.js",
     "https://thebluds123-jpg.github.io/zombiesurvive-mods/mods/dev-controls.js"
   ];
   mods.forEach(src=>{
     const s=document.createElement("script");
     s.src=src;
     s.async = false; // ensure execution order
     document.documentElement.appendChild(s);
   });
})();
```

Notes and tips
- The Tampermonkey script uses document-start and appends the scripts into document.documentElement so `modloader.js` loads before the other mod files. `modloader.js` registers a global loader and executes registered mods on page load.
- I set s.async = false to try to preserve execution order (modloader first, then dev modules). Some browsers may still reorder fetches; if you observe issues, use an explicit loader fetch+eval pattern or host a single bundle (recommended) to guarantee ordering.
- If you use a custom domain, add the domain to the `CNAME` file and follow GitHub DNS setup instructions.
- .nojekyll is included so files/folders that begin with underscores or similar are served as-is.

If you want, I can provide a single bundled file (modbundle.js) that concatenates modloader + all mods to ensure ordering and avoid cross-file async issues.
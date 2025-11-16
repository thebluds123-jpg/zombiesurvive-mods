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
     s.async = false; // try to preserve load order
     document.documentElement.appendChild(s);
   });
})();

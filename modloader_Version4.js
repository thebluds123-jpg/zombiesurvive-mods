// Improved modloader.js — polls for Unity readiness and calls mods' onReady safely
// Replace the repo copy with this file.

const loader = {
  mods: [],
  _ready: false,
  _pollHandle: null,

  register(mod) {
    try {
      this.mods.push(mod);
      // If already ready, call onReady immediately for late-registered mods
      if (this._ready) {
        try { mod.onReady?.({ overlay: this.overlay, game: window.unityInstance }); }
        catch (e) { console.error(`[UnityModLoader] mod.onReady error (late):`, e); }
      }
    } catch (e) {
      console.error("[UnityModLoader] register error:", e);
    }
  },

  init() {
    if (this._ready) return;
    const tryInitOnce = () => {
      // Consider Unity "ready" if SendMessage exists or window.unityInstance is present
      const unityReady = (typeof SendMessage === "function") || !!window.unityInstance;
      const domReady = document.readyState === "complete" || document.readyState === "interactive";

      if (unityReady || domReady) {
        // Mark ready and call mods
        this._ready = true;
        if (this._pollHandle) {
          clearInterval(this._pollHandle);
          this._pollHandle = null;
        }
        console.info("[UnityModLoader] ready — unityReady:", !!unityReady, "domReady:", !!domReady);
        this.mods.forEach(m => {
          try {
            m.onReady?.({ overlay: this.overlay, game: window.unityInstance });
          } catch (e) {
            console.error("[UnityModLoader] mod.onReady error:", e);
          }
        });
      } else {
        // Start a poller (if not already started) to wait for the Unity runtime
        if (!this._pollHandle) {
          console.info("[UnityModLoader] Unity not detected yet, polling for unity runtime...");
          this._pollHandle = setInterval(() => {
            const r = (typeof SendMessage === "function") || !!window.unityInstance;
            if (r) {
              clearInterval(this._pollHandle);
              this._pollHandle = null;
              // call mods once poll detects unity
              this._ready = true;
              console.info("[UnityModLoader] Unity detected via poll. Invoking mods.");
              this.mods.forEach(m => {
                try {
                  m.onReady?.({ overlay: this.overlay, game: window.unityInstance });
                } catch (e) {
                  console.error("[UnityModLoader] mod.onReady error (poll):", e);
                }
              });
            }
          }, 500); // check twice per second
        }
      }
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
      tryInitOnce();
    } else {
      window.addEventListener("load", tryInitOnce, { once: true });
      // also try immediately (in case scripts are injected very early)
      setTimeout(tryInitOnce, 0);
    }
  },

  overlay: {
    createPanel: function (title, pos) {
      try {
        const wrap = document.createElement("div");
        wrap.innerHTML = `<h4 style="margin:0 0 6px 0;font-size:12px">${title}</h4>`;
        Object.assign(wrap.style, {
          position: "fixed",
          top: pos?.top || "10px",
          left: pos?.left || "10px",
          background: "rgba(0,0,0,0.6)",
          color: "#0f0",
          zIndex: 2147483647, // very high to avoid being hidden
          padding: "6px",
          fontFamily: "monospace",
          borderRadius: "4px",
        });
        // If body is not ready, append to documentElement as a fallback
        const parent = document.body || document.documentElement;
        parent.appendChild(wrap);
        return { panel: wrap };
      } catch (e) {
        console.error("[UnityModLoader] createPanel error:", e);
        return { panel: document.createElement("div") };
      }
    }
  }
};

// Expose globally, allow multiple injections to reuse same object
if (!window.UnityModLoader) {
  window.UnityModLoader = loader;
  // If script is appended after page already loaded, init immediately
  try {
    loader.init();
    console.info("[UnityModLoader] injected and init called");
  } catch (e) {
    console.error("[UnityModLoader] init error:", e);
  }
} else {
  // If already present, keep existing behavior but ensure init gets called
  try {
    window.UnityModLoader.init?.();
    console.info("[UnityModLoader] existing loader detected, called init()");
  } catch (e) {
    console.error("[UnityModLoader] existing loader init error:", e);
  }
}
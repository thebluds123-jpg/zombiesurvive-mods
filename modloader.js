const loader = {
  mods: [],
  register(mod) { this.mods.push(mod); },
  init() {
    // call onReady for each registered mod
    this.mods.forEach(m => m.onReady?.({
      overlay: this.overlay,
      game: window.unityInstance
    }));
  },
  overlay: {
    createPanel: (title, pos) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = `<h4>${title}</h4>`;
      Object.assign(wrap.style, {
        position: "fixed",
        top: pos.top,
        left: pos.left,
        background: "rgba(0,0,0,0.6)",
        color: "#0f0",
        zIndex: 99999,
        padding: "4px",
        fontFamily: "monospace"
      });
      document.body.appendChild(wrap);
      return { panel: wrap };
    }
  }
};
window.UnityModLoader = loader;

// If page already loaded, init immediately; otherwise init on load.
if (document.readyState === "complete" || document.readyState === "interactive") {
  // small delay to ensure any registered mods appended right after loading this script get registered
  setTimeout(()=>loader.init(), 0);
} else {
  window.addEventListener("load", ()=>loader.init());
}

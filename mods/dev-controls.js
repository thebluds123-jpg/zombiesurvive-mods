UnityModLoader.register({
  id: "dev-controls",
  onReady({ overlay }) {
    const { panel } = overlay.createPanel("DevTools", { top: "30px", left: "20px" });
    panel.innerHTML = `
      <button id="hp">∞ HP</button>
      <button id="ammo">∞ Ammo</button>
    `;
    panel.onclick = e => {
      if (e.target.id === "hp")   SendMessage("GameManager", "SetHealth", "9999");
      if (e.target.id === "ammo") SendMessage("WeaponManager", "SetAmmo", "999");
    };
    console.log("DevControls active");
  }
});

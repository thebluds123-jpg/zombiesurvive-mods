// Safer dev-controls.js — waits for SendMessage, queues clicks, and logs status.
// Replace the repo copy in mods/ with this file.

(function () {
  const mod = {
    id: "dev-controls",
    onReady({ overlay }) {
      const { panel } = overlay.createPanel("DevTools", { top: "30px", left: "20px" });
      panel.innerHTML = `
        <button id="zr-hp" style="margin-right:6px">∞ HP</button>
        <button id="zr-ammo">∞ Ammo</button>
        <div id="zr-status" style="margin-top:6px;font-size:11px;color:#afa"></div>
      `;

      const status = panel.querySelector("#zr-status");
      const updateStatus = txt => { if (status) status.textContent = txt; };

      // Queue of actions to run once SendMessage exists
      const queued = [];

      function sendSafe(objName, method, val) {
        if (typeof SendMessage === "function") {
          try {
            SendMessage(objName, method, val);
            console.info(`[dev-controls] SendMessage -> ${objName}.${method}(${val})`);
            updateStatus("Sent: " + method);
            return true;
          } catch (e) {
            console.error("[dev-controls] SendMessage threw:", e);
            updateStatus("SendMessage error");
            return false;
          }
        } else {
          // queue for later
          queued.push({ objName, method, val });
          updateStatus("Queued action (waiting for Unity)"); 
          console.info("[dev-controls] SendMessage not present — queued action", objName, method, val);
          return false;
        }
      }

      // Buttons handler
      panel.addEventListener("click", (e) => {
        if (!e.target) return;
        if (e.target.id === "zr-hp") {
          sendSafe("GameManager", "SetHealth", "9999");
        } else if (e.target.id === "zr-ammo") {
          sendSafe("WeaponManager", "SetAmmo", "999");
        }
      });

      // Poll for SendMessage to flush queued actions
      const flushIfReady = () => {
        if (queued.length === 0) {
          updateStatus("Waiting for Unity...");
        }
        if (typeof SendMessage === "function") {
          updateStatus("Unity API available");
          console.info("[dev-controls] SendMessage is available — flushing", queued.length, "items");
          while (queued.length) {
            const a = queued.shift();
            try {
              SendMessage(a.objName, a.method, a.val);
              console.info("[dev-controls] flushed:", a);
            } catch (e) {
              console.error("[dev-controls] error flushing:", e);
            }
          }
          // stop polling
          if (pollHandle) {
            clearInterval(pollHandle);
            pollHandle = null;
          }
        }
      };

      let pollHandle = null;
      // If SendMessage present now, flush immediately; otherwise start short poll
      if (typeof SendMessage === "function") {
        updateStatus("Unity API available");
        console.info("[dev-controls] SendMessage present at onReady");
      } else {
        updateStatus("Waiting for Unity API...");
        pollHandle = setInterval(flushIfReady, 500);
      }

      console.log("DevControls registered and UI created");
    }
  };

  // Register mod (supports late registration)
  try {
    UnityModLoader.register(mod);
    console.info("[dev-controls] registered with UnityModLoader");
  } catch (e) {
    console.error("[dev-controls] failed to register:", e);
  }
})();

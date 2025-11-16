// Improved dev-controls.js — robust SendMessage strategies, diagnostics, and runtime tester.
// Replace the file in mods/ with this version and reload the game page.
// It will attempt multiple ways to call Unity's SendMessage, queue actions until a sender is available,
// and provide a small UI so you can test different target object/method names.

(function () {
  const mod = {
    id: "dev-controls",
    onReady({ overlay }) {
      const { panel } = overlay.createPanel("DevTools", { top: "30px", left: "20px" });
      panel.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:6px;min-width:220px">
          <div>
            <button id="zr-hp" style="margin-right:6px">∞ HP</button>
            <button id="zr-ammo">∞ Ammo</button>
          </div>

          <div style="font-size:11px;color:#afa" id="zr-status">Status: initialising...</div>

          <div style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.06);padding-top:6px">
            <div style="font-size:11px;margin-bottom:4px">Manual test</div>
            <input id="zr-obj" placeholder="ObjectName (e.g. GameManager)" style="width:100%;box-sizing:border-box;margin-bottom:4px"/>
            <input id="zr-method" placeholder="Method (e.g. SetHealth)" style="width:100%;box-sizing:border-box;margin-bottom:4px"/>
            <input id="zr-val" placeholder="Value (string)" style="width:100%;box-sizing:border-box;margin-bottom:6px"/>
            <div style="display:flex;gap:6px">
              <button id="zr-test">Try</button>
              <button id="zr-probe">Probe senders</button>
              <button id="zr-auto">Auto-probe common</button>
            </div>
            <div id="zr-probelog" style="margin-top:6px;font-size:11px;color:#9f9;max-height:120px;overflow:auto"></div>
          </div>
        </div>
      `;

      const status = panel.querySelector("#zr-status");
      const probelog = panel.querySelector("#zr-probelog");
      const updateStatus = txt => { if (status) status.textContent = "Status: " + txt; };

      // Queue actions until any sender works
      const queued = [];

      // Keep the list of detected senders (name + call function)
      let senders = [];

      function logProbe(txt) {
        const line = document.createElement("div");
        line.textContent = txt;
        probelog.appendChild(line);
        probelog.scrollTop = probelog.scrollHeight;
        console.info("[dev-controls probe] " + txt);
      }

      // Detect possible SendMessage entry points and wrap them
      function detectSenders() {
        const found = [];

        try {
          if (typeof SendMessage === "function") {
            found.push({ name: "global SendMessage", fn: SendMessage });
          }
        } catch (e) { /* ignore */ }

        try {
          if (window.unityInstance && typeof window.unityInstance.SendMessage === "function") {
            found.push({ name: "window.unityInstance.SendMessage", fn: window.unityInstance.SendMessage.bind(window.unityInstance) });
          }
        } catch (e) { /* ignore */ }

        try {
          if (window.gameInstance && typeof window.gameInstance.SendMessage === "function") {
            found.push({ name: "window.gameInstance.SendMessage", fn: window.gameInstance.SendMessage.bind(window.gameInstance) });
          }
        } catch (e) { /* ignore */ }

        try {
          if (typeof Module !== "undefined" && Module && typeof Module.SendMessage === "function") {
            found.push({ name: "Module.SendMessage", fn: Module.SendMessage.bind(Module) });
          }
        } catch (e) { /* ignore */ }

        // Also scan window object properties for any object that has SendMessage function
        // (limit list so we don't freeze the page)
        try {
          const keys = Object.keys(window).slice(0, 200);
          for (const k of keys) {
            try {
              const obj = window[k];
              if (obj && typeof obj.SendMessage === "function") {
                // Avoid duplicates
                if (!found.some(f => f.name === `${k}.SendMessage`)) {
                  found.push({ name: `${k}.SendMessage`, fn: obj.SendMessage.bind(obj) });
                }
              }
            } catch (e) { /* ignore property access errors */ }
          }
        } catch (e) { /* ignore */ }

        senders = found;
        return found;
      }

      // Try to send using detected senders, return true if any succeeded
      function trySendUsingSenders(objName, method, val) {
        const now = detectSenders();
        if (!now || now.length === 0) {
          updateStatus("No SendMessage entry point detected");
          return false;
        }

        updateStatus("Attempting send via " + now.map(s => s.name).join(", "));
        let ok = false;
        for (const s of now) {
          try {
            // Call and catch exceptions
            s.fn(objName, method, val);
            logProbe(`Sent via ${s.name}: ${objName} ${method} ${val}`);
            ok = true;
          } catch (e) {
            logProbe(`Sender ${s.name} failed: ${e && e.message ? e.message : e}`);
            // continue trying others
          }
        }
        return ok;
      }

      // Generic send wrapper: try immediate send, else queue and start polling
      function sendSafe(objName, method, val) {
        if (trySendUsingSenders(objName, method, val)) {
          updateStatus(`Sent ${method}`);
          return true;
        } else {
          queued.push({ objName, method, val });
          updateStatus("Queued action (waiting for sender)");
          console.info("[dev-controls] SendMessage not present — queued action", objName, method, val);
          // start polling if not already
          if (!pollHandle) {
            pollHandle = setInterval(flushIfReady, 500);
          }
          return false;
        }
      }

      // Flush queued actions if a sender is available
      function flushIfReady() {
        const now = detectSenders();
        if (!now || now.length === 0) {
          updateStatus(`Waiting for Unity... queued: ${queued.length}`);
          return;
        }
        updateStatus("Unity API available; flushing queue");
        console.info("[dev-controls] SendMessage is available — flushing", queued.length, "items");
        while (queued.length) {
          const a = queued.shift();
          try {
            let sent = false;
            // trySendUsingSenders will attempt all detected senders
            sent = trySendUsingSenders(a.objName, a.method, a.val);
            if (!sent) {
              logProbe("Flush attempt failed for: " + a.objName + " " + a.method + " " + a.val);
            } else {
              logProbe("Flushed: " + a.objName + " " + a.method + " " + a.val);
            }
          } catch (e) {
            console.error("[dev-controls] error flushing:", e);
            logProbe("Error flushing: " + (e && e.message ? e.message : e));
          }
        }
        // stop polling (we'll re-start on new queued actions)
        if (pollHandle) {
          clearInterval(pollHandle);
          pollHandle = null;
        }
      }

      // A small list of common object names/methods to auto-probe
      const commonTargets = [
        { obj: "GameManager", method: "SetHealth", val: "9999" },
        { obj: "GameManager", method: "setHealth", val: "9999" },
        { obj: "Player", method: "SetHealth", val: "9999" },
        { obj: "Player", method: "SetLocalHealth", val: "9999" },
        { obj: "WeaponManager", method: "SetAmmo", val: "999" },
        { obj: "LocalPlayer", method: "SetHealth", val: "9999" }
      ];

      // Button handlers
      panel.querySelector("#zr-hp").addEventListener("click", () => {
        sendSafe("GameManager", "SetHealth", "9999");
      });

      panel.querySelector("#zr-ammo").addEventListener("click", () => {
        sendSafe("WeaponManager", "SetAmmo", "999");
      });

      panel.querySelector("#zr-test").addEventListener("click", () => {
        const obj = panel.querySelector("#zr-obj").value.trim();
        const method = panel.querySelector("#zr-method").value.trim();
        const val = panel.querySelector("#zr-val").value;
        if (!obj || !method) {
          logProbe("Provide both object and method to test.");
          return;
        }
        sendSafe(obj, method, val);
      });

      panel.querySelector("#zr-probe").addEventListener("click", () => {
        const found = detectSenders();
        if (!found.length) {
          logProbe("No senders found on probe.");
        } else {
          for (const s of found) logProbe("Found sender: " + s.name);
        }
      });

      panel.querySelector("#zr-auto").addEventListener("click", () => {
        logProbe("Auto-probing common targets...");
        (async () => {
          for (const t of commonTargets) {
            logProbe(`Trying ${t.obj}.${t.method}(${t.val})`);
            sendSafe(t.obj, t.method, t.val);
            // small delay to avoid spamming
            await new Promise(r => setTimeout(r, 150));
          }
          logProbe("Auto-probe complete.");
        })();
      });

      // Initial detection & status
      updateStatus("waiting for Unity API...");
      logProbe("DevControls registered. Use Probe or Auto-probe to try sending messages.");
      detectSenders();

      // Poll handle for flushing
      let pollHandle = null;
      if (typeof SendMessage === "function" || (window.unityInstance && typeof window.unityInstance.SendMessage === "function")) {
        // if sender exists immediately, flush none (no queued yet)
        updateStatus("Unity API available");
        logProbe("Unity API appears available at start.");
      } else {
        pollHandle = setInterval(flushIfReady, 500);
      }

      console.log("DevControls registered and UI created");
    }
  };

  try {
    UnityModLoader.register(mod);
    console.info("[dev-controls] registered with UnityModLoader (robust)");
  } catch (e) {
    console.error("[dev-controls] failed to register:", e);
  }
})();

// node capture.mjs <html> <outDir> <seconds> <fps>
// Drives headless Chrome over CDP: seek(t) then screenshot, frame by frame.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const [, , html, outDir, seconds, fps] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const profile = path.join(os.tmpdir(), `rt-capture-${process.pid}`);

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
  "--window-size=1080,1350", "--allow-file-access-from-files", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

try {
  for (let i = 0; ; i++) {
    try { await fetch(`http://127.0.0.1:${PORT}/json/version`); break; }
    catch { if (i > 50) throw new Error("Chrome did not start"); await sleep(200); }
  }
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?file://${html}`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };

  await send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1350, deviceScaleFactor: 1, mobile: false });
  for (let i = 0; (await evaluate("document.readyState")) !== "complete"; i++) {
    if (i > 50) throw new Error("page did not load");
    await sleep(100);
  }
  await evaluate("document.fonts.ready.then(() => true)");

  const total = Math.round(Number(seconds) * Number(fps));
  for (let i = 0; i < total; i++) {
    const t = i / Number(fps);
    await evaluate(`new Promise(r => { seek(${t}); requestAnimationFrame(() => requestAnimationFrame(r)); })`);
    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(outDir, `${String(i).padStart(4, "0")}.png`), Buffer.from(shot.result.data, "base64"));
  }
  ws.close();
  console.log(`captured ${total} frames -> ${outDir}`);
} finally {
  const exited = new Promise((r) => chrome.once("exit", r));
  chrome.kill();
  await Promise.race([exited, sleep(3000)]);
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

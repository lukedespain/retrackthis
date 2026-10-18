// A short confirmation at the bottom of the screen, using the .toast style in brand.css.
// One at a time: a new message replaces the current one. The × closes it early.

let hideTimer: number | undefined;

function hide() {
  window.clearTimeout(hideTimer);
  document.getElementById("rt-toast")?.classList.remove("on");
}

export function showToast(message: string, ms = 6000) {
  if (typeof document === "undefined") return;
  let el = document.getElementById("rt-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "rt-toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    const text = document.createElement("span");
    const close = document.createElement("button");
    close.type = "button";
    close.className = "toast-x";
    close.setAttribute("aria-label", "Dismiss");
    close.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    close.addEventListener("click", hide);
    el.append(text, close);
    document.body.appendChild(el);
  }
  el.querySelector("span")!.textContent = message;
  // Next frame, so the slide-in transition runs even on first use.
  requestAnimationFrame(() => el?.classList.add("on"));
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hide, ms);
}

(() => {
  "use strict";
  const video = document.getElementById("hero-video");
  if (!video) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = navigator.connection;
  let inView = true;
  let failed = false;
  video.muted = true;
  video.playsInline = true;
  const allowed = () => !failed && !document.hidden && inView && !reduced.matches && !connection?.saveData;
  const play = async () => {
    if (!allowed()) { video.pause(); return; }
    try {
      await video.play();
      if (!allowed()) video.pause();
    } catch (_) { /* The poster remains available when autoplay is blocked. */ }
  };
  const update = () => { if (allowed()) void play(); else video.pause(); };
  document.addEventListener("visibilitychange", update);
  reduced.addEventListener("change", update);
  connection?.addEventListener?.("change", update);
  video.addEventListener("error", () => { failed = true; video.hidden = true; });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting);
      update();
    }, { threshold: 0.06 }).observe(video);
  }
  update();
})();

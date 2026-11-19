(() => {
  "use strict";
  const video = document.getElementById("hero-video");
  if (!video) return;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  let inView = !("IntersectionObserver" in window);
  let failed = false;
  const allowed = () => !failed && !document.hidden && inView && !motion.matches && !saveData;
  const play = async () => {
    if (!allowed()) return;
    video.muted = true;
    if (!video.getAttribute("src")) {
      video.src = video.dataset.src;
      video.load();
    }
    try {
      await video.play();
      if (!allowed()) video.pause();
    } catch (_) { /* The separate poster remains visible if playback is blocked. */ }
  };
  const update = () => { if (allowed()) void play(); else video.pause(); };
  video.addEventListener("error", () => { failed = true; video.hidden = true; });
  document.addEventListener("visibilitychange", update);
  motion.addEventListener("change", update);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      update();
    }, { threshold: 0.05 }).observe(video.closest(".hero__film"));
  }
  update();
})();

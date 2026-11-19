(() => {
  "use strict";
  const video = document.getElementById("hero-video");
  const button = document.getElementById("hero-playback");
  if (!video || !button) return;
  const label = button.querySelector("span");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  let userPaused = false;
  let userStarted = false;
  let inView = true;
  let failed = false;
  const sync = () => {
    const playing = !video.paused && !video.ended;
    button.dataset.state = playing ? "playing" : "paused";
    button.setAttribute("aria-label", playing ? "Pausar vídeo" : "Reproduzir vídeo");
    label.textContent = playing ? "Pausar" : "Reproduzir";
  };
  const allowed = () => !failed && !userPaused && !document.hidden && inView && (!(motion.matches || saveData) || userStarted);
  const play = async () => {
    if (!allowed()) return;
    video.muted = true;
    if (!video.getAttribute("src")) {
      video.src = video.dataset.src;
      video.load();
    }
    try { await video.play(); } catch (_) { /* The poster and play control remain available. */ }
    sync();
  };
  const update = () => { if (allowed()) void play(); else video.pause(); };
  button.hidden = false;
  button.addEventListener("click", () => {
    if (!video.paused) { userPaused = true; video.pause(); }
    else { userPaused = false; userStarted = true; void play(); }
    sync();
  });
  video.addEventListener("playing", sync);
  video.addEventListener("pause", sync);
  video.addEventListener("ended", sync);
  video.addEventListener("error", () => { failed = true; video.hidden = true; button.hidden = true; });
  document.addEventListener("visibilitychange", update);
  motion.addEventListener("change", () => { userStarted = false; update(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      update();
    }, { threshold: 0.05 }).observe(video.closest(".hero__film"));
  }
  sync();
  update();
})();

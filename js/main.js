/* ============================================================
   MAIN — 模块装配 / 移动菜单
   开机流程由 boot.js 接管（body.booting → body.loaded）
   ============================================================ */
(function () {
  /* ---------- 移动菜单 ---------- */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  burger.addEventListener('click', () => menu.classList.toggle('open'));

  /* ---------- 环境模块 ---------- */
  window.FX.initParticles();
  window.FX.initLiveData();
  window.FX.initEq();
  window.FX.initHeroParallax();
  window.FX.initSurfaceFx();
  window.Spray.init();

  // Store / Boot / Terminal / Inspect / Anomaly 均为自启动 IIFE
})();

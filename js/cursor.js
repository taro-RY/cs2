/* ============================================================
   CROSSHAIR CURSOR
   - 准星点与外环瞬时跟手（无慢拖尾）
   - 移动时根据速度产生轻微弹性放大，快速回落
   ============================================================ */
(function () {
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (!fine) return;

  const cursor = document.getElementById('cursor');
  const ring = cursor.querySelector('.ring');
  const dot = cursor.querySelector('.dot');

  let x = -100, y = -100;
  let vx = 0, vy = 0, px = 0, py = 0;
  let scale = 1, shown = false;

  document.addEventListener('mousemove', (e) => {
    x = e.clientX; y = e.clientY;
    if (!shown) {
      shown = true;
      cursor.style.opacity = '1';
      px = x; py = y;
    }
    // 瞬时定位：点与环都在当前帧直接到位
    vx = x - px; vy = y - py;
    px = x; py = y;
    const speed = Math.min(Math.hypot(vx, vy) / 60, 1);
    scale = 1 + speed * 0.35;

    dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    ring.style.transform =
      `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${Math.atan2(vy, vx)}rad) scale(${scale})`;
  }, { passive: true });

  // 弹性回落
  (function settle() {
    scale += (1 - scale) * 0.22;
    const rot = ring.style.transform.match(/rotate\(([-\d.]+)rad\)/);
    const r = rot ? parseFloat(rot[1]) : 0;
    ring.style.transform =
      `translate(${px}px,${py}px) translate(-50%,-50%) rotate(${r * 0.8}rad) scale(${scale})`;
    requestAnimationFrame(settle);
  })();

  // 悬停热区：事件委托，动态元素也生效
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('a,button,.skin-card,.bento-cell,#sprayCanvas')) {
      cursor.classList.add('hot');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('a,button,.skin-card,.bento-cell,#sprayCanvas')) {
      cursor.classList.remove('hot');
    }
  });

  document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });
})();

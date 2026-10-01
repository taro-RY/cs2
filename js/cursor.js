/* ============================================================
   CROSSHAIR CURSOR
   - 始终显示：初始即在视口中心；任何 mousemove/pointerdown 都强制可见
   - 仅当指针真正离开浏览器窗口时隐藏（mouseout 且 relatedTarget 为空）
   - 移动时根据速度产生轻微弹性放大，快速回落
   ============================================================ */
(function () {
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (!fine) return;

  const cursor = document.getElementById('cursor');
  const ring = cursor.querySelector('.ring');
  const dot = cursor.querySelector('.dot');

  // 初始即在视口中心显示
  let x = innerWidth / 2, y = innerHeight / 2;
  let vx = 0, vy = 0, px = x, py = y;
  let scale = 1;
  dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
  ring.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
  cursor.style.opacity = '1';

  function show() { cursor.style.opacity = '1'; }

  document.addEventListener('mousemove', (e) => {
    show();
    x = e.clientX; y = e.clientY;
    vx = x - px; vy = y - py;
    px = x; py = y;
    const speed = Math.min(Math.hypot(vx, vy) / 60, 1);
    scale = 1 + speed * 0.35;

    dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    ring.style.transform =
      `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${Math.atan2(vy, vx)}rad) scale(${scale})`;
  }, { passive: true });

  // 任何按下动作也确保准星可见（防止状态被异常清掉）
  document.addEventListener('pointerdown', show, true);

  // 离开窗口才隐藏：relatedTarget 为空表示指针移出了文档
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) cursor.style.opacity = '0';
  });
  document.addEventListener('mouseover', () => { show(); });
  // 窗口重新获得焦点时恢复
  addEventListener('focus', show);
  addEventListener('blur', () => { cursor.style.opacity = '0'; });

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
})();

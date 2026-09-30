/* ============================================================
   SPRAY — 战术喷涂墙
   指针掠过墙面喷出 CS 元素涂鸦：皇冠 / 骷髅 / C4 / 闪电 /
   五角星 / 准星 / B点 / 闪光弹。纯 Canvas 2D，零依赖。
   每个喷涂烘焙成带颗粒网孔的 sprite（离屏渲染一次并缓存）
   ============================================================ */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TYPES = ['crown', 'skull', 'c4', 'bolt', 'star', 'crosshair', 'b', 'flash'];
  const COLORS = ['#f3ede1', '#e5463a', '#de9b35', '#53c4d9', '#9ed352', '#ef7aa6'];
  const RES = 200;                 // sprite 像素尺寸
  const STEP = 42;                 // 轨迹节流距离
  const MAX_SPRAYS = 140;
  const spriteCache = new Map();

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ---------- 模板绘制：单位坐标，主体范围 ±26 ---------- */
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }

  function paint(g, type, color) {
    const dark = '#100c08';
    g.fillStyle = color;
    g.strokeStyle = color;

    switch (type) {
      /* 皇冠 —— 五尖冠 + 底带 + 三尖珠 */
      case 'crown': {
        g.beginPath();
        g.moveTo(-24, 13); g.lineTo(-24, -13); g.lineTo(-12, -2);
        g.lineTo(0, -21); g.lineTo(12, -2); g.lineTo(24, -13); g.lineTo(24, 13);
        g.closePath(); g.fill();
        g.fillRect(-24, 5, 48, 8);
        circle(g, -24, -13, 3.6); circle(g, 0, -21, 3.6); circle(g, 24, -13, 3.6);
        break;
      }
      /* 骷髅 —— 圆颅 + 下颌 + 黑色眼洞鼻洞 + 齿缝 */
      case 'skull': {
        g.beginPath();
        g.moveTo(-17, -5);
        g.arc(0, -5, 17, Math.PI, 0);
        g.lineTo(17, 4); g.lineTo(10, 9); g.lineTo(8, 17);
        g.lineTo(-8, 17); g.lineTo(-10, 9); g.lineTo(-17, 4);
        g.closePath(); g.fill();
        g.fillStyle = dark;
        circle(g, -8, -5, 4.8); circle(g, 8, -5, 4.8);
        g.beginPath(); g.moveTo(-2.8, 2.5); g.lineTo(2.8, 2.5); g.lineTo(0, 8.5); g.closePath(); g.fill();
        g.fillRect(-5.2, 11, 1.7, 6); g.fillRect(-.85, 11, 1.7, 6); g.fillRect(3.5, 11, 1.7, 6);
        break;
      }
      /* C4 —— 矩形炸药包 + 天线 + 红色倒计时 73 */
      case 'c4': {
        rr(g, -19, -10, 38, 28, 4); g.fill();
        g.fillStyle = dark;
        g.fillRect(-2, -10, 4, 28);
        g.fillRect(-11.5, -23, 3, 14);
        circle(g, -10, -23, 2.8);
        rr(g, -13, -3, 26, 11, 2); g.fill();
        g.fillStyle = '#ff5a44';
        g.font = 'bold 9px "Courier New", monospace';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('73', 0, 3.2);
        break;
      }
      /* 闪电 —— 高压折线 */
      case 'bolt': {
        g.beginPath();
        g.moveTo(5, -26); g.lineTo(-12, -1); g.lineTo(-2, -1);
        g.lineTo(-6, 26); g.lineTo(13, 1); g.lineTo(3, 1);
        g.closePath(); g.fill();
        break;
      }
      /* 五角星 */
      case 'star': {
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 10.5 : 25;
          const a = -Math.PI / 2 + i * Math.PI / 5;
          const x = Math.cos(a) * r, y = Math.sin(a) * r;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath(); g.fill();
        break;
      }
      /* 准星 —— 四缺口十字 + 中心点 */
      case 'crosshair': {
        rr(g, -3, -24, 6, 15, 2); g.fill();
        rr(g, -3, 9, 6, 15, 2); g.fill();
        rr(g, -24, -3, 15, 6, 2); g.fill();
        rr(g, 9, -3, 15, 6, 2); g.fill();
        circle(g, 0, 0, 3.4);
        break;
      }
      /* B 点 —— 圆角方框 + 大字 B */
      case 'b': {
        g.lineWidth = 4.5;
        rr(g, -21, -21, 42, 42, 5); g.stroke();
        g.font = '900 29px "Arial Black", Arial, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('B', 0, 3);
        break;
      }
      /* 闪光弹 —— 罐体 + 保险盖 + 四周星芒 */
      case 'flash': {
        g.lineWidth = 3.5; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-31, -3); g.lineTo(-22, -3);
        g.moveTo(22, -3); g.lineTo(31, -3);
        g.moveTo(-29, 12); g.lineTo(-21, 8);
        g.moveTo(29, 12); g.lineTo(21, 8);
        g.stroke();
        rr(g, -7, -25, 14, 8, 2); g.fill();
        rr(g, -12, -17, 24, 37, 8); g.fill();
        g.fillStyle = 'rgba(10,8,6,.55)';
        g.fillRect(-12, -5, 24, 2.4);
        g.fillRect(-12, 8, 24, 2.4);
        break;
      }
    }
  }

  /* ---------- 烘焙带喷漆颗粒的 sprite ---------- */
  function makeSprite(type, color) {
    const key = type + '|' + color;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const cv = document.createElement('canvas');
    cv.width = cv.height = RES;
    const g = cv.getContext('2d');
    const C = RES / 2;
    const K = RES / 76;                 // 单位 52 映射到 ~145px，留飞溅余量

    // 主图案
    g.save();
    g.translate(C, C); g.scale(K, K);
    paint(g, type, color);
    g.restore();

    const rnd = mulberry32(hashStr(key));
    const R1 = 26 * K;

    // 过喷：主体外缘环带的颜料颗粒
    g.fillStyle = color;
    for (let i = 0; i < 52; i++) {
      const a = rnd() * Math.PI * 2;
      const d = R1 * (.9 + rnd() * .32);
      g.globalAlpha = .04 + rnd() * .2;
      g.beginPath();
      g.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, .6 + rnd() * 1.9, 0, Math.PI * 2);
      g.fill();
    }
    // 网孔：镂掉随机小点，形成罐装喷漆的颗粒肌理
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 240; i++) {
      const a = rnd() * Math.PI * 2;
      const d = R1 * Math.sqrt(rnd()) * 1.04;
      g.globalAlpha = .08 + rnd() * .42;
      g.beginPath();
      g.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, .4 + rnd() * 1.3, 0, Math.PI * 2);
      g.fill();
    }
    // 边缘飞白
    for (let i = 0; i < 46; i++) {
      const a = rnd() * Math.PI * 2;
      const d = R1 * (.86 + rnd() * .1);
      g.globalAlpha = .22 + rnd() * .45;
      g.beginPath();
      g.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, .5 + rnd() * 1.7, 0, Math.PI * 2);
      g.fill();
    }
    // 滴漆
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = color;
    const drips = 1 + ((rnd() * 2) | 0);
    for (let i = 0; i < drips; i++) {
      const x = C + (rnd() - .5) * R1 * 1.3;
      const len = 8 + rnd() * 26;
      g.globalAlpha = .18 + rnd() * .22;
      g.fillRect(x, C + R1 * .4, 1.8, len);
      g.beginPath();
      g.arc(x + .9, C + R1 * .4 + len, 1.2 + rnd() * 1.4, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    spriteCache.set(key, cv);
    return cv;
  }

  function initSpray() {
    const canvas = document.getElementById('sprayCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const countEl = document.getElementById('sprayCount');
    const resetBtn = document.getElementById('sprayReset');

    let W = 0, H = 0, DPR = 1, unit = 1;
    let sprays = [];
    let active = false, rafId = null;
    let lastX = null, lastY = null;
    let bag = [];
    let wall = null;   // 离屏砖墙底纹

    // 墙上过去留下的暗色旧痕（固定布局）
    const OLD_MARKS = [
      { x: .13, y: .24, type: 'crosshair', rot: -.18, r: .13 },
      { x: .86, y: .17, type: 'star', rot: .22, r: .11 },
      { x: .74, y: .8, type: 'bolt', rot: -.12, r: .15 },
      { x: .15, y: .84, type: 'crown', rot: .08, r: .12 },
      { x: .48, y: .13, type: 'b', rot: 0, r: .095 }
    ];

    /* ---------- 程序化砖墙：随机砖色 / 灰浆缝 / 噪点 / 暖光 ---------- */
    function buildWall() {
      wall = document.createElement('canvas');
      wall.width = W * DPR; wall.height = H * DPR;
      const g = wall.getContext('2d');
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      const rnd = mulberry32(0xC52026);

      // 灰浆底
      g.fillStyle = '#0c0a08';
      g.fillRect(0, 0, W, H);

      const BH = 47, BW = 168, M = 3;
      for (let row = 0, y = 0; y < H + BH; row++, y += BH) {
        const off = (row % 2) ? -BW / 2 : 0;
        for (let x = off; x < W + BW; x += BW) {
          const rx = x + M / 2, ry = y + M / 2, rw = BW - M, rh = BH - M;
          const l = 7 + rnd() * 6;
          g.fillStyle = `hsl(${25 + rnd() * 8}, ${13 + rnd() * 9}%, ${l}%)`;
          g.fillRect(rx, ry, rw, rh);
          // 砖面上缘微亮、下缘积灰
          g.fillStyle = 'rgba(255,236,205,.035)';
          g.fillRect(rx, ry, rw, 2);
          g.fillStyle = 'rgba(0,0,0,.28)';
          g.fillRect(rx, ry + rh - 2, rw, 2);
          // 表面噪点
          const dots = 10 + ((rnd() * 10) | 0);
          for (let i = 0; i < dots; i++) {
            g.globalAlpha = .03 + rnd() * .08;
            g.fillStyle = rnd() > .5 ? '#e8d4b2' : '#000';
            g.fillRect(rx + rnd() * rw, ry + rnd() * rh, 1 + (rnd() * 1.6 | 0), 1 + (rnd() * 1.6 | 0));
          }
          g.globalAlpha = 1;
          // 偶发的深色潮斑砖
          if (rnd() < .12) {
            g.fillStyle = `rgba(0,0,0,${.08 + rnd() * .14})`;
            g.fillRect(rx, ry, rw, rh);
          }
        }
      }

      // 大块岁月污渍
      for (let i = 0; i < 9; i++) {
        const cx = rnd() * W, cy = rnd() * H, r = 120 + rnd() * 320;
        const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        grd.addColorStop(0, `rgba(0,0,0,${.08 + rnd() * .14})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      // 顶部洒下的暖色灯光
      const warm = g.createRadialGradient(W / 2, -H * .25, 40, W / 2, -H * .25, H * 1.15);
      warm.addColorStop(0, 'rgba(222,155,53,.13)');
      warm.addColorStop(1, 'rgba(222,155,53,0)');
      g.fillStyle = warm;
      g.fillRect(0, 0, W, H);
      // 四角暗角
      const vig = g.createRadialGradient(W / 2, H * .5, H * .3, W / 2, H * .5, H * 1.05);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,.42)');
      g.fillStyle = vig;
      g.fillRect(0, 0, W, H);
    }

    function resize() {
      DPR = Math.min(devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      unit = Math.min(W, H);
      buildWall();
      render(0);
    }

    function drawMark(x, y, size, rot, sprite, alpha) {
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    /* now 为 0 时渲染最终静态帧；否则带喷涂弹出动画 */
    function render(now) {
      ctx.clearRect(0, 0, W, H);
      if (wall) ctx.drawImage(wall, 0, 0, W, H);
      for (const m of OLD_MARKS) {
        drawMark(m.x * W, m.y * H, m.r * unit, m.rot, makeSprite(m.type, '#f3ede1'), .1);
      }
      let animating = false;
      for (const s of sprays) {
        let scale = 1, alpha = 1;
        if (now && !reduceMotion) {
          const p = Math.min((now - s.born) / 340, 1);
          if (p < 1) animating = true;
          const e = 1 - Math.pow(1 - p, 3);
          scale = .45 + .55 * e + Math.sin(p * Math.PI) * .06;
          alpha = e;
        }
        ctx.globalAlpha = alpha;
        const size = s.r * unit * scale;
        ctx.save();
        ctx.translate(s.x * W, s.y * H);
        ctx.rotate(s.rot);
        ctx.drawImage(makeSprite(s.type, s.color), -size / 2, -size / 2, size, size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      return animating;
    }

    function loop(now) {
      if (render(now)) rafId = requestAnimationFrame(loop);
      else { render(0); rafId = null; }
    }
    function ensureLoop() { if (rafId == null) rafId = requestAnimationFrame(loop); }

    function updateCount() { if (countEl) countEl.textContent = sprays.length; }

    function addSpray(clientX, clientY, immediate) {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      if (x < -.03 || x > 1.03 || y < -.03 || y > 1.03) return;
      if (lastX != null && !immediate) {
        const d = Math.hypot((x - lastX) * W, (y - lastY) * H);
        if (d < STEP) return;
      }
      lastX = x; lastY = y;

      if (!bag.length) {
        bag = TYPES.slice();
        for (let i = bag.length - 1; i > 0; i--) {
          const j = (Math.random() * (i + 1)) | 0;
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
      }
      let type = bag.pop();
      if (sprays.length && type === sprays[sprays.length - 1].type && bag.length) {
        bag.unshift(type); type = bag.pop();
      }
      const color = COLORS[(Math.random() * COLORS.length) | 0];
      sprays.push({
        x, y,
        r: .085 + Math.random() * .05,
        rot: (Math.random() - .5) * .7,
        type, color,
        born: performance.now()
      });
      if (sprays.length > MAX_SPRAYS) sprays.shift();
      updateCount();
      ensureLoop();
    }

    /* ---------- 指针：鼠标移动即喷，触摸按住拖动喷 ---------- */
    canvas.addEventListener('pointerdown', e => { lastX = null; addSpray(e.clientX, e.clientY, true); });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerType === 'mouse' || e.buttons || e.pointerType === 'touch') {
        addSpray(e.clientX, e.clientY, false);
      }
    });
    canvas.addEventListener('pointercancel', () => { lastX = null; });
    canvas.addEventListener('pointerleave', () => { lastX = null; });

    resetBtn && resetBtn.addEventListener('click', () => {
      sprays = [];
      updateCount();
      render(0);
    });

    addEventListener('resize', resize);

    /* ---------- 由 pager 控制启停 ---------- */
    resize();
    document.addEventListener('scenechange', e => {
      active = e.detail.id === 'scene-spray';
      if (active) { resize(); ensureLoop(); }
    });
  }

  window.Spray = { init: initSpray };
})();

/* ============================================================
   FX — 环境粒子 / 实时数据 / 音频柱 / 计数 / 雷达 / 卡片交互
   ============================================================ */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- 全局金色战场微尘 ---------- */
  function initParticles() {
    const cv = document.getElementById('particles');
    const ctx = cv.getContext('2d');
    let W, H, parts = [], DPR = Math.min(devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    const density = () => Math.min(64, Math.floor(W * H / 30000));

    // 用户偏好：战场微尘开关（设置面板 → AMBIENT DUST）
    let enabled = window.Store ? !!Store.getSetting('particles', true) : true;
    let running = false, rafId = 0;

    function resize() {
      W = innerWidth; H = innerHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      parts = Array.from({ length: density() }, spawn);
    }
    function spawn() {
      return {
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.5 + .3,
        vy: -(Math.random() * .2 + .05),
        vx: (Math.random() - .5) * .1,
        a: Math.random() * .45 + .1,
        tw: Math.random() * Math.PI * 2,
        tws: Math.random() * .02 + .005,
        hue: 34 + Math.random() * 12
      };
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.y += p.vy; p.x += p.vx; p.tw += p.tws;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 14400) { const d = Math.sqrt(d2) || 1; p.x += dx / d * .5; p.y += dy / d * .5; }
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        const flick = .55 + Math.sin(p.tw) * .45;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},85%,68%,${p.a * flick})`;
        ctx.shadowColor = 'rgba(222,155,53,.8)';
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      rafId = requestAnimationFrame(frame);
    }
    function start() {
      if (running || !enabled) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, W, H);
    }
    document.addEventListener('ctos:setting', (e) => {
      if (!e.detail || e.detail.key !== 'particles') return;
      enabled = !!e.detail.value;
      if (enabled) start(); else stop();
    });
    addEventListener('resize', resize);
    if (finePointer) addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    resize();
    if (!reduceMotion) start();
  }

  /* ---------- Hero 实时数据 ---------- */
  function initLiveData() {
    const pingEl = document.getElementById('pingVal');
    const playersEl = document.getElementById('heroPlayers');
    let players = 1837402;
    setInterval(() => {
      if (pingEl) pingEl.textContent = 9 + Math.floor(Math.random() * 8);
      players += Math.floor(Math.random() * 140 - 60);
      if (playersEl) playersEl.textContent = players.toLocaleString();
    }, 2200);
  }

  /* ---------- EQ 音频柱 ---------- */
  function initEq() {
    const eq = document.getElementById('eqWave');
    if (!eq || eq.children.length) return;
    for (let i = 0; i < 26; i++) {
      const bar = document.createElement('i');
      bar.style.animationDelay = (-(Math.random() * 1.4)).toFixed(2) + 's';
      bar.style.animationDuration = (.9 + Math.random() * .9).toFixed(2) + 's';
      eq.appendChild(bar);
    }
  }

  /* ---------- 数字滚动 ---------- */
  let countersPlayed = false;
  function startCounters() {
    if (countersPlayed) return;
    countersPlayed = true;
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = +el.dataset.count, dur = 1700, t0 = performance.now();
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Hero 视差（鼠标） ---------- */
  function initHeroParallax() {
    const heroImg = document.getElementById('heroImg');
    const wm = document.getElementById('watermark');
    if (!heroImg || reduceMotion) return;
    let mx = 0, my = 0;
    addEventListener('mousemove', e => {
      mx = e.clientX / innerWidth - .5;
      my = e.clientY / innerHeight - .5;
    }, { passive: true });
    (function loop() {
      heroImg.style.transform = `scale(1.12) translate(${mx * -22}px,${my * -14}px)`;
      if (wm) wm.style.transform = `translate(${mx * 30}px,${my * 20}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- 卡片 3D 倾斜 + 光斑 / 磁吸按钮 ---------- */
  function initSurfaceFx() {
    if (reduceMotion) return;

    document.querySelectorAll('.skin-card').forEach(card => {
      let raf = null;
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
        if (raf) return;
        raf = requestAnimationFrame(() => {
          card.style.transform =
            `perspective(900px) rotateX(${(py - .5) * -8}deg) rotateY(${(px - .5) * 10}deg) translateY(-6px)`;
          raf = null;
        });
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateY(0)';
      });
    });

    document.querySelectorAll('.bento-cell').forEach(c => {
      c.addEventListener('mousemove', e => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.transform =
          `translate(${(e.clientX - r.left - r.width / 2) * .2}px,${(e.clientY - r.top - r.height / 2) * .28}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- CTA 雷达扫描 ---------- */
  let radarStarted = false;
  function startRadar() {
    if (radarStarted) return;
    radarStarted = true;
    const cv = document.getElementById('radar');
    if (!cv || reduceMotion) return;
    const ctx = cv.getContext('2d');
    const W = 560, cx = W / 2, cy = W / 2;
    const blips = Array.from({ length: 9 }, () => ({
      a: Math.random() * Math.PI * 2, d: 60 + Math.random() * 200, found: 0
    }));
    let ang = 0;
    (function draw() {
      ctx.clearRect(0, 0, W, W);
      ctx.strokeStyle = 'rgba(222,155,53,.22)';
      ctx.lineWidth = 1;
      [90, 170, 250].forEach(r => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(cx - 260, cy); ctx.lineTo(cx + 260, cy);
      ctx.moveTo(cx, cy - 260); ctx.lineTo(cx, cy + 260); ctx.stroke();

      ang += .012;
      if (ctx.createConicGradient) {
        const grad = ctx.createConicGradient(ang - Math.PI / 2, cx, cy);
        grad.addColorStop(0, 'rgba(222,155,53,.35)');
        grad.addColorStop(.12, 'rgba(222,155,53,0)');
        grad.addColorStop(1, 'rgba(222,155,53,0)');
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 260, ang - .7, ang); ctx.closePath();
        ctx.fillStyle = grad; ctx.fill();
      }
      blips.forEach(b => {
        let diff = ang - b.a;
        while (diff < 0) diff += Math.PI * 2;
        while (diff > Math.PI * 2) diff -= Math.PI * 2;
        if (diff < .08) b.found = 1;
        if (b.found > 0) {
          b.found -= .006;
          const x = cx + Math.cos(b.a) * b.d, y = cy + Math.sin(b.a) * b.d;
          ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,193,94,${Math.max(0, b.found)})`;
          ctx.shadowColor = 'rgba(255,193,94,.9)'; ctx.shadowBlur = 10;
          ctx.fill(); ctx.shadowBlur = 0;
        }
      });
      requestAnimationFrame(draw);
    })();
  }

  /* ---------- 场景切换回调 ---------- */
  function onScene(id) {
    if (id === 'scene-manifesto') {
      // 等标题入场后再走数字
      setTimeout(startCounters, 350);
    }
    if (id === 'scene-cta') startRadar();
  }

  window.FX = { initParticles, initLiveData, initEq, initHeroParallax, initSurfaceFx, onScene };
})();

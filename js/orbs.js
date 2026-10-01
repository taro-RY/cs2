/* ============================================================
   ORBS — 全局漂浮彩蛋球（fixed 覆盖层，所有场景可见）
   - 在视口内自由飘动、边缘反弹、缓慢正弦漂移
   - 点击炸开粒子 + 随机 CS 黑话 toast，计入 Store.eggs
   - 排除场景：涂鸦墙（sprayCanvas 内不渲染）；准星鼠标保持不变
   ============================================================ */
(function () {
  const layer = document.getElementById('orbLayer');
  if (!layer) return;
  const cv = document.createElement('canvas');
  cv.id = 'orbCanvas';
  layer.appendChild(cv);
  const ctx = cv.getContext('2d');

  const GOLD = '#de9b35';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;

  const LINES = [
    'RUSH B！别问，问就是 P90',
    '这颗闪光，白给的是队友',
    '经济局：ECO 的事，能叫穷吗',
    '1v5 残局，梦里什么都有',
    '静步！我听到你心跳了',
    'A 大已经被我一个人包了（假的）',
    '投掷物 +1，枪法 -100',
    '保枪！这把经济最重要',
    '预瞄的尽头是玄学',
    '狗洞一钻，谁也不爱',
    '你点的不是球，是我的神经',
    '烟雾散去的那一刻，建议切刀跑',
    '听见脚步了吗？那是你自己的',
    '经济重置，从一把沙鹰开始'
  ];

  let W = 0, H = 0, DPR = 1;
  let balls = [], particles = [];
  const BALL_N = 7;

  function resize() {
    W = innerWidth; H = innerHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function makeBall(i, respawn) {
    const r = 11 + Math.random() * 7;
    return {
      x: 40 + Math.random() * (W - 80),
      y: 60 + Math.random() * (H - 120),
      vx: (Math.random() - .5) * 26,
      vy: (Math.random() - .5) * 20,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: .6 + Math.random() * .9,
      r,
      hitR: r * 2.6,
      alive: true,
      respawnAt: 0
    };
  }
  function seed() {
    balls = [];
    for (let i = 0; i < BALL_N; i++) balls.push(makeBall(i, false));
  }

  function burst(b) {
    const colors = [GOLD, '#ffc15e', '#eb4b4b', '#ffe9a8', '#ffffff'];
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 90 + Math.random() * 260;
      particles.push({
        x: b.x, y: b.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        age: 0, life: .5 + Math.random() * .55,
        color: colors[i % colors.length],
        size: 2 + Math.random() * 3.2
      });
    }
    b.alive = false;
    b.respawnAt = performance.now() + 14000;
    if (window.toast) window.toast('EASTER EGG // ' + LINES[Math.floor(Math.random() * LINES.length)], 'ok');
    if (window.Store) Store.bumpEggs();
  }

  // 涂鸦墙场景隐藏
  let hidden = false;
  // 用户偏好：漂浮球总开关（设置面板 → FLOATING ORBS）
  let enabled = window.Store ? !!Store.getSetting('orbs', true) : true;
  function setHidden(v) {
    hidden = !!v;
    layer.classList.toggle('hide', hidden);
  }
  // 优先用事件 detail（场景状态在派发后的下一帧才写入 DOM）
  document.addEventListener('scenechange', e => {
    if (e.detail && e.detail.id) setHidden(e.detail.id === 'scene-spray');
    else {
      const spray = document.getElementById('scene-spray');
      setHidden(spray && spray.dataset.state === 'active');
    }
  });
  // 订阅全局样式开关
  document.addEventListener('ctos:setting', e => {
    if (!e.detail || e.detail.key !== 'orbs') return;
    enabled = !!e.detail.value;
    if (!enabled) {
      ctx.clearRect(0, 0, W, H);
      hoverBall = null;
      document.body.classList.remove('orb-hot');
    }
  });

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (hidden || !enabled) { last = now; return; }
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;

    // 物理
    balls.forEach((b, i) => {
      if (!b.alive) {
        if (now > b.respawnAt) balls[i] = makeBall(i, true);
        return;
      }
      b.phase += dt * b.phaseSpeed;
      b.x += b.vx * dt;
      b.y += b.vy * dt + Math.sin(b.phase) * 9 * dt;
      if (b.x < 30) { b.x = 30; b.vx = Math.abs(b.vx); }
      if (b.x > W - 30) { b.x = W - 30; b.vx = -Math.abs(b.vx); }
      if (b.y < 50) { b.y = 50; b.vy = Math.abs(b.vy); }
      if (b.y > H - 40) { b.y = H - 40; b.vy = -Math.abs(b.vy); }
    });
    particles.forEach(p => {
      p.age += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= (1 - 2.0 * dt); p.vy *= (1 - 2.0 * dt);
    });
    particles = particles.filter(p => p.age < p.life);

    // 渲染
    ctx.clearRect(0, 0, W, H);
    const t = now / 1000;
    balls.forEach(b => {
      if (!b.alive) return;
      const pulse = 1 + Math.sin(t * 2.2 + b.phase) * .2;
      const rr = b.r * pulse;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr * 3.2);
      g.addColorStop(0, 'rgba(222,155,53,.5)');
      g.addColorStop(.4, 'rgba(222,155,53,.15)');
      g.addColorStop(1, 'rgba(222,155,53,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, rr * 3.2, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ffd98a';
      ctx.shadowColor = GOLD; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.beginPath(); ctx.arc(b.x - rr * .3, b.y - rr * .3, rr * .3, 0, Math.PI * 2); ctx.fill();
    });
    particles.forEach(p => {
      const k = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + k), 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // 命中判定（clientX/Y 即视口坐标，与球坐标同系）
  function ballAt(clientX, clientY) {
    if (hidden || !enabled) return null;
    for (const b of balls) {
      if (b.alive && Math.hypot(b.x - clientX, b.y - clientY) <= b.hitR) return b;
    }
    return null;
  }
  function overUI(e) {
    const b = document.body.classList;
    if (b.contains('booting') || b.contains('pal-open') || b.contains('insp-open') ||
        b.contains('rec-open') || b.contains('glitching') || b.contains('settings-open')) return true;
    return !!(e.target.closest && e.target.closest(
      '.palette,.inspect,.recover,.glitchfx,.settings,.boot,.mapops-panel,.nav-console,.nav-status,.toasts,input,textarea,button,a'
    ));
  }
  // 画布始终 pointer-events:none，点击在窗口捕获阶段用视口坐标主动判定；
  // 命中球时吞掉该次点击（stopPropagation），否则事件原样落给下层元素。
  let downX = 0, downY = 0, downBall = null;
  addEventListener('pointerdown', e => {
    downX = e.clientX; downY = e.clientY;
    downBall = (!overUI(e)) ? ballAt(e.clientX, e.clientY) : null;
    if (downBall) e.stopPropagation();
  }, true);
  addEventListener('pointerup', e => {
    if (downBall && !overUI(e) && Math.hypot(e.clientX - downX, e.clientY - downY) < 9) {
      e.stopPropagation();
      burst(downBall);
    }
    downBall = null;
  }, true);
  // hover 时通知准星变 hot（可选反馈）
  let hoverBall = null;
  addEventListener('pointermove', e => {
    hoverBall = (!overUI(e)) ? ballAt(e.clientX, e.clientY) : null;
    document.body.classList.toggle('orb-hot', !!hoverBall);
  }, { passive: true });

  addEventListener('resize', resize);
  resize();
  seed();
  const startSpray = document.getElementById('scene-spray');
  setHidden(startSpray && startSpray.dataset.state === 'active');
  requestAnimationFrame(frame);
})();

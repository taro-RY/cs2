/* ============================================================
   INSPECT — 武器战术检视（数据成为世界的一部分）
   - 纯 Canvas 程序化绘制武器侧视图（无外部素材）
   - 按住拖拽 → rotateY 检视；点击金色节点 → 部位情报
   - 长按武器卡片进入；window.Inspect.open(id) 供指挥台调用
   ============================================================ */
(function () {
  /* ---------------- 武器数据库（卡片 / 检视 / 命令台共用） ---------------- */
  const WEAPONS = {
    ak47: {
      id: 'ak47', code: 'WPN-01 // RIFLE · T', name: 'AK-47 | 火舌',
      caliber: '7.62×39mm', rpm: '600 RPM', price: 2500,
      metric: { label: 'POWER / 火力压制', v: 92 },
      stats: [['火力', 92], ['控制', 72], ['射速', 60], ['机动', 78]],
      type: 'rifle', variant: 'ak',
      parts: [
        { x: .845, y: .39, t: '斜切制退器', d: '抑制连发上跳，第一发命中率提升 12%。近战中枪口火焰可短暂致盲。' },
        { x: .575, y: .40, t: '机匣 / 枪机', d: '7.62×39mm 大威力弹，无头盔一枪毙命。沙尘环境可靠性记录 99.4%。' },
        { x: .415, y: .68, t: '弧形弹匣', d: '30 发钢制弹匣，满载换弹 2.43s。交火间隙再操作，别在空地换弹。' },
        { x: .405, y: .29, t: '照门 / 导轨', d: '机械照门带 100–1000m 刻度，侧导轨可加装红点与倍率瞄具。' },
        { x: .300, y: .63, t: '握把 / 扳机', d: '全自动 600 RPM 但散布剧烈——点射，永远点射。' }
      ]
    },
    m4a1s: {
      id: 'm4a1s', code: 'WPN-02 // CARBINE · CT', name: 'M4A1-S | 静默',
      caliber: '5.56×45mm', rpm: '600 RPM', price: 2900,
      metric: { label: 'CONTROL / 弹道控制', v: 88 },
      stats: [['火力', 70], ['控制', 88], ['静音', 96], ['机动', 82]],
      type: 'carbine', variant: 's',
      parts: [
        { x: .835, y: .39, t: '一体式消音器', d: '枪声压制至 64dB，地图外完全无法定位。代价是弹匣容量降至 25 发。' },
        { x: .530, y: .30, t: '平顶皮卡汀尼导轨', d: '全长 MIL-STD-1913 导轨，红点 / 倍率切换无需工具。' },
        { x: .400, y: .65, t: 'STANAG 弹匣', d: '25 发 5.56 供弹，消音机构刻意压低射速以换取极致稳定。' },
        { x: .620, y: .44, t: '浮置护木', d: '浮置式枪管不与护木接触，外力干扰趋近于零，远距离精度受益。' },
        { x: .300, y: .62, t: '战术握把', d: '连续 8 发落点仍保持在胸环内，适合中距离静默点名。' }
      ]
    },
    m4a4: {
      id: 'm4a4', code: 'WPN-03 // CARBINE · CT', name: 'M4A4 | 巷战',
      caliber: '5.56×45mm', rpm: '666 RPM', price: 3100,
      metric: { label: 'FIRE RATE / 射速', v: 90 },
      stats: [['火力', 74], ['控制', 80], ['射速', 90], ['机动', 80]],
      type: 'carbine', variant: 'a4',
      parts: [
        { x: .815, y: .39, t: '三叉消焰器', d: '三连射火光降低 70%，黑暗环境交火不会致盲自己。' },
        { x: .530, y: .30, t: '平顶皮卡汀尼导轨', d: '全长导轨支持热成像、全息与倍率瞄具快速换装。' },
        { x: .400, y: .65, t: 'STANAG 弹匣', d: '30 发满载，666 RPM 理论射速，弹幕压制的底气。' },
        { x: .620, y: .44, t: '四面导轨护木', d: '可同时挂载战术灯、激光指示器与前握把，为巷战而生。' },
        { x: .300, y: .62, t: '战术握把', d: '高射速下的唯一救赎：压枪线、短点射、听声换位。' }
      ]
    },
    molotov: {
      id: 'molotov', code: 'WPN-04 // UTILITY', name: '燃烧瓶 | 炼狱',
      caliber: 'INCENDIARY', rpm: '—', price: 400,
      metric: { label: 'AREA DENIAL / 压制', v: 95 },
      stats: [['封锁', 95], ['持续', 70], ['机动', 88], ['性价比', 98]],
      type: 'molotov', variant: 't',
      parts: [
        { x: .450, y: .12, t: '浸油引信布条', d: '点燃后约 1.8s 触地爆燃。拉环之前，先确认自己的退路。' },
        { x: .500, y: .46, t: '玻璃瓶身', d: '碎裂半径 3.2m，触地瞬间形成不可穿越的火墙。' },
        { x: .500, y: .72, t: '燃烧液', d: '持续燃烧 7 秒，峰值温度 1200°C，把敌人从掩体里“请”出来。' }
      ]
    }
  };

  const W = 820, H = 380;
  const overlay = document.getElementById('inspect');
  const rot = document.getElementById('inspRot');
  const cv = document.getElementById('inspCanvas');
  const ctx = cv.getContext('2d');
  const hots = document.getElementById('inspHots');
  const info = document.getElementById('inspInfo');
  const tabs = document.getElementById('inspTabs');
  const statsEl = document.getElementById('inspStats');

  let cur = null;
  let angle = 0;
  let raf = 0;

  /* ---------------- Canvas 初始化 ---------------- */
  (function sizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  })();

  function metal(lightY, darkY) {
    const g = ctx.createLinearGradient(0, lightY || 110, 0, darkY || 300);
    g.addColorStop(0, '#3a3f48');
    g.addColorStop(.45, '#22262d');
    g.addColorStop(1, '#121419');
    return g;
  }
  function poly(pts, fill, stroke, lw) {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke !== false) {
      ctx.strokeStyle = stroke || 'rgba(222,155,53,.7)';
      ctx.lineWidth = lw || 1.4;
      ctx.stroke();
    }
  }
  function rrect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = stroke || 'rgba(222,155,53,.7)';
    ctx.lineWidth = 1.4; ctx.stroke();
  }
  function edge(x1, y1, x2, y2, a) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(222,155,53,' + (a == null ? .55 : a) + ')';
    ctx.lineWidth = 1.2; ctx.stroke();
  }
  function blueprint(w) {
    // 背景标尺与注记
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    for (let x = 60; x < W - 40; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 330); ctx.lineTo(x, 338); ctx.stroke();
    }
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(154,161,173,.55)';
    ctx.fillText('CAL ' + w.caliber + '   ·   RATE ' + w.rpm + '   ·   SN 26-' + (w.id || 'XXXX').toUpperCase(), 60, 356);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(222,155,53,.5)';
    ctx.fillText('SCHEMATIC // NOT TO SCALE', W - 60, 356);
    ctx.textAlign = 'left';
  }

  /* ---------------- 步枪 AK ---------------- */
  function drawRifle(w) {
    // 固定枪托
    poly([[108, 138], [238, 138], [252, 162], [160, 196], [120, 196]], metal(130, 210));
    edge(128, 150, 228, 150, .3);
    // 握把
    poly([[240, 188], [272, 188], [260, 262], [226, 262]], metal(180, 270));
    // 机匣
    poly([[250, 128], [476, 124], [502, 148], [492, 184], [252, 190]], metal(110, 200));
    edge(268, 168, 470, 164, .35);                 // 枪机线
    ctx.fillStyle = 'rgba(222,155,53,.85)';
    ctx.fillRect(452, 140, 26, 5);                // 拉机柄
    // 快慢机
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.arc(430, 158, 9, .4, 4.2); ctx.stroke();
    // 照门
    poly([[318, 128], [344, 128], [338, 108], [324, 108]], metal(100, 130), 'rgba(222,155,53,.8)');
    edge(331, 112, 331, 128, .3);
    // 弹匣（弧形）
    ctx.beginPath();
    ctx.moveTo(302, 188); ctx.lineTo(348, 188);
    ctx.quadraticCurveTo(376, 230, 372, 292);
    ctx.lineTo(330, 300);
    ctx.quadraticCurveTo(312, 250, 302, 188);
    ctx.closePath();
    ctx.fillStyle = metal(180, 310); ctx.fill();
    ctx.strokeStyle = 'rgba(222,155,53,.7)'; ctx.lineWidth = 1.4; ctx.stroke();
    edge(314, 210, 352, 214, .25); edge(320, 232, 358, 238, .25); edge(326, 256, 362, 262, .25);
    // 扳机护圈
    ctx.beginPath(); ctx.arc(276, 198, 18, .15, Math.PI - .15);
    ctx.strokeStyle = 'rgba(222,155,53,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
    // 护木 + 导气管
    poly([[424, 146], [566, 142], [572, 178], [430, 184]], metal(130, 190));
    edge(440, 158, 556, 155, .3); edge(440, 172, 558, 169, .3);
    ctx.fillRect(470, 130, 92, 8);                // 导气管
    ctx.strokeStyle = 'rgba(222,155,53,.5)'; ctx.strokeRect(470, 130, 92, 8);
    // 准星座
    poly([[512, 142], [528, 142], [526, 108], [514, 108]], metal(100, 145), 'rgba(222,155,53,.8)');
    // 枪管
    ctx.fillStyle = metal(120, 160);
    ctx.fillRect(498, 136, 158, 11);
    ctx.strokeStyle = 'rgba(222,155,53,.6)'; ctx.strokeRect(498, 136, 158, 11);
    // 斜切制退器
    poly([[656, 128], [712, 128], [706, 160], [650, 160]], metal(120, 165), 'rgba(222,155,53,.85)');
    edge(664, 136, 704, 152, .4); edge(664, 152, 704, 136, .4);
  }

  /* ---------------- 卡宾 M4 系列 ---------------- */
  function drawCarbine(w) {
    const silenced = w.variant === 's';
    // 伸缩枪托 + 缓冲管
    poly([[96, 146], [214, 146], [214, 182], [96, 182]], metal(140, 190));
    ctx.fillStyle = '#15171c'; ctx.fillRect(214, 154, 40, 20);
    ctx.strokeStyle = 'rgba(222,155,53,.4)'; ctx.strokeRect(214, 154, 40, 20);
    edge(108, 164, 202, 164, .3);
    // 握把
    poly([[238, 188], [270, 188], [258, 262], [224, 262]], metal(180, 270));
    // 机匣
    poly([[232, 130], [446, 126], [470, 148], [462, 184], [234, 190]], metal(110, 200));
    edge(250, 168, 436, 164, .35);
    ctx.fillStyle = 'rgba(222,155,53,.85)';
    ctx.fillRect(392, 150, 24, 5);                // 拉机柄
    // 抛壳口
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.strokeRect(350, 138, 40, 18);
    // 平顶导轨（齿状）
    ctx.fillStyle = '#2a2e36';
    ctx.fillRect(240, 118, 250, 10);
    ctx.strokeStyle = 'rgba(222,155,53,.55)'; ctx.strokeRect(240, 118, 250, 10);
    for (let x = 248; x < 482; x += 16) edge(x, 118, x, 128, .35);
    // 后备机瞄
    poly([[300, 118], [316, 118], [312, 100], [304, 100]], metal(95, 120), 'rgba(222,155,53,.7)');
    // STANAG 弹匣
    poly([[300, 188], [338, 188], [350, 276], [318, 280]], metal(180, 290));
    edge(308, 214, 340, 214, .25); edge(312, 238, 344, 238, .25); edge(316, 262, 347, 262, .25);
    // 扳机护圈
    ctx.beginPath(); ctx.arc(274, 198, 18, .15, Math.PI - .15);
    ctx.strokeStyle = 'rgba(222,155,53,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
    // 圆筒护木
    rrect(424, 134, 150, 50, 10, metal(120, 190));
    for (let x = 440; x < 566; x += 22) edge(x, 140, x, 178, .22);
    // 准星 / 枪管
    poly([[548, 134], [562, 134], [560, 112], [550, 112]], metal(105, 135), 'rgba(222,155,53,.75)');
    ctx.fillStyle = metal(120, 160);
    ctx.fillRect(560, 140, silenced ? 44 : 84, 9);
    ctx.strokeStyle = 'rgba(222,155,53,.6)'; ctx.strokeRect(560, 140, silenced ? 44 : 84, 9);
    if (silenced) {
      // 消音器
      rrect(600, 124, 118, 42, 8, metal(115, 170), 'rgba(222,155,53,.85)');
      edge(618, 124, 618, 166, .4); edge(700, 124, 700, 166, .4);
    } else {
      // 三叉消焰器
      poly([[640, 132], [694, 132], [694, 158], [640, 158]], metal(120, 165), 'rgba(222,155,53,.85)');
      ctx.fillStyle = '#0b0c0f';
      ctx.fillRect(680, 134, 16, 6); ctx.fillRect(680, 144, 16, 6); ctx.fillRect(680, 154, 16, 3);
    }
  }

  /* ---------------- 燃烧瓶 ---------------- */
  function drawMolotov() {
    // 火焰光晕
    const glow = ctx.createRadialGradient(410, 250, 20, 410, 250, 200);
    glow.addColorStop(0, 'rgba(240,122,31,.22)');
    glow.addColorStop(1, 'rgba(240,122,31,0)');
    ctx.fillStyle = glow; ctx.fillRect(180, 40, 460, 300);
    // 布条引信
    ctx.beginPath();
    ctx.moveTo(392, 70);
    ctx.lineTo(356, 26); ctx.lineTo(372, 44); ctx.lineTo(348, 12);
    ctx.lineTo(378, 38); ctx.lineTo(372, 18); ctx.lineTo(400, 62);
    ctx.closePath();
    ctx.fillStyle = '#6b4a24'; ctx.fill();
    ctx.strokeStyle = 'rgba(222,155,53,.8)'; ctx.lineWidth = 1.4; ctx.stroke();
    // 瓶口封布
    poly([[384, 60], [420, 60], [424, 100], [380, 100]], '#4a3418', 'rgba(222,155,53,.6)');
    // 瓶身
    ctx.beginPath();
    ctx.moveTo(388, 100); ctx.lineTo(388, 136);
    ctx.bezierCurveTo(320, 158, 300, 210, 312, 286);
    ctx.quadraticCurveTo(320, 308, 350, 308);
    ctx.lineTo(472, 308);
    ctx.quadraticCurveTo(502, 308, 508, 286);
    ctx.bezierCurveTo(520, 210, 500, 158, 432, 136);
    ctx.lineTo(432, 100);
    ctx.closePath();
    const glass = ctx.createLinearGradient(300, 120, 520, 320);
    glass.addColorStop(0, 'rgba(46,58,44,.85)');
    glass.addColorStop(.5, 'rgba(28,36,30,.92)');
    glass.addColorStop(1, 'rgba(16,20,18,.95)');
    ctx.fillStyle = glass; ctx.fill();
    ctx.strokeStyle = 'rgba(222,155,53,.75)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 燃烧液（波浪）
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(320, 244);
    ctx.bezierCurveTo(360, 228, 392, 258, 424, 244);
    ctx.bezierCurveTo(460, 228, 490, 252, 500, 244);
    ctx.lineTo(500, 290);
    ctx.quadraticCurveTo(498, 300, 472, 302);
    ctx.lineTo(350, 302);
    ctx.quadraticCurveTo(322, 300, 320, 290);
    ctx.closePath();
    ctx.clip();
    const liq = ctx.createLinearGradient(0, 240, 0, 310);
    liq.addColorStop(0, '#ffc15e');
    liq.addColorStop(.5, '#f07a1f');
    liq.addColorStop(1, '#8a3a10');
    ctx.fillStyle = liq; ctx.fillRect(310, 230, 200, 90);
    ctx.globalAlpha = .25;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#ffc15e' : '#f07a1f';
      ctx.beginPath(); ctx.arc(350 + i * 32, 272 + (i % 2) * 10, 7, 0, 7); ctx.fill();
    }
    ctx.restore();
    // 玻璃高光
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(346, 170); ctx.quadraticCurveTo(330, 230, 344, 286); ctx.stroke();
  }

  function draw(w) {
    ctx.clearRect(0, 0, W, H);
    blueprint(w);
    if (w.type === 'rifle') drawRifle(w);
    else if (w.type === 'carbine') drawCarbine(w);
    else drawMolotov();
  }

  /* ---------------- 热点 / 侧栏 ---------------- */
  function selectPart(i) {
    const p = cur.parts[i];
    hots.querySelectorAll('.hot').forEach((h, j) => h.classList.toggle('on', j === i));
    tabs.querySelectorAll('.insp-tab').forEach((t, j) => t.classList.toggle('on', j === i));
    info.innerHTML = '<b>PART ' + String(i + 1).padStart(2, '0') + ' // ' + p.t + '</b><span>' + p.d + '</span>';
  }
  function resetInfo() {
    hots.querySelectorAll('.hot').forEach(h => h.classList.remove('on'));
    tabs.querySelectorAll('.insp-tab').forEach(t => t.classList.remove('on'));
    info.innerHTML = '<b>STANDBY · 待命</b><span>点击武器上的金色节点，读取该部位的战术情报。</span>';
  }

  function populate(w) {
    document.getElementById('inspCode').textContent = w.code;
    document.getElementById('inspName').textContent = w.name;
    document.getElementById('inspPrice').textContent = '$ ' + w.price.toLocaleString('en-US');
    draw(w);

    hots.innerHTML = '';
    w.parts.forEach((p, i) => {
      const b = document.createElement('button');
      b.className = 'hot';
      b.type = 'button';
      b.style.left = (p.x * 100) + '%';
      b.style.top = (p.y * 100) + '%';
      b.innerHTML = '<i></i><em>' + String(i + 1).padStart(2, '0') + ' ' + p.t + '</em>';
      b.addEventListener('click', (e) => { e.stopPropagation(); selectPart(i); });
      hots.appendChild(b);
    });

    tabs.innerHTML = '';
    w.parts.forEach((p, i) => {
      const t = document.createElement('button');
      t.className = 'insp-tab';
      t.type = 'button';
      t.textContent = String(i + 1).padStart(2, '0') + ' · ' + p.t;
      t.addEventListener('click', () => selectPart(i));
      tabs.appendChild(t);
    });

    statsEl.innerHTML = '';
    w.stats.forEach(([n, v]) => {
      const row = document.createElement('div');
      row.className = 'insp-stat';
      row.innerHTML = '<span>' + n + '</span><div class="is-track"><i style="width:0%"></i></div><b>' + v + '</b>';
      statsEl.appendChild(row);
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        statsEl.querySelectorAll('.is-track i').forEach((bar, i) => {
          bar.style.width = w.stats[i][1] + '%';
        });
      });
    });
    resetInfo();
  }

  /* ---------------- 拖拽旋转 ---------------- */
  let dragging = false, moved = 0, sx = 0, baseAngle = 0;
  function setAngle(a) {
    angle = Math.max(-62, Math.min(62, a));
    rot.style.transform = 'perspective(1050px) rotateY(' + angle + 'deg)';
    const sheen = document.getElementById('inspSheen');
    sheen.style.transform = 'translateX(' + (angle * 1.6) + '%) skewX(-18deg)';
    hots.style.opacity = Math.abs(angle) > 48 ? 0 : 1;
  }
  rot.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; sx = e.clientX; baseAngle = angle;
    rot.setPointerCapture(e.pointerId);
    rot.classList.add('drag');
  });
  rot.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx;
    moved = Math.max(moved, Math.abs(dx));
    if (moved > 4) setAngle(baseAngle + dx * .35);
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    rot.classList.remove('drag');
    // 松手缓慢回正
    if (moved > 4) {
      cancelAnimationFrame(raf);
      const tick = () => {
        angle += (0 - angle) * .12;
        rot.style.transform = 'perspective(1050px) rotateY(' + angle + 'deg)';
        document.getElementById('inspSheen').style.transform = 'translateX(' + (angle * 1.6) + '%) skewX(-18deg)';
        hots.style.opacity = Math.abs(angle) > 48 ? 0 : 1;
        if (Math.abs(angle) > .4) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
  }
  rot.addEventListener('pointerup', endDrag);
  rot.addEventListener('pointercancel', endDrag);

  /* ---------------- 开关 ---------------- */
  function open(id) {
    const w = WEAPONS[id];
    if (!w) return;
    cur = w;
    setAngle(0);
    populate(w);
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('insp-open');
    if (window.Store) window.Store.touchInspect(id);
  }
  function close() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('insp-open');
  }

  document.getElementById('inspClose').addEventListener('click', close);
  overlay.querySelector('[data-insp-close]').addEventListener('click', close);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open') &&
        !document.body.classList.contains('pal-open')) close();
  });

  /* ---------------- 长按武器卡片 ---------------- */
  let lpTimer = 0, lpMoved = 0, lpX = 0, lpY = 0, lpCard = null;
  document.querySelectorAll('.skin-card').forEach((card) => {
    card.classList.add('longpressable');
    // 移动端长按不弹系统菜单
    card.addEventListener('contextmenu', (e) => e.preventDefault());
    card.addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      lpCard = card; lpMoved = 0; lpX = e.clientX; lpY = e.clientY;
      card.classList.add('lp-armed');
      lpTimer = setTimeout(() => {
        clearTimeout(lpTimer);
        lpCard = null;
        card.classList.remove('lp-armed');
        card.classList.add('lp-fire');
        if (window.toast) window.toast('战术检视 // ' + card.dataset.weapon.toUpperCase());
        open(card.dataset.weapon);        // pointerup 时清理
        setTimeout(() => card.classList.remove('lp-fire'), 500);
      }, 560);
    });
    const cancel = () => {
      clearTimeout(lpTimer);
      if (lpCard) lpCard.classList.remove('lp-armed');
      lpCard = null;
    };
    card.addEventListener('pointermove', (e) => {
      if (!lpCard) return;
      if (Math.hypot(e.clientX - lpX, e.clientY - lpY) > 10) cancel();
    });
    card.addEventListener('pointerup', cancel);
    card.addEventListener('pointerleave', cancel);
    card.addEventListener('pointercancel', cancel);
    // 长按触发后吞掉合成 click
    card.addEventListener('click', (e) => {
      if (card.classList.contains('lp-fire')) {
        e.preventDefault(); e.stopPropagation();
        card.classList.remove('lp-fire');
      } else if (card.dataset.weapon) {
        // 普通点击同样允许进入检视（移动端点按更友好）
        e.preventDefault();
        open(card.dataset.weapon);
      }
    }, true);
  });

  window.WEAPONS = WEAPONS;
  window.Inspect = { open, close };
})();

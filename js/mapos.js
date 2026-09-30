/* ============================================================
   MAPOS — DE_INFERNO 战术节点图
   这不是图片：纯 Canvas 绘制的可探索空间。
   滚轮缩放 · 拖拽平移 · 节点情报 · ENTER 部署
   后门解锁后，地图里多出一个无法解析的 05 号单位。
   ============================================================ */
(function () {
  const WORLD_W = 1000, WORLD_H = 640;
  const GOLD = '#de9b35', GOLD_DIM = 'rgba(222,155,53,.55)';
  const RED = '#eb4b4b';

  const stage = document.getElementById('mapStage');
  const cv = document.getElementById('mapCanvas');
  if (!stage || !cv) return;
  const ctx = cv.getContext('2d');

  const elCode = document.getElementById('mpCode');
  const elName = document.getElementById('mpName');
  const elDesc = document.getElementById('mpDesc');
  const elList = document.getElementById('mpList');
  const elDeploy = document.getElementById('mpDeploy');
  const elZoom = document.getElementById('mapZoom');

  /* ---------------- 地图数据（世界坐标） ---------------- */
  // 建筑轮廓（Inferno 风格街区）
  const blocks = [
    { x: 60, y: 60, w: 250, h: 130, name: 'APARTMENTS' },
    { x: 390, y: 50, w: 220, h: 90, name: 'LIBRARY' },
    { x: 690, y: 70, w: 250, h: 150, name: 'CT ARCHIVE' },
    { x: 70, y: 300, w: 200, h: 110, name: 'PIT' },
    { x: 360, y: 300, w: 280, h: 90, name: 'MID BLOCK' },
    { x: 720, y: 300, w: 220, h: 120, name: 'NEW BOX' },
    { x: 120, y: 480, w: 260, h: 100, name: 'BANANA' },
    { x: 620, y: 480, w: 260, h: 100, name: 'TENEMENTS' }
  ];

  // 战术连线
  const links = [
    ['t', 'mid'], ['mid', 'ct'], ['mid', 'a'], ['mid', 'b'], ['a', 'ct'], ['b', 't']
  ];

  const NODES = {
    ct: {
      x: 500, y: 105, code: 'NODE 01 // CT SPAWN', name: 'CT 出生点',
      desc: '反恐精英开局集结区。前压窗口约 6 秒：抢中路还是回防包点，第一波信息从这里开始定价。',
      intel: [['交火距离', '中远距'], ['掩体密度', '中'], ['战术权重', '高']]
    },
    a: {
      x: 190, y: 255, code: 'NODE 02 // BOMBSITE A', name: 'A 包点',
      desc: '阳台、短道与坑位构成交叉火力。攻方需要烟火配合切断两条回防视线，守方一颗雷可以拖慢整个节奏。',
      intel: [['交火距离', '近 - 中'], ['掩体密度', '高'], ['风险等级', '高']]
    },
    mid: {
      x: 500, y: 345, code: 'NODE 03 // MID', name: '中路',
      desc: '整张图的信息枢纽。控制中路的一方可以双向转点，丢失中路等于把两个包点切成孤岛。',
      intel: [['交火距离', '中距'], ['掩体密度', '低'], ['信息价值', '极高']]
    },
    b: {
      x: 810, y: 425, code: 'NODE 04 // BOMBSITE B', name: 'B 包点',
      desc: '入口被香蕉道收成一条窄缝，燃烧瓶与烟雾的顺序博弈决定谁先看到谁。近距离交火，反应即生死。',
      intel: [['交火距离', '极近'], ['掩体密度', '高'], ['风险等级', '极高']]
    },
    t: {
      x: 500, y: 575, code: 'NODE 05 // T SPAWN', name: 'T 出生点',
      desc: '进攻方开局区。默认战术在此分支：香蕉道慢摸、中路快提、或 A 区爆弹——20 秒内必须做出承诺。',
      intel: [['交火距离', '—'], ['掩体密度', '—'], ['决策压力', '高']]
    }
  };
  const LINK_KEY = { t: 't', mid: 'mid', ct: 'ct', a: 'a', b: 'b' };

  // 后门信号：无法解析的 05 号单位（藏在坑位与香蕉道之间的空档）
  const GHOST = { x: 268, y: 452 };

  /* ---------------- 视图状态 ---------------- */
  let W = 0, H = 0, DPR = 1;
  let scale = 1, ox = 0, oy = 0;
  let selected = null, hovered = null;
  let active = false;
  let rafOn = false;

  function fitView() {
    scale = Math.min(W / (WORLD_W + 80), H / (WORLD_H + 80));
    scale = Math.max(0.5, Math.min(scale, 1.15));
    clampView();
    elZoom.textContent = 'ZOOM ' + scale.toFixed(2) + '×';
  }
  function clampView() {
    const vw = WORLD_W * scale, vh = WORLD_H * scale;
    if (vw <= W) ox = (W - vw) / 2;
    else ox = Math.min(20, Math.max(W - vw - 20, ox));
    if (vh <= H) oy = (H - vh) / 2;
    else oy = Math.min(20, Math.max(H - vh - 20, oy));
  }
  const w2sX = wx => wx * scale + ox;
  const w2sY = wy => wy * scale + oy;
  const s2wX = sx => (sx - ox) / scale;
  const s2wY = sy => (sy - oy) / scale;

  function resize() {
    // 始终向 CSS 布局后的盒模型取值，画布用 100% 填充，避免内联 px 反撑容器
    W = stage.clientWidth; H = stage.clientHeight;
    if (W < 10 || H < 10) return;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cv.style.width = '100%';
    cv.style.height = '100%';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fitView();
  }

  /* ---------------- 绘制 ---------------- */
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function draw(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);

    // 底网格
    ctx.strokeStyle = 'rgba(222,155,53,.06)';
    ctx.lineWidth = 1;
    const g = 40 * scale;
    for (let x = ox % g; x < W; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = oy % g; y < H; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // 世界边界
    ctx.strokeStyle = 'rgba(222,155,53,.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(ox, oy, WORLD_W * scale, WORLD_H * scale);
    ctx.setLineDash([]);

    // 建筑
    ctx.font = `${Math.max(8, 10 * scale)}px "JetBrains Mono", monospace`;
    blocks.forEach(b => {
      const x = w2sX(b.x), y = w2sY(b.y), w = b.w * scale, h = b.h * scale;
      ctx.fillStyle = 'rgba(222,155,53,.05)';
      ctx.strokeStyle = 'rgba(222,155,53,.28)';
      roundRect(ctx, x, y, w, h, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(222,155,53,.45)';
      ctx.fillText(b.name, x + 8, y + 16);
    });

    // 连线（数据流样式）
    ctx.strokeStyle = GOLD_DIM;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 8]);
    ctx.lineDashOffset = -t * 22;
    links.forEach(([a, b]) => {
      const A = NODES[LINK_KEY[a]], B = NODES[LINK_KEY[b]];
      ctx.beginPath();
      ctx.moveTo(w2sX(A.x), w2sY(A.y));
      ctx.lineTo(w2sX(B.x), w2sY(B.y));
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // 节点
    Object.keys(NODES).forEach(key => {
      const n = NODES[key];
      const x = w2sX(n.x), y = w2sY(n.y);
      const isSel = selected === key, isHov = hovered === key;
      const pulse = 1 + Math.sin(t * 2.4 + n.x) * 0.18;
      const r = (isSel ? 11 : isHov ? 9 : 7);

      // 扫描环
      ctx.strokeStyle = isSel ? GOLD : 'rgba(222,155,53,.4)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r + 8 * pulse, 0, Math.PI * 2); ctx.stroke();
      // 核心
      ctx.fillStyle = isSel ? GOLD : 'rgba(222,155,53,.85)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b0c0f';
      ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, Math.PI * 2); ctx.fill();
      // 选中括弧
      if (isSel) {
        ctx.strokeStyle = GOLD; ctx.lineWidth = 1.6;
        const q = r + 15;
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.moveTo(x + sx * (q + 7), y + sy * q);
          ctx.lineTo(x + sx * q, y + sy * q);
          ctx.lineTo(x + sx * q, y + sy * (q + 7));
          ctx.stroke();
        });
      }
      // 标签
      const label = n.name;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(8,9,11,.82)';
      ctx.fillRect(x - tw / 2 - 6, y + r + 8, tw + 12, 17);
      ctx.strokeStyle = 'rgba(222,155,53,.35)';
      ctx.strokeRect(x - tw / 2 - 6, y + r + 8, tw + 12, 17);
      ctx.fillStyle = isSel ? GOLD : 'rgba(255,255,255,.78)';
      ctx.fillText(label, x - tw / 2, y + r + 20);
    });

    // 后门幽灵单位 05 / ???
    if (window.Store && Store.anomaly) {
      const gx = w2sX(GHOST.x), gy = w2sY(GHOST.y);
      const flick = Math.sin(t * 9) > -0.35;
      ctx.strokeStyle = 'rgba(235,75,75,.85)';
      ctx.fillStyle = 'rgba(235,75,75,.12)';
      ctx.lineWidth = 1.4;
      const rr = 9 + Math.sin(t * 5) * 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy - rr); ctx.lineTo(gx + rr, gy); ctx.lineTo(gx, gy + rr); ctx.lineTo(gx - rr, gy);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (flick) {
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillStyle = RED;
        ctx.fillText('PLAYER 05 / ???', gx + 12, gy - 8);
      }
    }
  }

  function loop(now) {
    if (!rafOn) return;
    if (active) draw(now);
    requestAnimationFrame(loop);
  }
  function startLoop() { if (rafOn) return; rafOn = true; requestAnimationFrame(loop); }

  /* ---------------- 交互 ---------------- */
  function nodeAt(clientX, clientY) {
    const r = cv.getBoundingClientRect();
    const wx = s2wX(clientX - r.left), wy = s2wY(clientY - r.top);
    let hit = null, bd = 26 / scale;
    Object.keys(NODES).forEach(key => {
      const n = NODES[key];
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d < bd) { bd = d; hit = key; }
    });
    // 幽灵单位
    if (!hit && window.Store && Store.anomaly) {
      if (Math.hypot(GHOST.x - wx, GHOST.y - wy) < 30 / scale) hit = 'ghost';
    }
    return hit;
  }

  function selectNode(key) {
    selected = key;
    if (key === 'ghost') {
      elCode.textContent = 'UNKNOWN // CHANNEL 05';
      elName.textContent = 'PLAYER 05 / ???';
      elDesc.innerHTML = '信号无法解析。<br>这个单位的移动轨迹与你完全一致——系统拒绝进一步说明。';
      elList.innerHTML = '<li>身份识别 <b style="color:#eb4b4b">FAILED</b></li><li>信号来源 <b style="color:#eb4b4b">UNKNOWN</b></li><li>威胁评估 <b>???</b></li>';
      elDeploy.disabled = true;
      if (window.toast) toast('⚠ 检测到无法解析的单位', 'warn');
      return;
    }
    const n = NODES[key];
    elCode.textContent = n.code;
    elName.textContent = n.name;
    elDesc.textContent = n.desc;
    elList.innerHTML = n.intel.map(([k, v]) => `<li>${k} <b>${v}</b></li>`).join('');
    elDeploy.disabled = false;
    if (window.Store) Store.touchMap('inferno');
  }

  let pdown = false, moved = 0, sx = 0, sy = 0, sox = 0, soy = 0;
  cv.addEventListener('pointerdown', e => {
    pdown = true; moved = 0;
    sx = e.clientX; sy = e.clientY; sox = ox; soy = oy;
    cv.setPointerCapture(e.pointerId);
    cv.style.cursor = 'grabbing';
  });
  cv.addEventListener('pointermove', e => {
    if (pdown) {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      moved = Math.max(moved, Math.hypot(dx, dy));
      ox = sox + dx; oy = soy + dy;
      clampView();
    } else {
      const h = nodeAt(e.clientX, e.clientY);
      hovered = h;
      cv.style.cursor = h ? 'pointer' : 'grab';
    }
  });
  cv.addEventListener('pointerup', e => {
    pdown = false;
    cv.style.cursor = hovered ? 'pointer' : 'grab';
    if (moved < 7) {
      const hit = nodeAt(e.clientX, e.clientY);
      if (hit) selectNode(hit);
    }
  });
  cv.addEventListener('pointercancel', () => { pdown = false; });

  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = s2wX(mx), wy = s2wY(my);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    scale = Math.max(0.6, Math.min(2.4, scale * factor));
    // 以光标为锚点缩放
    ox = mx - wx * scale;
    oy = my - wy * scale;
    clampView();
    elZoom.textContent = 'ZOOM ' + scale.toFixed(2) + '×';
  }, { passive: false });

  // 双击复位
  stage.addEventListener('dblclick', () => { selected = null; fitView(); });

  function deploy() {
    if (!selected || selected === 'ghost') {
      if (window.toast) toast('先选择一个战术节点', 'warn');
      return;
    }
    if (window.Store) Store.touchMap('inferno');
    if (window.toast) toast(`DEPLOYING // ${NODES[selected].name}`, 'ok');
    if (window.Pager) Pager.goTo(6);
  }
  elDeploy.addEventListener('click', deploy);

  document.addEventListener('keydown', e => {
    if (!active || document.body.classList.contains('pal-open') ||
        document.body.classList.contains('insp-open') ||
        document.body.classList.contains('glitching')) return;
    if (e.key === 'Enter') { e.preventDefault(); deploy(); }
    if (e.key === 'Escape' && selected) { selected = null; elDeploy.disabled = true; }
  });

  // 场景激活时才跑循环 / 允许 ENTER
  document.addEventListener('scenechange', e => {
    active = e.detail.id === 'scene-maps';
    if (active) { resize(); startLoop(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && active) { resize(); startLoop(); }
  });
  window.addEventListener('resize', () => { if (active) resize(); });
  // 后门解锁瞬间重绘幽灵
  document.addEventListener('ctos:anomaly', () => {});

  // 初始即为地图场景（hash 直达 / 刷新落在本页）时，pager 的首发
  // scenechange 早于本模块加载，需要自行接管激活态
  const mapScene = document.getElementById('scene-maps');
  if (mapScene && mapScene.dataset.state === 'active') {
    active = true;
    startLoop();
    requestAnimationFrame(() => { resize(); });
    addEventListener('load', () => resize());
  }

  window.MapOps = { resize, deploy };
})();

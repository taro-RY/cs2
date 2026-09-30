/* ============================================================
   MAPOS v2 — DE_DUST2 战术沙盘
   底图：原创高保真雷达插画 assets/maps/dust2-radar.svg（同人作品，非 Valve 素材）
   交互：区域聚焦 / 惯性平移 / 光标锚点缩放 / T·CT 视角 /
         三条进攻路线 / 烟闪火投掷轨迹 / A·B 目标区域
   ============================================================ */
(function () {
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

  const GOLD = '#de9b35', GOLD_DIM = 'rgba(222,155,53,.55)';
  const RED = '#eb4b4b', BLUE = '#5fa8e8', SMOKE = '#b9c4cc', FIRE = '#ff7a3c';

  /* ---------------- 区域数据（归一化 0..1，y 向下，对应底图 1024 坐标） ---------------- */
  const A_POLY = [[.62,.10],[.90,.10],[.92,.235],[.84,.295],[.69,.295],[.62,.21]];
  const B_POLY = [[.12,.14],[.38,.14],[.40,.30],[.24,.325],[.12,.30]];

  const ZONES = {
    t:        { x:.40, y:.86, r:.06,  spawn:'t', code:'T SPAWN',       cn:'T 出生点',
      desc:{ t:'进攻方集结区。20 秒内必须对 Long / Mid / Tunnels 三条路做出承诺。', ct:'从这里出发的每一条进攻路线，最终都通向 A 或 B。' } },
    upperT:   { x:.20, y:.80, r:.045, code:'UPPER TUNNELS', cn:'隧道上层入口',
      desc:{ t:'左路的第一道斜坡。静音走下，B 点的防守人听不到你的脚步。', ct:'若听见隧道多人脚步，B 点回防信号立即拉满。' } },
    tunnels:  { x:.145,y:.56, r:.05,  code:'TUNNELS',        cn:'隧道',
      desc:{ t:'U 形双层隧道。上下层切换可以骗到预瞄架点的人。', ct:'狭长地形是燃烧瓶与手雷的乐园，丢一颗火就能拖 7 秒。' } },
    bdoors:   { x:.235,y:.33, r:.042, code:'B DOORS',        cn:'B 门',
      desc:{ t:'出门即 B 包点。闪光爆开的瞬间冲，枪口架车位。', ct:'门一旦失守，退守包点内侧交叉火力，不要在门口对枪。' } },
    b:        { x:.25, y:.225, poly:B_POLY, site:'B', code:'BOMBSITE B', cn:'B 包点',
      desc:{ t:'小而封闭：车、箱、窗口三条枪线。闪光必须白到车位与箱后。', ct:'防守方交叉火力主场。听脚步、等回防，别单人前压送掉。' } },
    ct:       { x:.535,y:.235,r:.055, spawn:'ct', code:'CT SPAWN', cn:'CT 出生点',
      desc:{ t:'中期控制这里，等于同时掐住 A/B 两点的回防咽喉。', ct:'防守方的心脏：A、B、Mid 三线回防的中转站。' } },
    midDoors: { x:.42, y:.45, r:.038, code:'MID DOORS', cn:'中门',
      desc:{ t:'双扇门缝能架到 CT 过点。X-Box 烟是默认战术的起点。', ct:'门缝对枪是 CT 的优势枪位，但要防 T 中路同步夹。' } },
    xbox:     { x:.41, y:.565,r:.03,  code:'X-BOX', cn:'X-Box 箱体',
      desc:{ t:'中路标志性大箱。X-Box 烟封锁 CT 视野，是快提 Cat 的标配。', ct:'X-Box 烟一起，立刻警惕 Catwalk 快攻。' } },
    mid:      { x:.435,y:.67, r:.05,  code:'MID', cn:'中路',
      desc:{ t:'最快到达包点的直线，也是最暴露的走廊。烟闪到位再出。', ct:'丢中路控制等于把转点节奏全部交给对面。' } },
    topmid:   { x:.49, y:.38, r:.042, code:'TOP MID', cn:'中路顶端',
      desc:{ t:'出中门后的分岔口：右转 Cat 上 A，左压 CT。', ct:'中门失守后这里是第二道拦截面。' } },
    cat:      { x:.60, y:.37, r:.04,  code:'CATWALK', cn:'天桥 / Cat',
      desc:{ t:'上 Cat 的斜坡完全暴露给 CT 交叉火力，需要 X-Box 烟配合。', ct:'Cat 是 A 点的预警线，听到脚步立即呼叫 Short 支援。' } },
    short:    { x:.685,y:.30, r:.04,  code:'SHORT', cn:'小道 / Short',
      desc:{ t:'Short 拉出去就是 A 平台，CT 预瞄位固定，预闪比枪法重要。', ct:'Short 与 Long 的交叉火力覆盖整个 A 平台。' } },
    a:        { x:.77, y:.20, poly:A_POLY, site:'A', code:'BOMBSITE A', cn:'A 包点',
      desc:{ t:'开阔大平台：Goose、默认箱、斜坡三个下包区。Long 与 Short 必须同步夹击。', ct:'大平台意味着更多角度，单守必靠道具拖延、等 CT/Short 回防。' } },
    longa:    { x:.885,y:.34, r:.042, code:'LONG A', cn:'A 大 / Long A',
      desc:{ t:'长廊尽头的转折，斜坡直上 A 平台。闪在这里爆开，T 一路冲点。', ct:'A 大失守后退回平台纵深，别在斜坡底硬架。' } },
    longdoors:{ x:.80, y:.485,r:.038, code:'LONG DOORS', cn:'A 大双扇门',
      desc:{ t:'T 控 Long 的第一争夺点。穿门与瞬闪是这里的语言。', ct:'双扇门后的架点优势在防守方，但要防门闪反清。' } },
    pit:      { x:.675,y:.465,r:.035, code:'PIT / BRIDGE', cn:'坑位 / 桥',
      desc:{ t:'长廊西侧的低洼坑位，拿下后可以拖住 Long 回防。', ct:'Pit 一丢，Long 等于白守，必须用烟封坑再打。' } },
    long:     { x:.77, y:.62, r:.05,  code:'LONG', cn:'A 长廊',
      desc:{ t:'全图最长直线交火区。没有好枪法拉不过 AWP，走道具同步。', ct:'AWP 的主场。一枪一人头，但位置会被烟雾随时剥夺。' } }
  };

  /* ---------------- 路线（点列按归一化坐标） ---------------- */
  const ROUTES = {
    long: { name:'LONG A 快提', side:'t', color:GOLD,
      pts:[ZONES.t,ZONES.long,ZONES.longdoors,ZONES.longa,ZONES.a],
      tip:'默认烟封 X-Box 与 CT，Long Doors 瞬闪 → 抢 A 大 → 斜坡上点，12 秒完成。' },
    mid:  { name:'MID → SHORT', side:'t', color:'#ffc15e',
      pts:[ZONES.t,ZONES.mid,ZONES.xbox,ZONES.midDoors,ZONES.topmid,ZONES.cat,ZONES.short,ZONES.a],
      tip:'X-Box 烟 + 中门闪，快上 Catwalk 走 Short 夹 A，打 CT 一个时间差。' },
    b:    { name:'TUNNELS 打 B', side:'t', color:RED,
      pts:[ZONES.t,ZONES.upperT,ZONES.tunnels,ZONES.bdoors,ZONES.b],
      tip:'静音下隧道，B 门瞬闪 + 车位火，全员进门不犹豫，下包守交叉。' },
    ctA:  { name:'CT → A 回防', side:'ct', color:BLUE,
      pts:[ZONES.ct,ZONES.short,ZONES.a], tip:'A 点交火时的最短回防线，走 Short 前先确认 Cat 无人绕后。' },
    ctB:  { name:'CT → B 回防', side:'ct', color:BLUE,
      pts:[ZONES.ct,ZONES.bdoors,ZONES.b], tip:'B 门狭窄，丢闪反清比直接干拉胜率高得多。' },
    ctM:  { name:'CT → 中门', side:'ct', color:BLUE,
      pts:[ZONES.ct,ZONES.midDoors], tip:'控制门缝视野，配合 X-Box 火阻止 T 中路展开。' }
  };

  /* ---------------- 战术道具（throw 出手点 → land 落点） ---------------- */
  const UTILS = [
    { id:'xbox-smoke', type:'smoke', cn:'X-Box 烟', from:[.43,.72], to:[.415,.55],
      tip:'T 中路出手，落点封住 X-Box 上方 CT 视野，Cat 快提标配。' },
    { id:'ct-smoke', type:'smoke', cn:'CT 烟', from:[.50,.40], to:[.54,.26],
      tip:'隔断 CT 出生点视线，让 Short 夹 A 不被中路回防看到。' },
    { id:'long-flash', type:'flash', cn:'A 大门瞬闪', from:[.72,.66], to:[.85,.42],
      tip:'沿长廊弹地瞬爆，白到门后与 A 大坑位，T 同步冲出。' },
    { id:'b-molly', type:'fire', cn:'车位燃烧瓶', from:[.16,.40], to:[.20,.20],
      tip:'B 门出手烧向车位，逼退防守第一枪位，7 秒火墙掩护进门。' },
    { id:'a-molly', type:'fire', cn:'A 平台火', from:[.66,.33], to:[.70,.19],
      tip:'Short 外沿出手落向 Goose / 默认箱，阻止 CT 在平台内侧站位。' }
  ];
  const UTIL_STYLE = {
    smoke:{ color:SMOKE, label:'SMOKE' }, flash:{ color:'#ffe9a8', label:'FLASH' }, fire:{ color:FIRE, label:'MOLLY' }
  };

  /* ---------------- 视图状态 ---------------- */
  let W = 0, H = 0, DPR = 1;
  let scale = .9, ox = 0, oy = 0;
  let viewTween = null;
  let selected = null, hovered = null, active = false, rafOn = false;
  let faction = 't';
  let activeRoute = null, activeUtils = [];

  const img = new Image();
  let imgReady = false;
  img.onload = () => { imgReady = true; if (active) draw(performance.now()); };
  img.onerror = () => { imgReady = false; };
  img.src = 'assets/maps/dust2-radar.svg';

  function clampView() {
    const vw = 1024 * scale, vh = 1024 * scale;
    if (vw <= W) ox = (W - vw) / 2;
    else ox = Math.min(24, Math.max(W - vw - 24, ox));
    if (vh <= H) oy = (H - vh) / 2;
    else oy = Math.min(24, Math.max(H - vh - 24, oy));
  }
  function fitView() {
    scale = Math.min(W / 1080, H / 1080) * 1.05;
    scale = Math.max(.5, Math.min(scale, 1.4));
    clampView();
    updateZoom();
  }
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (W < 10 || H < 10) return;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = '100%'; cv.style.height = '100%';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fitView();
  }
  function updateZoom() { if (elZoom) elZoom.textContent = 'ZOOM ' + scale.toFixed(2) + '×'; }
  const n2x = nx => nx * 1024 * scale + ox;
  const n2y = ny => ny * 1024 * scale + oy;

  /* ---------------- 绘制 ---------------- */
  function drawPoly(pts, fill, stroke, lw) {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(n2x(p[0]), n2y(p[1])) : ctx.moveTo(n2x(p[0]), n2y(p[1])));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0c0e12';
    ctx.fillRect(0, 0, W, H);

    // 底图（深色战术叠色）
    if (imgReady) {
      ctx.drawImage(img, ox, oy, 1024 * scale, 1024 * scale);
      ctx.fillStyle = 'rgba(10,13,20,.34)';
      ctx.fillRect(ox, oy, 1024 * scale, 1024 * scale);
      // 世界边界
      ctx.strokeStyle = 'rgba(222,155,53,.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(ox, oy, 1024 * scale, 1024 * scale);
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = 'rgba(222,155,53,.5)';
      ctx.font = '12px "JetBrains Mono"';
      ctx.fillText('RADAR OFFLINE', 24, 40);
    }

    // hover 区域提示（极淡，只描边）
    if (hovered && hovered !== selected) highlightZone(hovered, now, 'hover');

    // 路线层
    if (activeRoute) drawRoute(ROUTES[activeRoute], now);
    activeUtils.forEach(id => drawUtility(UTILS.find(u => u.id === id), now));

    // 选中区域：简洁聚焦标记（底图本身已承载全部 callout）
    if (selected) highlightZone(selected, now, 'select');
  }

  // 区域高亮：多边形站点描边填充 / 普通区域聚焦圆环
  function highlightZone(key, now, mode) {
    const z = ZONES[key];
    if (!z) return;
    const isHover = mode === 'hover';
    const col = z.site === 'B' ? RED : GOLD;
    if (z.poly) {
      const poly = z.site === 'A' ? A_POLY : B_POLY;
      drawPoly(poly, isHover ? 'rgba(222,155,53,.05)' : (z.site === 'B' ? 'rgba(235,75,75,.13)' : 'rgba(222,155,53,.13)'),
        col, isHover ? 1.5 : 2.5);
      if (!isHover) {
        const x = n2x(z.x), y = n2y(z.y);
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillStyle = col; ctx.textAlign = 'center';
        ctx.fillText(z.code, x, y - 14 * scale);
      }
      return;
    }
    const x = n2x(z.x), y = n2y(z.y);
    const rr = (isHover ? 14 : 18) * scale;
    ctx.save();
    ctx.strokeStyle = z.spawn === 'ct' ? BLUE : col;
    ctx.lineWidth = isHover ? 1.4 : 2;
    ctx.globalAlpha = isHover ? .5 : 1;
    ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke();
    if (!isHover) {
      // 十字准星
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dx,dy]) => {
        ctx.beginPath();
        ctx.moveTo(x + dx*rr*1.25, y + dy*rr*1.25);
        ctx.lineTo(x + dx*rr*1.65, y + dy*rr*1.65);
        ctx.stroke();
      });
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillStyle = z.spawn === 'ct' ? '#8fc4f0' : GOLD;
      ctx.textAlign = 'center';
      ctx.fillText(z.code, x, y - rr - 12);
    }
    ctx.restore();
  }

  function drawRoute(rt, now) {
    const pts = rt.pts;
    ctx.save();
    ctx.strokeStyle = rt.color; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.setLineDash([10, 10]); ctx.lineDashOffset = -now / 26;
    ctx.globalAlpha = .9;
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(n2x(p.x), n2y(p.y)) : ctx.moveTo(n2x(p.x), n2y(p.y)));
    ctx.stroke();
    ctx.setLineDash([]);
    // 行进光点
    const segs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
      segs.push(l); total += l;
    }
    const prog = ((now / 2600) % 1);
    let acc = 0, pos = pts[0];
    for (let i = 0; i < segs.length; i++) {
      const s = acc + segs[i];
      if (prog * total <= s) {
        const t = (prog * total - acc) / segs[i];
        pos = { x: pts[i].x + (pts[i+1].x - pts[i].x) * t, y: pts[i].y + (pts[i+1].y - pts[i].y) * t };
        break;
      }
      acc = s;
    }
    ctx.fillStyle = rt.color;
    ctx.shadowColor = rt.color; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(n2x(pos.x), n2y(pos.y), 6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawUtility(u, now) {
    const st = UTIL_STYLE[u.type];
    const sx = n2x(u.from[0]), sy = n2y(u.from[1]);
    const ex = n2x(u.to[0]), ey = n2y(u.to[1]);
    const mx = (sx + ex) / 2, my = Math.min(sy, ey) - 70;
    ctx.save();
    // 抛物线
    ctx.strokeStyle = st.color; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
    ctx.globalAlpha = .85;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    ctx.setLineDash([]);
    // 飞行点
    const p = (now / 1600) % 1;
    const bx = (1-p)*(1-p)*sx + 2*(1-p)*p*mx + p*p*ex;
    const by = (1-p)*(1-p)*sy + 2*(1-p)*p*my + p*p*ey;
    ctx.fillStyle = st.color;
    ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, Math.PI*2); ctx.fill();
    // 落点
    const pulse = 1 + Math.sin(now/240) * .18;
    ctx.strokeStyle = st.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ex, ey, 11 * pulse, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI*2); ctx.fillStyle = st.color; ctx.fill();
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = st.color;
    ctx.fillText(st.label, ex + 12, ey - 8);
    ctx.restore();
  }

  function loop(now) {
    if (!rafOn) return;
    if (viewTween) {
      const p = Math.min(1, (now - viewTween.t0) / viewTween.ms);
      const e = 1 - Math.pow(1 - p, 3);
      scale = viewTween.s0 + (viewTween.s1 - viewTween.s0) * e;
      ox = viewTween.x0 + (viewTween.x1 - viewTween.x0) * e;
      oy = viewTween.y0 + (viewTween.y1 - viewTween.y0) * e;
      updateZoom();
      if (p >= 1) viewTween = null;
    }
    if (active) draw(now);
    requestAnimationFrame(loop);
  }
  function startLoop() { if (rafOn) return; rafOn = true; requestAnimationFrame(loop); }

  /* ---------------- 相机动作 ---------------- */
  function flyTo(nxc, nyc, zoom, ms) {
    const tx = nxc * 1024 * zoom, ty = nyc * 1024 * zoom;
    viewTween = {
      t0: performance.now(), ms: ms || 620,
      s0: scale, s1: zoom,
      x0: ox, y0: oy,
      x1: W/2 - tx, y1: H/2 - ty
    };
  }
  function fitZone(key) {
    const z = ZONES[key];
    const target = z.site ? 1.5 : 1.9;
    flyTo(z.x, z.y, target);
  }
  function resetView(keepPanel) {
    selected = null;
    const s1 = fitViewScale();
    const vw = 1024 * s1, vh = 1024 * s1;
    viewTween = {
      t0: performance.now(), ms: 600,
      s0: scale, s1, x0: ox, y0: oy,
      x1: vw <= W ? (W-vw)/2 : Math.min(24,Math.max(W-vw-24, ox)),
      y1: vh <= H ? (H-vh)/2 : Math.min(24,Math.max(H-vh-24, oy))
    };
    updateZoom();
    if (!keepPanel) clearPanel();
  }
  function fitViewScale() {
    return Math.max(.5, Math.min(Math.min(W/1080, H/1080) * 1.05, 1.4));
  }

  /* ---------------- 命中检测 ---------------- */
  function zoneAt(clientX, clientY) {
    const r = cv.getBoundingClientRect();
    const nx = (clientX - r.left - ox) / (1024 * scale);
    const ny = (clientY - r.top - oy) / (1024 * scale);
    // 目标区域多边形
    if (pointInPoly(nx, ny, A_POLY)) return 'a';
    if (pointInPoly(nx, ny, B_POLY)) return 'b';
    let hit = null, bd = 30 / scale;
    Object.keys(ZONES).forEach(k => {
      if (ZONES[k].poly) return;
      const d = Math.hypot(ZONES[k].x - nx, ZONES[k].y - ny);
      if (d < bd) { bd = d; hit = k; }
    });
    return hit;
  }
  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /* ---------------- 情报面板 ---------------- */
  function selectZone(key) {
    if (!key) return;
    selected = key;
    const z = ZONES[key];
    elCode.textContent = z.code + (z.site ? ' // OBJECTIVE' : '');
    elName.textContent = z.cn;
    elDesc.textContent = z.desc[faction] || z.desc.t;
    elList.innerHTML =
      '<li>阵营视角 <b style="color:' + (faction === 't' ? RED : BLUE) + '">' + (faction === 't' ? 'TERRORIST' : 'COUNTER-T') + '</b></li>' +
      '<li>地图 <b>DE_DUST2</b></li>' +
      (z.site ? '<li>目标类型 <b style="color:' + (z.site === 'A' ? GOLD : RED) + '">C4 BOMBSITE</b></li>' : '');
    elDeploy.disabled = false;
    fitZone(key);
    if (window.Store) Store.touchMap('dust2');
  }
  function clearPanel() {
    selected = null;
    elCode.textContent = 'DE_DUST2 // TACTICAL SANDBOX';
    elName.textContent = '选择一个区域';
    elDesc.textContent = '点击地图上的区域或 A / B 包点查看情报；切换阵营、路线与投掷物进行推演。';
    elList.innerHTML = '<li>状态 <b>SANDBOX READY</b></li><li>地图 <b>DE_DUST2</b></li>';
    elDeploy.disabled = true;
  }

  /* ---------------- 指针交互 ---------------- */
  let pdown = false, moved = 0, sx = 0, sy = 0, sox = 0, soy = 0;
  cv.addEventListener('pointerdown', e => {
    pdown = true; moved = 0; sx = e.clientX; sy = e.clientY; sox = ox; soy = oy;
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    cv.style.cursor = 'grabbing';
  });
  cv.addEventListener('pointermove', e => {
    if (pdown) {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      moved = Math.max(moved, Math.hypot(dx, dy));
      ox = sox + dx; oy = soy + dy;
      clampView();
      if (moved > 7) viewTween = null;
    } else {
      hovered = zoneAt(e.clientX, e.clientY);
      cv.style.cursor = hovered ? 'pointer' : 'grab';
    }
  });
  cv.addEventListener('pointerup', e => {
    pdown = false;
    cv.style.cursor = hovered ? 'pointer' : 'grab';
    if (moved < 7) {
      const hit = zoneAt(e.clientX, e.clientY);
      if (hit) selectZone(hit);
    }
  });
  cv.addEventListener('pointercancel', () => { pdown = false; });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = (mx - ox) / scale, wy = (my - oy) / scale;
    const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
    scale = Math.max(.55, Math.min(3.2, scale * factor));
    ox = mx - wx * scale; oy = my - wy * scale;
    clampView(); updateZoom();
  }, { passive:false });
  stage.addEventListener('dblclick', resetView);

  /* ---------------- 工具栏 ---------------- */
  function setFaction(f) {
    faction = f;
    document.querySelectorAll('[data-fac]').forEach(b => b.classList.toggle('on', b.dataset.fac === f));
    if (selected) selectZone(selected); else clearPanel();
  }
  function toggleRoute(id) {
    activeRoute = activeRoute === id ? null : id;
    document.querySelectorAll('[data-route]').forEach(b => b.classList.toggle('on', b.dataset.route === activeRoute));
    if (activeRoute && window.toast) toast('ROUTE // ' + ROUTES[activeRoute].name, 'ok');
  }
  function toggleUtil(id) {
    const i = activeUtils.indexOf(id);
    if (i >= 0) activeUtils.splice(i, 1); else activeUtils.push(id);
    document.querySelectorAll('[data-util]').forEach(b => b.classList.toggle('on', activeUtils.includes(b.dataset.util)));
  }
  function bindTools() {
    document.querySelectorAll('[data-fac]').forEach(b => b.addEventListener('click', () => setFaction(b.dataset.fac)));
    document.querySelectorAll('[data-route]').forEach(b => b.addEventListener('click', () => {
      setFaction(ROUTES[b.dataset.route].side);
      toggleRoute(b.dataset.route);
    }));
    document.querySelectorAll('[data-util]').forEach(b => b.addEventListener('click', () => toggleUtil(b.dataset.util)));
    const resetBtn = document.getElementById('mpReset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      activeRoute = null; activeUtils = [];
      document.querySelectorAll('[data-route],[data-util]').forEach(b => b.classList.remove('on'));
      resetView();
    });
    const clearUtil = document.getElementById('mpClearUtil');
    if (clearUtil) clearUtil.addEventListener('click', () => {
      activeUtils = [];
      document.querySelectorAll('[data-util]').forEach(b => b.classList.remove('on'));
    });
  }

  function deploy() {
    if (window.toast) toast('DEPLOYING // DE_DUST2' + (selected ? ' · ' + ZONES[selected].cn : ''), 'ok');
    if (window.Pager) Pager.goTo(6);
  }
  elDeploy.addEventListener('click', deploy);
  document.addEventListener('keydown', e => {
    if (!active || ['pal-open','insp-open','rec-open','glitching','booting'].some(c => document.body.classList.contains(c))) return;
    if (e.key === 'Enter') { e.preventDefault(); deploy(); }
  });

  document.addEventListener('scenechange', e => {
    active = e.detail.id === 'scene-maps';
    if (active) { resize(); startLoop(); }
  });
  const mapScene = document.getElementById('scene-maps');
  if (mapScene && mapScene.dataset.state === 'active') {
    active = true; startLoop();
    requestAnimationFrame(resize);
    addEventListener('load', resize);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && active) resize(); });
  addEventListener('resize', () => { if (active) resize(); });

  bindTools();
  clearPanel();
  window.MapOps = { resize, deploy, resetView };
})();

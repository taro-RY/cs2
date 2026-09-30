/* ============================================================
   MAPOS v3 — DE_DUST2 战术沙盘（真实朝向平面 callout 图）
   底图：assets/maps/dust2-radar.svg（原创同人平面示意图）
   交互：区域聚焦 / 惯性平移 / 光标锚点缩放 / T·CT 视角 /
         进攻与回防路线 / 烟闪火投掷轨迹 / 漂浮彩蛋球
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

  const GOLD = '#de9b35', RED = '#eb4b4b', BLUE = '#5fa8e8';
  const SMOKE = '#b9c4cc', FIRE = '#ff7a3c';

  /* B 左上 / A 右上（归一化 0..1，对应 1024 底图） */
  const B_POLY = [[.146,.09],[.273,.09],[.283,.21],[.127,.22],[.107,.166]];
  const A_POLY = [[.735,.11],[.86,.11],[.879,.235],[.752,.245],[.703,.195]];

  const ZONES = {
    t:       { x:.40,  y:.955, r:.055, spawn:'t', code:'T SPAWN', cn:'匪家',
      desc:{ t:'进攻方出生点。20 秒内决定打 A、打中还是钻 B 隧道。', ct:'从这里出发的每一条进攻路线最终都通向 A 或 B。' } },
    tslope:  { x:.475, y:.89,  r:.038, code:'T RAMP', cn:'匪斜坡',
      desc:{ t:'出匪家上斜坡，右拐进暗道，左接后花园。', ct:'前压到这里就能听见匪家脚步，但小心被夹。' } },
    andao:   { x:.486, y:.755, r:.05,  code:'UNDERPASS', cn:'暗道',
      desc:{ t:'中路与 A 门之间的低位通道，静步摸点的黄金走廊。', ct:'暗道一旦有人，中路和 A 门都要同时警惕。' } },
    oil:     { x:.486, y:.61,  r:.032, code:'OIL DRUM', cn:'油桶',
      desc:{ t:'油桶是 A 门外拐角的标志性掩体，贴住再清点。', ct:'CT 前压的常用落脚点，闪光吃满直接白给。' } },
    mid:     { x:.459, y:.535, r:.05,  code:'MID', cn:'中路',
      desc:{ t:'最快到达包点的直线，也是最暴露的走廊。', ct:'丢中路控制等于把转点节奏全部交给对面。' } },
    xbox:    { x:.463, y:.408, r:.03,  code:'X-BOX', cn:'xbox 箱',
      desc:{ t:'X-Box 烟封锁 CT 视野，是快提小道的标配。', ct:'X-Box 烟一起，立刻警惕小道快攻。' } },
    middoors:{ x:.475,y:.363, r:.036, code:'MID DOORS', cn:'中门',
      desc:{ t:'门缝能架到 CT 过点，道具到位再出人。', ct:'门缝对枪是 CT 的优势枪位，但要防同步夹。' } },
    b1:      { x:.344, y:.39,  r:.038, code:'B1', cn:'B1',
      desc:{ t:'隧道上层，通向 B 门的转折口。', ct:'听 B1 脚步即可预判 B 点压力。' } },
    b2:      { x:.146, y:.465, r:.05,  code:'B2', cn:'B2',
      desc:{ t:'隧道下层，B2 箱子后可以静步等人。', ct:'B2 一丢，后花园与 B 点的联系被切断。' } },
    garden:  { x:.182, y:.72,  r:.052, code:'BACK GARDEN', cn:'后花园',
      desc:{ t:'匪家左路大厅，慢摸 B 的整备区。', ct:'CT 前压后花园能拿到 T 走位的一手信息。' } },
    bdoors:  { x:.246, y:.246, r:.04,  code:'B DOORS', cn:'B 门',
      desc:{ t:'出门即 B 包点，闪光爆开的瞬间冲。', ct:'门一旦失守退守包点交叉火力。' } },
    b:       { x:.20,  y:.15,  poly:B_POLY, site:'B', code:'BOMBSITE B', cn:'B 包点',
      desc:{ t:'小而封闭：车、箱、窗口三条枪线。闪必须白到车位与箱后。', ct:'交叉火力主场，听脚步等回防，别单人前压。' } },
    sand:    { x:.383, y:.188, r:.045, code:'SAND', cn:'沙地',
      desc:{ t:'B 门到中门之间的开阔沙地，穿越需要 CT 烟。', ct:'沙地控制连接 B 与中路，丢了就只能缩点。' } },
    ct:      { x:.61,  y:.20,  r:.052, spawn:'ct', code:'CT SPAWN', cn:'警家',
      desc:{ t:'中期控制这里，等于掐住 A/B 回防咽喉。', ct:'防守方心脏：A、B、Mid 三线回防的中转站。' } },
    ninja:   { x:.637, y:.10,  r:.028, code:'NINJA', cn:'忍者位',
      desc:{ t:'A 点背身死角，拆包忍者的经典舞台。', ct:'回防时可以赌一个忍者位心理盲区。' } },
    cat:     { x:.553, y:.53,  r:.042, code:'CATWALK', cn:'小道',
      desc:{ t:'小道拉出去就是 A 平台，预闪比枪法重要。', ct:'小道是 A 点预警线，脚步一响立刻呼叫支援。' } },
    asmall:  { x:.605, y:.39,  r:.04,  code:'SHORT / A SHORT', cn:'A 小',
      desc:{ t:'A 小凹槽与死点是上平台前必须清的角。', ct:'A 小与 A 大的交叉火力覆盖整个平台。' } },
    a:       { x:.80,  y:.175, poly:A_POLY, site:'A', code:'BOMBSITE A', cn:'A 包点',
      desc:{ t:'开阔平台：默认箱、忍者位、斜坡三个下包区。A 大与小道必须同步。', ct:'角度多，单守必靠道具拖延等回防。' } },
    aramp:   { x:.877, y:.127, r:.036, code:'A RAMP', cn:'A 斜坡',
      desc:{ t:'斜坡顶直接看见 A 平台 CT 站位，抢点要快。', ct:'斜坡失守退回平台纵深，别在坡底硬架。' } },
    longa:   { x:.867, y:.414, r:.05,  code:'LONG A', cn:'A 大',
      desc:{ t:'全图最长直线交火区，没好枪法拉不过 AWP，走道具同步。', ct:'AWP 的主场，但位置随时会被烟雾剥夺。' } },
    bluecar: { x:.914, y:.256, r:.034, code:'BLUE CAR', cn:'蓝车',
      desc:{ t:'A 大尽头蓝车是 T 抢下后的第一掩体。', ct:'蓝车死点能架住整条 A 大，但吃雷吃火。' } },
    pit:     { x:.859, y:.656, r:.05,  code:'PIT', cn:'大坑',
      desc:{ t:'拿下大坑就能拖住 A 大回防，低打高有掩体。', ct:'大坑一丢 A 大等于白守，先封烟再打。' } },
    adoors:  { x:.707, y:.543, r:.04,  code:'A DOORS', cn:'A 门',
      desc:{ t:'T 控 A 大的第一道门，穿门与瞬闪是这里的语言。', ct:'门后架点优势在防守方，但要防门闪反清。' } },
    acorner: { x:.635, y:.67,  r:.04,  code:'A DOORS CORNER', cn:'A 门外拐角',
      desc:{ t:'暗道出来到 A 门的拐角，闪光弹墙送进门里。', ct:'拐角近点容易被静步摸到，留意油桶方向。' } },
    yellow:  { x:.684, y:.758, r:.032, code:'YELLOW CAR', cn:'黄车',
      desc:{ t:'黄车是 A 门下方的转点掩体，打完能撤大坑。', ct:'前压到黄车要防暗道同步。' } }
  };

  /* ---------------- 路线 ---------------- */
  const ROUTES = {
    long:{ name:'A 大快提', side:'t', color:GOLD,
      pts:[ZONES.t,ZONES.tslope,ZONES.andao,ZONES.acorner,ZONES.adoors,ZONES.longa,ZONES.aramp,ZONES.a],
      tip:'暗道静音 → A 门瞬闪 → 抢 A 大上斜坡，配合小道同步夹击，12 秒到点。' },
    mid: { name:'中路 → 小道', side:'t', color:'#ffc15e',
      pts:[ZONES.t,ZONES.tslope,ZONES.andao,ZONES.oil,ZONES.mid,ZONES.xbox,ZONES.middoors,ZONES.asmall,ZONES.a],
      tip:'X-Box 烟 + 中门闪，快上 A 小走小道夹 A，打 CT 时间差。' },
    b:   { name:'隧道打 B', side:'t', color:RED,
      pts:[ZONES.t,ZONES.garden,ZONES.b2,ZONES.b1,ZONES.bdoors,ZONES.b],
      tip:'后花园静音进 B2，B 门瞬闪 + 车位火，全员进门不犹豫。' },
    ctA: { name:'警家 → A 回防', side:'ct', color:BLUE,
      pts:[ZONES.ct,ZONES.asmall,ZONES.a], tip:'A 点交火时的最短回防线，走 A 小前先确认小道无人绕后。' },
    ctB: { name:'警家 → B 回防', side:'ct', color:BLUE,
      pts:[ZONES.ct,ZONES.sand,ZONES.bdoors,ZONES.b], tip:'穿过沙地回 B，丢闪反清 B 门比干拉胜率高。' },
    ctM: { name:'警家 → 中门', side:'ct', color:BLUE,
      pts:[ZONES.ct,ZONES.middoors], tip:'控制门缝视野，配合 X-Box 火阻止 T 中路展开。' }
  };

  /* ---------------- 投掷物 ---------------- */
  const UTILS = [
    { id:'xbox-smoke', type:'smoke', cn:'X-Box 烟', from:[.455,.55], to:[.463,.415],
      tip:'中路出手封 X-Box 上方 CT 视野，小道快提标配。' },
    { id:'ct-smoke', type:'smoke', cn:'警家烟', from:[.50,.30], to:[.59,.205],
      tip:'隔断警家视线，让 A 小夹 A 不被中路回防看到。' },
    { id:'long-flash', type:'flash', cn:'A 门瞬闪', from:[.62,.66], to:[.71,.535],
      tip:'拐角弹墙瞬爆，白到门后与大坑架点，T 同步冲出。' },
    { id:'b-molly', type:'fire', cn:'车位燃烧瓶', from:[.33,.30], to:[.20,.19],
      tip:'B1 出手烧向车位，逼退防守第一枪位，7 秒火墙掩护进门。' },
    { id:'a-molly', type:'fire', cn:'A 平台火', from:[.62,.33], to:[.79,.165],
      tip:'A 小外沿出手落向默认箱，阻止 CT 在平台内侧站位。' }
  ];
  const UTIL_STYLE = { smoke:{color:SMOKE,label:'SMOKE'}, flash:{color:'#ffe9a8',label:'FLASH'}, fire:{color:FIRE,label:'MOLLY'} };

  /* ---------------- 漂浮彩蛋球 ---------------- */
  const EGG_LINES = [
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
    '烟雾散去的那一刻，建议切刀跑'
  ];
  const BALL_N = 6;
  let balls = [];
  let particles = [];

  function seedBalls() {
    balls = [];
    for (let i = 0; i < BALL_N; i++) {
      balls.push(makeBall(i, false));
    }
  }
  function makeBall(i, respawn) {
    // 散布在通道沿线
    const spots = [[.46,.5],[.72,.40],[.22,.38],[.60,.24],[.40,.78],[.80,.60],[.30,.60],[.86,.30]];
    const s = spots[(i + (respawn ? 3 : 0)) % spots.length];
    return {
      x: s[0] + (Math.random() - .5) * .05,
      y: s[1] + (Math.random() - .5) * .05,
      vx: (Math.random() - .5) * .012,
      vy: (Math.random() - .5) * .010,
      phase: Math.random() * Math.PI * 2,
      r: .016 + Math.random() * .006,
      alive: true, respawnAt: 0
    };
  }
  function updateBalls(dt, now) {
    balls.forEach((b, i) => {
      if (!b.alive) {
        if (now > b.respawnAt) balls[i] = makeBall(i, true);
        return;
      }
      b.phase += dt;
      b.x += b.vx * dt; b.y += b.vy * dt + Math.sin(b.phase) * 0.00012;
      if (b.x < .07 || b.x > .94) b.vx *= -1;
      if (b.y < .06 || b.y > .95) b.vy *= -1;
      b.x = Math.max(.07, Math.min(.94, b.x));
      b.y = Math.max(.06, Math.min(.95, b.y));
    });
    particles.forEach(p => {
      p.age += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= (1 - 1.8 * dt); p.vy *= (1 - 1.8 * dt);
    });
    particles = particles.filter(p => p.age < p.life);
  }
  function burstBall(b) {
    const colors = [GOLD, '#ffc15e', RED, '#ffe9a8', '#ffffff'];
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = .12 + Math.random() * .34;
      particles.push({
        x: b.x, y: b.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        age: 0, life: .55 + Math.random() * .5,
        color: colors[i % colors.length], size: 2 + Math.random() * 3.5
      });
    }
    b.alive = false;
    b.respawnAt = performance.now() + 12000;
    const line = EGG_LINES[Math.floor(Math.random() * EGG_LINES.length)];
    if (window.toast) window.toast('EASTER EGG // ' + line, 'ok');
    if (window.Store) Store.bumpEggs();
  }

  /* ---------------- 视图状态 ---------------- */
  let W = 0, H = 0, DPR = 1;
  let scale = .9, ox = 0, oy = 0, viewTween = null;
  let selected = null, hovered = null, active = false, rafOn = false;
  let faction = 't', activeRoute = null, activeUtils = [];

  const img = new Image();
  let imgReady = false;
  img.onload = () => { imgReady = true; };
  img.src = 'assets/maps/dust2-radar.svg';

  function clampView() {
    const vw = 1024 * scale, vh = 1024 * scale;
    if (vw <= W) ox = (W - vw) / 2;
    else ox = Math.min(24, Math.max(W - vw - 24, ox));
    if (vh <= H) oy = (H - vh) / 2;
    else oy = Math.min(24, Math.max(H - vh - 24, oy));
  }
  function fitViewScale() { return Math.max(.5, Math.min(Math.min(W / 1080, H / 1080) * 1.05, 1.4)); }
  function fitView() { scale = fitViewScale(); clampView(); updateZoom(); }
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
    const dt = Math.min(.05, (now - (draw._t || now)) / 1000);
    draw._t = now;
    updateBalls(dt, now);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0c0e12';
    ctx.fillRect(0, 0, W, H);

    if (imgReady) {
      ctx.drawImage(img, ox, oy, 1024 * scale, 1024 * scale);
      ctx.fillStyle = 'rgba(10,13,20,.30)';
      ctx.fillRect(ox, oy, 1024 * scale, 1024 * scale);
      ctx.strokeStyle = 'rgba(222,155,53,.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(ox, oy, 1024 * scale, 1024 * scale);
      ctx.setLineDash([]);
    }

    if (hovered && hovered !== selected && !ballAtClient._h) highlightZone(hovered, 'hover');
    if (activeRoute) drawRoute(ROUTES[activeRoute], now);
    activeUtils.forEach(id => drawUtility(UTILS.find(u => u.id === id), now));
    drawParticles();
    drawBalls(now);
    if (selected) highlightZone(selected, 'select');
  }

  function highlightZone(key, mode) {
    const z = ZONES[key];
    if (!z) return;
    const isHover = mode === 'hover';
    const col = z.site === 'B' ? RED : GOLD;
    if (z.poly) {
      drawPoly(z.site === 'A' ? A_POLY : B_POLY,
        isHover ? 'rgba(222,155,53,.05)' : (z.site === 'B' ? 'rgba(235,75,75,.14)' : 'rgba(222,155,53,.14)'),
        col, isHover ? 1.5 : 2.5);
      if (!isHover) {
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillStyle = col; ctx.textAlign = 'center';
        ctx.fillText(z.code, n2x(z.x), n2y(z.y) - 16 * scale);
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
    const segs = []; let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
      segs.push(l); total += l;
    }
    const prog = (now / 2600) % 1;
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
    ctx.fillStyle = rt.color; ctx.shadowColor = rt.color; ctx.shadowBlur = 14;
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
    ctx.strokeStyle = st.color; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.globalAlpha = .85;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    ctx.setLineDash([]);
    const p = (now / 1600) % 1;
    const bx = (1-p)*(1-p)*sx + 2*(1-p)*p*mx + p*p*ex;
    const by = (1-p)*(1-p)*sy + 2*(1-p)*p*my + p*p*ey;
    ctx.fillStyle = st.color;
    ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, Math.PI*2); ctx.fill();
    const pulse = 1 + Math.sin(now/240) * .18;
    ctx.strokeStyle = st.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ex, ey, 11 * pulse, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI*2); ctx.fill();
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText(st.label, ex + 12, ey - 8);
    ctx.restore();
  }

  function drawBalls(now) {
    balls.forEach(b => {
      if (!b.alive) return;
      const x = n2x(b.x), y = n2y(b.y);
      const pulse = 1 + Math.sin(now/320 + b.phase*3) * .22;
      const rr = b.r * 1024 * scale * pulse;
      // 外层光环
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 3.2);
      g.addColorStop(0, 'rgba(222,155,53,.55)');
      g.addColorStop(.4, 'rgba(222,155,53,.18)');
      g.addColorStop(1, 'rgba(222,155,53,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rr * 3.2, 0, Math.PI*2); ctx.fill();
      // 核心
      ctx.fillStyle = '#ffd98a';
      ctx.shadowColor = GOLD; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.arc(x - rr*.3, y - rr*.3, rr*.32, 0, Math.PI*2); ctx.fill();
    });
  }
  function drawParticles() {
    particles.forEach(p => {
      const k = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(n2x(p.x), n2y(p.y), p.size * scale * (0.5 + k), 0, Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    if (!rafOn) return;
    requestAnimationFrame(loop);
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
  }
  function startLoop() { if (rafOn) return; rafOn = true; requestAnimationFrame(loop); }

  /* ---------------- 相机 ---------------- */
  function flyTo(nxc, nyc, zoom, ms) {
    viewTween = {
      t0: performance.now(), ms: ms || 620,
      s0: scale, s1: zoom, x0: ox, y0: oy,
      x1: W/2 - nxc*1024*zoom, y1: H/2 - nyc*1024*zoom
    };
  }
  function fitZone(key) {
    const z = ZONES[key];
    flyTo(z.x, z.y, z.site ? 1.5 : 1.9);
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

  /* ---------------- 命中 ---------------- */
  const ballAtClient = function (clientX, clientY) {
    const r = cv.getBoundingClientRect();
    const nx = (clientX - r.left - ox) / (1024 * scale);
    const ny = (clientY - r.top - oy) / (1024 * scale);
    for (const b of balls) {
      if (!b.alive) continue;
      if (Math.hypot(b.x - nx, b.y - ny) < Math.max(.03, b.r * 2.4)) return b;
    }
    return null;
  };
  ballAtClient._h = null;

  function zoneAt(clientX, clientY) {
    const r = cv.getBoundingClientRect();
    const nx = (clientX - r.left - ox) / (1024 * scale);
    const ny = (clientY - r.top - oy) / (1024 * scale);
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

  /* ---------------- 面板 ---------------- */
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
    elDesc.textContent = '点击地图上的区域或 A / B 包点查看情报；漂浮的金球可以点炸。';
    elList.innerHTML = '<li>状态 <b>SANDBOX READY</b></li><li>地图 <b>DE_DUST2</b></li>';
    elDeploy.disabled = true;
  }

  /* ---------------- 指针 ---------------- */
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
      const b = ballAtClient(e.clientX, e.clientY);
      ballAtClient._h = b;
      hovered = b ? null : zoneAt(e.clientX, e.clientY);
      cv.style.cursor = b ? 'pointer' : (hovered ? 'pointer' : 'grab');
    }
  });
  cv.addEventListener('pointerup', e => {
    pdown = false;
    if (moved < 7) {
      const b = ballAtClient(e.clientX, e.clientY);
      if (b) { burstBall(b); ballAtClient._h = null; }
      else {
        const hit = zoneAt(e.clientX, e.clientY);
        if (hit) selectZone(hit);
      }
    }
    cv.style.cursor = 'grab';
  });
  cv.addEventListener('pointercancel', () => { pdown = false; });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = (mx - ox) / scale, wy = (my - oy) / scale;
    scale = Math.max(.55, Math.min(3.2, scale * (e.deltaY < 0 ? 1.12 : 1/1.12)));
    ox = mx - wx * scale; oy = my - wy * scale;
    clampView(); updateZoom();
  }, { passive:false });
  stage.addEventListener('dblclick', () => resetView());

  /* ---------------- 工具栏 ---------------- */
  function setFaction(f) {
    faction = f;
    document.querySelectorAll('[data-fac]').forEach(b => b.classList.toggle('on', b.dataset.fac === f));
    if (selected) selectZone(selected); else clearPanel();
  }
  function toggleRoute(id) {
    activeRoute = activeRoute === id ? null : id;
    document.querySelectorAll('[data-route]').forEach(b => b.classList.toggle('on', b.dataset.route === activeRoute));
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

  seedBalls();
  bindTools();
  clearPanel();
  window.MapOps = { resize, deploy, resetView };
})();

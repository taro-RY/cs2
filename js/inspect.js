/* ============================================================
   INSPECT — 武器战术检视（数据成为世界的一部分）
   - 3D 渲染层由 viewer3d.js（Three.js）提供：惯性旋转 / 缩放 / 部件聚焦
   - 本模块负责：武器数据库、弹窗、3D 热点投影、情报侧栏、长按进入
   - window.Inspect.open(id) 供指挥台 / 卡片调用
   ============================================================ */
(function () {
  /* ---------------- 武器数据库（卡片 / 检视 / 命令台共用） ---------------- */
  const WEAPONS = {
    ak47: {
      id: 'ak47', code: 'WPN-01 // RIFLE · T', name: 'AK-47 | 火舌',
      caliber: '7.62×39mm', rpm: '600 RPM', price: 2500, img: 'w-ak47.jpg',
      metric: { label: 'POWER / 火力压制', v: 92 },
      stats: [['火力', 92], ['控制', 72], ['射速', 60], ['机动', 78]],
      type: 'rifle', variant: 'ak',
      parts: [
        { x: .845, y: .39, a3d: [.97, .15], t: '斜切制退器', d: '抑制连发上跳，第一发命中率提升 12%。近战中枪口火焰可短暂致盲。' },
        { x: .575, y: .40, a3d: [.44, .26], t: '机匣 / 枪机', d: '7.62×39mm 大威力弹，无头盔一枪毙命。沙尘环境可靠性记录 99.4%。' },
        { x: .415, y: .68, a3d: [.47, .59], t: '弧形弹匣', d: '30 发钢制弹匣，满载换弹 2.43s。交火间隙再操作，别在空地换弹。' },
        { x: .405, y: .29, a3d: [.60, .12], t: '照门 / 导轨', d: '机械照门带 100–1000m 刻度，侧导轨可加装红点与倍率瞄具。' },
        { x: .300, y: .63, a3d: [.38, .52], t: '握把 / 扳机', d: '全自动 600 RPM 但散布剧烈——点射，永远点射。' }
      ]
    },
    m4a1s: {
      id: 'm4a1s', code: 'WPN-02 // CARBINE · CT', name: 'M4A1-S | 静默',
      caliber: '5.56×45mm', rpm: '600 RPM', price: 2900, img: 'w-m4a1s.jpg',
      metric: { label: 'CONTROL / 弹道控制', v: 88 },
      stats: [['火力', 70], ['控制', 88], ['静音', 96], ['机动', 82]],
      type: 'carbine', variant: 's',
      parts: [
        { x: .835, y: .39, a3d: [.94, .27], t: '一体式消音器', d: '枪声压制至 64dB，地图外完全无法定位。代价是弹匣容量降至 25 发。' },
        { x: .530, y: .30, a3d: [.33, .10], t: '平顶皮卡汀尼导轨', d: '全长 MIL-STD-1913 导轨，红点 / 倍率切换无需工具。' },
        { x: .400, y: .65, a3d: [.42, .58], t: 'STANAG 弹匣', d: '25 发 5.56 供弹，消音机构刻意压低射速以换取极致稳定。' },
        { x: .620, y: .44, a3d: [.57, .30], t: '浮置护木', d: '浮置式枪管不与护木接触，外力干扰趋近于零，远距离精度受益。' },
        { x: .300, y: .62, a3d: [.27, .54], t: '战术握把', d: '连续 8 发落点仍保持在胸环内，适合中距离静默点名。' }
      ]
    },
    m4a4: {
      id: 'm4a4', code: 'WPN-03 // CARBINE · CT', name: 'M4A4 | 巷战',
      caliber: '5.56×45mm', rpm: '666 RPM', price: 3100, img: 'w-m4a4.jpg',
      metric: { label: 'FIRE RATE / 射速', v: 90 },
      stats: [['火力', 74], ['控制', 80], ['射速', 90], ['机动', 80]],
      type: 'carbine', variant: 'a4',
      parts: [
        { x: .815, y: .39, a3d: [.95, .27], t: '三叉消焰器', d: '三连射火光降低 70%，黑暗环境交火不会致盲自己。' },
        { x: .530, y: .30, a3d: [.36, .10], t: '平顶皮卡汀尼导轨', d: '全长导轨支持热成像、全息与倍率瞄具快速换装。' },
        { x: .400, y: .65, a3d: [.44, .58], t: 'STANAG 弹匣', d: '30 发满载，666 RPM 理论射速，弹幕压制的底气。' },
        { x: .620, y: .44, a3d: [.63, .30], t: '四面导轨护木', d: '可同时挂载战术灯、激光指示器与前握把，为巷战而生。' },
        { x: .300, y: .62, a3d: [.31, .54], t: '战术握把', d: '高射速下的唯一救赎：压枪线、短点射、听声换位。' }
      ]
    },
    molotov: {
      id: 'molotov', code: 'WPN-04 // UTILITY', name: '燃烧瓶 | 炼狱',
      caliber: 'INCENDIARY', rpm: '—', price: 400, img: 'w-molotov.jpg',
      metric: { label: 'AREA DENIAL / 压制', v: 95 },
      stats: [['封锁', 95], ['持续', 70], ['机动', 88], ['性价比', 98]],
      type: 'molotov', variant: 't',
      parts: [
        { x: .450, y: .12, a3d: [.66, .16], t: '浸油引信布条', d: '点燃后约 1.8s 触地爆燃。拉环之前，先确认自己的退路。' },
        { x: .500, y: .46, a3d: [.5, .38], t: '玻璃瓶身', d: '碎裂半径 3.2m，触地瞬间形成不可穿越的火墙。' },
        { x: .500, y: .72, a3d: [.5, .72], t: '燃烧液', d: '持续燃烧 7 秒，峰值温度 1200°C，把敌人从掩体里“请”出来。' }
      ]
    }
  };

  const overlay = document.getElementById('inspect');
  const viewerEl = document.getElementById('viewer3d');
  const fallbackEl = document.getElementById('v3dFallback');
  const hots = document.getElementById('inspHots');
  const info = document.getElementById('inspInfo');
  const tabs = document.getElementById('inspTabs');
  const statsEl = document.getElementById('inspStats');

  let cur = null;
  let viewerInited = false;
  let hotEls = [];

  function initViewer() {
    if (viewerInited) return true;
    if (!window.Viewer3D) return false;
    window.Viewer3D.init(viewerEl);
    viewerInited = true;
    return true;
  }

  /* ---------------- 热点 / 侧栏 ---------------- */
  function selectPart(i) {
    if (!cur) return;
    if (i === -1) { resetInfo(); return; }
    const p = cur.parts[i];
    hotEls.forEach((h, j) => h.classList.toggle('on', j === i));
    tabs.querySelectorAll('.insp-tab').forEach((t, j) => t.classList.toggle('on', j === i));
    info.innerHTML = '<b>PART ' + String(i + 1).padStart(2, '0') + ' // ' + p.t + '</b><span>' + p.d + '</span>';
    if (window.Viewer3D && viewerInited) window.Viewer3D.focus(i);
    if (window.Store) Store.bumpHotspots();
  }
  function resetInfo() {
    hotEls.forEach(h => h.classList.remove('on'));
    tabs.querySelectorAll('.insp-tab').forEach(t => t.classList.remove('on'));
    info.innerHTML = '<b>STANDBY · 待命</b><span>点击武器上的金色节点，读取该部位的战术情报。拖拽空白处恢复全景。</span>';
    if (window.Viewer3D && viewerInited) window.Viewer3D.reset();
  }

  function populate(w) {
    document.getElementById('inspCode').textContent = w.code;
    document.getElementById('inspName').textContent = w.name;
    document.getElementById('inspPrice').textContent = '$ ' + w.price.toLocaleString('en-US');

    // 3D 热点：初始居中，位置由 viewer 每帧投影写入
    hots.innerHTML = '';
    hotEls = [];
    w.parts.forEach((p, i) => {
      const b = document.createElement('button');
      b.className = 'hot';
      b.type = 'button';
      b.innerHTML = '<i></i><em>' + String(i + 1).padStart(2, '0') + ' ' + p.t + '</em>';
      b.addEventListener('click', (e) => { e.stopPropagation(); selectPart(i); });
      hots.appendChild(b);
      hotEls.push(b);
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

  // viewer 每帧把 3D 锚点投影到屏幕坐标
  function onFrame(pts) {
    viewerEl.classList.add('view-ready');
    pts.forEach((p, i) => {
      const el = hotEls[i];
      if (!el) return;
      el.style.transform = 'translate(-50%,-50%) translate3d(' + p.x + 'px,' + p.y + 'px,0)';
      el.classList.toggle('back', !p.visible);
    });
  }

  /* ---------------- 后门信号泄漏 ---------------- */
  const signalEl = document.getElementById('inspSignal');
  function syncSignal() {
    if (!signalEl) return;
    const leak = !!(window.Store && Store.anomaly);
    signalEl.hidden = !leak;
    signalEl.classList.toggle('flicker', leak);
  }
  document.addEventListener('ctos:anomaly', syncSignal);

  /* ---------------- 开关 ---------------- */
  function launch3D(w) {
    if (!initViewer()) {
      // module 尚未就绪（极慢加载）：短暂等待后重试
      let tries = 0;
      const iv = setInterval(() => {
        if (initViewer() || ++tries > 40) {
          clearInterval(iv);
          if (window.Viewer3D) launch3D(w);
          else showFallback(w);
        }
      }, 60);
      return;
    }
    window.Viewer3D.open(w.id, w.parts, {
      onFrame,
      onSelect: selectPart,
      onError: () => showFallback(w)
    });
  }
  function showFallback(w) {
    fallbackEl.hidden = false;
    fallbackEl.innerHTML = '<img src="images/' + w.img + '" alt="' + w.name + '">' +
      '<p>3D 模块加载失败 — 已切换为静态检视</p>';
  }

  function open(id) {
    const w = WEAPONS[id];
    if (!w) return;
    cur = w;
    fallbackEl.hidden = true;
    fallbackEl.innerHTML = '';
    viewerEl.classList.remove('view-ready');
    populate(w);
    syncSignal();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('insp-open');
    launch3D(w);
    if (window.Store) window.Store.touchInspect(id);
  }
  function close() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('insp-open');
    if (window.Viewer3D && viewerInited) window.Viewer3D.close();
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
        open(card.dataset.weapon);
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
    card.addEventListener('click', (e) => {
      if (card.classList.contains('lp-fire')) {
        e.preventDefault(); e.stopPropagation();
        card.classList.remove('lp-fire');
      } else if (card.dataset.weapon) {
        e.preventDefault();
        open(card.dataset.weapon);
      }
    }, true);
  });

  window.WEAPONS = WEAPONS;
  window.Inspect = { open, close };
})();

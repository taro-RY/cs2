/* ============================================================
   STORE — CT-OS 的记忆层（世界会观察并记住玩家）
   真实信号：轮次 / 武器检视 / 部位情报 / 扫描 / 命令 /
             地图接触 / 部署次数 / 活跃时长 / 彩蛋态
   profile() 把这些信号推导成行为画像，而非静态标签。
   ============================================================ */
(function () {
  const KEY = 'ctos.v1';

  const defaults = () => ({
    round: 0,          // 每次会话（刷新/重开）+1
    inspects: {},      // { ak47: n, ... }
    anomaly: false,    // DO NOT OPEN 后门解锁态
    scans: 0,          // 被战术扫描命中的次数
    maps: {},          // { inferno: n, mirage: n, nuke: n }
    commands: 0,       // 指挥台执行过的命令数
    hotspots: 0,       // 武器部位情报读取次数
    eggs: 0,           // 战术沙盘点爆的彩蛋球
    deploys: 0,        // 进入部署的次数
    dwellMs: 0,        // 累计活跃时长
    flags: {},         // 一次性观察事件（已触发的系统提示）
    firstAt: Date.now(),
    lastAt: Date.now()
  });

  let data;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    data = saved && typeof saved === 'object'
      ? Object.assign(defaults(), saved)
      : defaults();
    data.inspects = data.inspects || {};
    data.maps = data.maps || {};
    data.flags = data.flags || {};
  } catch (e) { data = defaults(); }

  // 新一轮部署
  data.round = (data.round || 0) + 1;
  data.lastAt = Date.now();

  let saveQueued = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }
  function saveSoon() {
    if (saveQueued) return;
    saveQueued = true;
    setTimeout(() => { saveQueued = false; save(); }, 400);
  }

  function touchInspect(id) {
    data.inspects[id] = (data.inspects[id] || 0) + 1;
    saveSoon();
    return data.inspects[id];
  }
  function countOf(id) { return data.inspects[id] || 0; }
  function totalInspects() {
    return Object.values(data.inspects).reduce((a, b) => a + b, 0);
  }
  function touchMap(id) {
    data.maps[id] = (data.maps[id] || 0) + 1;
    saveSoon();
    return data.maps[id];
  }
  function totalMapTouches() {
    return Object.values(data.maps).reduce((a, b) => a + b, 0);
  }
  function bumpCommands() { data.commands++; saveSoon(); return data.commands; }
  function bumpHotspots() { data.hotspots++; saveSoon(); return data.hotspots; }
  function bumpDeploy() { data.deploys++; saveSoon(); return data.deploys; }
  function addDwell(ms) { data.dwellMs += ms; saveSoon(); }

  function unlockAnomaly() {
    const was = data.anomaly;
    data.anomaly = true;
    save();
    return !was;
  }
  function bumpScans() {
    data.scans++;
    saveSoon();
    return data.scans;
  }
  function bumpEggs() {
    data.eggs = (data.eggs || 0) + 1;
    saveSoon();
    return data.eggs;
  }

  // 一次性事件：首次返回 true，之后 false
  function once(key) {
    if (data.flags[key]) return false;
    data.flags[key] = true;
    save();
    return true;
  }

  function daysSinceFirst() {
    return Math.max(0, Math.floor((Date.now() - data.firstAt) / 86400000));
  }

  // 被检视最多的武器 { id, n, name? }
  function favorite(weapons) {
    let best = null;
    Object.keys(data.inspects).forEach((id) => {
      const n = data.inspects[id];
      if (!best || n > best.n) best = { id, n };
    });
    if (best && weapons && weapons[best.id]) best.name = weapons[best.id].name;
    return best;
  }
  // 最常接触的地图 { id, n }
  function favoriteMap() {
    let best = null;
    Object.keys(data.maps).forEach((id) => {
      const n = data.maps[id];
      if (!best || n > best.n) best = { id, n };
    });
    return best;
  }

  /* ---------------- 行为画像（纯推导） ----------------
     ENTRY    突入倾向 —— 快速扫描 / 频繁检视装备 / 部署次数
     TACTICAL 战术倾向 —— 命令台使用 / 部位情报读取 / 地图研判
     PATIENCE 耐心倾向 —— 活跃时长，与躁动扫描负相关                       */
  function profile() {
    const ti = totalInspects(), tm = totalMapTouches();
    const actions = data.scans + ti + data.commands + data.hotspots + tm + data.deploys;

    const entry = Math.min(100, Math.round(data.scans * 7 + ti * 4 + data.deploys * 8));
    const tactical = Math.min(100, Math.round(data.commands * 7 + data.hotspots * 5 + tm * 9));
    const dwellMin = data.dwellMs / 60000;
    const patience = Math.max(0, Math.min(100,
      Math.round(14 + dwellMin * 10 - data.scans * 4 + data.deploys * 2)));

    const ready = actions >= 5;
    let type = 'UNCLASSIFIED', typeCn = '未分类';
    if (ready) {
      if (entry >= tactical && entry >= patience) { type = 'AGGRESSIVE ENTRY'; typeCn = '激进突入'; }
      else if (tactical >= patience) { type = 'TACTICAL ANALYST'; typeCn = '战术分析'; }
      else { type = 'PATIENT MARKSMAN'; typeCn = '耐心射手'; }
    }
    // 信心值：随信号量增长到 96%，永远保留一点不确定性
    const confidence = ready ? Math.min(96, 42 + actions * 4) : 0;

    return {
      ready, type, typeCn, confidence,
      scores: { entry, tactical, patience },
      signals: {
        round: data.round, scans: data.scans, inspects: ti,
        commands: data.commands, hotspots: data.hotspots,
        mapTouches: tm, deploys: data.deploys, dwellMin: Math.round(dwellMin)
      }
    };
  }

  /* ---------------- 活跃时长心跳（仅可见时累计） ---------------- */
  setInterval(() => { if (!document.hidden) addDwell(5000); }, 5000);

  save();

  window.Store = {
    get round() { return data.round; },
    get anomaly() { return !!data.anomaly; },
    get scans() { return data.scans || 0; },
    get commands() { return data.commands || 0; },
    get eggs() { return data.eggs || 0; },
    get deploys() { return data.deploys || 0; },
    get firstAt() { return data.firstAt; },
    get dwellMs() { return data.dwellMs || 0; },
    touchInspect, countOf, totalInspects,
    touchMap, totalMapTouches, favoriteMap,
    bumpCommands, bumpHotspots, bumpDeploy, bumpEggs,
    unlockAnomaly, bumpScans, once, daysSinceFirst,
    favorite, profile
  };
})();

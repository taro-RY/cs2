/* ============================================================
   STORE — CT-OS 的记忆层
   世界会记住玩家：第几轮部署、每件武器被检视过多少次、
   后门彩蛋是否已解锁、首次接入时间。
   ============================================================ */
(function () {
  const KEY = 'ctos.v1';

  const defaults = () => ({
    round: 0,          // 每次会话（刷新/重开）+1
    inspects: {},      // { ak47: 3, m4a1s: 1, ... }
    anomaly: false,    // DO NOT OPEN 彩蛋解锁态
    scans: 0,          // 被战术扫描命中的次数
    firstAt: Date.now(),
    lastAt: Date.now()
  });

  let data;
  try {
    data = JSON.parse(localStorage.getItem(KEY)) || defaults();
    if (typeof data !== 'object' || data === null) data = defaults();
    data.inspects = data.inspects || {};
  } catch (e) { data = defaults(); }

  // 新一轮部署
  data.round = (data.round || 0) + 1;
  data.lastAt = Date.now();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function touchInspect(id) {
    data.inspects[id] = (data.inspects[id] || 0) + 1;
    save();
    return data.inspects[id];
  }

  function countOf(id) { return data.inspects[id] || 0; }

  function totalInspects() {
    return Object.values(data.inspects).reduce((a, b) => a + b, 0);
  }

  // 返回被检视最多的武器 { id, n }，没有则 null
  function favorite(weapons) {
    let best = null;
    Object.keys(data.inspects).forEach((id) => {
      const n = data.inspects[id];
      if (!best || n > best.n) best = { id, n };
    });
    if (best && weapons && weapons[best.id]) best.name = weapons[best.id].name;
    return best;
  }

  function unlockAnomaly() {
    const was = data.anomaly;
    data.anomaly = true;
    save();
    return !was;
  }

  function bumpScans() { data.scans = (data.scans || 0) + 1; save(); return data.scans; }

  function daysSinceFirst() {
    return Math.max(0, Math.floor((Date.now() - data.firstAt) / 86400000));
  }

  save();

  window.Store = {
    get round() { return data.round; },
    get anomaly() { return !!data.anomaly; },
    get scans() { return data.scans || 0; },
    get firstAt() { return data.firstAt; },
    touchInspect, countOf, totalInspects, favorite,
    unlockAnomaly, bumpScans, daysSinceFirst
  };
})();

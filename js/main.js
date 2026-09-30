/* ============================================================
   MAIN — 模块装配 / 移动菜单
   开机流程由 boot.js 接管（body.booting → body.loaded）
   ============================================================ */
(function () {
  /* ---------- 移动菜单 ---------- */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  burger.addEventListener('click', () => menu.classList.toggle('open'));

  /* ---------- 环境模块 ---------- */
  window.FX.initParticles();
  window.FX.initLiveData();
  window.FX.initEq();
  window.FX.initHeroParallax();
  window.FX.initSurfaceFx();
  window.Spray.init();

  // Store / Boot / Terminal / Inspect / Anomaly / MapOps 均为自启动 IIFE

  /* ============================================================
     OPERATOR PROFILE —— 档案页数据渲染（全部来自真实行为信号）
     ============================================================ */
  const TYPE_NOTES = {
    'AGGRESSIVE ENTRY': '操作节奏快、扫描频繁、装备研究直接 —— 系统判定你是第一身位突入位。',
    'TACTICAL ANALYST': '大量使用指挥台、研读部位情报与地图节点 —— 你在开枪之前先完成计算。',
    'PATIENT MARKSMAN': '停留时间长、动作克制 —— 你是等对手先露身位的人。'
  };

  function tweenNum(el, target) {
    const cur = parseInt(el.textContent, 10) || 0;
    if (cur === target) { el.textContent = target; return; }
    const t0 = performance.now(), dur = 650, from = cur;
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function setBar(id, valId, v) {
    const bar = document.getElementById(id);
    const num = document.getElementById(valId);
    if (bar) bar.style.width = v + '%';
    if (num) num.textContent = v;
  }

  function renderProfile() {
    if (!window.Store) return;
    const S = Store, W = window.WEAPONS || {};
    const p = S.profile();
    const sig = p.signals;

    tweenNum(document.getElementById('pfRounds'), sig.round);
    tweenNum(document.getElementById('pfInspects'), sig.inspects);
    tweenNum(document.getElementById('pfScans'), sig.scans);

    const fav = S.favorite(W);
    document.getElementById('pfPrimary').textContent = fav ? fav.name.toUpperCase() : '--';

    document.getElementById('pfType').textContent = p.ready ? p.type : 'UNCLASSIFIED';
    document.getElementById('pfConf').innerHTML = p.ready
      ? 'CONFIDENCE&nbsp;' + p.confidence + '% · ' + p.typeCn
      : 'CONFIDENCE&nbsp;--%';
    setBar('pbEntry', 'pbEntryVal', p.scores.entry);
    setBar('pbTactical', 'pbTacticalVal', p.scores.tactical);
    setBar('pbPatience', 'pbPatienceVal', p.scores.patience);

    document.getElementById('pfNote').textContent =
      p.ready ? (TYPE_NOTES[p.type] || '')
              : '信号不足，系统正在观察你 —— 检视装备、读取部位情报、使用指挥台、快速移动鼠标或进入部署，都会暴露你的作战风格。';

    const status = document.getElementById('pfStatus');
    if (S.anomaly) {
      status.className = 'pc-status pc-status-warn';
      status.textContent = '⚠ ANOMALY ACTIVE // 指挥台输入 recover 查看隐藏档案';
    } else {
      const fm = S.favoriteMap();
      if (fm) {
        status.className = 'pc-status';
        status.textContent = 'PREFERRED STRIKE: DE_' + fm.id.toUpperCase() + '（' + fm.n + ' 次研判）';
      } else status.textContent = '';
    }
  }

  /* ============================================================
     AFTERMATH —— 进入部署页即视为一轮行动完成
     ============================================================ */
  const aftermath = document.getElementById('aftermath');
  function renderAftermath() {
    if (!window.Store || !aftermath) return;
    Store.bumpDeploy();
    const p = Store.profile();
    const fav = Store.favorite(window.WEAPONS || {});
    document.getElementById('amRound').textContent = String(Store.round).padStart(2, '0');
    document.getElementById('amType').textContent = p.ready ? p.type : 'PENDING';
    document.getElementById('amPrimary').textContent = fav ? fav.name.toUpperCase() : 'NONE';
    document.getElementById('amScans').textContent = Store.scans;
    const am = document.getElementById('amAnomaly');
    am.textContent = Store.anomaly ? 'ACTIVE ⚠' : 'NOMINAL';
    am.style.color = Store.anomaly ? '#eb4b4b' : '';
    document.getElementById('amNote').textContent = p.ready
      ? 'SYSTEM NOTE: ' + (TYPE_NOTES[p.type] || '')
      : 'SYSTEM NOTE: 数据不足以生成完整画像 —— 多与系统互动，下一轮见。';
    aftermath.hidden = false;
  }
  const again = document.getElementById('amAgain');
  if (again) again.addEventListener('click', () => location.reload());

  document.addEventListener('scenechange', e => {
    if (e.detail.id === 'scene-manifesto') renderProfile();
    else if (e.detail.id === 'scene-cta') renderAftermath();
  });
})();

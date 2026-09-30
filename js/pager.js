/* ============================================================
   PAGER — 空间运镜状态机
   三层场景常驻 DOM（上/当/下），目标场景预渲染后再运镜，杜绝空白
   切换锁以 transitionend + 兜底超时释放
   ============================================================ */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOVE_MS = reduceMotion ? 40 : 1000;

  const stage = document.getElementById('stage');
  const scenes = [...stage.querySelectorAll('.scene')];
  const N = scenes.length;
  const names = scenes.map(s => s.dataset.name || '');
  const ids = scenes.map(s => s.id);

  const sideLinks = [...document.querySelectorAll('#sideRail a')];
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  const shIndex = document.getElementById('shIndex');
  const shName = document.getElementById('shName');
  const progress = document.getElementById('progress');
  const hint = document.getElementById('pagerHint');

  let current = 0;
  let locked = false;
  let wheelAcc = 0;
  let wheelTimer = 0;

  // 开机终端 / 指挥台 / 武器检视 / 异常故障期间，一切空间切换输入冻结
  function blocked() {
    return document.body.classList.contains('booting') ||
           document.body.classList.contains('pal-open') ||
           document.body.classList.contains('insp-open') ||
           document.body.classList.contains('rec-open') ||
           document.body.classList.contains('glitching');
  }

  /* ---------- 状态落位 ---------- */
  function setStates(idx) {
    scenes.forEach((s, i) => {
      s.dataset.state = i < idx ? 'prev' : i > idx ? 'next' : 'active';
    });
  }

  function updateChrome(idx, dir) {
    sideLinks.forEach((a, i) => a.classList.toggle('active', i === idx));
    navLinks.forEach((a, i) => a.classList.toggle('current', i === idx));
    shIndex.textContent = String(idx + 1).padStart(2, '0');
    shName.textContent = names[idx];
    progress.style.setProperty('--p', ((idx + 1) / N * 100) + '%');
    history.replaceState(null, '', '#' + ids[idx]);
  }

  /* ---------- 电影黑场条 ---------- */
  function playCinebars() {
    if (reduceMotion) return;
    stage.classList.add('switching');
    stage.classList.remove('retract');
    setTimeout(() => stage.classList.add('retract'), 380);
  }
  function stopCinebars() {
    stage.classList.remove('switching', 'retract');
  }

  /* ---------- 核心切换 ---------- */
  function goTo(target, opts = {}) {
    target = Math.max(0, Math.min(N - 1, target));
    if (locked || target === current) {
      if (target === current) updateChrome(target);
      return;
    }
    const dir = target > current ? 'fwd' : 'back';
    locked = true;
    stage.dataset.dir = dir;
    playCinebars();

    const curScene = scenes[current];
    const nextScene = scenes[target];

    // 目标场景从当前休息位（prev/next）下一帧转为 active，形成运镜
    requestAnimationFrame(() => {
      curScene.dataset.state = dir === 'fwd' ? 'prev' : 'next';
      nextScene.dataset.state = 'active';
      if (dir === 'fwd') {
        scenes.forEach((s, i) => { if (i > target) s.dataset.state = 'next'; if (i < target && s !== curScene) s.dataset.state = 'prev'; });
      } else {
        scenes.forEach((s, i) => { if (i < target) s.dataset.state = 'prev'; if (i > target && s !== curScene) s.dataset.state = 'next'; });
      }
    });

    current = target;
    updateChrome(target, dir);

    document.dispatchEvent(new CustomEvent('scenechange', { detail: { id: ids[target], index: target, dir } }));
    if (window.FX) window.FX.onScene(ids[target]);

    hint.classList.add('hide');

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      locked = false;
      stopCinebars();
      nextScene.removeEventListener('transitionend', onEnd);
    };
    const onEnd = (e) => { if (e.propertyName === 'transform') release(); };
    nextScene.addEventListener('transitionend', onEnd);
    setTimeout(release, MOVE_MS + 180);
  }

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  /* ---------- 滚轮：先让可滚动的场景内部消费 ---------- */
  function innerCanScroll(el, delta) {
    if (!el) return false;
    if (delta > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 3;
    return el.scrollTop > 3;
  }
  addEventListener('wheel', (e) => {
    if (locked || blocked()) return;
    // 战术地图板内的滚轮用于缩放，绝不翻页
    const onMapBoard = e.composedPath().some(el => el && (el.id === 'mapStage' || el.id === 'mapCanvas'));
    if (onMapBoard) return;
    const scrollHost = e.composedPath().find(el => el.dataset && el.dataset.scroll !== undefined);
    if (innerCanScroll(scrollHost, e.deltaY)) return; // 交给内部滚动
    if (Math.abs(e.deltaY) < 4) return;

    wheelAcc += e.deltaY;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelAcc = 0; }, 160);
    if (Math.abs(wheelAcc) > 28) {
      const dir = wheelAcc > 0 ? 1 : -1;
      wheelAcc = 0;
      goTo(current + dir);
    }
  }, { passive: true });

  /* ---------- 键盘 ---------- */
  addEventListener('keydown', (e) => {
    if (blocked()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); goTo(0); }
    else if (k === 'End') { e.preventDefault(); goTo(N - 1); }
  });

  /* ---------- 触摸 / 触摸笔：一次手势只触发一次 ---------- */
  let tx = 0, ty = 0, touchHandled = false;
  addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    tx = t.clientX; ty = t.clientY; touchHandled = false;
  }, { passive: true });
  addEventListener('touchend', (e) => {
    if (locked || blocked() || touchHandled) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 56) return;

    // 内部可滚动容器：沿滑动方向仍可滚动时，把手势交给原生滚动
    const scrollHost = e.composedPath().find(el => el.dataset && el.dataset.scroll !== undefined);
    if (scrollHost) {
      const canDown = scrollHost.scrollTop + scrollHost.clientHeight < scrollHost.scrollHeight - 3;
      const canUp = scrollHost.scrollTop > 3;
      if (dy < 0 && canDown) return;
      if (dy > 0 && canUp) return;
    }
    // 在喷涂墙上滑动 → 手势全部留给喷涂互动
    const onSpray = e.composedPath().some(el => el.id === 'sprayCanvas');
    if (onSpray) return;
    // 在战术地图板上滑动 → 用于平移地图
    const onMapBoard = e.composedPath().some(el => el && (el.id === 'mapStage' || el.id === 'mapCanvas'));
    if (onMapBoard) return;

    touchHandled = true;
    if (Math.abs(dy) > Math.abs(dx)) dy < 0 ? next() : prev();
    else dx < 0 ? next() : prev();
  }, { passive: true });

  /* ---------- 所有 data-goto 链接 / 按钮 ---------- */
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-goto]');
    if (!trigger) return;
    e.preventDefault();
    const i = +trigger.dataset.goto;
    if (!Number.isNaN(i)) goTo(i);
    document.getElementById('mobileMenu').classList.remove('open');
  });

  document.getElementById('pgUp').addEventListener('click', prev);
  document.getElementById('pgDown').addEventListener('click', next);

  /* ---------- 旧版地图卡片轨道已由战术地图板（mapos.js）取代 ---------- */

  /* ---------- 初始化（支持 hash 直达） ---------- */
  const hash = location.hash.replace('#', '');
  const startIdx = Math.max(0, ids.indexOf(hash));
  setStates(startIdx);
  current = startIdx;
  updateChrome(current);
  document.dispatchEvent(new CustomEvent('scenechange', { detail: { id: ids[current], index: current, dir: 'fwd' } }));
  if (window.FX) window.FX.onScene(ids[current]);

  window.Pager = { goTo, next, prev };
})();

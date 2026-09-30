/* ============================================================
   ANOMALY — 异常机制
   1. [ DO NOT OPEN ]：UNAUTHORIZED ACCESS → connection lost
      → reconnecting → 后门解锁（Store 记忆，二次触发文案变化）
   2. 鼠标快速移动 → 战术扫描线短暂锁定
   3. 全局 toast：window.toast(msg)
   ============================================================ */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = document.getElementById('glitchFx');
  const box = document.getElementById('glBox');
  const scanFx = document.getElementById('scanFx');
  const toasts = document.getElementById('toasts');
  const btn = document.getElementById('doNotOpen');

  /* ---------------- TOAST ---------------- */
  function toast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' t-' + type : '');
    t.innerHTML = '<span class="toast-dot"></span>' + msg;
    toasts.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 420);
    }, 2600);
  }
  window.toast = toast;

  /* ---------------- DO NOT OPEN ---------------- */
  let running = false;
  let timers = [];
  const at = (fn, ms) => timers.push(setTimeout(fn, ms));
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  // 首次解锁：更新按钮并广播泄漏事件（检视器 / 地图板等订阅）
  function markUnlocked() {
    if (!window.Store) return;
    const fresh = Store.unlockAnomaly();
    if (!fresh) return;
    btn.textContent = '[ BACKDOOR ACTIVE ]';
    btn.classList.add('unlocked');
    document.dispatchEvent(new CustomEvent('ctos:anomaly'));
  }

  const hex = () => Array.from({ length: 6 }, () =>
    '0x' + Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')).join('  ');

  function stage(html, cls) {
    box.className = 'gl-box' + (cls ? ' ' + cls : '');
    box.innerHTML = html;
  }

  function run() {
    if (running) return;
    running = true;
    clearTimers();
    document.body.classList.add('glitching');
    fx.classList.add('on');
    fx.setAttribute('aria-hidden', 'false');

    const unlocked = window.Store && window.Store.anomaly;

    if (unlocked) {
      // 已解锁：短序列，后门仍然有效
      stage('<p class="gl-tag">CT-OS // BACKDOOR CHANNEL</p>' +
        '<h2 class="gl-title">连接已建立</h2>' +
        '<p class="gl-sub">你找到了不该存在的门。它一直为你开着。</p>' +
        '<p class="gl-meta">[ 点击任意处断开 ]</p>', 'gl-ok');
    } else {
      stage('<p class="gl-tag">⚠ SECURITY BREACH</p>' +
        '<h2 class="gl-title">UNAUTHORIZED<br>ACCESS</h2>' +
        '<p class="gl-hex">' + hex() + '</p>' +
        '<p class="gl-meta">正在追踪信号源 …</p>', 'gl-danger');

      at(() => stage('<p class="gl-tag">CT-OS // FIREWALL</p>' +
        '<h2 class="gl-title">SIGNAL<br>INTERCEPTED</h2>' +
        '<p class="gl-hex">' + hex() + '</p>' +
        '<p class="gl-meta">数据包已捕获 — 正在分析 …</p>', 'gl-warn'), 1600);

      at(() => {
        document.body.classList.add('signal-lost');
        stage('<p class="gl-tag">◉ CONNECTION</p>' +
          '<h2 class="gl-title">CONNECTION<br>LOST</h2>' +
          '<div class="gl-noise"></div>' +
          '<p class="gl-meta">与主控台的连接已中断</p>', 'gl-danger');
      }, 3200);

      at(() => {
        document.body.classList.remove('signal-lost');
        stage('<p class="gl-tag">◉ RECONNECT</p>' +
          '<h2 class="gl-title">RECONNECTING<span class="blink">…</span></h2>' +
          '<div class="gl-bar"><i></i></div>', 'gl-warn');
      }, 4700);

      at(() => {
        markUnlocked();
        stage('<p class="gl-tag">CT-OS // HIDDEN CHANNEL</p>' +
          '<h2 class="gl-title gl-gold">BACKDOOR<br>ESTABLISHED</h2>' +
          '<p class="gl-sub">欢迎回来，干员。隐藏频道已解锁，系统会记得你。</p>' +
          '<p class="gl-meta">[ 点击任意处返回 ]</p>', 'gl-ok');
      }, 6600);
    }

    // 点击：流程中 → 跳到结局；结束 → 关闭
    const onClick = () => {
      const done = box.classList.contains('gl-ok');
      if (!done && !unlocked) {
        // 直接进入解锁结局
        clearTimers();
        document.body.classList.remove('signal-lost');
        markUnlocked();
        stage('<p class="gl-tag">CT-OS // HIDDEN CHANNEL</p>' +
          '<h2 class="gl-title gl-gold">BACKDOOR<br>ESTABLISHED</h2>' +
          '<p class="gl-sub">欢迎回来，干员。隐藏频道已解锁，系统会记得你。</p>' +
          '<p class="gl-meta">[ 点击任意处返回 ]</p>', 'gl-ok');
      } else {
        fx.removeEventListener('click', onClick);
        fx.classList.remove('on');
        fx.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('glitching');
        running = false;
        toast('ANOMALY LOGGED // 异常已记录', 'warn');
      }
    };
    at(() => fx.addEventListener('click', onClick), 60);
  }

  btn.addEventListener('click', run);

  // 已解锁状态在刷新后恢复按钮文案
  if (window.Store && window.Store.anomaly) {
    btn.textContent = '[ BACKDOOR ACTIVE ]';
    btn.classList.add('unlocked');
  }

  /* ---------------- 快速移动 → 战术扫描 ---------------- */
  let lastX = 0, lastY = 0, lastT = 0, scanCooldown = 0;
  addEventListener('mousemove', (e) => {
    const now = performance.now();
    const dt = now - lastT;
    if (lastT && dt < 120 && now > scanCooldown) {
      const speed = Math.hypot(e.clientX - lastX, e.clientY - lastY) / dt * 1000; // px/s
      if (speed > 2600) {
        scanCooldown = now + 3200;
        triggerScan(e.clientY);
      }
    }
    lastX = e.clientX; lastY = e.clientY; lastT = now;
  }, { passive: true });

  let scanTimer = 0;
  function triggerScan(y) {
    if (reduceMotion) return;
    clearTimeout(scanTimer);
    scanFx.style.top = y + 'px';
    scanFx.classList.add('on');
    const n = window.Store ? Store.bumpScans() : 0;
    observeScans(n);
    scanTimer = setTimeout(() => scanFx.classList.remove('on'), 950);
  }

  /* 扫描观察层：动作 → 记录 → 推断。每条提示只出现一次。 */
  function observeScans(n) {
    if (!window.Store) return;
    if (n === 3 && Store.once('scan3')) {
      setTimeout(() => toast('TACTICAL SCAN // 已记录 3 次扫描 — 移动模式分析中', 'warn'), 700);
    } else if (n === 6 && Store.once('scan6')) {
      setTimeout(() => toast('MOVEMENT PATTERN: ERRATIC — 你在测试这个系统吗？', 'warn'), 700);
    } else if (n === 10 && Store.once('scan10')) {
      setTimeout(() => toast('BEHAVIORAL ANALYSIS // OPERATOR: IMPATIENT · CONFIDENCE 82%', 'err'), 700);
    }
  }

  /* ---------------- RECOVER // 隐藏档案页（ARG 终点） ---------------- */
  const rec = document.getElementById('recover');
  function openRecover() {
    if (!rec) return;
    const ts = document.getElementById('recTs');
    const rd = document.getElementById('recRound');
    if (ts) ts.textContent = '[' + new Date().toLocaleTimeString('zh-CN') + ']';
    if (rd) rd.textContent = String(window.Store ? Store.round : 1).padStart(2, '0');
    rec.classList.add('open');
    rec.setAttribute('aria-hidden', 'false');
    document.body.classList.add('rec-open');
  }
  function closeRecover() {
    if (!rec) return;
    rec.classList.remove('open');
    rec.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('rec-open');
  }
  if (rec) {
    rec.querySelector('[data-rec-close]').addEventListener('click', closeRecover);
    document.getElementById('recClose').addEventListener('click', closeRecover);
    document.getElementById('recSeal').addEventListener('click', closeRecover);
  }
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rec && rec.classList.contains('open')) {
      e.preventDefault();
      closeRecover();
    }
  });

  window.Anomaly = { run, toast, triggerScan, recover: openRecover };
})();

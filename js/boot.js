/* ============================================================
   BOOT — CT-OS 开机作战终端
   逐行启动日志 → 进度条 → SYSTEM ONLINE / PLAYER DETECTED
   → 四项行动入口（鼠标 / 数字键 1-4）。点击任意处可跳过。
   ============================================================ */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;
  const boot = document.getElementById('boot');
  const logEl = document.getElementById('bootLog');
  const menuEl = document.getElementById('bootMenu');
  const idEl = document.getElementById('bootId');
  const barEl = document.getElementById('bootBar');

  const round = String((window.Store && window.Store.round) || 1).padStart(2, '0');
  const isReturn = window.Store && Store.round > 1;

  const LINES = [
    'CT-OS v2.6.0 — TACTICAL OPERATING SYSTEM',
    '────────────────────────────────────────',
    '> mounting /dev/source2 .......... <ok>OK</ok>',
    '> linking sub-tick netcode ....... <ok>OK</ok>',
    '> calibrating volumetric smoke ... <ok>OK</ok>',
    '> sync active duty group ......... <ok>OK</ok>',
    '> biometric handshake ............ <ok>OK</ok>',
    '> loading operator profile ....... <ok>OK</ok>'
  ];
  if (window.Store && Store.anomaly) {
    LINES.push('> unknown handshake ............. <warn>ACCEPTED</warn>');
  }
  LINES.push(
    '',
    '<sys>SYSTEM ONLINE</sys>',
    '<sys>' + (isReturn ? 'WELCOME BACK — ROUND ' : 'PLAYER DETECTED — ROUND ') + round + '</sys>'
  );

  let done = false;
  let menuShown = false;
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function renderLine(html) {
    const p = document.createElement('p');
    p.className = 'bl-line';
    p.innerHTML = html
      .replace(/<ok>/g, '<i class="bl-ok">').replace(/<\/ok>/g, '</i>')
      .replace(/<warn>/g, '<i class="bl-warn">').replace(/<\/warn>/g, '</i>')
      .replace(/<sys>/g, '<i class="bl-sys">').replace(/<\/sys>/g, '</i>');
    logEl.appendChild(p);
    return p;
  }

  // 系统根据历史行为识别玩家：首次 / 回访 / 有明确主武器偏好
  function identifyLine() {
    if (!window.Store || !isReturn) {
      return 'ROUND <b>' + round + '</b> // OPERATOR IDENTIFIED // 选择你的行动';
    }
    const fav = Store.favorite(window.WEAPONS || null);
    let line = 'WELCOME BACK // ROUND <b>' + round + '</b>';
    if (fav && fav.n >= 3 && fav.name) {
      line += ' // PRIMARY WEAPON: <b>' + fav.name + '</b>';
      line += '<span class="bid-note">你最近 ' + fav.n + ' 次都选择了它</span>';
    } else {
      line += ' // OPERATOR IDENTIFIED // 选择你的行动';
    }
    if (Store.anomaly) line += '<span class="bid-warn">// BACKDOOR ACTIVE</span>';
    return line;
  }

  function showMenu() {
    if (menuShown) return;
    menuShown = true;
    idEl.innerHTML = identifyLine();
    menuEl.hidden = false;
    // 重启动画
    menuEl.classList.remove('in');
    void menuEl.offsetWidth;
    menuEl.classList.add('in');
  }

  function play() {
    if (reduceMotion) { fastForward(); return; }
    let acc = 0;
    LINES.forEach((line, i) => {
      acc += 70 + Math.random() * 150;
      later(() => {
        renderLine(line);
        const pct = Math.round((i + 1) / LINES.length * 100);
        barEl.style.width = pct + '%';
        logEl.scrollTop = logEl.scrollHeight;
      }, acc);
    });
    later(showMenu, acc + 420);
  }

  function fastForward() {
    if (menuShown) return;
    timers.forEach(clearTimeout);
    timers = [];
    logEl.innerHTML = '';
    LINES.forEach(renderLine);
    barEl.style.width = '100%';
    showMenu();
  }

  function finish(target) {
    if (done) {
      if (target != null && window.Pager) window.Pager.goTo(target);
      return;
    }
    done = true;
    fastForward();
    body.classList.remove('booting');
    body.classList.add('loaded');
    boot.classList.add('leave');
    later(() => { boot.hidden = true; }, 650);
    document.dispatchEvent(new CustomEvent('ctos:ready'));
    if (target != null && window.Pager) window.Pager.goTo(target);
  }

  /* ---------- 行动入口 ---------- */
  boot.querySelectorAll('.bm-item').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      finish(+btn.dataset.go);
    });
  });

  /* ---------- 数字键 1-4：日志阶段直接快进并部署 ---------- */
  const keyMap = { '1': 0, '2': 2, '3': 3, '4': 4 };
  addEventListener('keydown', (e) => {
    if (done) return;
    if (e.key in keyMap) {
      e.preventDefault();
      finish(keyMap[e.key]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!menuShown) fastForward();
      else finish(0);
    }
  });

  // 点击终端任意空白处：跳过日志（菜单出现后点击空白不关闭）
  boot.addEventListener('click', () => { if (!menuShown) fastForward(); });

  play();

  window.Boot = { finish, skip: fastForward };
})();

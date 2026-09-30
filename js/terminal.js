/* ============================================================
   TERMINAL — Ctrl+K 指挥台（网页是操作系统，命令即操作）
   help / inspect <枪> / open <地图> / stats / whoami /
   compare <a> <b> / deploy / hack(彩蛋) / clear
   ============================================================ */
(function () {
  const palette = document.getElementById('palette');
  const input = document.getElementById('palInput');
  const out = document.getElementById('palOut');
  const list = document.getElementById('palList');

  /* ---------------- 命令定义 ---------------- */
  const CMDS = [
    { c: 'help', a: '', d: '列出全部指令' },
    { c: 'inspect', a: '<ak47 | m4a1s | m4a4 | molotov>', d: '进入武器战术检视' },
    { c: 'open', a: '<inferno | mirage | nuke>', d: '部署至指定战场' },
    { c: 'stats', a: '', d: '跳转作战档案' },
    { c: 'whoami', a: '', d: '读取你的操作员档案' },
    { c: 'compare', a: '<武器A> <武器B>', d: '对比两件武器' },
    { c: 'deploy', a: '', d: '立即参战' },
    { c: 'hack', a: '', d: '？未知程序，不建议运行' },
    { c: 'recover', a: '', d: '修复损坏的操作员档案', locked: true },
    { c: 'clear', a: '', d: '清空输出' }
  ];
  const sceneByMap = { inferno: 4, mirage: 4, nuke: 4 };

  let openState = false;
  let sel = 0;
  let matches = [];

  /* ---------------- 输出 ---------------- */
  function print(text, cls) {
    const p = document.createElement('p');
    p.className = 'pal-line' + (cls ? ' ' + cls : '');
    p.innerHTML = text;
    out.appendChild(p);
    out.scrollTop = out.scrollHeight;
  }
  function printLines(arr) { arr.forEach(l => print(l.text, l.cls)); }
  function banner() {
    printLines([
      { text: 'CT-OS COMMAND LINE v2.6.0 — 已连接', cls: 'pal-sys' },
      { text: '输入 <b>help</b> 获取指令列表。', cls: 'pal-dim' }
    ]);
  }

  /* ---------------- 补全列表 ---------------- */
  function refreshList() {
    // 注意：必须用未 trim 的原值判断"是否已进入参数阶段"
    const raw = input.value.toLowerCase();
    const q = raw.trim();
    if (raw.indexOf(' ') === -1) {
      matches = CMDS.filter(x => !q || x.c.indexOf(q) === 0).map(x => x.c);
    } else {
      // 参数阶段：给出武器/地图提示
      const head = q.split(' ')[0];
      const arg = q.split(' ')[1] || '';
      if (head === 'inspect') matches = Object.keys(window.WEAPONS || {}).filter(w => w.indexOf(arg) === 0);
      else if (head === 'open') matches = Object.keys(sceneByMap).filter(m => m.indexOf(arg) === 0);
      else if (head === 'compare') matches = Object.keys(window.WEAPONS || {}).filter(w => w.indexOf(arg) === 0);
      else matches = [];
    }
    sel = 0;
    list.innerHTML = '';
    if (matches.length) {
      matches.forEach((m, i) => {
        const item = CMDS.find(x => x.c === m);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pal-opt' + (i === 0 ? ' on' : '');
        b.innerHTML = '<b>' + m + '</b>' + (item ? '<em>' + (item.a ? ' ' + item.a + ' ' : '') + '— ' + item.d + '</em>' : '');
        b.addEventListener('mousedown', (e) => { e.preventDefault(); pick(m); });
        list.appendChild(b);
      });
    }
  }
  function pick(m) {
    const raw = input.value;
    input.value = raw.indexOf(' ') === -1 ? m + ' ' : raw.split(' ')[0] + ' ' + m;
    refreshList();
    input.focus();
  }

  /* ---------------- 命令执行 ---------------- */
  function run(raw) {
    const line = raw.trim();
    print('<span class="pal-pr">&gt;</span> ' + line, 'pal-cmd');
    if (!line) return;
    const [cmd, ...args] = line.toLowerCase().split(/\s+/);

    if (cmd === 'clear') { out.innerHTML = ''; return; }

    // 被识别的真实指令计入行为信号（未知指令不计数）
    const knownCmd = CMDS.some(x => x.c === cmd && (!x.locked || (window.Store && Store.anomaly)));
    if (knownCmd && window.Store) Store.bumpCommands();

    if (cmd === 'help') {
      print('AVAILABLE PROGRAMS — CT-OS:', 'pal-sys');
      CMDS.filter(x => !x.locked || (window.Store && Store.anomaly))
        .forEach(x => print('<b>' + x.c + '</b> ' + x.a + ' <em>— ' + x.d + '</em>', x.locked ? 'pal-warn' : 'pal-dim'));
      return;
    }

    if (cmd === 'whoami') {
      const S = window.Store, W = window.WEAPONS || {};
      const p = S.profile();
      print('OPERATOR PROFILE — ROUND ' + String(S.round).padStart(2, '0'), 'pal-sys');
      print('首次接入：' + new Date(S.firstAt).toLocaleString('zh-CN') + '（已服役 ' + S.daysSinceFirst() + ' 天）');
      print('检视 ' + p.signals.inspects + ' · 扫描 ' + p.signals.scans +
            ' · 情报 ' + p.signals.hotspots + ' · 命令 ' + p.signals.commands +
            ' · 地图研判 ' + p.signals.mapTouches + ' · 在线 ' + p.signals.dwellMin + ' 分钟', 'pal-dim');
      const fav = S.favorite(W);
      if (fav) {
        print('PRIMARY WEAPON：<b>' + fav.name + '</b>（已检视 ' + fav.n + ' 次）', fav.n >= 3 ? 'pal-warn' : '');
        if (fav.n >= 3) print('系统认为你正在准备一场比赛。', 'pal-warn');
      } else print('尚无武器检视记录 —— 试试 <b>inspect ak47</b>。', 'pal-dim');
      if (p.ready) {
        print('BEHAVIORAL TYPE：<b>' + p.type + '</b> · ' + p.typeCn +
              '（CONFIDENCE ' + p.confidence + '%）', 'pal-sys');
        print('ENTRY ' + p.scores.entry + ' / TACTICAL ' + p.scores.tactical +
              ' / PATIENCE ' + p.scores.patience, 'pal-dim');
      } else {
        print('BEHAVIORAL TYPE：UNCLASSIFIED —— 信号不足，系统观察中。', 'pal-dim');
      }
      if (S.anomaly) {
        print('⚠ OPERATOR PROFILE CORRUPTED', 'pal-err');
        print('检测到未授权通道，部分身份数据指向 <b>OPERATOR 05</b>。', 'pal-warn');
        print('输入 <b>recover</b> 尝试修复档案。', 'pal-warn');
      } else {
        print('后门状态：未触发', 'pal-dim');
      }
      return;
    }

    if (cmd === 'recover') {
      if (!window.Store || !Store.anomaly) {
        print('NO RECOVERABLE DATA —— 档案完好，没有需要修复的东西。', 'pal-err');
        return;
      }
      print('OPENING CLASSIFIED CHANNEL 05 …', 'pal-warn');
      hide();
      setTimeout(() => { if (window.Anomaly) Anomaly.recover(); }, 320);
      return;
    }

    if (cmd === 'inspect') {
      const w = (window.WEAPONS || {})[args[0]];
      if (!w) { print('ERR: 未知装备代码。可用：ak47 / m4a1s / m4a4 / molotov', 'pal-err'); return; }
      print('LOADING SCHEMATIC — ' + w.name + ' …', 'pal-sys');
      hide();
      setTimeout(() => window.Inspect.open(w.id), 260);
      return;
    }

    if (cmd === 'open') {
      const map = args[0];
      if (!(map in sceneByMap)) { print('ERR: 未知战场。可用：inferno / mirage / nuke', 'pal-err'); return; }
      if (window.Store) Store.touchMap(map);
      print('DEPLOYING TO DE_' + map.toUpperCase() + ' …', 'pal-sys');
      hide();
      setTimeout(() => window.Pager.goTo(sceneByMap[map]), 260);
      return;
    }

    if (cmd === 'stats') { print('PULLING COMBAT RECORDS …', 'pal-sys'); hide(); setTimeout(() => window.Pager.goTo(3), 260); return; }
    if (cmd === 'deploy') { print('READY UP — YOUR MOVE.', 'pal-sys'); hide(); setTimeout(() => window.Pager.goTo(6), 260); return; }
    if (cmd === 'home') { hide(); window.Pager.goTo(0); return; }

    if (cmd === 'compare') {
      const W = window.WEAPONS || {};
      const a = W[args[0]], b = W[args[1]];
      if (!a || !b) { print('用法：compare ak47 m4a4（任选两件武器）', 'pal-err'); return; }
      print('COMPARE // ' + a.name + '  VS  ' + b.name, 'pal-sys');
      a.stats.forEach((s, i) => {
        const v2 = b.stats[i] ? b.stats[i][1] : 0;
        const win = s[1] === v2 ? '＝' : s[1] > v2 ? '▲' : '▽';
        print(s[0] + '：<b>' + s[1] + '</b> vs ' + v2 + ' ' + win);
      });
      print('装备价格：$' + a.price.toLocaleString('en-US') + ' vs $' + b.price.toLocaleString('en-US'), 'pal-dim');
      return;
    }

    if (cmd === 'hack' || cmd === 'launch' || cmd === 'sudo') {
      print('> 初始化未授权连接 …', 'pal-warn');
      print('> 警告：该操作将被记录。', 'pal-warn');
      hide();
      setTimeout(() => { if (window.Anomaly) window.Anomaly.run(); }, 420);
      return;
    }

    print('COMMAND NOT RECOGNIZED: ' + cmd + ' — 输入 help 查看指令', 'pal-err');
  }

  /* ---------------- 开关 ---------------- */
  function show() {
    if (openState) return;
    openState = true;
    palette.classList.add('open');
    palette.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pal-open');
    out.innerHTML = '';
    banner();
    refreshList();
    setTimeout(() => input.focus(), 30);
  }
  function hide() {
    openState = false;
    palette.classList.remove('open');
    palette.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pal-open');
    input.value = '';
    list.innerHTML = '';
    input.blur();
  }
  const toggle = () => openState ? hide() : show();

  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (document.body.classList.contains('insp-open')) window.Inspect.close();
      toggle();
    } else if (e.key === 'Escape' && openState) {
      e.preventDefault();
      hide();
    }
  });

  input.addEventListener('input', refreshList);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); run(input.value); input.value = ''; refreshList(); }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (matches.length) { sel = (sel + 1) % matches.length; updateOptSel(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (matches.length) { sel = (sel - 1 + matches.length) % matches.length; updateOptSel(); }
    } else if (e.key === 'Tab' && matches.length) {
      e.preventDefault(); pick(matches[sel]);
    }
  });
  function updateOptSel() {
    [...list.children].forEach((c, i) => c.classList.toggle('on', i === sel));
  }

  palette.querySelector('[data-pal-close]').addEventListener('click', hide);
  document.getElementById('navConsole').addEventListener('click', show);
  document.getElementById('mobileConsole').addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.remove('open');
    show();
  });

  window.Terminal = { show, hide, toggle };
})();

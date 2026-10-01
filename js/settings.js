/* ============================================================
   SETTINGS — 全局样式开关（仿 artdesign-pro 的 settingStore +
   右侧设置抽屉：集中默认配置 / localStorage 持久化 / 变更即应用）

   机制：
   - schema 是唯一事实源（DEFAULT_SETTINGS），Store.initSettings 补齐缺漏键
   - 每个布尔开关映射到 <body data-opt-<key>="1|0">，纯视觉层由 CSS 接管
   - 带渲染循环的层（orbs / particles / scanfx）订阅 ctos:setting 事件做逻辑门控
   ============================================================ */
(function () {
  /* ---------------- 默认配置（SETTING_DEFAULT_CONFIG） ---------------- */
  const GROUPS = [
    {
      id: 'ambient',
      label: '氛围层 // AMBIENT LAYERS',
      items: [
        { key: 'orbs',      cn: '漂浮彩蛋球', en: 'FLOATING ORBS',  def: true,
          desc: '全屏漂浮的金色能量球，可点爆触发战术黑话' },
        { key: 'particles', cn: '战场微尘',   en: 'AMBIENT DUST',   def: true,
          desc: '背景中缓慢上浮的金色战场粒子' },
        { key: 'grain',     cn: '胶片颗粒',   en: 'FILM GRAIN',     def: true,
          desc: '全屏胶片噪点质感' },
        { key: 'vignette',  cn: '屏幕暗角',   en: 'VIGNETTE',       def: true,
          desc: '边缘压暗的电影感暗角' }
      ]
    },
    {
      id: 'tactical',
      label: '战术界面 // TACTICAL INTERFACE',
      items: [
        { key: 'crosshair', cn: '战术准星', en: 'CROSSHAIR CURSOR', def: true,
          desc: '自定义准星鼠标（仅鼠标等精细指针设备）' },
        { key: 'scanfx',    cn: '战术扫描', en: 'TACTICAL SCAN',    def: true,
          desc: '快速移动时的扫描线锁定与移动记录' }
      ]
    }
  ];
  const ALL_ITEMS = GROUPS.reduce((a, g) => a.concat(g.items), []);
  const DEFAULTS = ALL_ITEMS.reduce((m, it) => { m[it.key] = it.def; return m; }, {});

  if (window.Store) Store.initSettings(DEFAULTS);
  const isOn = (key) => window.Store ? !!Store.getSetting(key, DEFAULTS[key]) : !!DEFAULTS[key];

  /* ---------------- 应用层：写入 body data-opt-* ---------------- */
  function attrName(key) { return 'opt' + key.charAt(0).toUpperCase() + key.slice(1); }
  function apply(key, value) {
    document.body.dataset[attrName(key)] = value ? '1' : '0';
  }
  function applyAll() { ALL_ITEMS.forEach((it) => apply(it.key, isOn(it.key))); }

  /* ---------------- 抽屉面板 ---------------- */
  const root = document.getElementById('settings');
  const body = root ? root.querySelector('#setBody') : null;

  function switchRow(it) {
    const on = isOn(it.key);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'set-row';
    row.setAttribute('role', 'switch');
    row.setAttribute('aria-checked', on ? 'true' : 'false');
    row.dataset.key = it.key;
    row.innerHTML =
      '<span class="sr-text">' +
        '<b>' + it.cn + '</b>' +
        '<em>' + it.en + '</em>' +
        '<span class="set-desc">' + it.desc + '</span>' +
      '</span>' +
      '<span class="set-switch' + (on ? ' on' : '') + '"><i></i></span>';
    return row;
  }

  function render() {
    if (!body) return;
    body.innerHTML = '';
    GROUPS.forEach((g) => {
      const sec = document.createElement('section');
      sec.className = 'set-group';
      const label = document.createElement('p');
      label.className = 'set-group-label';
      label.textContent = g.label;
      sec.appendChild(label);
      g.items.forEach((it) => sec.appendChild(switchRow(it)));
      body.appendChild(sec);
    });
  }

  // 同步单个开关的视觉态（不重建 DOM）
  function syncRow(key, value) {
    const row = root && root.querySelector('.set-row[data-key="' + key + '"]');
    if (!row) return;
    row.setAttribute('aria-checked', value ? 'true' : 'false');
    const sw = row.querySelector('.set-switch');
    if (sw) sw.classList.toggle('on', !!value);
  }

  function open() {
    if (!root) return;
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('settings-open');
  }
  function close() {
    if (!root) return;
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('settings-open');
  }
  const isOpen = () => !!(root && root.classList.contains('open'));
  function toggle() { isOpen() ? close() : open(); }

  /* ---------------- 事件装配 ---------------- */
  document.addEventListener('click', (e) => {
    const opener = e.target.closest && e.target.closest('#navSettings,#mobileSettings');
    if (opener) { e.preventDefault(); open(); return; }
    if (isOpen() && e.target.closest && e.target.closest('[data-set-close]')) close();
  });

  // 开关切换（事件委托，动态渲染也行）
  if (body) body.addEventListener('click', (e) => {
    const row = e.target.closest('.set-row');
    if (!row || !window.Store) return;
    Store.setSetting(row.dataset.key, !isOn(row.dataset.key));
  });

  // 统一入口：任何来源的设置变更 → body 属性 + 开关态
  document.addEventListener('ctos:setting', (e) => {
    if (!e.detail || !e.detail.key) return;
    apply(e.detail.key, !!e.detail.value);
    syncRow(e.detail.key, !!e.detail.value);
  });

  // 恢复默认
  const resetBtn = root && root.querySelector('#setReset');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (!window.Store) return;
    Store.resetSettings(DEFAULTS); // 逐条广播，上面的监听会刷新 body 属性与开关态
    if (window.toast) toast('PREFERENCES RESET // 已恢复默认配置', 'ok');
  });

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) { e.preventDefault(); close(); }
  });

  /* ---------------- 启动：先应用（避免首帧闪烁），再渲染面板 ---------------- */
  applyAll();
  render();

  window.Settings = { open, close, toggle, isOpen, isOn };
})();

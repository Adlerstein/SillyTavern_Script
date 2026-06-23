import { createLoreBookStore } from 'https://cdn.jsdelivr.net/gh/Adlerstein/SillyTavern_Script@1bbded69af6fa712c5d376821c549ccf7d1d776d/lore-book-controller-store.js?v=20260614-4';

// Load from a card script with: import '/scripts/custom/lore-book-controller.js?v=20260614-4';
(function initLoreBookController() {
    const hostWindow = window.parent ?? window;
    const hostDocument = hostWindow.document;
    const scriptId = typeof globalThis.getScriptId === 'function' ? globalThis.getScriptId() : 'lore-book-controller-local';
    const cleanupKey = '__loreBookControllerCleanup';

    hostWindow[cleanupKey]?.();
    hostDocument.querySelectorAll(`[data-lbc-owner="${scriptId}"]`).forEach(node => node.remove());

    const events = new hostWindow.AbortController();
    const eventOptions = { signal: events.signal };
    const BOOK_FILE = '绿茵好莱坞';
    const getContext = () => hostWindow.SillyTavern?.getContext?.() ?? globalThis.SillyTavern?.getContext?.();
    const store = createLoreBookStore({
        bookName: BOOK_FILE,
        loadWorldInfo: name => {
            const context = getContext();
            if (typeof context?.loadWorldInfo !== 'function') {
                throw new Error('SillyTavern.getContext().loadWorldInfo is unavailable');
            }
            return context.loadWorldInfo(name);
        },
        saveWorldInfo: (...args) => {
            const context = getContext();
            if (typeof context?.saveWorldInfo !== 'function') {
                throw new Error('SillyTavern.getContext().saveWorldInfo is unavailable');
            }
            return context.saveWorldInfo(...args);
        },
    });

    const BOOK_SECTIONS = [
        {
            id: 'overview', label: '世界总览', icon: '览',
            color: '#38bdf8', accent: 'rgba(56,189,248,',
            overview: null,
            chapters: [
                { uid: '16', label: '时间线总览' },
                { uid: '17', label: '豪门简介总览' },
                { uid: '18', label: '流行战术简介' },
                { uid: '19', label: '球员位置简介' }
            ]
        },
        {
            id: 'timeline', label: '年份大事记', icon: '年',
            color: '#22c55e', accent: 'rgba(34,197,94,',
            overview: null,
            chapters: [
                { uid: '13', label: '2004年足球大事记' },
                { uid: '14', label: '2005年足球大事记' },
                { uid: '15', label: '2006年足球大事记' }
            ]
        }
    ];

    const DLC_SECTIONS = [];

    const CHARACTER_SECTIONS = [];

    const pages = {
        story: { label: '时间线', sections: BOOK_SECTIONS },
    };

    const css = `
        .lbc-root, .lbc-root * { box-sizing: border-box; }
        .lbc-root {
            --lbc-bg: var(--SmartThemeBlurTintColor, #20242b);
            --lbc-text: var(--SmartThemeBodyColor, #f1f3f5);
            --lbc-surface: color-mix(in srgb, var(--lbc-bg) 92%, var(--lbc-text) 8%);
            --lbc-surface-hover: color-mix(in srgb, var(--lbc-bg) 84%, var(--lbc-text) 16%);
            --lbc-border: color-mix(in srgb, var(--lbc-bg) 72%, var(--lbc-text) 28%);
            --lbc-muted: color-mix(in srgb, var(--lbc-text) 65%, var(--lbc-bg) 35%);
            --lbc-switch-off: color-mix(in srgb, var(--lbc-bg) 70%, var(--lbc-text) 30%);
            --lbc-accent: var(--SmartThemeQuoteColor, #79a7ff);
            position: fixed;
            inset: 0;
            z-index: 2147483000;
            pointer-events: none;
            font: 14px/1.45 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
            color: var(--lbc-text);
        }
        .lbc-launcher {
            position: fixed;
            right: 24px;
            bottom: 28px;
            width: 54px;
            height: 54px;
            display: grid;
            place-items: center;
            border: 1px solid var(--lbc-border);
            border-radius: 50%;
            background: var(--lbc-bg);
            color: var(--lbc-text);
            box-shadow: 0 8px 26px rgb(0 0 0 / 28%);
            cursor: grab;
            pointer-events: auto;
            touch-action: none;
            backdrop-filter: blur(14px);
            z-index: 2147483647;
            visibility: visible !important;
            opacity: 1 !important;
        }
        .lbc-launcher:active { cursor: grabbing; }
        .lbc-launcher svg { width: 24px; height: 24px; pointer-events: none; }
        .lbc-panel {
            position: fixed;
            width: min(440px, calc(100vw - 24px));
            max-height: min(680px, calc(100vh - 24px));
            display: grid;
            grid-template-rows: auto auto minmax(0, 1fr) auto;
            overflow: hidden;
            border: 1px solid var(--lbc-border);
            border-radius: 16px;
            background: var(--lbc-bg);
            box-shadow: 0 18px 60px rgb(0 0 0 / 38%);
            pointer-events: auto;
            backdrop-filter: blur(18px);
        }
        .lbc-panel[hidden] { display: none; }
        .lbc-header, .lbc-footer {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
        }
        .lbc-header { border-bottom: 1px solid var(--lbc-border); }
        .lbc-title { min-width: 0; flex: 1; }
        .lbc-title strong, .lbc-title span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lbc-title span, .lbc-footer { color: var(--lbc-muted); font-size: 12px; }
        .lbc-icon-button, .lbc-tab, .lbc-action, .lbc-switch, .lbc-group-head {
            border: 0;
            color: inherit;
            font: inherit;
            cursor: pointer;
        }
        .lbc-icon-button {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: transparent;
            font-size: 20px;
        }
        .lbc-icon-button:hover, .lbc-tab:hover, .lbc-action:hover, .lbc-row:hover { background: var(--lbc-surface-hover); }
        .lbc-tabs {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
            padding: 8px;
            border-bottom: 1px solid var(--lbc-border);
        }
        .lbc-tab {
            min-height: 40px;
            border-radius: 10px;
            background: transparent;
            color: var(--lbc-muted);
        }
        .lbc-tab[aria-selected="true"] { background: var(--lbc-surface); color: var(--lbc-text); font-weight: 650; }
        .lbc-pages { min-height: 220px; overflow: auto; padding: 8px; overscroll-behavior: contain; }
        .lbc-page[hidden] { display: none; }
        .lbc-group { margin-bottom: 8px; overflow: hidden; border: 1px solid var(--lbc-border); border-radius: 12px; background: var(--lbc-surface); }
        .lbc-group-head {
            width: 100%;
            min-height: 52px;
            display: grid;
            grid-template-columns: 34px minmax(0, 1fr) auto auto;
            align-items: center;
            gap: 9px;
            padding: 8px 10px;
            background: transparent;
            text-align: left;
        }
        .lbc-group-icon {
            width: 30px;
            height: 30px;
            display: grid;
            place-items: center;
            border-radius: 9px;
            background: color-mix(in srgb, var(--group-color) 18%, transparent);
            color: var(--group-color);
            font-weight: 700;
        }
        .lbc-count { color: var(--lbc-muted); font-size: 12px; }
        .lbc-chevron { transition: transform 160ms ease; }
        .lbc-group[data-open="true"] .lbc-chevron { transform: rotate(90deg); }
        .lbc-group-body { display: none; border-top: 1px solid var(--lbc-border); }
        .lbc-group[data-open="true"] .lbc-group-body { display: block; }
        .lbc-actions { display: flex; gap: 7px; padding: 8px; border-bottom: 1px solid var(--lbc-border); }
        .lbc-action {
            min-height: 34px;
            padding: 0 12px;
            border-radius: 9px;
            background: var(--lbc-surface-hover);
        }
        .lbc-row {
            min-height: 46px;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 7px 10px 7px 13px;
            border-bottom: 1px solid var(--lbc-border);
        }
        .lbc-row:last-child { border-bottom: 0; }
        .lbc-row-label { min-width: 0; flex: 1; overflow-wrap: anywhere; }
        .lbc-row-overview .lbc-row-label { color: var(--group-color); font-weight: 650; }
        .lbc-switch {
            position: relative;
            width: 46px;
            height: 28px;
            flex: 0 0 auto;
            border-radius: 999px;
            background: var(--lbc-switch-off);
            transition: background 130ms ease;
        }
        .lbc-switch::after {
            content: "";
            position: absolute;
            top: 4px;
            left: 4px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 1px 4px rgb(0 0 0 / 28%);
            transition: transform 130ms ease;
        }
        .lbc-switch[aria-checked="true"] { background: var(--lbc-accent); }
        .lbc-switch[aria-checked="true"]::after { transform: translateX(18px); }
        .lbc-switch[data-state="unknown"] { background: #a56c32; }
        .lbc-switch:disabled, .lbc-action:disabled { cursor: wait; opacity: .55; }
        .lbc-footer { min-height: 42px; border-top: 1px solid var(--lbc-border); }
        .lbc-status { flex: 1; }
        .lbc-status[data-kind="error"] { color: #ff8d8d; }
        @media (max-width: 640px) {
            .lbc-launcher { right: 16px; bottom: 18px; width: 58px; height: 58px; }
            .lbc-panel {
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                top: auto !important;
                width: 100%;
                max-height: min(82dvh, 720px);
                border-width: 1px 0 0;
                border-radius: 18px 18px 0 0;
                padding-bottom: env(safe-area-inset-bottom);
            }
            .lbc-header { padding: 14px 16px 10px; }
            .lbc-pages { padding: 8px 8px 16px; }
            .lbc-group-head, .lbc-row { min-height: 54px; }
            .lbc-action { min-height: 42px; }
        }
        .lbc-root[data-compact="true"] .lbc-launcher { display: none; }
        .lbc-root[data-compact="true"] .lbc-panel {
            border-width: 1px 0 0;
            border-radius: 18px 18px 0 0;
            padding-bottom: env(safe-area-inset-bottom);
        }
        .lbc-root[data-compact="true"] .lbc-header { padding: 14px 16px 10px; }
        .lbc-root[data-compact="true"] .lbc-pages { padding: 8px 8px 16px; }
        .lbc-root[data-compact="true"] .lbc-group-head,
        .lbc-root[data-compact="true"] .lbc-row { min-height: 54px; }
        .lbc-root[data-compact="true"] .lbc-action { min-height: 42px; }
        @media (prefers-reduced-motion: reduce) {
            .lbc-root * { transition: none !important; }
        }
    `;

    const style = hostDocument.createElement('style');
    style.dataset.lbcOwner = scriptId;
    style.textContent = css;
    hostDocument.head.append(style);

    const root = hostDocument.createElement('div');
    root.className = 'lbc-root';
    root.dataset.lbcOwner = scriptId;
    root.innerHTML = `
        <button class="lbc-launcher" type="button" aria-label="打开绿茵世界书管理器" aria-expanded="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3.5A2.5 2.5 0 0 1 7.5 1H20v17H7.5A2.5 2.5 0 0 0 5 20.5v-17Zm2.5-.5A.5.5 0 0 0 7 3.5v13.55c.16-.03.33-.05.5-.05H18V3H7.5ZM4 4H2v16.5A2.5 2.5 0 0 0 4.5 23H20v-2H4.5a.5.5 0 0 1-.5-.5V4Z"/></svg>
        </button>
        <section class="lbc-panel" aria-label="绿茵世界书管理器" hidden>
            <header class="lbc-header">
                <div class="lbc-title"><strong>绿茵世界书管理器</strong><span>${BOOK_FILE}</span></div>
                <button class="lbc-icon-button" type="button" data-action="refresh" aria-label="刷新">↻</button>
                <button class="lbc-icon-button" type="button" data-action="close" aria-label="关闭">×</button>
            </header>
            <nav class="lbc-tabs" aria-label="绿茵资料分类"></nav>
            <main class="lbc-pages"></main>
            <footer class="lbc-footer"><span class="lbc-status">准备就绪</span><span>快速切换会自动合并保存</span></footer>
        </section>
    `;
    hostDocument.body.append(root);

    const launcher = root.querySelector('.lbc-launcher');
    const panel = root.querySelector('.lbc-panel');
    const tabs = root.querySelector('.lbc-tabs');
    const pageHost = root.querySelector('.lbc-pages');
    const status = root.querySelector('.lbc-status');
    const viewport = hostWindow.visualViewport;
    const builtPages = new Map();
    let activePage = 'story';
    let dragged = false;
    let forceCompact = false;
    let wandRetryTimer;
    let wandRetryCount = 0;

    function element(tag, className, text) {
        const node = hostDocument.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function setStatus(message, kind = '') {
        status.textContent = message;
        status.dataset.kind = kind;
    }

    function makeSwitch(uid) {
        const button = element('button', 'lbc-switch');
        button.type = 'button';
        button.dataset.action = 'toggle';
        button.dataset.uid = uid;
        button.dataset.state = 'loading';
        button.setAttribute('role', 'switch');
        button.setAttribute('aria-checked', 'false');
        button.setAttribute('aria-label', '切换条目');
        button.disabled = true;
        return button;
    }

    function makeRow(item, overview = false) {
        const row = element('div', `lbc-row${overview ? ' lbc-row-overview' : ''}`);
        const label = element('span', 'lbc-row-label', item.label);
        row.append(label, makeSwitch(item.uid));
        return row;
    }

    function makeGroup(section) {
        const group = element('section', 'lbc-group');
        group.dataset.sectionId = section.id;
        group.dataset.open = 'false';
        group.style.setProperty('--group-color', section.color);

        const head = element('button', 'lbc-group-head');
        head.type = 'button';
        head.dataset.action = 'group';
        head.innerHTML = `<span class="lbc-group-icon"></span><span class="lbc-group-name"></span><span class="lbc-count"></span><span class="lbc-chevron">›</span>`;
        head.querySelector('.lbc-group-icon').textContent = section.icon;
        head.querySelector('.lbc-group-name').textContent = section.label;
        head.querySelector('.lbc-count').textContent = `${section.chapters.length} 项`;

        const body = element('div', 'lbc-group-body');
        const actions = element('div', 'lbc-actions');
        const enable = element('button', 'lbc-action', '全部开启');
        enable.type = 'button';
        enable.dataset.action = 'batch';
        enable.dataset.enabled = 'true';
        const disable = element('button', 'lbc-action', '全部关闭');
        disable.type = 'button';
        disable.dataset.action = 'batch';
        disable.dataset.enabled = 'false';
        actions.append(enable, disable);
        body.append(actions);
        if (section.overview) body.append(makeRow(section.overview, true));
        section.chapters.forEach(chapter => body.append(makeRow(chapter)));
        group.append(head, body);
        return group;
    }

    function getPage(key) {
        if (!builtPages.has(key)) {
            const page = element('div', 'lbc-page');
            page.dataset.page = key;
            pages[key].sections.forEach(section => page.append(makeGroup(section)));
            builtPages.set(key, page);
        }
        return builtPages.get(key);
    }

    Object.entries(pages).forEach(([key, page]) => {
        const tab = element('button', 'lbc-tab', page.label);
        tab.type = 'button';
        tab.dataset.action = 'tab';
        tab.dataset.page = key;
        tab.setAttribute('aria-selected', String(key === activePage));
        tabs.append(tab);
    });

    function showPage(key) {
        activePage = key;
        tabs.querySelectorAll('.lbc-tab').forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.page === key)));
        pageHost.replaceChildren(getPage(key));
        refreshVisibleStates();
    }

    async function refreshVisibleStates(force = false) {
        const switches = [...pageHost.querySelectorAll('.lbc-switch')];
        switches.forEach(button => {
            button.disabled = true;
            button.dataset.state = 'loading';
        });
        try {
            const states = await store.getStates(switches.map(button => button.dataset.uid), { force });
            switches.forEach(button => {
                const enabled = states.get(button.dataset.uid);
                button.disabled = false;
                button.dataset.state = enabled === null ? 'unknown' : 'ready';
                button.setAttribute('aria-checked', String(enabled === true));
            });
            setStatus('状态已同步');
        } catch (error) {
            switches.forEach(button => {
                button.disabled = false;
                button.dataset.state = 'unknown';
            });
            setStatus('读取失败，请重试', 'error');
            console.error('[绿茵世界书管理器] 读取失败', error);
        }
    }

    function sectionByGroup(group) {
        return pages[activePage].sections.find(section => section.id === group?.dataset.sectionId);
    }

    async function toggleOne(button) {
        const enabled = button.getAttribute('aria-checked') !== 'true';
        button.setAttribute('aria-checked', String(enabled));
        button.disabled = true;
        setStatus('正在保存...');
        try {
            await store.setState(button.dataset.uid, enabled);
            setStatus('已保存');
        } catch (error) {
            button.setAttribute('aria-checked', String(!enabled));
            setStatus('保存失败，已恢复', 'error');
            console.error('[绿茵世界书管理器] 保存失败', error);
        } finally {
            button.disabled = false;
        }
    }

    async function toggleSection(button) {
        const group = button.closest('.lbc-group');
        const section = sectionByGroup(group);
        const enabled = button.dataset.enabled === 'true';
        const switches = [...group.querySelectorAll('.lbc-switch')];
        const uids = switches.map(item => item.dataset.uid);
        group.querySelectorAll('.lbc-action').forEach(action => { action.disabled = true; });
        switches.forEach(item => {
            item.disabled = true;
            item.setAttribute('aria-checked', String(enabled));
        });
        setStatus('正在批量保存...');
        try {
            await store.setStates(uids, enabled);
            setStatus(`${section.label} 已更新`);
        } catch (error) {
            setStatus('批量保存失败，正在恢复', 'error');
            await refreshVisibleStates(true);
            console.error('[绿茵世界书管理器] 批量保存失败', error);
        } finally {
            group.querySelectorAll('.lbc-action').forEach(action => { action.disabled = false; });
            switches.forEach(item => { item.disabled = false; });
        }
    }

    function closePanel() {
        panel.hidden = true;
        launcher.setAttribute('aria-expanded', 'false');
        forceCompact = false;
        syncCompactLayout();
    }

    function positionPanel() {
        if (root.dataset.compact === 'true') {
            const viewportLeft = viewport?.offsetLeft ?? 0;
            const viewportTop = viewport?.offsetTop ?? 0;
            const viewportWidth = viewport?.width ?? hostWindow.innerWidth;
            const viewportHeight = viewport?.height ?? hostWindow.innerHeight;
            const panelHeight = Math.min(720, viewportHeight * 0.82);
            panel.style.setProperty('left', `${viewportLeft}px`, 'important');
            panel.style.setProperty('right', 'auto', 'important');
            panel.style.setProperty('bottom', 'auto', 'important');
            panel.style.setProperty('top', `${viewportTop + viewportHeight - panelHeight}px`, 'important');
            panel.style.setProperty('width', `${viewportWidth}px`, 'important');
            panel.style.setProperty('max-height', `${panelHeight}px`, 'important');
            return;
        }
        const launcherRect = launcher.getBoundingClientRect();
        const width = Math.min(440, hostWindow.innerWidth - 24);
        const height = Math.min(680, hostWindow.innerHeight - 24);
        let left = launcherRect.left - width - 12;
        if (left < 12) left = launcherRect.right + 12;
        left = Math.max(12, Math.min(hostWindow.innerWidth - width - 12, left));
        const top = Math.max(12, Math.min(hostWindow.innerHeight - height - 12, launcherRect.top));
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
    }

    function syncCompactLayout() {
        const viewportWidth = viewport?.width ?? hostWindow.innerWidth;
        const compact = forceCompact || viewportWidth <= 700 || hostWindow.matchMedia('(max-width: 640px)').matches;
        root.dataset.compact = String(compact);

        if (!compact) {
            ['left', 'right', 'bottom', 'top', 'width', 'max-height'].forEach(property => panel.style.removeProperty(property));
        }

        if (!panel.hidden) positionPanel();
    }

    function openPanel(fromWandMenu = false) {
        forceCompact = fromWandMenu;
        syncCompactLayout();
        panel.hidden = false;
        launcher.setAttribute('aria-expanded', 'true');
        positionPanel();
        showPage(activePage);
    }

    function registerWandMenuEntry() {
        const extensionsMenu = hostDocument.getElementById('extensionsMenu');
        if (!extensionsMenu) {
            if (wandRetryCount++ < 30) wandRetryTimer = setTimeout(registerWandMenuEntry, 1000);
            return;
        }

        if (hostDocument.getElementById('lbc-wand-menu-container')) return;

        const container = element('div', 'extension_container interactable');
        container.id = 'lbc-wand-menu-container';
        container.dataset.lbcOwner = scriptId;
        container.tabIndex = 0;

        const item = element('div', 'list-group-item flex-container flexGap5 interactable');
        item.id = 'lbc-wand-menu-item';
        item.title = '打开绿茵世界书管理器';
        item.innerHTML = '<div class="fa-fw fa-solid fa-book-open extensionsMenuExtensionButton"></div><span>绿茵世界书管理器</span>';
        item.addEventListener('click', event => {
            event.preventDefault();
            const wandButton = hostDocument.getElementById('extensionsMenuButton');
            if (hostWindow.getComputedStyle(extensionsMenu).display !== 'none') wandButton?.click();
            openPanel(true);
        }, eventOptions);

        container.append(item);
        extensionsMenu.append(container);
    }

    function handlePanelClick(event) {
        const button = event.target.closest('[data-action]');
        if (!button || !panel.contains(button)) return;
        const action = button.dataset.action;
        if (action === 'close') closePanel();
        else if (action === 'refresh') refreshVisibleStates(true);
        else if (action === 'tab') showPage(button.dataset.page);
        else if (action === 'group') {
            const group = button.closest('.lbc-group');
            group.dataset.open = String(group.dataset.open !== 'true');
        } else if (action === 'toggle') toggleOne(button);
        else if (action === 'batch') toggleSection(button);
    }

    function clampLauncher() {
        if (!launcher.style.left) return;
        const rect = launcher.getBoundingClientRect();
        launcher.style.left = `${Math.max(0, Math.min(hostWindow.innerWidth - rect.width, rect.left))}px`;
        launcher.style.top = `${Math.max(0, Math.min(hostWindow.innerHeight - rect.height, rect.top))}px`;
    }

    launcher.addEventListener('pointerdown', event => {
        const rect = launcher.getBoundingClientRect();
        const origin = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
        dragged = false;
        launcher.setPointerCapture(event.pointerId);
        const move = moveEvent => {
            const dx = moveEvent.clientX - origin.x;
            const dy = moveEvent.clientY - origin.y;
            if (Math.abs(dx) + Math.abs(dy) > 5) dragged = true;
            launcher.style.right = 'auto';
            launcher.style.bottom = 'auto';
            launcher.style.left = `${Math.max(0, Math.min(hostWindow.innerWidth - rect.width, origin.left + dx))}px`;
            launcher.style.top = `${Math.max(0, Math.min(hostWindow.innerHeight - rect.height, origin.top + dy))}px`;
        };
        const up = () => {
            launcher.removeEventListener('pointermove', move);
            launcher.removeEventListener('pointerup', up);
            launcher.removeEventListener('pointercancel', up);
            if (dragged) {
                hostWindow.localStorage.setItem('lbc-launcher-position', JSON.stringify({
                    left: parseFloat(launcher.style.left),
                    top: parseFloat(launcher.style.top),
                }));
            }
        };
        launcher.addEventListener('pointermove', move);
        launcher.addEventListener('pointerup', up);
        launcher.addEventListener('pointercancel', up);
    }, eventOptions);

    launcher.addEventListener('click', () => {
        if (dragged) {
            dragged = false;
            return;
        }
        if (panel.hidden) openPanel(false);
        else closePanel();
    }, eventOptions);
    panel.addEventListener('click', handlePanelClick, eventOptions);

    hostDocument.addEventListener('pointerdown', event => {
        if (!panel.hidden && !panel.contains(event.target) && !launcher.contains(event.target)) closePanel();
    }, eventOptions);
    hostDocument.addEventListener('keydown', event => {
        if (event.key === 'Escape') closePanel();
    }, eventOptions);
    hostWindow.addEventListener('resize', () => {
        syncCompactLayout();
        if (root.dataset.compact !== 'true') clampLauncher();
        if (!panel.hidden) positionPanel();
    }, eventOptions);
    viewport?.addEventListener('resize', syncCompactLayout, eventOptions);
    viewport?.addEventListener('scroll', syncCompactLayout, eventOptions);

    try {
        const saved = JSON.parse(hostWindow.localStorage.getItem('lbc-launcher-position'));
        const compact = (viewport?.width ?? hostWindow.innerWidth) <= 700;
        if (!compact && Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) {
            launcher.style.right = 'auto';
            launcher.style.bottom = 'auto';
            launcher.style.left = `${saved.left}px`;
            launcher.style.top = `${saved.top}px`;
            clampLauncher();
        }
    } catch {
        // Ignore malformed position data.
    }
    syncCompactLayout();
    registerWandMenuEntry();

    hostWindow[cleanupKey] = () => {
        events.abort();
        clearTimeout(wandRetryTimer);
        store.flush().catch(error => console.error('[绿茵世界书管理器] 清理时保存失败', error));
        hostDocument.querySelectorAll(`[data-lbc-owner="${scriptId}"]`).forEach(node => node.remove());
    };
})();

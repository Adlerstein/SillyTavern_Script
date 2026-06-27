import { createLoreBookStore } from '../drgon_book/lore-book-controller-store.js?v=20260624-store1';
import { BOOK_FILE, deriveGroups, entryPrefix, entryTitle, entryUid, esc, isLockedEntry, setGroupOpen } from './green-lore-book-controller-core.js?v=20260627-toggle2';

(function initGreenLoreBookController() {
    const hostWindow = window.parent ?? window;
    const hostDocument = hostWindow.document;
    const scriptId = typeof globalThis.getScriptId === 'function' ? globalThis.getScriptId() : 'green-lore-book-controller-local';
    const cleanupKey = '__greenLoreBookControllerCleanup';

    hostWindow[cleanupKey]?.();
    hostDocument.querySelectorAll(`[data-glbc-owner="${scriptId}"]`).forEach(node => node.remove());

    const events = new hostWindow.AbortController();
    const viewport = hostWindow.visualViewport;
    const getContext = () => hostWindow.SillyTavern?.getContext?.() ?? globalThis.SillyTavern?.getContext?.();
    const getLoadWorldInfo = () => {
        const context = getContext();
        if (typeof context?.loadWorldInfo !== 'function') throw new Error('loadWorldInfo is unavailable');
        return context.loadWorldInfo.bind(context);
    };
    const getSaveWorldInfo = () => {
        const context = getContext();
        if (typeof context?.saveWorldInfo !== 'function') throw new Error('saveWorldInfo is unavailable');
        return context.saveWorldInfo.bind(context);
    };

    const store = createLoreBookStore({
        bookName: BOOK_FILE,
        loadWorldInfo: name => getLoadWorldInfo()(name),
        saveWorldInfo: (...args) => getSaveWorldInfo()(...args),
    });

    const cssHref = new URL('./green-lore-book-controller.css?v=20260627-toggle2', import.meta.url).href;
    const style = hostDocument.createElement('style');
    style.dataset.glbcOwner = scriptId;
    style.textContent = `@import url("${cssHref}");`;
    hostDocument.head.append(style);

    const root = hostDocument.createElement('div');
    root.className = 'glbc-root';
    root.dataset.glbcOwner = scriptId;
    root.innerHTML = `
        <button class="glbc-launcher" type="button" aria-label="打开绿茵世界书控制器" aria-expanded="false">⚽</button>
        <section class="glbc-panel" aria-label="绿茵世界书控制器" hidden>
            <header class="glbc-header">
                <div class="glbc-title"><strong>绿茵世界书控制器</strong><span>${BOOK_FILE} · 开关控制版</span></div>
                <button class="glbc-icon-button" type="button" data-action="refresh" aria-label="刷新">↻</button>
                <button class="glbc-icon-button" type="button" data-action="close" aria-label="关闭">×</button>
            </header>
            <main class="glbc-body">
                <div class="glbc-toolbar">
                    <input class="glbc-search" type="search" placeholder="搜索条目、编号、分组或关键词">
                </div>
                <div class="glbc-groups"></div>
            </main>
            <footer class="glbc-footer"><span class="glbc-status">准备就绪</span><span>只保存条目开关，不改世界书结构</span></footer>
        </section>`;
    hostDocument.body.append(root);

    const launcher = root.querySelector('.glbc-launcher');
    const panel = root.querySelector('.glbc-panel');
    const groupsHost = root.querySelector('.glbc-groups');
    const search = root.querySelector('.glbc-search');
    const status = root.querySelector('.glbc-status');
    let openedAt = 0;
    let launcherMoved = false;
    let forceCompact = false;
    let wandRetryTimer;
    let wandRetryCount = 0;
    let currentGroups = [];

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

    function makeSwitch(entry, enabled) {
        const uid = entryUid(entry);
        const button = element('button', 'glbc-switch');
        button.type = 'button';
        button.dataset.action = 'toggle';
        button.dataset.uid = uid;
        button.setAttribute('role', 'switch');
        button.setAttribute('aria-checked', String(enabled));
        button.title = enabled ? '关闭条目' : '开启条目';
        return button;
    }

    function makeLockedBadge() {
        const badge = element('span', 'glbc-locked', '锁定');
        badge.title = '系统或结构条目不会被控制器开关';
        return badge;
    }

    function makeEntryRow(entry, enabled) {
        const uid = entryUid(entry);
        const prefix = entryPrefix(entry.comment);
        const locked = isLockedEntry(entry);
        const row = element('div', 'glbc-entry-row');
        row.dataset.uid = uid;
        row.dataset.search = `${uid} ${prefix} ${entryTitle(entry)} ${String(entry.comment ?? '')} ${String(entry.key ?? '')}`.toLowerCase();
        row.classList.toggle('is-locked', locked);
        row.innerHTML = `
            <div class="glbc-entry-main">
                <span class="glbc-entry-title">${esc(entryTitle(entry))}</span>
                <span class="glbc-entry-meta">#${esc(uid)}${prefix ? ` · ${esc(prefix)}` : ''}</span>
            </div>`;
        row.append(locked ? makeLockedBadge() : makeSwitch(entry, enabled));
        return row;
    }

    function makeGroup(group, states) {
        const section = element('section', 'glbc-group');
        section.dataset.groupId = group.id;
        const canBatch = group.unlockedCount > 0;
        section.innerHTML = `
            <button class="glbc-group-head" type="button" data-action="group" aria-expanded="false">
                <span class="glbc-chevron">›</span>
                <span class="glbc-group-title">${esc(group.label)}</span>
                <span class="glbc-group-count">${group.enabledCount}/${group.totalCount} 开启</span>
            </button>
            <div class="glbc-group-tools">
                <span>${esc(group.description || '')}</span>
                <span>${group.disabledCount} 关闭 · ${group.unlockedCount} 可控</span>
                ${canBatch ? `<button class="glbc-action" type="button" data-action="batch" data-group="${esc(group.id)}" data-enabled="true">全开</button><button class="glbc-action" type="button" data-action="batch" data-group="${esc(group.id)}" data-enabled="false">全关</button>` : ''}
            </div>
            <div class="glbc-entry-list"></div>`;
        const list = section.querySelector('.glbc-entry-list');
        group.entries.forEach(entry => {
            list.append(makeEntryRow(entry, states.get(entryUid(entry))));
        });
        setGroupOpen(section, false);
        return section;
    }

    function applySearch() {
        const query = search.value.trim().toLowerCase();
        const rows = [...groupsHost.querySelectorAll('.glbc-entry-row')];
        if (!query) {
            rows.forEach(row => { row.hidden = false; });
            groupsHost.querySelectorAll('.glbc-group').forEach(group => { group.hidden = false; });
            return;
        }
        groupsHost.querySelectorAll('.glbc-group').forEach(group => {
            let groupHasMatch = false;
            group.querySelectorAll('.glbc-entry-row').forEach(row => {
                const visible = row.dataset.search?.includes(query);
                row.hidden = !visible;
                groupHasMatch ||= Boolean(visible);
            });
            group.hidden = !groupHasMatch;
            if (groupHasMatch) setGroupOpen(group, true);
        });
    }

    async function refreshDashboard(force = false) {
        try {
            setStatus('正在读取世界书...');
            const book = await store.load({ force });
            currentGroups = deriveGroups(book);
            const uids = currentGroups.flatMap(group => group.entries.map(entryUid));
            const states = await store.getStates(uids, { force: false });
            groupsHost.replaceChildren(...currentGroups.map(group => makeGroup(group, states)));
            applySearch();
            setStatus('世界书开关已同步');
        } catch (error) {
            setStatus('读取失败，请重试', 'error');
            console.error('[绿茵世界书控制器] 读取失败', error);
        }
    }

    async function toggleOne(button) {
        const uid = button.dataset.uid;
        const previous = button.getAttribute('aria-checked') === 'true';
        const enabled = !previous;
        button.setAttribute('aria-checked', String(enabled));
        button.disabled = true;
        setStatus('正在保存开关...');
        try {
            await store.setState(uid, enabled);
            setStatus('开关已保存');
            await refreshDashboard(false);
        } catch (error) {
            button.setAttribute('aria-checked', String(previous));
            setStatus('保存失败，已恢复', 'error');
            console.error('[绿茵世界书控制器] 保存失败', error);
        } finally {
            button.disabled = false;
        }
    }

    async function toggleGroup(button) {
        const group = currentGroups.find(item => item.id === button.dataset.group);
        if (!group?.unlockedUids?.length) return;
        const enabled = button.dataset.enabled === 'true';
        button.disabled = true;
        setStatus(enabled ? '正在批量开启...' : '正在批量关闭...');
        try {
            await store.setStates(group.unlockedUids, enabled);
            setStatus(enabled ? '分组已开启' : '分组已关闭');
            await refreshDashboard(true);
        } catch (error) {
            setStatus('批量保存失败，请刷新后重试', 'error');
            console.error('[绿茵世界书控制器] 批量保存失败', error);
        } finally {
            button.disabled = false;
        }
    }

    function positionPanel() {
        if (root.dataset.compact === 'true') {
            const viewportLeft = viewport?.offsetLeft ?? 0;
            const viewportTop = viewport?.offsetTop ?? 0;
            const viewportWidth = viewport?.width ?? hostWindow.innerWidth;
            const viewportHeight = viewport?.height ?? hostWindow.innerHeight;
            const panelHeight = Math.min(760, Math.max(360, viewportHeight * 0.88));
            panel.style.setProperty('left', `${viewportLeft}px`, 'important');
            panel.style.setProperty('right', 'auto', 'important');
            panel.style.setProperty('bottom', 'auto', 'important');
            panel.style.setProperty('top', `${viewportTop + viewportHeight - panelHeight}px`, 'important');
            panel.style.setProperty('width', `${viewportWidth}px`, 'important');
            panel.style.setProperty('height', `${panelHeight}px`, 'important');
            panel.style.setProperty('max-height', `${panelHeight}px`, 'important');
            return;
        }
        if (hostWindow.innerWidth <= 760) return;
        const rect = launcher.getBoundingClientRect();
        const width = Math.min(820, hostWindow.innerWidth - 24);
        const height = Math.min(760, hostWindow.innerHeight - 24);
        let left = rect.left - width - 12;
        if (left < 12) left = rect.right + 12;
        panel.style.left = `${Math.max(12, Math.min(hostWindow.innerWidth - width - 12, left))}px`;
        panel.style.top = `${Math.max(12, Math.min(hostWindow.innerHeight - height - 12, rect.top))}px`;
        panel.style.width = `${width}px`;
        panel.style.height = `${height}px`;
    }

    function positionMobileLauncher() {
        if (hostWindow.innerWidth > 760) return;
        launcher.style.left = 'auto';
        launcher.style.top = 'auto';
        launcher.style.right = '16px';
        launcher.style.bottom = 'calc(18px + env(safe-area-inset-bottom, 0px))';
    }

    function positionMobilePanel() {
        if (hostWindow.innerWidth > 760) return;
        panel.style.left = '0';
        panel.style.right = '0';
        panel.style.top = 'auto';
        panel.style.bottom = '0';
        panel.style.width = '100vw';
        panel.style.height = 'min(88dvh, 760px)';
    }

    function syncCompactLayout() {
        const viewportWidth = viewport?.width ?? hostWindow.innerWidth;
        const compact = forceCompact || viewportWidth <= 760 || hostWindow.matchMedia('(max-width: 760px)').matches;
        root.dataset.compact = String(compact);
        if (!compact) {
            ['left', 'right', 'bottom', 'top', 'width', 'height', 'max-height'].forEach(property => panel.style.removeProperty(property));
            positionMobileLauncher();
        }
        if (!panel.hidden) positionPanel();
    }

    function closePanel() {
        panel.hidden = true;
        launcher.setAttribute('aria-expanded', 'false');
        forceCompact = false;
        syncCompactLayout();
        positionMobileLauncher();
    }

    async function openPanel(fromWandMenu = false) {
        forceCompact = fromWandMenu;
        panel.hidden = false;
        openedAt = Date.now();
        launcher.setAttribute('aria-expanded', 'true');
        syncCompactLayout();
        positionMobileLauncher();
        positionMobilePanel();
        positionPanel();
        await refreshDashboard(true);
    }

    function registerWandMenuEntry() {
        const extensionsMenu = hostDocument.getElementById('extensionsMenu');
        if (!extensionsMenu) {
            if (wandRetryCount++ < 30) wandRetryTimer = setTimeout(registerWandMenuEntry, 1000);
            return;
        }
        if (hostDocument.getElementById('glbc-wand-menu-container')) return;
        const container = element('div', 'extension_container interactable');
        container.id = 'glbc-wand-menu-container';
        container.dataset.glbcOwner = scriptId;
        const item = element('div', 'list-group-item flex-container flexGap5 interactable');
        item.title = '打开绿茵世界书控制器';
        item.innerHTML = '<div class="fa-fw fa-solid fa-futbol extensionsMenuExtensionButton"></div><span>绿茵世界书控制器</span>';
        item.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            void openPanel(true);
        }, { signal: events.signal });
        container.append(item);
        extensionsMenu.append(container);
    }

    root.addEventListener('click', event => {
        const target = event.target;
        const actionNode = target?.closest?.('[data-action]') ?? target?.parentElement?.closest?.('[data-action]');
        if (!actionNode || !root.contains(actionNode)) return;
        const action = actionNode.dataset.action;
        if (action === 'close') closePanel();
        else if (action === 'refresh') void refreshDashboard(true);
        else if (action === 'toggle') void toggleOne(actionNode);
        else if (action === 'batch') void toggleGroup(actionNode);
        else if (action === 'group') {
            event.preventDefault();
            const group = actionNode.closest('.glbc-group');
            if (group) setGroupOpen(group, group.dataset.open !== 'true');
        }
    }, { signal: events.signal, capture: true });

    search.addEventListener('input', applySearch, { signal: events.signal });

    launcher.addEventListener('click', event => {
        if (Date.now() - openedAt < 250 || launcherMoved) {
            launcherMoved = false;
            return;
        }
        if (panel.hidden) void openPanel(false);
        else closePanel();
    }, { signal: events.signal });

    launcher.addEventListener('pointerdown', event => {
        if (hostWindow.innerWidth <= 760) return;
        const startX = event.clientX;
        const startY = event.clientY;
        const rect = launcher.getBoundingClientRect();
        const offsetX = startX - rect.left;
        const offsetY = startY - rect.top;
        launcher.setPointerCapture?.(event.pointerId);
        const move = moveEvent => {
            const nextLeft = Math.max(8, Math.min(hostWindow.innerWidth - rect.width - 8, moveEvent.clientX - offsetX));
            const nextTop = Math.max(8, Math.min(hostWindow.innerHeight - rect.height - 8, moveEvent.clientY - offsetY));
            if (Math.abs(moveEvent.clientX - startX) > 3 || Math.abs(moveEvent.clientY - startY) > 3) launcherMoved = true;
            launcher.style.left = `${nextLeft}px`;
            launcher.style.top = `${nextTop}px`;
            launcher.style.right = 'auto';
            launcher.style.bottom = 'auto';
            if (!panel.hidden) positionPanel();
        };
        const up = upEvent => {
            launcher.releasePointerCapture?.(upEvent.pointerId);
            hostWindow.removeEventListener('pointermove', move);
            hostWindow.removeEventListener('pointerup', up);
        };
        hostWindow.addEventListener('pointermove', move);
        hostWindow.addEventListener('pointerup', up, { once: true });
    }, { signal: events.signal });

    hostWindow.addEventListener('resize', () => {
        syncCompactLayout();
        positionMobileLauncher();
        positionMobilePanel();
    }, { signal: events.signal });
    viewport?.addEventListener?.('resize', () => {
        syncCompactLayout();
        positionMobilePanel();
    }, { signal: events.signal });
    viewport?.addEventListener?.('scroll', () => {
        if (!panel.hidden && root.dataset.compact === 'true') positionPanel();
    }, { signal: events.signal });

    hostWindow[cleanupKey] = () => {
        clearTimeout(wandRetryTimer);
        events.abort();
        root.remove();
        style.remove();
        if (hostWindow[cleanupKey]) delete hostWindow[cleanupKey];
    };

    positionMobileLauncher();
    registerWandMenuEntry();
})();

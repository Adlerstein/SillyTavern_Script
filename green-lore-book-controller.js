import { createLoreBookStore } from 'https://cdn.jsdelivr.net/gh/Adlerstein/SillyTavern_Script@1bbded69af6fa712c5d376821c549ccf7d1d776d/lore-book-controller-store.js?v=20260614-4';
import { BOOK_FILE, MODULES, STATIC_UIDS, TREE, clone, entryKeys, esc, findEntry, findLegacyEntry, joinKeys, maxDisplayIndex, moduleFromComment, nextUid, nodeKind, orderFor, removeEntryByUid, setEntryShape, splitKeys, templateUid, uidKey, updateEntryFields } from './green-lore-book-controller-core.js?v=20260623-core1';

(function initGreenLoreBookController() {
    const hostWindow = window.parent ?? window;
    const hostDocument = hostWindow.document;
    const scriptId = typeof globalThis.getScriptId === 'function' ? globalThis.getScriptId() : 'green-lore-book-controller-local';
    const cleanupKey = '__greenLoreBookControllerCleanup';

    hostWindow[cleanupKey]?.();
    hostDocument.querySelectorAll(`[data-glbc-owner="${scriptId}"]`).forEach(node => node.remove());

    const events = new hostWindow.AbortController();
    const eventOptions = { signal: events.signal };
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

    const css = `
        .glbc-root,.glbc-root *{box-sizing:border-box}
        .glbc-root{--bg:var(--SmartThemeBlurTintColor,#20242b);--text:var(--SmartThemeBodyColor,#f1f3f5);--surface:color-mix(in srgb,var(--bg) 91%,var(--text) 9%);--hover:color-mix(in srgb,var(--bg) 82%,var(--text) 18%);--border:color-mix(in srgb,var(--bg) 70%,var(--text) 30%);--muted:color-mix(in srgb,var(--text) 64%,var(--bg) 36%);--accent:var(--SmartThemeQuoteColor,#79a7ff);position:fixed;inset:0;z-index:2147483600;pointer-events:none;font:14px/1.45 system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:var(--text)}
        .glbc-launcher{position:fixed;right:24px;bottom:28px;width:54px;height:54px;display:grid;place-items:center;border:1px solid var(--border);border-radius:50%;background:var(--bg);color:var(--text);box-shadow:0 8px 26px rgb(0 0 0 / 28%);cursor:grab;pointer-events:auto;touch-action:none;z-index:2147483647}
        .glbc-panel{position:fixed;width:min(980px,calc(100vw - 24px));height:min(760px,calc(100vh - 24px));display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;border:1px solid var(--border);border-radius:16px;background:var(--bg);box-shadow:0 18px 60px rgb(0 0 0 / 38%);pointer-events:auto;backdrop-filter:blur(18px);z-index:2147483646}
        .glbc-panel[hidden]{display:none}
        .glbc-header,.glbc-footer{display:flex;align-items:center;gap:10px;padding:12px 14px}.glbc-header{border-bottom:1px solid var(--border)}.glbc-footer{min-height:42px;border-top:1px solid var(--border);color:var(--muted);font-size:12px}.glbc-title{min-width:0;flex:1}.glbc-title strong,.glbc-title span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.glbc-title span{color:var(--muted);font-size:12px}
        .glbc-icon-button,.glbc-action,.glbc-switch,.glbc-tree-head,.glbc-edit-button,.glbc-group-add{border:0;color:inherit;font:inherit;cursor:pointer}.glbc-icon-button{width:38px;height:38px;border-radius:10px;background:transparent;font-size:20px}.glbc-icon-button:hover,.glbc-action:hover,.glbc-tree-row:hover,.glbc-edit-button:hover,.glbc-group-add:hover{background:var(--hover)}.glbc-action.danger{background:color-mix(in srgb,#ef4444 22%,var(--hover));color:#ffb4b4}.glbc-action.danger:hover{background:color-mix(in srgb,#ef4444 34%,var(--hover))}
        .glbc-body{min-height:0;display:grid;grid-template-columns:minmax(390px,44%) minmax(0,1fr)}
        .glbc-tree{min-height:0;overflow:auto;padding:12px 10px 12px 12px;border-right:1px solid var(--border)}.glbc-editor{min-height:0;display:grid;grid-template-rows:none;align-content:start;overflow:auto;padding:12px;gap:10px}
        .glbc-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;margin-bottom:10px}.glbc-search{width:100%;height:34px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);padding:0 10px}
        .glbc-tree-group{margin:0 0 8px}.glbc-tree-head{width:100%;min-height:42px;display:grid;grid-template-columns:28px minmax(0,1fr) 30px auto;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;background:var(--surface);text-align:left}.glbc-tree-icon{width:26px;height:26px;display:grid;place-items:center;border-radius:8px;background:color-mix(in srgb,var(--group-color) 18%,transparent);color:var(--group-color);font-weight:700}.glbc-tree-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.glbc-group-add{width:28px;height:28px;border-radius:8px;background:transparent;color:var(--muted);display:grid;place-items:center;font-weight:700}.glbc-tree-group[data-open=false]>.glbc-tree-children{display:none}.glbc-tree-group[data-open=true]>.glbc-tree-head .glbc-chevron{transform:rotate(90deg)}.glbc-chevron{transition:transform 160ms ease;color:var(--muted)}
        .glbc-tree-children{margin-left:10px;padding-left:11px;border-left:1px solid var(--border)}.glbc-tree-row{--level-indent:0px;--kind-indent:0px;min-height:40px;display:grid;grid-template-columns:14px minmax(0,1fr) 86px;align-items:center;column-gap:9px;margin-left:var(--level-indent);padding:5px 6px 5px calc(6px + var(--kind-indent));border-radius:9px}.glbc-tree-row[hidden]{display:none}.glbc-tree-row.is-active{background:color-mix(in srgb,var(--accent) 24%,transparent)}.glbc-node-dot{width:9px;height:9px;border-radius:50%;background:var(--muted);justify-self:center}.glbc-node-dot.is-blue{background:#60a5fa}.glbc-node-dot.is-green{background:#22c55e}.glbc-node-dot.is-tag{background:#f59e0b}.glbc-row-title{min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.32;word-break:break-word}.glbc-node-meta{color:var(--muted);font-size:11px;white-space:nowrap}.glbc-row-actions{width:86px;display:grid;grid-template-columns:30px 48px;align-items:center;justify-content:end;gap:8px}
        .glbc-tree-row.is-tag-node{--kind-indent:0px}.glbc-tree-row.is-blue-node{--kind-indent:14px}.glbc-tree-row.is-green-node{--kind-indent:28px}
        .glbc-switch{position:relative;width:46px;height:26px;flex:0 0 auto;border-radius:999px;background:color-mix(in srgb,var(--bg) 70%,var(--text) 30%);transition:background 130ms ease}.glbc-switch::after{content:"";position:absolute;top:4px;left:4px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgb(0 0 0 / 28%);transition:transform 130ms ease}.glbc-switch[aria-checked=true]{background:var(--accent)}.glbc-switch[aria-checked=true]::after{transform:translateX(20px)}.glbc-switch[data-state=unknown]{background:#a56c32}.glbc-switch:disabled,.glbc-action:disabled{cursor:wait;opacity:.55}
        .glbc-edit-button{width:30px;height:28px;border-radius:8px;background:transparent;color:var(--muted);display:grid;place-items:center}
        .glbc-editor-empty{height:100%;display:grid;place-items:center;color:var(--muted);text-align:center}.glbc-form-row{display:grid;gap:5px;min-width:0}.glbc-form-row label{color:var(--muted);font-size:12px}.glbc-input,.glbc-select,.glbc-textarea{width:100%;min-width:0;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);padding:8px 10px;font:13px/1.45 ui-monospace,SFMono-Regular,Consolas,"Microsoft YaHei",monospace}.glbc-textarea{height:clamp(180px,36vh,320px);min-height:180px;resize:vertical}.glbc-editor-flags{display:flex;gap:8px 10px;color:var(--muted);font-size:12px;flex-wrap:wrap}.glbc-editor-flags span{min-width:0}.glbc-editor-actions{display:flex;gap:8px;justify-content:flex-end}.glbc-action{min-height:34px;padding:0 12px;border-radius:9px;background:var(--hover)}.glbc-action.primary{background:var(--accent);color:#fff}.glbc-status{flex:1}.glbc-status[data-kind=error]{color:#ff8d8d}
        @media(max-width:760px){.glbc-launcher{right:16px!important;bottom:18px!important;left:auto!important;top:auto!important;width:58px;height:58px;touch-action:manipulation}.glbc-panel{left:0!important;right:0!important;bottom:0!important;top:auto!important;width:100vw!important;height:min(88vh,760px);height:min(88dvh,760px);max-height:calc(100vh - 8px);border-width:1px 0 0;border-radius:18px 18px 0 0;padding-bottom:env(safe-area-inset-bottom);transform:translateZ(0)}.glbc-body{grid-template-columns:1fr;grid-template-rows:46% 54%}.glbc-tree{border-right:0;border-bottom:1px solid var(--border);padding:10px}.glbc-tree-row{grid-template-columns:14px minmax(0,1fr) 84px}.glbc-tree-row.is-blue-node{--kind-indent:10px}.glbc-tree-row.is-green-node{--kind-indent:20px}.glbc-row-actions{width:84px;grid-template-columns:28px 46px;gap:7px}}
        .glbc-root[data-compact=true] .glbc-launcher{display:none}
        .glbc-root[data-compact=true] .glbc-panel{border-width:1px 0 0;border-radius:18px 18px 0 0;padding-bottom:env(safe-area-inset-bottom)}
        .glbc-root[data-compact=true] .glbc-body{grid-template-columns:1fr;grid-template-rows:46% 54%}
        .glbc-root[data-compact=true] .glbc-tree{border-right:0;border-bottom:1px solid var(--border);padding:10px}
    `;

    const style = hostDocument.createElement('style');
    style.dataset.glbcOwner = scriptId;
    style.textContent = css;
    hostDocument.head.append(style);

    const root = hostDocument.createElement('div');
    root.className = 'glbc-root';
    root.dataset.glbcOwner = scriptId;
    root.innerHTML = `
        <button class="glbc-launcher" type="button" aria-label="打开绿茵世界书管理器" aria-expanded="false">⚽</button>
        <section class="glbc-panel" aria-label="绿茵世界书管理器" hidden>
            <header class="glbc-header">
                <div class="glbc-title"><strong>绿茵世界书管理器</strong><span>${BOOK_FILE} · 树形编辑版</span></div>
                <button class="glbc-icon-button" type="button" data-action="refresh" aria-label="刷新">↻</button>
                <button class="glbc-icon-button" type="button" data-action="close" aria-label="关闭">×</button>
            </header>
            <main class="glbc-body">
                <aside class="glbc-tree">
                    <div class="glbc-toolbar"><input class="glbc-search" type="search" placeholder="搜索节点、编号或内容片段"><button class="glbc-action" type="button" data-action="new-entry">新建节点</button></div>
                    <div class="glbc-tree-host"></div>
                </aside>
                <section class="glbc-editor">
                    <div class="glbc-editor-empty">选择一个世界树节点后，可以编辑标题、关键词和正文。</div>
                </section>
            </main>
            <footer class="glbc-footer"><span class="glbc-status">准备就绪</span><span>树枝开关与编辑保存都会写回世界书</span></footer>
        </section>`;
    hostDocument.body.append(root);

    const launcher = root.querySelector('.glbc-launcher');
    const panel = root.querySelector('.glbc-panel');
    const treeHost = root.querySelector('.glbc-tree-host');
    const editor = root.querySelector('.glbc-editor');
    const search = root.querySelector('.glbc-search');
    const status = root.querySelector('.glbc-status');
    let activeUid = '';
    let dragged = false;
    let openedAt = 0;
    let lastTouchToggle = 0;
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
        const button = element('button', 'glbc-switch');
        button.type = 'button';
        button.dataset.action = 'toggle';
        button.dataset.uid = String(uid);
        button.dataset.state = 'loading';
        button.setAttribute('role', 'switch');
        button.setAttribute('aria-checked', 'false');
        button.disabled = true;
        return button;
    }

    function makeEntryRow(uid, fallbackLabel, level = 0) {
        const row = element('div', 'glbc-tree-row');
        row.dataset.uid = String(uid);
        row.dataset.label = fallbackLabel;
        row.style.setProperty('--level-indent', `${level * 2}px`);
        row.innerHTML = `<span class="glbc-node-dot"></span><span class="glbc-row-title"></span><span class="glbc-row-actions"><button class="glbc-edit-button" type="button" data-action="edit" data-uid="${uid}" title="编辑">✎</button></span>`;
        row.querySelector('.glbc-row-actions').append(makeSwitch(uid));
        row.querySelector('.glbc-row-title').textContent = fallbackLabel;
        return row;
    }

    function makeGroup(node, level = 0) {
        const group = element('section', 'glbc-tree-group');
        group.dataset.groupId = node.id;
        group.dataset.open = level < 2 ? 'true' : 'false';
        group.style.setProperty('--group-color', node.color);
        const head = element('button', 'glbc-tree-head');
        head.type = 'button';
        head.dataset.action = 'group';
        head.innerHTML = `<span class="glbc-tree-icon"></span><span class="glbc-tree-name"></span><span class="glbc-group-add" role="button" tabindex="0" data-action="new-entry" data-module="${node.id}" title="在此分组新建">＋</span><span class="glbc-chevron">›</span>`;
        head.querySelector('.glbc-tree-icon').textContent = node.icon;
        head.querySelector('.glbc-tree-name').textContent = node.label;
        const body = element('div', 'glbc-tree-children');
        if (node.start) body.append(makeEntryRow(node.start[0], node.start[1], level + 1));
        if (node.overview) body.append(makeEntryRow(node.overview[0], node.overview[1], level + 1));
        if (node.extra) node.extra.forEach(item => body.append(makeEntryRow(item[0], item[1], level + 1)));
        if (node.children?.length) {
            if (Array.isArray(node.children[0])) node.children.forEach(item => body.append(makeEntryRow(item[0], item[1], level + 1)));
            else node.children.forEach(child => body.append(makeGroup(child, level + 1)));
        }
        if (node.end) body.append(makeEntryRow(node.end[0], node.end[1], level + 1));
        group.append(head, body);
        return group;
    }

    function makeDynamicSectionGroup(entry, level = 1) {
        const uid = uidKey(entry?.uid ?? entry?.id);
        const label = String(entry?.comment ?? '').replace(/^\[section\]/, '').trim() || `一级主干 #${uid}`;
        const group = makeGroup({
            id: `section:${uid}`,
            label,
            icon: '纲',
            color: '#38bdf8',
            start: [uid, label],
            children: [],
        }, level);
        group.classList.add('is-dynamic-section');
        group.dataset.sectionUid = uid;
        return group;
    }

    function buildTree() {
        treeHost.replaceChildren(...TREE.map(node => makeGroup(node, 0)));
    }

    function groupBodyByModule(moduleId) {
        if (moduleId?.startsWith?.('section:')) return treeHost.querySelector(`[data-group-id="${moduleId}"] > .glbc-tree-children`);
        if (moduleId === 'overview') return treeHost.querySelector('[data-group-id="world"] > .glbc-tree-children');
        return treeHost.querySelector(`[data-group-id="${moduleId}"] > .glbc-tree-children`);
    }

    function endUidsForModule(moduleId) {
        if (moduleId?.startsWith?.('section:')) return [];
        if (moduleId === 'overview') return ['21'];
        if (moduleId === 'rules') return ['21'];
        return {
            timeline: ['99'],
            league: ['199'],
            club: ['299'],
            tactic: ['399'],
            position: ['499'],
        }[moduleId] ?? [];
    }

    function syncDynamicRows(book) {
        treeHost.querySelectorAll('.glbc-tree-row.is-dynamic').forEach(row => row.remove());
        treeHost.querySelectorAll('.glbc-tree-group.is-dynamic-section').forEach(group => group.remove());
        const entries = Object.values(book?.entries ?? {})
            .filter(entry => !STATIC_UIDS.has(uidKey(entry?.uid ?? entry?.id)))
            .sort((a, b) => Number(a?.displayIndex ?? a?.uid ?? 0) - Number(b?.displayIndex ?? b?.uid ?? 0));
        const worldBody = groupBodyByModule('overview');
        const worldEndRow = worldBody ? [...worldBody.querySelectorAll(':scope > .glbc-tree-row')]
            .find(item => item.dataset.uid === '21') : null;
        for (const entry of entries) {
            const uid = uidKey(entry?.uid ?? entry?.id);
            if (!uid || moduleFromComment(entry.comment) !== 'section' || !worldBody) continue;
            const group = makeDynamicSectionGroup(entry, 1);
            if (worldEndRow) worldBody.insertBefore(group, worldEndRow);
            else worldBody.append(group);
        }
        for (const entry of entries) {
            const uid = uidKey(entry?.uid ?? entry?.id);
            if (!uid) continue;
            const moduleId = moduleFromComment(entry.comment);
            if (moduleId === 'section') continue;
            const body = groupBodyByModule(moduleId);
            if (!body) continue;
            const row = makeEntryRow(uid, entry.comment || `自定义节点 ${uid}`, 1);
            row.classList.add('is-dynamic');
            row.dataset.module = moduleId;
            const endUids = endUidsForModule(moduleId);
            const endRow = [...body.querySelectorAll(':scope > .glbc-tree-row')]
                .find(item => item.dataset.uid && endUids.includes(item.dataset.uid));
            if (endRow) body.insertBefore(row, endRow);
            else body.append(row);
        }
    }

    async function refreshTree(force = false) {
        const rows = [...treeHost.querySelectorAll('.glbc-tree-row')];
        const switches = rows.map(row => row.querySelector('.glbc-switch'));
        switches.forEach(button => {
            button.disabled = true;
            button.dataset.state = 'loading';
        });
        try {
            const book = await store.load({ force });
            syncDynamicRows(book);
            const rows = [...treeHost.querySelectorAll('.glbc-tree-row')];
            const switches = rows.map(row => row.querySelector('.glbc-switch'));
            const states = await store.getStates(rows.map(row => row.dataset.uid), { force: false });
            rows.forEach(row => {
                const uid = row.dataset.uid;
                const entry = findEntry(book, uid);
                const title = entry?.comment || row.dataset.label || uid;
                const kind = nodeKind(entry);
                const dot = row.querySelector('.glbc-node-dot');
                row.querySelector('.glbc-row-title').innerHTML = `<span>${esc(title)}</span> <span class="glbc-node-meta">#${esc(uid)}</span>`;
                row.classList.toggle('is-tag-node', kind === 'tag');
                row.classList.toggle('is-blue-node', kind === 'blue');
                row.classList.toggle('is-green-node', kind === 'green');
                dot.className = `glbc-node-dot is-${kind}`;
                row.dataset.search = `${uid} ${title} ${entryKeys(entry).join(' ')} ${String(entry?.content ?? '').slice(0, 200)}`.toLowerCase();
                const button = row.querySelector('.glbc-switch');
                const enabled = states.get(uid);
                button.disabled = false;
                button.dataset.state = enabled === null ? 'unknown' : 'ready';
                button.setAttribute('aria-checked', String(enabled === true));
            });
            setStatus('世界树已同步');
            applySearch();
            if (activeUid) await renderEditor(activeUid, false);
        } catch (error) {
            switches.forEach(button => {
                button.disabled = false;
                button.dataset.state = 'unknown';
            });
            setStatus('读取失败，请重试', 'error');
            console.error('[绿茵世界书管理器] 读取失败', error);
        }
    }

    function applySearch() {
        const query = search.value.trim().toLowerCase();
        const rows = [...treeHost.querySelectorAll('.glbc-tree-row')];
        if (!query) {
            rows.forEach(row => { row.hidden = false; });
            return;
        }
        rows.forEach(row => {
            const visible = row.dataset.search?.includes(query);
            row.hidden = !visible;
            if (visible) {
                let group = row.closest('.glbc-tree-group');
                while (group) {
                    group.dataset.open = 'true';
                    group = group.parentElement?.closest?.('.glbc-tree-group');
                }
            }
        });
    }

    async function toggleOne(button) {
        const enabled = button.getAttribute('aria-checked') !== 'true';
        button.setAttribute('aria-checked', String(enabled));
        button.disabled = true;
        setStatus('正在保存开关...');
        try {
            await store.setState(button.dataset.uid, enabled);
            setStatus('开关已保存');
        } catch (error) {
            button.setAttribute('aria-checked', String(!enabled));
            setStatus('保存失败，已恢复', 'error');
            console.error('[绿茵世界书管理器] 保存失败', error);
        } finally {
            button.disabled = false;
        }
    }

    async function renderEditor(uid, markActive = true) {
        const book = await store.load();
        const entry = findEntry(book, uid);
        if (!entry) {
            editor.innerHTML = '<div class="glbc-editor-empty">没有找到这个节点。</div>';
            return;
        }
        activeUid = String(uid);
        if (markActive) {
            treeHost.querySelectorAll('.glbc-tree-row').forEach(row => row.classList.toggle('is-active', row.dataset.uid === activeUid));
        }
        const kind = nodeKind(entry);
        const canDelete = !STATIC_UIDS.has(uidKey(uid));
        editor.innerHTML = `
            <div class="glbc-form-row">
                <label>节点标题</label>
                <input class="glbc-input" data-field="comment" value="${esc(entry.comment ?? '')}">
            </div>
            <div class="glbc-form-row">
                <label>关键词（绿灯节点使用，逗号或换行分隔）</label>
                <input class="glbc-input" data-field="keys" value="${esc(joinKeys(entryKeys(entry)))}">
            </div>
            <div class="glbc-editor-flags">
                <span>编号 #${esc(uid)}</span>
                <span>类型 ${kind === 'blue' ? '蓝灯总览' : kind === 'green' ? '绿灯子条目' : '结构标签'}</span>
                <span>深度 ${esc(entry.depth ?? entry.extensions?.depth ?? '')}</span>
                <span>顺序 ${esc(entry.order ?? '')}</span>
            </div>
            <div class="glbc-form-row">
                <label>正文内容</label>
                <textarea class="glbc-textarea" data-field="content">${esc(entry.content ?? '')}</textarea>
            </div>
            <div class="glbc-editor-actions">
                ${canDelete ? '<button class="glbc-action danger" type="button" data-action="delete-entry">删除节点</button>' : ''}
                <button class="glbc-action" type="button" data-action="reload-entry">放弃修改</button>
                <button class="glbc-action primary" type="button" data-action="save-entry">保存节点</button>
            </div>`;
    }

    function renderNewEntryForm(defaultModule = 'rules') {
        activeUid = '';
        treeHost.querySelectorAll('.glbc-tree-row').forEach(row => row.classList.remove('is-active'));
        const dynamicSections = [...treeHost.querySelectorAll('.glbc-tree-group.is-dynamic-section')]
            .map(group => ({ value: group.dataset.groupId, label: group.querySelector('.glbc-tree-name')?.textContent || group.dataset.groupId }));
        const selectedModule = defaultModule === 'world'
            ? 'section'
            : (MODULES[defaultModule] || defaultModule?.startsWith?.('section:') ? defaultModule : 'rules');
        const selectedKind = selectedModule === 'section' ? 'section' : (selectedModule === 'rules' || selectedModule === 'overview' ? 'rule' : 'green');
        const baseModuleOptions = Object.entries(MODULES)
            .filter(([value]) => value !== 'section')
            .map(([value, item]) => `<option value="${value}"${value === selectedModule ? ' selected' : ''}>${esc(item.label)}</option>`).join('');
        const sectionOption = `<option value="section"${selectedModule === 'section' ? ' selected' : ''}>一级主干</option>`;
        const dynamicOptions = dynamicSections.map(item => `<option value="${esc(item.value)}"${item.value === selectedModule ? ' selected' : ''}>${esc(item.label)} · 子条目</option>`).join('');
        const moduleOptions = `${sectionOption}${baseModuleOptions}${dynamicOptions}`;
        editor.innerHTML = `
            <div class="glbc-form-row">
                <label>挂载模块</label>
                <select class="glbc-select" data-field="new-module">${moduleOptions}</select>
            </div>
            <div class="glbc-form-row">
                <label>节点类型</label>
                <select class="glbc-select" data-field="new-kind">
                    <option value="section"${selectedKind === 'section' ? ' selected' : ''}>一级主干/一级标题</option>
                    <option value="green"${selectedKind === 'green' ? ' selected' : ''}>绿灯子条目</option>
                    <option value="blue"${selectedKind === 'blue' ? ' selected' : ''}>蓝灯大节点/树干</option>
                    <option value="rule"${selectedKind === 'rule' ? ' selected' : ''}>常开规则/树干</option>
                </select>
            </div>
            <div class="glbc-form-row">
                <label>节点标题</label>
                <input class="glbc-input" data-field="new-comment" value="">
            </div>
            <div class="glbc-form-row">
                <label>关键词（仅绿灯子条目使用，逗号或换行分隔）</label>
                <input class="glbc-input" data-field="new-keys" value="">
            </div>
            <div class="glbc-editor-flags">
                <span>新节点会自动分配编号</span>
                <span>默认启用</span>
            </div>
            <div class="glbc-form-row">
                <label>正文内容</label>
                <textarea class="glbc-textarea" data-field="new-content"></textarea>
            </div>
            <div class="glbc-editor-actions">
                <button class="glbc-action" type="button" data-action="new-entry">清空重填</button>
                <button class="glbc-action primary" type="button" data-action="create-entry">创建节点</button>
            </div>`;
    }






    async function createEntry() {
        const book = await store.load();
        const moduleId = editor.querySelector('[data-field="new-module"]')?.value || 'overview';
        const selectedKind = editor.querySelector('[data-field="new-kind"]')?.value || 'green';
        const kind = moduleId === 'section' ? 'section' : (selectedKind === 'section' ? 'section' : selectedKind);
        const rawComment = editor.querySelector('[data-field="new-comment"]')?.value.trim() || '新资料节点';
        const content = editor.querySelector('[data-field="new-content"]')?.value ?? '';
        const keys = splitKeys(editor.querySelector('[data-field="new-keys"]')?.value ?? '');
        const uid = nextUid(book);
        const template = findEntry(book, templateUid(moduleId, kind)) || Object.values(book.entries ?? {})[0] || {};
        const entry = clone(template);
        entry.displayIndex = maxDisplayIndex(book) + 1;
        if (entry.extensions) entry.extensions.display_index = entry.displayIndex;
        setEntryShape(entry, { uid, moduleId, kind, comment: rawComment, content, keys });
        const snapshot = clone(book);
        try {
            if (Array.isArray(book.entries)) book.entries.push(entry);
            else book.entries[String(uid)] = entry;
            if (Array.isArray(book.originalData?.entries)) {
                const legacy = clone(entry);
                legacy.id = Number(uid);
                legacy.keys = kind === 'green' ? keys : [];
                legacy.enabled = true;
                legacy.position = 'before_char';
                legacy.insertion_order = orderFor(moduleId, kind);
                book.originalData.entries.push(legacy);
            }
            setStatus('正在创建节点...');
            await getSaveWorldInfo()(BOOK_FILE, clone(book), true, { refreshEditor: true });
            setStatus(`节点 #${uid} 已创建`);
            await refreshTree(true);
            await renderEditor(uid);
        } catch (error) {
            Object.assign(book, snapshot);
            setStatus('创建节点失败', 'error');
            console.error('[绿茵世界书管理器] 创建节点失败', error);
        }
    }


    async function deleteActiveEntry() {
        if (!activeUid || STATIC_UIDS.has(uidKey(activeUid))) return;
        const book = await store.load();
        const entry = findEntry(book, activeUid);
        if (!entry) throw new Error(`Entry not found: ${activeUid}`);
        const title = String(entry.comment ?? `#${activeUid}`);
        const childEntries = moduleFromComment(entry.comment) === 'section'
            ? Object.values(book?.entries ?? {}).filter(item => moduleFromComment(item?.comment) === `section:${activeUid}`)
            : [];
        const message = childEntries.length
            ? `确定删除「${title}」以及它下面的 ${childEntries.length} 个子条目吗？`
            : `确定删除「${title}」吗？`;
        if (!hostWindow.confirm(message)) return;
        const snapshot = clone(book);
        try {
            removeEntryByUid(book, activeUid);
            childEntries.forEach(item => removeEntryByUid(book, item?.uid ?? item?.id));
            setStatus('正在删除节点...');
            await getSaveWorldInfo()(BOOK_FILE, clone(book), true, { refreshEditor: true });
            const deletedCount = childEntries.length + 1;
            activeUid = '';
            editor.innerHTML = `<div class="glbc-editor-empty">已删除 ${deletedCount} 个节点。</div>`;
            setStatus(`已删除 ${deletedCount} 个节点`);
            await refreshTree(true);
        } catch (error) {
            Object.assign(book, snapshot);
            setStatus('删除节点失败', 'error');
            console.error('[绿茵世界书管理器] 删除节点失败', error);
        }
    }

    async function saveActiveEntry() {
        if (!activeUid) return;
        const book = await store.load();
        const entry = findEntry(book, activeUid);
        if (!entry) throw new Error(`Entry not found: ${activeUid}`);
        const comment = editor.querySelector('[data-field="comment"]')?.value ?? '';
        const content = editor.querySelector('[data-field="content"]')?.value ?? '';
        const keys = splitKeys(editor.querySelector('[data-field="keys"]')?.value ?? '');
        const snapshot = clone(book);
        try {
            updateEntryFields(entry, comment, content, keys);
            const legacy = findLegacyEntry(book, activeUid);
            if (legacy) updateEntryFields(legacy, comment, content, keys);
            setStatus('正在保存节点...');
            await getSaveWorldInfo()(BOOK_FILE, clone(book), true, { refreshEditor: true });
            setStatus('节点已保存');
            await refreshTree(true);
        } catch (error) {
            Object.assign(book, snapshot);
            setStatus('节点保存失败', 'error');
            console.error('[绿茵世界书管理器] 节点保存失败', error);
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
        const width = Math.min(980, hostWindow.innerWidth - 24);
        const height = Math.min(760, hostWindow.innerHeight - 24);
        let left = rect.left - width - 12;
        if (left < 12) left = rect.right + 12;
        panel.style.left = `${Math.max(12, Math.min(hostWindow.innerWidth - width - 12, left))}px`;
        panel.style.top = `${Math.max(12, Math.min(hostWindow.innerHeight - height - 12, rect.top))}px`;
    }

    function positionMobileLauncher() {
        if (hostWindow.innerWidth > 760) return;
        launcher.style.left = 'auto';
        launcher.style.top = 'auto';
        launcher.style.right = '16px';
        launcher.style.bottom = `calc(18px + env(safe-area-inset-bottom, 0px))`;
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
        buildTree();
        await refreshTree(true);
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
        item.title = '打开绿茵世界书管理器';
        item.innerHTML = '<div class="fa-fw fa-solid fa-futbol extensionsMenuExtensionButton"></div><span>绿茵世界书管理器</span>';
        item.addEventListener('click', event => {
            event.preventDefault();
            const wandButton = hostDocument.getElementById('extensionsMenuButton');
            if (hostWindow.getComputedStyle(extensionsMenu).display !== 'none') wandButton?.click();
            void openPanel(true);
        }, eventOptions);
        container.append(item);
        extensionsMenu.append(container);
    }

    panel.addEventListener('click', event => {
        const button = event.target.closest('[data-action]');
        if (!button || !panel.contains(button)) return;
        if (button.dataset.action === 'new-entry') {
            event.preventDefault();
            event.stopPropagation();
        }
        const action = button.dataset.action;
        if (action === 'close') closePanel();
        else if (action === 'refresh') void refreshTree(true);
        else if (action === 'group') {
            const group = button.closest('.glbc-tree-group');
            group.dataset.open = String(group.dataset.open !== 'true');
        } else if (action === 'toggle') void toggleOne(button);
        else if (action === 'edit') void renderEditor(button.dataset.uid);
        else if (action === 'save-entry') void saveActiveEntry();
        else if (action === 'delete-entry') void deleteActiveEntry();
        else if (action === 'reload-entry') void renderEditor(activeUid);
        else if (action === 'new-entry') renderNewEntryForm(button.dataset.module);
        else if (action === 'create-entry') void createEntry();
    }, eventOptions);

    search.addEventListener('input', applySearch, eventOptions);

    launcher.addEventListener('pointerdown', event => {
        if (event.pointerType === 'touch' || hostWindow.innerWidth <= 760) {
            return;
        }
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
        };
        launcher.addEventListener('pointermove', move);
        launcher.addEventListener('pointerup', up);
        launcher.addEventListener('pointercancel', up);
    }, eventOptions);

    launcher.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (Date.now() - lastTouchToggle < 500) return;
        if (dragged) {
            dragged = false;
            return;
        }
        if (panel.hidden) void openPanel();
        else closePanel();
    }, eventOptions);

    launcher.addEventListener('touchend', event => {
        event.preventDefault();
        event.stopPropagation();
        lastTouchToggle = Date.now();
        dragged = false;
        if (panel.hidden) void openPanel();
        else closePanel();
    }, eventOptions);

    hostDocument.addEventListener('pointerdown', event => {
        if (Date.now() - openedAt < 350) return;
        if (!panel.hidden && !panel.contains(event.target) && !launcher.contains(event.target)) closePanel();
    }, eventOptions);
    hostDocument.addEventListener('keydown', event => {
        if (event.key === 'Escape') closePanel();
    }, eventOptions);
    hostWindow.addEventListener('resize', () => {
        syncCompactLayout();
        positionMobileLauncher();
        positionMobilePanel();
        if (!panel.hidden) positionPanel();
    }, eventOptions);
    viewport?.addEventListener('resize', syncCompactLayout, eventOptions);
    viewport?.addEventListener('scroll', syncCompactLayout, eventOptions);
    syncCompactLayout();
    positionMobileLauncher();
    registerWandMenuEntry();

    hostWindow[cleanupKey] = () => {
        events.abort();
        clearTimeout(wandRetryTimer);
        store.flush().catch(error => console.error('[绿茵世界书管理器] 清理时保存失败', error));
        hostDocument.querySelectorAll(`[data-glbc-owner="${scriptId}"]`).forEach(node => node.remove());
    };
})();

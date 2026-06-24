import { createLoreBookStore } from '../drgon_book/lore-book-controller-store.js?v=20260624-store1';
import { BOOK_FILE, MODULES, STATIC_UIDS, TREE, entryKeys, esc, findEntry, isSectionModule, isSubsectionModule, joinKeys, moduleFromComment, nodeKind, parseSubsectionModule, sectionModuleId, stripEntryPrefixes, subsectionFromComment, subsectionModuleId, uidKey } from './green-lore-book-controller-core.js?v=20260624-placement2';
import { createGreenLoreBookTreeState } from './green-lore-book-controller-state.js?v=20260624-state2';
import { createGreenLoreBookActions } from './green-lore-book-controller-actions.js?v=20260624-actions2';

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

    const cssHref = new URL('./green-lore-book-controller.css?v=20260624-css1', import.meta.url).href;
    const css = `@import url("${cssHref}");`;
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
    let draggedEntryUid = '';
    let draggedSubsectionModuleId = '';
    let suppressGroupClickUntil = 0;
    let openedAt = 0;
    let lastTouchToggle = 0;
    let forceCompact = false;
    let wandRetryTimer;
    let wandRetryCount = 0;
    const subsectionParentModules = new Set(['timeline', 'league', 'club', 'tactic', 'position', 'rules']);
    const defaultSubsectionTitle = '未分组三级标题';
    const treeState = createGreenLoreBookTreeState({
        storage: hostWindow.localStorage,
        scriptId,
        bookFile: BOOK_FILE,
        defaultSubsectionTitle,
        uidKey,
        subsectionFromComment,
    });
    let actions;

    function canHaveSubsections(moduleId) {
        return subsectionParentModules.has(String(moduleId ?? '')) || isSectionModule(moduleId);
    }

    function modulePrefix(moduleId) {
        if (isSectionModule(moduleId)) return `[${moduleId}]`;
        return MODULES[moduleId]?.prefix ?? MODULES.rules.prefix;
    }

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

    function dragTargetGroup(target) {
        const group = target?.closest?.('.glbc-tree-group');
        if (!group) return null;
        const moduleId = group.dataset.groupId;
        if (isSubsectionModule(moduleId) || canHaveSubsections(moduleId)) return group;
        return null;
    }

    function clearDragState() {
        if (draggedEntryUid || draggedSubsectionModuleId) suppressGroupClickUntil = Date.now() + 350;
        draggedEntryUid = '';
        draggedSubsectionModuleId = '';
        treeHost.querySelectorAll('.is-dragging,.is-drag-over').forEach(node => {
            node.classList.remove('is-dragging', 'is-drag-over');
        });
    }

    async function moveEntryToSubsection(uid, targetModuleId, subsectionTitle = '') {
        await actions.moveEntryToSubsection(uid, targetModuleId, subsectionTitle);
    }

    async function moveSubsectionToParent(sourceModuleId, targetParentModuleId, targetSubsectionTitle = '', insertAfter = false) {
        await actions.moveSubsectionToParent(sourceModuleId, targetParentModuleId, targetSubsectionTitle, insertAfter);
    }

    function insertGroupBeforeModuleEnd(parentModuleId, group) {
        const parentBody = groupBodyByModule(parentModuleId);
        if (!parentBody) return;
        const endUids = endUidsForModule(parentModuleId);
        const endRow = [...parentBody.querySelectorAll(':scope > .glbc-tree-row')]
            .find(item => item.dataset.uid && endUids.includes(item.dataset.uid));
        if (endRow) parentBody.insertBefore(group, endRow);
        else parentBody.append(group);
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
        row.innerHTML = `<span class="glbc-node-dot"></span><span class="glbc-row-title"></span><span class="glbc-row-actions"><button class="glbc-edit-button" type="button" data-action="edit" data-uid="${uid}" title="编辑">✎</button><button class="glbc-edit-button danger" type="button" data-action="delete-entry" data-uid="${uid}" title="删除" hidden>×</button></span>`;
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
        head.innerHTML = `<span class="glbc-tree-icon"></span><span class="glbc-tree-name"></span><span class="glbc-group-add" role="button" tabindex="0" data-action="new-entry" data-module="${node.id}" title="在此分组新建">＋</span><span class="glbc-group-remove" role="button" tabindex="0" data-action="delete-subsection" data-module="${node.id}" title="删除这个二级标题" hidden>×</span><span class="glbc-chevron">›</span>`;
        const addButton = head.querySelector('.glbc-group-add');
        const removeButton = head.querySelector('.glbc-group-remove');
        if (isSubsectionModule(node.id)) {
            const subsection = parseSubsectionModule(node.id);
            addButton.classList.add('is-subsection-add');
            addButton.title = '在此二级标题下新建三级条目';
            addButton.textContent = '＋';
            if (subsection?.title && subsection.title !== defaultSubsectionTitle) removeButton.hidden = false;
        } else if (canHaveSubsections(node.id)) {
            addButton.dataset.action = 'new-subsection';
            addButton.title = '在此一级标题下新建二级标题';
            addButton.textContent = '＋';
        }
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

    function makeVirtualSubsectionGroup({ parentModuleId, title }, level = 2) {
        const moduleId = subsectionModuleId(parentModuleId, title);
        const group = makeGroup({
            id: moduleId,
            label: title || '未命名二级标题',
            icon: '节',
            color: '#93c5fd',
            children: [],
        }, level);
        group.classList.add('is-virtual-subsection');
        group.dataset.parentModule = parentModuleId;
        group.dataset.subsectionTitle = title;
        group.dataset.virtual = 'true';
        if (title !== defaultSubsectionTitle) group.querySelector(':scope > .glbc-tree-head').draggable = true;
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

    function ensureSubsectionGroup(parentModuleId, title) {
        const moduleId = subsectionModuleId(parentModuleId, title);
        let body = groupBodyByModule(moduleId);
        if (body) return body;
        if (!groupBodyByModule(parentModuleId)) return null;
        insertGroupBeforeModuleEnd(parentModuleId, makeVirtualSubsectionGroup({ parentModuleId, title }, isSectionModule(parentModuleId) ? 2 : 1));
        return groupBodyByModule(moduleId);
    }

    function moveDirectGreenRowsIntoDefaultSubsection(book, parentModuleId) {
        const parentBody = groupBodyByModule(parentModuleId);
        if (!parentBody) return;
        const rows = [...parentBody.querySelectorAll(':scope > .glbc-tree-row')]
            .filter(row => {
                const entry = findEntry(book, row.dataset.uid);
                return nodeKind(entry) === 'green' && !treeState.placementForEntry(entry);
            });
        if (!rows.length) return;
        const defaultBody = ensureSubsectionGroup(parentModuleId, defaultSubsectionTitle);
        rows.forEach(row => defaultBody?.append(row));
    }

    function movePlacedStaticRows(book) {
        for (const row of [...treeHost.querySelectorAll('.glbc-tree-row:not(.is-dynamic)')]) {
            const entry = findEntry(book, row.dataset.uid);
            if (!entry || nodeKind(entry) !== 'green') continue;
            const placement = treeState.placementForEntry(entry);
            if (!placement?.parentModuleId || !placement.title) continue;
            const body = ensureSubsectionGroup(placement.parentModuleId, placement.title);
            body?.append(row);
        }
    }

    function buildTree() {
        treeHost.replaceChildren(...TREE.map(node => makeGroup(node, 0)));
    }

    function groupBodyByModule(moduleId) {
        if (isSubsectionModule(moduleId)) return treeHost.querySelector(`[data-group-id="${moduleId}"] > .glbc-tree-children`);
        if (isSectionModule(moduleId)) return treeHost.querySelector(`[data-group-id="${moduleId}"] > .glbc-tree-children`);
        if (moduleId === 'overview') return treeHost.querySelector('[data-group-id="world"] > .glbc-tree-children');
        return treeHost.querySelector(`[data-group-id="${moduleId}"] > .glbc-tree-children`);
    }

    function endUidsForModule(moduleId) {
        if (isSectionModule(moduleId) || isSubsectionModule(moduleId)) return [];
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
        treeHost.querySelectorAll('.glbc-tree-group.is-virtual-subsection').forEach(group => group.remove());
        treeHost.querySelectorAll('.glbc-tree-group.is-dynamic-section').forEach(group => group.remove());
        const allEntries = Object.values(book?.entries ?? {});
        const entries = allEntries
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
        const subsectionParents = [
            ...subsectionParentModules,
            ...entries
                .filter(entry => moduleFromComment(entry.comment) === 'section')
                .map(entry => sectionModuleId(entry?.uid ?? entry?.id)),
        ];
        for (const parentModuleId of subsectionParents) {
            const parentBody = groupBodyByModule(parentModuleId);
            if (!parentBody) continue;
            for (const title of treeState.subsectionTitlesFor(parentModuleId, allEntries)) {
                insertGroupBeforeModuleEnd(parentModuleId, makeVirtualSubsectionGroup({ parentModuleId, title }, isSectionModule(parentModuleId) ? 2 : 1));
            }
        }
        for (const entry of entries) {
            const uid = uidKey(entry?.uid ?? entry?.id);
            if (!uid) continue;
            const moduleId = moduleFromComment(entry.comment);
            if (moduleId === 'section') continue;
            const placement = treeState.placementForEntry(entry);
            const targetModuleId = placement?.title
                ? subsectionModuleId(placement.parentModuleId, placement.title)
                : (canHaveSubsections(moduleId) && nodeKind(entry) === 'green' ? subsectionModuleId(moduleId, defaultSubsectionTitle) : moduleId);
            const body = isSubsectionModule(targetModuleId)
                ? ensureSubsectionGroup(placement?.parentModuleId || moduleId, placement?.title || defaultSubsectionTitle)
                : groupBodyByModule(targetModuleId);
            if (!body) continue;
            const row = makeEntryRow(uid, entry.comment || `自定义节点 ${uid}`, 1);
            row.classList.add('is-dynamic');
            row.dataset.module = targetModuleId;
            const endUids = endUidsForModule(targetModuleId);
            const endRow = [...body.querySelectorAll(':scope > .glbc-tree-row')]
                .find(item => item.dataset.uid && endUids.includes(item.dataset.uid));
            if (endRow) body.insertBefore(row, endRow);
            else body.append(row);
        }
        movePlacedStaticRows(book);
        for (const parentModuleId of subsectionParents) {
            moveDirectGreenRowsIntoDefaultSubsection(book, parentModuleId);
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
            buildTree();
            syncDynamicRows(book);
            const rows = [...treeHost.querySelectorAll('.glbc-tree-row')];
            const switches = rows.map(row => row.querySelector('.glbc-switch'));
            const states = await store.getStates(rows.map(row => row.dataset.uid), { force: false });
            rows.forEach(row => {
                const uid = row.dataset.uid;
                const entry = findEntry(book, uid);
                if (!entry) {
                    row.remove();
                    return;
                }
                const kind = nodeKind(entry);
                const rawTitle = entry?.comment || row.dataset.label || uid;
                const title = kind === 'tag' ? rawTitle : (stripEntryPrefixes(rawTitle) || rawTitle);
                const dot = row.querySelector('.glbc-node-dot');
                row.querySelector('.glbc-row-title').innerHTML = `<span>${esc(title)}</span> <span class="glbc-node-meta">#${esc(uid)}</span>`;
                row.classList.toggle('is-tag-node', kind === 'tag');
                row.classList.toggle('is-blue-node', kind === 'blue');
                row.classList.toggle('is-green-node', kind === 'green');
                row.draggable = kind === 'green';
                row.title = kind === 'green' ? '拖到二级标题可归纳；拖到一级标题可移出二级标题' : '';
                const deleteButton = row.querySelector('[data-action="delete-entry"]');
                if (deleteButton) deleteButton.hidden = kind === 'tag';
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
        const canDelete = kind !== 'tag';
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
        const dynamicSubsections = [...treeHost.querySelectorAll('.glbc-tree-group.is-virtual-subsection')]
            .map(group => ({ value: group.dataset.groupId, label: group.querySelector('.glbc-tree-name')?.textContent || group.dataset.groupId }));
        const selectedModule = defaultModule === 'world'
            ? 'section'
            : (MODULES[defaultModule] || isSectionModule(defaultModule) || isSubsectionModule(defaultModule) ? defaultModule : 'rules');
        const selectedKind = selectedModule === 'section' ? 'section' : (selectedModule === 'rules' || selectedModule === 'overview' ? 'rule' : 'green');
        const baseModuleOptions = Object.entries(MODULES)
            .filter(([value]) => value !== 'section')
            .map(([value, item]) => `<option value="${value}"${value === selectedModule ? ' selected' : ''}>${esc(item.label)}</option>`).join('');
        const sectionOption = `<option value="section"${selectedModule === 'section' ? ' selected' : ''}>一级主干</option>`;
        const dynamicOptions = dynamicSections.map(item => `<option value="${esc(item.value)}"${item.value === selectedModule ? ' selected' : ''}>${esc(item.label)} · 子条目</option>`).join('');
        const subsectionOptions = dynamicSubsections.map(item => `<option value="${esc(item.value)}"${item.value === selectedModule ? ' selected' : ''}>${esc(item.label)} · 三级条目</option>`).join('');
        const moduleOptions = `${sectionOption}${baseModuleOptions}${dynamicOptions}${subsectionOptions}`;
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

    function renderNewSubsectionForm(sectionModule) {
        const parentModuleId = String(sectionModule ?? '').trim();
        if (!canHaveSubsections(parentModuleId)) {
            renderNewEntryForm(sectionModule);
            return;
        }
        activeUid = '';
        treeHost.querySelectorAll('.glbc-tree-row').forEach(row => row.classList.remove('is-active'));
        const sectionGroup = treeHost.querySelector(`[data-group-id="${parentModuleId}"]`);
        const sectionLabel = sectionGroup?.querySelector('.glbc-tree-name')?.textContent || MODULES[parentModuleId]?.label || parentModuleId;
        editor.innerHTML = `
            <div class="glbc-form-row">
                <label>所属一级标题</label>
                <input class="glbc-input" value="${esc(sectionLabel)}" disabled>
            </div>
            <div class="glbc-form-row">
                <label>二级标题名称</label>
                <input class="glbc-input" data-field="new-subsection-title" value="">
            </div>
            <div class="glbc-editor-flags">
                <span>二级标题只用于控制器收纳</span>
                <span>不会创建真实世界书条目</span>
                <span>已有绿灯条目仍按三级标题处理</span>
            </div>
            <div class="glbc-editor-actions">
                <button class="glbc-action" type="button" data-action="new-entry" data-module="${esc(parentModuleId)}">改建三级条目</button>
                <button class="glbc-action primary" type="button" data-action="create-subsection" data-parent-module="${esc(parentModuleId)}">创建二级标题</button>
            </div>`;
    }

    async function createSubsection(button) {
        const parentModuleId = button.dataset.parentModule;
        const title = editor.querySelector('[data-field="new-subsection-title"]')?.value.trim();
        await actions.createSubsection(parentModuleId, title);
    }

    async function deleteSubsection(button) {
        await actions.deleteSubsection(button.dataset.module);
    }

    async function renameSubsection(moduleId, nextTitle) {
        await actions.renameSubsection(moduleId, nextTitle);
    }

    async function renameDynamicSection(sectionUid, nextTitle) {
        await actions.renameDynamicSection(sectionUid, nextTitle);
    }

    async function renameEntryTitle(uid, nextTitle) {
        await actions.renameEntryTitle(uid, nextTitle);
    }

    function startInlineGroupRename(group) {
        if (!group || group.querySelector('.glbc-tree-name.is-inline-editing')) return;
        const moduleId = group.dataset.groupId;
        const canRenameSubsection = isSubsectionModule(moduleId);
        const canRenameSection = group.classList.contains('is-dynamic-section');
        if (!canRenameSubsection && !canRenameSection) return;
        const nameNode = group.querySelector(':scope > .glbc-tree-head .glbc-tree-name');
        const oldTitle = nameNode?.textContent?.trim() ?? '';
        if (!nameNode) return;
        const input = element('input', 'glbc-tree-name is-inline-editing');
        input.value = oldTitle;
        input.dataset.originalTitle = oldTitle;
        nameNode.replaceWith(input);
        input.focus();
        input.select();
        let committed = false;
        const finish = commit => {
            if (committed) return;
            committed = true;
            const nextTitle = commit ? input.value.trim() : input.dataset.originalTitle;
            const replacement = element('span', 'glbc-tree-name', nextTitle || input.dataset.originalTitle);
            input.replaceWith(replacement);
            if (!commit || !nextTitle || nextTitle === input.dataset.originalTitle) return;
            if (canRenameSubsection) void renameSubsection(moduleId, nextTitle);
            else if (canRenameSection) void renameDynamicSection(group.dataset.sectionUid, nextTitle);
        };
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') finish(true);
            else if (event.key === 'Escape') finish(false);
        }, { signal: events.signal });
        input.addEventListener('blur', () => finish(true), { signal: events.signal });
    }

    async function startInlineRowRename(row) {
        const uid = row?.dataset?.uid;
        if (!uid || row.querySelector('.glbc-row-title.is-inline-editing')) return;
        const book = await store.load();
        const entry = findEntry(book, uid);
        if (!entry || nodeKind(entry) === 'tag') return;
        const titleNode = row.querySelector('.glbc-row-title');
        if (!titleNode) return;
        const oldTitle = stripEntryPrefixes(entry.comment) || String(entry.comment ?? row.dataset.label ?? uid);
        const input = element('input', 'glbc-row-title is-inline-editing');
        input.value = oldTitle;
        input.dataset.originalTitle = oldTitle;
        titleNode.replaceWith(input);
        input.focus();
        input.select();
        let committed = false;
        const finish = commit => {
            if (committed) return;
            committed = true;
            const nextTitle = commit ? input.value.trim() : input.dataset.originalTitle;
            const replacement = element('span', 'glbc-row-title');
            replacement.append(element('span', '', input.dataset.originalTitle), ' ', element('span', 'glbc-node-meta', `#${uid}`));
            input.replaceWith(replacement);
            if (!commit || !nextTitle || nextTitle === input.dataset.originalTitle) return;
            void renameEntryTitle(uid, nextTitle);
        };
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') finish(true);
            else if (event.key === 'Escape') finish(false);
        }, { signal: events.signal });
        input.addEventListener('blur', () => finish(true), { signal: events.signal });
    }






    async function createEntry() {
        const moduleId = editor.querySelector('[data-field="new-module"]')?.value || 'overview';
        const selectedKind = editor.querySelector('[data-field="new-kind"]')?.value || 'green';
        const rawComment = editor.querySelector('[data-field="new-comment"]')?.value.trim() || '\u65b0\u8d44\u6599\u8282\u70b9';
        const content = editor.querySelector('[data-field="new-content"]')?.value ?? '';
        const keyText = editor.querySelector('[data-field="new-keys"]')?.value ?? '';
        await actions.createEntry({ moduleId, selectedKind, rawComment, content, keyText });
    }


    async function deleteEntryByUid(uid) {
        await actions.deleteEntryByUid(uid);
    }

    async function deleteActiveEntry() {
        await deleteEntryByUid(activeUid);
    }

    async function saveActiveEntry() {
        if (!activeUid) return;
        const comment = editor.querySelector('[data-field="comment"]')?.value ?? '';
        const content = editor.querySelector('[data-field="content"]')?.value ?? '';
        const keyText = editor.querySelector('[data-field="keys"]')?.value ?? '';
        await actions.saveActiveEntry({ uid: activeUid, comment, content, keyText });
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

    actions = createGreenLoreBookActions({
        store,
        treeState,
        getSaveWorldInfo,
        canHaveSubsections,
        modulePrefix,
        defaultSubsectionTitle,
        confirm: message => hostWindow.confirm(message),
        setStatus,
        refreshTree,
        renderEditor,
        getActiveUid: () => activeUid,
        setActiveUid: value => { activeUid = value; },
        setEditorHtml: html => { editor.innerHTML = html; },
    });

    panel.addEventListener('click', event => {
        const button = event.target.closest('[data-action]');
        if (!button || !panel.contains(button)) return;
        if (button.dataset.action === 'new-entry') {
            event.preventDefault();
            event.stopPropagation();
        }
        if (button.classList.contains('glbc-group-add') || button.classList.contains('glbc-group-remove')) {
            event.preventDefault();
            event.stopPropagation();
        }
        const action = button.dataset.action;
        if (action === 'close') closePanel();
        else if (action === 'refresh') void refreshTree(true);
        else if (action === 'group') {
            if (Date.now() < suppressGroupClickUntil) return;
            const group = button.closest('.glbc-tree-group');
            group.dataset.open = String(group.dataset.open !== 'true');
        } else if (action === 'toggle') void toggleOne(button);
        else if (action === 'edit') void renderEditor(button.dataset.uid);
        else if (action === 'save-entry') void saveActiveEntry();
        else if (action === 'delete-entry') void (button.dataset.uid ? deleteEntryByUid(button.dataset.uid) : deleteActiveEntry());
        else if (action === 'reload-entry') void renderEditor(activeUid);
        else if (action === 'new-entry') renderNewEntryForm(button.dataset.module);
        else if (action === 'new-subsection') renderNewSubsectionForm(button.dataset.module);
        else if (action === 'create-subsection') void createSubsection(button);
        else if (action === 'delete-subsection') void deleteSubsection(button);
        else if (action === 'create-entry') void createEntry();
    }, eventOptions);

    panel.addEventListener('dblclick', event => {
        const rowTitle = event.target.closest('.glbc-row-title');
        if (rowTitle && panel.contains(rowTitle)) {
            const row = rowTitle.closest('.glbc-tree-row');
            if (!row) return;
            event.preventDefault();
            event.stopPropagation();
            void startInlineRowRename(row);
            return;
        }
        const nameNode = event.target.closest('.glbc-tree-name');
        if (!nameNode || !panel.contains(nameNode)) return;
        const group = nameNode.closest('.glbc-tree-group');
        if (!group) return;
        event.preventDefault();
        event.stopPropagation();
        startInlineGroupRename(group);
    }, eventOptions);

    panel.addEventListener('dragstart', event => {
        const groupHead = event.target.closest('.glbc-tree-group.is-virtual-subsection > .glbc-tree-head');
        if (groupHead?.draggable === true) {
            const group = groupHead.closest('.glbc-tree-group');
            draggedSubsectionModuleId = group?.dataset.groupId || '';
            if (!draggedSubsectionModuleId) {
                event.preventDefault();
                return;
            }
            group.classList.add('is-dragging');
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', draggedSubsectionModuleId);
            return;
        }
        const row = event.target.closest('.glbc-tree-row');
        if (!row || row.draggable !== true) {
            event.preventDefault();
            return;
        }
        draggedEntryUid = row.dataset.uid;
        row.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', draggedEntryUid);
    }, eventOptions);

    panel.addEventListener('dragover', event => {
        if (!draggedEntryUid && !draggedSubsectionModuleId) return;
        const group = dragTargetGroup(event.target);
        if (!group) return;
        if (draggedSubsectionModuleId && group.dataset.groupId === draggedSubsectionModuleId) return;
        if (draggedSubsectionModuleId && !canHaveSubsections(isSubsectionModule(group.dataset.groupId) ? parseSubsectionModule(group.dataset.groupId)?.parentModuleId : group.dataset.groupId)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        treeHost.querySelectorAll('.glbc-tree-group.is-drag-over').forEach(item => {
            if (item !== group) item.classList.remove('is-drag-over');
        });
        group.classList.add('is-drag-over');
    }, eventOptions);

    panel.addEventListener('dragleave', event => {
        const group = event.target.closest?.('.glbc-tree-group.is-drag-over');
        if (group && !group.contains(event.relatedTarget)) group.classList.remove('is-drag-over');
    }, eventOptions);

    panel.addEventListener('drop', event => {
        if (!draggedEntryUid && !draggedSubsectionModuleId) return;
        const group = dragTargetGroup(event.target);
        if (!group) return;
        event.preventDefault();
        const targetModuleId = group.dataset.groupId;
        if (draggedSubsectionModuleId) {
            const sourceModuleId = draggedSubsectionModuleId;
            const targetSubsection = parseSubsectionModule(targetModuleId);
            const rect = group.getBoundingClientRect();
            const insertAfter = Boolean(targetSubsection && event.clientY > rect.top + rect.height / 2);
            clearDragState();
            void moveSubsectionToParent(sourceModuleId, targetSubsection?.parentModuleId || targetModuleId, targetSubsection?.title || '', insertAfter);
            return;
        }
        const subsection = parseSubsectionModule(targetModuleId);
        const subsectionTitle = subsection?.title || '';
        const uid = draggedEntryUid;
        clearDragState();
        void moveEntryToSubsection(uid, subsection?.parentModuleId || targetModuleId, subsectionTitle);
    }, eventOptions);

    panel.addEventListener('dragend', clearDragState, eventOptions);

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




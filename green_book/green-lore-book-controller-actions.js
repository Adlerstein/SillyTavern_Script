import { BOOK_FILE, clone, entryKeys, findEntry, findLegacyEntry, isSubsectionModule, maxDisplayIndex, moduleFromComment, nextUid, nodeKind, orderFor, parseSubsectionModule, removeEntryByUid, setEntryShape, splitKeys, stripEntryPrefixes, subsectionFromComment, templateUid, uidKey, updateEntryFields } from './green-lore-book-controller-core.js?v=20260624-placement1';

export function createGreenLoreBookActions({
    store,
    treeState,
    getSaveWorldInfo,
    canHaveSubsections,
    modulePrefix,
    defaultSubsectionTitle,
    confirm,
    setStatus,
    refreshTree,
    renderEditor,
    getActiveUid,
    setActiveUid,
    setEditorHtml,
}) {
    async function saveBook(book, forceEditorRefresh = true) {
        await getSaveWorldInfo()(BOOK_FILE, clone(book), true, { refreshEditor: forceEditorRefresh });
    }

    function updateEntryAndLegacy(book, uid, comment, content, keys, { preserveLegacyKeys = true } = {}) {
        const entry = findEntry(book, uid);
        if (entry) updateEntryFields(entry, comment, content, keys);
        const legacy = findLegacyEntry(book, uid);
        if (legacy) updateEntryFields(legacy, comment, content, preserveLegacyKeys && entryKeys(legacy).length ? entryKeys(legacy) : keys);
    }

    async function moveEntryToSubsection(uid, targetModuleId, subsectionTitle = '') {
        const book = await store.load();
        const entry = findEntry(book, uid);
        if (!entry || nodeKind(entry) !== 'green') {
            setStatus('只能拖动绿灯三级条目', 'error');
            return;
        }
        const parentModuleId = isSubsectionModule(targetModuleId)
            ? parseSubsectionModule(targetModuleId)?.parentModuleId
            : targetModuleId;
        if (!canHaveSubsections(parentModuleId)) {
            setStatus('这个位置不能收纳三级条目', 'error');
            return;
        }
        const title = stripEntryPrefixes(entry.comment) || `节点 #${uid}`;
        const cleanSubsection = subsectionTitle && subsectionTitle !== defaultSubsectionTitle ? subsectionTitle : '';
        const nextComment = `${modulePrefix(parentModuleId)}${title}`;
        const snapshot = clone(book);
        try {
            updateEntryAndLegacy(book, uid, nextComment, entry.content ?? '', entryKeys(entry));
            treeState.setPlacement(uid, parentModuleId, cleanSubsection);
            setStatus('正在归纳条目...');
            await saveBook(book);
            setStatus(cleanSubsection ? `已归纳到「${cleanSubsection}」` : '已移出二级标题');
            await refreshTree(true);
            if (getActiveUid() === String(uid)) await renderEditor(uid, false);
        } catch (error) {
            Object.assign(book, snapshot);
            setStatus('拖动归纳失败', 'error');
            console.error('[绿茵世界书管理器] 拖动归纳失败', error);
        }
    }

    async function moveSubsectionToParent(sourceModuleId, targetParentModuleId, targetSubsectionTitle = '', insertAfter = false) {
        const source = parseSubsectionModule(sourceModuleId);
        const targetParent = isSubsectionModule(targetParentModuleId)
            ? parseSubsectionModule(targetParentModuleId)?.parentModuleId
            : targetParentModuleId;
        if (!source?.parentModuleId || !source.title || source.title === defaultSubsectionTitle || !canHaveSubsections(targetParent)) return;
        if (source.parentModuleId === targetParent) {
            treeState.moveSubsection(targetParent, source.title, targetSubsectionTitle, insertAfter);
            setStatus(`二级标题「${source.title}」已调整顺序`);
            await refreshTree(false);
            return;
        }
        const book = await store.load();
        const affected = Object.values(book?.entries ?? {})
            .filter(entry => {
                const placement = treeState.placementForEntry(entry);
                const legacy = subsectionFromComment(entry?.comment);
                return (placement?.parentModuleId === source.parentModuleId && placement.title === source.title)
                    || (legacy?.parentModuleId === source.parentModuleId && legacy.title === source.title);
            });
        const snapshot = clone(book);
        try {
            treeState.removeSubsection(source.parentModuleId, source.title);
            treeState.addSubsection(targetParent, source.title);
            treeState.moveSubsection(targetParent, source.title, targetSubsectionTitle, insertAfter);
            for (const entry of affected) {
                const uid = uidKey(entry?.uid ?? entry?.id);
                const title = stripEntryPrefixes(entry.comment) || `节点 #${uid}`;
                const nextComment = `${modulePrefix(targetParent)}${title}`;
                updateEntryAndLegacy(book, uid, nextComment, entry.content ?? '', entryKeys(entry));
                treeState.setPlacement(uid, targetParent, source.title);
            }
            setStatus('正在移动二级标题...');
            await saveBook(book);
            setStatus(`二级标题「${source.title}」已移动`);
            await refreshTree(true);
        } catch (error) {
            Object.assign(book, snapshot);
            setStatus('移动二级标题失败', 'error');
            console.error('[绿茵世界书管理器] 移动二级标题失败', error);
        }
    }

    async function createSubsection(parentModuleId, title) {
        const cleanTitle = String(title ?? '').trim();
        if (!cleanTitle) {
            setStatus('二级标题不能为空', 'error');
            return;
        }
        treeState.addSubsection(parentModuleId, cleanTitle);
        setStatus(`二级标题「${cleanTitle}」已加入控制器`);
        await refreshTree(false);
    }

    async function deleteSubsection(moduleId) {
        const subsection = parseSubsectionModule(moduleId);
        if (!subsection?.parentModuleId || !subsection.title || subsection.title === defaultSubsectionTitle) return;
        const book = await store.load();
        const affected = Object.values(book?.entries ?? {})
            .filter(entry => {
                const placement = treeState.placementForEntry(entry);
                return placement?.parentModuleId === subsection.parentModuleId && placement.title === subsection.title;
            });
        const message = affected.length
            ? `删除二级标题「${subsection.title}」？下面的 ${affected.length} 个绿灯条目会移到未分组三级标题，不会被删除。`
            : `删除空二级标题「${subsection.title}」？`;
        if (!confirm(message)) return;
        const snapshot = clone(book);
        try {
            for (const entry of affected) {
                const uid = uidKey(entry?.uid ?? entry?.id);
                const nextComment = `${modulePrefix(subsection.parentModuleId)}${stripEntryPrefixes(entry.comment) || `节点 #${uid}`}`;
                updateEntryAndLegacy(book, uid, nextComment, entry.content ?? '', entryKeys(entry));
                treeState.removePlacement(uid);
            }
            treeState.removeSubsection(subsection.parentModuleId, subsection.title);
            treeState.removePlacementsForSubsection(subsection.parentModuleId, subsection.title);
            setStatus('正在删除二级标题...');
            await saveBook(book);
            setStatus(`二级标题「${subsection.title}」已删除`);
            await refreshTree(true);
        } catch (error) {
            Object.assign(book, snapshot);
            setStatus('删除二级标题失败', 'error');
            console.error('[绿茵世界书管理器] 删除二级标题失败', error);
        }
    }

    async function renameSubsection(moduleId, nextTitle) {
        const subsection = parseSubsectionModule(moduleId);
        const cleanTitle = String(nextTitle ?? '').trim();
        if (!subsection?.parentModuleId || !subsection.title || !cleanTitle || cleanTitle === subsection.title) return;
        const book = await store.load();
        const affected = subsection.title === defaultSubsectionTitle
            ? Object.values(book?.entries ?? {}).filter(entry => {
                const moduleId = moduleFromComment(entry?.comment);
                return moduleId === subsection.parentModuleId && nodeKind(entry) === 'green' && !treeState.placementForEntry(entry);
            })
            : Object.values(book?.entries ?? {}).filter(entry => {
                const current = treeState.placementForEntry(entry);
                return current?.parentModuleId === subsection.parentModuleId && current.title === subsection.title;
            });
        const snapshot = clone(book);
        try {
            for (const entry of affected) {
                const uid = uidKey(entry?.uid ?? entry?.id);
                const nextComment = `${modulePrefix(subsection.parentModuleId)}${stripEntryPrefixes(entry.comment) || `节点 #${uid}`}`;
                updateEntryAndLegacy(book, uid, nextComment, entry.content ?? '', entryKeys(entry));
                treeState.setPlacement(uid, subsection.parentModuleId, cleanTitle);
            }
            if (subsection.title !== defaultSubsectionTitle) treeState.removeSubsection(subsection.parentModuleId, subsection.title);
            treeState.addSubsection(subsection.parentModuleId, cleanTitle);
            setStatus('正在重命名二级标题...');
            await saveBook(book);
            setStatus(`二级标题已改为「${cleanTitle}」`);
            await refreshTree(true);
        } catch (error) {
            Object.assign(book, snapshot);
            setStatus('重命名二级标题失败', 'error');
            console.error('[绿茵世界书管理器] 重命名二级标题失败', error);
        }
    }

    async function renameDynamicSection(sectionUid, nextTitle) {
        const cleanTitle = String(nextTitle ?? '').trim();
        if (!sectionUid || !cleanTitle) return;
        const book = await store.load();
        const entry = findEntry(book, sectionUid);
        if (!entry || moduleFromComment(entry.comment) !== 'section') return;
        const nextComment = `[section]${cleanTitle}`;
        const snapshot = clone(book);
        try {
            updateEntryAndLegacy(book, sectionUid, nextComment, entry.content ?? '', entryKeys(entry));
            setStatus('正在重命名一级标题...');
            await saveBook(book);
            setStatus(`一级标题已改为「${cleanTitle}」`);
            await refreshTree(true);
            if (getActiveUid() === String(sectionUid)) await renderEditor(sectionUid, false);
        } catch (error) {
            Object.assign(book, snapshot);
            setStatus('重命名一级标题失败', 'error');
            console.error('[绿茵世界书管理器] 重命名一级标题失败', error);
        }
    }

    async function renameEntryTitle(uid, nextTitle) {
        const targetUid = uidKey(uid);
        const cleanTitle = String(nextTitle ?? '').trim();
        if (!targetUid || !cleanTitle) return;
        const book = await store.load();
        const entry = findEntry(book, targetUid);
        if (!entry || nodeKind(entry) === 'tag') return;
        const moduleId = moduleFromComment(entry.comment);
        const placement = treeState.placementForEntry(entry);
        const parentModuleId = placement?.parentModuleId || moduleId;
        const nextComment = moduleId === 'section'
            ? `[section]${cleanTitle}`
            : `${modulePrefix(parentModuleId)}${cleanTitle}`;
        const snapshot = clone(book);
        try {
            updateEntryAndLegacy(book, targetUid, nextComment, entry.content ?? '', entryKeys(entry));
            setStatus('正在重命名节点...');
            await saveBook(book);
            setStatus(`节点已改为「${cleanTitle}」`);
            await refreshTree(true);
            if (getActiveUid() === targetUid) await renderEditor(targetUid, false);
        } catch (error) {
            Object.assign(book, snapshot);
            setStatus('重命名节点失败', 'error');
            console.error('[绿茵世界书管理器] 重命名节点失败', error);
        }
    }

    async function createEntry({ moduleId = 'overview', selectedKind = 'green', rawComment = '新资料节点', content = '', keyText = '' } = {}) {
        const book = await store.load();
        const kind = moduleId === 'section'
            ? 'section'
            : (isSubsectionModule(moduleId) ? 'green' : (selectedKind === 'section' ? 'section' : selectedKind));
        const keys = splitKeys(keyText);
        const uid = nextUid(book);
        const template = findEntry(book, templateUid(moduleId, kind)) || Object.values(book.entries ?? {})[0] || {};
        const entry = clone(template);
        const subsection = parseSubsectionModule(moduleId);
        entry.displayIndex = maxDisplayIndex(book) + 1;
        if (entry.extensions) entry.extensions.display_index = entry.displayIndex;
        setEntryShape(entry, { uid, moduleId, kind, comment: String(rawComment ?? '').trim() || '新资料节点', content, keys });
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
            await saveBook(book);
            if (subsection && kind === 'green') treeState.setPlacement(uid, subsection.parentModuleId, subsection.title);
            setStatus(`节点 #${uid} 已创建`);
            await refreshTree(true);
            await renderEditor(uid);
        } catch (error) {
            Object.assign(book, snapshot);
            setStatus('创建节点失败', 'error');
            console.error('[绿茵世界书管理器] 创建节点失败', error);
        }
    }

    async function deleteEntryByUid(uid) {
        const targetUid = uidKey(uid);
        if (!targetUid) return;
        const book = await store.load();
        const entry = findEntry(book, targetUid);
        if (!entry) throw new Error(`Entry not found: ${targetUid}`);
        if (nodeKind(entry) === 'tag') {
            setStatus('结构标签不能删除', 'error');
            return;
        }
        const title = String(entry.comment ?? `#${targetUid}`);
        const childEntries = moduleFromComment(entry.comment) === 'section'
            ? Object.values(book?.entries ?? {}).filter(item => moduleFromComment(item?.comment) === `section:${targetUid}`)
            : [];
        const message = childEntries.length
            ? `确定删除「${title}」以及它下面的 ${childEntries.length} 个子条目吗？`
            : `确定删除「${title}」吗？`;
        if (!confirm(message)) return;
        const snapshot = clone(book);
        try {
            removeEntryByUid(book, targetUid);
            treeState.removePlacement(targetUid);
            childEntries.forEach(item => {
                removeEntryByUid(book, item?.uid ?? item?.id);
                treeState.removePlacement(item?.uid ?? item?.id);
            });
            setStatus('正在删除节点...');
            await saveBook(book);
            const deletedCount = childEntries.length + 1;
            if (getActiveUid() === targetUid) {
                setActiveUid('');
                setEditorHtml(`<div class="glbc-editor-empty">已删除 ${deletedCount} 个节点。</div>`);
            }
            setStatus(`已删除 ${deletedCount} 个节点`);
            await refreshTree(true);
        } catch (error) {
            Object.assign(book, snapshot);
            setStatus('删除节点失败', 'error');
            console.error('[绿茵世界书管理器] 删除节点失败', error);
        }
    }

    async function saveActiveEntry({ uid, comment, content, keyText }) {
        const activeUid = uidKey(uid);
        if (!activeUid) return;
        const book = await store.load();
        const entry = findEntry(book, activeUid);
        if (!entry) throw new Error(`Entry not found: ${activeUid}`);
        const keys = splitKeys(keyText);
        const snapshot = clone(book);
        try {
            updateEntryAndLegacy(book, activeUid, comment, content, keys, { preserveLegacyKeys: false });
            setStatus('正在保存节点...');
            await saveBook(book);
            setStatus('节点已保存');
            await refreshTree(true);
        } catch (error) {
            Object.assign(book, snapshot);
            setStatus('节点保存失败', 'error');
            console.error('[绿茵世界书管理器] 节点保存失败', error);
        }
    }

    return {
        moveEntryToSubsection,
        moveSubsectionToParent,
        createSubsection,
        deleteSubsection,
        renameSubsection,
        renameDynamicSection,
        renameEntryTitle,
        createEntry,
        deleteEntryByUid,
        saveActiveEntry,
    };
}

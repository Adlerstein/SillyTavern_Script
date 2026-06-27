# Green Book Toggle Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the green book controller as a toggle-only dashboard that adapts to the current football world book without changing its structure.

**Architecture:** Keep the existing lore book store for persistence because it only writes enabled state. Replace the green controller's static tree, editor, drag/drop, and localStorage subsection model with a derived grouping model and a compact switch dashboard. Add pure grouping helpers so classification and locked-entry behavior can be verified against the current Luker football world book without mutating it.

**Tech Stack:** Browser JavaScript modules, SillyTavern `loadWorldInfo` / `saveWorldInfo`, existing `drgon_book/lore-book-controller-store.js`, CSS, Node syntax and helper checks.

---

## File Structure

- Modify: `green_book/green-lore-book-controller-core.js`
  - Keep `BOOK_FILE`, `uidKey`, `clone`, `esc`, and basic entry helpers.
  - Add pure grouping helpers: prefix extraction, label formatting, lock classification, group derivation, and group stats.
  - Remove static TREE/MODULES behavior from active use.
- Modify: `green_book/green-lore-book-controller.js`
  - Replace tree/editor controller logic with toggle dashboard logic.
  - Keep launcher, panel positioning, SillyTavern context lookup, style injection, and store usage.
  - Remove actions/state imports and all editing, drag/drop, subsection, and localStorage behavior.
- Modify: `green_book/green-lore-book-controller.css`
  - Replace tree/editor styles with compact dashboard, group, row, locked-state, and responsive styles.
- Leave unchanged: `drgon_book/lore-book-controller-store.js`
  - Existing `setState` / `setStates` already writes only `disable` and legacy `enabled`.
- Leave unchanged or unused: `green_book/green-lore-book-controller-actions.js`, `green_book/green-lore-book-controller-state.js`
  - These old editing helpers must not be imported by the rebuilt controller.

## Task 1: Core Derived Model

**Files:**
- Modify: `green_book/green-lore-book-controller-core.js`

- [ ] **Step 1: Add pure model helpers**

Add these exports near the existing basic helpers. Keep existing `BOOK_FILE`, `uidKey`, `clone`, and `esc`.

```js
export const GROUP_DEFINITIONS = [
    { id: 'timeline', label: '时间线', description: '年份与足球大事记' },
    { id: 'league', label: '赛事与战术演化', description: '联赛、杯赛、战术年代' },
    { id: 'club', label: '俱乐部', description: '俱乐部资料' },
    { id: 'career', label: '职业生涯', description: '合同、训练、转会、阶段规则' },
    { id: 'position', label: '球场位置', description: '位置、职责、成长路径' },
    { id: 'national', label: '国家队', description: '国家队与国际赛事身份' },
    { id: 'city', label: '城市地点', description: '城市、地点、环境资料' },
    { id: 'award', label: '荣誉奖项', description: '个人荣誉与奖项' },
    { id: 'system', label: '系统与结构', description: 'MVU、世界树、总览、初始化和无前缀系统条目' },
    { id: 'other', label: '其他内容', description: '未识别但带前缀的内容条目' },
];

const GROUP_BY_PREFIX = new Map([
    ['timeline', 'timeline'],
    ['league', 'league'],
    ['club', 'club'],
    ['career', 'career'],
    ['position', 'position'],
    ['national', 'national'],
    ['city', 'city'],
    ['award', 'award'],
    ['tree', 'system'],
    ['overview', 'system'],
    ['mvu_update', 'system'],
    ['initvar', 'system'],
]);

const LOCKED_PREFIXES = new Set(['mvu_update', 'tree', 'overview', 'initvar']);

export function entryUid(entry) {
    return uidKey(entry?.uid ?? entry?.id);
}

export function entryPrefix(comment) {
    const match = String(comment ?? '').match(/^\[([^\]]+)\]/);
    return match ? match[1].trim() : '';
}

export function entryTitle(entry) {
    const comment = String(entry?.comment ?? '').trim();
    return comment.replace(/^\[[^\]]+\]/, '').trim() || comment || `#${entryUid(entry)}`;
}

export function isLockedEntry(entry) {
    const prefix = entryPrefix(entry?.comment);
    return !prefix || LOCKED_PREFIXES.has(prefix);
}

export function groupIdForEntry(entry) {
    const prefix = entryPrefix(entry?.comment);
    if (!prefix) return 'system';
    return GROUP_BY_PREFIX.get(prefix) ?? 'other';
}

export function compareEntriesForDisplay(a, b) {
    const displayA = Number(a?.displayIndex ?? a?.extensions?.display_index);
    const displayB = Number(b?.displayIndex ?? b?.extensions?.display_index);
    if (Number.isFinite(displayA) && Number.isFinite(displayB) && displayA !== displayB) return displayA - displayB;
    if (Number.isFinite(displayA) !== Number.isFinite(displayB)) return Number.isFinite(displayA) ? -1 : 1;
    const orderA = Number(a?.order ?? 0);
    const orderB = Number(b?.order ?? 0);
    if (orderA !== orderB) return orderA - orderB;
    return Number(entryUid(a) || 0) - Number(entryUid(b) || 0);
}

export function deriveGroups(book) {
    const definitions = new Map(GROUP_DEFINITIONS.map(group => [group.id, { ...group, entries: [] }]));
    const entries = Object.values(book?.entries ?? {}).filter(entry => entryUid(entry));
    for (const entry of entries) {
        const groupId = groupIdForEntry(entry);
        if (!definitions.has(groupId)) {
            definitions.set(groupId, { id: groupId, label: groupId, description: '', entries: [] });
        }
        definitions.get(groupId).entries.push(entry);
    }
    return [...definitions.values()]
        .map(group => {
            const sortedEntries = group.entries.sort(compareEntriesForDisplay);
            const unlockedEntries = sortedEntries.filter(entry => !isLockedEntry(entry));
            const enabledCount = sortedEntries.filter(entry => entry.disable !== true).length;
            return {
                ...group,
                entries: sortedEntries,
                totalCount: sortedEntries.length,
                enabledCount,
                disabledCount: sortedEntries.length - enabledCount,
                unlockedCount: unlockedEntries.length,
                unlockedUids: unlockedEntries.map(entryUid),
            };
        })
        .filter(group => group.entries.length > 0);
}
```

- [ ] **Step 2: Remove active dependence on old static exports**

Keep old exports only if other unused files still import them for syntax checks. The rebuilt `green-lore-book-controller.js` must import only:

```js
import { BOOK_FILE, clone, deriveGroups, entryPrefix, entryTitle, entryUid, esc, isLockedEntry } from './green-lore-book-controller-core.js?v=20260627-toggle1';
```

- [ ] **Step 3: Run syntax check**

Run:

```powershell
node --check .\green_book\green-lore-book-controller-core.js
```

Expected: no output and exit code 0.

## Task 2: Toggle Dashboard Controller

**Files:**
- Modify: `green_book/green-lore-book-controller.js`

- [ ] **Step 1: Replace imports**

The top of `green-lore-book-controller.js` should become:

```js
import { createLoreBookStore } from '../drgon_book/lore-book-controller-store.js?v=20260624-store1';
import { BOOK_FILE, clone, deriveGroups, entryPrefix, entryTitle, entryUid, esc, isLockedEntry } from './green-lore-book-controller-core.js?v=20260627-toggle1';
```

Remove imports of `green-lore-book-controller-state.js` and `green-lore-book-controller-actions.js`.

- [ ] **Step 2: Replace panel markup**

Use this panel body shape inside the existing root markup:

```js
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
```

- [ ] **Step 3: Add dashboard render functions**

Replace `buildTree`, `syncDynamicRows`, `refreshTree`, `renderEditor`, new-entry, drag, rename, delete, and subsection functions with:

```js
const groupsHost = root.querySelector('.glbc-groups');
const search = root.querySelector('.glbc-search');
const status = root.querySelector('.glbc-status');
let currentGroups = [];

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
    section.dataset.open = 'true';
    const canBatch = group.unlockedCount > 0;
    section.innerHTML = `
        <button class="glbc-group-head" type="button" data-action="group">
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
    return section;
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
```

- [ ] **Step 4: Add single and batch toggle handlers**

Use these functions:

```js
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
```

- [ ] **Step 5: Keep search, launcher, panel positioning, and wand entry**

Update `applySearch()` to target `.glbc-entry-row` and open matching `.glbc-group` sections:

```js
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
        if (groupHasMatch) group.dataset.open = 'true';
    });
}
```

Keep `positionPanel`, `positionMobileLauncher`, `positionMobilePanel`, `syncCompactLayout`, `closePanel`, `openPanel`, `registerWandMenuEntry`, launcher drag behavior, and cleanup behavior. In `openPanel`, call `await refreshDashboard(true)`.

- [ ] **Step 6: Replace event delegation**

The root click handler should support only:

```js
root.addEventListener('click', event => {
    const target = event.target;
    const actionNode = target.closest?.('[data-action]');
    if (!actionNode || !root.contains(actionNode)) return;
    const action = actionNode.dataset.action;
    if (action === 'close') closePanel();
    else if (action === 'refresh') void refreshDashboard(true);
    else if (action === 'toggle') void toggleOne(actionNode);
    else if (action === 'batch') void toggleGroup(actionNode);
    else if (action === 'group') {
        const group = actionNode.closest('.glbc-group');
        if (group) group.dataset.open = String(group.dataset.open !== 'true');
    }
}, { signal: events.signal });
```

Keep the search input listener:

```js
search.addEventListener('input', applySearch, { signal: events.signal });
```

- [ ] **Step 7: Run syntax check**

Run:

```powershell
node --check .\green_book\green-lore-book-controller.js
```

Expected: no output and exit code 0.

## Task 3: Dashboard Styles

**Files:**
- Modify: `green_book/green-lore-book-controller.css`

- [ ] **Step 1: Replace tree/editor CSS with dashboard CSS**

Keep `.glbc-root`, launcher, panel, header, footer, icon button, switch, status, and responsive shell rules. Replace tree/editor-specific rules with:

```css
.glbc-body{min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden}
.glbc-toolbar{display:grid;grid-template-columns:minmax(0,1fr);align-items:center;gap:8px;padding:12px 12px 8px}
.glbc-search{width:100%;height:36px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);padding:0 10px}
.glbc-groups{min-height:0;overflow:auto;padding:4px 12px 14px;display:grid;gap:10px;align-content:start}
.glbc-group{border:1px solid var(--border);border-radius:10px;background:color-mix(in srgb,var(--surface) 86%,transparent);overflow:hidden}
.glbc-group[hidden]{display:none}
.glbc-group-head{width:100%;min-height:42px;display:grid;grid-template-columns:22px minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 10px;border:0;background:var(--surface);color:inherit;font:inherit;text-align:left;cursor:pointer}
.glbc-group-title{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.glbc-group-count{color:var(--muted);font-size:12px;white-space:nowrap}
.glbc-chevron{transition:transform 160ms ease;color:var(--muted)}
.glbc-group[data-open=true]>.glbc-group-head .glbc-chevron{transform:rotate(90deg)}
.glbc-group[data-open=false]>.glbc-group-tools,.glbc-group[data-open=false]>.glbc-entry-list{display:none}
.glbc-group-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border-top:1px solid var(--border);color:var(--muted);font-size:12px}
.glbc-group-tools span:first-child{min-width:min(240px,100%);flex:1}
.glbc-entry-list{display:grid}
.glbc-entry-row{min-height:44px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;padding:8px 10px;border-top:1px solid color-mix(in srgb,var(--border) 64%,transparent)}
.glbc-entry-row[hidden]{display:none}
.glbc-entry-main{min-width:0;display:grid;gap:2px}
.glbc-entry-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.glbc-entry-meta{color:var(--muted);font-size:11px;white-space:nowrap}
.glbc-entry-row.is-locked{opacity:.74}
.glbc-locked{min-width:46px;height:26px;display:grid;place-items:center;border:1px solid var(--border);border-radius:999px;color:var(--muted);font-size:12px}
```

- [ ] **Step 2: Ensure mobile constraints**

Keep the mobile launcher and panel behavior. Add:

```css
@media(max-width:760px){
    .glbc-panel{left:0!important;right:0!important;bottom:0!important;top:auto!important;width:100vw!important;height:min(88vh,760px);height:min(88dvh,760px);max-height:calc(100vh - 8px);border-width:1px 0 0;border-radius:18px 18px 0 0;padding-bottom:env(safe-area-inset-bottom);transform:translateZ(0)}
    .glbc-entry-row{grid-template-columns:minmax(0,1fr) auto}
    .glbc-entry-title{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
    .glbc-group-head{grid-template-columns:22px minmax(0,1fr);grid-template-areas:"chev title" "chev count"}
    .glbc-chevron{grid-area:chev}
    .glbc-group-title{grid-area:title}
    .glbc-group-count{grid-area:count}
}
```

- [ ] **Step 3: Run syntax smoke check**

Run:

```powershell
node --check .\green_book\green-lore-book-controller.js
```

Expected: no output and exit code 0.

## Task 4: Verification Script

**Files:**
- Create: `green_book/verify-toggle-model.mjs`

- [ ] **Step 1: Add read-only model verification**

Create `green_book/verify-toggle-model.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';
import { deriveGroups, entryUid, isLockedEntry } from './green-lore-book-controller-core.js';

const worldPath = process.argv[2];
if (!worldPath) {
    console.error('Usage: node green_book/verify-toggle-model.mjs <worldbook.json>');
    process.exit(2);
}

const before = fs.readFileSync(worldPath, 'utf8');
const book = JSON.parse(before);
const groups = deriveGroups(book);
const entries = Object.values(book.entries ?? {});
const locked = entries.filter(isLockedEntry);
const batchUids = new Set(groups.flatMap(group => group.unlockedUids));

if (entries.length !== 119) {
    throw new Error(`Expected 119 entries in current football fixture, got ${entries.length}`);
}

for (const entry of locked) {
    const uid = entryUid(entry);
    if (batchUids.has(uid)) {
        throw new Error(`Locked entry ${uid} was included in batch toggle set`);
    }
}

const requiredGroups = ['timeline', 'league', 'club', 'career', 'position', 'national', 'city', 'award', 'system'];
for (const id of requiredGroups) {
    if (!groups.some(group => group.id === id)) {
        throw new Error(`Missing derived group: ${id}`);
    }
}

const after = fs.readFileSync(worldPath, 'utf8');
if (after !== before) {
    throw new Error('Verification mutated the world book file');
}

console.log(JSON.stringify({
    entries: entries.length,
    groups: groups.map(group => ({
        id: group.id,
        total: group.totalCount,
        enabled: group.enabledCount,
        disabled: group.disabledCount,
        unlocked: group.unlockedCount,
    })),
    locked: locked.map(entryUid),
}, null, 2));
```

- [ ] **Step 2: Run verification against Luker fixture**

Run:

```powershell
node .\green_book\verify-toggle-model.mjs ..\Luker\data\default-user\worlds\足球.json
```

Expected: JSON output with `entries: 119`; locked UIDs include MVU/tree/overview/initvar/no-prefix system entries; exit code 0.

## Task 5: Final Checks

**Files:**
- Check: `green_book/green-lore-book-controller-core.js`
- Check: `green_book/green-lore-book-controller.js`
- Check: `green_book/green-lore-book-controller-actions.js`
- Check: `green_book/green-lore-book-controller-state.js`
- Check: `green_book/verify-toggle-model.mjs`

- [ ] **Step 1: Run syntax checks**

Run:

```powershell
node --check .\green_book\green-lore-book-controller-core.js
node --check .\green_book\green-lore-book-controller.js
node --check .\green_book\green-lore-book-controller-actions.js
node --check .\green_book\green-lore-book-controller-state.js
node --check .\green_book\verify-toggle-model.mjs
```

Expected: no output and exit code 0 for each command.

- [ ] **Step 2: Confirm old editing modules are not imported by the active controller**

Run:

```powershell
Select-String -Path .\green_book\green-lore-book-controller.js -Pattern 'green-lore-book-controller-actions|green-lore-book-controller-state|createEntry|deleteEntry|rename|drag|subsection'
```

Expected: no matches for old editing imports or editing actions.

- [ ] **Step 3: Confirm repository diff does not include world book files**

Run:

```powershell
git status --short
```

Expected: changes only under `green_book/` and `docs/superpowers/plans/`; no files under `..\Luker\data\default-user\worlds\`.

- [ ] **Step 4: Commit implementation**

Run:

```powershell
git add green_book docs\superpowers\plans\2026-06-27-green-book-toggle-controller.md
git commit -m "Refactor green book controller to toggle dashboard"
```

Expected: commit succeeds.


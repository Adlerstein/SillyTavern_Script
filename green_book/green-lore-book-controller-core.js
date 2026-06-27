export const BOOK_FILE = '足球';

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

export const TREE = [];
export const MODULES = {
    timeline: { label: '时间线', prefix: '[timeline]', blueOrder: 51, greenOrder: 56 },
    rules: { label: '常开规则', prefix: '[rule]', blueOrder: 24, greenOrder: 26 },
    league: { label: '赛事', prefix: '[league]', blueOrder: 61, greenOrder: 66 },
    club: { label: '俱乐部', prefix: '[club]', blueOrder: 71, greenOrder: 76 },
    tactic: { label: '战术', prefix: '[tactic]', blueOrder: 81, greenOrder: 86 },
    position: { label: '球场位置', prefix: '[position]', blueOrder: 91, greenOrder: 96 },
    overview: { label: '世界树结构', prefix: '[overview]', blueOrder: 41, greenOrder: 46 },
    section: { label: '一级主干', prefix: '[section]', blueOrder: 45, greenOrder: 46 },
};

export const uidKey = value => String(value ?? '').trim();
export const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const splitKeys = value => String(value ?? '').split(/[,，\n]/).map(item => item.trim()).filter(Boolean);
export const joinKeys = keys => Array.isArray(keys) ? keys.join('，') : '';
export const sectionModuleId = sectionUid => `section:${uidKey(sectionUid)}`;
export const subsectionModuleId = (parentModuleId, title) => {
    const parent = /^\d+$/.test(uidKey(parentModuleId)) ? sectionModuleId(parentModuleId) : String(parentModuleId ?? '').trim();
    return `${parent}:sub:${encodeURIComponent(String(title ?? '').trim())}`;
};
export const isSectionModule = moduleId => /^section:\d+$/.test(String(moduleId ?? ''));
export const isSubsectionModule = moduleId => /^(?:timeline|league|club|tactic|position|rules|overview|section:\d+):sub:/.test(String(moduleId ?? ''));

export function entryUid(entry) {
    return uidKey(entry?.uid ?? entry?.id);
}

export function setGroupOpen(group, open) {
    if (!group) return;
    const isOpen = Boolean(open);
    group.dataset.open = String(isOpen);
    group.querySelector?.('.glbc-group-head')?.setAttribute('aria-expanded', String(isOpen));
    group.querySelectorAll?.('.glbc-group-tools,.glbc-entry-list').forEach(node => {
        node.hidden = !isOpen;
    });
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

export function parseSubsectionModule(moduleId) {
    const match = String(moduleId ?? '').match(/^((?:timeline|league|club|tactic|position|rules|overview)|section:(\d+)):sub:(.+)$/);
    if (!match) return null;
    return {
        parentModuleId: match[1],
        sectionUid: match[2] ?? null,
        title: decodeURIComponent(match[3]),
        moduleId: String(moduleId),
    };
}

export function subsectionFromComment(comment) {
    const match = String(comment ?? '').match(/^\[((?:timeline|league|club|tactic|position|rule|rules|overview|tree)|section:(\d+))\]\[subsection:([^\]]+)\]/);
    if (!match) return null;
    const prefix = match[1] === 'rule' ? 'rules' : match[1] === 'tree' ? 'overview' : match[1];
    return {
        parentModuleId: prefix,
        sectionUid: match[2] ?? null,
        title: match[3].trim(),
    };
}

export function stripEntryPrefixes(comment) {
    return String(comment ?? '')
        .replace(/^\[(?:timeline|league|club|tactic|position|rule|rules|overview|tree|section:\d+|section)\]/, '')
        .replace(/^\[subsection:[^\]]+\]/, '')
        .trim();
}

export function flattenTree(nodes = TREE, result = []) {
    for (const node of nodes) {
        if (node.start) result.push(node.start[0]);
        if (node.overview) result.push(node.overview[0]);
        if (node.extra) node.extra.forEach(item => result.push(item[0]));
        if (node.children?.length) {
            if (Array.isArray(node.children[0])) node.children.forEach(item => result.push(item[0]));
            else flattenTree(node.children, result);
        }
        if (node.end) result.push(node.end[0]);
    }
    return result;
}

export const STATIC_UIDS = new Set(flattenTree().map(uidKey));

export function findEntry(book, uid) {
    const key = uidKey(uid);
    const entries = book?.entries;
    if (!key || !entries) return null;
    if (!Array.isArray(entries) && entries[key]) return entries[key];
    return Object.values(entries).find(entry => uidKey(entry?.uid ?? entry?.id) === key) ?? null;
}

export function findLegacyEntry(book, uid) {
    const key = uidKey(uid);
    const entries = book?.originalData?.entries;
    if (!key || !Array.isArray(entries)) return null;
    return entries.find(entry => uidKey(entry?.uid ?? entry?.id) === key) ?? null;
}

export function entryKeys(entry) {
    if (!entry) return [];
    if (Array.isArray(entry.key)) return entry.key;
    if (Array.isArray(entry.keys)) return entry.keys;
    return [];
}

export function nextUid(book) {
    const entries = Object.values(book?.entries ?? {});
    const ids = entries.map(entry => Number(entry?.uid ?? entry?.id)).filter(Number.isFinite);
    return String(Math.max(0, ...ids) + 1);
}

export function moduleFromComment(comment) {
    const prefix = entryPrefix(comment);
    if (prefix === 'rule') return 'rules';
    if (prefix === 'tree') return 'overview';
    if (MODULES[prefix]) return prefix;
    const sectionMatch = String(comment ?? '').match(/^\[section:(\d+)\]/);
    if (sectionMatch) return `section:${sectionMatch[1]}`;
    if (prefix === 'section') return 'section';
    return 'rules';
}

export function nodeKind(entry) {
    if (!entry) return 'tag';
    if (isLockedEntry(entry)) return 'tag';
    if (!entry.constant && entry.selective) return 'green';
    return 'blue';
}

export function templateUid(moduleId, kind) {
    const subsection = parseSubsectionModule(moduleId);
    if (subsection) return templateUid(subsection.parentModuleId, kind);
    if (kind === 'section' || isSectionModule(moduleId) || isSubsectionModule(moduleId)) return 34;
    if (kind === 'blue' || kind === 'rule') {
        return ({ timeline: 35, rules: 3, league: 30, club: 31, tactic: 32, position: 33, overview: 34 })[moduleId] ?? 35;
    }
    return ({ timeline: 100, rules: 5, league: 201, club: 300, tactic: 400, position: 505, overview: 34 })[moduleId] ?? 100;
}

export function maxDisplayIndex(book) {
    return Math.max(0, ...Object.values(book?.entries ?? {}).map(entry => Number(entry?.displayIndex ?? entry?.extensions?.display_index ?? 0)).filter(Number.isFinite));
}

export function orderFor(moduleId, kind) {
    const subsection = parseSubsectionModule(moduleId);
    if (subsection) return orderFor(subsection.parentModuleId, kind);
    if (kind === 'section' || moduleId === 'section') return MODULES.section.blueOrder;
    if (isSectionModule(moduleId) || isSubsectionModule(moduleId)) return kind === 'green' ? MODULES.section.greenOrder : MODULES.section.blueOrder;
    const module = MODULES[moduleId] ?? MODULES.rules;
    if (kind === 'green') return module.greenOrder;
    return module.blueOrder;
}

export function updateEntryFields(entry, comment, content, keys) {
    entry.comment = comment;
    entry.content = content;
    if ('key' in entry || !('keys' in entry)) entry.key = keys;
    if ('keys' in entry) entry.keys = keys;
}

export function setEntryShape(entry, { uid, moduleId, kind, comment, content, keys }) {
    const id = Number(uid);
    entry.uid = id;
    if ('id' in entry) entry.id = id;
    const subsection = parseSubsectionModule(moduleId);
    const shapeModuleId = subsection ? subsection.parentModuleId : moduleId;
    const rawComment = stripEntryPrefixes(comment);
    const prefix = kind === 'section'
        ? MODULES.section.prefix
        : (isSectionModule(shapeModuleId) ? `[${shapeModuleId}]` : (MODULES[shapeModuleId]?.prefix ?? MODULES.rules.prefix));
    entry.comment = String(comment ?? '').startsWith(prefix)
        ? comment
        : `${prefix}${rawComment || '新资料节点'}`;
    entry.content = content;
    entry.constant = kind === 'blue' || kind === 'rule' || kind === 'section';
    entry.selective = kind === 'green';
    entry.disable = false;
    entry.order = orderFor(moduleId, kind);
    entry.depth = 4;
    entry.position = 0;
    const finalKeys = kind === 'green' ? keys : [];
    entry.key = finalKeys;
    if ('keys' in entry) entry.keys = finalKeys;
    if (entry.extensions) {
        entry.extensions.depth = 4;
        entry.extensions.position = 0;
        entry.extensions.display_index = entry.displayIndex;
        entry.extensions.vectorized = false;
        entry.extensions.triggers = entry.extensions.triggers ?? [];
    }
}

export function removeEntryByUid(book, uid) {
    const key = uidKey(uid);
    if (!key) return;
    if (Array.isArray(book.entries)) {
        const index = book.entries.findIndex(entry => uidKey(entry?.uid ?? entry?.id) === key);
        if (index >= 0) book.entries.splice(index, 1);
    } else if (book.entries) {
        delete book.entries[key];
    }
    if (Array.isArray(book.originalData?.entries)) {
        const index = book.originalData.entries.findIndex(entry => uidKey(entry?.uid ?? entry?.id) === key);
        if (index >= 0) book.originalData.entries.splice(index, 1);
    }
}

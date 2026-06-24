export const BOOK_FILE = '绿茵好莱坞';

export const TREE = [
    {
        id: 'world', label: '绿茵世界树', icon: '树', color: '#22c55e', start: [20, '世界树开始'], end: [21, '世界树结束'],
        children: [
            {
                id: 'timeline', label: '时间线', icon: '年', color: '#22c55e', start: [90, '时间线开始'], end: [99, '时间线结束'],
                overview: [35, '时间线总览'],
                children: [[100, '1998年'], [101, '1999年'], [102, '2000年'], [103, '2001年'], [104, '2002年'], [105, '2003年'], [106, '2004年'], [107, '2005年'], [108, '2006年']],
            },
            {
                id: 'league', label: '联赛', icon: '赛', color: '#f59e0b', start: [190, '联赛开始'], end: [199, '联赛结束'],
                overview: [30, '联赛总览'],
                children: [[200, '英超'], [201, '德甲'], [202, '西甲'], [203, '意甲'], [204, '法甲'], [205, '欧冠'], [206, '国家队赛事']],
            },
            {
                id: 'club', label: '俱乐部信息', icon: '俱', color: '#ef4444', start: [290, '俱乐部开始'], end: [299, '俱乐部结束'],
                overview: [31, '重要俱乐部简表'],
                children: [[300, '拜仁慕尼黑'], [301, '曼联'], [302, '皇家马德里'], [303, '巴塞罗那'], [304, 'AC米兰'], [305, '尤文图斯'], [306, '阿森纳'], [307, '切尔西']],
            },
            {
                id: 'tactic', label: '战术', icon: '术', color: '#a855f7', start: [390, '战术开始'], end: [399, '战术结束'],
                overview: [32, '战术总览'],
                children: [[400, '传统442'], [401, '三中卫体系'], [402, '圣诞树/4312'], [403, '433/4231'], [404, '防守反击'], [405, '传控与高压']],
            },
            {
                id: 'position', label: '球场位置', icon: '位', color: '#14b8a6', start: [490, '球场位置开始'], end: [499, '球场位置结束'],
                overview: [33, '球场位置总览'],
                extra: [[34, '青训与职业路径总览']],
                children: [[500, '门将'], [501, '中后卫'], [502, '边后卫/翼卫'], [503, '后腰/中前卫'], [504, '前腰/边锋'], [505, '中锋']],
            },
            {
                id: 'rules', label: '常开规则', icon: '规', color: '#60a5fa',
                children: [],
            },
        ],
    },
];

export const MODULES = {
    timeline: { label: '时间线', prefix: '[timeline]', blueOrder: 51, greenOrder: 56 },
    rules: { label: '常开规则', prefix: '[rule]', blueOrder: 24, greenOrder: 26 },
    league: { label: '联赛', prefix: '[league]', blueOrder: 61, greenOrder: 66 },
    club: { label: '俱乐部信息', prefix: '[club]', blueOrder: 71, greenOrder: 76 },
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
    const text = String(comment ?? '');
    if (text.startsWith('[timeline]')) return 'timeline';
    if (text.startsWith('[league]')) return 'league';
    if (text.startsWith('[club]')) return 'club';
    if (text.startsWith('[tactic]')) return 'tactic';
    if (text.startsWith('[position]')) return 'position';
    if (text.startsWith('[rule]') || text.startsWith('[rules]')) return 'rules';
    if (text.startsWith('[overview]') || text.startsWith('[tree]')) return 'overview';
    const sectionMatch = text.match(/^\[section:(\d+)\]/);
    if (sectionMatch) return `section:${sectionMatch[1]}`;
    if (text.startsWith('[section]')) return 'section';
    return 'rules';
}

export function nodeKind(entry) {
    if (!entry) return 'tag';
    if (entry.constant && !entry.selective) {
        const content = String(entry.content ?? '');
        return /^<\/?[^>]+>$/.test(content.trim()) ? 'tag' : 'blue';
    }
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
    const subsectionPrefix = '';
    entry.comment = String(comment ?? '').startsWith(`${prefix}${subsectionPrefix}`)
        ? comment
        : `${prefix}${subsectionPrefix}${rawComment || '新资料节点'}`;
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

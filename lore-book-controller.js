import { createLoreBookStore } from './lore-book-controller-store.js?v=20260614-3';

// Load from a card script with: import '/scripts/custom/lore-book-controller.js?v=20260614-3';
(function initLoreBookController() {
    const hostWindow = window.parent ?? window;
    const hostDocument = hostWindow.document;
    const scriptId = typeof globalThis.getScriptId === 'function' ? globalThis.getScriptId() : 'lore-book-controller-local';
    const cleanupKey = '__loreBookControllerCleanup';

    hostWindow[cleanupKey]?.();
    hostDocument.querySelectorAll(`[data-lbc-owner="${scriptId}"]`).forEach(node => node.remove());

    const events = new hostWindow.AbortController();
    const eventOptions = { signal: events.signal };
    const BOOK_FILE = '肚子疼和乐扣的龙族世界书';
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
            id: 'prequel', label: '龙族前传：冰海王座', icon: '○',
            color: '#94a3b8', accent: 'rgba(148,163,184,',
            overview: { uid: '168', label: '剧情总览' },
            chapters: [
                { uid: '169', label: '序幕：楔子' },
                { uid: '170', label: '第一幕：钦差大臣' },
                { uid: '171', label: '第二幕：末代皇孙' },
                { uid: '172', label: '第三幕：零号' },
                { uid: '173', label: '第四幕：誓言' },
                { uid: '174', label: '第五幕：燃烧的圣诞夜' },
                { uid: '175', label: '第六幕：王的裁决' },
                { uid: '176', label: '第七幕：新约' }
            ]
        },
        {
            id: 'lz1', label: '龙族Ⅰ：火之晨曦', icon: 'Ⅰ',
            color: '#60a5fa', accent: 'rgba(96,165,250,',
            overview: { uid: '9', label: '剧情总览' },
            chapters: [
                { uid: '17', label: '第一幕：卡塞尔之门' },
                { uid: '28', label: '第二幕：黄金瞳' },
                { uid: '29', label: '第三幕：恺撒' },
                { uid: '30', label: '第四幕：青铜城' },
                { uid: '31', label: '第五幕：龙影' },
                { uid: '32', label: '第六幕：星与花' },
                { uid: '34', label: '第七幕：弟弟' },
                { uid: '35', label: '第八幕：哥哥' },
                { uid: '36', label: '第九幕：龙墓' },
                { uid: '37', label: '第十幕：七宗罪' },
                { uid: '38', label: '第十一幕：尾声' }
            ]
        },
        {
            id: 'lz2', label: '龙族Ⅱ：悼亡者之瞳', icon: 'Ⅱ',
            color: '#34d399', accent: 'rgba(52,211,153,',
            overview: { uid: '39', label: '剧情总览' },
            chapters: [
                { uid: '40', label: '序幕：雨落狂流之暗' },
                { uid: '41', label: '第一幕：生日蛋糕就是青春的墓碑' },
                { uid: '42', label: '第二幕：王牌专员' },
                { uid: '43', label: '第三幕：悬赏' },
                { uid: '44', label: '第四幕：炎魔刀舞' },
                { uid: '45', label: '第五幕：蒲公英' },
                { uid: '46', label: '第六幕：防火防盗防师兄' },
                { uid: '47', label: '第七幕：群龙的盛宴' },
                { uid: '48', label: '第八幕：康河上的叹息' },
                { uid: '49', label: '第九幕：中庭坠落' },
                { uid: '50', label: '第十幕：守夜人' },
                { uid: '51', label: '第十一幕：婚约' },
                { uid: '52', label: '第十二幕：龙骨十字' },
                { uid: '53', label: '第十三幕：血统契约' },
                { uid: '54', label: '第十四幕：罪与罚' },
                { uid: '55', label: '第十五幕：幕后的人' },
                { uid: '56', label: "第十六幕：It's a Beautiful Day" },
                { uid: '57', label: '第十七幕：悲剧舞台' },
                { uid: '58', label: '第十八幕：迷宫' },
                { uid: '59', label: '第十九幕：耶梦加得' },
                { uid: '60', label: '第二十幕：凡王之血，必以剑终' },
                { uid: '61', label: '第二十一幕：每个人的心里都有个死小孩' }
            ]
        },
        {
            id: 'lz3u', label: '龙族Ⅲ：黑月之潮（上）', icon: 'Ⅲ',
            color: '#c084fc', accent: 'rgba(192,132,252,',
            overview: { uid: '62', label: '剧情总览' },
            chapters: [
                { uid: '63', label: '第一幕：世纪婚礼' },
                { uid: '64', label: '第二幕：无解之结' },
                { uid: '65', label: '第三幕：战鼓之心' },
                { uid: '66', label: '第四幕：黑海白月' },
                { uid: '67', label: '第五幕：日本分部' },
                { uid: '68', label: '第六幕：王牌组合' },
                { uid: '69', label: '第七幕：黄泉之路' },
                { uid: '70', label: '第八幕：极乐天都' },
                { uid: '71', label: '第九幕：源氏重工' },
                { uid: '72', label: '第十幕：每只象龟心中都有一处温暖的水坑' },
                { uid: '73', label: '第十一幕：格陵兰阴影' },
                { uid: '74', label: '第十二幕：亚种' },
                { uid: '75', label: '第十三幕：葬神之所' },
                { uid: '76', label: '第十四幕：王的血祭' },
                { uid: '77', label: '第十五幕：潜龙升空之海' }
            ]
        },
        {
            id: 'lz3m', label: '龙族Ⅲ：黑月之潮（中）', icon: 'Ⅲ',
            color: '#e879f9', accent: 'rgba(232,121,249,',
            overview: { uid: '78', label: '剧情总览' },
            chapters: [
                { uid: '79', label: '第一幕：风与潮之夜' },
                { uid: '80', label: '第二幕：浩劫的轮回' },
                { uid: '81', label: '第三幕：老板' },
                { uid: '82', label: '第四幕：檀香味头发的女孩' },
                { uid: '83', label: '第五幕：荆棘丛中的男孩' },
                { uid: '84', label: '第六幕：男人的花道' },
                { uid: '85', label: '第七幕：樱花与红莲' },
                { uid: '86', label: '第八幕：进击的老鼠队' },
                { uid: '87', label: '第九幕：神国画卷' },
                { uid: '88', label: '第十幕：正义的朋友' },
                { uid: '89', label: '第十一幕：末代皇帝&最后一个克格勃' }
            ]
        },
        {
            id: 'lz3l', label: '龙族Ⅲ：黑月之潮（下）', icon: 'Ⅲ',
            color: '#fb7185', accent: 'rgba(251,113,133,',
            overview: { uid: '90', label: '剧情总览' },
            chapters: [
                { uid: '91', label: '第一幕：源家次子' },
                { uid: '92', label: '第二幕：东京爱情故事' },
                { uid: '93', label: '第三幕：古事记' },
                { uid: '94', label: '第四幕：黑鸥港的幽灵' },
                { uid: '95', label: '第五幕：井中枯鬼' },
                { uid: '96', label: '第六幕：真红之土' },
                { uid: '97', label: '第七幕：怪兽组合' },
                { uid: '98', label: '第八幕：家庭晚宴' },
                { uid: '99', label: '第九幕：我们都是小怪兽' },
                { uid: '100', label: '第十幕：迎着阳光盛大逃亡' },
                { uid: '101', label: '第十一幕：来自北极的故人' },
                { uid: '102', label: '第十二幕：无天无地之所' },
                { uid: '103', label: '第十三幕：刺王杀驾之夜' },
                { uid: '104', label: '第十四幕：樱之坠' },
                { uid: '105', label: '第十五幕：鬼之路' },
                { uid: '106', label: '第十六幕：神陵' },
                { uid: '107', label: '第十七幕：老板娘' },
                { uid: '108', label: '第十八幕：风与潮之夜Ⅱ' },
                { uid: '109', label: '第十九幕：达摩克利斯之剑' },
                { uid: '110', label: '第二十幕：漆黑之日' },
                { uid: '111', label: '第二十一幕：小丑' },
                { uid: '112', label: '第二十二幕：樱怒之日' },
                { uid: '113', label: '第二十三幕：天谴' },
                { uid: '114', label: '第二十四幕：さよなら，Friends' }
            ]
        },
        {
            id: 'lz4', label: '龙族IV：奥丁之渊', icon: 'Ⅳ',
            color: '#fbbf24', accent: 'rgba(251,191,36,',
            overview: { uid: '150', label: '剧情总览' },
            chapters: [
                { uid: '151', label: '序幕：通往世界尽头的航路' },
                { uid: '152', label: '第一幕：狂欢夜之舞' },
                { uid: '153', label: '第二幕：十五岁少年的葬礼' },
                { uid: '154', label: '第三幕：新娘养成学院' },
                { uid: '155', label: '第四幕：元老' },
                { uid: '156', label: '第五幕：恰同学少年' },
                { uid: '157', label: '第六幕：苏小妍' },
                { uid: '158', label: '第七幕：尼伯龙根之门' },
                { uid: '159', label: '第八幕：奥丁的阴影' },
                { uid: '160', label: '第九幕：无限循环之梦' },
                { uid: '161', label: '第十幕：楚天骄' },
                { uid: '162', label: '第十一幕：邵公子的夏季攻略' },
                { uid: '163', label: '第十二幕：苏晓檨的夏季攻略' },
                { uid: '164', label: '第十三幕：猎人小屋' },
                { uid: '165', label: '第十四幕：亡命之徒无路可退' },
                { uid: '166', label: '第十五幕：王从天降愤怒猞狠' },
                { uid: '167', label: '第十六幕：尾声' }
            ]
        },
        {
            id: 'lz5', label: '龙族V：悼亡者归来', icon: 'Ⅴ',
            color: '#ef4444', accent: 'rgba(239,68,68,',
            overview: { uid: '4', label: '剧情总览' },
            chapters: [
                { uid: '178', label: '第一幕：全民公敌' },
                { uid: '179', label: '第二幕：故人' },
                { uid: '180', label: '第三幕：鲸歌' },
                { uid: '181', label: '第四幕：雷霆与守望者（一）' },
                { uid: '182', label: '第五幕：雷霆与守望者（二）' },
                { uid: '183', label: '第六幕：利维坦之歌' },
                { uid: '184', label: '第七幕：但为君故（一）' },
                { uid: '185', label: '第八幕：但为君故（二）' },
                { uid: '186', label: '第九幕：但为君故（三）' },
                { uid: '187', label: '第十幕：但为君故（四）' },
                { uid: '188', label: '第十一幕：但为君故（五）' },
                { uid: '189', label: '第十二幕：但为君故（六）' },
                { uid: '190', label: '第十三幕：但为君故（七）' }
            ]
        }
    ];

    const DLC_SECTIONS = [
        {
            id: 'cultivation', label: '修仙', icon: '修',
            color: '#a78bfa', accent: 'rgba(167,139,250,',
            overview: { uid: '231', label: '修仙开关' },
            chapters: [
                { uid: '252', label: '修仙世界观总纲' },
                { uid: '244', label: '修仙修炼体系' },
                { uid: '233', label: '修仙境界系统' },
                { uid: '247', label: '修仙功法系统' },
                { uid: '249', label: '修仙本命神通' },
                { uid: '248', label: '修仙丹药系统' },
                { uid: '246', label: '修仙灵气复苏' },
                { uid: '245', label: '修仙灵域体系' },
                { uid: '236', label: '修仙势力总览' },
                { uid: '235', label: '修仙心魔系统' },
                { uid: '234', label: '修仙战力计算公式' },
                { uid: '250', label: '修仙NPC命名规则' },
                { uid: '251', label: '修仙封天大阵' },
                { uid: '232', label: '修仙变量更新规则' }
            ]
        }
    ];

    const CHARACTER_SECTIONS = [
        {
            id: 'feminized', label: '娘化', icon: '娘',
            color: '#f472b6', accent: 'rgba(244,114,182,',
            overview: null,
            chapters: [
                { uid: '229', label: '源紫女（女源稚女）' },
                { uid: '212', label: '路茗子（女路鸣泽）' },
                { uid: '228', label: '源紫笙（女源稚生）' },
                { uid: '206', label: '凯莎（女恺撒）' },
                { uid: '207', label: '赫尔佐歌（女赫尔佐格）' },
                { uid: '204', label: '楚紫涵（女楚子航）' },
                { uid: '205', label: '路明妃（女路明非）' }
            ]
        },
        {
            id: 'normal', label: '正常', icon: '正',
            color: '#60a5fa', accent: 'rgba(96,165,250,',
            overview: null,
            chapters: [
                { uid: '121', label: '源稚女' },
                { uid: '191', label: '路鸣泽' },
                { uid: '120', label: '源稚生' },
                { uid: '12', label: '恺撒' },
                { uid: '119', label: '赫尔佐格' },
                { uid: '13', label: '楚子航' },
                { uid: '1', label: '路明非' }
            ]
        }
    ];

    const pages = {
        story: { label: '剧情', sections: BOOK_SECTIONS },
        dlc: { label: 'DLC', sections: DLC_SECTIONS },
        characters: { label: '人物', sections: CHARACTER_SECTIONS },
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
        .lbc-root[data-compact="true"] .lbc-launcher { width: 58px; height: 58px; }
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
        <button class="lbc-launcher" type="button" aria-label="打开世界书管理器" aria-expanded="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3.5A2.5 2.5 0 0 1 7.5 1H20v17H7.5A2.5 2.5 0 0 0 5 20.5v-17Zm2.5-.5A.5.5 0 0 0 7 3.5v13.55c.16-.03.33-.05.5-.05H18V3H7.5ZM4 4H2v16.5A2.5 2.5 0 0 0 4.5 23H20v-2H4.5a.5.5 0 0 1-.5-.5V4Z"/></svg>
        </button>
        <section class="lbc-panel" aria-label="世界书管理器" hidden>
            <header class="lbc-header">
                <div class="lbc-title"><strong>世界书管理器</strong><span>${BOOK_FILE}</span></div>
                <button class="lbc-icon-button" type="button" data-action="refresh" aria-label="刷新">↻</button>
                <button class="lbc-icon-button" type="button" data-action="close" aria-label="关闭">×</button>
            </header>
            <nav class="lbc-tabs" aria-label="世界书分类"></nav>
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
            console.error('[世界书管理器] 读取失败', error);
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
            console.error('[世界书管理器] 保存失败', error);
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
            console.error('[世界书管理器] 批量保存失败', error);
        } finally {
            group.querySelectorAll('.lbc-action').forEach(action => { action.disabled = false; });
            switches.forEach(item => { item.disabled = false; });
        }
    }

    function closePanel() {
        panel.hidden = true;
        launcher.setAttribute('aria-expanded', 'false');
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
        const viewportHeight = viewport?.height ?? hostWindow.innerHeight;
        const viewportLeft = viewport?.offsetLeft ?? 0;
        const viewportTop = viewport?.offsetTop ?? 0;
        const compact = viewportWidth <= 700 || hostWindow.matchMedia('(max-width: 640px)').matches;
        root.dataset.compact = String(compact);

        if (compact) {
            const launcherSize = 58;
            launcher.style.right = 'auto';
            launcher.style.bottom = 'auto';
            launcher.style.left = `${Math.max(viewportLeft + 8, viewportLeft + viewportWidth - launcherSize - 14)}px`;
            launcher.style.top = `${Math.max(viewportTop + 8, viewportTop + viewportHeight - launcherSize - 82)}px`;
        } else {
            ['left', 'right', 'bottom', 'top', 'width', 'max-height'].forEach(property => panel.style.removeProperty(property));
        }

        if (!panel.hidden) positionPanel();
    }

    function openPanel() {
        panel.hidden = false;
        launcher.setAttribute('aria-expanded', 'true');
        positionPanel();
        showPage(activePage);
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
        if (panel.hidden) openPanel();
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

    hostWindow[cleanupKey] = () => {
        events.abort();
        store.flush().catch(error => console.error('[世界书管理器] 清理时保存失败', error));
        root.remove();
        style.remove();
    };
})();

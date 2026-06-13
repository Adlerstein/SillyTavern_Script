// SillyTavern World Book Controller - performance wrapper
// Usage:
//   import 'https://cdn.jsdelivr.net/gh/Adlerstein/SillyTavern_Script@main/lore_book_controller_perf.js?v=1'
//
// This file does not duplicate the original controller. It patches the runtime first,
// then dynamically imports the original lore_book_controller.js. Keep the original file
// in the same repository and add this file as a second script.

const PERF_CONFIG = {
  originalScriptUrl: 'https://cdn.jsdelivr.net/gh/Adlerstein/SillyTavern_Script@main/lore_book_controller.js?v=base-20260613',
  maxConcurrentReads: 4,
  maxConcurrentWrites: 2,
  disableRemoteFonts: true,
  disableHeavyVisualEffects: true,
  debug: false,
};

const PERF_CSS = `
/* ===== lore_book_controller performance mode ===== */
.dragon-seal,
.dragon-seal *,
.dragon-panel,
.dragon-panel * {
  animation: none !important;
  transition: none !important;
}

.dragon-panel {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45) !important;
}

.dragon-seal,
.dragon-seal svg,
.dragon-seal svg * {
  filter: none !important;
}

.panel-hex-mesh,
.panel-noise,
.panel-bottom-glow,
.seal-particles,
.sigil-ring,
.seal-glow,
.seal-aura,
.beacon-pulse,
.dot-pulse {
  display: none !important;
}

.dragon-panel,
.dragon-panel * {
  text-shadow: none !important;
}
`;

const PATCH_MARK = Symbol.for('loreBookControllerPerfPatch.v1');
const STYLE_PATCH_MARK = Symbol.for('loreBookControllerStylePatch.v1');

function log(...args) {
  if (PERF_CONFIG.debug) console.log('[LoreBookPerf]', ...args);
}

function getCandidateWindows() {
  const result = [];
  const push = (win) => {
    try {
      if (win && !result.includes(win)) result.push(win);
    } catch (_) {}
  };

  push(globalThis);

  try { push(window); } catch (_) {}
  try { push(window.parent); } catch (_) {}
  try { push(window.top); } catch (_) {}

  return result;
}

function createLimiter(limit) {
  const queue = [];
  let active = 0;

  const runNext = () => {
    if (active >= limit || queue.length === 0) return;

    const item = queue.shift();
    active += 1;

    Promise.resolve()
      .then(item.fn)
      .then(item.resolve, item.reject)
      .finally(() => {
        active -= 1;
        runNext();
      });
  };

  return function limitTask(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      runNext();
    });
  };
}

const readLimiter = createLimiter(PERF_CONFIG.maxConcurrentReads);
const writeLimiter = createLimiter(PERF_CONFIG.maxConcurrentWrites);
const disableStateCache = new Map();
const pendingDisableReads = new Map();

function parseDisableGetCommand(command) {
  if (typeof command !== 'string') return null;

  const match = command.match(/^\s*\/getentryfield\s+file="([^"]+)"\s+field=disable\s+(\d+)\s*$/i);
  if (!match) return null;

  return {
    file: match[1],
    uid: match[2],
    cacheKey: `${match[1]}::${match[2]}`,
  };
}

function parseDisableSetCommand(command) {
  if (typeof command !== 'string') return null;

  const match = command.match(/^\s*\/setentryfield\s+file="([^"]+)"\s+uid=(\d+)\s+field=disable\s+(true|false)\s*$/i);
  if (!match) return null;

  return {
    file: match[1],
    uid: match[2],
    value: match[3].toLowerCase(),
    cacheKey: `${match[1]}::${match[2]}`,
  };
}

function makePatchedTriggerSlash(originalTriggerSlash) {
  if (typeof originalTriggerSlash !== 'function') return originalTriggerSlash;
  if (originalTriggerSlash[PATCH_MARK]) return originalTriggerSlash;

  async function patchedTriggerSlash(command, ...rest) {
    const getInfo = parseDisableGetCommand(command);
    if (getInfo) {
      if (disableStateCache.has(getInfo.cacheKey)) {
        return disableStateCache.get(getInfo.cacheKey);
      }

      if (pendingDisableReads.has(getInfo.cacheKey)) {
        return pendingDisableReads.get(getInfo.cacheKey);
      }

      const task = readLimiter(async () => {
        try {
          const value = await originalTriggerSlash.call(this, command, ...rest);
          disableStateCache.set(getInfo.cacheKey, value);
          return value;
        } finally {
          pendingDisableReads.delete(getInfo.cacheKey);
        }
      });

      pendingDisableReads.set(getInfo.cacheKey, task);
      return task;
    }

    const setInfo = parseDisableSetCommand(command);
    if (setInfo) {
      return writeLimiter(async () => {
        const value = await originalTriggerSlash.call(this, command, ...rest);
        disableStateCache.set(setInfo.cacheKey, setInfo.value);
        pendingDisableReads.delete(setInfo.cacheKey);
        return value;
      });
    }

    return originalTriggerSlash.call(this, command, ...rest);
  }

  Object.defineProperty(patchedTriggerSlash, PATCH_MARK, { value: true });
  return patchedTriggerSlash;
}

function patchTriggerSlashOnWindow(win) {
  try {
    if (!win) return;

    const current = win.triggerSlash;
    if (typeof current === 'function') {
      const patched = makePatchedTriggerSlash(current);
      if (patched !== current) {
        win.triggerSlash = patched;
        log('triggerSlash patched immediately');
      }
      return;
    }

    let storedValue = current;
    const existingDescriptor = Object.getOwnPropertyDescriptor(win, 'triggerSlash');

    if (existingDescriptor && existingDescriptor.configurable === false) return;

    Object.defineProperty(win, 'triggerSlash', {
      configurable: true,
      enumerable: true,
      get() {
        return storedValue;
      },
      set(value) {
        storedValue = typeof value === 'function' ? makePatchedTriggerSlash(value) : value;
      },
    });

    log('triggerSlash setter hook installed');
  } catch (error) {
    log('triggerSlash patch failed', error);
  }
}

function rewriteControllerStyle(cssText) {
  if (typeof cssText !== 'string') return cssText;
  if (!cssText.includes('.dragon-seal') && !cssText.includes('.dragon-panel')) return cssText;

  let next = cssText;

  if (PERF_CONFIG.disableRemoteFonts) {
    next = next.replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com[^;]+;\s*/gi, '');
  }

  if (PERF_CONFIG.disableHeavyVisualEffects && !next.includes('lore_book_controller performance mode')) {
    next += `\n${PERF_CSS}\n`;
  }

  return next;
}

function patchStyleInsertion(win) {
  try {
    if (!win || !win.Node || !win.Node.prototype) return;
    const proto = win.Node.prototype;
    if (proto[STYLE_PATCH_MARK]) return;

    const originalAppendChild = proto.appendChild;
    const originalInsertBefore = proto.insertBefore;

    const maybeRewriteNode = (node) => {
      try {
        if (node && node.tagName === 'STYLE') {
          node.textContent = rewriteControllerStyle(node.textContent);
        }
      } catch (_) {}
      return node;
    };

    proto.appendChild = function patchedAppendChild(node) {
      return originalAppendChild.call(this, maybeRewriteNode(node));
    };

    proto.insertBefore = function patchedInsertBefore(node, child) {
      return originalInsertBefore.call(this, maybeRewriteNode(node), child);
    };

    Object.defineProperty(proto, STYLE_PATCH_MARK, { value: true });
    log('style insertion patched');
  } catch (error) {
    log('style insertion patch failed', error);
  }
}

function installPerfCss() {
  for (const win of getCandidateWindows()) {
    try {
      const doc = win.document;
      if (!doc || !doc.head) continue;

      const old = doc.getElementById('lore-book-controller-perf-css');
      if (old) old.remove();

      const style = doc.createElement('style');
      style.id = 'lore-book-controller-perf-css';
      style.textContent = PERF_CSS;
      doc.head.appendChild(style);
    } catch (_) {}
  }
}

for (const win of getCandidateWindows()) {
  patchTriggerSlashOnWindow(win);
  patchStyleInsertion(win);
}

installPerfCss();

try {
  await import(PERF_CONFIG.originalScriptUrl);
} finally {
  installPerfCss();
  setTimeout(installPerfCss, 250);
  setTimeout(installPerfCss, 1000);
}

function uidKey(value) {
    return String(value ?? '').trim();
}

function findEntry(book, uid) {
    const key = uidKey(uid);
    const entries = book?.entries;
    if (!key || !entries) {
        return null;
    }

    if (!Array.isArray(entries) && entries[key]) {
        return entries[key];
    }

    return Object.values(entries).find(entry => uidKey(entry?.uid) === key) ?? null;
}

function findLegacyEntry(book, uid) {
    const key = uidKey(uid);
    const entries = book?.originalData?.entries;
    if (!key || !Array.isArray(entries)) {
        return null;
    }

    return entries.find(entry => uidKey(entry?.uid ?? entry?.id) === key) ?? null;
}

function readEnabled(book, uid) {
    const entry = findEntry(book, uid);
    return entry ? entry.disable !== true : null;
}

export function createLoreBookStore({
    bookName,
    loadWorldInfo,
    saveWorldInfo,
    writeDelay = 60,
}) {
    let book = null;
    let loading = null;
    let timer = null;
    let saveQueue = Promise.resolve();
    const pendingStates = new Map();
    const pendingRequests = [];

    async function load({ force = false } = {}) {
        if (force) {
            book = null;
            loading = null;
        }
        if (book) {
            return book;
        }
        if (!loading) {
            loading = Promise.resolve(loadWorldInfo(bookName))
                .then(result => {
                    if (!result?.entries) {
                        throw new Error(`World book not found: ${bookName}`);
                    }
                    book = result;
                    return book;
                })
                .finally(() => {
                    loading = null;
                });
        }
        return loading;
    }

    async function commitPending() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (!pendingStates.size) {
            return;
        }

        const changes = new Map(pendingStates);
        const requests = pendingRequests.splice(0);
        pendingStates.clear();

        saveQueue = saveQueue.catch(() => undefined).then(async () => {
            const currentBook = await load();
            const snapshot = structuredClone(currentBook);
            const changed = [];
            const missing = [];

            for (const [uid, enabled] of changes) {
                const entry = findEntry(currentBook, uid);
                if (!entry) {
                    missing.push(uid);
                    continue;
                }

                const legacyEntry = findLegacyEntry(currentBook, uid);
                const canonicalChanged = entry.disable !== !enabled;
                const legacyChanged = legacyEntry && legacyEntry.enabled !== enabled;
                if (canonicalChanged || legacyChanged) {
                    entry.disable = !enabled;
                    if (legacyEntry) {
                        legacyEntry.enabled = enabled;
                    }
                    changed.push(uid);
                }
            }

            if (changed.length) {
                try {
                    await saveWorldInfo(bookName, structuredClone(currentBook), true, { refreshEditor: true });
                } catch (error) {
                    book = snapshot;
                    throw error;
                }
            }

            return { changed, missing };
        });

        try {
            const result = await saveQueue;
            requests.forEach(request => request.resolve(result));
        } catch (error) {
            requests.forEach(request => request.reject(error));
        }
    }

    function scheduleCommit() {
        if (!timer) {
            timer = setTimeout(commitPending, writeDelay);
        }
    }

    function setStates(uids, enabled) {
        const keys = [...new Set(uids.map(uidKey).filter(Boolean))];
        keys.forEach(uid => pendingStates.set(uid, Boolean(enabled)));

        const result = new Promise((resolve, reject) => {
            pendingRequests.push({ resolve, reject });
        });
        scheduleCommit();
        return result;
    }

    return {
        flush: commitPending,
        getStates: async (uids, options) => {
            const currentBook = await load(options);
            return new Map(uids.map(uid => [uidKey(uid), readEnabled(currentBook, uid)]));
        },
        load,
        peekState: uid => readEnabled(book, uid),
        setState: (uid, enabled) => setStates([uid], enabled),
        setStates,
    };
}

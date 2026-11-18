"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadOnlySelectorStore = exports.JsonFileSelectorStore = exports.MemorySelectorStore = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
class MemorySelectorStore {
    constructor() {
        this.records = new Map();
    }
    get(originalSelector) {
        return this.records.get(originalSelector)?.healedSelector ?? null;
    }
    set(record) {
        const previous = this.records.get(record.originalSelector);
        this.records.set(record.originalSelector, mergeSelectorRecord(previous, record));
    }
}
exports.MemorySelectorStore = MemorySelectorStore;
class JsonFileSelectorStore {
    constructor(filePath) {
        this.filePath = filePath;
    }
    async get(originalSelector) {
        const data = await this.readFile();
        return data.selectors[originalSelector]?.healedSelector ?? null;
    }
    async set(record) {
        await fs_1.promises.mkdir(path.dirname(this.filePath), { recursive: true });
        // Parallel Playwright workers share this file: read-modify-write under a lock,
        // and rename a temp file so no reader ever sees half-written JSON.
        await withFileLock(this.filePath, async () => {
            const data = await this.readFile();
            data.selectors[record.originalSelector] = mergeSelectorRecord(data.selectors[record.originalSelector], record);
            const tempPath = `${this.filePath}.${process.pid}.tmp`;
            await fs_1.promises.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
            await fs_1.promises.rename(tempPath, this.filePath);
        });
    }
    async readFile() {
        try {
            const content = await fs_1.promises.readFile(this.filePath, 'utf8');
            const parsed = JSON.parse(content);
            return {
                version: 1,
                selectors: parsed.selectors ?? {},
            };
        }
        catch (error) {
            const nodeError = error;
            if (nodeError.code === 'ENOENT') {
                return {
                    version: 1,
                    selectors: {},
                };
            }
            throw error;
        }
    }
}
exports.JsonFileSelectorStore = JsonFileSelectorStore;
class ReadOnlySelectorStore {
    constructor(innerStore) {
        this.innerStore = innerStore;
    }
    get(originalSelector) {
        return this.innerStore.get(originalSelector);
    }
    set(_record) {
        // Intentionally ignore writes in read-only mode.
    }
}
exports.ReadOnlySelectorStore = ReadOnlySelectorStore;
const LOCK_RETRY_MS = 20;
const LOCK_STALE_MS = 10000;
// ponytail: lock file, not a lock library. A lock older than LOCK_STALE_MS is treated as left by a
// crashed worker and removed; two waiters removing it at once is possible but needs a crash first.
async function withFileLock(filePath, fn) {
    const lockPath = `${filePath}.lock`;
    for (;;) {
        try {
            await (await fs_1.promises.open(lockPath, 'wx')).close();
            break;
        }
        catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
            const stat = await fs_1.promises.stat(lockPath).catch(() => null);
            if (stat && Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
                await fs_1.promises.rm(lockPath, { force: true });
            }
            await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_MS));
        }
    }
    try {
        await fn();
    }
    finally {
        await fs_1.promises.rm(lockPath, { force: true });
    }
}
function mergeSelectorRecord(previous, next) {
    const observedAt = next.lastVerifiedAt ?? next.updatedAt;
    const changed = !previous ||
        previous.healedSelector !== next.healedSelector ||
        previous.source !== next.source ||
        previous.testFile !== next.testFile ||
        previous.pageObject !== next.pageObject ||
        previous.notes !== next.notes;
    return {
        originalSelector: next.originalSelector,
        healedSelector: next.healedSelector,
        source: next.source,
        updatedAt: changed ? observedAt : previous.updatedAt,
        lastVerifiedAt: observedAt,
        timesUsed: (previous?.timesUsed ?? 0) + 1,
        testFile: next.testFile ?? previous?.testFile,
        pageObject: next.pageObject ?? previous?.pageObject,
        notes: next.notes ?? previous?.notes,
    };
}
//# sourceMappingURL=selector-store.js.map
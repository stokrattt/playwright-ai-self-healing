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
        this.records.set(record.originalSelector, record);
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
        const data = await this.readFile();
        data.selectors[record.originalSelector] = record;
        await fs_1.promises.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs_1.promises.writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
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
//# sourceMappingURL=selector-store.js.map
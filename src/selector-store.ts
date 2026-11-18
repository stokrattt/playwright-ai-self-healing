import { promises as fs } from 'fs';
import * as path from 'path';

export type SelectorResolutionSource = 'stored' | 'original' | 'healed';

export interface SelectorContext {
  testFile?: string;
  pageObject?: string;
  notes?: string;
}

export interface HealedSelectorRecord {
  originalSelector: string;
  healedSelector: string;
  source: SelectorResolutionSource;
  updatedAt: string;
  lastVerifiedAt?: string;
  timesUsed?: number;
  testFile?: string;
  pageObject?: string;
  notes?: string;
}

export interface SelectorStore {
  get(originalSelector: string): Promise<string | null> | string | null;
  set(record: HealedSelectorRecord): Promise<void> | void;
}

export class MemorySelectorStore implements SelectorStore {
  private readonly records = new Map<string, HealedSelectorRecord>();

  get(originalSelector: string): string | null {
    return this.records.get(originalSelector)?.healedSelector ?? null;
  }

  set(record: HealedSelectorRecord): void {
    const previous = this.records.get(record.originalSelector);
    this.records.set(record.originalSelector, mergeSelectorRecord(previous, record));
  }
}

interface JsonSelectorStoreFile {
  version: 1;
  selectors: Record<string, HealedSelectorRecord>;
}

export class JsonFileSelectorStore implements SelectorStore {
  constructor(private readonly filePath: string) {}

  async get(originalSelector: string): Promise<string | null> {
    const data = await this.readFile();
    return data.selectors[originalSelector]?.healedSelector ?? null;
  }

  async set(record: HealedSelectorRecord): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    // Parallel Playwright workers share this file: read-modify-write under a lock,
    // and rename a temp file so no reader ever sees half-written JSON.
    await withFileLock(this.filePath, async () => {
      const data = await this.readFile();
      data.selectors[record.originalSelector] = mergeSelectorRecord(
        data.selectors[record.originalSelector],
        record
      );

      const tempPath = `${this.filePath}.${process.pid}.tmp`;
      await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      await fs.rename(tempPath, this.filePath);
    });
  }

  private async readFile(): Promise<JsonSelectorStoreFile> {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(content) as Partial<JsonSelectorStoreFile>;

      return {
        version: 1,
        selectors: parsed.selectors ?? {},
      };
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
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

export class ReadOnlySelectorStore implements SelectorStore {
  constructor(private readonly innerStore: SelectorStore) {}

  get(originalSelector: string): Promise<string | null> | string | null {
    return this.innerStore.get(originalSelector);
  }

  set(_record: HealedSelectorRecord): void {
    // Intentionally ignore writes in read-only mode.
  }
}

const LOCK_RETRY_MS = 20;
const LOCK_STALE_MS = 10000;

// ponytail: lock file, not a lock library. A lock older than LOCK_STALE_MS is treated as left by a
// crashed worker and removed; two waiters removing it at once is possible but needs a crash first.
async function withFileLock(filePath: string, fn: () => Promise<void>): Promise<void> {
  const lockPath = `${filePath}.lock`;

  for (;;) {
    try {
      await (await fs.open(lockPath, 'wx')).close();
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }

      const stat = await fs.stat(lockPath).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
        await fs.rm(lockPath, { force: true });
      }
      await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }

  try {
    await fn();
  } finally {
    await fs.rm(lockPath, { force: true });
  }
}

function mergeSelectorRecord(
  previous: HealedSelectorRecord | undefined,
  next: HealedSelectorRecord
): HealedSelectorRecord {
  const observedAt = next.lastVerifiedAt ?? next.updatedAt;
  const changed =
    !previous ||
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

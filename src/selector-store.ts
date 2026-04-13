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
    const data = await this.readFile();
    data.selectors[record.originalSelector] = mergeSelectorRecord(
      data.selectors[record.originalSelector],
      record
    );

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
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

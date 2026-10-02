import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from './paths.js';
import { readJson, writeJson } from './storage.js';

export const historyLimit = 500;
function valid(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 20000 && value.trim().length > 0
    && !/^\s/.test(value) && !/[\x00-\x1f\x7f-\x9f]/.test(value);
}
export class InputHistory {
  private file?: string;
  entries: string[];
  constructor(project?: string) {
    this.file = project ? join(stateDir(project), 'input-history.json') : undefined;
    this.entries = this.load();
  }
  private load(): string[] {
    if (!this.file || !existsSync(this.file)) return [];
    try {
      const stored = readJson<unknown>(this.file);
      return Array.isArray(stored) ? [...new Set(stored.filter(valid))].slice(0, historyLimit) : [];
    } catch { return []; }
  }
  remember(line: string) {
    if (!valid(line)) return;
    this.entries = [...new Set([line, ...this.load(), ...this.entries])].slice(0, historyLimit);
    if (this.file) writeJson(this.file, this.entries);
  }
}

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from './paths.js';
import { readJson, writeJson } from './storage.js';

export const thinkingLevels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const;
export type ThinkingLevel = typeof thinkingLevels[number];
export type Preferences = { thinkingLevel: ThinkingLevel; showReasoning: boolean };
export function preferences(project: string): Preferences {
  const file = join(stateDir(project), 'ui.json');
  const stored = existsSync(file) ? readJson<Partial<Preferences>>(file) : {};
  return { thinkingLevel: thinkingLevels.includes(stored.thinkingLevel!) ? stored.thinkingLevel! : 'medium',
    showReasoning: stored.showReasoning !== false };
}
export function savePreferences(project: string, settings: Preferences) { writeJson(join(stateDir(project), 'ui.json'), settings); }

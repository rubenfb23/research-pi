import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const resource = (name: string) => join(ROOT, 'resources', name);
export const stateDir = (project: string) => join(resolve(project), '.research-pi');

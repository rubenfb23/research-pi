import { fileURLToPath } from 'node:url';
import { join, resolve, isAbsolute } from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const resource = (name: string) => join(ROOT, 'resources', name);
export const stateDir = (project: string) => join(resolve(project), '.research-pi');
export const installedPackage = () => existsSync(join(ROOT, 'package-runtime.json'));
export function userDataDirectory(platform: string = process.platform, env: NodeJS.ProcessEnv = process.env, home = homedir()): string {
  if (env.RESEARCH_PI_DATA_DIR) {
    if (!isAbsolute(env.RESEARCH_PI_DATA_DIR)) throw new Error('RESEARCH_PI_DATA_DIR debe ser una ruta absoluta.');
    return env.RESEARCH_PI_DATA_DIR;
  }
  if (platform === 'win32') return join(env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'ResearchPi');
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'ResearchPi');
  return join(env.XDG_DATA_HOME && isAbsolute(env.XDG_DATA_HOME) ? env.XDG_DATA_HOME : join(home, '.local', 'share'), 'research-pi');
}
export const installationDataDirectory = () => process.env.RESEARCH_PI_DATA_DIR || installedPackage()
  ? userDataDirectory() : join(ROOT, '.research-pi');
export const pythonVenvDirectory = () => process.env.RESEARCH_PI_DATA_DIR || installedPackage()
  ? join(installationDataDirectory(), '.venv') : join(ROOT, '.venv');

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import type { AuthInteraction, AuthType } from '@earendil-works/pi-ai';
import { ROOT, installationDataDirectory, stateDir } from './paths.js';
import { readJson, writeJson } from './storage.js';

export interface AgentConfig { provider: string; model: string; authMode?: AuthType; }
export const mockConfig: AgentConfig = { provider: 'researchpi-mock', model: 'offline-test' };
// Installation-local credentials are reused across projects, never across applications.
export const connectionDir = () => join(installationDataDirectory(), 'connections');
export const connectionConfig = () => join(connectionDir(), 'config.json');
export const connectionAuth = () => join(connectionDir(), 'auth.json');
export function selectedConfig(project: string): AgentConfig | undefined {
  const local = join(stateDir(project), 'config.json');
  const file = existsSync(local) ? local : connectionConfig();
  return existsSync(file) ? readJson<AgentConfig>(file) : undefined;
}
export function saveConnection(project: string, config: AgentConfig): void {
  writeJson(connectionConfig(), config);
  writeJson(join(stateDir(project), 'config.json'), config);
}
export function deviceId(): string {
  const file = join(connectionDir(), 'device-id');
  mkdirSync(connectionDir(), { recursive: true, mode: 0o700 });
  try { writeFileSync(file, randomUUID(), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  const id = readFileSync(file, 'utf8').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Identificador de instalación inválido.');
  return id;
}
export async function connectionRuntime(authPath = connectionAuth()) {
  mkdirSync(connectionDir(), { recursive: true, mode: 0o700 });
  if (existsSync(authPath)) chmodSync(authPath, 0o600);
  const runtime = await ModelRuntime.create({ authPath, modelsPath: null, refreshOnCreate: false });
  const version = readJson<{ version: string }>(join(ROOT, 'package.json')).version;
  // Preserve Pi's native API adapters and catalog; identify this harness to OpenCode.
  for (const provider of ['opencode', 'opencode-go']) {
    runtime.registerProvider(provider, { headers: { 'User-Agent': `ResearchPi/${version}`, 'x-opencode-client': 'ResearchPi' } });
  }
  return runtime;
}
export const connections = {
  claude: { provider: 'anthropic', authMode: 'api_key', label: 'Claude · clave de API', preferred: 'claude-sonnet-4-6' },
  codex: { provider: 'openai', authMode: 'oauth', label: 'Codex / OpenAI · iniciar sesión con ChatGPT', preferred: 'gpt-5.3-codex' },
  openai: { provider: 'openai', authMode: 'api_key', label: 'OpenAI · clave de API', preferred: 'gpt-5.3-codex' },
  opencode: { provider: 'opencode', authMode: 'api_key', label: 'OpenCode Zen · clave de API', preferred: 'claude-sonnet-4-6' },
  'opencode-go': { provider: 'opencode-go', authMode: 'api_key', label: 'OpenCode Go · clave de API', preferred: 'glm-5.3' },
  offline: { provider: mockConfig.provider, label: 'Prueba sin conexión (sin razonamiento científico)', preferred: mockConfig.model },
} as const;
export const connectionNames = Object.keys(connections).join(', ');
export type ConnectionName = keyof typeof connections;
export function connectionName(value: string): ConnectionName {
  if (!Object.hasOwn(connections, value)) throw new Error(`Elige ${connectionNames}.`);
  return value as ConnectionName;
}
export interface ConnectionUI {
  choose(message: string, options: { id: string; label: string }[]): Promise<string>;
  interaction: AuthInteraction;
  message(text: string): void;
}
export async function connect(project: string, name: ConnectionName | undefined, ui: ConnectionUI,
  modelId?: string, runtime?: ModelRuntime, persist = (config: AgentConfig) => saveConnection(project, config)): Promise<AgentConfig> {
  const chosen = name ?? connectionName(await ui.choose('¿Cómo quieres conectar ResearchPi?',
    Object.entries(connections).map(([id, value]) => ({ id, label: value.label }))));
  const entry = connections[chosen];
  if (chosen === 'offline') {
    if (modelId && modelId !== mockConfig.model) throw new Error('La prueba offline solo admite offline-test.');
    persist(mockConfig); return mockConfig;
  }
  const live = entry as Extract<(typeof connections)[ConnectionName], { authMode: AuthType }>;
  const models = runtime ?? await connectionRuntime();
  const catalog = [...models.getModels(live.provider)].filter(m => m.input.includes('text'));
  catalog.sort((a, b) => Number(b.id === live.preferred) - Number(a.id === live.preferred) || a.id.localeCompare(b.id));
  const selected = modelId ?? await ui.choose('Elige modelo (el catálogo no garantiza acceso en tu cuenta):',
    catalog.map(m => ({ id: m.id, label: m.name + ' · ' + m.id })));
  if (!catalog.some(m => m.id === selected)) throw new Error('Modelo desconocido; usa models para consultar el catálogo.');
  if (chosen === 'claude') ui.message('Claude usa la API de Anthropic, con facturación de API. Crea tu clave en https://platform.claude.com/settings/keys');
  if (chosen === 'codex') ui.message('Pi abrirá Sign in with ChatGPT. Usa tu propia cuenta; no se importan credenciales de la app Codex.');
  if (chosen === 'opencode' || chosen === 'opencode-go') ui.message(`OpenCode ${chosen === 'opencode' ? 'Zen' : 'Go'} usa tu API key de https://opencode.ai/auth. El acceso y los cargos dependen de tu cuenta y plan.`);
  try {
    const available = await models.checkAuth(live.provider);
    const reuse = available?.type === live.authMode && await ui.choose('Ya hay credenciales configuradas:',
      [{ id: 'reuse', label: 'Usar la conexión existente' }, { id: 'replace', label: 'Conectar con otras credenciales' }]) === 'reuse';
    if (!reuse) await models.login(live.provider, live.authMode, ui.interaction, { getDeviceId: deviceId });
  } catch {
    // Provider errors can contain token responses; never echo them or entered secrets.
    throw new Error('No se completó la conexión. Se conserva la selección anterior. Vuelve a intentarlo con connect.');
  }
  if (existsSync(connectionAuth())) chmodSync(connectionAuth(), 0o600);
  const config: AgentConfig = { provider: live.provider, model: selected, authMode: live.authMode };
  persist(config);
  ui.message('Conexión guardada. El acceso al modelo se verificará con la primera respuesta real.');
  return config;
}
export async function changeModel(project: string, modelId: string) {
  const config = selectedConfig(project);
  if (!config) throw new Error('Conecta primero con connect.');
  if (config.provider === mockConfig.provider ? modelId !== mockConfig.model
    : !(await connectionRuntime()).getModel(config.provider, modelId)) throw new Error('Modelo desconocido. Consulta models.');
  saveConnection(project, { ...config, model: modelId });
}
export function openAuthBrowser(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'auth.openai.com') return;
  const [exe, args] = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]] : ['xdg-open', [url]];
  const child = spawn(exe!, args!, { stdio: 'ignore', detached: true });
  child.on('error', () => {}); child.unref();
}

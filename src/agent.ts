import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Type, type AssistantMessage, type TranscriptContext } from '@earendil-works/pi-ai';
import { createAssistantMessageEventStream } from '@earendil-works/pi-ai/utils/event-stream';
import {
  createAgentSession, createExtensionRuntime, defineTool, ModelRuntime,
  SessionManager, SettingsManager, type ResourceLoader, type ToolDefinition,
} from '@earendil-works/pi-coding-agent';
import { resource, stateDir } from './paths.js';
import { projectStatus, readJson, writeJson } from './storage.js';

export interface AgentConfig { provider: string; model: string; }
export const mockConfig: AgentConfig = { provider: 'researchpi-mock', model: 'offline-test' };
export const toolResult = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data) }], details: {},
});
export function statusTool(project: string) {
  return defineTool({
    name: 'project_status', label: 'Scientific project status',
    description: 'Read the persisted scientific protocol independently of the conversation.',
    parameters: Type.Object({}),
    async execute() { return toolResult(projectStatus(project)); },
  });
}

// A deterministic test transport, explicitly not a scientific reasoning model.
function mockStream(model: Parameters<NonNullable<Parameters<ModelRuntime['registerProvider']>[1]['streamSimple']>>[0], context: TranscriptContext) {
  const stream = createAssistantMessageEventStream();
  queueMicrotask(() => {
    const last = context.messages.at(-1);
    const text = last && 'content' in last ? (typeof last.content === 'string' ? last.content
      : last.content.filter(c => c.type === 'text').map(c => c.text).join('')) : '';
    const requested = last?.role === 'user' ? /^\[tool:([a-z_]+)\](?: (\{.*\}))?$/.exec(text) : null;
    const call = requested !== null;
    const message: AssistantMessage = {
      role: 'assistant', api: model.api, provider: model.provider, model: model.id,
      content: call ? [{ type: 'toolCall', id: 'mock-' + requested[1], name: requested[1]!, arguments: requested[2] ? JSON.parse(requested[2]) : {} }]
        : [{ type: 'text', text: 'ResearchPi OFFLINE TEST: SDK session, scientific resource and tools loaded. No live scientific reasoning.' }],
      stopReason: call ? 'toolUse' : 'stop', timestamp: Date.now(),
      usage: { input: 50, output: 20, cacheRead: 0, cacheWrite: 0, totalTokens: 70,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    };
    stream.push({ type: 'start', partial: message });
    stream.push({ type: 'done', reason: message.stopReason as 'stop' | 'toolUse', message });
    stream.end();
  });
  return stream;
}

export async function openResearchSession(project: string, config?: AgentConfig, customTools?: ToolDefinition[]) {
  const cwd = resolve(project);
  const dir = stateDir(cwd);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const settingsFile = join(dir, 'config.json');
  const selected = config ?? (existsSync(settingsFile) ? readJson<AgentConfig>(settingsFile) : mockConfig);
  const runtime = await ModelRuntime.create({
    authPath: join(dir, 'auth.json'), modelsPath: null, refreshOnCreate: false,
  });
  if (selected.provider === mockConfig.provider) {
    runtime.registerProvider(mockConfig.provider, {
      api: 'researchpi-test', baseUrl: 'https://offline.invalid', apiKey: 'offline-test',
      streamSimple: mockStream,
      models: [{ id: mockConfig.model, name: 'Offline test transport', reasoning: false,
        input: ['text'], contextWindow: 32768, maxTokens: 2048,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }],
    });
  }
  const model = runtime.getModel(selected.provider, selected.model);
  if (!model) throw new Error(`Unknown model ${selected.provider}/${selected.model}`);
  if (selected.provider !== mockConfig.provider) {
    if (process.env.RESEARCH_PI_API_KEY) await runtime.setRuntimeApiKey(selected.provider, process.env.RESEARCH_PI_API_KEY);
    if (!runtime.hasConfiguredAuth(selected.provider)) throw new Error('Set RESEARCH_PI_API_KEY or provider API key environment variable; no live request sent.');
  }
  const promptFile = resource('system.md');
  const loader: ResourceLoader = {
    getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
    getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }),
    getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }),
    getSystemPrompt: () => readFileSync(promptFile, 'utf8'),
    getSystemPromptSource: () => ({ path: promptFile }),
    getAppendSystemPrompt: () => [], getAppendSystemPromptSources: () => [],
    extendResources: () => {}, reload: async () => {},
  };
  const pointer = join(dir, 'session-pointer.json');
  const sessions = join(dir, 'sessions');
  const manager = existsSync(pointer)
    ? SessionManager.open(readJson<{ path: string }>(pointer).path, sessions, cwd)
    : SessionManager.create(cwd, sessions);
  const tools = customTools ?? [statusTool(cwd)];
  const result = await createAgentSession({
    cwd, agentDir: dir, modelRuntime: runtime, model, resourceLoader: loader,
    tools: tools.map(t => t.name), customTools: tools, sessionManager: manager,
    settingsManager: SettingsManager.inMemory({ compaction: { enabled: false, keepRecentTokens: 128 }, retry: { enabled: false } }),
    thinkingLevel: 'off',
  });
  return { ...result, manager, selected, savePointer() {
    const path = manager.getSessionFile();
    if (path) writeJson(pointer, { path });
  } };
}

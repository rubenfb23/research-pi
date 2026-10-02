import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Type, type AssistantMessage, type TranscriptContext } from '@earendil-works/pi-ai';
import { createAssistantMessageEventStream } from '@earendil-works/pi-ai/utils/event-stream';
import {
  createAgentSessionFromServices, createAgentSessionServices, createAgentSessionRuntime, defineTool, ModelRuntime,
  SessionManager, type CreateAgentSessionRuntimeFactory, type ToolDefinition,
} from '@earendil-works/pi-coding-agent';
import { stateDir } from './paths.js';
import { projectStatus } from './storage.js';
import { connectionAuth, connectionRuntime, mockConfig, selectedConfig, type AgentConfig } from './connections.js';
import { preferences } from './preferences.js';
import { researchSystemPrompt } from './prompts.js';
import { Conversations, piDirectory, conversationDirectory } from './conversations.js';
import { piExtensions, researchSettings, type ResearchSettings } from './pi-features.js';
import { researchTools } from './tools.js';

export { mockConfig, type AgentConfig } from './connections.js';
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

export async function openResearchSession(project: string, config?: AgentConfig, customTools?: ToolDefinition[], options: { interactive?:boolean; sessionId?:string; newSession?:boolean; name?:string; settings?:ResearchSettings } = {}) {
  const cwd = resolve(project);
  const dir = stateDir(cwd);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const selected = config ?? selectedConfig(cwd) ?? mockConfig;
  // Preserve support for legacy project credentials; new onboarding uses installation credentials.
  const legacy = join(dir, 'auth.json');
  const runtime = await connectionRuntime(!selected.authMode && existsSync(legacy) ? legacy : connectionAuth());
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
    if (!await runtime.checkAuth(selected.provider)) throw new Error('No credentials. Run repi connect to choose a provider.');
  }
  const conversations = new Conversations(cwd);
  const manager = options.sessionId ? await conversations.find(options.sessionId).then(item => {
    if (resolve(item.cwd) !== cwd) throw new Error('Open this conversation from its recorded project directory.');
    return conversationsFromPath(item.path);
  }) : options.newSession ? conversations.create(options.name) : conversations.current();
  let first = true;
  const createRuntime: CreateAgentSessionRuntimeFactory = async ({cwd:targetCwd,sessionManager,sessionStartEvent}) => {
    const settings = researchSettings(targetCwd);
    const services = await createAgentSessionServices({
      cwd:targetCwd,agentDir:piDirectory(),modelRuntime:runtime,settingsManager:settings,
      resourceLoaderOptions:{
        extensionFactories:piExtensions(),
        systemPromptOverride:base => [base ? '# Additional workspace instructions\n'+base : '',researchSystemPrompt()].filter(Boolean).join('\n\n'),
      },
    });
    if (options.settings) settings.applyOverrides(options.settings);
    const configured=selectedConfig(targetCwd) ?? selected;
    const restored=sessionManager.buildSessionContext().model;
    const active = first ? model : (restored ? runtime.getModel(restored.provider,restored.modelId) : undefined)
      ?? runtime.getModel(settings.getDefaultProvider() ?? configured.provider,settings.getDefaultModel() ?? configured.model) ?? model;
    first = false;
    const result = await createAgentSessionFromServices({
      services,sessionManager,sessionStartEvent,model:active,
      customTools:customTools ?? researchTools(targetCwd),
      thinkingLevel:options.interactive ? undefined : active.reasoning ? preferences(targetCwd).thinkingLevel : 'off',
    });
    result.session.subscribe(event => {
      if (['agent_settled','message_end','session_info_changed','session_tree'].includes(event.type)) new Conversations(targetCwd).save(sessionManager);
    });
    return {...result,services,diagnostics:services.diagnostics};
  };
  const host = await createAgentSessionRuntime(createRuntime,{cwd,agentDir:piDirectory(),sessionManager:manager});
  if (!options.interactive) {
    const bind = async () => { await host.session.bindExtensions({}); new Conversations(host.cwd).save(host.session.sessionManager); };
    host.setRebindSession(bind); await bind();
  }
  return {
    runtime:host,get session(){return host.session;},get manager(){return host.session.sessionManager;},
    get selected(){return {...selected,provider:host.session.model?.provider ?? selected.provider,model:host.session.model?.id ?? selected.model};},
    getModels:() => runtime.getModels(host.session.model?.provider ?? selected.provider),
    savePointer(){new Conversations(host.cwd).save(host.session.sessionManager);},
    async dispose(){await host.dispose();},
  };
}

function conversationsFromPath(path:string) { return SessionManager.open(path,conversationDirectory()); }

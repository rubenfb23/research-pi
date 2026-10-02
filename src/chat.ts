import { openResearchSession } from './agent.js';
import { mockConfig, selectedConfig, connect, connectionName, changeModel, connectionRuntime, connections } from './connections.js';
import { terminalUI, EndOfInput } from './terminal.js';
import { projectStatus } from './storage.js';
import { providerFailure } from './provider-errors.js';
import { ResponseView, clean, paint, welcome } from './presentation.js';
import { preferences, savePreferences, thinkingLevels, type ThinkingLevel } from './preferences.js';
import { ROOT } from './paths.js';
import { readJson } from './storage.js';
import { join } from 'node:path';
import { completeChat } from './input-completion.js';
import { InteractiveMode, runPrintMode } from '@earendil-works/pi-coding-agent';
import { Conversations, piDirectory } from './conversations.js';

const help = [
  '/help                    Show commands',
  '/status                  Project and connection status',
  `/connect [${Object.keys(connections).join('|')}]`,
  '/model [id]              Select a model; omit the ID for the picker',
  '/models                  List the current provider catalog',
  '/thinking [level]        Reasoning effort: off, minimal, low, medium, high, xhigh',
  '/reasoning [on|off]       Show or hide the provider reasoning stream',
  '/compact                 Compact conversation; preserve scientific evidence',
  '/new [name]              Create a new conversation',
  '/chats [query]           List conversations across projects',
  '/resume <id>             Open a saved conversation',
  '/name <name>             Rename this conversation',
  '/fork [entry-id]         Fork this conversation',
  '/tree                    Show the conversation tree',
  '/export <path>           Export HTML or JSONL',
  '/reload                  Reload skills, extensions and project instructions',
  '/exit                    Close the session',
  'Tab completes; double Tab lists matches. Up/Down browse project history.',
  'Start a line with a space to omit it from input history.',
  'Ctrl+C cancels a response. Ctrl+D closes the session.',
].join('\n');
export async function chat(project: string, prompt?: string, options: { offline?: boolean; compact?: boolean; plain?:boolean; json?:boolean; sessionId?:string; newSession?:boolean; name?:string } = {}) {
  const controller = new AbortController();
  let opened: Awaited<ReturnType<typeof openResearchSession>> | undefined;
  let ui: ReturnType<typeof terminalUI> | undefined;
  let generating = false;
  let settings = preferences(project);
  const stop = () => {
    if (generating && opened) void opened.session.abort();
    else { controller.abort(); ui?.close(); }
  };
  process.on('SIGINT', stop);
  try {
    let config = options.offline ? mockConfig : selectedConfig(project);
    if (!config) {
      if (!process.stdin.isTTY) throw new Error('Connect using repi connect, or use chat --offline for an offline test.');
      ui = terminalUI(controller.signal, { project });
      config = await connect(project, undefined, ui);
    }
    const native = prompt === undefined && process.stdin.isTTY && process.stdout.isTTY && !options.plain && !options.json;
    if (native) process.env.PI_CODING_AGENT_DIR = piDirectory();
    opened = await openResearchSession(project, config, undefined, {...options,interactive:Boolean(native || options.json)});
    if (options.json) {
      if (prompt === undefined) throw new Error('JSON mode requires a prompt: repi chat --json "Your request".');
      process.exitCode=await runPrintMode(opened.runtime,{mode:'json',initialMessage:prompt});
      if (options.compact) await opened.session.compact();
      return;
    }
    if (native) {
      ui?.close(); ui=undefined; process.removeListener('SIGINT',stop);
      if (config.provider === mockConfig.provider) process.env.PI_OFFLINE='1';
      const mode = new InteractiveMode(opened.runtime,{startupDiagnostics:[...opened.runtime.diagnostics],modelFallbackMessage:opened.runtime.modelFallbackMessage});
      // The SDK's exit hint names its standalone CLI; route that one host hint to repi.
      const originalWrite=process.stdout.write;
      process.stdout.write=function(this:typeof process.stdout,chunk:any,...args:any[]) {
        if (typeof chunk === 'string') {
          const plain=chunk.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
          const hint=/^To resume this session: pi (?:--session-dir .+ )?--session ([a-f0-9-]+)\n$/.exec(plain);
          if (hint) chunk=`To resume this session: repi --session ${hint[1]}\n`;
        }
        return Reflect.apply(originalWrite,this,[chunk,...args]);
      } as typeof process.stdout.write;
      try { await mode.run(); } finally { process.stdout.write=originalWrite; }
      return;
    }
    const respond = async (text: string) => {
      let streamed = false;
      const view = new ResponseView(prompt === undefined, settings.showReasoning);
      view.start();
      const unsubscribe = opened!.session.subscribe(event => {
        if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
          streamed = true; view.text(event.assistantMessageEvent.delta);
        }
        if (event.type === 'message_update' && event.assistantMessageEvent.type === 'thinking_delta') view.thinking(event.assistantMessageEvent.delta);
        if (event.type === 'tool_execution_start') view.toolStart(event.toolCallId, event.toolName);
        if (event.type === 'tool_execution_end') view.toolEnd(event.toolCallId, event.toolName, event.isError);
      });
      generating = true;
      try {
        try { await opened!.session.prompt(text); }
        catch (error) { throw new Error(providerFailure(opened!.selected.provider, error)); }
        opened!.savePointer();
        const last = opened!.session.messages.at(-1);
        if (last?.role === 'assistant' && (last.stopReason === 'error' || last.stopReason === 'aborted')) {
          if (last.stopReason === 'aborted') { console.error('\nResponse cancelled.'); return; }
          throw new Error(providerFailure(opened!.selected.provider, last.errorMessage));
        }
        if (!streamed) view.text(opened!.session.getLastAssistantText() ?? '');
      } finally { view.finish(); generating = false; unsubscribe(); }
    };
    if (prompt !== undefined) {
      await respond(prompt);
      if (options.compact) { await opened.session.compact(); opened.savePointer(); console.error('Conversation compacted.'); }
      return;
    }
    ui ??= terminalUI(controller.signal, { project });
    const complete = (line: string) => completeChat(line, {
      providers: Object.keys(connections), thinking: opened!.session.getAvailableThinkingLevels(),
      models: /^\/model\s/.test(line) ? opened!.selected.provider === mockConfig.provider ? [mockConfig.model]
        : opened!.getModels().filter(model => model.input.includes('text')).map(model => model.id) : [],
    });
    ui.message(welcome(readJson<{ version: string }>(join(ROOT, 'package.json')).version,
      opened.selected.provider, opened.selected.model, project, opened.session.thinkingLevel, settings.showReasoning));
    if (config.provider === mockConfig.provider) ui.message('OFFLINE TEST: test transport without real scientific responses.');
    while (!controller.signal.aborted) {
      let text: string;
      try { text = (await ui.read('repi ❯', { history: true, completer: complete })).trim(); }
      catch (error) { if (error instanceof EndOfInput || controller.signal.aborted) break; throw error; }
      if (!text) continue;
      if (text === '/exit' || text === '/quit') break;
      try {
        if (text === '/help') { ui.message(help); continue; }
        if (text === '/new' || text.startsWith('/new ')) {
          opened.savePointer(); await opened.runtime.newSession();
          if (text.slice(4).trim()) opened.session.setSessionName(text.slice(4).trim());
          ui.message('New conversation: '+opened.session.sessionId); continue;
        }
        if (text === '/chats' || text.startsWith('/chats ')) {
          const items=await new Conversations(opened.runtime.cwd).list(true,text.slice(6).trim());
          ui.message(items.map(item => `${item.id}  ${item.name || item.firstMessage || 'Untitled'}  ${item.cwd}`).join('\n') || 'No conversations found.'); continue;
        }
        if (text.startsWith('/resume ')) {
          const item=await new Conversations(opened.runtime.cwd).find(text.slice(8).trim());
          await opened.runtime.switchSession(item.path); project=opened.runtime.cwd;
          settings=preferences(project); ui.close(); ui=terminalUI(controller.signal,{project});
          ui.message('Conversation opened: '+opened.session.sessionId); continue;
        }
        if (text.startsWith('/name ')) { opened.session.setSessionName(text.slice(6).trim()); ui.message('Conversation named: '+opened.session.sessionName); continue; }
        if (text === '/fork' || text.startsWith('/fork ')) {
          const id=text.slice(5).trim() || [...opened.manager.getEntries()].reverse().find(entry => entry.type === 'message' && entry.message.role === 'user')?.id;
          if (!id) throw new Error('No user message is available to fork.');
          await opened.runtime.fork(id,{position:'at'}); ui.message('Conversation forked: '+opened.session.sessionId); continue;
        }
        if (text === '/tree') { ui.message(JSON.stringify(opened.manager.getTree(),null,2)); continue; }
        if (text.startsWith('/export ')) {
          const path=text.slice(8).trim();
          ui.message(path.endsWith('.jsonl') ? opened.session.exportToJsonl(path) : await opened.session.exportToHtml(path)); continue;
        }
        if (text === '/reload') { await opened.session.reload(); ui.message('Resources reloaded.'); continue; }
        if (text === '/reasoning' || text.startsWith('/reasoning ')) {
          const value = text.slice(10).trim();
          if (value && !['on', 'off'].includes(value)) throw new Error('Use /reasoning on or /reasoning off.');
          if (value) { settings.showReasoning = value === 'on'; savePreferences(project, settings); }
          ui.message(`Provider reasoning stream: ${settings.showReasoning ? 'on' : 'off'}. Only content exposed by the provider is displayed.`); continue;
        }
        if (text === '/thinking' || text.startsWith('/thinking ')) {
          const available = opened.session.getAvailableThinkingLevels();
          const value = text.slice(9).trim();
          if (value) {
            if (!thinkingLevels.includes(value as ThinkingLevel) || !available.includes(value as ThinkingLevel))
              throw new Error(`Available reasoning levels for this model: ${available.join(', ')}.`);
            settings.thinkingLevel = value as ThinkingLevel; opened.session.setThinkingLevel(settings.thinkingLevel); savePreferences(project, settings);
          }
          ui.message(`Reasoning effort: ${opened.session.thinkingLevel}. Available: ${available.join(', ')}.`); continue;
        }
        if (text === '/models') {
          const models = opened.selected.provider === mockConfig.provider ? [{ id: mockConfig.model, name: 'Offline test transport' }]
            : (await connectionRuntime()).getModels(opened.selected.provider).map(model => ({ id: model.id, name: model.name }));
          console.log(JSON.stringify(models, null, 2)); continue;
        }
        if (text === '/status') {
          ui.message(paint('Project status', 'title') + `\n  Model: ${clean(opened.selected.provider)}/${clean(opened.selected.model)}\n  Reasoning: ${opened.session.thinkingLevel} · stream ${settings.showReasoning ? 'on' : 'off'}\n`
            + JSON.stringify(projectStatus(project), null, 2)); continue;
        }
        if (text === '/compact') { await opened.session.compact(); opened.savePointer(); ui.message('Conversation compacted; scientific evidence preserved.'); continue; }
        if (text === '/connect' || text.startsWith('/connect ')) {
          const value = text.slice('/connect'.length).trim();
          config = await connect(project, value ? connectionName(value) : undefined, ui);
        } else if (text === '/model' || text.startsWith('/model ')) {
          await changeModel(project, text.slice(6).trim() || undefined, ui); config = selectedConfig(project)!;
        } else if (text.startsWith('/') && !opened.session.resourceLoader.getPrompts().prompts.some(p => text.startsWith('/'+p.name))
          && !opened.session.resourceLoader.getSkills().skills.some(skill => text.startsWith('/skill:'+skill.name))
          && !opened.session.extensionRunner.getRegisteredCommands().some(command => text.startsWith('/'+command.name))) { ui.message('Unknown command. ' + help); continue; }
        else { await respond(text); continue; }
        opened.savePointer();
        const next = await openResearchSession(project, config);
        await opened.dispose(); opened = next;
        ui.message(`Active connection: ${opened.selected.provider}/${opened.selected.model}`);
      } catch (error) {
        if (controller.signal.aborted) break;
        ui.message(paint(clean(error instanceof Error ? error.message : 'The operation did not complete.'), 'error'));
      }
    }
  } finally {
    opened?.savePointer(); await opened?.dispose(); ui?.close(); process.removeListener('SIGINT', stop);
  }
}

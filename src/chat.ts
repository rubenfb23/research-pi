import { openResearchSession } from './agent.js';
import { mockConfig, selectedConfig, connect, connectionName, changeModel, connectionRuntime, connections } from './connections.js';
import { terminalUI, EndOfInput } from './terminal.js';
import { researchTools } from './tools.js';
import { projectStatus } from './storage.js';
import { providerFailure } from './provider-errors.js';
import { ResponseView, clean, paint, welcome } from './presentation.js';
import { preferences, savePreferences, thinkingLevels, type ThinkingLevel } from './preferences.js';
import { ROOT } from './paths.js';
import { readJson } from './storage.js';
import { join } from 'node:path';

const help = [
  '/help                    Show commands',
  '/status                  Project and connection status',
  `/connect [${Object.keys(connections).join('|')}]`,
  '/model [id]              Select a model; omit the ID for the picker',
  '/models                  List the current provider catalog',
  '/thinking [level]        Reasoning effort: off, minimal, low, medium, high, xhigh',
  '/reasoning [on|off]       Show or hide the provider reasoning stream',
  '/compact                 Compact conversation; preserve scientific evidence',
  '/exit                    Close the session',
  'Ctrl+C cancels a response. Ctrl+D closes the session.',
].join('\n');
export async function chat(project: string, prompt?: string, options: { offline?: boolean; compact?: boolean } = {}) {
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
      ui = terminalUI(controller.signal);
      config = await connect(project, undefined, ui);
    }
    opened = await openResearchSession(project, config, researchTools(project));
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
    ui ??= terminalUI(controller.signal);
    ui.message(welcome(readJson<{ version: string }>(join(ROOT, 'package.json')).version,
      opened.selected.provider, opened.selected.model, project, opened.session.thinkingLevel, settings.showReasoning));
    if (config.provider === mockConfig.provider) ui.message('OFFLINE TEST: test transport without real scientific responses.');
    while (!controller.signal.aborted) {
      let text: string;
      try { text = (await ui.read('repi ❯')).trim(); }
      catch (error) { if (error instanceof EndOfInput || controller.signal.aborted) break; throw error; }
      if (!text) continue;
      if (text === '/exit' || text === '/quit') break;
      try {
        if (text === '/help') { ui.message(help); continue; }
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
        } else if (text.startsWith('/')) { ui.message('Unknown command. ' + help); continue; }
        else { await respond(text); continue; }
        opened.savePointer();
        const next = await openResearchSession(project, config, researchTools(project));
        opened.session.dispose(); opened = next;
        ui.message(`Active connection: ${opened.selected.provider}/${opened.selected.model}`);
      } catch (error) {
        if (controller.signal.aborted) break;
        ui.message(paint(clean(error instanceof Error ? error.message : 'The operation did not complete.'), 'error'));
      }
    }
  } finally {
    opened?.savePointer(); opened?.session.dispose(); ui?.close(); process.removeListener('SIGINT', stop);
  }
}

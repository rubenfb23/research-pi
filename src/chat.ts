import { openResearchSession } from './agent.js';
import { mockConfig, selectedConfig, connect, connectionName, changeModel } from './connections.js';
import { terminalUI, EndOfInput } from './terminal.js';
import { researchTools } from './tools.js';
import { projectStatus } from './storage.js';

const help = '/help · /status · /connect [claude|codex|openai|offline] · /model <id> · /compact · /exit';
export async function chat(project: string, prompt?: string, options: { offline?: boolean; compact?: boolean } = {}) {
  const controller = new AbortController();
  let opened: Awaited<ReturnType<typeof openResearchSession>> | undefined;
  let ui: ReturnType<typeof terminalUI> | undefined;
  let generating = false;
  const stop = () => {
    if (generating && opened) void opened.session.abort();
    else { controller.abort(); ui?.close(); }
  };
  process.on('SIGINT', stop);
  try {
    let config = options.offline ? mockConfig : selectedConfig(project);
    if (!config) {
      if (!process.stdin.isTTY) throw new Error('Conecta con repi connect o usa chat --offline para una prueba sin conexión.');
      ui = terminalUI(controller.signal);
      config = await connect(project, undefined, ui);
    }
    opened = await openResearchSession(project, config, researchTools(project));
    const respond = async (text: string) => {
      let streamed = false;
      const unsubscribe = opened!.session.subscribe(event => {
        if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
          streamed = true; process.stdout.write(event.assistantMessageEvent.delta);
        }
        if (event.type === 'tool_execution_start') console.error(`Herramienta: ${event.toolName}`);
      });
      generating = true;
      try {
        await opened!.session.prompt(text); opened!.savePointer();
        const last = opened!.session.messages.at(-1);
        if (last?.role === 'assistant' && (last.stopReason === 'error' || last.stopReason === 'aborted')) {
          if (last.stopReason === 'aborted') { console.error('\nRespuesta cancelada.'); return; }
          throw new Error('El proveedor no completó la respuesta. Comprueba acceso al modelo, saldo y conexión con connect.');
        }
        if (!streamed) console.log(opened!.session.getLastAssistantText());
        else process.stdout.write('\n');
      } finally { generating = false; unsubscribe(); }
    };
    if (prompt !== undefined) {
      await respond(prompt);
      if (options.compact) { await opened.session.compact(); opened.savePointer(); console.error('Conversación compactada.'); }
      return;
    }
    ui ??= terminalUI(controller.signal);
    ui.message(`ResearchPi · ${opened.selected.provider}/${opened.selected.model}\nProyecto: ${project}\n${help}`);
    if (config.provider === mockConfig.provider) ui.message('OFFLINE TEST: transporte de prueba, sin respuestas científicas reales.');
    while (!controller.signal.aborted) {
      let text: string;
      try { text = (await ui.read('repi >')).trim(); }
      catch (error) { if (error instanceof EndOfInput || controller.signal.aborted) break; throw error; }
      if (!text) continue;
      if (text === '/exit' || text === '/quit') break;
      try {
        if (text === '/help') { ui.message(help); continue; }
        if (text === '/status') {
          console.log(JSON.stringify({ connection: opened.selected, ...projectStatus(project) }, null, 2)); continue;
        }
        if (text === '/compact') { await opened.session.compact(); opened.savePointer(); ui.message('Conversación compactada; evidencia científica conservada.'); continue; }
        if (text === '/connect' || text.startsWith('/connect ')) {
          const value = text.slice('/connect'.length).trim();
          config = await connect(project, value ? connectionName(value) : undefined, ui);
        } else if (text.startsWith('/model ')) {
          await changeModel(project, text.slice(7).trim()); config = selectedConfig(project)!;
        } else if (text.startsWith('/')) { ui.message('Comando desconocido. ' + help); continue; }
        else { await respond(text); continue; }
        opened.savePointer();
        const next = await openResearchSession(project, config, researchTools(project));
        opened.session.dispose(); opened = next;
        ui.message(`Conexión activa: ${opened.selected.provider}/${opened.selected.model}`);
      } catch (error) {
        if (controller.signal.aborted) break;
        ui.message(error instanceof Error ? error.message : 'No se completó la operación.');
      }
    }
  } finally {
    opened?.savePointer(); opened?.session.dispose(); ui?.close(); process.removeListener('SIGINT', stop);
  }
}

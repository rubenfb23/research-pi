import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import type { AuthInteraction, AuthPrompt } from '@earendil-works/pi-ai';
import { openAuthBrowser, type ConnectionUI } from './connections.js';
import { clean, paint } from './presentation.js';
import { type Completer, type Completion } from './input-completion.js';
import { InputHistory, historyLimit } from './input-history.js';

export class EndOfInput extends Error { constructor() { super('Input closed.'); } }
export function terminalUI(signal?: AbortSignal, options: { project?: string } = {}): ConnectionUI & {
  read(message: string, options?: { history?: boolean; completer?: Completer }): Promise<string>; close(): void;
} {
  let muted = false, ended = false;
  const terminal = Boolean(process.stdin.isTTY && process.stderr.isTTY);
  const inputHistory = new InputHistory(options.project);
  const history: string[] = [];
  let activeCompleter: Completer | undefined;
  let historyEnabled = false;
  const output = new Writable({ write(chunk, _encoding, done) { if (!muted) process.stderr.write(chunk); done(); } });
  Object.defineProperty(output, 'columns', { get: () => process.stderr.columns });
  const resized = () => output.emit('resize');
  process.stderr.on('resize', resized);
  const rl = createInterface({ input: process.stdin, output, terminal, historySize: historyLimit, history,
    removeHistoryDuplicates: true, completer(line, callback) {
      try {
        const result: Completion | Promise<Completion> = muted ? [[], line] : activeCompleter?.(line) ?? [[], line];
        if (result instanceof Promise) result.then(value => callback(null, value), () => callback(null, [[], line]));
        else callback(null, result);
      } catch { callback(null, [[], line]); }
    } });
  rl.setPrompt('');
  // The documented history event allows removing secret/setup input before it can be recalled.
  rl.on('history', entries => entries.splice(0, entries.length, ...(historyEnabled ? inputHistory.entries : [])));
  const queued: string[] = [];
  let pending: { resolve(value: string): void; reject(error: Error): void } | undefined;
  rl.on('line', line => { if (pending) { const p = pending; pending = undefined; p.resolve(line); } else queued.push(line); });
  rl.on('close', () => { ended = true; pending?.reject(new EndOfInput()); pending = undefined; process.stderr.removeListener('resize', resized); });
  rl.on('SIGINT', () => { process.emit('SIGINT'); });
  async function read(message: string, secret = false, promptSignal?: AbortSignal,
    settings: { history?: boolean; completer?: Completer } = {}): Promise<string> {
    if (secret && !terminal) throw new Error('Enter keys only in an interactive terminal; use environment variables in CI.');
    const cancel = promptSignal && signal ? AbortSignal.any([promptSignal, signal]) : promptSignal ?? signal;
    cancel?.throwIfAborted();
    historyEnabled = !secret && Boolean(settings.history);
    activeCompleter = secret ? undefined : settings.completer;
    history.splice(0, history.length, ...(historyEnabled ? inputHistory.entries : []));
    const label = paint(clean(message), 'accent') + ' ';
    if (secret) { process.stderr.write(label); rl.setPrompt(''); }
    else { rl.setPrompt(label); rl.prompt(); }
    muted = secret;
    const abort = () => { pending?.reject(new Error('Operation cancelled.')); pending = undefined; };
    try {
      const value = queued.length ? queued.shift()! : ended ? await Promise.reject(new EndOfInput()) : await new Promise<string>((resolve, reject) => {
        pending = { resolve, reject }; cancel?.addEventListener('abort', abort, { once: true });
      });
      if (historyEnabled && terminal) inputHistory.remember(value);
      return value;
    } finally {
      cancel?.removeEventListener('abort', abort); muted = false; historyEnabled = false;
      activeCompleter = undefined; history.splice(0); rl.setPrompt('');
      if (secret) process.stderr.write('\n');
    }
  }
  const message = (text: string) => { process.stderr.write(text + '\n'); };
  async function choose(title: string, options: { id: string; label: string }[]): Promise<string> {
    message(title);
    options.forEach((o, i) => message(`  ${paint(String(i + 1).padStart(2), 'accent')}. ${clean(o.label)}`));
    for (;;) {
      const input = (await read('Option [1]:', false, undefined, {
        completer: line => [options.map(option => option.id).filter(id => id.startsWith(line)), line],
      })).trim();
      const selected = options.find(o => o.id === input) ?? options[input ? Number(input) - 1 : 0];
      if (selected) return selected.id;
      message('Enter a number or an identifier from the list.');
    }
  }
  const interaction: AuthInteraction = {
    signal,
    async prompt(prompt: AuthPrompt) {
      if (prompt.type === 'select') return choose(prompt.message, [...prompt.options]);
      const secret = prompt.type === 'secret' || prompt.type === 'manual_code';
      const value = await read(prompt.message, secret, prompt.signal);
      if (!value.trim()) throw new Error('Empty input.');
      return value.trim();
    },
    notify(event) {
      if (event.type === 'auth_url') { message(`Open this link if the browser does not open:\n${event.url}`); openAuthBrowser(event.url); }
      else if (event.type === 'device_code') message(`${event.verificationUri}\nCode: ${event.userCode}`);
      else { message(event.message); if (event.type === 'info') event.links?.forEach(link => message(link.url)); }
    },
  };
  return { choose, message, interaction, read: (text, settings) => read(text, false, undefined, settings), close: () => { rl.close(); output.end(); } };
}

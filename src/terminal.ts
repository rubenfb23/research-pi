import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import type { AuthInteraction, AuthPrompt } from '@earendil-works/pi-ai';
import { openAuthBrowser, type ConnectionUI } from './connections.js';

export class EndOfInput extends Error { constructor() { super('Input closed.'); } }
export function terminalUI(signal?: AbortSignal): ConnectionUI & { read(message: string): Promise<string>; close(): void } {
  let muted = false, ended = false;
  const output = new Writable({ write(chunk, _encoding, done) { if (!muted) process.stderr.write(chunk); done(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY), historySize: 0 });
  const queued: string[] = [];
  let pending: { resolve(value: string): void; reject(error: Error): void } | undefined;
  rl.on('line', line => { if (pending) { const p = pending; pending = undefined; p.resolve(line); } else queued.push(line); });
  rl.on('close', () => { ended = true; pending?.reject(new EndOfInput()); pending = undefined; });
  rl.on('SIGINT', () => { process.emit('SIGINT'); });
  async function read(message: string, secret = false, promptSignal?: AbortSignal): Promise<string> {
    if (secret && !process.stdin.isTTY) throw new Error('Enter keys only in an interactive terminal; use environment variables in CI.');
    const cancel = promptSignal && signal ? AbortSignal.any([promptSignal, signal]) : promptSignal ?? signal;
    cancel?.throwIfAborted();
    process.stderr.write(message + ' ');
    muted = secret;
    const abort = () => { pending?.reject(new Error('Operation cancelled.')); pending = undefined; };
    try {
      if (queued.length) return queued.shift()!;
      if (ended) throw new EndOfInput();
      return await new Promise<string>((resolve, reject) => {
        pending = { resolve, reject }; cancel?.addEventListener('abort', abort, { once: true });
      });
    } finally { cancel?.removeEventListener('abort', abort); muted = false; if (secret) process.stderr.write('\n'); }
  }
  const message = (text: string) => { process.stderr.write(text + '\n'); };
  async function choose(title: string, options: { id: string; label: string }[]): Promise<string> {
    message(title);
    options.forEach((o, i) => message(`  ${i + 1}. ${o.label}`));
    for (;;) {
      const input = (await read('Option [1]:')).trim();
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
  return { choose, message, interaction, read: text => read(text), close: () => { rl.close(); output.end(); } };
}

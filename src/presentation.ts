import { stripVTControlCharacters } from 'node:util';

type Sink = { write(text: string): unknown; isTTY?: boolean; columns?: number };
const codes = { accent: '36', title: '1;36', dim: '2', success: '32', error: '31', thinking: '90' };
export function paint(text: string, tone: keyof typeof codes, sink: Sink = process.stderr): string {
  return sink.isTTY && !('NO_COLOR' in process.env) && process.env.TERM !== 'dumb'
    ? `\x1b[${codes[tone]}m${text}\x1b[0m` : text;
}
export function clean(text: string): string {
  return stripVTControlCharacters(text).replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '');
}

// Drop terminal controls even when a provider splits an escape sequence across deltas.
class StreamFilter {
  private state: 'text' | 'escape' | 'csi' | 'osc' | 'oscEscape' = 'text';
  push(text: string): string {
    let output = '';
    for (const char of text) {
      const code = char.charCodeAt(0);
      if (this.state === 'escape') {
        this.state = char === '[' ? 'csi' : char === ']' || char === 'P' || char === '^' || char === '_' ? 'osc' : 'text';
      } else if (this.state === 'csi') { if (code >= 0x40 && code <= 0x7e) this.state = 'text'; }
      else if (this.state === 'osc') { if (char === '\x07' || char === '\x9c') this.state = 'text'; else if (char === '\x1b') this.state = 'oscEscape'; }
      else if (this.state === 'oscEscape') { this.state = char === '\\' ? 'text' : 'osc'; }
      else if (char === '\x1b') this.state = 'escape';
      else if (char === '\x9b') this.state = 'csi';
      else if (char === '\x9d') this.state = 'osc';
      else if (char === '\n' || char === '\t' || (code >= 32 && !(code >= 127 && code <= 159))) output += char;
    }
    return output;
  }
}

// Format headings and emphasis without buffering a whole line or answer.
class MarkdownStream {
  private startOfLine = true;
  private heading = '';
  private star = false;
  private bold = false;
  private backticks = '';
  private fenced = false;
  private inlineCode = false;
  push(text: string): string {
    let result = '';
    for (const char of text) {
      if (this.startOfLine && char === '`') { this.backticks += char; continue; }
      if (this.backticks) {
        if (this.backticks.length >= 3) this.fenced = !this.fenced;
        else this.inlineCode = this.backticks.length % 2 === 1;
        result += this.backticks; this.backticks = ''; this.startOfLine = false;
      }
      if (this.fenced || this.inlineCode || char === '`') {
        if (!this.fenced && char === '`') this.inlineCode = !this.inlineCode;
        result += char; this.startOfLine = char === '\n';
        if (char === '\n') this.inlineCode = false;
        continue;
      }
      if (this.startOfLine && char === '#' && this.heading.length < 6) { this.heading += char; continue; }
      if (this.heading) {
        result += char === ' ' ? '\x1b[1;36m' : this.heading;
        this.heading = ''; this.startOfLine = false;
        if (char === ' ') continue;
      }
      if (this.star) {
        this.star = false;
        if (char === '*') { this.bold = !this.bold; result += this.bold ? '\x1b[1m' : '\x1b[22m'; continue; }
        result += '*';
      }
      if (char === '*') { this.star = true; continue; }
      if (char === '\n') { result += '\x1b[0m\n'; this.startOfLine = true; if (this.bold) result += '\x1b[1m'; }
      else { result += char; this.startOfLine = false; }
    }
    return result;
  }
  finish(): string {
    const tail = this.heading + this.backticks + (this.star ? '*' : '') + '\x1b[0m';
    this.heading = ''; this.star = false; this.bold = false; this.startOfLine = true;
    this.backticks = ''; this.inlineCode = false; this.fenced = false;
    return tail;
  }
}

export function welcome(version: string, provider: string, model: string, project: string, thinking: string, visible: boolean): string {
  const width = Math.max(20, Math.min(72, (process.stderr.columns ?? 80) - 2));
  const line = '─'.repeat(width);
  return `\n${paint(line, 'accent')}\n${paint('  ResearchPi', 'title')}  ${paint('v' + version + ' · ML / AI / Computer Science', 'dim')}\n\n`
    + `  ${paint('Model', 'accent')}      ${clean(provider)}/${clean(model)}\n`
    + `  ${paint('Project', 'accent')}    ${clean(project)}\n`
    + `  ${paint('Reasoning', 'accent')}  ${thinking} · stream ${visible ? 'on' : 'off'}\n\n`
    + `  ${paint('/help', 'accent')} commands   ${paint('/model', 'accent')} select model   ${paint('/exit', 'accent')} quit\n`
    + `  ${paint('Tab', 'accent')} complete · ${paint('↑ / ↓', 'accent')} history\n`
    + `${paint(line, 'accent')}\n`;
}

/** Answer stays on stdout; provider reasoning and activity stay on stderr. */
export class ResponseView {
  private channel?: 'answer' | 'thinking';
  private lineOpen = false;
  private answerFilter = new StreamFilter();
  private thinkingFilter = new StreamFilter();
  private markdown = new MarkdownStream();
  private styledAnswer = false;
  private timer?: ReturnType<typeof setInterval>;
  private tick = 0;
  private tools = new Map<string, number>();
  constructor(private interactive: boolean, private showReasoning: boolean,
    private out: Sink = process.stdout, private err: Sink = process.stderr) {}
  start() {
    if (this.interactive && this.err.isTTY && !('NO_COLOR' in process.env) && process.env.TERM !== 'dumb') {
      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧'];
      this.timer = setInterval(() => this.err.write(`\r\x1b[2K${paint(frames[this.tick++ % frames.length]! + ' Working…', 'dim', this.err)}`), 100);
      this.timer.unref();
    }
  }
  private stopSpinner() {
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; this.err.write('\r\x1b[2K'); }
  }
  private endLine() {
    if (this.channel === 'answer' && this.styledAnswer) this.out.write(this.markdown.finish());
    if (this.lineOpen) (this.channel === 'answer' ? this.out : this.err).write('\n');
    this.lineOpen = false;
  }
  private select(channel: 'answer' | 'thinking') {
    this.stopSpinner();
    if (this.channel !== channel) {
      this.endLine(); this.channel = channel;
      if (this.interactive || channel === 'thinking') this.err.write('\n' + paint(channel === 'answer' ? '◆ ResearchPi' : '◇ Reasoning · provider stream', channel === 'answer' ? 'title' : 'thinking', this.err) + '\n');
    }
  }
  text(delta: string) {
    const text = this.answerFilter.push(delta); if (!text) return;
    this.select('answer');
    this.styledAnswer = Boolean(this.out.isTTY && !('NO_COLOR' in process.env) && process.env.TERM !== 'dumb');
    this.out.write(this.styledAnswer ? this.markdown.push(text) : text); this.lineOpen = !text.endsWith('\n');
  }
  thinking(delta: string) {
    if (!this.showReasoning) return;
    const text = this.thinkingFilter.push(delta); if (!text) return;
    this.select('thinking'); this.err.write(paint(text, 'thinking', this.err)); this.lineOpen = !text.endsWith('\n');
  }
  toolStart(id: string, name: string) {
    this.stopSpinner(); this.endLine(); this.channel = undefined; this.tools.set(id, Date.now());
    this.err.write(paint(`  › Tool: ${clean(name)}`, 'accent', this.err) + '\n');
  }
  toolEnd(id: string, name: string, failed: boolean) {
    this.endLine(); this.channel = undefined;
    const started = this.tools.get(id); this.tools.delete(id);
    this.err.write(paint(`  ${failed ? '×' : '✓'} ${clean(name)} · ${failed ? 'failed' : 'done'}${started ? ` · ${((Date.now() - started) / 1000).toFixed(1)}s` : ''}`, failed ? 'error' : 'success', this.err) + '\n');
  }
  finish() { this.stopSpinner(); this.endLine(); if (this.interactive) this.err.write('\n'); }
}

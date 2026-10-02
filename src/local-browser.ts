import { spawn, type ChildProcess } from 'node:child_process';
import { accessSync, constants, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { isAbsolute, join, delimiter, basename } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { abortable, researchProxy, resolvePublicTarget, WebError, webSignal, type TargetResolver } from './web-network.js';

export function findBrowser(env: NodeJS.ProcessEnv = process.env, platform = process.platform): string | undefined {
  const override = env.RESEARCH_PI_BROWSER_PATH;
  if (override) {
    if (!isAbsolute(override)) return undefined;
    try { accessSync(override, constants.X_OK); return override; } catch { return undefined; }
  }
  const names = ['google-chrome','google-chrome-stable','chromium','chromium-browser','microsoft-edge','microsoft-edge-stable'];
  const candidates = platform === 'win32'
    ? [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean)
      .flatMap(dir => [join(dir!, 'Google/Chrome/Application/chrome.exe'), join(dir!, 'Microsoft/Edge/Application/msedge.exe')])
    : platform === 'darwin'
      ? ['/Applications', join(homedir(), 'Applications')].flatMap(dir => [join(dir,'Google Chrome.app/Contents/MacOS/Google Chrome'), join(dir,'Microsoft Edge.app/Contents/MacOS/Microsoft Edge'), join(dir,'Chromium.app/Contents/MacOS/Chromium')])
      : (env.PATH ?? '').split(delimiter).filter(Boolean).flatMap(dir => names.map(name => join(dir,name)));
  return candidates.find(path => { try { accessSync(path, constants.X_OK); return true; } catch { return false; } });
}
export function browserStatus() {
  const path = findBrowser();
  return { directReading: true, browserAvailable: Boolean(path), browser: path ? basename(path) : null,
    browserPath: path ?? null, searchApiRequired: false,
    setup: path ? 'Local browser detected; a real navigation verifies it can start.'
      : 'Install Chrome, Chromium or Edge, or set RESEARCH_PI_BROWSER_PATH to its absolute executable path. Direct reading still works.' };
}
interface CdpMessage { id?: number; method?: string; params?: any; result?: any; error?: unknown; sessionId?: string; }
class Cdp {
  private sequence = 0;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  onEvent: (message: CdpMessage) => void = () => {};
  constructor(private socket: WebSocket) {
    socket.addEventListener('message', event => {
      let message: CdpMessage;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message.id) {
        const waiter = this.pending.get(message.id); this.pending.delete(message.id);
        if (waiter) message.error ? waiter.reject(new WebError('browser_command', 'The browser could not complete a navigation command.')) : waiter.resolve(message.result);
      } else this.onEvent(message);
    });
    socket.addEventListener('close', () => this.fail()); socket.addEventListener('error', () => this.fail());
  }
  static async open(url: string, signal: AbortSignal) {
    const address = new URL(url);
    if (address.protocol !== 'ws:' || address.hostname !== '127.0.0.1') throw new WebError('browser_start', 'Unexpected local browser control address.');
    const socket = new WebSocket(url);
    try {
      await abortable(new Promise<void>((resolve, reject) => {
        socket.addEventListener('open', () => resolve(), { once: true });
        socket.addEventListener('error', () => reject(new WebError('browser_start', 'Could not connect to the local browser.')), { once: true });
      }), signal);
      const cdp = new Cdp(socket);
      const abort = () => cdp.close();
      signal.addEventListener('abort', abort, { once: true });
      socket.addEventListener('close', () => signal.removeEventListener('abort', abort), { once: true });
      return cdp;
    } catch (error) { socket.close(); throw error; }
  }
  send(method: string, params: object = {}, sessionId?: string): Promise<any> {
    if (this.socket.readyState !== WebSocket.OPEN) return Promise.reject(new WebError('browser_closed', 'The browser session ended.'));
    return new Promise((resolve, reject) => {
      const id = ++this.sequence; this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  private fail() { for (const waiter of this.pending.values()) waiter.reject(new WebError('browser_closed', 'The browser session ended.')); this.pending.clear(); }
  close() { this.fail(); this.socket.close(); }
}
async function controlAddress(process: ChildProcess, signal: AbortSignal) {
  return abortable(new Promise<string>((resolve, reject) => {
    let output = '';
    const data = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-16000);
      const match = /DevTools listening on (ws:\/\/127\.0\.0\.1:[^\s]+)/.exec(output);
      if (match) { cleanup(); resolve(match[1]!); }
    };
    const failed = () => { cleanup(); reject(new WebError('browser_start', 'The local browser could not start. Check its installation and sandbox support.')); };
    const cleanup = () => { process.stderr?.removeListener('data', data); process.removeListener('error', failed); process.removeListener('exit', failed); };
    process.stderr?.on('data', data); process.once('error', failed); process.once('exit', failed);
  }), signal);
}
const snapshotExpression = `(() => {
  const readText = node => {
    if (!node) return '';
    if (node.innerText?.trim()) return node.innerText.trim();
    const copy = node.cloneNode(true);
    copy.querySelectorAll?.('script,style,noscript,template').forEach(el => el.remove());
    return (copy.textContent || '').replace(/\\s+/g,' ').trim();
  };
  const root = document.querySelector('main,article,[role="main"]') || document.body;
  const fullText = readText(root);
  const text = fullText.slice(0,120000);
  const links = Array.from(root?.querySelectorAll('a[href]') || []).slice(0,300)
    .map(a => ({ title: (readText(a) || a.getAttribute('aria-label') || '').trim().slice(0,300), url: a.href.slice(0,8001) }))
    .filter(a => a.title && a.url.length <= 8000 && /^https?:/.test(a.url)).slice(0,80);
  const results = Array.from(document.querySelectorAll('a.result__a,li.b_algo h2 a')).slice(0,10)
    .map(a => ({ title: readText(a).slice(0,300), url: a.href.slice(0,8001),
      snippet: readText(a.closest('.result,li.b_algo')?.querySelector('.result__snippet,.b_caption p')).slice(0,1000) }));
  const blocked = Boolean(document.querySelector('.anomaly-modal,#b_captcha,iframe[src*="recaptcha"]'))
    || /^(just a moment|access denied|attention required)/i.test(document.title)
    || (text.length < 8000 && /verify (you are|that you are) human|unusual traffic|complete the captcha|bots use duckduckgo|security verification/i.test(text));
  return { url: location.href, title: document.title.slice(0,500), text, links, results,
    blocked, complete: document.readyState === 'complete', contentType: document.contentType, truncated: fullText.length > 120000 };
})()`;
export interface BrowserPage {
  url: string; title: string; text: string; links: { title: string; url: string }[];
  results: { title: string; url: string; snippet: string }[];
  blocked: boolean; complete: boolean; contentType: string; truncated: boolean; status: number;
}
export async function browsePage(value: string, options: { resolveTarget?: TargetResolver; browserPath?: string; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<BrowserPage> {
  const resolveTarget = options.resolveTarget ?? resolvePublicTarget;
  const signal = webSignal(options.signal, options.timeoutMs ?? 25000);
  const target = await abortable(resolveTarget(value), signal);
  const path = options.browserPath ?? findBrowser();
  if (!path) throw new WebError('browser_missing', browserStatus().setup);
  const profile = mkdtempSync(join(tmpdir(), 'repi-browser-'));
  let process: ChildProcess | undefined, cdp: Cdp | undefined;
  let proxy: Awaited<ReturnType<typeof researchProxy>> | undefined;
  try {
    proxy = await researchProxy(resolveTarget, signal);
    process = spawn(path, ['--headless', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
      '--user-data-dir=' + profile, '--proxy-server=http://127.0.0.1:' + proxy.port, '--proxy-bypass-list=<-loopback>',
      '--disable-quic', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp', '--disable-background-networking',
      '--disable-component-update', '--disable-extensions', '--disable-sync', '--no-first-run', '--no-default-browser-check',
      '--disable-dev-shm-usage', 'about:blank'], { stdio: ['ignore','ignore','pipe'], windowsHide: true });
    // Consume diagnostic output without exposing account paths or page-controlled messages.
    process.stderr?.on('data', () => {}); process.on('error', () => {});
    cdp = await Cdp.open(await controlAddress(process, signal), signal);
    const targetId = (await cdp.send('Target.createTarget', { url: 'about:blank' })).targetId;
    const session = (await cdp.send('Target.attachToTarget', { targetId, flatten: true })).sessionId;
    const commands = cdp;
    const mainFrame = (await cdp.send('Page.getFrameTree', {}, session)).frameTree.frame.id;
    let status = 0, networkType = '', documentRequest = '', documentFailed = false;
    cdp.onEvent = message => {
      if (message.sessionId !== session) return;
      if (message.method === 'Network.requestWillBeSent' && message.params.type === 'Document' && message.params.frameId === mainFrame) {
        documentRequest = message.params.requestId; documentFailed = false;
      }
      if (message.method === 'Network.responseReceived' && message.params.type === 'Document' && message.params.frameId === mainFrame) {
        status = message.params.response.status; networkType = message.params.response.mimeType;
      }
      if (message.method === 'Network.loadingFailed' && message.params.requestId === documentRequest) documentFailed = true;
      if (message.method === 'Page.javascriptDialogOpening') void commands.send('Page.handleJavaScriptDialog', { accept: false }, session).catch(() => {});
      if (message.method === 'Fetch.requestPaused') {
        const { requestId, request, resourceType } = message.params;
        const allowed = ['GET','HEAD'].includes(request.method) && /^https?:/.test(request.url)
          && !['Image','Media','Font'].includes(resourceType);
        void commands.send(allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest', allowed
          ? { requestId, headers: Object.entries(request.headers).filter(([name]) => !/^(authorization|proxy-authorization)$/i.test(name)).map(([name,value]) => ({ name, value: String(value) })) }
          : { requestId, errorReason: 'BlockedByClient' }, session).catch(() => {});
      }
    };
    await cdp.send('Page.enable', {}, session); await cdp.send('Network.enable', {}, session);
    await cdp.send('Network.setBypassServiceWorker', { bypass: true }, session);
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] }, session);
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'deny' });
    const navigation = await cdp.send('Page.navigate', { url: target.url.href }, session);
    if (navigation.errorText) throw new WebError('browser_navigation', 'The browser could not load the page. Try direct reading or check connectivity.');
    // Wait for a document, then allow a short render interval. The snapshot records completeness.
    for (let attempt = 0; attempt < 24; attempt++) {
      signal.throwIfAborted();
      const state = await cdp.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, session);
      if (['interactive','complete'].includes(state.result?.value)) break;
      await delay(250, undefined, { signal });
    }
    await delay(1000, undefined, { signal });
    const frame = (await cdp.send('Page.getFrameTree', {}, session)).frameTree.frame.id;
    const context = (await cdp.send('Page.createIsolatedWorld', { frameId: frame, worldName: 'ResearchPi reader' }, session)).executionContextId;
    const snapshot = await cdp.send('Runtime.evaluate', { expression: snapshotExpression, contextId: context, returnByValue: true }, session);
    if (snapshot.exceptionDetails || !snapshot.result?.value) throw new WebError('browser_extract', 'The browser could not extract this document.');
    const page = snapshot.result.value as BrowserPage;
    await abortable(resolveTarget(page.url), signal);
    return { ...page, status, contentType:networkType || page.contentType, complete:page.complete && !documentFailed };
  } finally {
    if (cdp) {
      await Promise.race([cdp.send('Browser.close').catch(() => {}), delay(1000)]);
      cdp.close();
    }
    if (process && process.exitCode === null && process.signalCode === null) {
      process.kill();
      await Promise.race([new Promise<void>(resolve => process!.once('exit', () => resolve())), delay(1000)]);
      if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL');
    }
    proxy?.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

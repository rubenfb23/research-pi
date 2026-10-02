import { lookup } from 'node:dns/promises';
import { isIP, connect, type Socket } from 'node:net';
import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { gunzipSync, inflateSync, brotliDecompressSync } from 'node:zlib';

export class WebError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
export interface Target { url: URL; address: string; family: 4 | 6; }
export type TargetResolver = (url: string) => Promise<Target>;
export const maxPageBytes = 4 * 1024 * 1024;

export function publicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a,b,c] = address.split('.').map(Number) as [number,number,number,number];
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99)))
      || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
      || (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) !== 6) return false;
  // Global unicast only; exclude documentation and transition mechanisms.
  const first = parseInt(address.split(':')[0]!, 16);
  const second = parseInt(address.split(':')[1] || '0', 16);
  return first >= 0x2000 && first <= 0x3fff && !(first === 0x2001 && (second === 0xdb8 || second === 0)) && first !== 0x2002;
}
export function webUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new WebError('invalid_url', 'Provide an absolute HTTP or HTTPS URL.'); }
  if (value.length > 8000 || !['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new WebError('invalid_url', 'Only HTTP/HTTPS URLs without embedded credentials are supported.');
  if (url.port && !['80','443'].includes(url.port)) throw new WebError('restricted_port', 'Public browsing supports ports 80 and 443.');
  url.hash = '';
  return url;
}
export const resolvePublicTarget: TargetResolver = async value => {
  const url = webUrl(value), host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local'))
    throw new WebError('private_target', 'Local and private network targets are not available to web tools.');
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => !publicAddress(item.address)))
    throw new WebError('private_target', 'The destination must resolve exclusively to public network addresses.');
  const preferred = addresses.find(item => item.family === 4) ?? addresses[0]!;
  return { url, address: preferred.address, family: preferred.family as 4 | 6 };
};
export function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
export function webSignal(signal?: AbortSignal, timeoutMs = 25000) {
  return signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
}
export function webFailure(error: unknown) {
  if (error instanceof WebError) return { code: error.code, message: error.message };
  if (error instanceof Error && ['AbortError','TimeoutError'].includes(error.name))
    return { code: error.name === 'TimeoutError' ? 'timeout' : 'cancelled', message: 'The web operation did not complete.' };
  return { code: 'network_error', message: 'The page could not be retrieved. Check connectivity or try the local browser.' };
}
function pinnedOptions(target: Target) {
  return { lookup: (_host: string, options: { all?: boolean }, callback: Function) => options.all
    ? callback(null, [{ address: target.address, family: target.family }])
    : callback(null, target.address, target.family) };
}
function collect(response: IncomingMessage, signal: AbortSignal) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []; let bytes = 0, interruption: Error | undefined;
    const abort = () => { interruption = signal.reason; response.destroy(signal.reason); };
    signal.addEventListener('abort', abort, { once: true });
    response.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > maxPageBytes) { interruption = new WebError('page_too_large', 'Page exceeds the 4 MiB retrieval limit.'); response.destroy(interruption); }
      else chunks.push(chunk);
    });
    response.on('error', reject);
    response.on('aborted', () => reject(interruption ?? new WebError('incomplete_response', 'The server interrupted the response.')));
    response.on('end', () => resolve(Buffer.concat(chunks)));
    response.on('close', () => signal.removeEventListener('abort', abort));
  });
}
export async function requestPage(value: string, resolveTarget: TargetResolver = resolvePublicTarget, signal = webSignal()) {
  let next = value;
  for (let redirects = 0; redirects <= 5; redirects++) {
    const target = await abortable(resolveTarget(next), signal);
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const req = (target.url.protocol === 'https:' ? https : http).get(target.url, {
        ...pinnedOptions(target), signal, headers: { 'user-agent': 'ResearchPi public research reader', accept: 'text/html, application/json, text/plain', 'accept-encoding': 'identity' },
      }, resolve);
      req.on('error', reject);
    });
    if ([301,302,303,307,308].includes(response.statusCode ?? 0) && response.headers.location) {
      response.destroy();
      if (redirects === 5) throw new WebError('redirect_limit', 'The page exceeded five redirects.');
      next = new URL(response.headers.location, target.url).href;
      continue;
    }
    let bytes = await collect(response, signal);
    try {
      const encoding = response.headers['content-encoding'];
      const options = { maxOutputLength: maxPageBytes };
      if (encoding === 'gzip') bytes = gunzipSync(bytes, options);
      else if (encoding === 'deflate') bytes = inflateSync(bytes, options);
      else if (encoding === 'br') bytes = brotliDecompressSync(bytes, options);
      else if (encoding && encoding !== 'identity') throw new Error();
    } catch { throw new WebError('content_encoding', 'Unsupported or oversized compressed page.'); }
    const contentType = String(response.headers['content-type'] ?? '');
    const charset = /charset\s*=\s*["']?([^;"'\s]+)/i.exec(contentType)?.[1] ?? 'utf-8';
    let body: string;
    try { body = new TextDecoder(charset).decode(bytes); }
    catch { throw new WebError('text_encoding', 'The page character encoding is unsupported.'); }
    return { url: target.url.href, status: response.statusCode ?? 0, contentType, body, bytes };
  }
  throw new WebError('redirect_limit', 'The page exceeded five redirects.');
}

// Browser traffic uses a loopback proxy that resolves once and pins each outbound socket.
// This also covers page subresources and HTTPS CONNECT tunnels, not just initial URLs.
export async function researchProxy(resolveTarget: TargetResolver, signal: AbortSignal) {
  const sockets = new Set<Socket>(); let requests = 0, bytes = 0;
  const track = (socket: Socket) => { sockets.add(socket); socket.on('error', () => {}); socket.once('close', () => sockets.delete(socket)); return socket; };
  const count = (chunk: Buffer) => { bytes += chunk.length; if (bytes > 32 * 1024 * 1024) for (const socket of sockets) socket.destroy(); };
  const grant = async (value: string) => {
    if (++requests > 200) throw new WebError('request_limit', 'Browser request limit reached.');
    return abortable(resolveTarget(value), signal);
  };
  const server = http.createServer(async (request, response) => {
    try {
      if (!['GET','HEAD'].includes(request.method ?? '')) throw new Error();
      const target = await grant(request.url ?? '');
      const headers: http.IncomingHttpHeaders = { ...request.headers, host: target.url.host };
      for (const name of ['proxy-authorization','proxy-connection','authorization','cookie']) delete headers[name];
      const upstream = http.request(target.url, { ...pinnedOptions(target), method: request.method, headers, signal }, remote => {
        response.writeHead(remote.statusCode ?? 502, remote.headers);
        remote.on('data', count); remote.pipe(response);
        remote.on('error', () => response.destroy());
      });
      upstream.on('socket', track); upstream.on('error', () => response.destroy()); request.pipe(upstream);
    } catch { if (!response.headersSent) response.writeHead(403); response.end('ResearchPi could not allow this destination.'); }
  });
  server.on('connection', track);
  server.on('upgrade', (_request, socket) => socket.destroy());
  server.on('connect', async (request, socket, head) => {
    try {
      const target = await grant('https://' + request.url);
      const upstream = track(connect({ host: target.address, family: target.family, port: Number(target.url.port || 443) }));
      upstream.setTimeout(25000, () => upstream.destroy());
      upstream.once('connect', () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length) upstream.write(head);
        upstream.on('data', count); upstream.pipe(socket); socket.pipe(upstream);
      });
      upstream.once('error', () => socket.destroy());
      socket.once('close', () => upstream.destroy());
    } catch { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); }
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const close = () => { for (const socket of sockets) socket.destroy(); server.close(); };
  signal.addEventListener('abort', close, { once: true });
  return { port: (server.address() as { port: number }).port, close() { signal.removeEventListener('abort', close); close(); } };
}

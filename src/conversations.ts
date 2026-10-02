import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { SessionManager } from '@earendil-works/pi-coding-agent';
import { installationDataDirectory, stateDir } from './paths.js';
import { readJson, writeJson } from './storage.js';

export const piDirectory = () => join(installationDataDirectory(), 'pi');
export const conversationDirectory = () => join(piDirectory(), 'conversations');

// One flat SDK store allows both project filtering and the native all-project selector.
export class Conversations {
  constructor(public project: string) {
    this.project = resolve(project);
    mkdirSync(conversationDirectory(), { recursive: true, mode: 0o700 });
    const legacy = join(stateDir(this.project), 'sessions');
    if (existsSync(legacy)) for (const name of readdirSync(legacy).filter(name => name.endsWith('.jsonl'))) {
      const source = join(legacy, name), target = join(conversationDirectory(), name);
      if (existsSync(target)) {
        if (readFileSync(source, 'utf8') !== readFileSync(target, 'utf8')) {
          // An imported conversation may already have continued. Its original stays untouched.
          const old = SessionManager.open(source), current = SessionManager.open(target);
          if (old.getSessionId() !== current.getSessionId()) throw new Error('Conversation import found a conflicting file. Original history was preserved.');
        }
      } else copyFileSync(source, target, constants.COPYFILE_EXCL);
    }
  }
  save(manager: Pick<SessionManager, 'getSessionFile' | 'getCwd'>) {
    const path = manager.getSessionFile();
    if (path) writeJson(join(stateDir(manager.getCwd()), 'session-pointer.json'), { path });
  }
  current() {
    try {
      const saved = readJson<{ path:string }>(join(stateDir(this.project), 'session-pointer.json')).path;
      const imported = join(conversationDirectory(), basename(saved));
      const path = existsSync(imported) ? imported : saved;
      const manager = SessionManager.open(path, conversationDirectory());
      if (resolve(manager.getCwd()) === this.project) return manager;
    } catch {}
    return SessionManager.continueRecent(this.project, conversationDirectory());
  }
  async list(all = false, query = '') {
    const items = all ? await SessionManager.listAll(conversationDirectory()) : await SessionManager.list(this.project, conversationDirectory());
    const needle = query.toLowerCase();
    return items.filter(item => !needle || [item.name,item.firstMessage,item.allMessagesText,item.cwd,item.id].join(' ').toLowerCase().includes(needle)).map(({allMessagesText:_text,...item}) => item);
  }
  async find(id: string) {
    const items = await this.list(true);
    const matches = items.filter(item => item.id === id || item.path === resolve(id) || (id.length >= 8 && (item.id.startsWith(id) || item.id.endsWith(id))));
    if (matches.length !== 1) throw new Error(matches.length ? 'Conversation ID is ambiguous. Use its full ID.' : 'Conversation not found. Run repi chats list --all.');
    return matches[0]!;
  }
  create(name = '') {
    const manager = SessionManager.create(this.project, conversationDirectory());
    if (name.trim()) manager.appendSessionInfo(name.trim());
    // Explicit creation keeps a named empty chat without injecting a synthetic user turn.
    const path = manager.getSessionFile()!;
    writeFileSync(path, [manager.getHeader(), ...manager.getEntries()].map(entry => JSON.stringify(entry)).join('\n')+'\n', { flag:'wx',mode:0o600 });
    const persisted = SessionManager.open(path,conversationDirectory());
    this.save(persisted);
    return persisted;
  }
  async rename(id: string, name: string) {
    if (!name.trim()) throw new Error('Provide a nonempty conversation name.');
    const item = await this.find(id), manager = SessionManager.open(item.path, conversationDirectory());
    manager.appendSessionInfo(name.trim());
    // Empty conversations have no model messages to trigger the SDK's lazy flush.
    if (!manager.getEntries().some(entry => entry.type === 'message'))
      writeFileSync(item.path,[manager.getHeader(),...manager.getEntries()].map(entry => JSON.stringify(entry)).join('\n')+'\n',{mode:0o600});
    return { id:manager.getSessionId(),name:manager.getSessionName() };
  }
  async fork(id: string, entryId?: string, name?: string) {
    const item = await this.find(id), manager = SessionManager.open(item.path, conversationDirectory());
    const leaf = entryId ?? manager.getLeafId();
    if (!leaf || !manager.getEntry(leaf)) throw new Error('Select an existing entry from a nonempty conversation.');
    const path = manager.createBranchedSession(leaf)!;
    const fork = SessionManager.open(path, conversationDirectory());
    if (name?.trim()) fork.appendSessionInfo(name.trim());
    this.save(fork);
    return fork;
  }
}

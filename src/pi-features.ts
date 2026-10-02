import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createCodemodeExtension, createMcpExtension, createToolSearchExtension, type ExtensionFactory, type ExtensionContext, ProjectTrustStore, SettingsManager } from '@earendil-works/pi-coding-agent';
import { piDirectory, Conversations } from './conversations.js';
import { readJson, writeJson, projectStatus } from './storage.js';
import { ROOT } from './paths.js';
import { clean } from './presentation.js';
import { saveConnection } from './connections.js';

export type ResearchSettings = NonNullable<Parameters<typeof SettingsManager.inMemory>[0]>;

export function researchSettings(cwd: string) {
  const path = join(piDirectory(),'settings.json');
  if (!existsSync(path)) writeJson(path, {
    compaction:{enabled:true,reserveTokens:4096,keepRecentTokens:8192},
    retry:{enabled:true,maxRetries:2,baseDelayMs:1000},
    defaultTools:['+grep','+find','+ls','+codemode','+tool_search',...(process.platform === 'win32' ? ['+powershell'] : [])],
    enableSkillCommands:true,quietStartup:true,enableAnalytics:false,enableInstallTelemetry:false,
  } satisfies ResearchSettings);
  const settings=SettingsManager.create(cwd,piDirectory(),{projectTrusted:false});
  const decision=new ProjectTrustStore(piDirectory()).get(cwd);
  settings.setProjectTrusted(decision ?? settings.getDefaultProjectTrust() !== 'never');
  return settings;
}

export function piExtensions(): ExtensionFactory[] {
  const research: ExtensionFactory = pi => {
    const save = (ctx: ExtensionContext) => new Conversations(ctx.cwd).save(ctx.sessionManager);
    pi.on('session_start',(_event,ctx) => {
      save(ctx);
      if (ctx.hasUI) {
        const version=readJson<{version:string}>(join(ROOT,'package.json')).version;
        ctx.ui.setTitle('ResearchPi');
        ctx.ui.setHeader((_tui,theme) => ({
          render:width => [theme.fg('accent',theme.bold(`ResearchPi v${version}`.slice(0,width))),theme.fg('dim',clean(ctx.cwd).slice(0,Math.max(0,Math.floor(width/2)))),
            theme.fg('muted','/new · /chats · /resume · /tree · /settings · /help'.slice(0,width))],invalidate() {},
        }));
      }
    });
    pi.on('model_select',(event,ctx) => saveConnection(ctx.cwd,{provider:event.model.provider,model:event.model.id}));
    pi.on('agent_settled',(_event,ctx) => save(ctx));
    pi.on('session_shutdown',(_event,ctx) => save(ctx));
    pi.on('session_info_changed',(_event,ctx) => save(ctx));
    pi.registerCommand('help',{description:'ResearchPi commands and native Pi controls',handler:async (_args,ctx) => {
      ctx.ui.notify('ResearchPi: /new, /chats, /resume, /name, /fork, /clone, /tree, /export, /import, /session, /model, /models, /login, /logout, /thinking, /compact, /settings, /reload, /mcp, /exit. Tab completes commands and files. Up/Down recalls input. Enter while responding steers; Alt+Enter queues a follow-up. Ctrl+T toggles provider reasoning. Use /hotkeys for all keys.');
    }});
    pi.registerCommand('exit',{description:'Close ResearchPi',handler:async (_args,ctx) => ctx.shutdown()});
    pi.registerCommand('status',{description:'Scientific project state',handler:async (_args,ctx) => ctx.ui.notify(JSON.stringify(projectStatus(ctx.cwd),null,2))});
    pi.registerCommand('models',{description:'Models for the current provider',handler:async (_args,ctx) => ctx.ui.notify(ctx.modelRegistry.getAll().filter(model => model.provider === ctx.model?.provider).map(model => `${model.provider}/${model.id}`).join('\n'))});
    pi.registerCommand('chats',{description:'Search and open conversations across projects',handler:async (args,ctx) => {
      const store = new Conversations(ctx.cwd), items = await store.list(true,args.trim());
      if (!items.length) { ctx.ui.notify('No conversations found. Use /new to start one.'); return; }
      const labels=items.map(item => `${clean(item.name || item.firstMessage || 'Untitled').slice(0,70)} · ${clean(item.cwd)} · ${item.id.slice(-8)}`);
      const choice=await ctx.ui.select('Open a conversation',labels);
      if (choice) await ctx.switchSession(items[labels.indexOf(choice)]!.path);
    }});
    pi.registerCommand('connect',{description:'Open native provider authentication',handler:async (args,ctx) => {
      const aliases:Record<string,string>={claude:'anthropic',codex:'openai',openai:'openai',opencode:'opencode','opencode-go':'opencode-go'};
      const provider=aliases[args.trim()] ?? args.trim();
      ctx.ui.setEditorText('/login'+(provider ? ' '+provider : ''));
      ctx.ui.notify('Press Enter to open provider authentication. CLI setup is also available with repi connect.');
    }});
  };
  return [research,createCodemodeExtension(),createToolSearchExtension(),createMcpExtension()];
}

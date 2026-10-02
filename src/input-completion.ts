export type Completion = [string[], string];
export type Completer = (line: string) => Completion | Promise<Completion>;
export const chatCommands = ['/help', '/status', '/connect', '/model', '/models', '/thinking', '/reasoning', '/compact', '/new', '/chats', '/resume', '/name', '/fork', '/tree', '/export', '/reload', '/exit', '/quit'];

export function completeChat(line: string, context: { providers: string[]; models?: string[]; thinking: string[] }): Completion {
  if (!line || /^\/\S*$/.test(line)) return [chatCommands.filter(command => command.startsWith(line)), line];
  const match = /^(\/(?:connect|model|thinking|reasoning)\s+)(\S*)$/.exec(line);
  if (!match) return [[], line];
  const values = match[1]!.trim() === '/connect' ? context.providers
    : match[1]!.trim() === '/model' ? context.models ?? []
    : match[1]!.trim() === '/thinking' ? context.thinking : ['on', 'off'];
  return [values.filter(value => value.startsWith(match[2]!)).map(value => match[1] + value), line];
}

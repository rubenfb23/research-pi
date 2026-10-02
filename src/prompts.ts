import { readFileSync } from 'node:fs';
import { resource } from './paths.js';

// Load host-owned resources for every session, including resumed conversations.
export function researchSystemPrompt() {
  return ['system.md', 'manuscript-policy.md', 'web-policy.md']
    .map(name => readFileSync(resource(name), 'utf8').trim())
    .join('\n\n');
}

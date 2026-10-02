// Provider errors may contain credentials, request bodies or account details.
// Show recognized causes and actions; never echo the raw upstream response.
export function providerFailure(provider: string, error: unknown): string {
  const raw = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  const status = /(?:^|\bHTTP\s+)([45]\d{2})\b/i.exec(raw)?.[1];
  const label = provider === 'opencode-go' ? 'OpenCode Go' : provider === 'opencode' ? 'OpenCode Zen' : 'Provider';
  const prefix = `${label} request failed${status ? ` (HTTP ${status})` : ''}. `;
  if ((provider === 'opencode-go' || provider === 'opencode') && status === '400'
    && /requires Global regions/i.test(raw)) {
    return prefix + 'This model requires Global regions in your OpenCode workspace Privacy settings. '
      + 'Review that setting in https://opencode.ai/auth or choose another model with /model. '
      + 'ResearchPi has not changed your privacy settings.';
  }
  if (status === '401') return prefix + 'Authentication was rejected. Reconnect with /connect or repi connect and check your API key or account login.';
  if (status === '402') return prefix + 'Check the provider account balance, billing and plan before retrying.';
  if (status === '403') return prefix + 'Access was denied. Check model permissions and workspace policies, or choose another model with /model.';
  if (status === '404') return prefix + 'The model or endpoint was not found. Choose another model with /model; the installed catalog may be outdated.';
  if (status === '429') return prefix + 'A rate limit or quota was reached. Check provider usage limits and wait before retrying.';
  if (status && Number(status) >= 500) return prefix + 'The provider service failed. Retry later or choose another model with /model.';
  if (/context.*(?:length|limit)|too many tokens|maximum.*tokens/i.test(raw)) return prefix + 'The conversation exceeds the model context limit. Use /compact or a model with a larger context.';
  if (status === '400') return prefix + 'The provider rejected the request. Check model availability and workspace policies, or choose another model with /model.';
  if (/fetch failed|connection|network|ECONN|ENOTFOUND|socket|timeout|timed out/i.test(raw)) return prefix + 'The connection failed. Check your network and proxy settings, then retry.';
  return prefix + 'No recognized diagnostic was returned. Check model access and provider status, or reconnect with /connect. Upstream details are withheld to protect credentials.';
}

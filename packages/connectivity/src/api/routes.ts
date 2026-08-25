/**
 * Every path the webhooks UI requests. Frontegg bakes these into `@frontegg/rest-api`'s
 * private `urls` constant, so pointing the UI at a different backend means owning them
 * here instead.
 *
 * Each route returns a complete path, query string included, because backends disagree
 * about more than the prefix -- Frontegg identifies a webhook's logs with a query
 * parameter where another service may put the id in the path.
 */
export interface ConnectivityApiRoutes {
  listWebhooks(): string;
  createWebhook(): string;
  updateWebhook(id: string): string;
  deleteWebhook(id: string): string;
  testWebhook(): string;
  webhookLogs(id: string, offset: number, limit: number): string;
  retryWebhookLog(logId: string): string;
  eventCategories(): string;
  channelMap(channels: string): string;
}

const WEBHOOKS = '/webhook';
const EVENTS = '/event/resources/configurations/v1';

/** What Frontegg's own backend serves; any route left unset falls back to these. */
export const fronteggRoutes: ConnectivityApiRoutes = {
  listWebhooks: () => WEBHOOKS,
  createWebhook: () => `${WEBHOOKS}/custom`,
  updateWebhook: (id) => `${WEBHOOKS}/${id}`,
  deleteWebhook: (id) => `${WEBHOOKS}/${id}`,
  testWebhook: () => `${WEBHOOKS}/test`,
  webhookLogs: (id, offset, limit) =>
    `${WEBHOOKS}/logs/?${new URLSearchParams({ id, offset: `${offset}`, limit: `${limit}` })}`,
  retryWebhookLog: (logId) => `${WEBHOOKS}/logs/${logId}/retries`,
  eventCategories: () => `${EVENTS}/categories`,
  channelMap: (channels) => `${EVENTS}?${new URLSearchParams({ channels })}`,
};

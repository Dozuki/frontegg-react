import { fetch as fronteggFetch, IWebhookTest, IWebhooksSaveData } from '@frontegg/rest-api';
import { ConnectivityApiAdapters, passthroughAdapters } from './adapters';
import { ConnectivityApiRoutes, fronteggRoutes } from './routes';

const { Get, Post, Patch, Delete } = fronteggFetch;

export interface ConnectivityApiOverrides {
  routes?: Partial<ConnectivityApiRoutes>;
  adapters?: Partial<ConnectivityApiAdapters>;
}

export interface ConnectivityApi {
  listWebhooks(): Promise<any>;
  saveWebhook(data: IWebhooksSaveData): Promise<any>;
  deleteWebhook(id: string): Promise<any>;
  testWebhook(data: IWebhookTest): Promise<any>;
  loadWebhookLogs(id: string, offset: number, limit: number): Promise<any>;
  retryWebhookLog(logId: string): Promise<any>;
  listEventCategories(): Promise<any>;
  loadChannelMap(channels: string): Promise<any>;
}

/**
 * Requests still go through rest-api's fetch helpers, so authorization headers, the
 * `baseUrl`/`urlPrefix` handling and error translation stay exactly as they were -- only
 * the paths and payload shapes come from here.
 */
export const createConnectivityApi = (overrides: ConnectivityApiOverrides = {}): ConnectivityApi => {
  const routes: ConnectivityApiRoutes = { ...fronteggRoutes, ...overrides.routes };
  const adapt: ConnectivityApiAdapters = { ...passthroughAdapters, ...overrides.adapters };

  return {
    listWebhooks: async () => adapt.webhooks(await Get(routes.listWebhooks())),
    saveWebhook: (data) => {
      const body = adapt.saveWebhookRequest(data);
      return data._id ? Patch(routes.updateWebhook(data._id), body) : Post(routes.createWebhook(), body);
    },
    deleteWebhook: (id) => Delete(routes.deleteWebhook(id)),
    testWebhook: async (data) => adapt.webhookTest(await Post(routes.testWebhook(), data)),
    loadWebhookLogs: async (id, offset, limit) => adapt.webhookLogs(await Get(routes.webhookLogs(id, offset, limit))),
    retryWebhookLog: (logId) => Post(routes.retryWebhookLog(logId)),
    listEventCategories: async () => adapt.eventCategories(await Get(routes.eventCategories())),
    loadChannelMap: async (channels) => adapt.channelMap(await Get(routes.channelMap(channels))),
  };
};

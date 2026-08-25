import { ICategory, IChannelsMap, IWebhooksConfigurations, IWebhooksSaveData } from '@frontegg/rest-api';
import { ConnectivityApiOverrides } from './client';

/**
 * Routes and payload mapping for dozuki-services' webhook module, which serves the same
 * feature under different paths and a different vocabulary -- `id`/`title`/`enabled`
 * where Frontegg says `_id`/`displayName`/`isActive`.
 *
 * Fields Frontegg's interfaces declare but nothing in this UI reads (`vendorId`, event
 * timestamps) are left off rather than invented, hence the casts.
 */

const toWebhook = (dto: any): IWebhooksConfigurations =>
  ({
    _id: dto.id,
    displayName: dto.title,
    description: dto.description ?? '',
    url: dto.url,
    isActive: dto.enabled,
    eventKeys: dto.eventKeys ?? [],
    invocations: dto.invocationCount ?? 0,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    // The service deliberately never returns the signing secret.
    secret: null,
  } as IWebhooksConfigurations);

const toWebhookPayload = (data: IWebhooksSaveData) => {
  const payload: Record<string, any> = {
    title: data.displayName,
    description: data.description,
    url: data.url,
    enabled: data.isActive,
    eventKeys: data.eventKeys,
  };
  // Since the secret never comes back, the edit form always presents it empty. Sending
  // that would clear a secret the user never touched, and the UI has no way to express
  // "clear" separately, so only a value the user actually typed is sent.
  if (data.secret) {
    payload.secretKey = data.secret;
  }
  return payload;
};

const toCategory = (dto: any): ICategory =>
  ({
    id: dto.id,
    name: dto.name,
    events: (dto.events ?? []).map((event: any) => ({
      id: event.id,
      key: event.key,
      displayName: event.displayName,
      description: event.description,
      category: dto.name,
    })),
  } as ICategory);

const toChannelEvent = (dto: any): IChannelsMap =>
  ({
    id: dto.id,
    key: dto.key,
    categoryId: dto.categoryId,
    displayName: dto.displayName,
    description: dto.description,
    category: dto.category,
  } as IChannelsMap);

const toLog = (dto: any) => ({
  id: dto.id,
  createdAt: dto.createdAt,
  statusCode: dto.statusCode == null ? '' : `${dto.statusCode}`,
  // The detail dialog renders this; on a transport failure the error is all there is.
  body: dto.requestBody == null ? dto.errorMessage ?? '' : JSON.stringify(dto.requestBody, null, 2),
  triggerType: dto.triggerType,
});

/**
 * `basePath` is where the webhook module is mounted, and pairs with a context of
 * `{ baseUrl: <api root>, urlPrefix: '' }` so no `/frontegg` segment is added.
 *
 * Not covered: retrying a delivery. The service has no counterpart for Frontegg's
 * `POST /webhook/logs/:id/retries`, so the retry button stays on the default route and
 * will fail until one exists.
 */
export const dozukiServicesApi = ({ basePath = '/api/webhooks' } = {}): ConnectivityApiOverrides => ({
  routes: {
    listWebhooks: () => basePath,
    createWebhook: () => basePath,
    updateWebhook: (id) => `${basePath}/${id}`,
    deleteWebhook: (id) => `${basePath}/${id}`,
    testWebhook: () => `${basePath}/test`,
    webhookLogs: (id, offset, limit) =>
      `${basePath}/${id}/logs?${new URLSearchParams({ offset: `${offset}`, limit: `${limit}` })}`,
    eventCategories: () => `${basePath}/catalog/categories`,
    channelMap: () => `${basePath}/catalog/channel-map`,
  },
  adapters: {
    webhooks: (response: any) => (response ?? []).map(toWebhook),
    eventCategories: (response: any) => (response ?? []).map(toCategory),
    channelMap: (response: any) => (response ?? []).map(toChannelEvent),
    webhookLogs: (response: any) => ({ count: response?.count ?? 0, rows: (response?.rows ?? []).map(toLog) }),
    webhookTest: (response: any) => ({
      success: !!response?.success,
      message: response?.success ? JSON.stringify(response.body, null, 2) : response?.errorMessage ?? undefined,
    }),
    saveWebhookRequest: toWebhookPayload,
  },
});

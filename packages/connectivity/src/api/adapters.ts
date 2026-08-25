import { ICategory, IChannelsMap, IWebhooksSaveData } from '@frontegg/rest-api';

/**
 * Hooks for a backend whose payloads don't match Frontegg's. Each one defaults to
 * identity, so a backend that already speaks Frontegg's shapes configures nothing.
 */
export interface ConnectivityApiAdapters {
  webhooks(response: any): any;
  eventCategories(response: any): ICategory[];
  channelMap(response: any): IChannelsMap[];
  webhookLogs(response: any): any;
  /** Normalises a test response into what the UI shows. */
  webhookTest(response: any): { success: boolean; message?: string };
  /** Applied to the form's payload before it is sent. */
  saveWebhookRequest(data: IWebhooksSaveData): any;
}

const identity = <T>(value: T): T => value;

export const passthroughAdapters: ConnectivityApiAdapters = {
  webhooks: identity,
  eventCategories: identity,
  channelMap: identity,
  webhookLogs: identity,
  webhookTest: (response: any) =>
    [200, 201].includes(response?.statusCode)
      ? { success: true, message: JSON.stringify(response?.body, null, 2) }
      : { success: false },
  saveWebhookRequest: identity,
};

import { all, call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import connectivity, { IWebhookTestResult, TWebhookImage } from '@frontegg/redux-store/connectivity';
import { channels2Platform } from '../consts';
import { TPlatform } from '../interfaces';
import { ConnectivityApi } from './client';

const { actions } = connectivity;
const platform = channels2Platform.webhook;

const errorMessage = (e: any): string => e?.message ?? String(e);

/** `list` rows carry a key into `channelsSvgs`, not the component itself. */
const WEBHOOK_IMAGE_KEY: TWebhookImage = 'webhook';

const WEBHOOK: TPlatform = 'webhook';

const webhookRow = (webhook: any) => ({
  id: 0,
  key: WEBHOOK,
  events: platform.events(webhook),
  active: platform.isActive(webhook),
  platform: platform.title,
  image: WEBHOOK_IMAGE_KEY,
});

/**
 * Replaces `@frontegg/redux-store`'s connectivity sagas for the webhook flows, writing
 * the same state its reducer already understands. Only the webhook channel is served --
 * slack, email and sms stay on Frontegg's own paths and are not reachable through here.
 */
export const createConnectivitySagas = (api: ConnectivityApi) => {
  function* loadWebhookData() {
    yield put(actions.setConnectivityState({ isLoading: true }));
    try {
      const [webhook, categories, channelMap] = yield all([
        call(api.listWebhooks),
        call(api.listEventCategories),
        call(api.loadChannelMap, 'webhook'),
      ]);
      yield put(
        actions.setConnectivityState({
          webhook,
          categories,
          channelMap: { [WEBHOOK]: channelMap } as any,
          list: channelMap?.length ? [webhookRow(webhook)] : [],
          error: undefined,
          isSaving: false,
          isLoading: false,
        })
      );
    } catch (e) {
      yield put(actions.setConnectivityState({ isLoading: false }));
    }
  }

  function* refreshWebhooks(processIds: string[], settledId?: string) {
    const webhook = yield call(api.listWebhooks);
    const { list } = yield select((state: any) => state.connectivity);
    yield put(
      actions.setConnectivityState({
        error: undefined,
        isSaving: false,
        webhook,
        processIds: settledId ? processIds.filter((id) => id !== settledId) : processIds,
        list: list?.length ? [{ ...list[0], active: platform.isActive(webhook) }] : list,
      })
    );
  }

  function* saveWebhook({ payload: { platform: channel, data, callback } }: any) {
    const { processIds } = yield select((state: any) => state.connectivity);
    try {
      yield put(actions.setConnectivityState({ isSaving: true, processIds: [data._id, ...processIds] }));
      yield call(api.saveWebhook, data);
      yield refreshWebhooks(processIds, data._id);
      callback?.(true);
    } catch (e) {
      yield put(actions.setConnectivityState({ error: errorMessage(e), isSaving: false, isLoading: false }));
    }
  }

  function* deleteWebhook({ payload: { callback, webhookId } }: any) {
    const { processIds } = yield select((state: any) => state.connectivity);
    try {
      yield put(actions.setConnectivityState({ isSaving: true }));
      yield call(api.deleteWebhook, webhookId);
    } catch (e) {
      callback?.(null, errorMessage(e));
    }
    yield refreshWebhooks(processIds, webhookId);
    callback?.(true);
  }

  function* testWebhook({ payload }: any) {
    try {
      yield put(actions.setConnectivityState({ isTesting: true }));
      const { success, message } = yield call(api.testWebhook, payload);
      const testResult: IWebhookTestResult = success ? { status: 'success', message } : { status: 'failed', message };
      yield put(actions.setConnectivityState({ isTesting: false, testResult }));
    } catch (e) {
      yield put(
        actions.setConnectivityState({ isTesting: false, testResult: { status: 'failed', message: errorMessage(e) } })
      );
    }
  }

  function* retryWebhookLog({ payload }: any) {
    try {
      const { statusCode } = yield call(api.retryWebhookLog, payload);
      yield put(actions.postWebhookRetryResult({ [payload]: { isProcess: false, success: statusCode === 202 } }));
    } catch (e) {
      yield put(actions.postWebhookRetryResult({ [payload]: { isProcess: false, success: false } }));
    }
  }

  function* loadWebhookLogs({ payload: { id, limit, offset } }: any) {
    const { webhookLogs } = yield select((state: any) => state.connectivity);
    try {
      yield put(actions.setConnectivityState({ webhookLogs: { ...webhookLogs, isLoading: true } }));
      const data = yield call(api.loadWebhookLogs, id, offset, limit);
      yield put(actions.setConnectivityState({ error: undefined, webhookLogs: { isLoading: false, ...data } }));
    } catch (e) {
      yield put(actions.setConnectivityState({ error: undefined, webhookLogs: { isLoading: false } }));
    }
  }

  return function* sagas() {
    yield takeEvery(actions.loadDataAction, loadWebhookData);
    yield takeEvery(actions.postDataAction, saveWebhook);
    yield takeEvery(actions.deleteWebhookConfigAction, deleteWebhook);
    yield takeEvery(actions.postWebhookTestAction, testWebhook);
    yield takeEvery(actions.postWebhookRetryAction, retryWebhookLog);
    yield takeLatest(actions.loadWebhookLogsAction, loadWebhookLogs);
  };
};

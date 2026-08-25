import { PluginConfig } from '@frontegg/react-core';
import { makeComponent } from './elements/makeComponent';
import './index.scss';
import { ConnectivityListener } from './components/ConnectivityListener';
import connectivity from '@frontegg/redux-store/connectivity';
import { ConnectivityApiOverrides, createConnectivityApi, createConnectivityStore } from './api';
export * from './components/ConnectivityPage';
export * from './components/ConnectivityHeader';
export * from './components/ConnectivityContent';

export const WebhookComponent = makeComponent({ type: 'webhook', defaultPath: '/webhook' });
export const SlackComponent = makeComponent({ type: 'slack', defaultPath: '/slack' });
export const EmailComponent = makeComponent({ type: 'email', defaultPath: '/emails' });
export const SMSComponent = makeComponent({ type: 'sms', defaultPath: '/sms' });

export * from './api';

/**
 * Pass `api` to serve the webhooks UI from somewhere other than Frontegg. Doing so swaps
 * in this package's own sagas, which cover the webhook channel only; without it the
 * plugin behaves exactly as before, on Frontegg's paths and its prebuilt sagas.
 */
export const ConnectivityPlugin = (options?: { api?: ConnectivityApiOverrides }): PluginConfig => ({
  storeName: connectivity.storeName,
  reducer: connectivity.reducer,
  sagas: connectivity.sagas,
  preloadedState: {
    ...connectivity.initialState,
  },
  Listener: ConnectivityListener,
  ...(options?.api
    ? {
        createStore: (rootInitialState: any) =>
          createConnectivityStore(createConnectivityApi(options.api!), rootInitialState),
      }
    : {}),
});

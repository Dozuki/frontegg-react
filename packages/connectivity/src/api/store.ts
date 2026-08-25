import {
  combineReducers,
  configureStore,
  connectivityInitialState,
  connectivityReducers,
  connectivityStoreName,
  createSagaMiddleware,
} from '@frontegg/redux-store';
import { ConnectivityApi } from './client';
import { createConnectivitySagas } from './sagas';

/**
 * `createFronteggStore` hardwires every slice's reducer *and* saga, so a `PluginConfig`'s
 * own `sagas` are never read -- the only way to serve the webhooks UI from different
 * endpoints is to hand FronteggProvider a store we built.
 *
 * This store carries just what the webhooks UI reads: the connectivity slice, and a
 * static `root` holding the context. Auth, audits, subscriptions and vendor are left out,
 * which is why a plugin only supplies this when endpoints are actually overridden.
 */
export const createConnectivityStore = (api: ConnectivityApi, rootInitialState: any) => {
  const sagaMiddleware = createSagaMiddleware();

  const store = configureStore({
    preloadedState: {
      root: { ...rootInitialState, previewMode: false },
      [connectivityStoreName]: connectivityInitialState,
    },
    reducer: combineReducers({
      // Nothing dispatches root actions on this path; the context is set once, up front.
      root: (state = {}) => state,
      [connectivityStoreName]: connectivityReducers,
    }),
    middleware: (getDefaultMiddleware: any) =>
      // The context carries resolver functions, so the serializable check has to go.
      getDefaultMiddleware({ thunk: false, immutableCheck: false, serializableCheck: false }).concat(sagaMiddleware),
  } as any);

  sagaMiddleware.run(createConnectivitySagas(api));
  return store;
};

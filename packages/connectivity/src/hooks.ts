import { IConnectivityState } from '@frontegg/redux-store/connectivity';
import { IWebhooksConfigurations } from '@frontegg/rest-api';
import { useConnectivityState as useMappedConnectivityState } from '@frontegg/react-hooks';

/**
 * react-hooks types the whole-state call as `<S extends object>() => S`, which has no
 * inference site, so TypeScript resolves S to its constraint and every destructure
 * fails. Naming the state it actually returns fixes that in one place.
 */
export const useConnectivityState = () => useMappedConnectivityState<IConnectivityState>();

/**
 * The webhook list arrives either bare or wrapped in a paginated `{ data }` envelope,
 * which IConnectivityState does not describe.
 */
export const unwrapWebhooks = (webhook?: IWebhooksConfigurations[]) =>
  (webhook as { data?: IWebhooksConfigurations[] } | undefined)?.data ?? webhook;

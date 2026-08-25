/* istanbul ignore file */

import React, { FC, PropsWithChildren } from 'react';
import { FronteggProvider, PluginConfig, ContextOptions } from '@frontegg/react-core';
import {
  auditsData,
  auditsDataDescName,
  auditsMetadata,
  auditsStats,
  webhookCategories,
  webhookChannelMap,
  webhookConfigurations,
} from './consts';

export const METADATA_SERVICE = 'http://localhost:8080/frontegg/metadata';
export const IDENTITY_SERVICE = 'http://localhost:8080/frontegg/identity';
export const AUDITS_SERVICE = 'http://localhost:8080/frontegg/audits';
export const TEAM_SERVICE = 'http://localhost:8080/frontegg/team';
export const WEBHOOKS_SERVICE = 'http://localhost:8080/frontegg/webhook';
export const EVENTS_SERVICE = 'http://localhost:8080/frontegg/event/resources/configurations/v1';

// The same two services with `urlPrefix: ''`, i.e. served straight off baseUrl.
export const WEBHOOKS_SERVICE_NO_PREFIX = 'http://localhost:8080/webhook';
export const EVENTS_SERVICE_NO_PREFIX = 'http://localhost:8080/event/resources/configurations/v1';

const contextOptions: ContextOptions = {
  baseUrl: `http://localhost:8080`,
  requestCredentials: 'include',
};

export type TestFronteggWrapperProps = PropsWithChildren<{
  plugins: PluginConfig[];
  context?: Partial<ContextOptions>;
}>;
export const TestFronteggWrapper: FC<TestFronteggWrapperProps> = (props) => (
  <FronteggProvider context={{ ...contextOptions, ...props.context }} plugins={props.plugins}>
    {props.children}
  </FronteggProvider>
);

declare global {
  interface Window {
    cypressHistory: any;
  }
}

export const navigateTo = (path: string) => {
  // FronteggProvider publishes its router history during render, and mount() can
  // resolve before React has committed that first render.
  cy.window().should((win) => expect(win.cypressHistory, 'router history').to.exist);
  cy.window().then((win) => {
    win.cypressHistory.push(path);
  });
};

export const mockAuthMe = () => {
  cy.intercept('GET', `${IDENTITY_SERVICE}/resources/users/v2/me`, {
    statusCode: 200,
    body: {
      activatedForTenant: true,
      email: EMAIL_1,
      id: USER_ID_1,
      metadata: null,
      mfaEnrolled: false,
      name: 'Test Test',
      permissions: [],
      phoneNumber: null,
      profilePictureUrl: null,
      provider: 'local',
      roles: [],
      tenantId: 'my-tenant-id',
      tenantIds: ['my-tenant-id'],
      verified: true,
    },
    delay: 200,
  }).as('me');
  cy.intercept('GET', `${IDENTITY_SERVICE}/resources/users/v2/me/tenants`, {
    statusCode: 200,
    body: [],
    delay: 200,
  }).as('meTenants');
};

export const mockAuthApi = (
  authenticated: boolean,
  saml: boolean,
  socialLogin: boolean = false,
  publicConfigurations = {
    allowOverrideEnforcePasswordHistory: false,
    allowOverridePasswordComplexity: false,
    allowOverridePasswordExpiration: false,
    allowSignups: false,
  },
  publicAuthStrategyConfigurations = {
    secondaryAuthStrategies: [],
  }
) => {
  if (authenticated) {
    cy.intercept('POST', `${IDENTITY_SERVICE}/resources/auth/v1/user/token/refresh`, {
      statusCode: 200,
      body: {
        accessToken: '',
        refreshToken: '',
        verified: true,
      },
    }).as('refreshToken');
  } else {
    cy.intercept('POST', `${IDENTITY_SERVICE}/resources/auth/v1/user/token/refresh`, {
      statusCode: 401,
      body: 'Unauthorized',
    }).as('refreshToken');
  }
  if (saml) {
    cy.intercept('GET', `${TEAM_SERVICE}/resources/sso/v2/configurations/public`, {
      statusCode: 200,
      body: {
        isActive: true,
      },
      delay: 200,
    }).as('metadata');
  } else {
    cy.intercept('GET', `${TEAM_SERVICE}/resources/sso/v2/configurations/public`, {
      statusCode: 200,
      body: {
        isActive: false,
      },
      delay: 200,
    }).as('metadata');
  }

  if (socialLogin) {
    cy.intercept('GET', `${IDENTITY_SERVICE}/resources/sso/v1`, {
      statusCode: 200,
      body: [
        {
          active: true,
          clientId: 'google_client_id',
          redirectUrl: 'http://localhost:3000/account/social/success',
          type: 'google',
        },
      ],
      delay: 200,
    }).as('socialLogin');
  } else {
    cy.intercept('GET', `${IDENTITY_SERVICE}/resources/sso/v1`, { statusCode: 200, body: [], delay: 200 }).as(
      'socialLogin'
    );
  }
  cy.intercept('GET', `${IDENTITY_SERVICE}/resources/configurations/v1/public`, {
    statusCode: 200,
    body: publicConfigurations,
    delay: 200,
  }).as('publicConfigurations');
  cy.intercept('GET', `${IDENTITY_SERVICE}/resources/configurations/v1/auth/strategies/public`, {
    statusCode: 200,
    body: publicAuthStrategyConfigurations,
    delay: 200,
  }).as('publicAuthStrategyConfigurations');
};

export const mockAuditsApi = () => {
  cy.intercept('GET', `${AUDITS_SERVICE}?sortDirection=desc&sortBy=createdAt&filter=&offset=0&count=20`, {
    statusCode: 200,
    body: {
      data: auditsData,
      total: auditsData.length,
    },
    delay: 200,
  }).as('auditsData');
  cy.intercept('GET', `${AUDITS_SERVICE}?sortDirection=desc&sortBy=user&filter=&offset=0&count=20`, {
    statusCode: 200,
    body: {
      data: auditsDataDescName,
      total: auditsDataDescName.length,
    },
    delay: 200,
  }).as('auditsDataNameDesc');
  cy.intercept('GET', `${METADATA_SERVICE}?entityName=audits`, {
    statusCode: 200,
    body: {
      rows: auditsMetadata,
    },
  }).as('auditsMetadata');
  cy.intercept('GET', `${AUDITS_SERVICE}/stats?sortBy=createdAt&sortDirection=desc&count=20`, {
    statusCode: 200,
    body: auditsStats,
    delay: 200,
  }).as('auditsStats');
};

export const EMAIL_1 = 'test1@frontegg.com';
export const USER_ID_1 = '3065bce5-a3ff-42bd-a519-97bbace20e8b';
export const PASSWORD = 'ValidPassword123!';
export const ACCESS_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YTIyYjQyNy01MjA0LTQ2NzYtOWNhMC03ZTVjMWJkMDhiZjYiLCJuYW1lIjoiRGF2aWQiLCJlbWFpbCI6ImRhdmlkQGZyb250ZWdnLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJyb2xlcyI6WyJ3cml0ZSJdLCJwZXJtaXNzaW9ucyI6WyJjb25maWd1cmUtc3NvIiwiYWRkLXNsYWNrIiwiYWRkLXdlYmhvb2tzIl0sInRlbmFudElkIjoibXktdGVuYW50LWlkIiwidGVuYW50SWRzIjpbIm15LXRlbmFudC1pZCJdLCJpYXQiOjE1OTk2MTUyOTMsImV4cCI6MTU5OTYxNTU5MywiaXNzIjoiZnJvbnRlZ2cifQ.CdNSM-0I6cU9cEpBE5dj7jZyRfgBK3ozZ0hNxFFhM_jv9NdQp2BBkUkHTdKpvwFdub4LCUwd1h2kdvdTuGHaQDNVVoetCpzJsXMUejBdCPu6MiShNLstBdzAjnypCuwy3Mfv7tIEB3njuKeNDWJZY32EDXawdepnugRjsDIqQsQ';
export const checkEmailValidation = (emailSelector: string = '[name="email"]') => {
  cy.get(emailSelector).focus().clear().type('invalid email').blur();
  cy.contains('Must be a valid email').should('be.visible');
  cy.get(emailSelector).focus().clear().blur();
  cy.contains('The Email is required').should('be.visible');
  cy.get(emailSelector).focus().clear().type(EMAIL_1).blur();
  cy.get(emailSelector).parents('.fe-input__inner').should('not.have.class', 'fe-input__inner-error');
};

export const submitButtonSelector = 'button[type="submit"]';
export const emailInputSelector = 'input[name="email"]';

export const mockConnectivityApi = (
  webhooks: any[] = webhookConfigurations,
  { webhooksService = WEBHOOKS_SERVICE, eventsService = EVENTS_SERVICE } = {}
) => {
  cy.intercept('GET', webhooksService, { statusCode: 200, body: webhooks }).as('webhooks');
  cy.intercept('GET', `${eventsService}/categories`, { statusCode: 200, body: webhookCategories }).as('categories');
  // getChannelMaps appends a ?channels= query, so match on the prefix.
  cy.intercept('GET', `${eventsService}?channels=*`, { statusCode: 200, body: webhookChannelMap }).as('channelMap');
};

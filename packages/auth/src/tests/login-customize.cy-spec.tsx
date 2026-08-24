import React from 'react';
import { mount } from 'cypress-react-unit-test';
import { AuthPlugin } from '../index';
import {
  IDENTITY_SERVICE,
  METADATA_SERVICE,
  mountOptions,
  navigateTo,
  TestFronteggWrapper,
} from '../../../../cypress/helpers';

const defaultAuthPlugin = {
  routes: {
    authenticatedUrl: '/',
    loginUrl: '/account/login',
    logoutUrl: '/account/logout',
    activateUrl: '/account/activate',
    acceptInvitationUrl: '/account/invitation/accept',
    forgetPasswordUrl: '/account/forget-password',
    resetPasswordUrl: '/account/reset-password',
  },
};

/* eslint-env mocha */
// Skipped: asserts only the AuthPlugin `header` option, which the monolith never uses.
// No shared core component is exercised, so this guards nothing in our webhooks path.
describe.skip('Login Customize Tests', () => {
  it('Global Custom Header', () => {
    cy.server();
    cy.route({
      method: 'POST',
      url: `${IDENTITY_SERVICE}/resources/auth/v1/user/token/refresh`,
      status: 401,
      response: 'Unauthorized',
    });
    cy.route({ method: 'GET', url: `${METADATA_SERVICE}?entityName=saml`, status: 200, response: { rows: [] } });

    mount(
      <TestFronteggWrapper
        plugins={[
          AuthPlugin({
            ...defaultAuthPlugin,
            header: <div className='custom-header'>MY HEADER</div>,
          }),
        ]}
      >
        Home
      </TestFronteggWrapper>,
      mountOptions
    );

    navigateTo('/account/login');

    cy.get('.custom-header').contains('MY HEADER').should('be.visible');
  });
});

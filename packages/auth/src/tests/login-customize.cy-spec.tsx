import React from 'react';
import { mount } from 'cypress/react';
import { AuthPlugin } from '../index';
import { IDENTITY_SERVICE, METADATA_SERVICE, navigateTo, TestFronteggWrapper } from '../../../../cypress/helpers';

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
    cy.intercept('POST', `${IDENTITY_SERVICE}/resources/auth/v1/user/token/refresh`, {
      statusCode: 401,
      body: 'Unauthorized',
    });
    cy.intercept('GET', `${METADATA_SERVICE}?entityName=saml`, { statusCode: 200, body: { rows: [] } });

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
      </TestFronteggWrapper>
    );

    navigateTo('/account/login');

    cy.get('.custom-header').contains('MY HEADER').should('be.visible');
  });
});

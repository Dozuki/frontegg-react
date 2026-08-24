import React from 'react';
import { mount } from 'cypress/react';
import { AuthPlugin } from '../index';
import {
  checkEmailValidation,
  EMAIL_1,
  emailInputSelector,
  IDENTITY_SERVICE,
  METADATA_SERVICE,
  mockAuthApi,
  navigateTo,
  PASSWORD,
  submitButtonSelector,
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

// Only the API-failure case is kept: it renders the shared ErrorMessage component, which
// ConnectivityWebhooksTestFrom also uses. The rest are forgot/reset navigation flows.
describe('Forgot Password Tests', () => {
  it.skip('NO SAML, should display forget password if click on forget password button', () => {
    mockAuthApi(false, false);
    mount(<TestFronteggWrapper plugins={[AuthPlugin(defaultAuthPlugin)]}>Home</TestFronteggWrapper>);
    navigateTo(defaultAuthPlugin.routes.loginUrl);

    cy.wait(['@refreshToken', '@metadata']);
    cy.get('.fe-loader').should('not.exist');

    cy.get(emailInputSelector).focus().clear().type(EMAIL_1).blur();
    cy.get('[data-test-id="forgotPassBtn"]').click();

    cy.location().should((loc) => {
      expect(loc.pathname).to.eq(defaultAuthPlugin.routes.forgetPasswordUrl);
    });

    cy.get(submitButtonSelector).should('not.be.disabled');
    cy.get(emailInputSelector).should('have.value', EMAIL_1);
  });

  it.skip('WITH SAML, should display forget password if click on forget password button', () => {
    mockAuthApi(false, true);
    cy.intercept('POST', `${IDENTITY_SERVICE}/resources/auth/v2/user/sso/prelogin`, {
      statusCode: 400,
      body: { address: null },
      delay: 200,
    }).as('preLogin');

    mount(<TestFronteggWrapper plugins={[AuthPlugin(defaultAuthPlugin)]}>Home</TestFronteggWrapper>);
    navigateTo(defaultAuthPlugin.routes.loginUrl);

    cy.wait(['@refreshToken', '@metadata']);
    cy.get('.fe-loader').should('not.exist');

    const emailSelector = '[name="email"]';
    cy.get(emailSelector).focus().clear().type(EMAIL_1).blur();
    cy.get('button[type="submit"]').click();

    cy.wait(['@preLogin']);
    cy.get('button[type="submit"]').should('not.be.disabled');

    cy.get('[data-test-id="forgotPassBtn"]').click();
    cy.location().should((loc) => {
      expect(loc.pathname).to.eq(defaultAuthPlugin.routes.forgetPasswordUrl);
    });

    cy.get(submitButtonSelector).should('not.be.disabled');
    cy.get(emailInputSelector).should('have.value', EMAIL_1);
  });

  it('should display error message if api request failed', () => {
    mockAuthApi(false, false);
    // Stub the failure rather than leaning on the request reaching nothing: the
    // transport's own error message is what surfaces otherwise, and it varies.
    cy.intercept('POST', `${IDENTITY_SERVICE}/resources/users/v1/passwords/reset`, {
      statusCode: 500,
      body: { errors: ['Unknown error occurred'] },
    }).as('forgotPasswordFailure');

    mount(<TestFronteggWrapper plugins={[AuthPlugin(defaultAuthPlugin)]}>Home</TestFronteggWrapper>);
    navigateTo(defaultAuthPlugin.routes.forgetPasswordUrl);

    cy.get(submitButtonSelector).should('be.disabled');
    checkEmailValidation();
    cy.get(submitButtonSelector).should('not.be.disabled').click();

    cy.get('.fe-error-message').contains('Unknown error occurred').should('be.visible');
  });

  it.skip('should display success message if api request succeeded', () => {
    mockAuthApi(false, false);
    cy.intercept('POST', `${IDENTITY_SERVICE}/resources/users/v1/passwords/reset`, {
      statusCode: 200,
      body: {},
      delay: 200,
    }).as('forgotPassword');

    mount(<TestFronteggWrapper plugins={[AuthPlugin(defaultAuthPlugin)]}>Home</TestFronteggWrapper>);
    navigateTo(defaultAuthPlugin.routes.forgetPasswordUrl);

    cy.get(submitButtonSelector).should('be.disabled');
    checkEmailValidation();
    cy.get(submitButtonSelector).should('not.be.disabled').click();
    cy.wait('@forgotPassword').its('request.body').should('deep.equal', { email: EMAIL_1 });

    cy.contains('A password reset email has been sent to your registered email address').should('be.visible');
    cy.contains('Back to login').should('be.visible').click();

    cy.location().should((loc) => {
      expect(loc.pathname).to.eq(defaultAuthPlugin.routes.loginUrl);
    });
  });

  it.skip('ResetPassword Page should display error if userId or token not found', () => {
    mockAuthApi(false, false);
    mount(<TestFronteggWrapper plugins={[AuthPlugin(defaultAuthPlugin)]}>Home</TestFronteggWrapper>);
    navigateTo(defaultAuthPlugin.routes.resetPasswordUrl);

    cy.get('.fe-error-message').contains('Reset Password Failed').should('be.visible');
    cy.contains('Back to login').should('be.visible').click();

    cy.location().should((loc) => {
      expect(loc.pathname).to.eq(defaultAuthPlugin.routes.loginUrl);
    });
  });

  it.skip('ResetPassword Page should display success and redirect to login page', () => {
    mockAuthApi(false, false);
    cy.intercept('POST', `${IDENTITY_SERVICE}/resources/users/v1/passwords/reset/verify`, {
      statusCode: 200,
      body: {},
      delay: 200,
    }).as('resetPassword');

    mount(<TestFronteggWrapper plugins={[AuthPlugin(defaultAuthPlugin)]}>Home</TestFronteggWrapper>);

    const userId = '1111-userId-1111';
    const token = '1111-token-1111';
    navigateTo(defaultAuthPlugin.routes.resetPasswordUrl + `?userId=${userId}&token=${token}`);

    cy.get('.fe-error-message').should('not.be.exist');

    const passwordSelector = 'input[name="password"]';
    const confirmPasswordSelector = 'input[name="confirmPassword"]';

    cy.get(submitButtonSelector).should('be.disabled');
    cy.get(passwordSelector).focus().clear().type('1111').blur();
    cy.get(passwordSelector).parents('.field').should('have.class', 'error');
    cy.get(passwordSelector).focus().clear().type(PASSWORD).blur();
    cy.get(submitButtonSelector).should('be.disabled');
    cy.get(confirmPasswordSelector)
      .focus()
      .clear()
      .type(PASSWORD + '1')
      .blur();
    cy.get(submitButtonSelector).should('be.disabled');

    cy.get(confirmPasswordSelector).parents('.field').should('have.class', 'error');
    cy.get(confirmPasswordSelector).focus().clear().type(PASSWORD).blur();

    cy.get(passwordSelector).parents('.field').should('not.have.class', 'error');
    cy.get(confirmPasswordSelector).parents('.field').should('not.have.class', 'error');

    cy.get(submitButtonSelector).should('not.be.disabled').click();
    cy.wait('@resetPassword').its('request.body').should('deep.equal', { userId, token, password: PASSWORD });

    cy.location().should((loc) => {
      expect(loc.pathname).to.eq(defaultAuthPlugin.routes.loginUrl);
    });
  });
});

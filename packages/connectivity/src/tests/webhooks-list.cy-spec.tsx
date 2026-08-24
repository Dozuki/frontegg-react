import React from 'react';
import { mount } from 'cypress/react';
import { ConnectivityPlugin, WebhookComponent } from '../index';
import { mockConnectivityApi, navigateTo, TestFronteggWrapper, WEBHOOKS_SERVICE } from '../../../../cypress/helpers';

// Mirrors the monolith's only Frontegg integration (manage_webhooks.tsx): a
// WebhookComponent inside a FronteggProvider carrying ConnectivityPlugin.
const ROOT_PATH = '/webhook';

// One compound selector, never `.first().find(...)`: the table re-renders on
// interaction, and a captured row subject goes stale on Cypress's retry.
const FIRST_ROW = '.fe-table__tbody .fe-table__tr:first-of-type';

const openRemoveDialog = () => {
  cy.get(`${FIRST_ROW} [data-test-id="menuBtn"]`).click();
  cy.contains('Remove').click();
  cy.get('[data-test-id="acceptBtn"]').should('be.visible');
};

const mountWebhooks = () => {
  mockConnectivityApi();
  mount(
    <TestFronteggWrapper plugins={[ConnectivityPlugin()]}>
      <WebhookComponent rootPath={ROOT_PATH} />
    </TestFronteggWrapper>
  );
  navigateTo(ROOT_PATH);
  cy.wait(['@webhooks', '@categories', '@channelMap']);
};

describe('Connectivity Webhooks', () => {
  it('renders the configured webhooks', () => {
    mountWebhooks();

    cy.get('.fe-connectivity-webhook-list').should('be.visible');
    cy.get('.fe-table__tbody .fe-table__tr').should('have.length', 2);
    cy.contains('Order Sync').should('be.visible');
    cy.contains('Pushes order events downstream').should('be.visible');
    cy.contains('Audit Mirror').should('be.visible');
  });

  it('filters the list by name', () => {
    mountWebhooks();

    cy.get('.fe-table__tbody .fe-table__tr').should('have.length', 2);
    cy.get('input').first().focus().clear().type('Audit');
    cy.get('.fe-table__tbody .fe-table__tr').should('have.length', 1);
    cy.contains('Audit Mirror').should('be.visible');
    cy.contains('Order Sync').should('not.exist');
  });

  it('toggling status sends the flipped isActive', () => {
    mountWebhooks();
    cy.intercept('PATCH', `${WEBHOOKS_SERVICE}/webhook-1`, { statusCode: 200, body: {} }).as('patchWebhook');

    cy.get(`${FIRST_ROW} input[type="checkbox"]`).click({ force: true });

    cy.wait('@patchWebhook').its('request.body').should('include', { _id: 'webhook-1', isActive: false });
  });

  it('cancelling a delete closes the dialog without calling the API', () => {
    mountWebhooks();
    cy.intercept('DELETE', `${WEBHOOKS_SERVICE}/webhook-1`, { statusCode: 200, body: {} }).as('deleteWebhook');

    openRemoveDialog();
    cy.get('[data-test-id="cancelBtn"]').click();

    cy.get('[data-test-id="acceptBtn"]').should('not.exist');
    cy.get('@deleteWebhook.all').should('have.length', 0);
  });

  it('confirming a delete calls the API', () => {
    mountWebhooks();
    cy.intercept('DELETE', `${WEBHOOKS_SERVICE}/webhook-1`, { statusCode: 200, body: {} }).as('deleteWebhook');

    openRemoveDialog();
    cy.get('[data-test-id="acceptBtn"]').click();

    cy.wait('@deleteWebhook');
  });

  it('opens the create form', () => {
    mountWebhooks();

    cy.get('[data-test-id="addBtn"]').click();
    cy.get('.fe-connectivity-webhook-list').should('not.exist');
    cy.get('form').should('be.visible');
  });
});

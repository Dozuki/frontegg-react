import React from 'react';
import { mount } from 'cypress/react';
import { ConnectivityPlugin, dozukiServicesApi, WebhookComponent } from '../index';
import { navigateTo, TestFronteggWrapper } from '../../../../cypress/helpers';
import { servicesCategories, servicesChannelMap, servicesWebhooks } from '../../../../cypress/consts';

// Drives the UI against dozuki-services' own paths and DTOs -- nothing here is shaped
// like Frontegg's API, so anything the adapters get wrong shows up as a render failure.
const BASE = 'http://localhost:8080/api/webhooks';
const ROOT_PATH = '/webhook';
const FIRST_ROW = '.fe-table__tbody .fe-table__tr:first-of-type';

const mountWebhooks = () => {
  cy.intercept('GET', BASE, { statusCode: 200, body: servicesWebhooks }).as('webhooks');
  cy.intercept('GET', `${BASE}/catalog/categories`, { statusCode: 200, body: servicesCategories }).as('categories');
  cy.intercept('GET', `${BASE}/catalog/channel-map`, { statusCode: 200, body: servicesChannelMap }).as('channelMap');
  mount(
    <TestFronteggWrapper plugins={[ConnectivityPlugin({ api: dozukiServicesApi() })]} context={{ urlPrefix: '' }}>
      <WebhookComponent rootPath={ROOT_PATH} />
    </TestFronteggWrapper>
  );
  navigateTo(ROOT_PATH);
  cy.wait(['@webhooks', '@categories', '@channelMap']);
};

describe('Webhooks against dozuki-services', () => {
  it('renders webhooks from the service payload', () => {
    mountWebhooks();

    cy.get('.fe-table__tbody .fe-table__tr').should('have.length', 2);
    // title -> displayName, description passes through, null description must not crash
    cy.contains('Order Sync').should('be.visible');
    cy.contains('Pushes order events downstream').should('be.visible');
    cy.contains('Audit Mirror').should('be.visible');
  });

  it('maps enabled onto the status toggle', () => {
    mountWebhooks();
    cy.intercept('PATCH', `${BASE}/wh-1`, { statusCode: 200, body: {} }).as('patchWebhook');

    // `enabled: true` has to arrive as a checked box, and flip back as `enabled: false`
    cy.get(`${FIRST_ROW} input[type="checkbox"]`).should('be.checked').click({ force: true });

    cy.wait('@patchWebhook').its('request.body').should('deep.include', { title: 'Order Sync', enabled: false });
  });

  it('leaves the signing secret alone when the form never showed it', () => {
    mountWebhooks();
    cy.intercept('PATCH', `${BASE}/wh-1`, { statusCode: 200, body: {} }).as('patchWebhook');

    cy.get(`${FIRST_ROW} input[type="checkbox"]`).click({ force: true });

    cy.wait('@patchWebhook').then(({ request }) => {
      expect(request.body).to.not.have.property('secretKey');
    });
  });

  it('deletes through the service path', () => {
    mountWebhooks();
    cy.intercept('DELETE', `${BASE}/wh-1`, { statusCode: 200, body: {} }).as('deleteWebhook');

    cy.get(`${FIRST_ROW} [data-test-id="menuBtn"]`).click();
    cy.contains('Remove').click();
    cy.get('[data-test-id="acceptBtn"]').click();

    cy.wait('@deleteWebhook');
  });

  it('offers the service catalog events in the create form', () => {
    mountWebhooks();

    cy.get('[data-test-id="addBtn"]').click();
    cy.get('form').should('be.visible');
    cy.contains('Users').should('be.visible');
  });
});

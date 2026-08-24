import React from 'react';
import { mount } from 'cypress/react';
import { AuditsPlugin, Audits } from '../index';
import { mockAuditsApi, TestFronteggWrapper } from '../../../../cypress/helpers';

// Skipped: exercises Table's expandable-row feature, which the webhooks table does not use.
describe.skip('Expandable Rows', () => {
  it('Rows should expand', () => {
    mockAuditsApi();
    mount(
      <TestFronteggWrapper plugins={[AuditsPlugin()]}>
        <Audits.Page />
      </TestFronteggWrapper>
    );
    cy.wait('@auditsData');
    cy.wait('@auditsMetadata');
    cy.wait('@auditsStats');
    cy.get('.fe-table').should('be.visible');
    cy.get('.fe-table__expand-button').first().click();
    cy.get('.fe-table__tr-expanded-content').first().should('have.class', 'is-expanded');
    cy.get('.fe-audits__expand-content').first().should('be.visible');
  });
});

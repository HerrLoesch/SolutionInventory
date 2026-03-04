  Feature: Questionnaire management

  Background:
    Given I open the application
  
  # ---------------------------------------------------------------------------
  # Questionnaire CRUD
  # ---------------------------------------------------------------------------

  Scenario: Add a questionnaire to a project
    Given a project "Playwright Test Project" exists
    When I open the context menu for "Playwright Test Project"
    And I click "Add" in the context menu
    And I fill in the questionnaire name "Playwright Test Questionnaire"
    And I confirm with "Create"
    Then the questionnaire "Playwright Test Questionnaire" should be visible in the tree
    And the questionnaire name dialog should be closed

  Scenario: Delete a questionnaire from a project
    Given a project "Playwright Test Project" exists
    And a questionnaire "Playwright Test Questionnaire" exists in project "Playwright Test Project"
    When I open the context menu for questionnaire "Playwright Test Questionnaire"
    And I click "Delete" in the context menu
    And I confirm with "Delete"
    Then the questionnaire "Playwright Test Questionnaire" should not be visible in the tree

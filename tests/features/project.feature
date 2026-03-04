Feature: Project management

  Background:
    Given I open the application

  # ---------------------------------------------------------------------------
  # Project CRUD
  # ---------------------------------------------------------------------------

  Scenario: Create a new project
    When I click the "New project" button
    And I fill in the project name "Playwright Test Project"
    And I confirm with "Create"
    Then the project "Playwright Test Project" should be visible in the tree
    And the project name dialog should be closed

  Scenario: Delete a project
    Given a project "Playwright Test Project" exists
    When I open the context menu for "Playwright Test Project"
    And I click "Delete" in the context menu
    Then the project "Playwright Test Project" should not be visible in the tree

  Scenario: Delete a project with questionnaires
    Given a project "Playwright Test Project" exists
    And a questionnaire "Playwright Test Questionnaire" exists in project "Playwright Test Project"
    When I open the context menu for "Playwright Test Project"
    And I click "Delete" in the context menu
    And I confirm with "Delete"
    Then the project "Playwright Test Project" should not be visible in the tree
    And the questionnaire "Playwright Test Questionnaire" should not be visible in the tree

  Scenario: Rename a project
    Given a project "Playwright Test Project" exists
    When I open the context menu for "Playwright Test Project"
    And I click "Rename" in the context menu
    And I fill in the new project name "Renamed Playwright Test Project"
    And I confirm with "Rename"
    Then the project "Renamed Playwright Test Project" should be visible in the tree
    And the project name dialog should be closed


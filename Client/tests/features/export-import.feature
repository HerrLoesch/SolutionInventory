@integration
Feature: Exporting and importing

  Background:
    Given I have the store available

  Scenario: Importing a project
    When I import the "golden_sample_project.json" file
    Then the project should be imported successfully
    And the project should be available in the store
    And the project schould have one questionnaire
    And the data from the questionnaire should match the data from "sample_questionaire.json"

  Scenario: Exporting a project
    Given I import the "golden_sample_project.json" file
    When I export the project
    Then the exported file should be available
    And the exported data should match the data from "golden_sample_project.json"
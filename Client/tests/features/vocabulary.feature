Feature: Shared vocabulary across projects

  A term created while curating one project's radar becomes the established
  spelling everywhere: the next project offers it as a suggestion instead of
  letting a second spelling of the same thing enter the data.

  Background:
    Given I open the application

  Scenario: A term created in the radar is offered as a suggestion in another project
    Given a project "Vocab Project A" exists
    And a questionnaire "Vocab Questionnaire A" exists in project "Vocab Project A"
    And the questionnaire is unlocked for questions
    And I open the category "Architecture"
    And I answer the first entry with the tool "Dotnet Core"
    When I add "Dotnet Core" to the tech radar of "Vocab Project A"
    And I open the tech radar of "Vocab Project A"
    And I open the details of the blip "Dotnet Core"
    And I create the blip as its own vocabulary term
    Then the blip should be shown as part of the vocabulary "Dotnet Core"

    When I close the blip details
    And a project "Vocab Project B" exists
    And a questionnaire "Vocab Questionnaire B" exists in project "Vocab Project B"
    And the questionnaire is unlocked for questions
    And I open the category "Architecture"
    When I open the solution suggestions of the first entry
    Then "Dotnet Core" should be offered as a suggestion

  # Todo 7.3 — the full workflow: fill in catalogs, curate the radar and assign
  # terms, then compare and export.
  Scenario: Comparing two projects from end to end
    Given a project "Compare Alpha" exists
    And a questionnaire "Alpha Q" exists in project "Compare Alpha"
    And the questionnaire is unlocked for questions
    And I open the category "Architecture"
    And I answer the first entry with the tool "Clean Arch"
    When I add "Clean Arch" to the tech radar of "Compare Alpha"

    Given a project "Compare Beta" exists
    And a questionnaire "Beta Q" exists in project "Compare Beta"
    And the questionnaire is unlocked for questions
    And I open the category "Architecture"
    And I answer the first entry with the tool "clean arch"
    When I add "clean arch" to the tech radar of "Compare Beta"

    When I open the project comparison
    Then the comparison should show the term "Clean Arch"
    And the comparison should report 2 compared projects

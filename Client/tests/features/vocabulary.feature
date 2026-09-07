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

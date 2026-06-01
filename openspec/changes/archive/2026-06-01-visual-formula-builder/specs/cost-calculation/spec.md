## MODIFIED Requirements

### Requirement: Cost is computed by evaluating the user's formula token sequence
The system SHALL compute the print cost by evaluating the `formulaTokens` array saved in `PrintSettings` using the formula token evaluator, with variable values resolved from the current extracted print data and user settings. The result SHALL be a single numeric value representing total cost.

#### Scenario: Cost calculation uses custom token sequence
- **WHEN** the user has saved a custom token sequence and clicks "Calculate Cost" on MakerWorld
- **THEN** the overlay displays the result of evaluating that token sequence with the current print data

#### Scenario: Cost calculation uses default token sequence when none is saved
- **WHEN** no custom formula has been saved (first use or settings reset)
- **THEN** the calculation uses `DEFAULT_FORMULA_TOKENS`, producing a result consistent with the previous hardcoded implementation for the same inputs

#### Scenario: Invalid token sequence shows error in overlay
- **WHEN** the saved token sequence is malformed or cannot be evaluated
- **THEN** the overlay displays "Formula error: Incomplete formula" instead of a cost value and does not crash the content script

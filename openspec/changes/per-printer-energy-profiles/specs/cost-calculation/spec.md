## MODIFIED Requirements

### Requirement: Cost is computed by evaluating the user's formula token sequence
The system SHALL compute the print cost by evaluating the `formulaTokens` array saved in `PrintSettings` using the formula token evaluator, with variable values resolved from the current extracted print data and user settings. The `pricePerGram` variable resolved during evaluation SHALL use the material-matched price from `materialPrices` (case-insensitive lookup by plate material name) or `defaultPricePerGram` if no match is found. The `energy_kwh_per_hour` variable SHALL use the active printer profile's kWh/hr value when `activePrinterId` matches a profile in `printerProfiles`, otherwise it SHALL fall back to the global `energyKwhPerHour` setting. The result SHALL be a single numeric value representing total cost.

#### Scenario: Cost calculation uses custom token sequence
- **WHEN** the user has saved a custom token sequence and clicks "Calculate Cost" on MakerWorld
- **THEN** the overlay displays the result of evaluating that token sequence with the current print data

#### Scenario: Cost calculation uses default token sequence when none is saved
- **WHEN** no custom formula has been saved (first use or settings reset)
- **THEN** the calculation uses `DEFAULT_FORMULA_TOKENS`, producing a result consistent with the previous hardcoded implementation for the same inputs

#### Scenario: Invalid token sequence shows error in overlay
- **WHEN** the saved token sequence is malformed or cannot be evaluated
- **THEN** the overlay displays "Formula error: Incomplete formula" instead of a cost value and does not crash the content script

#### Scenario: Cost calculation uses matched material price per gram
- **WHEN** the extracted plate material matches a key in `materialPrices` (case-insensitive)
- **THEN** the formula evaluates with that material's price per gram as the `pricePerGram` variable

#### Scenario: Cost calculation uses default price when no material match
- **WHEN** the extracted plate material is null or does not match any key in `materialPrices`
- **THEN** the formula evaluates with `defaultPricePerGram` as the `pricePerGram` variable

#### Scenario: Cost calculation uses active printer energy value
- **WHEN** `activePrinterId` matches a profile in `printerProfiles`
- **THEN** the formula evaluates with that printer profile's `energyKwhPerHour` as the `energy_kwh_per_hour` variable

#### Scenario: Cost calculation falls back to global energy value
- **WHEN** `activePrinterId` is `null` or does not match any profile in `printerProfiles`
- **THEN** the formula evaluates with the global `energyKwhPerHour` setting as the `energy_kwh_per_hour` variable

## ADDED Requirements

### Requirement: Token types cover variables, constants, operators, and parentheses
The system SHALL define a `FormulaToken` discriminated union type with four variants:
- `{ type: 'variable'; id: string }` — references a system variable by id
- `{ type: 'constant'; id: string }` — references a user-defined constant by id
- `{ type: 'operator'; symbol: '+' | '-' | '*' | '/' }` — an arithmetic operator
- `{ type: 'paren'; symbol: '(' | ')' }` — a grouping parenthesis

#### Scenario: Variable token identifies a registered variable
- **WHEN** a token has `type: 'variable'` and `id: 'filament_g'`
- **THEN** the evaluator resolves it to the filament weight value from the current print data

#### Scenario: Constant token identifies a user-defined constant
- **WHEN** a token has `type: 'constant'` and `id` matching an entry in `settings.userConstants`
- **THEN** the evaluator resolves it to that constant's `value`

#### Scenario: Operator token identifies an arithmetic operation
- **WHEN** a token has `type: 'operator'` and `symbol: '*'`
- **THEN** the evaluator applies multiplication between its two adjacent operand values

#### Scenario: Paren tokens control evaluation grouping
- **WHEN** the token sequence contains `[(, filament_g, +, filament_cost_per_g, ), *, print_time_min]`
- **THEN** the evaluator computes `(filament_g + filament_cost_per_g) * print_time_min`

### Requirement: Variable registry defines all available system variables
The system SHALL maintain a static `FORMULA_VARIABLES` registry that maps each variable `id` to a human-readable label, a short description, and an extractor function `(printData: PrintData, settings: PrintSettings) => number`.

The registry SHALL include: `filament_g`, `print_time_min`, `filament_cost_per_g`, `energy_kwh_per_hour`, `energy_cost_per_kwh`, `failure_rate`.

#### Scenario: All six standard variables are in the registry
- **WHEN** the `FORMULA_VARIABLES` array is inspected
- **THEN** all six variable ids are present with non-empty labels and extractor functions

#### Scenario: Extractor returns correct value for filament weight
- **WHEN** `printData.filamentGrams` is `50` and the `filament_g` extractor is called
- **THEN** it returns `50`

### Requirement: User-defined constants have a stable identity and numeric value
The system SHALL define a `UserConstant` type: `{ id: string; label: string; value: number }`. Constants SHALL be stored as `userConstants: UserConstant[]` in `PrintSettings`. IDs SHALL be generated as short random strings on creation and SHALL NOT change when a constant is renamed or its value is edited.

#### Scenario: Constant retains its id after rename
- **WHEN** a user renames a constant from "Labor fee" to "Setup fee"
- **THEN** the constant's `id` remains unchanged and existing formula tokens referencing that id continue to resolve correctly

#### Scenario: Deleting a constant leaves orphaned tokens evaluating to an error
- **WHEN** a constant is deleted from `userConstants` and a formula token with that `id` is evaluated
- **THEN** the evaluator throws an error identifying the unknown constant id

### Requirement: Evaluator applies standard operator precedence with parenthesis grouping
The system SHALL evaluate a `FormulaToken[]` sequence using the shunting-yard algorithm, applying:
- `*` and `/` before `+` and `-`
- Parentheses to override precedence

#### Scenario: Parentheses override default precedence
- **WHEN** the token sequence represents `(filament_g + filament_cost_per_g) * print_time_min`
- **THEN** the evaluator returns the addition result multiplied by `print_time_min`, not `filament_g + (filament_cost_per_g * print_time_min)`

#### Scenario: Multiplication evaluated before addition without parentheses
- **WHEN** the token sequence represents `filament_g * filament_cost_per_g + energy_cost_per_kwh`
- **THEN** the evaluator returns `(filament_g * filament_cost_per_g) + energy_cost_per_kwh`

#### Scenario: Left-to-right evaluation for same-precedence operators
- **WHEN** the token sequence represents `a - b + c`
- **THEN** the evaluator returns `(a - b) + c`

### Requirement: Evaluator returns descriptive errors for invalid token sequences
The system SHALL throw a descriptive error for each of the following malformed sequences:

#### Scenario: Empty token sequence
- **WHEN** the token sequence is an empty array
- **THEN** the evaluator throws an error with message "Formula is empty"

#### Scenario: Two consecutive operators
- **WHEN** the token sequence contains `[filament_g, +, *, filament_cost_per_g]`
- **THEN** the evaluator throws an error indicating an unexpected operator

#### Scenario: Sequence ending with an operator
- **WHEN** the token sequence ends with an operator token
- **THEN** the evaluator throws an error indicating an incomplete expression

#### Scenario: Mismatched opening parenthesis
- **WHEN** the token sequence contains an unmatched `(`
- **THEN** the evaluator throws an error with message "Mismatched parentheses"

#### Scenario: Mismatched closing parenthesis
- **WHEN** the token sequence contains a `)` with no preceding matching `(`
- **THEN** the evaluator throws an error with message "Mismatched parentheses"

#### Scenario: Unknown constant id
- **WHEN** a constant token references an id not present in `userConstants`
- **THEN** the evaluator throws an error identifying the unknown constant

### Requirement: Default formula token sequence replicates current behavior exactly
The system SHALL define a `DEFAULT_FORMULA_TOKENS: FormulaToken[]` constant that encodes the formula `(filament_g * filament_cost_per_g) + ((print_time_min / 60) * energy_kwh_per_hour * energy_cost_per_kwh) * (1 + failure_rate)` using parenthesis tokens for exact grouping.

#### Scenario: Default tokens evaluate to same result as old hardcoded formula
- **WHEN** `DEFAULT_FORMULA_TOKENS` is evaluated with a known set of print data and settings values
- **THEN** the result matches the output of the previous `calculateCost()` implementation for those same inputs

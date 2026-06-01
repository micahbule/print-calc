## ADDED Requirements

### Requirement: Palette displays system variable chips, operator buttons, and parenthesis buttons
The formula builder UI SHALL display a palette section with:
- One draggable chip per entry in `FORMULA_VARIABLES` (system variables)
- Clickable operator buttons: `+`, `−`, `×`, `÷`
- Clickable parenthesis buttons: `(`, `)`

Clicking an operator or parenthesis button SHALL append the corresponding token to the end of the formula row.

#### Scenario: All six system variables visible in palette
- **WHEN** the formula builder section is displayed in the popup
- **THEN** six variable chips are visible, each labeled with the variable's human-readable name

#### Scenario: All four operators and both parentheses visible in palette
- **WHEN** the formula builder section is displayed
- **THEN** buttons for `+`, `−`, `×`, `÷`, `(`, and `)` are visible and interactive

#### Scenario: Clicking a parenthesis button appends to the formula row
- **WHEN** the user clicks the `(` button
- **THEN** a `{ type: 'paren', symbol: '(' }` token is appended to the formula row and the formula is saved

### Requirement: User-defined constants section shows constant chips and an add control
The formula builder UI SHALL display a "My Constants" section beneath the system variables palette. The section SHALL list each `UserConstant` from `settings.userConstants` as a draggable chip showing the constant's label and value. An "+ Add" control SHALL be visible to create a new constant.

#### Scenario: Existing constants appear as chips
- **WHEN** `settings.userConstants` contains `[{ id: 'c1', label: 'Labor fee', value: 5.00 }]`
- **THEN** a chip labeled "Labor fee — $5.00" appears in the My Constants section

#### Scenario: Empty constants list shows prompt
- **WHEN** `settings.userConstants` is empty
- **THEN** the My Constants section shows a prompt such as "No constants yet. Add one to use in your formula."

### Requirement: Users can create a new constant
Activating the "+ Add" control SHALL reveal an inline form with a label field and a numeric value field. Confirming the form SHALL append a new `UserConstant` with a generated id to `settings.userConstants` and save to storage.

#### Scenario: Adding a new constant
- **WHEN** the user enters label "Markup" and value "0.15" and confirms
- **THEN** a new constant `{ id: <generated>, label: 'Markup', value: 0.15 }` is added to `userConstants`, saved to storage, and its chip appears in the palette

#### Scenario: Confirming with an empty label is rejected
- **WHEN** the user leaves the label field blank and attempts to confirm
- **THEN** the form shows a validation message and the constant is not created

### Requirement: Users can edit an existing constant's label and value
Each constant chip SHALL provide an edit control (pencil icon). Activating it SHALL replace the chip with an inline form pre-filled with the current label and value. Confirming SHALL update the constant in `userConstants` and save to storage.

#### Scenario: Editing a constant's value
- **WHEN** the user edits "Labor fee" to value "7.50" and confirms
- **THEN** the constant in `userConstants` is updated to `value: 7.50`, saved to storage, and the chip reflects the new value

#### Scenario: Constant id is unchanged after edit
- **WHEN** the user renames a constant
- **THEN** existing formula tokens referencing that constant's id continue to resolve without modification

### Requirement: Users can delete a constant
Each constant chip SHALL provide a delete control (`×`). Activating it SHALL remove the constant from `userConstants` and save to storage. Orphaned formula tokens referencing the deleted constant id SHALL remain in the formula row and cause a visible error in the live preview.

#### Scenario: Deleting a constant not used in the formula
- **WHEN** the user deletes a constant whose id is not present in `formulaTokens`
- **THEN** the constant is removed from the palette and storage without affecting the preview

#### Scenario: Deleting a constant used in the formula
- **WHEN** the user deletes a constant whose id appears in `formulaTokens`
- **THEN** the constant chip disappears from the palette, the orphaned token remains in the formula row visually distinct (e.g., shown in red or with a warning label), and the preview shows an error

### Requirement: Dragging a palette item inserts a token into the formula row
The system SHALL allow users to drag a system variable chip or user constant chip from the palette and drop it into the formula row drop zone. On drop, the corresponding token SHALL be inserted at the drop position.

#### Scenario: Dragging a variable chip into an empty formula row
- **WHEN** the user drags the "Filament (g)" chip into an empty formula row
- **THEN** a `{ type: 'variable', id: 'filament_g' }` token appears in the row

#### Scenario: Dragging a constant chip into the formula row
- **WHEN** the user drags a "Labor fee" constant chip into the formula row
- **THEN** a `{ type: 'constant', id: '<labor-fee-id>' }` token appears at the drop position

### Requirement: Tokens in the formula row are reorderable by dragging
The system SHALL allow users to drag tokens within the formula row to reorder them.

#### Scenario: Reordering two tokens
- **WHEN** the formula row contains `[filament_g] [+] [filament_cost_per_g]` and the user drags `filament_cost_per_g` before `filament_g`
- **THEN** the row updates to `[filament_cost_per_g] [+] [filament_g]` and the formula saves

### Requirement: Each token in the formula row can be removed
The system SHALL display a remove control on each token in the formula row. Activating the remove control SHALL delete that token from the sequence.

#### Scenario: Removing a parenthesis token
- **WHEN** the formula row contains `[(] [filament_g] [×] [filament_cost_per_g] [)]` and the user removes the opening `(`
- **THEN** the row updates to `[filament_g] [×] [filament_cost_per_g] [)]` and the preview reflects mismatched parentheses

### Requirement: Live preview shows formula result or error
The popup SHALL display a preview line beneath the formula row that evaluates the current token sequence. System variables use sample values; user constant tokens use their actual saved values. The preview SHALL update after every token or constant change.

#### Scenario: Valid formula shows cost preview
- **WHEN** the token sequence is valid and evaluates without error
- **THEN** the preview line shows "Preview: $X.XX"

#### Scenario: Mismatched parentheses shown in preview
- **WHEN** the token sequence has an unmatched `(` or `)`
- **THEN** the preview line shows "Mismatched parentheses"

#### Scenario: Orphaned constant token shown in preview
- **WHEN** a constant token references a deleted constant id
- **THEN** the preview line shows an error identifying the unknown constant

#### Scenario: Empty formula row shows placeholder
- **WHEN** the formula row has no tokens
- **THEN** the preview line shows "Add tokens to build your formula"

### Requirement: Formula changes are persisted to storage
The system SHALL save the current `FormulaToken[]` sequence to `chrome.storage.local` after every token add, remove, or reorder operation.

#### Scenario: Token sequence persists across popup close and reopen
- **WHEN** the user adds tokens and closes the popup
- **THEN** reopening the popup shows the same token sequence in the formula row

### Requirement: Reset to default restores the default token sequence
The popup SHALL provide a "Reset to default" control in the formula builder section. Activating it SHALL replace the current token sequence with `DEFAULT_FORMULA_TOKENS` and save to storage. User-defined constants SHALL NOT be affected by a reset.

#### Scenario: Reset restores default tokens without clearing constants
- **WHEN** the user has a custom formula and activates "Reset to default"
- **THEN** the formula row shows the default formula tokens, the preview updates, and the user's constants remain in the My Constants section

## 1. Dependencies & Types

- [x] 1.1 Add `@dnd-kit/core` and `@dnd-kit/sortable` to `package.json` and install via `pnpm add @dnd-kit/core @dnd-kit/sortable`
- [x] 1.2 Define `FormulaToken` discriminated union type in `utils/formulaEngine.ts` with four variants: `variable`, `constant`, `operator`, `paren`
- [x] 1.3 Define `UserConstant` type in `utils/formulaEngine.ts`: `{ id: string; label: string; value: number }`
- [x] 1.4 Add `formulaTokens: FormulaToken[]` and `userConstants: UserConstant[]` fields to the `PrintSettings` type in `utils/calculations.ts`

## 2. Variable Registry & Constants

- [x] 2.1 Create `FORMULA_VARIABLES` array in `utils/formulaEngine.ts` — each entry has `id`, `label`, `description`, and `extract(printData, settings) => number`
- [x] 2.2 Add all six entries: `filament_g`, `print_time_min`, `filament_cost_per_g`, `energy_kwh_per_hour`, `energy_cost_per_kwh`, `failure_rate`
- [x] 2.3 Add `SAMPLE_VALUES: Record<string, number>` constant for live preview (representative values like `filament_g: 50`, `print_time_min: 90`, etc.)
- [x] 2.4 Add a `generateConstantId(): string` utility in `utils/formulaEngine.ts` that returns a short random alphanumeric string

## 3. Formula Evaluator

- [x] 3.1 Implement `evaluateTokens(tokens: FormulaToken[], variableValues: Record<string, number>, constants: UserConstant[]): number` in `utils/formulaEngine.ts` using the shunting-yard algorithm with `*`/`/` precedence over `+`/`-` and full parenthesis support
- [x] 3.2 Add validation: throw descriptive errors for empty sequence, consecutive operators, sequence starting/ending with an operator, mismatched `(` or `)`, and unknown variable or constant id
- [x] 3.3 Add `DEFAULT_FORMULA_TOKENS: FormulaToken[]` constant encoding `(filament_g * filament_cost_per_g) + ((print_time_min / 60) * energy_kwh_per_hour * energy_cost_per_kwh) * (1 + failure_rate)` using paren tokens for exact grouping
- [x] 3.4 Manually verify `evaluateTokens(DEFAULT_FORMULA_TOKENS, sampleValues, [])` matches the old `calculateCost()` output for the same inputs

## 4. Settings Integration

- [x] 4.1 Add `formulaTokens: DEFAULT_FORMULA_TOKENS` and `userConstants: []` to `DEFAULT_SETTINGS` in `utils/calculations.ts`
- [x] 4.2 In `popup.tsx`, extend the settings migration block to populate both `formulaTokens` and `userConstants` from `DEFAULT_SETTINGS` when absent in loaded settings
- [x] 4.3 Add `buildVariableValues(printData: PrintData, settings: PrintSettings): Record<string, number>` helper in `utils/formulaEngine.ts` that calls each `FORMULA_VARIABLES` entry's `extract` function
- [x] 4.4 Refactor `calculateCost()` in `utils/calculations.ts` to call `evaluateTokens(settings.formulaTokens, buildVariableValues(printData, settings), settings.userConstants)` and return the numeric result

## 5. Content Script Error Handling

- [x] 5.1 In `contents/makerworld.ts`, wrap the `calculateCost()` call in a try/catch and display "Formula error: <message>" in the overlay when evaluation fails, without crashing the content script

## 6. Formula Builder UI Component

- [x] 6.1 Create `components/FormulaBuilder.tsx` — accepts `tokens: FormulaToken[]`, `userConstants: UserConstant[]`, and `onChange: (tokens: FormulaToken[]) => void` props
- [x] 6.2 Render the system variable palette: one chip per `FORMULA_VARIABLES` entry, each wrapped in a `@dnd-kit` draggable
- [x] 6.3 Render the operator palette: `+`, `−`, `×`, `÷` buttons plus `(` and `)` buttons that click-to-append the corresponding token
- [x] 6.4 Render the formula row as a `@dnd-kit/sortable` `SortableContext` — each token is a sortable item with a remove `×` button; orphaned constant tokens (referencing a deleted constant) render with a distinct error style
- [x] 6.5 Handle drop events from the palette into the formula row: insert the dragged variable or constant token at the correct drop position, call `onChange` with the updated sequence
- [x] 6.6 Render the live preview line beneath the formula row: evaluate tokens against `SAMPLE_VALUES` (for variables) and actual `userConstants` values on every render; show "Preview: $X.XX", the error message, or "Add tokens to build your formula" for empty
- [x] 6.7 Render the "Reset to default" button that calls `onChange(DEFAULT_FORMULA_TOKENS)` (does not affect `userConstants`)

## 7. Constants Manager UI Component

- [x] 7.1 Create `components/ConstantsManager.tsx` — accepts `constants: UserConstant[]` and `onChange: (constants: UserConstant[]) => void` props
- [x] 7.2 Render the "My Constants" list: each constant as a draggable chip showing label and value, with an edit (pencil) icon and a delete (`×`) icon
- [x] 7.3 Render an empty state message when `constants` is empty
- [x] 7.4 Implement the "+ Add" control: clicking reveals an inline form with a label text field and a numeric value field; confirming appends `{ id: generateConstantId(), label, value }` to the list and calls `onChange`
- [x] 7.5 Validate the add form: require a non-empty label; show inline error if blank; require a valid number for value
- [x] 7.6 Implement the edit flow: clicking the pencil icon replaces the chip with an inline form pre-filled with the current label and value; confirming calls `onChange` with the updated entry preserving the same `id`
- [x] 7.7 Implement the delete flow: clicking `×` removes the constant from the list and calls `onChange`

## 8. Popup Integration

- [x] 8.1 Import and render `<ConstantsManager>` in `popup.tsx` in the formula builder section, bound to `settings.userConstants`; in the `onChange` handler, save to `chrome.storage.local`
- [x] 8.2 Import and render `<FormulaBuilder>` in `popup.tsx` below the constants manager, passing `settings.formulaTokens` and `settings.userConstants`; in the `onChange` handler, save updated `formulaTokens` to storage

## 9. Validation & Polish

- [x] 9.1 Manually test the default formula end-to-end: open a MakerWorld print page, click "Calculate Cost", verify the overlay result matches the previous behavior
- [x] 9.2 Manually test parenthesis grouping: build `(filament_g + filament_cost_per_g) * print_time_min`, verify the preview reflects the grouped evaluation order
- [x] 9.3 Manually test mismatched parentheses: build a formula with an unmatched `(`, verify the preview shows "Mismatched parentheses" and the overlay shows the error
- [x] 9.4 Manually test user-defined constants: add a "Labor fee = 5.00" constant, drag it into the formula, verify the preview uses $5.00 and the overlay result is correct
- [x] 9.5 Manually test constant deletion with an orphaned token: delete a constant referenced in the formula, verify the orphaned token is visually distinct and the preview shows an error
- [x] 9.6 Manually test "Reset to default" preserves user constants while restoring the formula row
- [x] 9.7 Verify all settings (formula tokens and user constants) persist across popup close/reopen
- [x] 9.8 Run `pnpm build` and confirm no TypeScript errors

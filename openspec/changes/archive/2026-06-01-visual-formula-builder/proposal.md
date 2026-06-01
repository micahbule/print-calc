## Why

The current cost calculator uses a fixed formula that doesn't fit every user's pricing model, and a plain text expression evaluator requires users to know the variable names and syntax upfront. A drag-and-drop token builder lets any user compose their own pricing formula intuitively — no typing, no syntax errors, just snapping pieces together.

This supersedes the `composable-cost-formula` change, which proposed a text-based string evaluator. The visual approach is better suited to the extension's non-developer user base.

## What Changes

- Add a visual formula builder UI to the popup settings page
- Users drag variable chips (e.g., `Filament (g)`, `Print time (min)`) and operator tokens (`+`, `−`, `×`, `÷`, `(`, `)`) into a horizontal formula row to compose their pricing formula
- Users can define named constants (e.g., `Labor fee = $5.00`, `Markup = 0.15`) in the popup; these constants appear as draggable chips in the palette alongside system variables
- The composed token sequence is serialized to JSON and evaluated on each "Calculate Cost" click in the content script
- A live numeric preview in the popup shows the formula result using sample values as the user builds
- The default formula is pre-loaded as a token sequence that replicates the current hardcoded behavior, now using parenthesis tokens for exact fidelity
- A "Reset to default" action restores the default token sequence
- **BREAKING**: `calculateCost()` in `utils/calculations.ts` is refactored to accept and evaluate a serialized token sequence; `PrintSettings` gains `formulaTokens: FormulaToken[]` and `userConstants: UserConstant[]` fields

## Capabilities

### New Capabilities

- `formula-token-model`: The data model for representing a formula as an ordered list of typed tokens (variable references, constant references, operators, and parentheses), plus the variable registry, user-defined constant model, and shunting-yard evaluator
- `formula-builder-ui`: The drag-and-drop popup UI — a palette of system variables, user-defined constant chips, operator buttons, and parenthesis buttons; a sortable formula row drop zone; a constants management section; and a live preview

### Modified Capabilities

- `cost-calculation`: Cost computation changes from hardcoded logic to evaluating the user's saved token sequence; same output (a total cost number) but the computation path is now data-driven

## Impact

- `utils/calculations.ts`: `calculateCost()` refactored; `PrintSettings` and `DEFAULT_SETTINGS` updated with `formulaTokens` and `userConstants`
- `utils/formulaEngine.ts` (new): Token types, variable registry, user constant model, evaluator
- `popup.tsx`: Formula builder and constants manager sections added; migration block updated for new fields
- `contents/makerworld.ts`: No structural changes; overlay error handling updated for evaluation failures
- New dependency: `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop (~10KB gzipped)

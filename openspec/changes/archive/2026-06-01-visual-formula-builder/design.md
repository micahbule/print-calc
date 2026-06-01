## Context

`utils/calculations.ts` currently runs a hardcoded formula. The previous `composable-cost-formula` change proposed replacing it with a string expression evaluator, but users unfamiliar with expression syntax would still face a blank text field and need to know variable names. A visual token builder removes that friction entirely: the palette shows every available variable as a labeled chip, operators are visible buttons, and the formula row is assembled by drag-and-drop.

The popup is a constrained environment (~380px wide, rendered in a browser popup) so the builder must be compact and work without a canvas or large rendering surface.

## Goals / Non-Goals

**Goals:**
- A drag-and-drop palette + formula row in the popup settings UI
- All available system variables and user-defined constants visible in the palette — nothing to memorize
- Parenthesis tokens (`(`, `)`) for explicit grouping, supported both in the UI palette and the evaluator
- User-defined constants (e.g., labor fee, markup percentage) that users name and assign a numeric value; they appear as draggable chips in the palette
- Live preview evaluates the current token sequence against sample values as the user edits
- Token sequence serializes to JSON stored in `chrome.storage.local`; the evaluator reconstructs and computes the result at content-script time
- Default formula pre-loaded as a token sequence — now using parenthesis tokens for exact behavioral fidelity with the old hardcoded formula
- Reset-to-default restores the default token sequence
- Graceful error display when the token sequence can't be evaluated (e.g., incomplete formula, mismatched parentheses)

**Non-Goals:**
- Undo/redo history
- Sharing or importing formula templates
- Mobile or responsive layout (popup only)
- Built-in math functions (min, max, ceil, etc.) — arithmetic and grouping are sufficient for pricing formulas

## Decisions

### 1. Drag-and-drop library: `@dnd-kit/core` + `@dnd-kit/sortable`

**Decision**: Use `@dnd-kit` for drag-and-drop interactions.

**Rationale**: `@dnd-kit` is the de-facto standard for accessible React DnD (~10KB gzipped). It supports drag from a palette into a sortable list — exactly the interaction needed. HTML5 native DnD has poor cross-browser consistency in shadow DOM / extension contexts. Alternatives like `react-beautiful-dnd` are unmaintained; `react-dnd` is heavier and more complex.

### 2. Token data model: flat ordered array of four typed tokens

**Decision**: Represent a formula as `FormulaToken[]` with four variants:

```ts
type FormulaToken =
  | { type: 'variable'; id: string }
  | { type: 'constant'; id: string }
  | { type: 'operator'; symbol: '+' | '-' | '*' | '/' }
  | { type: 'paren'; symbol: '(' | ')' }
```

- `variable` tokens reference entries in the static `FORMULA_VARIABLES` registry; resolved at evaluation time from `PrintData` + `PrintSettings`
- `constant` tokens reference user-defined constants by `id`; resolved at evaluation time from `settings.userConstants`
- `operator` and `paren` tokens map directly to arithmetic operations and grouping

**Variable registry**: A static `FORMULA_VARIABLES` array in `utils/formulaEngine.ts` maps each `id` to a label, description, and extractor `(printData, settings) => number`.

**User constant model**:
```ts
type UserConstant = { id: string; label: string; value: number }
```
Stored as `userConstants: UserConstant[]` in `PrintSettings`. IDs are generated as short random strings on creation.

### 3. Evaluation: shunting-yard algorithm with parenthesis support

**Decision**: Implement the shunting-yard algorithm in `utils/formulaEngine.ts`. The algorithm natively handles parentheses — no extra complexity beyond recognizing `(` and `)` tokens as their shunting-yard equivalents.

**Rationale**: Zero added dependency, zero CSP risk, zero bundle cost. Shunting-yard with parentheses is well-understood and the resulting evaluator stays under ~60 lines.

**Error cases handled**:
- Empty sequence
- Consecutive operators
- Sequence starting/ending with an operator
- Mismatched parentheses (unmatched `(` or `)`)
- Unknown variable or constant id

### 4. Serialization: two new fields in `PrintSettings`

**Decision**: Add `formulaTokens: FormulaToken[]` and `userConstants: UserConstant[]` to `PrintSettings`, stored under the existing `"printCalcSettings"` key in `chrome.storage.local`.

**Rationale**: Consistent with existing settings persistence. Both fields are JSON-serializable with no special handling.

### 5. UI layout: palette → constants → formula row

```
┌──────────────────────────────────────┐
│  Variables                           │
│  [Filament g] [Time min] [Cost/g]…  │  ← system variable chips (draggable)
│  [Energy kWh] [Elec ¢/kWh] [Fail%]  │
│                                      │
│  Operators                           │
│  [+] [-] [×] [÷] [(] [)]            │  ← click-to-append operators + parens
│                                      │
│  My Constants              [+ Add]   │
│  [Labor $5.00 ✎ ×] [Markup 0.15 ✎ ×]│  ← user constant chips (draggable, editable inline)
├──────────────────────────────────────┤
│  Formula                             │
│  ┌────────────────────────────────┐  │
│  │ [(][Filament g][×][Cost/g][)]… │  │  ← drop zone (sortable, removable)
│  └────────────────────────────────┘  │
│  Preview: $2.47          [Reset]     │
└──────────────────────────────────────┘
```

System variable chips are draggable into the formula row. Operator and parenthesis buttons click-to-append (no drag needed — they're stateless). User constant chips are draggable and show inline edit (pencil) and delete controls.

### 6. User constant management: inline in the popup

**Decision**: Constants are created, renamed, and given values via a simple inline form in the "My Constants" section. No separate modal.

**Rationale**: Popup space is limited but an inline approach (click "+ Add" → name field + value field appear inline → confirm) is sufficient. Editing an existing constant shows the same inline fields in place of the chip.

### 7. Live preview: sample values for system variables, actual values for constants

**Decision**: The live preview evaluates the formula using `SAMPLE_VALUES` for system variables and the actual `userConstants` values for constant tokens.

**Rationale**: System variable values aren't available in the popup (they come from the MakerWorld DOM), so sample values are necessary. But user constant values are known and using them gives the preview more realistic output.

## Risks / Trade-offs

- **Mismatched parentheses** → Evaluator throws a clear error; preview shows "Mismatched parentheses"; no crash
- **Formula row overflow** → Tokens wrap to a second line; drop zone allows vertical growth up to a max-height with scroll
- **Deleting a constant referenced in the formula** → The formula row still holds the orphaned `constant` token; the evaluator throws "Unknown constant: <id>"; the preview shows the error, prompting the user to remove the orphaned token
- **`@dnd-kit` in extension popup context** → Uses pointer events (not native DnD), compatible with extension popups

## Migration Plan

1. Add `@dnd-kit/core` and `@dnd-kit/sortable` dependencies
2. Create `utils/formulaEngine.ts` with token types, `FORMULA_VARIABLES`, `UserConstant`, shunting-yard evaluator
3. Add `formulaTokens` and `userConstants` to `PrintSettings` and `DEFAULT_SETTINGS`
4. Extend settings migration in `popup.tsx` for both new fields
5. Refactor `calculateCost()` to call the new evaluator
6. Build `FormulaBuilder` and `ConstantsManager` UI components
7. No rollback needed; evaluation errors fall back to an error message in the overlay

## Open Questions

- Should a constant's `value` be editable inline in the chip label, or only via the edit (pencil) action? Decision: pencil action only, to avoid accidental edits while dragging.

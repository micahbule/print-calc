## Context

The extension currently uses a single `pricePerGram` value in `PrintSettings` applied uniformly to all plates. Users printing with multiple filament types (PLA, PETG, ABS, TPU, etc.) cannot get accurate per-plate cost estimates because each material has a different purchase price. MakerWorld's Print Plates dialog identifies the material for each plate, so the data is already available—we just need to capture and use it.

## Goals / Non-Goals

**Goals:**
- Let users configure a per-material price table (material name → price per gram)
- Extract the material type per plate from the MakerWorld Print Plates dialog
- Use the matching material price (or a default fallback) when computing each plate's cost
- Store the material price map in `chrome.storage.local` alongside existing settings

**Non-Goals:**
- Predefined/curated material catalog (users type their own material names)
- Syncing material names with MakerWorld's internal taxonomy (string match only)
- Changing the formula/token evaluation system

## Decisions

### 1. Data model: map vs. array

**Decision**: Store material prices as a flat `Record<string, number>` keyed by material name (e.g., `{ "PLA": 0.02, "PETG": 0.03 }`) plus a separate `defaultPricePerGram: number` fallback.

**Rationale**: A map is the simplest structure for O(1) lookup by extracted material name. An array of `{ name, price }` objects would require a find() on every plate calculation and add serialization noise without benefit at this scale.

**Alternative considered**: A single array of objects — rejected for added complexity with no payoff.

### 2. Material name matching strategy

**Decision**: Case-insensitive exact string match between the extracted plate material and the keys of `materialPrices`. Fall back to `defaultPricePerGram` on no match.

**Rationale**: MakerWorld renders material names in a consistent format (e.g., "PLA", "PLA Basic", "PETG-CF"). Lowercase normalization prevents user frustration from accidental case mismatches in their settings. Fuzzy matching would risk incorrect price application, which is worse than falling back to default.

**Alternative considered**: Partial/fuzzy matching — rejected; incorrect price silently applied is worse than default fallback.

### 3. Settings schema migration

**Decision**: On settings load in `popup.tsx`, if `materialPrices` is absent, initialize it to `{}` and set `defaultPricePerGram` to the existing `pricePerGram` value (or `DEFAULT_SETTINGS.pricePerGram`). Keep `pricePerGram` in the schema as the `defaultPricePerGram` alias to avoid a separate migration step.

**Rationale**: Non-breaking migration keeps existing users' cost per gram intact as their default. No forced reset required.

### 4. UI approach for the price table

**Decision**: A simple add/remove row list in `popup.tsx` — a text input for material name and a number input for price per gram, plus an "Add" button and a delete button per row. No drag-to-reorder.

**Rationale**: The number of material types a user configures is small (typically 3–6). A table editor is overkill; a simple list is scannable and fast to implement.

## Risks / Trade-offs

- **Material name mismatch** → Mitigation: case-insensitive matching + visible fallback price in the overlay so users know which price was used
- **DOM changes on MakerWorld** → Mitigation: existing resilience pattern (MutationObserver + null-safe extraction); material field extraction added with the same guard pattern
- **Growing material list clutter in popup** → Mitigation: list is compact; no mitigation needed at small scale

## Migration Plan

1. Deploy updated extension — settings load migrates `pricePerGram` → `defaultPricePerGram` transparently
2. Users open popup to see the new material price table (empty by default, default price pre-filled)
3. No rollback concern — old `pricePerGram` field is preserved if extension is downgraded

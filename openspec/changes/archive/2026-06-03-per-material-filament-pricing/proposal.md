## Why

The current cost calculator uses a single price-per-gram value for all materials, but different filaments (PLA, PETG, ABS, TPU, etc.) have meaningfully different costs. Users printing with multiple materials need per-material pricing to get accurate cost estimates.

## What Changes

- Add a material price table in settings — a configurable list of filament types each with their own price per gram
- Add a default fallback price per gram used when the print's material doesn't match any entry in the table
- Extract the material/filament type from each plate in the MakerWorld Print Plates dialog
- Apply the matching per-material price when calculating per-plate costs in the overlay

## Capabilities

### New Capabilities
- `material-price-settings`: UI for managing a list of material types and their per-gram prices, including a default fallback price
- `material-aware-cost-calculation`: Cost calculation that looks up the per-gram price by the plate's identified material before computing the plate's cost

### Modified Capabilities
- `cost-calculation`: The per-gram price used in computation now varies per plate based on extracted material type rather than a single global setting value

## Impact

- `popup.tsx` — new settings section for the material price table (add/remove/edit rows)
- `utils/calculations.ts` — `calculateCost()` and `PrintSettings` updated to accept/use a material price map
- `contents/makerworld.ts` — `extractDialogData()` updated to capture material/filament type per plate; per-plate cost calculation uses the matched price
- `chrome.storage.local` — `printCalcSettings` schema extended with `materialPrices` map and `defaultPricePerGram`

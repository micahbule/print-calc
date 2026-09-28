## 1. Data Model & Settings Schema

- [x] 1.1 Add `materialPrices: Record<string, number>` and `defaultPricePerGram: number` to the `PrintSettings` type in `utils/calculations.ts`
- [x] 1.2 Add corresponding default values to `DEFAULT_SETTINGS` (empty map `{}` for `materialPrices`, existing `pricePerGram` value for `defaultPricePerGram`)
- [x] 1.3 Update `popup.tsx` settings migration to initialize `defaultPricePerGram` from stored `pricePerGram` when `defaultPricePerGram` is absent

## 2. Cost Calculation Update

- [x] 2.1 Update `calculateCost()` in `utils/calculations.ts` to accept an optional `material` string parameter alongside existing `PrintData`
- [x] 2.2 Implement case-insensitive material lookup: resolve `pricePerGram` variable from `materialPrices` on match, fall back to `defaultPricePerGram` otherwise

## 3. DOM Extraction Update

- [x] 3.1 Inspect MakerWorld Print Plates dialog DOM to identify the element containing the material/filament name per plate
- [x] 3.2 Update `extractDialogData()` in `contents/makerworld.ts` to extract the material name for each plate (return `null` when absent)
- [x] 3.3 Update the `PlateData` type to include `material: string | null`
- [x] 3.4 Pass each plate's `material` into `calculateCost()` when computing per-plate costs in the content script

## 4. Settings UI

- [x] 4.1 Add a "Default price per gram" number input to the popup settings, bound to `defaultPricePerGram`
- [x] 4.2 Add a material price table section with a list of existing entries (name + price per gram) each with a delete button
- [x] 4.3 Add an "Add material" row with a text input for material name and a number input for price, plus an "Add" button
- [x] 4.4 Implement duplicate-name validation (case-insensitive) and show an inline error when adding a duplicate
- [x] 4.5 Wire all material price table changes to persist to `chrome.storage.local`

## 5. Overlay Display

- [x] 5.1 Update the cost overlay in `contents/makerworld.ts` to display the effective price per gram used per plate (material name + price, or "default" label when no match)

## Why

Users who own multiple printers (e.g. a Bambu X1C and an Ender 3) have different energy draws per machine, but the extension currently stores a single global `energyKwhPerHour` value. This means every print job uses the same power figure regardless of which printer was used, producing inaccurate cost estimates for any printer that isn't the default.

## What Changes

- Add a named printer list in settings — each entry has a display name and an energy consumption value (kWh/hr)
- Add a "Select printer" control that lets the user pick which printer is active before calculating
- The active printer's energy value overrides the global `energyKwhPerHour` in the formula evaluation
- The global `energyKwhPerHour` field becomes the default/fallback when no printer is selected

## Capabilities

### New Capabilities
- `printer-profile-settings`: UI for managing a list of named printers each with their own kWh/hr value, plus a control to select the active printer

### Modified Capabilities
- `cost-calculation`: The `energy_kwh_per_hour` variable resolved during evaluation now comes from the selected printer profile's value (or the global default when none is selected)

## Impact

- `popup.tsx` — new printer profiles section (add/remove/edit rows + active printer selector)
- `utils/calculations.ts` — `PrintSettings` extended with `printerProfiles` array and `activePrinterId`; `calculateCost()` resolves effective kWh/hr from active printer before evaluation
- `contents/makerworld.ts` — no DOM changes needed; `getSettings()` already spreads all settings, new fields flow through automatically
- `chrome.storage.local` — `printCalcSettings` schema extended with `printerProfiles` and `activePrinterId`

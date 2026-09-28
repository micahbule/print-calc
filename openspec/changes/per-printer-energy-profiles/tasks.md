## 1. Data Model & Settings Schema

- [x] 1.1 Add `PrinterProfile` type (`{ id: string; name: string; energyKwhPerHour: number }`) and add `printerProfiles: PrinterProfile[]` and `activePrinterId: string | null` to `PrintSettings` in `utils/calculations.ts`
- [x] 1.2 Add default values to `DEFAULT_SETTINGS` (`printerProfiles: []`, `activePrinterId: null`)
- [x] 1.3 Update `popup.tsx` settings migration to initialize `printerProfiles` to `[]` and `activePrinterId` to `null` when absent

## 2. Energy Resolution Update

- [x] 2.1 Add `resolveEnergyKwhPerHour(settings: PrintSettings): number` helper in `utils/calculations.ts` — returns matching printer profile's value when `activePrinterId` matches, else `settings.energyKwhPerHour`
- [x] 2.2 Update `calculateCost()` to call `resolveEnergyKwhPerHour()` and override `energyKwhPerHour` in a settings copy before evaluation

## 3. Settings UI

- [x] 3.1 Create `components/PrinterProfilesEditor.tsx` — active printer dropdown (including "None / use default") wired to `activePrinterId`
- [x] 3.2 Add editable printer list: name input + kWh/hr input + delete button per row, with an "Add Printer" row at the bottom
- [x] 3.3 Handle delete-active-printer edge case: reset `activePrinterId` to `null` when the active profile is deleted
- [x] 3.4 Import and render `PrinterProfilesEditor` in `popup.tsx` with a `<hr>` divider, wiring `onChange` and `onActiveChange` to `savePartial`

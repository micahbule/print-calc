## Context

The extension stores a single `energyKwhPerHour` value in `PrintSettings`. Users with multiple printers need to switch this value manually each time they calculate for a different machine. The formula engine resolves the `energy_kwh_per_hour` variable from `settings.energyKwhPerHour`, so we need a way to override that with a printer-specific value without breaking the existing global fallback.

## Goals / Non-Goals

**Goals:**
- Let users define named printer profiles, each with a kWh/hr value
- Let users select the active printer from the popup
- Have the active printer's kWh/hr value override the global setting during cost evaluation
- Non-breaking migration: existing `energyKwhPerHour` becomes the global fallback

**Non-Goals:**
- Storing any other per-printer attributes (nozzle size, bed size, filament compatibility)
- Auto-detecting the active printer from MakerWorld metadata
- Syncing printer names with any external database

## Decisions

### 1. Data model: array of profiles + active ID

**Decision**: Store `printerProfiles: Array<{ id: string; name: string; energyKwhPerHour: number }>` and `activePrinterId: string | null` in `PrintSettings`.

**Rationale**: An array of objects with a stable generated ID is the standard pattern (matches `UserConstant` in the formula engine). The ID lets the active selection survive a name rename. `null` means "use global default" — explicit no-selection rather than requiring a printer to always be set.

**Alternative considered**: Using the printer name as the key (map) — rejected because renaming a printer would silently break the active selection.

### 2. Energy resolution at calculation time

**Decision**: Add a `resolveEnergyKwhPerHour(settings)` helper in `utils/calculations.ts` that returns the active printer's value when `activePrinterId` matches a profile, otherwise returns `settings.energyKwhPerHour`. `calculateCost()` uses it to override `energyKwhPerHour` in a settings copy before evaluation.

**Rationale**: Keeps the formula engine untouched. Same pattern as `resolveFilamentPrice()` introduced for material pricing.

**Alternative considered**: Passing printer ID as a parameter to `calculateCost()` — rejected; the active printer is a persisted user setting, not a per-call parameter.

### 3. UI: inline editable list + dropdown selector

**Decision**: A compact list (name + kWh/hr input + delete button) for managing profiles, with a `<select>` dropdown at the top to choose the active printer (including a "None / use default" option). Changes auto-save via `savePartial`.

**Rationale**: Same interaction pattern as the material prices editor. The dropdown is placed prominently because it's the control users will interact with most frequently.

### 4. ID generation

**Decision**: Reuse `generateConstantId()` from `formulaEngine.ts` (random 7-char alphanumeric) for new printer IDs.

**Rationale**: Already present, already sufficient uniqueness for this scale.

## Risks / Trade-offs

- **`activePrinterId` pointing to a deleted profile** → Mitigation: treat as "no active printer" (fallback to global), same null-like behavior; UI should filter the dropdown to only show existing profiles
- **Name collision** (two printers with same name) → Acceptable — names are display-only, IDs are the stable key; no deduplication needed
- **Global `energyKwhPerHour` field now secondary** → Kept in settings and still shown in UI as "Default energy use" to preserve backward compatibility and provide the fallback

## Migration Plan

1. On settings load: if `printerProfiles` absent, initialize to `[]`; if `activePrinterId` absent, initialize to `null`
2. Existing `energyKwhPerHour` remains as the global fallback — no data lost
3. No rollback concern: removing the extension resets to defaults

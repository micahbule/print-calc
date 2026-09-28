## ADDED Requirements

### Requirement: User can configure per-material filament prices
The system SHALL allow users to maintain a list of material types each with an associated price per gram. Each entry consists of a material name (string) and a price per gram (positive number). Users SHALL be able to add new entries, edit existing entries, and remove entries. Changes SHALL be persisted to `chrome.storage.local` under `printCalcSettings.materialPrices`.

#### Scenario: User adds a new material price entry
- **WHEN** the user enters a material name and a price per gram and clicks "Add"
- **THEN** a new entry appears in the material price list and is saved to storage

#### Scenario: User removes a material price entry
- **WHEN** the user clicks the delete button next to an existing material entry
- **THEN** that entry is removed from the list and removed from storage

#### Scenario: User edits the price of an existing material entry
- **WHEN** the user changes the price field of an existing entry
- **THEN** the updated price is saved to storage on change

#### Scenario: Duplicate material name is rejected
- **WHEN** the user attempts to add a material name that already exists in the list (case-insensitive)
- **THEN** the entry is not added and the user sees an inline error indicating the material already exists

### Requirement: User can set a default fallback price per gram
The system SHALL provide a single "Default price per gram" field in settings that is used when a plate's material does not match any entry in the material price table. This field SHALL be persisted as `printCalcSettings.defaultPricePerGram`.

#### Scenario: Default price is pre-populated from existing price per gram on first load
- **WHEN** the user opens the popup for the first time after the update and no `defaultPricePerGram` is stored
- **THEN** the default price field is populated with the previously stored `pricePerGram` value (or the global default)

#### Scenario: User updates the default price per gram
- **WHEN** the user changes the default price per gram field
- **THEN** the new value is saved to storage and subsequent calculations without a material match use this value

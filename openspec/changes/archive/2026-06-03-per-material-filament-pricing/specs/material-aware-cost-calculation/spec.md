## ADDED Requirements

### Requirement: Per-plate material type is extracted from the Print Plates dialog
The system SHALL extract the filament/material type for each plate from the MakerWorld Print Plates dialog. The extracted material name SHALL be included in the `PlateData` returned by `extractDialogData()`.

#### Scenario: Material type is extracted for each plate
- **WHEN** the user opens the Print Plates dialog on MakerWorld
- **THEN** each plate's data includes the material name as displayed in the dialog (e.g., "PLA", "PETG-CF")

#### Scenario: Material type is absent or unreadable
- **WHEN** the material field for a plate is missing or cannot be parsed from the DOM
- **THEN** that plate's material is set to `null` and the cost calculation uses the default price per gram

### Requirement: Per-plate cost uses the matching material price
The system SHALL look up the plate's extracted material name (case-insensitive) against the user's `materialPrices` map. If a match is found, that material's price per gram SHALL be used for the plate's filament cost calculation. If no match is found, the `defaultPricePerGram` SHALL be used.

#### Scenario: Plate material matches a configured price
- **WHEN** a plate's material name matches (case-insensitively) a key in `materialPrices`
- **THEN** the overlay displays the plate's cost using that material's price per gram

#### Scenario: Plate material does not match any configured price
- **WHEN** a plate's material name does not match any key in `materialPrices`, or the material is null
- **THEN** the overlay displays the plate's cost using `defaultPricePerGram`

### Requirement: Overlay indicates which price was applied per plate
The system SHALL display the effective price per gram used for each plate's calculation in the overlay, so users can verify that the correct material price was applied.

#### Scenario: Matched material price is shown in overlay
- **WHEN** the overlay renders a plate's cost breakdown
- **THEN** the filament cost line shows the material name and price per gram used (e.g., "Filament (PETG @ $0.03/g)")

#### Scenario: Default price fallback is indicated in overlay
- **WHEN** no material match is found and the default price is used
- **THEN** the filament cost line indicates the default price was applied (e.g., "Filament (default @ $0.02/g)")

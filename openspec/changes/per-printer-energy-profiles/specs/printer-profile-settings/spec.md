## ADDED Requirements

### Requirement: User can manage a list of named printer profiles
The system SHALL allow users to maintain a list of named printer profiles, each with a display name and an energy consumption value in kWh/hr. Users SHALL be able to add new profiles, edit an existing profile's name or energy value, and delete profiles. Changes SHALL be persisted to `chrome.storage.local` under `printCalcSettings.printerProfiles`.

#### Scenario: User adds a new printer profile
- **WHEN** the user enters a printer name and a kWh/hr value and clicks "Add Printer"
- **THEN** a new profile appears in the printer list and is saved to storage with a generated unique ID

#### Scenario: User edits a printer profile's energy value
- **WHEN** the user changes the kWh/hr field of an existing printer profile
- **THEN** the updated value is saved to storage on change

#### Scenario: User edits a printer profile's name
- **WHEN** the user changes the name field of an existing printer profile
- **THEN** the updated name is saved to storage on change

#### Scenario: User deletes a printer profile
- **WHEN** the user clicks the delete button next to a printer profile
- **THEN** the profile is removed from the list and from storage

#### Scenario: Deleting the active printer clears the selection
- **WHEN** the user deletes the printer profile that is currently selected as active
- **THEN** `activePrinterId` is reset to `null` and the selector reverts to "None / use default"

### Requirement: User can select the active printer
The system SHALL provide a dropdown selector that lists all configured printer profiles plus a "None / use default" option. The selected printer's ID SHALL be persisted as `printCalcSettings.activePrinterId`. When "None" is selected, `activePrinterId` SHALL be `null`.

#### Scenario: User selects a printer profile as active
- **WHEN** the user picks a printer from the dropdown
- **THEN** that printer's ID is saved as `activePrinterId` and subsequent calculations use its kWh/hr value

#### Scenario: User selects "None" to clear the active printer
- **WHEN** the user picks "None / use default" from the dropdown
- **THEN** `activePrinterId` is set to `null` and subsequent calculations use the global `energyKwhPerHour` value

#### Scenario: Active printer selection persists across sessions
- **WHEN** the user reopens the popup after previously selecting a printer
- **THEN** the dropdown shows the previously selected printer

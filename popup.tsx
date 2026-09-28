import { useEffect, useState } from "react"

import { ConstantsManager } from "./components/ConstantsManager"
import { FormulaBuilder } from "./components/FormulaBuilder"
import { MaterialPricesEditor } from "./components/MaterialPricesEditor"
import { PrinterProfilesEditor } from "./components/PrinterProfilesEditor"
import type { PrinterProfile } from "./utils/calculations"
import type { PrintSettings, UserConstant } from "./utils/calculations"
import { DEFAULT_SETTINGS } from "./utils/calculations"
import type { FormulaToken } from "./utils/formulaEngine"

import "./popup.css"

function SettingsPopup() {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    chrome.storage.local.get("printCalcSettings", (result) => {
      const stored = result.printCalcSettings
      if (!stored) { setSettingsLoaded(true); return }

      // Migrate old printerWattage (W) → energyKwhPerHour (kWh/hr)
      if (stored.printerWattage !== undefined && stored.energyKwhPerHour === undefined) {
        stored.energyKwhPerHour = stored.printerWattage / 1000
        delete stored.printerWattage
      }

      // Populate new fields from defaults if absent
      if (stored.failureRate === undefined) stored.failureRate = DEFAULT_SETTINGS.failureRate
      if (stored.formulaTokens === undefined) stored.formulaTokens = DEFAULT_SETTINGS.formulaTokens
      if (stored.userConstants === undefined) stored.userConstants = DEFAULT_SETTINGS.userConstants
      if (stored.materialPrices === undefined) stored.materialPrices = {}
      if (stored.defaultPricePerGram === undefined) {
        stored.defaultPricePerGram = stored.filamentCostPerGram ?? DEFAULT_SETTINGS.defaultPricePerGram
      }
      if (stored.printerProfiles === undefined) stored.printerProfiles = []
      if (stored.activePrinterId === undefined) stored.activePrinterId = null

      setSettings({ ...DEFAULT_SETTINGS, ...stored })
      setSettingsLoaded(true)
    })
  }, [])

  function handleChange(key: keyof PrintSettings, raw: string) {
    const value = key === "currencySymbol" ? raw : parseFloat(raw) || 0
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function save() {
    chrome.storage.local.set({ printCalcSettings: settings }, () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  function savePartial(patch: Partial<PrintSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      chrome.storage.local.set({ printCalcSettings: next })
      return next
    })
  }

  function handleConstantsChange(userConstants: UserConstant[]) {
    savePartial({ userConstants })
  }

  function handleFormulaChange(formulaTokens: FormulaToken[]) {
    savePartial({ formulaTokens })
  }

  function handleMaterialPricesChange(materialPrices: Record<string, number>) {
    savePartial({ materialPrices })
  }

  function handleDefaultPriceChange(defaultPricePerGram: number) {
    savePartial({ defaultPricePerGram })
  }

  function handlePrinterProfilesChange(printerProfiles: PrinterProfile[]) {
    savePartial({ printerProfiles })
  }

  function handleActivePrinterChange(activePrinterId: string | null) {
    savePartial({ activePrinterId })
  }

  return (
    <div className="popup-root">
      <header className="popup-header">
        <span className="popup-icon">🖨️</span>
        <h1>Print Cost Calculator</h1>
      </header>

      <p className="popup-subtitle">
        Set your costs — hover a profile on MakerWorld to see pricing.
      </p>

      <div className="field-group">
        <label>
          <span>Filament cost</span>
          <span className="unit">per gram</span>
        </label>
        <div className="input-row">
          <span className="prefix">{settings.currencySymbol}</span>
          <input
            type="number"
            min="0"
            step="0.001"
            value={settings.filamentCostPerGram}
            onChange={(e) => handleChange("filamentCostPerGram", e.target.value)}
          />
        </div>
        <p className="hint">e.g. 0.02 for basic PLA (~$20/kg)</p>
      </div>

      <div className="field-group">
        <label>
          <span>Electricity rate</span>
          <span className="unit">per kWh</span>
        </label>
        <div className="input-row">
          <span className="prefix">{settings.currencySymbol}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={settings.electricityCostPerKwh}
            onChange={(e) =>
              handleChange("electricityCostPerKwh", e.target.value)
            }
          />
        </div>
        <p className="hint">Average US rate is ~$0.12</p>
      </div>

      <div className="field-group">
        <label>
          <span>Energy use</span>
          <span className="unit">kWh per hour</span>
        </label>
        <div className="input-row">
          <span className="prefix">kWh</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={settings.energyKwhPerHour}
            onChange={(e) => handleChange("energyKwhPerHour", e.target.value)}
          />
        </div>
        <p className="hint">Measure with a smart plug; Bambu X1C ≈ 0.15–0.20</p>
      </div>

      <div className="field-group">
        <label>
          <span>Failure rate</span>
          <span className="unit">decimal (0.1 = 10%)</span>
        </label>
        <div className="input-row">
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={settings.failureRate}
            onChange={(e) => handleChange("failureRate", e.target.value)}
          />
        </div>
        <p className="hint">Use in formula as <code>failure_rate</code></p>
      </div>

      <div className="field-group">
        <label>
          <span>Currency symbol</span>
        </label>
        <div className="input-row">
          <input
            type="text"
            maxLength={3}
            value={settings.currencySymbol}
            onChange={(e) => handleChange("currencySymbol", e.target.value)}
            style={{ width: 60 }}
          />
        </div>
      </div>

      <button className={`save-btn ${saved ? "saved" : ""}`} onClick={save}>
        {saved ? "✓ Saved" : "Save Settings"}
      </button>

      <hr className="section-divider" />

      <MaterialPricesEditor
        prices={settings.materialPrices}
        defaultPricePerGram={settings.defaultPricePerGram}
        currencySymbol={settings.currencySymbol}
        onChange={handleMaterialPricesChange}
        onDefaultChange={handleDefaultPriceChange}
      />

      <hr className="section-divider" />

      <PrinterProfilesEditor
        profiles={settings.printerProfiles}
        activePrinterId={settings.activePrinterId}
        currencySymbol={settings.currencySymbol}
        onChange={handlePrinterProfilesChange}
        onActiveChange={handleActivePrinterChange}
      />

      <hr className="section-divider" />

      <ConstantsManager
        constants={settings.userConstants}
        onChange={handleConstantsChange}
      />

      <hr className="section-divider" />

      {settingsLoaded && (
        <FormulaBuilder
          key="formula-builder"
          tokens={settings.formulaTokens}
          userConstants={settings.userConstants}
          currencySymbol={settings.currencySymbol}
          onChange={handleFormulaChange}
        />
      )}
    </div>
  )
}

export default SettingsPopup

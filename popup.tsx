import { useEffect, useState } from "react"

import type { PrintSettings } from "./utils/calculations"
import { DEFAULT_SETTINGS } from "./utils/calculations"

import "./popup.css"

function SettingsPopup() {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    chrome.storage.local.get("printCalcSettings", (result) => {
      const saved = result.printCalcSettings
      if (!saved) return
      // Migrate old printerWattage (W) → energyKwhPerHour (kWh/hr)
      if (saved.printerWattage !== undefined && saved.energyKwhPerHour === undefined) {
        saved.energyKwhPerHour = saved.printerWattage / 1000
        delete saved.printerWattage
      }
      setSettings(saved)
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
    </div>
  )
}

export default SettingsPopup

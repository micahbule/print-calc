import { useState } from "react"

import type { PrinterProfile } from "../utils/calculations"
import { generateConstantId } from "../utils/formulaEngine"

interface Props {
  profiles: PrinterProfile[]
  activePrinterId: string | null
  currencySymbol: string
  onChange: (profiles: PrinterProfile[]) => void
  onActiveChange: (id: string | null) => void
}

export function PrinterProfilesEditor({
  profiles,
  activePrinterId,
  onChange,
  onActiveChange,
}: Props) {
  const [newName, setNewName] = useState("")
  const [newEnergy, setNewEnergy] = useState("")

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    const energy = parseFloat(newEnergy)
    if (isNaN(energy) || energy < 0) return
    const profile: PrinterProfile = { id: generateConstantId(), name, energyKwhPerHour: energy }
    onChange([...profiles, profile])
    setNewName("")
    setNewEnergy("")
  }

  function handleDelete(id: string) {
    onChange(profiles.filter((p) => p.id !== id))
    if (activePrinterId === id) onActiveChange(null)
  }

  function handleNameEdit(id: string, name: string) {
    onChange(profiles.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  function handleEnergyEdit(id: string, raw: string) {
    const energy = parseFloat(raw)
    if (isNaN(energy) || energy < 0) return
    onChange(profiles.map((p) => (p.id === id ? { ...p, energyKwhPerHour: energy } : p)))
  }

  return (
    <div className="constants-section">
      <h2 className="section-title">Printers</h2>
      <p className="hint" style={{ marginBottom: 8 }}>
        Add your printers with their energy draw. Select the active one before calculating.
      </p>

      <div className="field-group">
        <label><span>Active printer</span></label>
        <select
          value={activePrinterId ?? ""}
          onChange={(e) => onActiveChange(e.target.value || null)}
          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #c7d2fe", fontSize: 13 }}
        >
          <option value="">None / use default</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {profiles.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", fontWeight: 500, color: "#6b7280", paddingBottom: 4 }}>Name</th>
              <th style={{ textAlign: "right", fontWeight: 500, color: "#6b7280", paddingBottom: 4 }}>kWh/hr</th>
              <th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: "3px 0" }}>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => handleNameEdit(p.id, e.target.value)}
                    style={{ width: "100%" }}
                  />
                </td>
                <td style={{ padding: "3px 0 3px 6px", textAlign: "right" }}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={p.energyKwhPerHour}
                    onChange={(e) => handleEnergyEdit(p.id, e.target.value)}
                    style={{ width: 64, textAlign: "right" }}
                  />
                </td>
                <td style={{ padding: "3px 0 3px 6px" }}>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      fontSize: 14,
                      padding: 0,
                      lineHeight: 1,
                    }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Printer name (e.g. Bambu X1C)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
          style={{ flex: 1, minWidth: 0 }}
        />
        <div className="input-row" style={{ flex: "0 0 auto", margin: 0 }}>
          <span className="prefix">kWh</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={newEnergy}
            onChange={(e) => setNewEnergy(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
            style={{ width: 56 }}
          />
        </div>
        <button className="add-btn" onClick={handleAdd}>Add</button>
      </div>
    </div>
  )
}

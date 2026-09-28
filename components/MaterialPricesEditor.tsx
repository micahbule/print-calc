import { useState } from "react"

interface Props {
  prices: Record<string, number>
  defaultPricePerGram: number
  currencySymbol: string
  onChange: (prices: Record<string, number>) => void
  onDefaultChange: (price: number) => void
}

export function MaterialPricesEditor({
  prices,
  defaultPricePerGram,
  currencySymbol,
  onChange,
  onDefaultChange,
}: Props) {
  const [newName, setNewName] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    const name = newName.trim()
    if (!name) { setError("Enter a material name."); return }
    const isDuplicate = Object.keys(prices).some(
      (k) => k.toLowerCase() === name.toLowerCase()
    )
    if (isDuplicate) { setError(`"${name}" already exists.`); return }
    const price = parseFloat(newPrice)
    if (isNaN(price) || price < 0) { setError("Enter a valid price."); return }
    onChange({ ...prices, [name]: price })
    setNewName("")
    setNewPrice("")
    setError(null)
  }

  function handleRemove(name: string) {
    const next = { ...prices }
    delete next[name]
    onChange(next)
  }

  function handlePriceEdit(name: string, raw: string) {
    const price = parseFloat(raw)
    if (isNaN(price) || price < 0) return
    onChange({ ...prices, [name]: price })
  }

  return (
    <div className="constants-section">
      <h2 className="section-title">Material Prices</h2>
      <p className="hint" style={{ marginBottom: 8 }}>
        Set a price per gram for each filament type. Uses the default when no material matches.
      </p>

      <div className="field-group">
        <label>
          <span>Default price</span>
          <span className="unit">per gram</span>
        </label>
        <div className="input-row">
          <span className="prefix">{currencySymbol}</span>
          <input
            type="number"
            min="0"
            step="0.001"
            value={defaultPricePerGram}
            onChange={(e) => onDefaultChange(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {Object.keys(prices).length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", fontWeight: 500, color: "#6b7280", paddingBottom: 4 }}>Material</th>
              <th style={{ textAlign: "right", fontWeight: 500, color: "#6b7280", paddingBottom: 4 }}>{currencySymbol}/g</th>
              <th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {Object.entries(prices).map(([name, price]) => (
              <tr key={name}>
                <td style={{ padding: "3px 0", color: "#374151" }}>{name}</td>
                <td style={{ padding: "3px 0", textAlign: "right" }}>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={price}
                    onChange={(e) => handlePriceEdit(name, e.target.value)}
                    style={{ width: 72, textAlign: "right" }}
                  />
                </td>
                <td style={{ padding: "3px 0 3px 6px" }}>
                  <button
                    onClick={() => handleRemove(name)}
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
          placeholder="Material name (e.g. PLA)"
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
          style={{ flex: 1, minWidth: 0 }}
        />
        <div className="input-row" style={{ flex: "0 0 auto", margin: 0 }}>
          <span className="prefix">{currencySymbol}</span>
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder="0.000"
            value={newPrice}
            onChange={(e) => { setNewPrice(e.target.value); setError(null) }}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
            style={{ width: 64 }}
          />
        </div>
        <button className="add-btn" onClick={handleAdd}>Add</button>
      </div>

      {error && <p style={{ color: "#dc2626", fontSize: 12, margin: "4px 0 0" }}>{error}</p>}
    </div>
  )
}

import { useState } from "react"

import type { UserConstant } from "../utils/calculations"
import { generateConstantId } from "../utils/formulaEngine"

interface ConstantsManagerProps {
  constants: UserConstant[]
  onChange: (constants: UserConstant[]) => void
}

interface InlineForm {
  label: string
  value: string
  error: string
}

const EMPTY_FORM: InlineForm = { label: "", value: "", error: "" }

export function ConstantsManager({ constants, onChange }: ConstantsManagerProps) {
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<InlineForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<InlineForm>(EMPTY_FORM)

  function validateForm(form: InlineForm): string {
    if (!form.label.trim()) return "Name is required"
    const num = parseFloat(form.value)
    if (isNaN(num)) return "Value must be a valid number"
    return ""
  }

  // ─── Add ────────────────────────────────────────────────────────────────────

  function startAdding() {
    setAdding(true)
    setAddForm(EMPTY_FORM)
    setEditingId(null)
  }

  function cancelAdding() {
    setAdding(false)
    setAddForm(EMPTY_FORM)
  }

  function confirmAdd() {
    const err = validateForm(addForm)
    if (err) { setAddForm((f) => ({ ...f, error: err })); return }
    const newConstant: UserConstant = {
      id: generateConstantId(),
      label: addForm.label.trim(),
      value: parseFloat(addForm.value),
    }
    onChange([...constants, newConstant])
    setAdding(false)
    setAddForm(EMPTY_FORM)
  }

  // ─── Edit ───────────────────────────────────────────────────────────────────

  function startEditing(c: UserConstant) {
    setEditingId(c.id)
    setEditForm({ label: c.label, value: String(c.value), error: "" })
    setAdding(false)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditForm(EMPTY_FORM)
  }

  function confirmEdit(id: string) {
    const err = validateForm(editForm)
    if (err) { setEditForm((f) => ({ ...f, error: err })); return }
    onChange(
      constants.map((c) =>
        c.id === id
          ? { ...c, label: editForm.label.trim(), value: parseFloat(editForm.value) }
          : c
      )
    )
    setEditingId(null)
    setEditForm(EMPTY_FORM)
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  function deleteConstant(id: string) {
    if (editingId === id) { setEditingId(null); setEditForm(EMPTY_FORM) }
    onChange(constants.filter((c) => c.id !== id))
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="constants-manager">
      <div className="constants-manager__header">
        <span className="palette-label">My Constants</span>
        {!adding && (
          <button className="constants-add-btn" onClick={startAdding}>
            + Add
          </button>
        )}
      </div>

      {constants.length === 0 && !adding && (
        <p className="constants-empty">
          No constants yet. Add one to use in your formula.
        </p>
      )}

      <div className="constants-list">
        {constants.map((c) =>
          editingId === c.id ? (
            <div key={c.id} className="constant-form">
              <input
                className="constant-form__input"
                type="text"
                placeholder="Name"
                value={editForm.label}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, label: e.target.value, error: "" }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmEdit(c.id)
                  if (e.key === "Escape") cancelEditing()
                }}
                autoFocus
              />
              <input
                className="constant-form__input constant-form__input--value"
                type="number"
                placeholder="Value"
                value={editForm.value}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, value: e.target.value, error: "" }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmEdit(c.id)
                  if (e.key === "Escape") cancelEditing()
                }}
              />
              <button
                className="constant-form__btn constant-form__btn--ok"
                onClick={() => confirmEdit(c.id)}
              >
                ✓
              </button>
              <button
                className="constant-form__btn constant-form__btn--cancel"
                onClick={cancelEditing}
              >
                ✕
              </button>
              {editForm.error && (
                <span className="constant-form__error">{editForm.error}</span>
              )}
            </div>
          ) : (
            <div key={c.id} className="constant-chip">
              <span className="constant-chip__label">{c.label}</span>
              <span className="constant-chip__value">{c.value}</span>
              <button
                className="constant-chip__edit"
                onClick={() => startEditing(c)}
                title="Edit"
              >
                ✎
              </button>
              <button
                className="constant-chip__delete"
                onClick={() => deleteConstant(c.id)}
                title="Delete"
              >
                ×
              </button>
            </div>
          )
        )}
      </div>

      {adding && (
        <div className="constant-form constant-form--add">
          <input
            className="constant-form__input"
            type="text"
            placeholder="Name (e.g. Labor fee)"
            value={addForm.label}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, label: e.target.value, error: "" }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmAdd()
              if (e.key === "Escape") cancelAdding()
            }}
            autoFocus
          />
          <input
            className="constant-form__input constant-form__input--value"
            type="number"
            placeholder="Value"
            value={addForm.value}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, value: e.target.value, error: "" }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmAdd()
              if (e.key === "Escape") cancelAdding()
            }}
          />
          <button
            className="constant-form__btn constant-form__btn--ok"
            onClick={confirmAdd}
          >
            ✓
          </button>
          <button
            className="constant-form__btn constant-form__btn--cancel"
            onClick={cancelAdding}
          >
            ✕
          </button>
          {addForm.error && (
            <span className="constant-form__error">{addForm.error}</span>
          )}
        </div>
      )}
    </div>
  )
}

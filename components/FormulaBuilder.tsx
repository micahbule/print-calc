import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useEffect, useRef, useState } from "react"

import type { FormulaToken, UserConstant } from "../utils/calculations"
import {
  DEFAULT_FORMULA_TOKENS,
  FORMULA_VARIABLES,
  SAMPLE_VALUES,
  evaluateTokens,
  generateConstantId,
  tokenDisplayLabel,
} from "../utils/formulaEngine"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TokenEntry {
  token: FormulaToken
  uid: string
}

interface FormulaBuilderProps {
  tokens: FormulaToken[]
  userConstants: UserConstant[]
  currencySymbol: string
  onChange: (tokens: FormulaToken[]) => void
}

// ─── Sortable token chip (inside formula row) ─────────────────────────────────

function SortableTokenChip({
  entry,
  userConstants,
  onRemove,
}: {
  entry: TokenEntry
  userConstants: UserConstant[]
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.uid })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const isOrphaned =
    entry.token.type === "constant" &&
    !userConstants.find((c) => c.id === (entry.token as { type: "constant"; id: string }).id)

  const label = tokenDisplayLabel(entry.token, userConstants)
  const isPunct =
    entry.token.type === "operator" || entry.token.type === "paren" || entry.token.type === "number"

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`formula-token ${isPunct ? "formula-token--punct" : "formula-token--value"} ${isOrphaned ? "formula-token--orphaned" : ""}`}
      title={isOrphaned ? "This constant was deleted" : undefined}
    >
      <span className="formula-token__label">{isOrphaned ? "?" : label}</span>
      <button
        className="formula-token__remove"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        aria-label="Remove token"
      >
        ×
      </button>
    </div>
  )
}

// ─── Palette chip (draggable, from palette) ───────────────────────────────────

function PaletteChip({
  id,
  label,
  title,
}: {
  id: string
  label: string
  title?: string
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="palette-chip"
      style={{ opacity: isDragging ? 0.4 : 1 }}
      title={title}
    >
      {label}
    </div>
  )
}

// ─── Formula row drop zone ────────────────────────────────────────────────────

function FormulaDropZone({
  entries,
  userConstants,
  onRemove,
}: {
  entries: TokenEntry[]
  userConstants: UserConstant[]
  onRemove: (index: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "formula-row" })

  return (
    <div
      ref={setNodeRef}
      className={`formula-row ${isOver ? "formula-row--over" : ""} ${entries.length === 0 ? "formula-row--empty" : ""}`}
    >
      <SortableContext
        items={entries.map((e) => e.uid)}
        strategy={rectSortingStrategy}
      >
        {entries.length === 0 ? (
          <span className="formula-row__placeholder">
            Drag variables or click operators to build your formula
          </span>
        ) : (
          entries.map((entry, i) => (
            <SortableTokenChip
              key={entry.uid}
              entry={entry}
              userConstants={userConstants}
              onRemove={() => onRemove(i)}
            />
          ))
        )}
      </SortableContext>
    </div>
  )
}

// ─── FormulaBuilder ──────────────────────────────────────────────────────────

export function FormulaBuilder({
  tokens,
  userConstants,
  currencySymbol,
  onChange,
}: FormulaBuilderProps) {
  const [entries, setEntries] = useState<TokenEntry[]>(() =>
    tokens.map((t) => ({ token: t, uid: generateConstantId() }))
  )
  const [activeId, setActiveId] = useState<string | null>(null)

  // Sync from parent when tokens prop changes (e.g. initial settings load)
  const prevTokensRef = useRef(tokens)
  useEffect(() => {
    if (prevTokensRef.current !== tokens) {
      prevTokensRef.current = tokens
      setEntries(tokens.map((t) => ({ token: t, uid: generateConstantId() })))
    }
  }, [tokens])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function commitEntries(next: TokenEntry[]) {
    setEntries(next)
    onChange(next.map((e) => e.token))
  }

  function appendToken(token: FormulaToken) {
    const next = [...entries, { token, uid: generateConstantId() }]
    commitEntries(next)
  }

  function removeToken(index: number) {
    const next = entries.filter((_, i) => i !== index)
    commitEntries(next)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const activeIdStr = active.id as string
    const overIdStr = over.id as string
    const isFromPalette = activeIdStr.startsWith("palette:")

    if (isFromPalette) {
      const parts = activeIdStr.split(":")
      // palette:variable:<id> | palette:constant:<id>
      let newToken: FormulaToken
      if (parts[1] === "variable") {
        newToken = { type: "variable", id: parts[2] }
      } else {
        newToken = { type: "constant", id: parts[2] }
      }

      if (overIdStr === "formula-row") {
        appendToken(newToken)
      } else {
        const overIndex = entries.findIndex((e) => e.uid === overIdStr)
        if (overIndex !== -1) {
          const next = [...entries]
          next.splice(overIndex, 0, { token: newToken, uid: generateConstantId() })
          commitEntries(next)
        } else {
          appendToken(newToken)
        }
      }
    } else {
      // Reorder within formula row
      const activeIndex = entries.findIndex((e) => e.uid === activeIdStr)
      const overIndex = entries.findIndex((e) => e.uid === overIdStr)
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        commitEntries(arrayMove(entries, activeIndex, overIndex))
      }
    }
  }

  // Live preview
  const previewText = (() => {
    if (entries.length === 0) return null
    try {
      const sampleWithConstants: Record<string, number> = { ...SAMPLE_VALUES }
      const result = evaluateTokens(
        entries.map((e) => e.token),
        sampleWithConstants,
        userConstants
      )
      return `Preview: ${currencySymbol}${result.toFixed(2)}`
    } catch (err) {
      return err instanceof Error ? err.message : "Formula error"
    }
  })()

  const OPERATORS: Array<{ symbol: "+" | "-" | "*" | "/"; label: string }> = [
    { symbol: "+", label: "+" },
    { symbol: "-", label: "−" },
    { symbol: "*", label: "×" },
    { symbol: "/", label: "÷" },
  ]

  const activeDragToken: FormulaToken | null = (() => {
    if (!activeId) return null
    if (activeId.startsWith("palette:variable:")) {
      return { type: "variable", id: activeId.split(":")[2] }
    }
    if (activeId.startsWith("palette:constant:")) {
      return { type: "constant", id: activeId.split(":")[2] }
    }
    const entry = entries.find((e) => e.uid === activeId)
    return entry?.token ?? null
  })()

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="formula-builder">
        {/* Variables palette */}
        <div className="palette-section">
          <span className="palette-label">Variables</span>
          <div className="palette-chips">
            {FORMULA_VARIABLES.map((v) => (
              <PaletteChip
                key={v.id}
                id={`palette:variable:${v.id}`}
                label={v.label}
                title={v.description}
              />
            ))}
          </div>
        </div>

        {/* Operators + parens */}
        <div className="palette-section">
          <span className="palette-label">Operators</span>
          <div className="palette-chips palette-chips--ops">
            {OPERATORS.map((op) => (
              <button
                key={op.symbol}
                className="op-btn"
                onClick={() =>
                  appendToken({ type: "operator", symbol: op.symbol })
                }
              >
                {op.label}
              </button>
            ))}
            <button
              className="op-btn op-btn--paren"
              onClick={() => appendToken({ type: "paren", symbol: "(" })}
            >
              (
            </button>
            <button
              className="op-btn op-btn--paren"
              onClick={() => appendToken({ type: "paren", symbol: ")" })}
            >
              )
            </button>
          </div>
        </div>

        {/* Constants palette (if any) */}
        {userConstants.length > 0 && (
          <div className="palette-section">
            <span className="palette-label">My Constants</span>
            <div className="palette-chips">
              {userConstants.map((c) => (
                <PaletteChip
                  key={c.id}
                  id={`palette:constant:${c.id}`}
                  label={`${c.label}`}
                  title={`Value: ${c.value}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Formula row */}
        <div className="palette-section">
          <span className="palette-label">Formula</span>
          <FormulaDropZone
            entries={entries}
            userConstants={userConstants}
            onRemove={removeToken}
          />
        </div>

        {/* Preview + reset */}
        <div className="formula-footer">
          <span
            className={`formula-preview ${
              previewText === null
                ? "formula-preview--empty"
                : previewText.startsWith("Preview:")
                  ? "formula-preview--ok"
                  : "formula-preview--error"
            }`}
          >
            {previewText === null
              ? "Add tokens to build your formula"
              : previewText}
          </span>
          <button
            className="formula-reset"
            onClick={() => {
              const next = DEFAULT_FORMULA_TOKENS.map((t) => ({
                token: t,
                uid: generateConstantId(),
              }))
              commitEntries(next)
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <DragOverlay>
        {activeDragToken && (
          <div className="formula-token formula-token--drag-overlay">
            <span className="formula-token__label">
              {tokenDisplayLabel(activeDragToken, userConstants)}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

import type { PlasmoCSConfig } from "plasmo"

import type { CostBreakdown, PrintSettings } from "../utils/calculations"
import { DEFAULT_SETTINGS, calculateCost, fmt } from "../utils/calculations"

export const config: PlasmoCSConfig = {
  matches: ["https://makerworld.com/*", "https://www.makerworld.com/*"]
}

const POPOVER_ID = "mouse-over-popover"
const DIALOG_SELECTOR = ".MuiDialog-root.MuiModal-root[role='presentation']"
const CALC_BTN_CLASS = "mw-calc-btn"
const OVERLAY_ID = "mw-calc-overlay"

// ─── Settings ─────────────────────────────────────────────────────────────────

async function getSettings(): Promise<PrintSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get("printCalcSettings", (result) => {
      resolve(result.printCalcSettings ?? DEFAULT_SETTINGS)
    })
  })
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

/**
 * Match exact span text for a weight value: "13 g", "25 g", "4.5 g"
 */
function spanToGrams(text: string): number | null {
  const m = text.match(/^(\d+\.?\d*)\s*g$/)
  return m ? parseFloat(m[1]) : null
}

/**
 * Match exact span text for a time value.
 * Handles:  "27 min" | "1h 23m" | "1.1 h" | "2 h"
 */
function spanToMinutes(text: string): number | null {
  // "27 min"
  const min = text.match(/^(\d+)\s*min$/)
  if (min) return parseInt(min[1])
  // "1h 23m" or "1h"
  const hm = text.match(/^(\d+)\s*h(?:\s*(\d+)\s*m)?$/)
  if (hm) return parseInt(hm[1]) * 60 + (hm[2] ? parseInt(hm[2]) : 0)
  // "1.1 h"
  const dh = text.match(/^(\d+\.?\d*)\s*h$/)
  if (dh) return Math.round(parseFloat(dh[1]) * 60)
  return null
}

// ─── Popover data extraction ───────────────────────────────────────────────────

/**
 * Reads the stable `.profile_detail` container in the hover popover.
 * Time format there is "1.1 h" (decimal hours); weight is "25 g" total.
 */
function extractPopoverData(
  popover: Element
): { grams: number | null; minutes: number | null } {
  const container = popover.querySelector(".profile_detail") ?? popover
  let grams: number | null = null
  let minutes: number | null = null

  container.querySelectorAll("span").forEach((span) => {
    if (grams !== null && minutes !== null) return
    const text = (span.textContent ?? "").trim()
    if (minutes === null) {
      const m = spanToMinutes(text)
      if (m !== null) { minutes = m; return }
    }
    if (grams === null) {
      const g = spanToGrams(text)
      if (g !== null) grams = g
    }
  })

  return { grams, minutes }
}

// ─── Dialog data extraction ───────────────────────────────────────────────────

interface PlateData {
  label: string
  grams: number
  minutes: number
}

/**
 * Reads each plate's `.config_info` block inside the "Print Plates" dialog.
 * Time format there is "X min" (integer minutes); weight is "X g" per plate.
 */
function extractDialogData(dialog: Element): PlateData[] {
  const plates: PlateData[] = []
  const plateIndexEls = Array.from(dialog.querySelectorAll(".plate_index"))

  dialog.querySelectorAll(".config_info").forEach((configInfo, i) => {
    let grams: number | null = null
    let minutes: number | null = null

    configInfo.querySelectorAll("span").forEach((span) => {
      if (grams !== null && minutes !== null) return
      const text = (span.textContent ?? "").trim()
      if (minutes === null) {
        const m = spanToMinutes(text)
        if (m !== null) { minutes = m; return }
      }
      if (grams === null) {
        const g = spanToGrams(text)
        if (g !== null) grams = g
      }
    })

    if (grams !== null && minutes !== null) {
      const idx = plateIndexEls[i]?.textContent?.trim() ?? String(i + 1)
      plates.push({ label: `Plate ${idx}`, grams, minutes })
    }
  })

  return plates
}

// ─── Cost overlay ─────────────────────────────────────────────────────────────

function removeOverlay() {
  document.getElementById(OVERLAY_ID)?.remove()
}

function showCostOverlay(
  anchorEl: Element,
  breakdown: CostBreakdown,
  plates?: PlateData[]
) {
  removeOverlay()

  const { currencySymbol: s, filamentCost, electricityCost, totalCost,
          filamentGrams, printTimeHours } = breakdown

  // Per-plate rows (only shown when coming from the dialog)
  const plateRows = plates
    ? plates
        .map((p) => {
          const pb = calculateCost(
            { filamentGrams: p.grams, printTimeMinutes: p.minutes },
            { filamentCostPerGram: breakdown.filamentCost / filamentGrams,
              electricityCostPerKwh: 0, printerWattage: 0,
              currencySymbol: s }
          )
          // recalculate properly using stored settings — passed via closure below
          return `<tr>
            <td style="color:#6b7280;padding:2px 0;">${p.label}</td>
            <td style="color:#6b7280;text-align:center;padding:2px 8px;">${p.grams}g</td>
            <td style="color:#6b7280;text-align:center;padding:2px 8px;">${p.minutes}m</td>
          </tr>`
        })
        .join("")
    : ""

  const plateTable = plates
    ? `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px;">
        <thead>
          <tr style="border-bottom:1px solid #e0e7ff;">
            <th style="text-align:left;padding:2px 0;color:#9ca3af;font-weight:500;">Plate</th>
            <th style="text-align:center;padding:2px 8px;color:#9ca3af;font-weight:500;">Filament</th>
            <th style="text-align:center;padding:2px 8px;color:#9ca3af;font-weight:500;">Time</th>
          </tr>
        </thead>
        <tbody>${plateRows}</tbody>
      </table>`
    : ""

  const overlay = document.createElement("div")
  overlay.id = OVERLAY_ID
  overlay.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;
      font-family:system-ui,sans-serif;font-size:13px;line-height:1.4;color:#1e1b4b;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
        <strong style="font-size:14px;">🖨️ Print Cost</strong>
        <button id="mw-calc-close" style="background:none;border:none;cursor:pointer;
          font-size:16px;color:#6b7280;padding:0;line-height:1;">✕</button>
      </div>
      ${plateTable}
      <hr style="margin:0;border:none;border-top:1px solid #e0e7ff;">
      <div style="display:grid;grid-template-columns:1fr auto;gap:4px 12px;">
        <span style="color:#6b7280;">Filament (${filamentGrams.toFixed(1)}g)</span>
        <span style="text-align:right;">${fmt(filamentCost, s)}</span>
        <span style="color:#6b7280;">Electricity (${printTimeHours.toFixed(2)}h)</span>
        <span style="text-align:right;">${fmt(electricityCost, s)}</span>
      </div>
      <hr style="margin:0;border:none;border-top:1px solid #e0e7ff;">
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:14px;">
        <span>Total</span>
        <span style="color:#4f46e5;">${fmt(totalCost, s)}</span>
      </div>
    </div>
  `
  overlay.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    background: white;
    border: 1px solid #c7d2fe;
    border-radius: 10px;
    padding: 12px 14px;
    box-shadow: 0 8px 24px rgba(79,70,229,0.18);
    width: 248px;
    box-sizing: border-box;
  `
  document.body.appendChild(overlay)

  const rect = anchorEl.getBoundingClientRect()
  const gap = 8
  let top = Math.round(rect.top)
  let left = Math.round(rect.right + gap)

  if (left + 248 > window.innerWidth) left = Math.round(rect.left - 248 - gap)
  if (top + overlay.offsetHeight > window.innerHeight) {
    top = Math.max(8, window.innerHeight - overlay.offsetHeight - 8)
  }

  overlay.style.top = `${top}px`
  overlay.style.left = `${left}px`

  document.getElementById("mw-calc-close")?.addEventListener("click", removeOverlay)
  setTimeout(() => {
    document.addEventListener(
      "click",
      (e) => { if (!overlay.contains(e.target as Node)) removeOverlay() },
      { once: true, capture: true }
    )
  }, 0)
}

// ─── Popover button injection ─────────────────────────────────────────────────

function injectIntoPopover(popover: Element) {
  if (popover.querySelector(`.${CALC_BTN_CLASS}`)) return

  const { grams, minutes } = extractPopoverData(popover)
  if (!grams || !minutes) return

  const btn = document.createElement("button")
  btn.className = CALC_BTN_CLASS
  btn.textContent = "Calculate Cost"
  btn.style.cssText = `
    display: block;
    width: calc(100% - 28px);
    margin: 10px 14px 10px;
    padding: 7px 12px;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: system-ui, sans-serif;
    box-shadow: 0 2px 6px rgba(79,70,229,0.3);
    transition: background 0.15s;
    text-align: center;
  `
  btn.addEventListener("mouseenter", () => { btn.style.background = "#4338ca" })
  btn.addEventListener("mouseleave", () => { btn.style.background = "#4f46e5" })
  btn.addEventListener("click", async (e) => {
    e.stopPropagation()
    e.preventDefault()
    const settings = await getSettings()
    showCostOverlay(
      btn,
      calculateCost({ filamentGrams: grams, printTimeMinutes: minutes }, settings)
    )
  })

  const innerBox = popover.querySelector(".MuiBox-root .MuiBox-root") ?? popover
  innerBox.appendChild(btn)
}

// ─── Dialog button injection ──────────────────────────────────────────────────

function injectIntoDialog(dialog: Element) {
  console.log("[print-calc] dialog HTML:", dialog.outerHTML)

  if (dialog.querySelector(`.${CALC_BTN_CLASS}`)) return

  const plates = extractDialogData(dialog)
  if (!plates.length) return

  const totalGrams = plates.reduce((sum, p) => sum + p.grams, 0)
  const totalMinutes = plates.reduce((sum, p) => sum + p.minutes, 0)

  const btn = document.createElement("button")
  btn.className = CALC_BTN_CLASS
  btn.textContent = `Calculate Total Cost — ${plates.length} plate${plates.length > 1 ? "s" : ""}`
  btn.style.cssText = `
    display: block;
    width: calc(100% - 48px);
    margin: 12px 24px 16px;
    padding: 10px 16px;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: system-ui, sans-serif;
    box-shadow: 0 2px 8px rgba(79,70,229,0.3);
    transition: background 0.15s;
    text-align: center;
  `
  btn.addEventListener("mouseenter", () => { btn.style.background = "#4338ca" })
  btn.addEventListener("mouseleave", () => { btn.style.background = "#4f46e5" })
  btn.addEventListener("click", async (e) => {
    e.stopPropagation()
    e.preventDefault()
    const settings = await getSettings()
    showCostOverlay(
      btn,
      calculateCost({ filamentGrams: totalGrams, printTimeMinutes: totalMinutes }, settings),
      plates
    )
  })

  const dialogContent = dialog.querySelector(".MuiDialogContent-root")
  if (dialogContent) {
    dialogContent.appendChild(btn)
  }
}

// ─── DOM watchers ─────────────────────────────────────────────────────────────

let popoverObserver: MutationObserver | null = null

function watchPopoverContent(popover: Element) {
  popoverObserver?.disconnect()
  popoverObserver = new MutationObserver(() => injectIntoPopover(popover))
  popoverObserver.observe(popover, { childList: true, subtree: true })
}

let dialogObserver: MutationObserver | null = null

function watchDialogContent(dialog: Element) {
  dialogObserver?.disconnect()
  dialogObserver = new MutationObserver(() => injectIntoDialog(dialog))
  dialogObserver.observe(dialog, { childList: true, subtree: true })
}

const bodyObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue

      // Popover
      const popover =
        node.id === POPOVER_ID ? node : node.querySelector?.(`#${POPOVER_ID}`)
      if (popover) {
        console.log("[print-calc] popover HTML:", popover.outerHTML)
        injectIntoPopover(popover)
        watchPopoverContent(popover)
      }

      // Dialog
      const dialog = node.matches(DIALOG_SELECTOR)
        ? node
        : node.querySelector?.(DIALOG_SELECTOR)
      if (dialog) {
        injectIntoDialog(dialog)
        watchDialogContent(dialog)
      }
    }

    for (const node of mutation.removedNodes) {
      if (!(node instanceof Element)) continue

      if (node.id === POPOVER_ID || !!node.querySelector?.(`#${POPOVER_ID}`)) {
        popoverObserver?.disconnect()
        popoverObserver = null
        removeOverlay()
      }

      if (node.matches?.(DIALOG_SELECTOR) || !!node.querySelector?.(DIALOG_SELECTOR)) {
        dialogObserver?.disconnect()
        dialogObserver = null
        removeOverlay()
      }
    }
  }
})

bodyObserver.observe(document.body, { childList: true })

// Handle elements already in the DOM on load
const existingPopover = document.getElementById(POPOVER_ID)
if (existingPopover) {
  injectIntoPopover(existingPopover)
  watchPopoverContent(existingPopover)
}

const existingDialog = document.querySelector(DIALOG_SELECTOR)
if (existingDialog) {
  injectIntoDialog(existingDialog)
  watchDialogContent(existingDialog)
}

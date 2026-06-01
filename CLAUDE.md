# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server with hot reload (loads unpacked extension from build/chrome-mv3-dev/)
pnpm build        # Production build to build/chrome-mv3-prod/
pnpm package      # Bundle as a .zip for Chrome Web Store submission
```

No test runner or linter is configured — Prettier handles formatting (`.prettierrc.cjs`).

To load the extension in Chrome during development: go to `chrome://extensions`, enable Developer Mode, click "Load unpacked", and select the `build/chrome-mv3-dev/` directory.

## Architecture

This is a **Plasmo** Chrome MV3 extension. Plasmo handles the build pipeline (esbuild + React) and generates the manifest from `package.json#manifest`.

**Entry points:**
- `popup.tsx` — Settings UI rendered in the extension popup. Reads/writes settings via `chrome.storage.local` under the key `"printCalcSettings"`.
- `contents/makerworld.ts` — Content script injected on `makerworld.com`. Watches the DOM for MUI popovers and dialogs, extracts print data, and injects a "Calculate Cost" button.

**Shared logic:**
- `utils/calculations.ts` — All cost math lives here. Exports `PrintSettings`, `PrintData`, `CostBreakdown` types, `DEFAULT_SETTINGS`, `calculateCost()`, and `fmt()`.

**Data flow:**
1. User sets costs in the popup → saved to `chrome.storage.local`
2. Content script reads settings on demand (each button click) via `getSettings()`
3. Extracted DOM data (grams + minutes) + settings → `calculateCost()` → rendered in a fixed-position overlay div injected into `document.body`

**DOM interaction pattern in `contents/makerworld.ts`:**
- A top-level `MutationObserver` on `document.body` watches for MUI popovers (`#mouse-over-popover`) and MUI dialogs (`.MuiDialog-root.MuiModal-root[role='presentation']`)
- Each detected element gets its own nested observer to handle lazy-loaded content
- `extractPopoverData()` parses decimal-hour time formats (`"1.1 h"`) from hover popovers
- `extractDialogData()` parses integer-minute formats (`"27 min"`) from the Print Plates dialog and returns per-plate breakdown

**Settings migration:** `popup.tsx` handles a one-time migration from the old `printerWattage` (watts) field to `energyKwhPerHour` (kWh/hr) on load.

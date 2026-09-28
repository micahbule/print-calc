import {
  DEFAULT_FORMULA_TOKENS,
  buildVariableValues,
  evaluateTokens,
} from "./formulaEngine"
import type { FormulaToken, UserConstant } from "./formulaEngine"

export type { FormulaToken, UserConstant }

export interface PrinterProfile {
  id: string
  name: string
  energyKwhPerHour: number
}

export interface PrintSettings {
  filamentCostPerGram: number
  electricityCostPerKwh: number
  energyKwhPerHour: number
  failureRate: number
  currencySymbol: string
  formulaTokens: FormulaToken[]
  userConstants: UserConstant[]
  materialPrices: Record<string, number>
  defaultPricePerGram: number
  printerProfiles: PrinterProfile[]
  activePrinterId: string | null
}

export interface PrintData {
  filamentGrams: number
  printTimeMinutes: number
}

export const DEFAULT_SETTINGS: PrintSettings = {
  filamentCostPerGram: 0.02,
  electricityCostPerKwh: 0.12,
  energyKwhPerHour: 0.2,
  failureRate: 0,
  currencySymbol: "$",
  formulaTokens: DEFAULT_FORMULA_TOKENS,
  userConstants: [],
  materialPrices: {},
  defaultPricePerGram: 0.02,
  printerProfiles: [],
  activePrinterId: null,
}

export function resolveEnergyKwhPerHour(settings: PrintSettings): number {
  if (!settings.activePrinterId) return settings.energyKwhPerHour
  const profile = settings.printerProfiles.find((p) => p.id === settings.activePrinterId)
  return profile ? profile.energyKwhPerHour : settings.energyKwhPerHour
}

export function resolveFilamentPrice(
  material: string | null | undefined,
  settings: PrintSettings
): number {
  if (!material) return settings.defaultPricePerGram
  const key = Object.keys(settings.materialPrices).find(
    (k) => k.toLowerCase() === material.toLowerCase()
  )
  return key !== undefined ? settings.materialPrices[key] : settings.defaultPricePerGram
}

export function calculateCost(
  data: PrintData,
  settings: PrintSettings,
  material?: string | null
): number {
  const effectivePrice = resolveFilamentPrice(material, settings)
  const effectiveEnergy = resolveEnergyKwhPerHour(settings)
  const needsOverride =
    effectivePrice !== settings.filamentCostPerGram ||
    effectiveEnergy !== settings.energyKwhPerHour
  const effectiveSettings = needsOverride
    ? { ...settings, filamentCostPerGram: effectivePrice, energyKwhPerHour: effectiveEnergy }
    : settings
  return evaluateTokens(
    effectiveSettings.formulaTokens,
    buildVariableValues(data, effectiveSettings),
    effectiveSettings.userConstants
  )
}

export function fmt(value: number, symbol: string): string {
  return `${symbol}${value.toFixed(2)}`
}

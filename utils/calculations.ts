import {
  DEFAULT_FORMULA_TOKENS,
  buildVariableValues,
  evaluateTokens,
} from "./formulaEngine"
import type { FormulaToken, UserConstant } from "./formulaEngine"

export type { FormulaToken, UserConstant }

export interface PrintSettings {
  filamentCostPerGram: number
  electricityCostPerKwh: number
  energyKwhPerHour: number
  failureRate: number
  currencySymbol: string
  formulaTokens: FormulaToken[]
  userConstants: UserConstant[]
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
}

export function calculateCost(data: PrintData, settings: PrintSettings): number {
  return evaluateTokens(
    settings.formulaTokens,
    buildVariableValues(data, settings),
    settings.userConstants
  )
}

export function fmt(value: number, symbol: string): string {
  return `${symbol}${value.toFixed(2)}`
}

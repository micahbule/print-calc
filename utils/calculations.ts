export interface PrintSettings {
  filamentCostPerGram: number
  electricityCostPerKwh: number
  energyKwhPerHour: number
  currencySymbol: string
}

export interface PrintData {
  filamentGrams: number
  printTimeMinutes: number
}

export interface CostBreakdown {
  filamentCost: number
  electricityCost: number
  totalCost: number
  currencySymbol: string
  filamentGrams: number
  printTimeHours: number
}

export const DEFAULT_SETTINGS: PrintSettings = {
  filamentCostPerGram: 0.02,
  electricityCostPerKwh: 0.12,
  energyKwhPerHour: 0.2,
  currencySymbol: "$"
}

export function calculateCost(
  data: PrintData,
  settings: PrintSettings
): CostBreakdown {
  const filamentCost = data.filamentGrams * settings.filamentCostPerGram
  const printTimeHours = data.printTimeMinutes / 60
  const electricityCost =
    settings.energyKwhPerHour * printTimeHours * settings.electricityCostPerKwh

  return {
    filamentCost,
    electricityCost,
    totalCost: filamentCost + electricityCost,
    currencySymbol: settings.currencySymbol,
    filamentGrams: data.filamentGrams,
    printTimeHours
  }
}

export function fmt(value: number, symbol: string): string {
  return `${symbol}${value.toFixed(2)}`
}

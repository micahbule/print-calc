import type { PrintData, PrintSettings } from "./calculations"

// ─── Token types ──────────────────────────────────────────────────────────────

export type FormulaToken =
  | { type: "variable"; id: string }
  | { type: "constant"; id: string }
  | { type: "number"; value: number }
  | { type: "operator"; symbol: "+" | "-" | "*" | "/" }
  | { type: "paren"; symbol: "(" | ")" }

export type UserConstant = {
  id: string
  label: string
  value: number
}

// ─── Variable registry ────────────────────────────────────────────────────────

export interface FormulaVariable {
  id: string
  label: string
  description: string
  extract: (printData: PrintData, settings: PrintSettings) => number
}

export const FORMULA_VARIABLES: FormulaVariable[] = [
  {
    id: "filament_g",
    label: "Filament (g)",
    description: "Weight of filament used in grams",
    extract: (d) => d.filamentGrams,
  },
  {
    id: "print_time_min",
    label: "Print time (min)",
    description: "Total print time in minutes",
    extract: (d) => d.printTimeMinutes,
  },
  {
    id: "filament_cost_per_g",
    label: "Filament cost/g",
    description: "Your cost per gram of filament",
    extract: (_, s) => s.filamentCostPerGram,
  },
  {
    id: "energy_kwh_per_hour",
    label: "Energy (kWh/hr)",
    description: "Printer energy draw in kWh per hour",
    extract: (_, s) => s.energyKwhPerHour,
  },
  {
    id: "energy_cost_per_kwh",
    label: "Electricity cost/kWh",
    description: "Your electricity rate per kWh",
    extract: (_, s) => s.electricityCostPerKwh,
  },
  {
    id: "failure_rate",
    label: "Failure rate",
    description: "Expected failure rate as a decimal (e.g. 0.1 = 10%)",
    extract: (_, s) => s.failureRate,
  },
]

export const SAMPLE_VALUES: Record<string, number> = {
  filament_g: 50,
  print_time_min: 90,
  filament_cost_per_g: 0.02,
  energy_kwh_per_hour: 0.2,
  energy_cost_per_kwh: 0.12,
  failure_rate: 0,
}

export function generateConstantId(): string {
  return Math.random().toString(36).slice(2, 9)
}

// ─── Default formula ──────────────────────────────────────────────────────────
// Encodes: (filament_g * filament_cost_per_g) + ((print_time_min / 60) * energy_kwh_per_hour * energy_cost_per_kwh)
// This exactly replicates the previous hardcoded calculateCost() behavior.

export const DEFAULT_FORMULA_TOKENS: FormulaToken[] = [
  { type: "paren", symbol: "(" },
  { type: "variable", id: "filament_g" },
  { type: "operator", symbol: "*" },
  { type: "variable", id: "filament_cost_per_g" },
  { type: "paren", symbol: ")" },
  { type: "operator", symbol: "+" },
  { type: "paren", symbol: "(" },
  { type: "paren", symbol: "(" },
  { type: "variable", id: "print_time_min" },
  { type: "operator", symbol: "/" },
  { type: "number", value: 60 },
  { type: "paren", symbol: ")" },
  { type: "operator", symbol: "*" },
  { type: "variable", id: "energy_kwh_per_hour" },
  { type: "operator", symbol: "*" },
  { type: "variable", id: "energy_cost_per_kwh" },
  { type: "paren", symbol: ")" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildVariableValues(
  printData: PrintData,
  settings: PrintSettings
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const v of FORMULA_VARIABLES) {
    result[v.id] = v.extract(printData, settings)
  }
  return result
}

export function tokenDisplayLabel(
  token: FormulaToken,
  constants: UserConstant[]
): string {
  switch (token.type) {
    case "variable":
      return FORMULA_VARIABLES.find((v) => v.id === token.id)?.label ?? token.id
    case "constant": {
      const c = constants.find((c) => c.id === token.id)
      return c ? `${c.label}` : "?"
    }
    case "number":
      return String(token.value)
    case "operator": {
      const map: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" }
      return map[token.symbol] ?? token.symbol
    }
    case "paren":
      return token.symbol
  }
}

// ─── Evaluator (shunting-yard) ────────────────────────────────────────────────

const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 }

export function evaluateTokens(
  tokens: FormulaToken[],
  variableValues: Record<string, number>,
  constants: UserConstant[]
): number {
  if (tokens.length === 0) throw new Error("Formula is empty")

  const constMap = new Map(constants.map((c) => [c.id, c.value]))
  const output: number[] = []
  const ops: string[] = []

  function applyOp() {
    const op = ops.pop()!
    const b = output.pop()
    const a = output.pop()
    if (a === undefined || b === undefined) throw new Error("Formula is invalid")
    if (op === "+") output.push(a + b)
    else if (op === "-") output.push(a - b)
    else if (op === "*") output.push(a * b)
    else if (op === "/") output.push(a / b)
  }

  let expectOperand = true

  for (const token of tokens) {
    if (token.type === "variable") {
      if (!expectOperand) throw new Error("Unexpected value — missing operator")
      const val = variableValues[token.id]
      if (val === undefined) throw new Error(`Unknown variable: ${token.id}`)
      output.push(val)
      expectOperand = false
    } else if (token.type === "constant") {
      if (!expectOperand) throw new Error("Unexpected value — missing operator")
      if (!constMap.has(token.id)) throw new Error(`Unknown constant: ${token.id}`)
      output.push(constMap.get(token.id)!)
      expectOperand = false
    } else if (token.type === "number") {
      if (!expectOperand) throw new Error("Unexpected value — missing operator")
      output.push(token.value)
      expectOperand = false
    } else if (token.type === "operator") {
      if (expectOperand) throw new Error("Unexpected operator — missing value")
      const prec = PRECEDENCE[token.symbol]
      while (
        ops.length > 0 &&
        ops[ops.length - 1] !== "(" &&
        PRECEDENCE[ops[ops.length - 1]] >= prec
      ) {
        applyOp()
      }
      ops.push(token.symbol)
      expectOperand = true
    } else if (token.type === "paren") {
      if (token.symbol === "(") {
        if (!expectOperand) throw new Error("Unexpected '(' — missing operator")
        ops.push("(")
      } else {
        if (expectOperand) throw new Error("Unexpected ')' — missing value")
        let foundOpen = false
        while (ops.length > 0) {
          if (ops[ops.length - 1] === "(") {
            ops.pop()
            foundOpen = true
            break
          }
          applyOp()
        }
        if (!foundOpen) throw new Error("Mismatched parentheses")
      }
    }
  }

  if (expectOperand) throw new Error("Formula is incomplete")

  while (ops.length > 0) {
    if (ops[ops.length - 1] === "(") throw new Error("Mismatched parentheses")
    applyOp()
  }

  if (output.length !== 1) throw new Error("Formula is invalid")
  return output[0]
}

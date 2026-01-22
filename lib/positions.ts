export interface Position {
  id: string
  ticker: string
  entryDate: string // YYYY-MM-DD format
  entryPrice: number
  shares: number
  benchmarkTicker: string
  status: 'Open' | 'Closed'
  exitDate?: string | null
  exitPrice?: number | null
}

export interface PositionWithPrices extends Position {
  currentPrice: number | null
  entryBenchmarkPrice: number | null
  currentBenchmarkPrice: number | null
}

export interface PositionPerformance {
  costBasis: number
  currentValue: number
  gainLoss: number
  returnPercent: number
  benchmarkReturnPercent: number
  outperformance: number
}

export interface AggregatePerformance {
  totalCostBasis: number
  totalCurrentValue: number
  totalGainLoss: number
  averageReturnPercent: number
  averageBenchmarkReturnPercent: number
  outperformance: number
}

export function calculatePositionPerformance(
  position: PositionWithPrices
): PositionPerformance | null {
  if (!position.currentPrice || !position.entryBenchmarkPrice || !position.currentBenchmarkPrice) {
    return null
  }

  const costBasis = position.shares * position.entryPrice
  const currentValue = position.shares * position.currentPrice
  const gainLoss = currentValue - costBasis
  const returnPercent = (gainLoss / costBasis) * 100

  const benchmarkReturnPercent =
    ((position.currentBenchmarkPrice - position.entryBenchmarkPrice) /
      position.entryBenchmarkPrice) *
    100

  const outperformance = returnPercent - benchmarkReturnPercent

  return {
    costBasis,
    currentValue,
    gainLoss,
    returnPercent,
    benchmarkReturnPercent,
    outperformance,
  }
}

export function calculateAggregatePerformance(
  performances: Array<{ performance: PositionPerformance; position: PositionWithPrices }>
): AggregatePerformance {
  const totalCostBasis = performances.reduce((sum, p) => sum + p.performance.costBasis, 0)
  const totalCurrentValue = performances.reduce((sum, p) => sum + p.performance.currentValue, 0)
  const totalGainLoss = totalCurrentValue - totalCostBasis
  const averageReturnPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0

  // Calculate weighted average benchmark return
  const weightedBenchmarkReturn = performances.reduce((sum, p) => {
    const weight = p.performance.costBasis / totalCostBasis
    return sum + p.performance.benchmarkReturnPercent * weight
  }, 0)

  const outperformance = averageReturnPercent - weightedBenchmarkReturn

  return {
    totalCostBasis,
    totalCurrentValue,
    totalGainLoss,
    averageReturnPercent,
    averageBenchmarkReturnPercent: weightedBenchmarkReturn,
    outperformance,
  }
}

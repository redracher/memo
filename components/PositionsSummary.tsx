import { ChevronDown, ChevronUp, X, Plus, Trash2, Pin, Pencil } from 'lucide-react'
import {
  Position,
  PositionWithPrices,
  PositionPerformance,
  AggregatePerformance,
  calculatePositionPerformance,
  calculateAggregatePerformance,
} from '@/lib/positions'

interface PositionsSummaryProps {
  positions: Position[]
  positionsWithPrices: PositionWithPrices[]
  isExpanded: boolean
  onToggleExpanded: () => void
  onAddClick: () => void
  onEditPosition: (position: Position) => void
  onDeletePosition: (positionId: string) => void
  loadingPrices: boolean
  showInHeader: boolean
  onToggleShowInHeader: () => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export default function PositionsSummary({
  positions,
  positionsWithPrices,
  isExpanded,
  onToggleExpanded,
  onAddClick,
  onEditPosition,
  onDeletePosition,
  loadingPrices,
  showInHeader,
  onToggleShowInHeader,
}: PositionsSummaryProps) {
  if (positions.length === 0) {
    return null
  }

  // Calculate performance for each position
  const performancesData: Array<{
    performance: PositionPerformance
    position: PositionWithPrices
  }> = []

  positionsWithPrices.forEach((position) => {
    const perf = calculatePositionPerformance(position)
    if (perf) {
      performancesData.push({ performance: perf, position })
    }
  })

  const aggregate = performancesData.length > 0
    ? calculateAggregatePerformance(performancesData)
    : null

  // Show loading skeleton while prices are being fetched (only if showing in header)
  if (loadingPrices && showInHeader) {
    return (
      <div className="mt-3 flex justify-start">
        <div className="inline-flex items-center gap-3 text-xs py-1 rounded hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Value:</span>
            <div className="h-3 w-16 bg-[#f5f3f0] rounded animate-pulse" />
          </div>
          <div className="h-3 w-px bg-gray-300" />
          <div className="flex items-center gap-1">
            <span className="text-gray-500">P&L:</span>
            <div className="h-3 w-24 bg-[#f5f3f0] rounded animate-pulse" />
          </div>
          <div className="h-3 w-px bg-gray-300" />
          <div className="flex items-center gap-1">
            <span className="text-gray-500">vs SPY:</span>
            <div className="h-3 w-12 bg-[#f5f3f0] rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  const renderInlineSummary = () => {
    if (!showInHeader) return null

    // Don't show anything if we have no performance data (prices failed to load)
    if (performancesData.length === 0) return null

    if (aggregate && performancesData.length >= 2) {
      return (
        <div className="mt-3 flex justify-start">
          <div className="inline-flex items-center gap-3 text-xs py-1 rounded hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Value:</span>
              <span className="font-medium text-gray-900">{formatCurrency(aggregate.totalCurrentValue)}</span>
            </div>
            <div className="h-3 w-px bg-gray-300" />
            <div className="flex items-center gap-1">
              <span className="text-gray-500">P&L:</span>
              <span className={`font-medium ${aggregate.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(aggregate.totalGainLoss)} ({formatPercent(aggregate.averageReturnPercent)})
              </span>
            </div>
            <div className="h-3 w-px bg-gray-300" />
            <div className="flex items-center gap-1">
              <span className="text-gray-500">vs {performancesData[0].position.benchmarkTicker}:</span>
              <span className={`font-medium ${aggregate.outperformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(aggregate.outperformance)}
              </span>
            </div>
            <button
              onClick={onToggleExpanded}
              className="p-1 hover:bg-gray-100 rounded transition-colors ml-1"
              title={isExpanded ? "Hide positions" : "Show positions"}
            >
              {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
            </button>
          </div>
        </div>
      )
    }

    if (performancesData.length === 1) {
      return (
        <div className="mt-3 flex justify-start">
          <div className="inline-flex items-center gap-3 text-xs py-1 rounded hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">{performancesData[0].position.ticker}:</span>
              <span className="font-medium text-gray-900">{formatCurrency(performancesData[0].performance.currentValue)}</span>
            </div>
            <div className="h-3 w-px bg-gray-300" />
            <div className="flex items-center gap-1">
              <span className="text-gray-500">P&L:</span>
              <span className={`font-medium ${performancesData[0].performance.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(performancesData[0].performance.gainLoss)} ({formatPercent(performancesData[0].performance.returnPercent)})
              </span>
            </div>
            <div className="h-3 w-px bg-gray-300" />
            <div className="flex items-center gap-1">
              <span className="text-gray-500">vs {performancesData[0].position.benchmarkTicker}:</span>
              <span className={`font-medium ${performancesData[0].performance.outperformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(performancesData[0].performance.outperformance)}
              </span>
            </div>
            <button
              onClick={onToggleExpanded}
              className="p-1 hover:bg-gray-100 rounded transition-colors ml-1"
              title={isExpanded ? "Hide position" : "Show position"}
            >
              {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
            </button>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <>
      {renderInlineSummary()}

      {/* Expandable Position Cards */}
      {isExpanded && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={onToggleExpanded}>
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Positions ({positions.length})</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={onAddClick}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#8b7964] rounded hover:bg-[#6f624f] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Position
                </button>
                <button
                  onClick={onToggleShowInHeader}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  {showInHeader ? (
                    <>
                      <X className="w-3 h-3" />
                      Remove from header
                    </>
                  ) : (
                    <>
                      <Pin className="w-3 h-3" />
                      Add to header
                    </>
                  )}
                </button>
                <button
                  onClick={onToggleExpanded}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-3">
              {performancesData.length > 0 ? performancesData.map(({ performance, position }) => (
                <div
                  key={position.id}
                  className="p-3 bg-[#f5f3f0] border border-gray-200 rounded-lg relative"
                >
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      onClick={() => onEditPosition(position)}
                      className="p-1 text-gray-400 hover:text-[#8b7964] hover:bg-[#ede9e3] rounded transition-colors"
                      title="Edit position"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletePosition(position.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete position"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-start justify-between mb-2 pr-16">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{position.ticker}</h4>
                      <p className="text-xs text-gray-600">
                        {position.shares} shares @ ${position.entryPrice}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        performance.returnPercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatPercent(performance.returnPercent)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500">Entry</p>
                      <p className="text-gray-900">
                        ${position.entryPrice} on {position.entryDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Current</p>
                      <p className="text-gray-900">
                        ${position.currentPrice?.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Value</p>
                      <p className="text-gray-900">{formatCurrency(performance.currentValue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">vs. {position.benchmarkTicker}</p>
                      <p
                        className={
                          performance.outperformance >= 0 ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {formatPercent(performance.outperformance)}
                      </p>
                    </div>
                  </div>
                </div>
              )) : positions.map((position) => (
                <div
                  key={position.id}
                  className="p-3 bg-[#f5f3f0] border border-gray-200 rounded-lg relative"
                >
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      onClick={() => onEditPosition(position)}
                      className="p-1 text-gray-400 hover:text-[#8b7964] hover:bg-[#ede9e3] rounded transition-colors"
                      title="Edit position"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletePosition(position.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete position"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-start justify-between mb-2 pr-16">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{position.ticker}</h4>
                      <p className="text-xs text-gray-600">
                        {position.shares} shares @ ${position.entryPrice}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Unable to load price data for this ticker
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

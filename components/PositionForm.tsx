import { useState } from 'react'
import { Position } from '@/lib/positions'

interface PositionFormProps {
  position: Position
  onSave: (position: Position) => void
  onCancel: () => void
}

export default function PositionForm({ position, onSave, onCancel }: PositionFormProps) {
  const [formData, setFormData] = useState<Position>(position)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: keyof Position, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.ticker.trim()) {
      newErrors.ticker = 'Ticker is required'
    }
    if (!formData.entryDate) {
      newErrors.entryDate = 'Entry date is required'
    }
    if (formData.entryPrice <= 0) {
      newErrors.entryPrice = 'Entry price must be greater than 0'
    }
    if (formData.shares <= 0) {
      newErrors.shares = 'Shares must be greater than 0'
    }
    if (!formData.benchmarkTicker.trim()) {
      newErrors.benchmarkTicker = 'Benchmark ticker is required'
    }
    if (formData.status === 'Closed') {
      if (!formData.exitDate) {
        newErrors.exitDate = 'Exit date is required for closed positions'
      }
      if (!formData.exitPrice || formData.exitPrice <= 0) {
        newErrors.exitPrice = 'Exit price must be greater than 0 for closed positions'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      // Ensure ticker and benchmark are uppercase
      const cleanedData: Position = {
        ...formData,
        ticker: formData.ticker.toUpperCase().trim(),
        benchmarkTicker: formData.benchmarkTicker.toUpperCase().trim(),
        // Clear exit data if status is Open
        exitDate: formData.status === 'Open' ? null : formData.exitDate,
        exitPrice: formData.status === 'Open' ? null : formData.exitPrice,
      }
      onSave(cleanedData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Ticker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ticker Symbol *
          </label>
          <input
            type="text"
            value={formData.ticker}
            onChange={(e) => handleChange('ticker', e.target.value.toUpperCase())}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent ${
              errors.ticker ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="AAPL"
          />
          {errors.ticker && <p className="mt-1 text-xs text-red-600">{errors.ticker}</p>}
        </div>

        {/* Entry Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entry Date *
          </label>
          <input
            type="date"
            value={formData.entryDate}
            onChange={(e) => handleChange('entryDate', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent ${
              errors.entryDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.entryDate && <p className="mt-1 text-xs text-red-600">{errors.entryDate}</p>}
        </div>

        {/* Entry Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entry Price *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.entryPrice || ''}
            onChange={(e) => handleChange('entryPrice', parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent ${
              errors.entryPrice ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="185.50"
          />
          {errors.entryPrice && <p className="mt-1 text-xs text-red-600">{errors.entryPrice}</p>}
        </div>

        {/* Shares */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shares *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.shares || ''}
            onChange={(e) => handleChange('shares', parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent ${
              errors.shares ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="10"
          />
          {errors.shares && <p className="mt-1 text-xs text-red-600">{errors.shares}</p>}
        </div>

        {/* Benchmark Ticker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Benchmark Ticker *
          </label>
          <input
            type="text"
            value={formData.benchmarkTicker}
            onChange={(e) => handleChange('benchmarkTicker', e.target.value.toUpperCase())}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent ${
              errors.benchmarkTicker ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="SPY"
          />
          {errors.benchmarkTicker && (
            <p className="mt-1 text-xs text-red-600">{errors.benchmarkTicker}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status *
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as 'Open' | 'Closed')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
          >
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Exit fields (only shown if status is Closed) */}
      {formData.status === 'Closed' && (
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
          {/* Exit Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exit Date *
            </label>
            <input
              type="date"
              value={formData.exitDate || ''}
              onChange={(e) => handleChange('exitDate', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent ${
                errors.exitDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.exitDate && <p className="mt-1 text-xs text-red-600">{errors.exitDate}</p>}
          </div>

          {/* Exit Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exit Price *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.exitPrice || ''}
              onChange={(e) => handleChange('exitPrice', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent ${
                errors.exitPrice ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="200.00"
            />
            {errors.exitPrice && <p className="mt-1 text-xs text-red-600">{errors.exitPrice}</p>}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm text-white bg-[#8b7964] rounded-lg hover:bg-[#6f624f] transition-colors"
        >
          Save Position
        </button>
      </div>
    </form>
  )
}

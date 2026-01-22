import { useState } from 'react'
import { X, Edit2, Trash2, Plus } from 'lucide-react'
import { Position } from '@/lib/positions'
import PositionForm from './PositionForm'

interface PositionsModalProps {
  isOpen: boolean
  onClose: () => void
  positions: Position[]
  onSave: (positions: Position[]) => void
}

export default function PositionsModal({ isOpen, onClose, positions, onSave }: PositionsModalProps) {
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAddPosition = () => {
    const newPosition: Position = {
      id: crypto.randomUUID(),
      ticker: '',
      entryDate: new Date().toISOString().split('T')[0],
      entryPrice: 0,
      shares: 0,
      benchmarkTicker: 'SPY',
      status: 'Open',
      exitDate: null,
      exitPrice: null,
    }
    setEditingPosition(newPosition)
    setShowForm(true)
  }

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position)
    setShowForm(true)
  }

  const handleSavePosition = (position: Position) => {
    const existingIndex = positions.findIndex(p => p.id === position.id)
    let updatedPositions: Position[]

    if (existingIndex >= 0) {
      // Update existing position
      updatedPositions = [...positions]
      updatedPositions[existingIndex] = position
    } else {
      // Add new position
      updatedPositions = [...positions, position]
    }

    onSave(updatedPositions)
    setShowForm(false)
    setEditingPosition(null)
  }

  const handleDeletePosition = (id: string) => {
    const updatedPositions = positions.filter(p => p.id !== id)
    onSave(updatedPositions)
    setDeleteConfirm(null)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingPosition(null)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Manage Positions</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showForm ? (
            <PositionForm
              position={editingPosition!}
              onSave={handleSavePosition}
              onCancel={handleCancelForm}
            />
          ) : (
            <>
              {positions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No positions yet</p>
                  <button
                    onClick={handleAddPosition}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#8b7964] text-white rounded-lg hover:bg-[#6f624f] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Position
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {positions.map((position) => (
                    <div
                      key={position.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-gray-900">
                            {position.ticker || 'No Ticker'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            position.status === 'Open'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {position.status}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {position.shares} shares @ ${position.entryPrice} • Entry: {position.entryDate}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditPosition(position)}
                          className="p-2 hover:bg-gray-100 rounded transition-colors"
                          title="Edit position"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(position.id)}
                          className="p-2 hover:bg-red-50 rounded transition-colors"
                          title="Delete position"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleAddPosition}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Position
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!showForm && (
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Position?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePosition(deleteConfirm)}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

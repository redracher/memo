'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TiptapEditor from '@/components/TiptapEditor'
import { Check, Trash2, MoreVertical, Star, TrendingUp, X } from 'lucide-react'
import { useNotes } from '@/lib/NotesContext'
import { findBacklinks, findForwardLinks } from '@/lib/findBacklinks'
import AIPressureTestPanel from '@/components/AIPressureTestPanel'
import AssessmentModal from '@/components/AssessmentModal'
import PositionsSummary from '@/components/PositionsSummary'
import PositionForm from '@/components/PositionForm'
import { Position, PositionWithPrices } from '@/lib/positions'

interface PageProps {
  params: {
    id: string
  }
}

export default function NotePage({ params }: PageProps) {
  const noteId = params.id
  const router = useRouter()
  const { refreshNotes, getNote, updateNoteOptimistically, notes } = useNotes()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState<any>(null)
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showPressureTest, setShowPressureTest] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showSubtitleInput, setShowSubtitleInput] = useState(false)
  const editorRef = useRef<any>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const subtitleRef = useRef<HTMLInputElement>(null)

  // Position tracking state
  const [positions, setPositions] = useState<Position[]>([])
  const [positionsWithPrices, setPositionsWithPrices] = useState<PositionWithPrices[]>([])
  const [showPositionForm, setShowPositionForm] = useState(false)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [isPositionsExpanded, setIsPositionsExpanded] = useState(false)
  const [hideTrackPositionsPrompt, setHideTrackPositionsPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`hideTrackPositions_${params.id}`) === 'true'
    }
    return false
  })
  const [showPositionsInHeader, setShowPositionsInHeader] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`showPositionsInHeader_${params.id}`)
      return stored === null ? true : stored === 'true'
    }
    return true
  })

  // Load note from context (instant, no fetch needed)
  const note = getNote(noteId)

  // Track loading state
  useEffect(() => {
    if (notes.length > 0) {
      setIsLoading(false)
    }
  }, [notes])

  // Save last viewed note to localStorage
  useEffect(() => {
    if (noteId && typeof window !== 'undefined') {
      localStorage.setItem('lastViewedNoteId', noteId)
    }
  }, [noteId])

  // Count words in content
  const wordCount = useMemo(() => {
    if (!content) return 0
    // Get text content from the Tiptap document
    let text = ''
    if (editorRef.current) {
      text = editorRef.current.getText()
    }
    // Count words (split by whitespace and filter out empty strings)
    const words = text.trim().split(/\s+/).filter(word => word.length > 0)
    return words.length
  }, [content, editorRef.current])

  // Find backlinks - notes that link to this note
  const backlinks = useMemo(() => {
    if (!note) return []
    return findBacklinks(note.title, notes, noteId)
  }, [note, notes, noteId])

  // Find forward links - notes that this note links to
  const forwardLinks = useMemo(() => {
    if (!note) return []
    return findForwardLinks(note.content, notes, noteId)
  }, [note, notes, noteId])

  useEffect(() => {
    // Update local state when note changes
    if (note) {
      setTitle(note.title)
      setSubtitle(note.subtitle || '')
      setContent(note.content)
      setPositions(note.positions || [])
      // Show subtitle input if subtitle exists
      setShowSubtitleInput(!!note.subtitle)

      // Focus title if it's empty (new note)
      if (!note.title || note.title === '') {
        setTimeout(() => {
          titleRef.current?.focus()
        }, 0)
      }
    }
  }, [noteId, note])

  // Fetch stock prices when positions change
  useEffect(() => {
    const fetchStockPrices = async () => {
      if (positions.length === 0) {
        setPositionsWithPrices([])
        return
      }

      // Check if we have cached prices from today
      const today = new Date().toISOString().split('T')[0]
      const cacheKey = `stockPrices_${noteId}_${today}`

      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          try {
            const cachedData = JSON.parse(cached)
            // Verify cache matches current positions
            if (cachedData.positions.length === positions.length &&
                cachedData.positions.every((p: Position, i: number) =>
                  p.id === positions[i].id &&
                  p.ticker === positions[i].ticker &&
                  p.entryDate === positions[i].entryDate
                )) {
              setPositionsWithPrices(cachedData.pricesWithPositions)
              return
            }
          } catch (e) {
            // Invalid cache, continue to fetch
          }
        }
      }

      setLoadingPrices(true)

      try {
        // Fetch prices for all positions
        const pricesPromises = positions.map(async (position) => {
          // Fetch current price and entry date price for the stock
          const [currentResponse, entryResponse] = await Promise.all([
            fetch(`/api/stock-price?ticker=${position.ticker}`),
            fetch(`/api/stock-price?ticker=${position.ticker}&date=${position.entryDate}`),
          ])

          const currentData = await currentResponse.json()
          const entryData = await entryResponse.json()

          // Fetch benchmark prices
          const [benchmarkCurrentResponse, benchmarkEntryResponse] = await Promise.all([
            fetch(`/api/stock-price?ticker=${position.benchmarkTicker}`),
            fetch(`/api/stock-price?ticker=${position.benchmarkTicker}&date=${position.entryDate}`),
          ])

          const benchmarkCurrentData = await benchmarkCurrentResponse.json()
          const benchmarkEntryData = await benchmarkEntryResponse.json()

          const positionWithPrices: PositionWithPrices = {
            ...position,
            currentPrice: currentData.currentPrice,
            entryBenchmarkPrice: benchmarkEntryData.historicalPrice || benchmarkEntryData.currentPrice,
            currentBenchmarkPrice: benchmarkCurrentData.currentPrice,
          }

          return positionWithPrices
        })

        const allPositionsWithPrices = await Promise.all(pricesPromises)
        setPositionsWithPrices(allPositionsWithPrices)

        // Cache the results for today
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            positions,
            pricesWithPositions: allPositionsWithPrices
          }))
        }
      } catch (error) {
        console.error('Error fetching stock prices:', error)
      } finally {
        setLoadingPrices(false)
      }
    }

    fetchStockPrices()
  }, [positions, noteId])

  const saveNote = async (newTitle: string, newSubtitle: string, newContent: any, newPositions?: Position[]) => {
    try {
      setSaving(true)

      // Optimistically update the note in context immediately
      const updateData: any = {
        title: newTitle,
        subtitle: newSubtitle,
        content: newContent
      }
      if (newPositions !== undefined) {
        updateData.positions = newPositions
      }

      updateNoteOptimistically(noteId, updateData)

      const dbUpdateData: any = {
        title: newTitle,
        subtitle: newSubtitle,
        content: newContent
      }
      if (newPositions !== undefined) {
        dbUpdateData.positions = newPositions
      }

      const { error } = await supabase
        .from('notes')
        .update(dbUpdateData)
        .eq('id', noteId)

      if (error) {
        console.error('Error saving note:', error)
        // Revert optimistic update on error
        refreshNotes()
        return
      }

      console.log('Note saved successfully')
      setSaved(true)
    } catch (err) {
      console.error('Unexpected error saving note:', err)
      // Revert optimistic update on error
      refreshNotes()
    } finally {
      setSaving(false)
    }
  }

  const debouncedSave = useCallback((newTitle: string, newSubtitle: string, newContent: any, newPositions?: Position[]) => {
    setSaved(false)

    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }

    const timeout = setTimeout(() => {
      saveNote(newTitle, newSubtitle, newContent, newPositions)
    }, 2000)

    setSaveTimeout(timeout)
  }, [saveTimeout, noteId])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    debouncedSave(newTitle, subtitle, content)
  }

  const handleSubtitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSubtitle = e.target.value
    setSubtitle(newSubtitle)
    debouncedSave(title, newSubtitle, content)
  }

  const handleContentChange = (newContent: any) => {
    setContent(newContent)
    debouncedSave(title, subtitle, newContent)
  }

  const handleSubtitleBlur = () => {
    // If subtitle is empty after blur, keep input hidden but allow re-clicking
    if (!subtitle.trim()) {
      setShowSubtitleInput(false)
    }
  }

  const handleTitleBlur = () => {
    // Hide subtitle prompt if user leaves title without adding subtitle
    // This makes the UI cleaner once they start working on the note
    if (!subtitle.trim() && showSubtitleInput) {
      setShowSubtitleInput(false)
    }
  }

  const handleShowSubtitle = () => {
    setShowSubtitleInput(true)
    // Focus subtitle input after a brief delay to ensure it's rendered
    setTimeout(() => {
      subtitleRef.current?.focus()
    }, 0)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showSubtitleInput) {
        subtitleRef.current?.focus()
      } else {
        setShowSubtitleInput(true)
        setTimeout(() => {
          subtitleRef.current?.focus()
        }, 0)
      }
    }
  }

  const handleSubtitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (editorRef.current) {
        editorRef.current.commands.focus()
      }
    }
    // Allow escape to blur and hide if empty
    if (e.key === 'Escape') {
      e.currentTarget.blur()
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)

      if (error) {
        console.error('Error deleting note:', error)
        alert('Failed to delete note. Please try again.')
        return
      }

      console.log('Note deleted successfully')
      // Refresh sidebar to remove deleted note
      refreshNotes()
      router.push('/dashboard')
    } catch (err) {
      console.error('Unexpected error deleting note:', err)
      alert('Failed to delete note. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSavePosition = async (position: Position) => {
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

    // Clear the price cache to force refetch with new position data
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `stockPrices_${noteId}_${today}`
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(cacheKey)
    }

    setPositions(updatedPositions)
    setShowPositionForm(false)
    setEditingPosition(null)
    // Save immediately with current note data
    await saveNote(title, subtitle, content, updatedPositions)
  }

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
    setShowPositionForm(true)
  }

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position)
    setShowPositionForm(true)
    setIsPositionsExpanded(false)
  }

  const handleDeletePosition = async (positionId: string) => {
    const updatedPositions = positions.filter(p => p.id !== positionId)

    // Clear the price cache to force refetch
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `stockPrices_${noteId}_${today}`
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(cacheKey)
    }

    setPositions(updatedPositions)
    await saveNote(title, subtitle, content, updatedPositions)
  }

  const handleDismissTrackPositions = () => {
    setHideTrackPositionsPrompt(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`hideTrackPositions_${noteId}`, 'true')
    }
  }

  const handleTogglePositionsInHeader = () => {
    const newValue = !showPositionsInHeader
    setShowPositionsInHeader(newValue)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`showPositionsInHeader_${noteId}`, String(newValue))
    }
  }

  const handleAppendToNote = (assessment: string) => {
    // Insert an assessment pill at the end of the note
    if (editorRef.current) {
      const editor = editorRef.current

      // Move to end of document
      editor.commands.focus('end')

      // Insert content as a single transaction with proper structure
      editor.commands.insertContent([
        {
          type: 'paragraph',
          content: []
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'assessmentPill',
              attrs: {
                assessment: assessment,
                date: new Date().toISOString(),
              },
            },
            {
              type: 'text',
              text: ' ', // Add space after pill to prevent deletion
            }
          ]
        },
        {
          type: 'paragraph',
          content: []
        }
      ])

      // Save will be triggered automatically by editor's onUpdate
    }
  }

  if (isLoading) {
    return (
      <>
        {/* Shimmer Title Section */}
        <div className="px-8 py-4 border-b border-gray-200 flex items-start justify-between flex-shrink-0">
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-10 bg-stone-200 rounded animate-pulse w-2/3"></div>
            <div className="h-5 bg-stone-200 rounded animate-pulse w-1/2"></div>
          </div>
        </div>

        {/* Shimmer Editor Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 pt-10 pb-1 space-y-4">
            <div className="h-4 bg-stone-200 rounded animate-pulse w-full"></div>
            <div className="h-4 bg-stone-200 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-stone-200 rounded animate-pulse w-4/5"></div>
            <div className="h-4 bg-stone-200 rounded animate-pulse w-full"></div>
            <div className="h-4 bg-stone-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-stone-200 rounded animate-pulse w-11/12"></div>
            <div className="h-4 bg-stone-200 rounded animate-pulse w-4/6"></div>
            <div className="h-4 bg-stone-200 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-stone-200 rounded animate-pulse w-full"></div>
            <div className="h-4 bg-stone-200 rounded animate-pulse w-2/3"></div>
          </div>
        </div>
      </>
    )
  }

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Note not found</div>
      </div>
    )
  }

  return (
    <>
      {/* Title Section */}
      <div className="px-8 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 flex flex-col gap-1">
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleBlur}
              className="text-2xl font-semibold text-text border-none outline-none bg-transparent w-full"
              placeholder="Untitled"
            />
            {showSubtitleInput ? (
              <input
                ref={subtitleRef}
                type="text"
                value={subtitle}
                onChange={handleSubtitleChange}
                onKeyDown={handleSubtitleKeyDown}
                onBlur={handleSubtitleBlur}
                className="text-sm text-gray-500 border-none outline-none bg-transparent w-full"
                placeholder="Add subtitle"
              />
            ) : subtitle ? (
              <div className="text-sm text-gray-500">{subtitle}</div>
            ) : (
              <div
                onClick={handleShowSubtitle}
                className="h-5 cursor-text"
              />
            )}
          </div>
          <div className="flex items-center gap-4 ml-4 flex-shrink-0">
          {saving ? (
            <span className="text-sm text-gray-500">Saving...</span>
          ) : saved ? (
            <div className="flex items-center gap-1 text-sm text-accent">
              <Check className="w-4 h-4" />
              <span>Saved</span>
            </div>
          ) : (
            <span className="text-sm text-gray-500">Unsaved</span>
          )}
          <div className="relative flex items-center">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded transition-colors flex items-center"
              title="More options"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-400 cursor-not-allowed transition-colors"
                    disabled
                    title="Coming soon"
                  >
                    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                    </svg>
                    <span>Assess thesis</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      if (positions.length > 0) {
                        setIsPositionsExpanded(true)
                      } else {
                        handleAddPosition()
                      }
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>{positions.length > 0 ? 'Manage positions' : 'Add position'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowDeleteConfirm(true)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        </div>

        {/* Compact Positions Summary - Inline at top */}
        {positions.length > 0 && (
          <PositionsSummary
            positions={positions}
            positionsWithPrices={positionsWithPrices}
            isExpanded={isPositionsExpanded}
            onToggleExpanded={() => setIsPositionsExpanded(!isPositionsExpanded)}
            onAddClick={() => {
              setIsPositionsExpanded(false)
              handleAddPosition()
            }}
            onEditPosition={handleEditPosition}
            onDeletePosition={handleDeletePosition}
            loadingPrices={loadingPrices}
            showInHeader={showPositionsInHeader}
            onToggleShowInHeader={handleTogglePositionsInHeader}
          />
        )}

        {/* Track Positions Prompt */}
        {positions.length === 0 && !hideTrackPositionsPrompt && (
          <div className="mt-3 flex justify-start">
            <div className="group relative inline-flex items-center px-3 py-1 border border-dashed border-gray-300 rounded text-xs">
              <button
                onClick={handleDismissTrackPositions}
                className="absolute -top-1.5 -right-1.5 p-0.5 text-white bg-gray-300 hover:bg-gray-400 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                title="Dismiss"
              >
                <X className="w-2 h-2" />
              </button>
              <button
                onClick={handleAddPosition}
                className="text-gray-500 hover:text-gray-700 transition-colors font-medium"
              >
                + Add positions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Editor Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-10 pb-1">
          <TiptapEditor
            initialContent={content}
            onUpdate={handleContentChange}
            editorRef={editorRef}
            noteTitle={title}
          />

          {/* Links Section */}
          {(backlinks.length > 0 || forwardLinks.length > 0) && (
            <div className="mt-16 pt-6 pb-4 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-500">
                {backlinks.length > 0 && (
                  <>
                    Links from{' '}
                    {backlinks.map((backlink, index) => (
                      <span key={backlink.id}>
                        <button
                          onClick={() => router.push(`/dashboard/notes/${backlink.id}`)}
                          className="text-sm text-accent hover:text-accent/80 transition-colors"
                        >
                          {backlink.title}
                        </button>
                        {index < backlinks.length - 1 && <span className="text-sm text-gray-400">, </span>}
                      </span>
                    ))}
                  </>
                )}
                {backlinks.length > 0 && forwardLinks.length > 0 && <span> and </span>}
                {forwardLinks.length > 0 && (
                  <>
                    links to{' '}
                    {forwardLinks.map((forwardLink, index) => (
                      <span key={forwardLink.id}>
                        <button
                          onClick={() => router.push(`/dashboard/notes/${forwardLink.id}`)}
                          className="text-sm text-accent hover:text-accent/80 transition-colors"
                        >
                          {forwardLink.title}
                        </button>
                        {index < forwardLinks.length - 1 && <span className="text-sm text-gray-400">, </span>}
                      </span>
                    ))}
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete this note?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This action cannot be undone. The note will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-white bg-[#8b7964] rounded-lg hover:bg-[#6f624f] transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Pressure Test Panel */}
      <AIPressureTestPanel
        isOpen={showPressureTest}
        onClose={() => setShowPressureTest(false)}
        noteTitle={title}
        noteContent={content}
        onAppendToNote={handleAppendToNote}
      />

      {/* Assessment Modal */}
      <AssessmentModal />

      {/* Position Form Modal */}
      {showPositionForm && editingPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingPosition.ticker ? 'Edit Position' : 'Add Position'}
              </h2>
              <button
                onClick={() => {
                  setShowPositionForm(false)
                  setEditingPosition(null)
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <PositionForm
                position={editingPosition}
                onSave={handleSavePosition}
                onCancel={() => {
                  setShowPositionForm(false)
                  setEditingPosition(null)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

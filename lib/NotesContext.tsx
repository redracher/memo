'use client'

import { createContext, useContext } from 'react'
import { Note } from './types'

interface NotesContextType {
  notes: Note[]
  refreshNotes: () => void
  getNote: (id: string) => Note | undefined
  updateNoteOptimistically: (id: string, updates: Partial<Note>) => void
  createNoteAfter: (afterNoteId: string | null) => Promise<string | null>
}

export const NotesContext = createContext<NotesContextType>({
  notes: [],
  refreshNotes: () => {},
  getNote: () => undefined,
  updateNoteOptimistically: () => {},
  createNoteAfter: async () => null
})

export const useNotes = () => useContext(NotesContext)

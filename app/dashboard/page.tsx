'use client'

import { useRouter } from 'next/navigation'
import { useNotes } from '@/lib/NotesContext'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const router = useRouter()
  const { createNoteAfter } = useNotes()
  const [lastViewedNoteId, setLastViewedNoteId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastViewedNoteId')
      setLastViewedNoteId(saved)
    }
  }, [])

  const createNewNote = async () => {
    const newNoteId = await createNoteAfter(lastViewedNoteId)
    if (newNoteId) {
      router.push(`/dashboard/notes/${newNoteId}`)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-gray-500">
        <p className="text-lg">
          Select a note or{' '}
          <button
            onClick={createNewNote}
            className="underline hover:text-gray-700 transition-colors"
          >
            create a new one
          </button>
        </p>
      </div>
    </div>
  )
}

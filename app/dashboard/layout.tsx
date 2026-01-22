'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Note } from '@/lib/types'
import { Search, PenLine, LogOut, X, ChevronDown, ChevronRight, Trash2, MoreVertical, MoveUp, MoveDown, FolderPlus } from 'lucide-react'
import { NotesContext } from '@/lib/NotesContext'
import { getAllTags, filterNotesByTag } from '@/lib/extractTags'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [userInitials, setUserInitials] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ noteId: string; x: number; y: number } | null>(null)
  const [showSectionSubmenu, setShowSectionSubmenu] = useState(false)
  const [editingSubtitle, setEditingSubtitle] = useState<{ noteId: string; subtitle: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isTagsExpanded, setIsTagsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tagsExpanded')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [sections, setSections] = useState<Array<{ id: string; name: string; order: number }>>([])
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [draggedNote, setDraggedNote] = useState<string | null>(null)
  const [draggedSection, setDraggedSection] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{ noteId: string; position: 'before' | 'after' } | null>(null)
  const [sectionDropIndicator, setSectionDropIndicator] = useState<{ sectionId: string; position: 'before' | 'after' } | null>(null)
  const [sectionMenuOpen, setSectionMenuOpen] = useState<string | null>(null)
  const [sectionMenuPosition, setSectionMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [journalTitle, setJournalTitle] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)
  const sectionNamesRef = useRef<Map<string, string>>(new Map())
  const sectionOrderRef = useRef<Map<string, number>>(new Map())
  const notePositionsRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    // Load section data from localStorage
    if (typeof window !== 'undefined') {
      const savedNames = localStorage.getItem('sectionNames')
      const savedOrders = localStorage.getItem('sectionOrders')
      const savedPositions = localStorage.getItem('notePositions')
      const savedTitle = localStorage.getItem('journalTitle')

      if (savedNames) {
        sectionNamesRef.current = new Map(JSON.parse(savedNames))
      }
      if (savedOrders) {
        sectionOrderRef.current = new Map(JSON.parse(savedOrders))
      }
      if (savedPositions) {
        notePositionsRef.current = new Map(JSON.parse(savedPositions))
      }
      if (savedTitle) {
        setJournalTitle(savedTitle)
      } else {
        setJournalTitle('Idea journal')
      }

      setIsMounted(true)
    }

    checkUser()
    fetchNotes()
  }, [])

  // Save tags expanded state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tagsExpanded', JSON.stringify(isTagsExpanded))
    }
  }, [isTagsExpanded])

  // Load sections from notes
  useEffect(() => {
    const uniqueSections = new Map<string, { id: string; name: string; order: number }>()
    let maxOrder = -1

    notes.forEach(note => {
      if (note.section_id && !uniqueSections.has(note.section_id)) {
        // Get name and order from refs (preserves across re-renders)
        const savedName = sectionNamesRef.current.get(note.section_id)
        const savedOrder = sectionOrderRef.current.get(note.section_id)

        // If no saved order, assign next available order
        const order = savedOrder ?? (maxOrder + 1)

        if (order > maxOrder) {
          maxOrder = order
        }

        uniqueSections.set(note.section_id, {
          id: note.section_id,
          name: savedName || 'New section',
          order: order
        })

        // Save name and order to refs for persistence
        if (savedName === undefined) {
          sectionNamesRef.current.set(note.section_id, 'New section')
        }
        if (savedOrder === undefined) {
          sectionOrderRef.current.set(note.section_id, order)
        }
      }
    })

    // Save to localStorage if any refs were updated
    saveSectionDataToLocalStorage()

    const sectionsArray = Array.from(uniqueSections.values())
    if (sectionsArray.length > 0) {
      setSections(sectionsArray)
    }
  }, [notes])

  // Ensure unsectioned notes are moved to "Other" when sections exist
  useEffect(() => {
    const handleUnsectionedNotes = async () => {
      if (sections.length === 0) return // No sections, allow unsectioned notes

      const unsectionedNotes = notes.filter(n => !n.section_id)
      if (unsectionedNotes.length === 0) return // No unsectioned notes

      // Find or create "Other" section
      let otherSection = sections.find(s => s.name === 'Other')

      if (!otherSection) {
        const otherSectionId = crypto.randomUUID()
        otherSection = {
          id: otherSectionId,
          name: 'Other',
          order: sections.length
        }

        // Save "Other" section
        sectionNamesRef.current.set(otherSectionId, 'Other')
        sectionOrderRef.current.set(otherSectionId, sections.length)
        saveSectionDataToLocalStorage()
        setSections([...sections, otherSection])
      }

      // Move all unsectioned notes to "Other"
      for (const note of unsectionedNotes) {
        await supabase
          .from('notes')
          .update({ section_id: otherSection.id })
          .eq('id', note.id)
      }

      fetchNotes()
    }

    handleUnsectionedNotes()
  }, [sections.length, notes.length])

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null)
      setShowSectionSubmenu(false)
      setSectionMenuOpen(null)
      setSectionMenuPosition(null)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null)
        setShowSectionSubmenu(false)
        setSectionMenuOpen(null)
        setSectionMenuPosition(null)
      }
    }

    if (contextMenu || sectionMenuOpen) {
      document.addEventListener('click', handleClick)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu, sectionMenuOpen])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX
      if (newWidth >= 200 && newWidth <= 500) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUserEmail(user.email || '')

    // Fetch user's name from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    if (profile && profile.first_name && profile.last_name) {
      const firstInitial = profile.first_name[0]?.toUpperCase() || ''
      const lastInitial = profile.last_name[0]?.toUpperCase() || ''
      setUserInitials(firstInitial + lastInitial)
    } else if (profile && profile.first_name) {
      // Only first name available
      setUserInitials(profile.first_name.substring(0, 2).toUpperCase())
    }
  }

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching notes:', error)
        return
      }

      setNotes(data || [])
    } catch (err) {
      console.error('Unexpected error fetching notes:', err)
    } finally {
      setLoading(false)
    }
  }

  const createNoteAfter = async (afterNoteId: string | null): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return null
      }

      const afterNote = afterNoteId ? notes.find(n => n.id === afterNoteId) : null

      const newNoteData: any = {
        user_id: user.id,
        title: '',
        content: { type: 'doc', content: [{ type: 'paragraph' }] }
      }

      // If there's a note to place after, put the new note in the same section
      if (afterNote && afterNote.section_id) {
        newNoteData.section_id = afterNote.section_id
      }

      const { data, error } = await supabase
        .from('notes')
        .insert(newNoteData)
        .select()
        .single()

      if (error) {
        console.error('Error creating note:', error)
        return null
      }

      if (data) {
        console.log('Created note:', data.id)

        // Set position right after the specified note
        if (afterNote && afterNote.section_id && afterNoteId) {
          // Get all notes in the same section sorted by updated_at
          const sectionNotes = notes
            .filter(n => n.section_id === afterNote.section_id)
            .sort((a, b) => {
              // First check if positions exist
              const posA = notePositionsRef.current.get(a.id)
              const posB = notePositionsRef.current.get(b.id)

              if (posA !== undefined && posB !== undefined) {
                return posA - posB
              }
              if (posA !== undefined) return -1
              if (posB !== undefined) return 1

              // Fallback to updated_at
              return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            })

          // Initialize positions for all notes if they don't have them
          sectionNotes.forEach((note, idx) => {
            if (!notePositionsRef.current.has(note.id)) {
              notePositionsRef.current.set(note.id, idx)
            }
          })

          // Now find the position of the afterNote
          const afterPosition = notePositionsRef.current.get(afterNoteId)!

          // Shift all notes after the target position down by 1
          sectionNotes.forEach((note) => {
            const pos = notePositionsRef.current.get(note.id)!
            if (pos > afterPosition) {
              notePositionsRef.current.set(note.id, pos + 1)
            }
          })

          // Set new note position right after the target note
          notePositionsRef.current.set(data.id, afterPosition + 1)

          // Save positions to localStorage
          saveSectionDataToLocalStorage()
        }

        // Refresh notes list and wait for it to complete
        await fetchNotes()
        return data.id
      }
    } catch (err) {
      console.error('Unexpected error creating note:', err)
    }
    return null
  }

  const createNewNote = async () => {
    // Get currently selected note to place new note below it
    const currentNoteId = pathname.match(/\/dashboard\/notes\/([^/]+)/)?.[1]
    const newNoteId = await createNoteAfter(currentNoteId || null)
    if (newNoteId) {
      router.push(`/dashboard/notes/${newNoteId}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const saveSectionDataToLocalStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sectionNames', JSON.stringify(Array.from(sectionNamesRef.current.entries())))
      localStorage.setItem('sectionOrders', JSON.stringify(Array.from(sectionOrderRef.current.entries())))
      localStorage.setItem('notePositions', JSON.stringify(Array.from(notePositionsRef.current.entries())))
    }
  }

  const saveJournalTitle = (title: string) => {
    setJournalTitle(title)
    if (typeof window !== 'undefined') {
      localStorage.setItem('journalTitle', title)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault()
    setSectionMenuOpen(null)
    setContextMenu({ noteId, x: e.clientX, y: e.clientY })
  }

  const moveNoteToSection = async (noteId: string, targetSectionId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return

    // Get all notes in the target section and find max position
    const sectionNotes = notes.filter(n => n.section_id === targetSectionId)
    let maxPosition = -1
    sectionNotes.forEach(n => {
      const pos = notePositionsRef.current.get(n.id)
      if (pos !== undefined && pos > maxPosition) {
        maxPosition = pos
      }
    })

    // Set position at bottom of target section
    notePositionsRef.current.set(noteId, maxPosition + 1)
    saveSectionDataToLocalStorage()

    // Optimistically update UI
    const updatedNotes = notes.map(n =>
      n.id === noteId ? { ...n, section_id: targetSectionId } : n
    )
    setNotes(updatedNotes)

    // Update database
    await supabase
      .from('notes')
      .update({ section_id: targetSectionId })
      .eq('id', noteId)
  }

  const addNoteToNewSection = async (noteId: string) => {
    let updatedSections = [...sections]

    // If this is the first section, create an "Other" section for remaining notes
    if (sections.length === 0) {
      const otherSectionId = crypto.randomUUID()
      const otherSection = {
        id: otherSectionId,
        name: 'Other',
        order: 0
      }

      // Save "Other" section
      sectionNamesRef.current.set(otherSectionId, 'Other')
      sectionOrderRef.current.set(otherSectionId, 0)
      updatedSections.push(otherSection)

      // Move all unsectioned notes (except the clicked one) to "Other"
      const unsectionedNotes = notes.filter(n => !n.section_id && n.id !== noteId)
      for (const note of unsectionedNotes) {
        await supabase
          .from('notes')
          .update({ section_id: otherSectionId })
          .eq('id', note.id)
      }
    }

    // Find the highest "New section N" number
    let maxNum = 0
    updatedSections.forEach(s => {
      const match = s.name.match(/^New section (\d+)$/i)
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1]))
      } else if (s.name.toLowerCase() === 'new section') {
        maxNum = Math.max(maxNum, 1)
      }
    })

    // Create the new section for the clicked note
    const newSectionId = crypto.randomUUID()
    const newOrder = updatedSections.length
    const newSectionName = maxNum === 0 ? 'New section' : `New section ${maxNum + 1}`

    const newSection = {
      id: newSectionId,
      name: newSectionName,
      order: newOrder
    }

    // Save name and order to refs for persistence
    sectionNamesRef.current.set(newSectionId, newSectionName)
    sectionOrderRef.current.set(newSectionId, newOrder)
    saveSectionDataToLocalStorage()

    updatedSections.push(newSection)
    setSections(updatedSections)

    // Update the note's section in database
    const { error } = await supabase
      .from('notes')
      .update({ section_id: newSectionId })
      .eq('id', noteId)

    if (!error) {
      fetchNotes()
    }
  }

  const updateSectionName = async (sectionId: string, name: string) => {
    // Save to ref so it persists across refreshes
    sectionNamesRef.current.set(sectionId, name)
    saveSectionDataToLocalStorage()

    setSections(sections.map(s => s.id === sectionId ? { ...s, name } : s))
  }

  const deleteSection = async (sectionId: string) => {
    // Get notes from the deleted section
    const notesInSection = notes.filter(n => n.section_id === sectionId)

    const remainingSections = sections.filter(s => s.id !== sectionId)

    // If this is the last section, just remove section_id from all notes
    if (remainingSections.length === 0) {
      // Remove from refs
      sectionNamesRef.current.delete(sectionId)
      sectionOrderRef.current.delete(sectionId)
      saveSectionDataToLocalStorage()

      // Update sections to empty
      setSections([])

      // Optimistically update notes state - remove section_id
      const updatedNotes = notes.map(note => {
        if (note.section_id === sectionId) {
          const { section_id, ...rest } = note
          return rest as Note
        }
        return note
      })
      setNotes(updatedNotes)

      // Update database in background
      for (const note of notesInSection) {
        await supabase
          .from('notes')
          .update({ section_id: null })
          .eq('id', note.id)
      }

      return
    }

    // Find or create "Other" section
    let otherSection = sections.find(s => s.name === 'Other' && s.id !== sectionId)

    if (!otherSection) {
      // Create "Other" section
      const otherSectionId = crypto.randomUUID()
      otherSection = {
        id: otherSectionId,
        name: 'Other',
        order: remainingSections.length
      }

      // Save "Other" section
      sectionNamesRef.current.set(otherSectionId, 'Other')
      sectionOrderRef.current.set(otherSectionId, remainingSections.length)

      remainingSections.push(otherSection)
      setSections(remainingSections)
    } else {
      // Update sections without the deleted one
      setSections(remainingSections)
    }

    // Remove from refs
    sectionNamesRef.current.delete(sectionId)
    sectionOrderRef.current.delete(sectionId)
    saveSectionDataToLocalStorage()

    // Find max position in "Other" section to append at bottom
    const otherNotes = notes.filter(n => n.section_id === otherSection.id)
    let maxPosition = -1
    otherNotes.forEach(note => {
      const pos = notePositionsRef.current.get(note.id)
      if (pos !== undefined && pos > maxPosition) {
        maxPosition = pos
      }
    })

    // Optimistically update notes state immediately
    const updatedNotes = notes.map(note => {
      if (note.section_id === sectionId) {
        return { ...note, section_id: otherSection.id }
      }
      return note
    })
    setNotes(updatedNotes)

    // Update positions in ref
    for (let i = 0; i < notesInSection.length; i++) {
      const note = notesInSection[i]
      const newPosition = maxPosition + i + 1
      notePositionsRef.current.set(note.id, newPosition)
    }

    // Update database in background
    for (const note of notesInSection) {
      await supabase
        .from('notes')
        .update({ section_id: otherSection.id })
        .eq('id', note.id)
    }
  }

  const moveSectionUp = (sectionId: string) => {
    const sortedSections = [...sections].sort((a, b) => a.order - b.order)
    const currentIndex = sortedSections.findIndex(s => s.id === sectionId)

    if (currentIndex > 0) {
      // Swap with previous section
      const temp = sortedSections[currentIndex - 1]
      sortedSections[currentIndex - 1] = sortedSections[currentIndex]
      sortedSections[currentIndex] = temp

      // Update order values
      const updatedSections = sortedSections.map((s, idx) => {
        const newOrder = idx
        sectionOrderRef.current.set(s.id, newOrder)
        return { ...s, order: newOrder }
      })

      saveSectionDataToLocalStorage()
      setSections(updatedSections)
    }
  }

  const moveSectionDown = (sectionId: string) => {
    const sortedSections = [...sections].sort((a, b) => a.order - b.order)
    const currentIndex = sortedSections.findIndex(s => s.id === sectionId)

    if (currentIndex < sortedSections.length - 1) {
      // Swap with next section
      const temp = sortedSections[currentIndex + 1]
      sortedSections[currentIndex + 1] = sortedSections[currentIndex]
      sortedSections[currentIndex] = temp

      // Update order values
      const updatedSections = sortedSections.map((s, idx) => {
        const newOrder = idx
        sectionOrderRef.current.set(s.id, newOrder)
        return { ...s, order: newOrder }
      })

      saveSectionDataToLocalStorage()
      setSections(updatedSections)
    }
  }

  const handleDragStart = (noteId: string) => {
    setDraggedNote(noteId)
    setDraggedSection(null)
    setDropIndicator(null)
    setHoveredSection(null)
    setIsOverDeleteZone(false)
  }

  const handleDeleteZoneDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedNote) {
      setNoteToDelete(draggedNote)
      setDraggedNote(null)
      setIsOverDeleteZone(false)
    }
  }

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return

    const noteId = noteToDelete
    setNoteToDelete(null)

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)

      if (error) {
        console.error('Error deleting note:', error)
        alert('Failed to delete note. Please try again.')
        return
      }

      // Remove from position tracking
      notePositionsRef.current.delete(noteId)
      saveSectionDataToLocalStorage()

      console.log('Note deleted successfully')
      fetchNotes()

      // If we're currently viewing the deleted note, navigate to dashboard
      if (pathname.includes(noteId)) {
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Unexpected error deleting note:', err)
      alert('Failed to delete note. Please try again.')
    }
  }

  const handleSectionDragStart = (sectionId: string) => {
    console.log('Section drag started:', sectionId)
    setDraggedSection(sectionId)
    setDraggedNote(null)
    setDropIndicator(null)
    setSectionDropIndicator(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleSectionDragOver = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault()
    e.stopPropagation()

    console.log('Section drag over:', { draggedSection, targetSectionId })

    if (!draggedSection || draggedSection === targetSectionId) {
      setSectionDropIndicator(null)
      return
    }

    // Determine position based on whether dragged section is above or below target
    const draggedIdx = sections.findIndex(s => s.id === draggedSection)
    const targetIdx = sections.findIndex(s => s.id === targetSectionId)

    let position: 'before' | 'after'
    if (draggedIdx < targetIdx) {
      // Dragging from above - place after target
      position = 'after'
    } else {
      // Dragging from below - place before target
      position = 'before'
    }

    console.log('Setting section drop indicator:', { targetSectionId, position })
    setSectionDropIndicator({ sectionId: targetSectionId, position })
  }

  const handleNoteDragOver = (e: React.DragEvent, targetNoteId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedNote || draggedNote === targetNoteId) {
      setDropIndicator(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const position = e.clientY < midpoint ? 'before' : 'after'

    setDropIndicator({ noteId: targetNoteId, position })
  }

  const handleNoteDrop = async (targetNoteId: string, position: 'before' | 'after') => {
    if (!draggedNote || draggedNote === targetNoteId) {
      setDropIndicator(null)
      setHoveredSection(null)
      return
    }

    const draggedNoteObj = notes.find(n => n.id === draggedNote)
    const targetNoteObj = notes.find(n => n.id === targetNoteId)

    if (!draggedNoteObj || !targetNoteObj) {
      setDropIndicator(null)
      setDraggedNote(null)
      setHoveredSection(null)
      return
    }

    // Get all notes in the target section
    const targetSectionId = targetNoteObj.section_id
    const sectionNotes = notes
      .filter(n => n.section_id === targetSectionId)
      .sort((a, b) => {
        const posA = notePositionsRef.current.get(a.id) ?? 999999
        const posB = notePositionsRef.current.get(b.id) ?? 999999
        return posA - posB
      })

    // Calculate new positions
    const targetIndex = sectionNotes.findIndex(n => n.id === targetNoteId)
    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1

    // Remove dragged note if it's in the same section
    const draggedIndex = sectionNotes.findIndex(n => n.id === draggedNote)
    if (draggedIndex !== -1) {
      sectionNotes.splice(draggedIndex, 1)
    }

    // Insert at new position
    sectionNotes.splice(insertIndex > draggedIndex && draggedIndex !== -1 ? insertIndex - 1 : insertIndex, 0, draggedNoteObj)

    // Update positions
    sectionNotes.forEach((note, idx) => {
      notePositionsRef.current.set(note.id, idx)
    })

    // Save positions to localStorage
    saveSectionDataToLocalStorage()

    // Optimistically update UI - update the note's section_id immediately
    const updatedNotes = notes.map(note =>
      note.id === draggedNote ? { ...note, section_id: targetSectionId } : note
    )
    setNotes(updatedNotes)

    // Update database
    if (draggedNoteObj.section_id !== targetSectionId) {
      await supabase
        .from('notes')
        .update({ section_id: targetSectionId })
        .eq('id', draggedNote)
    }

    setDropIndicator(null)
    setDraggedNote(null)
    setHoveredSection(null)
  }

  const handleDropOnSection = async (e: React.DragEvent, targetSectionId: string | null) => {
    e.preventDefault()
    e.stopPropagation()

    // Handle note drop
    if (draggedNote) {
      const draggedNoteObj = notes.find(n => n.id === draggedNote)

      if (draggedNoteObj && draggedNoteObj.section_id !== targetSectionId) {
        // Optimistically update UI
        const updatedNotes = notes.map(note =>
          note.id === draggedNote ? { ...note, section_id: targetSectionId } : note
        )
        setNotes(updatedNotes)

        // Update database
        await supabase
          .from('notes')
          .update({ section_id: targetSectionId })
          .eq('id', draggedNote)
      }

      setDraggedNote(null)
      setDropIndicator(null)
      return
    }

    setDraggedSection(null)
    setSectionDropIndicator(null)
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
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
      fetchNotes()

      // If we're currently viewing the deleted note, navigate to dashboard
      if (pathname.includes(noteId)) {
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Unexpected error deleting note:', err)
      alert('Failed to delete note. Please try again.')
    } finally {
      setShowDeleteConfirm(null)
    }
  }

  const handleSaveSubtitle = async (noteId: string, subtitle: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ subtitle })
        .eq('id', noteId)

      if (error) {
        console.error('Error updating subtitle:', error)
        alert('Failed to update subtitle. Please try again.')
        return
      }

      console.log('Subtitle updated successfully')
      fetchNotes()
    } catch (err) {
      console.error('Unexpected error updating subtitle:', err)
      alert('Failed to update subtitle. Please try again.')
    } finally {
      setEditingSubtitle(null)
    }
  }

  // Get all tags with counts
  const allTags = useMemo(() => {
    const tagMap = getAllTags(notes)
    return Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
  }, [notes])

  // Filter notes by search and tag
  const filteredNotes = useMemo(() => {
    let filtered = notes

    // Filter by tags first
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note => {
        // Check if note has any of the selected tags
        return selectedTags.some(tag => {
          const notesWithTag = filterNotesByTag(notes, tag)
          return notesWithTag.some(n => n.id === note.id)
        })
      })
    }

    // Then filter by search query
    if (searchQuery) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }, [notes, selectedTags, searchQuery])

  // Organize notes by section and create interleaved list
  const organizedNotes = useMemo(() => {
    const result: Array<{ type: 'note' | 'section'; data: Note | { section: typeof sections[0]; notes: Note[] } }> = []

    // Group notes by section
    const sectioned: { [sectionId: string]: Note[] } = {}
    filteredNotes.forEach(note => {
      if (note.section_id) {
        if (!sectioned[note.section_id]) {
          sectioned[note.section_id] = []
        }
        sectioned[note.section_id].push(note)
      }
    })

    // Sort notes within each section by manual position (or updated_at as fallback)
    Object.keys(sectioned).forEach(sectionId => {
      sectioned[sectionId].sort((a, b) => {
        const posA = notePositionsRef.current.get(a.id)
        const posB = notePositionsRef.current.get(b.id)

        // If both have positions, sort by position
        if (posA !== undefined && posB !== undefined) {
          return posA - posB
        }

        // If only one has position, prioritize it
        if (posA !== undefined) return -1
        if (posB !== undefined) return 1

        // Fallback to updated_at
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })
    })

    // Add sections in their defined order
    const sortedSections = [...sections].sort((a, b) => a.order - b.order)
    sortedSections.forEach(section => {
      if (sectioned[section.id] && sectioned[section.id].length > 0) {
        result.push({
          type: 'section',
          data: { section, notes: sectioned[section.id] }
        })
      }
    })

    // Only add unsectioned notes if there are no sections at all
    if (sections.length === 0) {
      filteredNotes.forEach(note => {
        if (!note.section_id) {
          result.push({
            type: 'note',
            data: note
          })
        }
      })
    }

    return result
  }, [filteredNotes, sections])

  // Extract note ID from pathname
  const currentNoteId = pathname.match(/\/dashboard\/notes\/([^/]+)/)?.[1]

  // Helper to get a note by ID
  const getNote = (id: string) => {
    return notes.find(note => note.id === id)
  }

  // Optimistically update a note in the local state
  const updateNoteOptimistically = (id: string, updates: Partial<Note>) => {
    setNotes(prevNotes =>
      prevNotes.map(note =>
        note.id === id
          ? { ...note, ...updates, updated_at: new Date().toISOString() }
          : note
      )
    )
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigation with arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Don't interfere if user is typing in an input
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }

        e.preventDefault()

        // Get all notes in order (flattened from organizedNotes)
        const allNotes: Note[] = []
        organizedNotes.forEach(item => {
          if (item.type === 'note') {
            allNotes.push(item.data as Note)
          } else {
            const sectionData = item.data as { section: typeof sections[0]; notes: Note[] }
            allNotes.push(...sectionData.notes)
          }
        })

        if (allNotes.length === 0) return

        const currentIndex = allNotes.findIndex(n => n.id === currentNoteId)

        let nextIndex = currentIndex
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          // Navigate to previous note
          nextIndex = currentIndex > 0 ? currentIndex - 1 : 0
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          // Navigate to next note
          nextIndex = currentIndex < allNotes.length - 1 ? currentIndex + 1 : allNotes.length - 1
        }

        if (nextIndex !== currentIndex || currentIndex === -1) {
          const nextNote = allNotes[nextIndex >= 0 ? nextIndex : 0]
          router.push(`/dashboard/notes/${nextNote.id}`)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [organizedNotes, currentNoteId, router])

  return (
    <NotesContext.Provider value={{ notes, refreshNotes: fetchNotes, getNote, updateNoteOptimistically, createNoteAfter }}>
      <div className="flex h-screen bg-background">
        {/* LEFT SIDEBAR */}
        <aside
          className="bg-sidebar flex flex-col h-full border-r border-gray-200 relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Header */}
          <div className="px-6 h-[72px] flex items-center">
            {isMounted && (
              <>
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={journalTitle}
                    onChange={(e) => setJournalTitle(e.target.value)}
                    onBlur={() => {
                      saveJournalTitle(journalTitle)
                      setIsEditingTitle(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveJournalTitle(journalTitle)
                        setIsEditingTitle(false)
                      }
                    }}
                    autoFocus
                    maxLength={25}
                    className="text-xl text-text bg-transparent border-none focus:outline-none p-0 m-0 w-full resize-none"
                  />
                ) : (
                  <h1
                    className="text-xl text-text cursor-pointer line-clamp-2"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {journalTitle}
                  </h1>
                )}
              </>
            )}
          </div>

          {/* Search & New Note */}
          <div className="p-4 flex items-center gap-2">
            <div className="relative flex-1 transition-all">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm transition-all ${
                  isSearchFocused ? 'w-full' : ''
                }`}
              />
            </div>
            <button
              onClick={createNewNote}
              className="flex-shrink-0 p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-accent/40 hover:bg-accent/5 transition-colors"
              title="New Note"
            >
              <PenLine className="w-4 h-4" />
            </button>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto px-4">
            {loading ? (
              <div className="space-y-1">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="w-full px-3 py-2 rounded-lg">
                    <div className="h-4 bg-stone-300 rounded animate-pulse w-3/4 mb-2"></div>
                    <div className="h-3 bg-stone-300 rounded animate-pulse w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                {searchQuery || selectedTags.length > 0 ? 'No notes found' : 'No notes yet'}
              </div>
            ) : (
              <div className="space-y-1">
                {organizedNotes.map((item, idx) => {
                  if (item.type === 'note') {
                    const note = item.data as Note
                    return (
                      <div key={note.id} className="relative">
                        {dropIndicator?.noteId === note.id && dropIndicator.position === 'before' && (
                          <div className="h-0.5 bg-stone-400 mb-1 mx-3"></div>
                        )}
                        <button
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation()
                            // Use the button itself as drag image
                            const target = e.currentTarget as HTMLElement
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setDragImage(target, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
                            handleDragStart(note.id)
                          }}
                          onDragEnd={() => {
                            setDraggedNote(null)
                            setDropIndicator(null)
                            setHoveredSection(null)
                            setIsOverDeleteZone(false)
                          }}
                          onDragOver={(e) => {
                            e.dataTransfer.dropEffect = 'move'
                            handleNoteDragOver(e, note.id)
                          }}
                          onDragLeave={() => setDropIndicator(null)}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (dropIndicator?.noteId === note.id && dropIndicator.position) {
                              handleNoteDrop(note.id, dropIndicator.position)
                            }
                          }}
                          onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                          onContextMenu={(e) => handleContextMenu(e, note.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/50 transition-colors focus:outline-none ${
                            note.id === currentNoteId ? 'bg-white/70' : ''
                          } ${draggedNote === note.id ? 'opacity-30' : ''}`}
                          style={{ cursor: draggedNote ? 'grabbing' : 'grab' }}
                        >
                          <div className="font-medium text-text text-sm truncate">
                            {note.title || 'Untitled'}
                          </div>
                          {note.subtitle && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                              {note.subtitle}
                            </div>
                          )}
                        </button>
                        {dropIndicator?.noteId === note.id && dropIndicator.position === 'after' && (
                          <div className="h-0.5 bg-stone-400 mt-1 mx-3"></div>
                        )}
                      </div>
                    )
                  } else {
                    const sectionData = item.data as { section: typeof sections[0]; notes: Note[] }
                    return (
                      <div key={sectionData.section.id} className="relative">
                        {sectionDropIndicator?.sectionId === sectionData.section.id && sectionDropIndicator.position === 'before' && (
                          <div className="h-0.5 bg-stone-400 mb-2 mx-3"></div>
                        )}
                        <div
                          className={`mt-4 ${draggedSection === sectionData.section.id ? 'opacity-50' : ''}`}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onDrop={(e) => {
                            handleDropOnSection(e, sectionData.section.id)
                          }}
                        >
                        {/* Section divider */}
                        <div
                          className="px-2 mb-4"
                          onDragOver={(e) => {
                            if (draggedNote) {
                              e.preventDefault()
                              e.stopPropagation()
                            }
                          }}
                          onDrop={(e) => {
                            if (draggedNote) {
                              handleDropOnSection(e, sectionData.section.id)
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 group relative">
                            {editingSection === sectionData.section.id ? (
                              <input
                                type="text"
                                value={sectionData.section.name}
                                onChange={(e) => updateSectionName(sectionData.section.id, e.target.value)}
                                onBlur={() => setEditingSection(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') setEditingSection(null)
                                }}
                                autoFocus
                                className="text-xs font-semibold text-gray-600 tracking-wide bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-stone-400 rounded px-1"
                              />
                            ) : (
                              <span
                                onDoubleClick={(e) => {
                                  e.stopPropagation()
                                  setEditingSection(sectionData.section.id)
                                }}
                                className="text-xs font-semibold text-gray-600 tracking-wide group-hover:text-accent transition-colors whitespace-nowrap"
                              >
                                {sectionData.section.name}
                              </span>
                            )}
                            <div className="flex-1 h-px bg-stone-400"></div>

                            {/* Section menu button */}
                            <div className="relative" style={{ overflow: 'visible' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setContextMenu(null)
                                  if (sectionMenuOpen === sectionData.section.id) {
                                    setSectionMenuOpen(null)
                                    setSectionMenuPosition(null)
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    setSectionMenuOpen(sectionData.section.id)
                                    setSectionMenuPosition({ x: rect.right, y: rect.bottom + 4 })
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-stone-200 rounded"
                                title="Section options"
                              >
                                <MoreVertical className="w-3 h-3 text-gray-500" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Notes in section */}
                        <div
                          className="pb-8 min-h-[40px]"
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onDrop={(e) => {
                            if (draggedNote) {
                              handleDropOnSection(e, sectionData.section.id)
                            }
                          }}
                        >
                          {sectionData.notes.map((note) => (
                            <div key={note.id} className="relative">
                              {dropIndicator?.noteId === note.id && dropIndicator.position === 'before' && (
                                <div className="h-0.5 bg-stone-400 mb-1 mx-3"></div>
                              )}
                              <button
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation()
                                  // Use the button itself as drag image
                                  const target = e.currentTarget as HTMLElement
                                  e.dataTransfer.effectAllowed = 'move'
                                  e.dataTransfer.setDragImage(target, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
                                  handleDragStart(note.id)
                                }}
                                onDragEnd={() => {
                                  setDraggedNote(null)
                                  setDropIndicator(null)
                                  setHoveredSection(null)
                                  setIsOverDeleteZone(false)
                                }}
                                onDragOver={(e) => {
                                  e.dataTransfer.dropEffect = 'move'
                                  handleNoteDragOver(e, note.id)
                                }}
                                onDragLeave={() => setDropIndicator(null)}
                                onDrop={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  if (dropIndicator?.noteId === note.id && dropIndicator.position) {
                                    handleNoteDrop(note.id, dropIndicator.position)
                                  }
                                }}
                                onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                                onContextMenu={(e) => handleContextMenu(e, note.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/50 transition-colors focus:outline-none ${
                                  note.id === currentNoteId ? 'bg-white/70' : ''
                                } ${draggedNote === note.id ? 'opacity-30' : ''}`}
                                style={{ cursor: draggedNote ? 'grabbing' : 'grab' }}
                              >
                                <div className="font-medium text-text text-sm truncate">
                                  {note.title || 'Untitled'}
                                </div>
                                {note.subtitle && (
                                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                                    {note.subtitle}
                                  </div>
                                )}
                              </button>
                              {dropIndicator?.noteId === note.id && dropIndicator.position === 'after' && (
                                <div className="h-0.5 bg-stone-400 mt-1 mx-3"></div>
                              )}
                            </div>
                          ))}
                        </div>
                        </div>
                        {sectionDropIndicator?.sectionId === sectionData.section.id && sectionDropIndicator.position === 'after' && (
                          <div className="h-0.5 bg-stone-400 mt-2 mx-3"></div>
                        )}
                      </div>
                    )
                  }
                })}
              </div>
            )}
          </div>

          {/* Tags Section */}
          {allTags.length > 0 && (
            <div className="px-4 pb-0 border-t border-gray-200 pt-4">
              <button
                onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 mb-3 tracking-wide hover:text-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Tags</span>
                  {!isTagsExpanded && selectedTags.length > 0 && (
                    <span className="text-xs font-normal text-gray-400">
                      {selectedTags.length} filter{selectedTags.length > 1 ? 's' : ''} applied
                    </span>
                  )}
                </div>
                {isTagsExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
              {isTagsExpanded && (
                <>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mb-2"
                    >
                      <X className="w-3 h-3" />
                      <span>Clear {selectedTags.length > 1 ? 'filters' : 'filter'}</span>
                    </button>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(([tag, count]) => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag))
                          } else {
                            setSelectedTags([...selectedTags, tag])
                          }
                        }}
                        className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-gray-300 text-purple-600'
                            : 'bg-gray-200 text-purple-600 hover:bg-gray-300'
                        }`}
                      >
                        {tag.replace(/^#/, '')} ({count})
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* User Section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text truncate">
                  {userInitials || userEmail}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 p-2 hover:bg-white/50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Delete Zone - invisible zone covering the entire note body */}
          {draggedNote && (
            <div
              className="fixed top-0 right-0 bottom-0 pointer-events-auto z-50"
              style={{ left: `${sidebarWidth}px` }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsOverDeleteZone(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setIsOverDeleteZone(false)
              }}
              onDrop={handleDeleteZoneDrop}
            />
          )}

          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-300 transition-colors"
            onMouseDown={() => setIsResizing(true)}
          />
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </main>

        {/* Section Menu Dropdown */}
        {sectionMenuOpen && sectionMenuPosition && (
          <div
            className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]"
            style={{
              right: `${window.innerWidth - sectionMenuPosition.x}px`,
              top: `${sectionMenuPosition.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const section = sections.find(s => s.id === sectionMenuOpen)
              if (!section) return null

              const sortedSections = [...sections].sort((a, b) => a.order - b.order)
              const currentIndex = sortedSections.findIndex(s => s.id === sectionMenuOpen)
              const isFirst = currentIndex === 0
              const isLast = currentIndex === sortedSections.length - 1

              return (
                <>
                  {!isFirst && (
                    <button
                      onClick={() => {
                        moveSectionUp(sectionMenuOpen)
                        setSectionMenuOpen(null)
                        setSectionMenuPosition(null)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <MoveUp className="w-3 h-3" />
                      Move up
                    </button>
                  )}
                  {!isLast && (
                    <button
                      onClick={() => {
                        moveSectionDown(sectionMenuOpen)
                        setSectionMenuOpen(null)
                        setSectionMenuPosition(null)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <MoveDown className="w-3 h-3" />
                      Move down
                    </button>
                  )}
                  <button
                    onClick={() => {
                      deleteSection(sectionMenuOpen)
                      setSectionMenuOpen(null)
                      setSectionMenuPosition(null)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </>
              )
            })()}
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative"
              onMouseEnter={() => setShowSectionSubmenu(true)}
              onMouseLeave={() => setShowSectionSubmenu(false)}
            >
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <FolderPlus className="w-3 h-3" />
                Add to section
                <ChevronRight className="w-3 h-3 ml-auto" />
              </button>

              {/* Submenu */}
              {showSectionSubmenu && (
                <div
                  className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {[...sections].sort((a, b) => a.order - b.order).map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        moveNoteToSection(contextMenu.noteId, section.id)
                        setContextMenu(null)
                        setShowSectionSubmenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {section.name}
                    </button>
                  ))}
                  {sections.length > 0 && (
                    <div className="h-px bg-gray-200 my-1" />
                  )}
                  <button
                    onClick={() => {
                      addNoteToNewSection(contextMenu.noteId)
                      setContextMenu(null)
                      setShowSectionSubmenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Add new
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setShowDeleteConfirm(contextMenu.noteId)
                setContextMenu(null)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-3 h-3" />
              Delete note
            </button>
          </div>
        )}

        {/* Edit Subtitle Modal */}
        {editingSubtitle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Subtitle</h3>
              <input
                type="text"
                value={editingSubtitle.subtitle}
                onChange={(e) => setEditingSubtitle({ ...editingSubtitle, subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm mb-4"
                placeholder="Subtitle"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setEditingSubtitle(null)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveSubtitle(editingSubtitle.noteId, editingSubtitle.subtitle)}
                  className="px-4 py-2 text-sm text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete this note?</h3>
              <p className="text-sm text-gray-600 mb-6">
                This action cannot be undone. The note will be permanently deleted.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteNote(showDeleteConfirm)}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drag to Delete Confirmation Modal */}
        {noteToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete this note?</h3>
              <p className="text-sm text-gray-600 mb-6">
                This action cannot be undone. The note will be permanently deleted.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setNoteToDelete(null)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteNote}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </NotesContext.Provider>
  )
}

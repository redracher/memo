import { Note } from './types'

// Find all notes that contain a wiki link to the target note
export function findBacklinks(targetNoteTitle: string, allNotes: Note[], currentNoteId: string): Note[] {
  const backlinks: Note[] = []

  // Search through all notes except the current one
  allNotes.forEach(note => {
    if (note.id === currentNoteId) return

    // Convert note content to string to search for wiki links
    const contentString = JSON.stringify(note.content)

    // Create regex to match [[Target Note Title]] (case insensitive)
    const wikiLinkRegex = new RegExp(`\\[\\[${escapeRegex(targetNoteTitle)}\\]\\]`, 'gi')

    if (wikiLinkRegex.test(contentString)) {
      backlinks.push(note)
    }
  })

  return backlinks
}

// Find all notes that this note links to (forward links)
export function findForwardLinks(noteContent: any, allNotes: Note[], currentNoteId: string): Note[] {
  const forwardLinks: Note[] = []

  // Convert note content to string to search for wiki links
  const contentString = JSON.stringify(noteContent)

  // Extract all [[Note Title]] patterns from the content
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
  const matches = contentString.matchAll(wikiLinkRegex)

  const linkedTitles = new Set<string>()
  for (const match of matches) {
    linkedTitles.add(match[1].toLowerCase())
  }

  // Find notes that match these titles
  allNotes.forEach(note => {
    if (note.id === currentNoteId) return

    if (linkedTitles.has(note.title.toLowerCase())) {
      forwardLinks.push(note)
    }
  })

  return forwardLinks
}

// Helper to escape special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

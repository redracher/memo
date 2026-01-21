import { Note } from './types'

// Extract hashtags from TipTap JSON content
export function extractHashtags(content: any): string[] {
  const tags = new Set<string>()

  if (!content || !content.content) {
    return []
  }

  // Recursively search through the content structure
  function searchContent(node: any) {
    if (node.type === 'text' && node.text) {
      // Match hashtags: # followed by alphanumeric and hyphens
      const matches = node.text.match(/#[\w-]+/g)
      if (matches) {
        matches.forEach((tag: string) => {
          // Normalize to lowercase for consistency
          tags.add(tag.toLowerCase())
        })
      }
    }

    // Recursively search child nodes
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(searchContent)
    }
  }

  searchContent(content)
  return Array.from(tags)
}

// Get all unique tags from all notes with counts
export function getAllTags(notes: Note[]): Map<string, number> {
  const tagCounts = new Map<string, number>()

  notes.forEach(note => {
    const tags = extractHashtags(note.content)
    tags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    })
  })

  return tagCounts
}

// Filter notes by tag
export function filterNotesByTag(notes: Note[], tag: string): Note[] {
  return notes.filter(note => {
    const tags = extractHashtags(note.content)
    return tags.includes(tag.toLowerCase())
  })
}

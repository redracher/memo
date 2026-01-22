'use client'

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hashtag } from './HashtagExtension'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { WikiLink } from './WikiLinkExtension'
import { AssessmentPill } from './AssessmentPillExtension'
import { NoteMention } from './NoteMentionExtension'
import { useNotes } from '@/lib/NotesContext'
import { supabase } from '@/lib/supabase'
import { PluginKey } from '@tiptap/pm/state'

interface TiptapEditorProps {
  initialContent?: any
  onUpdate?: (content: any) => void
  editorRef?: React.MutableRefObject<any>
  noteTitle?: string
}

export default function TiptapEditor({ initialContent, onUpdate, editorRef, noteTitle }: TiptapEditorProps) {
  const router = useRouter()
  const { notes, refreshNotes } = useNotes()
  const [isExpanding, setIsExpanding] = useState(false)

  const handleWikiLinkClick = async (linkText: string) => {
    // Search for existing note with this title
    const existingNote = notes.find(
      note => note.title.toLowerCase() === linkText.toLowerCase()
    )

    if (existingNote) {
      // Navigate to existing note
      router.push(`/dashboard/notes/${existingNote.id}`)
    } else {
      // Create new note with this title
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: linkText,
          content: { type: 'doc', content: [{ type: 'paragraph' }] }
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating linked note:', error)
        return
      }

      if (data) {
        // Refresh notes list to include new note
        refreshNotes()
        // Navigate to the new note
        router.push(`/dashboard/notes/${data.id}`)
      }
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing',
      }),
      Hashtag,
      WikiLink.configure({
        onLinkClick: handleWikiLinkClick,
      }),
      // @ mention for notes
      NoteMention.extend({ name: 'atMention' }).configure({
        onLinkClick: handleWikiLinkClick,
        suggestion: {
          char: '@',
          pluginKey: new PluginKey('atMentionSuggestion'),
          items: ({ query }: { query: string }) => {
            const matchingNotes = notes
              .filter(note => note.title.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5)
              .map(note => ({ id: note.id, title: note.title, query }))

            // Always include the query as an option to create new note
            if (query && !matchingNotes.some(note => note.title.toLowerCase() === query.toLowerCase())) {
              return [{ id: 'new', title: query, query }, ...matchingNotes]
            }

            return matchingNotes.length > 0 ? matchingNotes : (query ? [{ id: 'new', title: query, query }] : [])
          },
        },
      }),
      // + mention for notes
      NoteMention.extend({ name: 'plusMention' }).configure({
        onLinkClick: handleWikiLinkClick,
        suggestion: {
          char: '+',
          pluginKey: new PluginKey('plusMentionSuggestion'),
          items: ({ query }: { query: string }) => {
            const matchingNotes = notes
              .filter(note => note.title.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5)
              .map(note => ({ id: note.id, title: note.title, query }))

            // Always include the query as an option to create new note
            if (query && !matchingNotes.some(note => note.title.toLowerCase() === query.toLowerCase())) {
              return [{ id: 'new', title: query, query }, ...matchingNotes]
            }

            return matchingNotes.length > 0 ? matchingNotes : (query ? [{ id: 'new', title: query, query }] : [])
          },
        },
      }),
      // [[ wiki link mention for notes
      NoteMention.extend({ name: 'wikiMention' }).configure({
        onLinkClick: handleWikiLinkClick,
        suggestion: {
          char: '[',
          pluginKey: new PluginKey('wikiMentionSuggestion'),
          items: ({ query }: { query: string }) => {
            // Only trigger after [[
            if (!query.startsWith('[')) return []
            const searchQuery = query.substring(1) // Remove the second [
            return notes
              .filter(note => note.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .slice(0, 5)
              .map(note => ({ id: note.id, title: note.title, query: searchQuery }))
          },
        },
      }),
      AssessmentPill,
    ],
    content: initialContent || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
        },
      ],
    },
    editorProps: {
      attributes: {
        class: 'prose prose-base prose-stone max-w-none focus:outline-none min-h-[400px]',
      },
    },
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        const json = editor.getJSON()
        onUpdate(json)
      }
    },
  })

  // Update editor content when initialContent changes
  useEffect(() => {
    if (editor && initialContent && JSON.stringify(editor.getJSON()) !== JSON.stringify(initialContent)) {
      editor.commands.setContent(initialContent)
    }
  }, [initialContent, editor])

  // Expose editor instance via ref
  useEffect(() => {
    if (editor && editorRef) {
      editorRef.current = editor
    }
  }, [editor, editorRef])

  const handleExpandOnThis = async () => {
    if (!editor) return

    const { from, to } = editor.state.selection
    let selectedText = editor.state.doc.textBetween(from, to)

    if (!selectedText || selectedText.trim().length === 0) return

    // If selection is just one word, expand context by looking a few words ahead and back
    const words = selectedText.trim().split(/\s+/)
    if (words.length === 1) {
      // Get surrounding context - approximately 3-4 words before and after
      const contextBefore = Math.max(0, from - 50)
      const contextAfter = Math.min(editor.state.doc.content.size, to + 50)
      selectedText = editor.state.doc.textBetween(contextBefore, contextAfter)
    }

    setIsExpanding(true)

    try {
      const noteContent = editor.storage.markdown?.getMarkdown() || editor.getText()

      // Call AI generation API
      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'expand',
          noteTitle: noteTitle || 'Untitled',
          noteContent,
          textToExpand: selectedText,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate AI content')
      }

      const data = await response.json()

      // Move cursor to end of selection and insert response
      editor.chain()
        .setTextSelection(to)
        .insertContent([
          { type: 'hardBreak' },
          { type: 'text', text: data.response }
        ])
        .run()

      // Apply purple styling to the new paragraph
      setTimeout(() => {
        try {
          const { view } = editor
          const { selection } = view.state
          const $pos = selection.$from

          // Get the current paragraph node position
          let paragraphPos = null
          for (let d = $pos.depth; d > 0; d--) {
            const node = $pos.node(d)
            if (node.type.name === 'paragraph') {
              paragraphPos = $pos.before(d)
              break
            }
          }

          if (paragraphPos !== null) {
            const domPos = view.domAtPos(paragraphPos)

            // Find the actual paragraph DOM element
            let paragraphElement: HTMLElement | null = null

            if (domPos.node.nodeType === 1) {
              paragraphElement = domPos.node as HTMLElement
            } else if (domPos.node.parentElement) {
              let parent = domPos.node.parentElement
              while (parent && parent.tagName !== 'P' && parent.classList?.contains('ProseMirror') === false) {
                if (parent.tagName === 'P') {
                  paragraphElement = parent
                  break
                }
                parent = parent.parentElement
              }
              if (parent?.tagName === 'P') {
                paragraphElement = parent
              }
            }

            if (paragraphElement && paragraphElement.tagName === 'P') {
              paragraphElement.classList.add('ai-generated-text')

              setTimeout(() => {
                paragraphElement?.classList.add('fade-out')
              }, 100)

              setTimeout(() => {
                paragraphElement?.classList.remove('ai-generated-text', 'fade-out')
              }, 30100)
            }
          }
        } catch (e) {
          console.error('Failed to apply purple styling:', e)
        }
      }, 50)

    } catch (error) {
      console.error('Error generating AI content:', error)
      alert('Failed to generate content. Please try again.')
    } finally {
      setIsExpanding(false)
    }
  }

  if (!editor) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-gray-400">
        Loading editor...
      </div>
    )
  }

  return (
    <div className="tiptap-editor">
      <EditorContent editor={editor} />
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{
            duration: 100,
            placement: 'top-end',
            offset: [0, 10],
            popperOptions: {
              modifiers: [
                {
                  name: 'preventOverflow',
                  options: {
                    boundary: 'viewport',
                  },
                },
              ],
            },
          }}
          shouldShow={({ editor, state }) => {
            const { from, to } = state.selection
            const text = state.doc.textBetween(from, to)
            return text.trim().length > 0
          }}
        >
          <div style={{ background: 'transparent' }}>
            <button
              onClick={handleExpandOnThis}
              disabled={isExpanding}
              className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 rounded-lg shadow-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'white' }}
            >
              <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
              {isExpanding ? 'Expanding...' : 'Expand on this'}
            </button>
          </div>
        </BubbleMenu>
      )}
    </div>
  )
}

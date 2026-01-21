import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, any>
  onLinkClick?: (linkText: string) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: () => ReturnType
    }
  }
}

export const WikiLink = Mark.create<WikiLinkOptions>({
  name: 'wikiLink',

  addOptions() {
    return {
      HTMLAttributes: {},
      onLinkClick: undefined,
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wikilink]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-wikilink': '' }), 0]
  },

  addProseMirrorPlugins() {
    const onLinkClick = this.options.onLinkClick

    return [
      new Plugin({
        key: new PluginKey('wikiLink'),
        state: {
          init(_, { doc }) {
            return findWikiLinks(doc, null)
          },
          apply(transaction, oldState) {
            const selection = transaction.selection
            return transaction.docChanged || transaction.selectionSet
              ? findWikiLinks(transaction.doc, selection)
              : oldState
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement

            // Only navigate if clicking directly on the link text, not the brackets
            if (target.classList.contains('wiki-link-text')) {
              const linkText = target.getAttribute('data-link-text')
              if (linkText && onLinkClick) {
                event.preventDefault()
                onLinkClick(linkText)
                return true
              }
            }

            // If clicking on brackets or near the link, just let editor handle it (enter edit mode)
            return false
          },
          handleKeyDown(view, event) {
            if (event.key === 'Enter') {
              const { state } = view
              const { selection } = state

              // Check if cursor is right after ]]
              if (selection.empty && selection.from >= 2) {
                const textBefore = state.doc.textBetween(selection.from - 2, selection.from)

                if (textBefore === ']]') {
                  // Just move cursor forward with a space, don't create paragraph
                  const tr = state.tr.insertText(' ', selection.from)
                  view.dispatch(tr)
                  event.preventDefault()
                  return true
                }
              }
            }

            return false
          },
          handleTextInput(view, from, to, text) {
            // Check if user typed '['
            if (text === '[') {
              const { state } = view
              const { selection } = state

              // Check if there's a non-empty selection
              if (!selection.empty) {
                const selectedText = state.doc.textBetween(selection.from, selection.to)

                // Check if the character before the selection is '['
                const charBefore = selection.from > 0
                  ? state.doc.textBetween(selection.from - 1, selection.from)
                  : ''

                if (charBefore === '[') {
                  // Second '[' - wrap selection with [[...]]
                  const tr = state.tr
                    .delete(selection.from - 1, selection.to)
                    .insertText(`[[${selectedText}]]`, selection.from - 1)

                  view.dispatch(tr)
                  return true
                } else {
                  // First '[' - insert before selection and keep selection active
                  const tr = state.tr.insertText('[', selection.from)

                  // Create new selection on the updated document
                  const newSelection = state.selection.constructor.create(
                    tr.doc,
                    selection.from + 1,
                    selection.to + 1
                  )

                  tr.setSelection(newSelection)
                  view.dispatch(tr)
                  return true
                }
              }
            }

            return false
          },
        },
      }),
    ]
  },
})

function findWikiLinks(doc: any, selection: any): DecorationSet {
  const decorations: Decoration[] = []
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
  const cursorPos = selection ? selection.$from.pos : null

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) {
      return
    }

    const text = node.text
    if (!text) {
      return
    }

    let match
    while ((match = wikiLinkRegex.exec(text))) {
      const start = pos + match.index
      const end = start + match[0].length
      const linkText = match[1]

      // Check if cursor is within or immediately adjacent to this link
      const cursorInLink = cursorPos !== null && cursorPos >= start && cursorPos <= end

      // Hide the opening [[ (or show if cursor is in link)
      decorations.push(
        Decoration.inline(start, start + 2, {
          class: cursorInLink ? 'wiki-link-bracket wiki-link-bracket-active' : 'wiki-link-bracket',
        })
      )

      // Style the link text
      decorations.push(
        Decoration.inline(start + 2, end - 2, {
          class: 'wiki-link-text',
          'data-link-text': linkText,
        })
      )

      // Hide the closing ]] (or show if cursor is in link)
      decorations.push(
        Decoration.inline(end - 2, end, {
          class: cursorInLink ? 'wiki-link-bracket wiki-link-bracket-active' : 'wiki-link-bracket',
        })
      )

      // Add overall clickable decoration
      decorations.push(
        Decoration.inline(start, end, {
          class: 'wiki-link',
          'data-link-text': linkText,
        })
      )
    }
  })

  return DecorationSet.create(doc, decorations)
}

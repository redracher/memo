import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface HashtagOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    hashtag: {
      setHashtag: () => ReturnType
    }
  }
}

export const Hashtag = Mark.create<HashtagOptions>({
  name: 'hashtag',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  inclusive() {
    return true
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor
        const { selection } = state
        const { $from } = selection

        // Check if cursor is inside a hashtag mark
        const hashtagMark = $from.marks().find(mark => mark.type.name === 'hashtag')

        if (hashtagMark) {
          // Find the end of the hashtag mark
          let endPos = $from.pos
          const node = $from.parent
          const nodeStart = $from.start()

          // Search forward to find where the hashtag mark ends
          for (let i = $from.parentOffset; i < node.content.size; i++) {
            const pos = nodeStart + i
            const marks = state.doc.resolve(pos).marks()
            const hasHashtag = marks.some(m => m.type.name === 'hashtag')
            if (!hasHashtag) {
              endPos = pos
              break
            }
            endPos = pos + 1
          }

          // Move cursor to end of hashtag, then split block
          return editor
            .chain()
            .setTextSelection(endPos)
            .splitBlock()
            .run()
        }

        return false
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-hashtag]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-hashtag': '', class: 'hashtag-pill' }), 0]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hashtagAutoMark'),
        appendTransaction: (transactions, oldState, newState) => {
          const docChanged = transactions.some(tr => tr.docChanged)
          if (!docChanged) return null

          const tr = newState.tr
          let modified = false

          newState.doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return

            const hashtagRegex = /#[\w-]+/g
            let match
            const matches: Array<{ start: number; end: number }> = []

            // Find all hashtag matches first
            while ((match = hashtagRegex.exec(node.text))) {
              matches.push({
                start: pos + match.index,
                end: pos + match.index + match[0].length,
              })
            }

            // For each match, ensure the entire range is marked
            matches.forEach(({ start, end }) => {
              // Remove any existing hashtag marks in this range first
              tr.removeMark(start, end, newState.schema.marks.hashtag)
              // Add the mark to the full range
              tr.addMark(start, end, newState.schema.marks.hashtag.create())
              modified = true
            })
          })

          return modified ? tr : null
        },
      }),
    ]
  },
})

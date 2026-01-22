import { Node } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import { Component } from 'react'
import tippy from 'tippy.js'

export interface NoteMentionOptions {
  HTMLAttributes: Record<string, any>
  suggestion: any
  onLinkClick?: (linkText: string) => void
}

interface NoteSuggestionProps {
  items: Array<{ id: string; title: string; query?: string }>
  command: (item: { id: string; title: string; query?: string }) => void
}

class NoteSuggestionList extends Component<NoteSuggestionProps> {
  state = {
    selectedIndex: 0,
  }

  componentDidUpdate(oldProps: NoteSuggestionProps) {
    if (this.props.items !== oldProps.items) {
      this.setState({ selectedIndex: 0 })
    }
  }

  onKeyDown = ({ event }: { event: KeyboardEvent }): boolean => {
    if (event.key === 'ArrowUp') {
      this.upHandler()
      return true
    }

    if (event.key === 'ArrowDown') {
      this.downHandler()
      return true
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      this.enterHandler()
      return true
    }

    return false
  }

  upHandler = () => {
    this.setState({
      selectedIndex: (this.state.selectedIndex + this.props.items.length - 1) % this.props.items.length,
    })
  }

  downHandler = () => {
    this.setState({
      selectedIndex: (this.state.selectedIndex + 1) % this.props.items.length,
    })
  }

  enterHandler = () => {
    this.selectItem(this.state.selectedIndex)
  }

  selectItem = (index: number) => {
    const item = this.props.items[index]
    if (item) {
      this.props.command(item)
    }
  }

  render() {
    const { items } = this.props

    if (items.length === 0) {
      return null
    }

    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 px-1 max-w-xs">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => this.selectItem(index)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm ${
              index === this.state.selectedIndex
                ? 'bg-gray-100'
                : 'hover:bg-gray-50'
            }`}
          >
            <span className="text-gray-700">{item.title || 'Untitled'}</span>
          </button>
        ))}
      </div>
    )
  }
}

// Export the suggestion list for use in TiptapEditor
export { NoteSuggestionList }

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteMention: {
      setNoteMention: () => ReturnType
    }
  }
}

export const NoteMention = Node.create<NoteMentionOptions>({
  name: 'noteMention',

  addOptions() {
    const extension = this

    return {
      HTMLAttributes: {},
      onLinkClick: undefined,
      suggestion: {
        char: '@',
        pluginKey: new PluginKey('noteMentionSuggestion'),
        items: ({ query }: { query: string }) => {
          // This will be overridden by configure()
          return []
        },
        command: ({ editor, range, props }: any) => {
          const nodeAfter = editor.view.state.selection.$to.nodeAfter
          const overrideSpace = nodeAfter?.text?.startsWith(' ')

          if (overrideSpace) {
            range.to += 1
          }

          // Use the full note title when selected, not the partial query
          const typedText = props.title || props.query

          // Get the trigger character from the range
          const triggerChar = editor.state.doc.textBetween(range.from - 1, range.from)

          let linkText = ''
          if (triggerChar === '@') {
            linkText = `@${typedText}`
          } else if (triggerChar === '+') {
            linkText = `+${typedText}`
          } else {
            // For [[ trigger
            linkText = `[[${typedText}]]`
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: 'text',
                text: linkText,
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run()

          // If this is a new note being created (id === 'new'), trigger navigation
          if (props.id === 'new' && extension.options.onLinkClick && typedText) {
            // Small delay to let the text insertion complete
            setTimeout(() => {
              extension.options.onLinkClick!(typedText)
            }, 100)
          }
        },
        render: () => {
          let component: any
          let popup: any

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(NoteSuggestionList, {
                props,
                editor: props.editor,
              })

              if (!props.clientRect) {
                return
              }

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })
            },

            onUpdate(props: any) {
              if (component) {
                component.updateProps(props)
              }

              if (!props.clientRect) {
                return
              }

              if (popup && popup[0]) {
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                })
              }
            },

            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                if (popup && popup[0]) {
                  popup[0].hide()
                }
                return true
              }

              return component?.ref?.onKeyDown(props)
            },

            onExit() {
              if (popup && popup[0]) {
                popup[0].destroy()
              }
              if (component) {
                component.destroy()
              }
            },
          }
        },
        allow: ({ state, range }: any) => {
          // Allow suggestions in any text context
          return true
        },
      },
    }
  },

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  parseHTML() {
    return [
      {
        tag: 'span[data-note-mention]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, 'data-note-mention': '' }, 0]
  },

  addProseMirrorPlugins() {
    const onLinkClick = this.options.onLinkClick

    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
      new Plugin({
        key: new PluginKey('noteMentionDecoration'),
        state: {
          init(_, { doc }) {
            return findNoteMentions(doc)
          },
          apply(transaction, oldState) {
            return transaction.docChanged ? findNoteMentions(transaction.doc) : oldState
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement

            if (target.classList.contains('note-mention-text')) {
              const linkText = target.getAttribute('data-link-text')
              if (linkText && onLinkClick) {
                event.preventDefault()
                onLinkClick(linkText)
                return true
              }
            }

            return false
          },
        },
      }),
    ]
  },
})

function findNoteMentions(doc: any): DecorationSet {
  const decorations: Decoration[] = []
  // Match @NoteName, +NoteName, or [[NoteName]]
  const mentionRegex = /(@[\w-]+|\+[\w-]+|\[\[[^\]]+\]\])/g

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) {
      return
    }

    const text = node.text
    if (!text) {
      return
    }

    let match
    while ((match = mentionRegex.exec(text))) {
      const start = pos + match.index
      const end = start + match[0].length
      const fullText = match[0]

      let linkText = ''
      let cssClass = ''

      if (fullText.startsWith('@')) {
        linkText = fullText.substring(1)
        cssClass = 'note-mention-at'
      } else if (fullText.startsWith('+')) {
        linkText = fullText.substring(1)
        cssClass = 'note-mention-plus'
      } else if (fullText.startsWith('[[')) {
        linkText = fullText.substring(2, fullText.length - 2)
        cssClass = 'note-mention-wiki'
      }

      decorations.push(
        Decoration.inline(start, end, {
          class: `note-mention-text ${cssClass}`,
          'data-link-text': linkText,
        })
      )
    }
  })

  return DecorationSet.create(doc, decorations)
}

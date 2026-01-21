import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import { Component } from 'react'
import tippy, { Instance as TippyInstance } from 'tippy.js'

export interface HashtagOptions {
  HTMLAttributes: Record<string, any>
  suggestion: any
}

interface HashtagSuggestionProps {
  items: string[]
  command: (item: string) => void
}

class HashtagSuggestionList extends Component<HashtagSuggestionProps> {
  state = {
    selectedIndex: 0,
  }

  componentDidUpdate(oldProps: HashtagSuggestionProps) {
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
            key={item}
            onClick={() => this.selectItem(index)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm ${
              index === this.state.selectedIndex
                ? 'bg-gray-100'
                : 'hover:bg-gray-50'
            }`}
          >
            <span className="text-purple-600">#{item}</span>
          </button>
        ))}
      </div>
    )
  }
}

// Export the suggestion list for use in TiptapEditor
export { HashtagSuggestionList }

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
      suggestion: {
        char: '#',
        pluginKey: new PluginKey('hashtagSuggestion'),
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

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: 'text',
                text: '#' + props,
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run()
        },
        render: () => {
          let component: any
          let popup: any

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(HashtagSuggestionList, {
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

  parseHTML() {
    return [
      {
        tag: 'span[data-hashtag]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-hashtag': '' }), 0]
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
      new Plugin({
        key: new PluginKey('hashtag'),
        state: {
          init(_, { doc }) {
            return findHashtags(doc)
          },
          apply(transaction, oldState) {
            return transaction.docChanged ? findHashtags(transaction.doc) : oldState
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})

function findHashtags(doc: any): DecorationSet {
  const decorations: Decoration[] = []
  const hashtagRegex = /#[\w-]+/g

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) {
      return
    }

    const text = node.text
    if (!text) {
      return
    }

    let match
    while ((match = hashtagRegex.exec(text))) {
      const start = pos + match.index
      const end = start + match[0].length

      decorations.push(
        Decoration.inline(start, end, {
          class: 'hashtag-pill',
        })
      )
    }
  })

  return DecorationSet.create(doc, decorations)
}

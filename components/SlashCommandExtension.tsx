import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import { PluginKey } from '@tiptap/pm/state'
import Suggestion from '@tiptap/suggestion'
import { Component } from 'react'
import tippy, { Instance as TippyInstance } from 'tippy.js'

export interface SlashCommandItem {
  title: string
  description: string
  command: ({ editor, range }: any) => void
}

interface SlashCommandListProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}

class SlashCommandList extends Component<SlashCommandListProps> {
  state = {
    selectedIndex: 0,
  }

  componentDidUpdate(oldProps: SlashCommandListProps) {
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

    if (event.key === 'Enter') {
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
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-2 px-1 max-w-xs">
        {this.props.items.length ? (
          this.props.items.map((item, index) => (
            <button
              key={index}
              onClick={() => this.selectItem(index)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-start gap-2 ${
                index === this.state.selectedIndex
                  ? 'bg-gray-100'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mt-0.5 text-purple-400">✦</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {item.title}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {item.description}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="text-sm text-gray-500 px-3 py-2">No results</div>
        )}
      </div>
    )
  }
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        pluginKey: new PluginKey('slashCommand'),
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
        items: ({ query }: { query: string }) => {
          const items: SlashCommandItem[] = [
            {
              title: '/ai',
              description: 'Expand on this',
              command: ({ editor, range }) => {
                // Get the text on the current line before the slash
                const { state } = editor
                const { $from } = state.selection
                const lineStart = $from.start()
                const lineEnd = range.from
                const lineText = state.doc.textBetween(lineStart, lineEnd).trim()

                // Delete the slash command
                editor.commands.deleteRange(range)

                // Insert placeholder in new paragraph
                editor.chain()
                  .insertContent({
                    type: 'paragraph',
                    content: [{ type: 'text', text: '✦AI-WRITING✦' }]
                  })
                  .run()

                const event = new CustomEvent('ai-command', {
                  detail: { type: 'expand', editor, range, lineText }
                })
                window.dispatchEvent(event)
              },
            },
          ]

          return items.filter(item =>
            item.title.toLowerCase().includes(query.toLowerCase())
          )
        },
        render: () => {
          let component: ReactRenderer
          let popup: TippyInstance[]

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashCommandList, {
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
              component.updateProps(props)

              if (!props.clientRect) {
                return
              }

              popup[0].setProps({
                getReferenceClientRect: props.clientRect,
              })
            },

            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                popup[0].hide()
                return true
              }

              return (component.ref as any)?.onKeyDown(props)
            },

            onExit() {
              popup[0].destroy()
              component.destroy()
            },
          }
        },
      }),
    ]
  },
})

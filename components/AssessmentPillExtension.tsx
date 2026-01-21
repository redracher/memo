import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useEffect, useState } from 'react'

const AssessmentPillComponent = (props: any) => {
  const { node, editor } = props
  const { assessment, date } = node.attrs

  const handleClick = () => {
    // Dispatch custom event to open modal
    const event = new CustomEvent('openAssessmentModal', {
      detail: { assessment, date }
    })
    window.dispatchEvent(event)
  }

  return (
    <NodeViewWrapper className="inline-block">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full text-sm font-medium transition-colors cursor-pointer"
        contentEditable={false}
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
        AI Assessment - {new Date(date).toLocaleDateString()}
      </button>
    </NodeViewWrapper>
  )
}

export const AssessmentPill = Node.create({
  name: 'assessmentPill',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      assessment: {
        default: '',
      },
      date: {
        default: new Date().toISOString(),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="assessment-pill"]',
        getAttrs: (dom: any) => ({
          assessment: dom.getAttribute('data-assessment'),
          date: dom.getAttribute('data-date'),
        }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'assessment-pill',
        'data-assessment': node.attrs.assessment,
        'data-date': node.attrs.date,
      }),
      '✨ AI Assessment',
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AssessmentPillComponent)
  },
})

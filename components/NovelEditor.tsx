'use client'

import { EditorRoot, EditorContent } from 'novel'
import { useState, useEffect } from 'react'

interface NovelEditorProps {
  initialContent?: any
  onUpdate?: (content: any) => void
}

export default function NovelEditor({ initialContent, onUpdate }: NovelEditorProps) {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  if (!hydrated) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-gray-400">
        Loading editor...
      </div>
    )
  }

  return (
    <EditorRoot>
      <EditorContent
        immediatelyRender={false}
        initialContent={initialContent}
        editorProps={{
          attributes: {
            class: 'prose prose-lg prose-stone dark:prose-invert max-w-none focus:outline-none',
          },
        }}
        onUpdate={({ editor }) => {
          if (onUpdate && editor) {
            const json = editor.getJSON()
            onUpdate(json)
          }
        }}
        slotAfter={<div className="h-32" />}
      />
    </EditorRoot>
  )
}

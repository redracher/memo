'use client'

import { useState, useEffect, useRef } from 'react'
import * as React from 'react'
import { X, Copy, Plus, Star } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface AIPressureTestPanelProps {
  isOpen: boolean
  onClose: () => void
  noteTitle: string
  noteContent: any
  onAppendToNote: (text: string) => void
}

export default function AIPressureTestPanel({
  isOpen,
  onClose,
  noteTitle,
  noteContent,
  onAppendToNote
}: AIPressureTestPanelProps) {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const hasRunRef = useRef(false)
  const lastAnalyzedContentRef = useRef<string>('')
  const cachedResponseRef = useRef<string>('')

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Run analysis only once when panel opens
      if (!hasRunRef.current) {
        hasRunRef.current = true
        runPressureTest()
      }
    } else {
      // Clear response and reset flag when panel closes
      setResponse('')
      setError('')
      hasRunRef.current = false
      // Note: We keep the cache (lastAnalyzedContentRef and cachedResponseRef)
      // so we can reuse it if the content hasn't changed
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const extractTextFromContent = (content: any): string => {
    if (!content) return ''

    let text = ''

    const traverse = (node: any) => {
      if (node.type === 'text') {
        text += node.text
      } else if (node.content) {
        node.content.forEach((child: any) => traverse(child))
      }

      // Add spacing between blocks
      if (node.type === 'paragraph' || node.type === 'heading') {
        text += '\n'
      }
    }

    traverse(content)
    return text.trim()
  }

  const runPressureTest = async () => {
    console.log('Starting pressure test...')
    setLoading(true)
    setError('')
    setResponse('')

    try {
      const noteText = extractTextFromContent(noteContent)
      console.log('Note text extracted, length:', noteText.length)

      // Create a cache key from title + content
      const contentKey = `${noteTitle}:::${noteText}`

      // Check if we have a cached response for this exact content
      if (contentKey === lastAnalyzedContentRef.current && cachedResponseRef.current) {
        console.log('Using cached assessment (content unchanged)')
        setResponse(cachedResponseRef.current)
        setLoading(false)
        return
      }

      const prompt = `You are a critical investment analyst. Review the following investment thesis and provide a structured assessment.

Investment Thesis: ${noteTitle}

Content:
${noteText}

Format your response exactly as follows:

## Summary

Provide 3-4 bullet points of the most critical pushback against this investment. Be direct and specific.

## Key Assumptions Thesis Relies On

List each key assumption (3-5 assumptions) with a label at the end:
- [Assumption statement] - [Solid/Ok/Weak]
- [Assumption statement] - [Solid/Ok/Weak]
- [Assumption statement] - [Solid/Ok/Weak]

Use "Solid" for well-supported assumptions, "Ok" for reasonable but uncertain ones, "Weak" for questionable or risky assumptions.

## Analysis of Assumptions

For each assumption you labeled "Weak" or "Ok" above, create a subsection:

**[Exact assumption statement from above]**

Provide 2-3 sentences explaining why it's concerning and what could go wrong.

## Other Risks and Gaps

Provide 3-4 additional observations, concerns, or considerations about this investment.

## Questions to Validate to Strengthen Thesis

List the top 3 most critical, actionable questions that need answers before committing capital. Focus on the questions that would most significantly impact the investment decision.

Be direct, critical, and constructive.`

      console.log('Sending fetch request...')
      const res = await fetch('/api/pressure-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      console.log('Fetch completed, status:', res.status)

      if (!res.ok) {
        throw new Error('Failed to analyze note')
      }

      console.log('Parsing JSON...')
      const data = await res.json()
      console.log('Received data:', data)
      console.log('Response length:', data.response?.length)
      console.log('Setting response state...')
      setResponse(data.response)

      // Cache the response
      lastAnalyzedContentRef.current = contentKey
      cachedResponseRef.current = data.response
      console.log('Response cached')

      console.log('Response state set!')
    } catch (err) {
      console.error('Error running pressure test:', err)
      setError('Failed to analyze note. Please try again.')
    } finally {
      console.log('Finally block - setting loading to false')
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(response)
  }

  const handleAppend = () => {
    onAppendToNote(response)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 h-screen w-full md:w-[40%] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 h-[72px] border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-text flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
            AI Assessment
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Analyzing investment thesis...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {response && (
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown
                components={{
                  h1: ({ ...props }) => <h1 className="text-2xl font-bold mt-6 mb-3 text-gray-900" {...props} />,
                  h2: ({ children, ...props }) => {
                    // Special styling for Summary section
                    if (children === 'Summary') {
                      return (
                        <h2 className="text-xl font-semibold text-gray-900 mt-0 mb-3 bg-gray-100 border-l-4 border-purple-400 p-4" {...props}>
                          {children}
                        </h2>
                      )
                    }
                    return <h2 className="text-xl font-semibold mt-5 mb-2 text-gray-900" {...props}>{children}</h2>
                  },
                  h3: ({ ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900" {...props} />,
                  p: ({ ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
                  ul: ({ ...props }) => <ul className="list-disc pl-6 mb-3 space-y-1" {...props} />,
                  ol: ({ ...props }) => <ol className="list-decimal pl-6 mb-3 space-y-1" {...props} />,
                  li: ({ children, ...props }) => {
                    // Convert children to string to check for labels
                    const textContent = React.Children.toArray(children).map((child: any) => {
                      if (typeof child === 'string') return child;
                      if (child?.props?.children) {
                        if (typeof child.props.children === 'string') return child.props.children;
                        if (Array.isArray(child.props.children)) {
                          return child.props.children.map((c: any) => typeof c === 'string' ? c : '').join('');
                        }
                      }
                      return '';
                    }).join('');

                    // Debug logging
                    if (textContent.includes('Solid') || textContent.includes('Ok') || textContent.includes('Weak')) {
                      console.log('List item text:', textContent);
                    }

                    const solidMatch = textContent.match(/^(.+?)\s*-\s*\[?Solid\]?$/i);
                    const okMatch = textContent.match(/^(.+?)\s*-\s*\[?Ok\]?$/i);
                    const weakMatch = textContent.match(/^(.+?)\s*-\s*\[?Weak\]?$/i);

                    if (solidMatch) {
                      return (
                        <li className="leading-relaxed" {...props}>
                          {solidMatch[1].trim()}{' '}
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            Solid
                          </span>
                        </li>
                      );
                    } else if (okMatch) {
                      return (
                        <li className="leading-relaxed" {...props}>
                          {okMatch[1].trim()}{' '}
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                            Ok
                          </span>
                        </li>
                      );
                    } else if (weakMatch) {
                      return (
                        <li className="leading-relaxed" {...props}>
                          {weakMatch[1].trim()}{' '}
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                            Weak
                          </span>
                        </li>
                      );
                    }

                    return <li className="leading-relaxed" {...props}>{children}</li>;
                  },
                  strong: ({ children, ...props }) => {
                    // Check if this bold text contains an assumption with a label
                    const textContent = React.Children.toArray(children).map((child: any) => {
                      if (typeof child === 'string') return child;
                      if (child?.props?.children) {
                        if (typeof child.props.children === 'string') return child.props.children;
                        if (Array.isArray(child.props.children)) {
                          return child.props.children.map((c: any) => typeof c === 'string' ? c : '').join('');
                        }
                      }
                      return '';
                    }).join('');

                    // Debug logging for bold assumptions
                    if (textContent.includes('Solid') || textContent.includes('Ok') || textContent.includes('Weak')) {
                      console.log('Bold text:', textContent);
                    }

                    const solidMatch = textContent.match(/^(.+?)\s*-\s*\[?Solid\]?$/i);
                    const okMatch = textContent.match(/^(.+?)\s*-\s*\[?Ok\]?$/i);
                    const weakMatch = textContent.match(/^(.+?)\s*-\s*\[?Weak\]?$/i);

                    if (solidMatch) {
                      return (
                        <strong className="font-semibold text-gray-900" {...props}>
                          {solidMatch[1].trim()}{' '}
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            Solid
                          </span>
                        </strong>
                      );
                    } else if (okMatch) {
                      return (
                        <strong className="font-semibold text-gray-900" {...props}>
                          {okMatch[1].trim()}{' '}
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                            Ok
                          </span>
                        </strong>
                      );
                    } else if (weakMatch) {
                      return (
                        <strong className="font-semibold text-gray-900" {...props}>
                          {weakMatch[1].trim()}{' '}
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                            Weak
                          </span>
                        </strong>
                      );
                    }

                    return <strong className="font-semibold text-gray-900" {...props}>{children}</strong>;
                  },
                  em: ({ ...props }) => <em className="italic" {...props} />,
                }}
              >
                {response}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {response && (
          <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
            <button
              onClick={handleAppend}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Append to Note
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>
        )}
      </div>
    </>
  )
}

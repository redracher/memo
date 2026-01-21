'use client'

import { useEffect, useState } from 'react'
import * as React from 'react'
import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function AssessmentModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [assessment, setAssessment] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const handleOpen = (event: any) => {
      setAssessment(event.detail.assessment)
      setDate(event.detail.date)
      setIsOpen(true)
    }

    window.addEventListener('openAssessmentModal', handleOpen)

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('openAssessmentModal', handleOpen)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Assessment</h2>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown
                components={{
                  h1: ({ ...props }) => <h1 className="text-2xl font-bold mt-6 mb-3 text-gray-900" {...props} />,
                  h2: ({ children, ...props }) => {
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
                {assessment}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

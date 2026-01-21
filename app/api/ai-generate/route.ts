import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { type, noteTitle, noteContent, textToExpand } = await request.json()

    if (!noteContent || noteContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'No content provided' },
        { status: 400 }
      )
    }

    // Use provided text, or fall back to last line of content
    const contentToExpand = textToExpand || noteContent.split('\n').filter(l => l.trim()).slice(-1).join('\n')

    const prompt = `You're helping analyze an investment thesis for ${noteTitle}.

Full context:
${noteContent}

The user just wrote: "${contentToExpand}"

Expand on this with specific, concrete details. Add data points, examples, or implications that go deeper. Avoid generic statements. Be specific to ${noteTitle}. 2-3 sentences, under 300 chars. Plain text, no markdown, no **.`


    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const response = message.content[0].type === 'text'
      ? message.content[0].text
      : ''


    return NextResponse.json({ response })
  } catch (error) {
    console.error('Error in AI generation:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}

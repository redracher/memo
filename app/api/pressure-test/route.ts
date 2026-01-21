import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    console.log('Pressure test API called')
    const { prompt } = await request.json()

    if (!prompt) {
      console.log('No prompt provided')
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      console.error('API key not configured')
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }

    console.log('Making request to Anthropic API...')
    console.log('API Key format check:', apiKey.substring(0, 10) + '...')

    const anthropic = new Anthropic({
      apiKey: apiKey,
    })

    console.log('Anthropic client created, sending message...')
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    console.log('Received response from Anthropic API')

    let response = ''
    if (message.content && message.content.length > 0 && message.content[0].type === 'text') {
      response = message.content[0].text
      console.log('Response extracted, length:', response.length)
    } else {
      console.log('No text content in response')
    }

    console.log('Returning JSON response...')
    return NextResponse.json({ response })
  } catch (error: any) {
    console.error('Error calling Anthropic API:', error)
    console.error('Error details:', error.message, error.status)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze note' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'

// Simple in-memory cache for stock prices (cache until end of day)
const priceCache = new Map<string, { price: number; timestamp: number; cacheDate: string }>()

interface StockPriceResponse {
  ticker: string
  currentPrice: number | null
  historicalPrice: number | null
  error?: string
}

// Get current date in YYYY-MM-DD format (ET timezone)
function getCurrentDateET(): string {
  const now = new Date()
  // Approximate ET by subtracting 5 hours (not perfect but good enough for cache)
  const etDate = new Date(now.getTime() - (5 * 60 * 60 * 1000))
  return etDate.toISOString().split('T')[0]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker')?.toUpperCase()
    const date = searchParams.get('date') // Optional: YYYY-MM-DD format

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker symbol is required' },
        { status: 400 }
      )
    }

    // Check cache for current price (cache per day)
    const today = getCurrentDateET()
    const cacheKey = `${ticker}-current-${today}`
    const cached = priceCache.get(cacheKey)
    const now = Date.now()

    let currentPrice: number | null = null

    if (cached && cached.cacheDate === today) {
      // Use cached price from today
      currentPrice = cached.price
    } else {
      // Fetch current price from Yahoo Finance
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
        const response = await fetch(url)
        const data = await response.json()

        if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
          currentPrice = data.chart.result[0].meta.regularMarketPrice
          // Cache the price for the day (only if we have a valid price)
          if (currentPrice !== null) {
            priceCache.set(cacheKey, { price: currentPrice, timestamp: now, cacheDate: today })
          }
        }
      } catch (error) {
        console.error(`Error fetching current price for ${ticker}:`, error)
      }
    }

    let historicalPrice: number | null = null

    // Fetch historical price if date is provided
    if (date) {
      try {
        // Convert date to Unix timestamp
        const targetDate = new Date(date)
        const startTimestamp = Math.floor(targetDate.getTime() / 1000)
        const endTimestamp = startTimestamp + 86400 // +1 day

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`
        const response = await fetch(url)
        const data = await response.json()

        if (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
          const closePrices = data.chart.result[0].indicators.quote[0].close
          // Get the first non-null close price
          historicalPrice = closePrices.find((price: number | null) => price !== null) || null
        }
      } catch (error) {
        console.error(`Error fetching historical price for ${ticker} on ${date}:`, error)
      }
    }

    const response: StockPriceResponse = {
      ticker,
      currentPrice,
      historicalPrice,
    }

    if (currentPrice === null && historicalPrice === null) {
      response.error = 'Could not fetch price data'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Stock price API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

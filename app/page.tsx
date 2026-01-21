import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between">
        <Link href="/" className="text-xl font-medium text-[#1a1a1a] tracking-wide hover:opacity-70 transition-opacity">
          memo
        </Link>
        <Link
          href="/login"
          className="text-sm text-gray-500 hover:text-[#1a1a1a] transition-colors"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center pl-8">
        <div className="max-w-[600px] py-48">
          <h1 className="text-6xl font-normal text-[#1a1a1a] mb-8 tracking-tight whitespace-nowrap" style={{ letterSpacing: '-0.02em', lineHeight: '1' }}>
            Organize your money ideas
          </h1>
          <p className="text-lg text-gray-500 mb-12 leading-relaxed tracking-wide whitespace-nowrap" style={{ lineHeight: '1.8' }}>
            A focused workspace for serious investors to journal, connect ideas, and refine their process.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-[#3a3a3a] text-white rounded-md hover:bg-[#2a2a2a] transition-colors text-base font-medium tracking-wide"
          >
            Get Started
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-12 space-y-4">
        <div className="text-xs text-gray-400 tracking-wide">
          <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link> • <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
        </div>
      </footer>
    </div>
  )
}

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      {/* Header */}
      <header className="px-8 py-6">
        <Link href="/" className="text-xl font-medium text-[#1a1a1a] tracking-wide hover:opacity-70 transition-opacity">
          memo
        </Link>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-8 pb-16">
        <h1 className="text-4xl font-normal text-[#1a1a1a] mb-4 tracking-tight">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: January 21, 2026</p>

        <div className="space-y-8 text-[#1a1a1a]">
          <section>
            <h2 className="text-xl font-medium mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing and using Memo, you agree to be bound by these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              Memo is a personal research and journaling tool for tracking investment ideas and analysis. It is an educational tool only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">3. No Financial Advice</h2>
            <p className="text-gray-600 leading-relaxed">
              Memo and its AI features provide informational content only, and not financial, investment, tax, or legal advice. You are solely responsible for your investment decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">4. AI-Generated Content</h2>
            <p className="text-gray-600 leading-relaxed">
              AI-generated analysis is for educational purposes and may contain errors. Always conduct your own research and due diligence.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">5. User Responsibilities</h2>
            <ul className="list-disc list-inside text-gray-600 leading-relaxed space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You will not use the service for illegal purposes</li>
              <li>You own all content you create</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">6. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              Memo is provided "as is" without warranties. We are not liable for investment losses or decisions made using this tool.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">7. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update these terms. Continued use constitutes acceptance of changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">8. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions: <a href="mailto:davkail@gmail.com" className="text-[#1a1a1a] underline hover:opacity-70 transition-opacity">davkail@gmail.com</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

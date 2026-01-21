import Link from 'next/link'

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-normal text-[#1a1a1a] mb-4 tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: January 21, 2026</p>

        <div className="space-y-8 text-[#1a1a1a]">
          <section>
            <h2 className="text-xl font-medium mb-3">Information We Collect</h2>
            <ul className="list-disc list-inside text-gray-600 leading-relaxed space-y-2">
              <li>Email address and name (for account creation)</li>
              <li>Notes and content you create</li>
              <li>Usage data (analytics)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-600 leading-relaxed space-y-2">
              <li>To provide the service</li>
              <li>To improve the product</li>
              <li>To communicate with you about your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">Data Storage</h2>
            <ul className="list-disc list-inside text-gray-600 leading-relaxed space-y-2">
              <li>Your data is stored securely on Supabase</li>
              <li>We use industry-standard encryption</li>
              <li>Your notes are private and only accessible to you</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">AI Features</h2>
            <ul className="list-disc list-inside text-gray-600 leading-relaxed space-y-2">
              <li>When you use AI features, your note content is sent to Anthropic's Claude API</li>
              <li>Anthropic's API does not train on your data</li>
              <li>See Anthropic's privacy policy for details</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed mb-2">We use:</p>
            <ul className="list-disc list-inside text-gray-600 leading-relaxed space-y-2">
              <li>Supabase (database and authentication)</li>
              <li>Anthropic Claude (AI features)</li>
              <li>Vercel (hosting)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">Your Rights</h2>
            <ul className="list-disc list-inside text-gray-600 leading-relaxed space-y-2">
              <li>You can export your data at any time</li>
              <li>You can delete your account and all data</li>
              <li>You can request a copy of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">Changes to Privacy Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this policy. We'll notify users of significant changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              For privacy questions: <a href="mailto:davkail@gmail.com" className="text-[#1a1a1a] underline hover:opacity-70 transition-opacity">davkail@gmail.com</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

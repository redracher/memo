'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    console.log('Form submitted:', { isSignUp, email })

    try {
      if (isSignUp) {
        console.log('Attempting signup...')
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        console.log('Signup response:', { data, error: signUpError })

        if (signUpError) {
          console.error('Signup error:', signUpError)
          setError(signUpError.message)
          setLoading(false)
          return
        }

        if (data.user) {
          console.log('Signup successful! User:', data.user.id)

          // Create profile record
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              first_name: firstName,
              last_name: lastName,
            })

          if (profileError) {
            console.error('Profile creation error:', profileError)
            // Continue anyway, profile can be added later
          }

          console.log('Redirecting to /dashboard...')
          router.push('/dashboard')
        } else {
          console.warn('Signup returned no user')
          setError('Signup failed. Please try again.')
        }
      } else {
        console.log('Attempting login...')
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        console.log('Login response:', { data, error: signInError })

        if (signInError) {
          console.error('Login error:', signInError)
          setError(signInError.message)
          setLoading(false)
          return
        }

        if (data.user) {
          console.log('Login successful! User:', data.user.id)
          console.log('Redirecting to /dashboard...')
          router.push('/dashboard')
        } else {
          console.warn('Login returned no user')
          setError('Login failed. Please try again.')
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">
      {/* Header */}
     <header className="px-8 py-6">
      <Link href="/" className="text-xl font-medium text-[#1a1a1a] tracking-wide hover:opacity-70 transition-opacity">
        memo
      </Link>
    </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-white rounded-lg">
        <h1 className="text-2xl font-normal text-text mb-6">
          {isSignUp ? 'Sign up' : 'Sign in'}
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-text mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-text"
                  placeholder="Enter your first name"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-text mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-text"
                  placeholder="Enter your last name"
                  required
                  disabled={loading}
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-text"
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-text"
              placeholder="Enter your password"
              required
              minLength={6}
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-[#3a3a3a] text-white rounded-lg hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
              setFirstName('')
              setLastName('')
            }}
            className="text-gray-500 hover:text-[#1a1a1a] transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-8 py-6">
        <div className="text-xs text-gray-400 tracking-wide text-center">
          <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link> • <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
        </div>
      </footer>
    </div>
  )
}

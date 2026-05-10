// app/auth/page.tsx — 新規登録 / ログイン (CSR)

'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useActionState, useState, Suspense } from 'react'
import { signUpAction } from '@/server/actions/auth'

// ---- ログインフォーム ----
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('メールアドレスまたはパスワードが正しくありません')
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
          メールアドレス
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
          パスワード
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="8文字以上"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  )
}

// ---- サインアップフォーム ----
function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter()

  const [state, action, isPending] = useActionState(
    async (_prev: { success: false; error: string; field?: string } | null, formData: FormData) => {
      const email = formData.get('email') as string
      const password = formData.get('password') as string
      const result = await signUpAction(formData)
      if (result.success) {
        const signInResult = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })
        if (signInResult?.error) {
          return { success: false as const, error: 'アカウントは作成されましたが、ログインに失敗しました。ログインページからサインインしてください。', field: 'general' as const }
        }
        router.push('/dashboard')
        router.refresh()
        onSuccess()
        return null
      }
      return result
    },
    null
  )

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">
          名前 <span className="text-red-500">*</span>
        </label>
        <input
          id="signup-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
            state?.field === 'name' ? 'border-red-400' : 'border-gray-300'
          }`}
          placeholder="例: 山田 太郎"
        />
        {state?.field === 'name' && (
          <p className="text-xs text-red-600 mt-1">{state?.error}</p>
        )}
      </div>

      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
            state?.field === 'email' ? 'border-red-400' : 'border-gray-300'
          }`}
          placeholder="you@example.com"
        />
        {state?.field === 'email' && (
          <p className="text-xs text-red-600 mt-1">{state?.error}</p>
        )}
      </div>

      <div>
        <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
          パスワード <span className="text-red-500">*</span>
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
            state?.field === 'password' ? 'border-red-400' : 'border-gray-300'
          }`}
          placeholder="8文字以上"
        />
        {state?.field === 'password' && (
          <p className="text-xs text-red-600 mt-1">{state?.error}</p>
        )}
      </div>

      {state?.field === 'general' && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {state?.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? '登録中...' : '無料で登録する'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        登録することで
        <a href="/terms" className="underline hover:text-gray-600">利用規約</a>
        および
        <a href="/privacy" className="underline hover:text-gray-600">プライバシーポリシー</a>
        に同意したものとみなします。
      </p>
    </form>
  )
}

// ---- メインページ ----
function AuthPageInner() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* ロゴ */}
        <div className="text-center mb-6">
          <a href="/" className="text-2xl font-bold text-purple-600">CreatorLinks</a>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'login' ? 'アカウントにログイン' : '無料アカウントを作成'}
          </p>
        </div>

        {/* タブ切替 */}
        <div className="flex border border-gray-200 rounded-lg p-1 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              mode === 'login' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ログイン
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              mode === 'signup' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            新規登録
          </button>
        </div>

        {/* Google OAuth */}
        <button
          onClick={() => signIn('google', { callbackUrl })}
          className="w-full border border-gray-300 rounded-lg py-3 flex items-center justify-center gap-3 hover:bg-gray-50 transition mb-5 text-sm font-medium text-gray-700"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Google で{mode === 'login' ? 'ログイン' : '登録'}
        </button>

        {/* セパレーター */}
        <div className="relative mb-5">
          <hr className="border-gray-200" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-gray-400 text-xs">
            またはメールアドレスで
          </span>
        </div>

        {/* フォーム切替 */}
        {mode === 'login' ? (
          <LoginForm />
        ) : (
          <SignUpForm onSuccess={() => setMode('login')} />
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">読み込み中...</div></div>}>
      <AuthPageInner />
    </Suspense>
  )
}

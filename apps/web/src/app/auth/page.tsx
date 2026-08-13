// app/auth/page.tsx — 新規登録 / ログイン (CSR)

'use client'

import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useActionState, useState, Suspense } from 'react'
import { signUpAction, signUpAsGuestAction } from '@/server/actions/auth'
import PasswordInput from '@/components/ui/password-input'
import { SITE_NAME } from '@/lib/brand'

// ---- ログインフォーム ----
function LoginForm() {
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

    if (result?.error) {
      setLoading(false)
      setError('メールアドレスまたはパスワードが正しくありません')
    } else {
      // フルリロードで新しい auth cookie をサーバーに確実に伝える
      window.location.href = '/dashboard'
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
        <PasswordInput
          id="login-password"
          name="password"
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

      <p className="text-center text-xs">
        <Link href="/auth/forgot" className="text-gray-500 hover:text-purple-600 hover:underline">
          パスワードを忘れた方はこちら
        </Link>
      </p>
    </form>
  )
}

// ---- サインアップフォーム ----
function SignUpForm({ onSuccess: _onSuccess }: { onSuccess: () => void }) {
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
        // フルリロードで新しい auth cookie をサーバーに確実に伝える。
        // signup 直後は onboarding（仕事仲間招待ステップ）へ誘導。
        window.location.href = '/onboarding'
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
        <PasswordInput
          id="signup-password"
          name="password"
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

// ---- ゲストログインボタン ----
function GuestLoginButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGuestLogin = async () => {
    setError(null)
    setLoading(true)
    const result = await signUpAsGuestAction()
    if (!result.success) {
      setLoading(false)
      setError(result.error)
      return
    }
    const signInResult = await signIn('credentials', {
      email: result.email,
      password: result.password,
      redirect: false,
    })
    if (signInResult?.error) {
      setLoading(false)
      setError('ゲストログインに失敗しました')
      return
    }
    window.location.href = '/dashboard'
  }

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={handleGuestLogin}
        disabled={loading}
        className="w-full border-2 border-dashed border-purple-400 bg-purple-50 text-purple-700 rounded-lg py-3 text-sm font-bold hover:bg-purple-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'ゲストアカウントを作成中...' : '登録なしでお試し（24時間有効）'}
      </button>
      <p className="text-center text-xs text-gray-400 mt-2">
        テスト用アカウントです。24 時間後に自動削除されます。
      </p>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-2">
          {error}
        </p>
      )}
    </div>
  )
}

// ---- メインページ ----
function AuthPageInner() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* ロゴ */}
        <div className="text-center mb-6">
          <a href="/" className="text-2xl font-bold text-purple-600">{SITE_NAME}</a>
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

        {/* ゲストログイン */}
        <GuestLoginButton />

        {/* セパレーター */}
        <div className="relative mb-5">
          <hr className="border-gray-200" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-gray-400 text-xs">
            メールアドレスで
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

import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { apiErrorMessage } from '../api/errorMessage'
import { useAuth } from '../auth/authContext'
import { ROLE_HOME } from '../auth/roles'
import { FullPageMessage } from '../components/FullPageMessage'
import { Logo } from '../components/Logo'
import { Alert, Button, TextField } from '../components/ui'

const MOCKS_ENABLED = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== 'false'

const LOGIN_ERRORS = {
  401: 'Nieprawidłowy login lub hasło.',
  403: 'Twoje konto nie zostało zaimportowane do systemu. Skontaktuj się z administratorem.',
}

export function LoginPage() {
  const { state, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (state.status === 'loading') return <FullPageMessage>Ładowanie…</FullPageMessage>
  if (state.status === 'authenticated' && !submitting) {
    return <Navigate to={ROLE_HOME[state.user.role]} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loginValue.trim() === '' || password === '') {
      setError('Podaj login i hasło.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const user = await login({ login: loginValue.trim(), password })
      // Return to the page that required login, but only within the user's own area.
      const from = (location.state as { from?: unknown } | null)?.from
      const home = ROLE_HOME[user.role]
      navigate(typeof from === 'string' && from.startsWith(home) ? from : home, { replace: true })
    } catch (caught) {
      setError(apiErrorMessage(caught, LOGIN_ERRORS))
      setPassword('')
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-dvh content-start md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:content-stretch">
      {/* On phones only the logo and title stay above the form, so the keyboard never hides it. */}
      <aside className="flex flex-col justify-between gap-4 bg-header bg-pixel-dots px-6 py-5 text-on-header md:gap-10 md:px-12 md:py-12">
        <Logo />
        <div className="flex max-w-lg flex-col gap-4">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight md:text-5xl">
            Grywalizacja zajęć bez arkuszy kalkulacyjnych
          </h1>
          <p className="hidden text-lg text-on-header/75 md:block">
            Prowadzący ustala fabułę, rangi i nagrody dla grupy. Student widzi swoje postępy,
            miejsce w rankingu i korzyści na zaliczeniu.
          </p>
        </div>
        <p className="hidden text-sm text-on-header/60 md:block">
          Wydział Matematyki i Informatyki · Uniwersytet im. Adama Mickiewicza w Poznaniu
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-10 md:px-12">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-3xl font-semibold tracking-tight">Zaloguj się</h2>
            <p className="text-muted">Użyj konta wydziałowego w domenie LABS.</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <TextField
              id="login"
              name="username"
              label="Login"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              required
              value={loginValue}
              onChange={(event) => setLoginValue(event.target.value)}
              disabled={submitting}
              autoFocus
            />
            <TextField
              id="current-password"
              name="password"
              label="Hasło"
              type="password"
              autoComplete="current-password"
              enterKeyHint="done"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
            />
            {error !== null && <Alert tone="error">{error}</Alert>}
            <Button type="submit" disabled={submitting} className="mt-1 w-full">
              {submitting ? 'Logowanie…' : 'Zaloguj się'}
            </Button>
          </form>

          <p className="border-t border-line pt-4 text-sm text-muted">
            Hasło sprawdza serwer wydziałowy (LDAP). QuestClass go nie przechowuje.
          </p>
          {MOCKS_ENABLED && (
            <p className="rounded-ui bg-surface-muted px-3 py-2 text-xs text-muted">
              Tryb demo — hasło <code className="font-mono">haslo</code>:{' '}
              <code className="font-mono">admin</code>,{' '}
              <code className="font-mono">nauczyciel</code>,{' '}
              <code className="font-mono">student</code>. Konto{' '}
              <code className="font-mono">nowy</code> nie jest zaimportowane.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

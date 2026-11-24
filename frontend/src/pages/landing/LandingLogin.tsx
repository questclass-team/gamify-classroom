import { useId, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/authContext'
import { ROLE_HOME } from '../../auth/roles'
import { EyeIcon, EyeOffIcon, KeyIcon, SpinnerIcon } from '../../components/blask/icons'
import { checkLoginForm, loginFailure, loginTarget, type LoginProblem } from './loginForm'

const MOCKS_ENABLED = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== 'false'

interface LoginCardProps {
  /** Id of the login input, so a header button can focus it. */
  loginId?: string
  className?: string
  headingLevel?: 'h2' | 'h3'
  /** True while a sign-in runs, so the page does not redirect before the form does. */
  onPendingChange: (pending: boolean) => void
  /** The page answers the attempt with light: true when the sign-in went through. */
  onAnswer?: (accepted: boolean) => void
}

/** The login form: labelled fields, field-level errors, a busy state, live regions. */
export function LoginCard({
  loginId,
  className = '',
  headingLevel = 'h2',
  onPendingChange,
  onAnswer,
}: LoginCardProps) {
  const id = useId()
  const loginInputId = loginId ?? `${id}-login`
  const { login: signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [problem, setProblem] = useState<LoginProblem | null>(null)
  const [pending, setPending] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const loginRef = useRef<HTMLInputElement>(null)
  const Heading = headingLevel

  const refuse = (found: LoginProblem) => {
    setProblem(found)
    onAnswer?.(false)
    // The refusal answers with the message, the field state and a dim of the light; nothing
    // moves. Focus goes to the field to fix (the password after a wrong pair).
    const first = found.fields.includes('login') && login.trim() === '' ? 'login' : 'password'
    ;(first === 'login' ? loginRef : passwordRef).current?.focus()
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    const invalid = checkLoginForm(login, password)
    if (invalid) {
      refuse(invalid)
      return
    }
    setProblem(null)
    setPending(true)
    onPendingChange(true)
    try {
      const user = await signIn({ login: login.trim(), password })
      onAnswer?.(true)
      const from = (location.state as { from?: unknown } | null)?.from
      navigate(loginTarget(from, ROLE_HOME[user.role]), { replace: true })
    } catch (caught) {
      setPassword('')
      setPending(false)
      onPendingChange(false)
      refuse(loginFailure(caught))
    }
  }

  const loginInvalid = problem?.fields.includes('login') ?? false
  const passwordInvalid = problem?.fields.includes('password') ?? false
  const errorId = `${id}-error`

  return (
    <div className={`blask-login blask-surface-raised p-6 sm:p-7 ${className}`}>
      <Heading className="blask-display text-[1.625rem] leading-[1.08] tracking-[-0.02em]">
        Zaloguj się kontem wydziałowym
      </Heading>
      <form noValidate onSubmit={onSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-1.5">
          <label htmlFor={loginInputId} className="text-sm font-semibold">
            Login
          </label>
          <input
            ref={loginRef}
            id={loginInputId}
            name="username"
            className="blask-input"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            required
            value={login}
            readOnly={pending}
            aria-invalid={loginInvalid || undefined}
            aria-describedby={problem ? errorId : undefined}
            onChange={(event) => {
              setLogin(event.target.value)
              if (problem) setProblem(null)
            }}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={`${id}-password`} className="text-sm font-semibold">
            Hasło
          </label>
          <div className="relative">
            <input
              ref={passwordRef}
              id={`${id}-password`}
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="blask-input pr-12"
              autoComplete="current-password"
              enterKeyHint="done"
              required
              value={password}
              readOnly={pending}
              aria-invalid={passwordInvalid || undefined}
              aria-describedby={problem ? errorId : undefined}
              onChange={(event) => {
                setPassword(event.target.value)
                if (problem) setProblem(null)
              }}
            />
            <button
              type="button"
              className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-[9px] text-blask-graphite transition-colors hover:bg-blask-peri-soft hover:text-blask-ink active:bg-blask-haze max-sm:right-0.5 max-sm:size-11"
              aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? (
                <EyeOffIcon className="size-[18px]" />
              ) : (
                <EyeIcon className="size-[18px]" />
              )}
            </button>
          </div>
        </div>

        <p
          id={errorId}
          role="alert"
          className="text-sm leading-snug font-medium text-blask-raspberry empty:hidden"
        >
          {problem?.message ?? ''}
        </p>

        <button
          type="submit"
          className="blask-btn blask-btn-primary mt-1 h-12 w-full text-base"
          data-busy={pending || undefined}
          aria-disabled={pending || undefined}
        >
          {pending ? (
            <>
              <SpinnerIcon className="size-[18px]" />
              Logowanie…
            </>
          ) : (
            'Zaloguj się'
          )}
        </button>
        <p aria-live="polite" className="sr-only">
          {pending ? 'Logowanie…' : ''}
        </p>
      </form>
      <div className="mt-5 grid gap-2 border-t border-blask-line pt-4 text-sm leading-relaxed text-blask-graphite">
        <p>Hasło sprawdza serwer wydziałowy (LDAP). QuestClass go nie przechowuje.</p>
        {MOCKS_ENABLED && (
          <p className="flex items-start gap-2 text-blask-ink">
            <KeyIcon className="mt-0.5 size-4 text-blask-cobalt" />
            <span>
              Tryb demo, hasło <code className="font-mono">haslo</code>:{' '}
              <code className="font-mono">admin</code>,{' '}
              <code className="font-mono">nauczyciel</code>,{' '}
              <code className="font-mono">student</code>. Konto{' '}
              <code className="font-mono">nowy</code> nie jest zaimportowane.
            </span>
          </p>
        )}
      </div>
    </div>
  )
}

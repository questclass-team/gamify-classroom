import {
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

const BUTTON_VARIANTS = {
  primary:
    'border-transparent bg-primary text-on-primary shadow-[inset_0_-2px_0_rgb(0_0_0/0.22)] enabled:hover:bg-primary-hover',
  secondary: 'border-line-strong bg-surface text-fg enabled:hover:bg-surface-muted',
  ghost: 'border-current/40 bg-transparent text-inherit enabled:hover:border-current',
  danger:
    'border-transparent bg-error text-on-primary shadow-[inset_0_-2px_0_rgb(0_0_0/0.22)] enabled:hover:bg-error/90',
}

const BUTTON_SIZES = {
  md: 'min-h-10 px-4',
  sm: 'min-h-8 px-3',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS
  size?: keyof typeof BUTTON_SIZES
}) {
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-ui border-ui text-sm font-semibold transition-colors enabled:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 ${FOCUS_RING} ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

export function TextField({
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        className={`min-h-10 rounded-ui border-ui border-line-strong bg-surface px-3 text-fg placeholder:text-muted/70 disabled:opacity-60 ${FOCUS_RING}`}
        {...props}
      />
    </div>
  )
}

const ALERT_TONES = {
  error: { box: 'border-error/35 bg-error-soft text-error', icon: 'M12 7v6m0 4h.01' },
  info: { box: 'border-info/30 bg-info-soft text-fg', icon: 'M12 11v6m0-10h.01' },
  success: { box: 'border-success/35 bg-success-soft text-success', icon: 'm7.5 12.5 3 3 6-7' },
}

/** State is conveyed by icon and text, not by color alone. */
export function Alert({ tone, children }: { tone: keyof typeof ALERT_TONES; children: ReactNode }) {
  const { box, icon } = ALERT_TONES[tone]
  return (
    <div
      className={`flex items-start gap-2.5 rounded-ui border px-3 py-2.5 text-sm ${box}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <svg
        viewBox="0 0 24 24"
        className="mt-px size-4.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9.5" />
        <path d={icon} />
      </svg>
      <div>{children}</div>
    </div>
  )
}

/**
 * Keyboard-focusable table region named by its caption (styles: `.data-table` in global.css).
 * In a narrow container rows turn into cards: give cells `data-label` (column name shown before
 * the value), mark numbers with `data-numeric` and the row's buttons cell with `data-actions`.
 */
export function Table({ caption, children }: { caption: string; children: ReactNode }) {
  const captionId = useId()
  return (
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      className={`data-table-wrap overflow-x-auto rounded-ui border-ui border-line bg-surface ${FOCUS_RING}`}
    >
      <table className="data-table">
        <caption id={captionId}>{caption}</caption>
        {children}
      </table>
    </div>
  )
}

export function Panel({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={`flex flex-col gap-4 rounded-ui border-ui border-line bg-surface p-4 sm:p-6 ${className}`}
      {...props}
    />
  )
}

export function ErrorWithRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Alert tone="error">{message}</Alert>
      <Button variant="secondary" onClick={onRetry}>
        Spróbuj ponownie
      </Button>
    </div>
  )
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="flex flex-col gap-1.5 border-b border-line pb-5">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description !== undefined && <p className="max-w-2xl text-muted">{description}</p>}
    </header>
  )
}

export function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-semibold tracking-tight">
      {children}
    </h2>
  )
}

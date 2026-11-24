/**
 * primary: the one main action of a view; quiet: everything else (cancel, retry, row actions);
 * outline: a second action that still needs weight; danger: confirming a destructive action.
 */
export type ButtonVariant = 'primary' | 'quiet' | 'outline' | 'danger'
export type ButtonSize = 'md' | 'sm'

export interface ButtonLook {
  variant: ButtonVariant
  /** md: 44 px tall (default); sm: 36 px, for rows, panel heads and dense toolbars. */
  size?: ButtonSize
  className?: string
}

/** The kit classes of a button, for elements Button and LinkButton do not cover (e.g. a <label> or <summary>). */
export function buttonClass({ variant, size = 'md', className = '' }: ButtonLook) {
  return `blask-btn blask-btn-${variant} ${size === 'sm' ? 'blask-btn-sm' : ''} ${className}`
}

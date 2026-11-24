import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertIcon } from './icons'

interface FieldProps {
  label: ReactNode
  /** Help under the field, linked with aria-describedby. */
  hint?: ReactNode
  /** Shown under the field in raspberry with an icon; marks the control invalid. */
  error?: string | null
  /** Hides the label visually (screen readers keep it), e.g. when a column header names it. */
  labelHidden?: boolean
  /** A length counter beside the label, raspberry once over the limit (hidden from readers). */
  counter?: { length: number; max: number }
  /** Classes of the wrapper (layout: width, grid placement). */
  className?: string
}

/**
 * Label, control, hint and error in the kit's spacing; wires the ids so the control is named by
 * the label and described by the hint and the error.
 */
function Field({
  id,
  label,
  hint,
  error,
  labelHidden = false,
  counter,
  className = '',
  control,
}: FieldProps & { id: string; control: (described: string | undefined) => ReactNode }) {
  const described =
    [hint != null && `${id}-hint`, error != null && `${id}-error`].filter(Boolean).join(' ') ||
    undefined
  return (
    <div className={`blask-field ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={`blask-label ${labelHidden ? 'sr-only' : ''}`}>
          {label}
        </label>
        {counter !== undefined && (
          <span
            aria-hidden="true"
            className={`blask-num text-[0.8125rem] ${counter.length > counter.max ? 'font-semibold text-blask-raspberry' : 'text-blask-graphite'}`}
          >
            {counter.length}/{counter.max}
          </span>
        )}
      </div>
      {control(described)}
      {hint != null && (
        <p id={`${id}-hint`} className="blask-hint">
          {hint}
        </p>
      )}
      {error != null && (
        <p id={`${id}-error`} className="blask-field-error">
          <AlertIcon className="mt-0.5 size-3.5" />
          {error}
        </p>
      )}
    </div>
  )
}

/** A one-line text input (also email, number, search, password). */
export function TextField({
  label,
  hint,
  error,
  labelHidden,
  counter,
  className,
  id,
  ...props
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <Field
      {...{ id: fieldId, label, hint, error, labelHidden, counter, className }}
      control={(described) => (
        <input
          id={fieldId}
          className="blask-input"
          aria-invalid={error != null || undefined}
          aria-describedby={described}
          {...props}
        />
      )}
    />
  )
}

/** A multi-line text input; grows vertically by hand (resize). */
export function TextArea({
  label,
  hint,
  error,
  labelHidden,
  counter,
  className,
  id,
  rows = 3,
  ...props
}: FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <Field
      {...{ id: fieldId, label, hint, error, labelHidden, counter, className }}
      control={(described) => (
        <textarea
          id={fieldId}
          rows={rows}
          className="blask-input"
          aria-invalid={error != null || undefined}
          aria-describedby={described}
          {...props}
        />
      )}
    />
  )
}

/** A native select with the kit's chevron; pass `<option>`s as children. */
export function SelectField({
  label,
  hint,
  error,
  labelHidden,
  className,
  id,
  children,
  ...props
}: Omit<FieldProps, 'counter'> & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <Field
      {...{ id: fieldId, label, hint, error, labelHidden, className }}
      control={(described) => (
        <span className="blask-select">
          <select
            id={fieldId}
            className="blask-input"
            aria-invalid={error != null || undefined}
            aria-describedby={described}
            {...props}
          >
            {children}
          </select>
        </span>
      )}
    />
  )
}

/** A native checkbox with its label and an optional description under it; 44 px tall target. */
export function Checkbox({
  label,
  description,
  className = '',
  id,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> & {
  label: ReactNode
  description?: ReactNode
  className?: string
}) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <label htmlFor={fieldId} className={`blask-checkline ${className}`}>
      <input
        id={fieldId}
        type="checkbox"
        className="blask-check"
        aria-describedby={description != null ? `${fieldId}-description` : undefined}
        {...props}
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{label}</span>
        {description != null && (
          <span id={`${fieldId}-description`} className="blask-hint">
            {description}
          </span>
        )}
      </span>
    </label>
  )
}

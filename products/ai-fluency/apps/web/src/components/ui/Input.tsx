import { forwardRef, InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
  id: string;
  hideLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, error, hideLabel = false, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <label
          htmlFor={id}
          className={
            hideLabel
              ? 'sr-only'
              : 'mb-1 block text-sm font-medium text-gray-700'
          }
        >
          {label}
          {props.required && (
            <span className="ml-1 text-danger-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <input
          ref={ref}
          id={id}
          className={[
            'block w-full rounded-md border px-3 py-2 text-sm',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            error
              ? 'border-danger-500 focus:ring-danger-500'
              : 'border-gray-300',
            className,
          ].join(' ')}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-1 text-sm text-danger-500"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

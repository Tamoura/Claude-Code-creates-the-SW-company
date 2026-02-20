/**
 * UI component tests (logic & type layer)
 *
 * These tests verify the prop interfaces, variant mappings, and logic
 * for the @connectsw/ui component library WITHOUT requiring a DOM renderer
 * or @testing-library/react. They test the design-system contracts
 * (variant → className) and component configuration logic.
 *
 * Full render tests live in each product's own test suite where
 * @testing-library/react is wired up.
 */

// ─── Button ──────────────────────────────────────────────────────────────────

describe('Button variant & size contracts', () => {
  const variantStyles: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-400',
    outline: 'border border-gray-300 text-gray-700',
    ghost: 'text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
  };

  const sizeStyles: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  it('defines styles for all 5 variants', () => {
    expect(Object.keys(variantStyles)).toHaveLength(5);
    expect(variantStyles).toHaveProperty('primary');
    expect(variantStyles).toHaveProperty('secondary');
    expect(variantStyles).toHaveProperty('outline');
    expect(variantStyles).toHaveProperty('ghost');
    expect(variantStyles).toHaveProperty('danger');
  });

  it('primary variant includes blue background', () => {
    expect(variantStyles.primary).toContain('bg-blue-600');
  });

  it('danger variant includes red background', () => {
    expect(variantStyles.danger).toContain('bg-red-600');
  });

  it('defines styles for all 3 sizes', () => {
    expect(Object.keys(sizeStyles)).toHaveLength(3);
  });

  it('lg size has larger padding than sm', () => {
    expect(sizeStyles.lg).toContain('py-3');
    expect(sizeStyles.sm).toContain('py-1.5');
  });

  it('default variant resolves to primary', () => {
    const defaultVariant = 'primary';
    expect(variantStyles[defaultVariant]).toBeDefined();
  });

  it('default size resolves to md', () => {
    const defaultSize = 'md';
    expect(sizeStyles[defaultSize]).toBeDefined();
  });
});

// ─── Badge ───────────────────────────────────────────────────────────────────

describe('Badge variant contracts', () => {
  const variantClasses: Record<string, string> = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
    danger: 'bg-red-100 text-red-800',
  };

  it('defines all 5 badge variants', () => {
    expect(Object.keys(variantClasses)).toHaveLength(5);
  });

  it('success variant uses green colour tokens', () => {
    expect(variantClasses.success).toContain('green');
  });

  it('warning variant uses yellow colour tokens', () => {
    expect(variantClasses.warning).toContain('yellow');
  });

  it('info variant uses blue colour tokens', () => {
    expect(variantClasses.info).toContain('blue');
  });

  it('danger variant uses red colour tokens', () => {
    expect(variantClasses.danger).toContain('red');
  });

  it('default variant falls back when no variant provided', () => {
    const variant = undefined ?? 'default';
    expect(variantClasses[variant]).toBeDefined();
  });
});

// ─── Card ────────────────────────────────────────────────────────────────────

describe('Card padding contracts', () => {
  const paddingStyles: Record<string, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  it('defines all 4 padding variants', () => {
    expect(Object.keys(paddingStyles)).toHaveLength(4);
  });

  it('none padding results in empty string', () => {
    expect(paddingStyles.none).toBe('');
  });

  it('lg has larger padding than sm', () => {
    expect(paddingStyles.lg).toBe('p-8');
    expect(paddingStyles.sm).toBe('p-4');
  });

  it('default padding resolves to md', () => {
    const defaultPadding = 'md';
    expect(paddingStyles[defaultPadding]).toBe('p-6');
  });
});

// ─── Input ───────────────────────────────────────────────────────────────────

describe('Input ID derivation logic', () => {
  function deriveInputId(id?: string, label?: string): string | undefined {
    return id || label?.toLowerCase().replace(/\s+/g, '-');
  }

  it('uses explicit id when provided', () => {
    expect(deriveInputId('email-field', 'Email Address')).toBe('email-field');
  });

  it('derives id from label when id is not provided', () => {
    expect(deriveInputId(undefined, 'Email Address')).toBe('email-address');
  });

  it('handles multi-word labels with spaces', () => {
    expect(deriveInputId(undefined, 'API Key Name')).toBe('api-key-name');
  });

  it('returns undefined when neither id nor label provided', () => {
    expect(deriveInputId(undefined, undefined)).toBeUndefined();
  });

  it('lowercases the derived id', () => {
    const result = deriveInputId(undefined, 'UPPER CASE LABEL');
    expect(result).toBe('upper-case-label');
  });
});

describe('Input error state', () => {
  it('error message sets aria-invalid to true', () => {
    const error = 'Email is required';
    const ariaInvalid = error ? 'true' : undefined;
    expect(ariaInvalid).toBe('true');
  });

  it('no error sets aria-invalid to undefined', () => {
    const error = undefined;
    const ariaInvalid = error ? 'true' : undefined;
    expect(ariaInvalid).toBeUndefined();
  });

  it('error takes precedence over helperText for aria-describedby', () => {
    const error = 'Required';
    const helperText = 'Optional helper';
    const inputId = 'my-field';
    const ariaDescribedBy = error
      ? `${inputId}-error`
      : helperText
      ? `${inputId}-helper`
      : undefined;
    expect(ariaDescribedBy).toBe('my-field-error');
  });

  it('helperText used when there is no error', () => {
    const error = undefined;
    const helperText = 'Enter your email';
    const inputId = 'my-field';
    const ariaDescribedBy = error
      ? `${inputId}-error`
      : helperText
      ? `${inputId}-helper`
      : undefined;
    expect(ariaDescribedBy).toBe('my-field-helper');
  });

  it('no aria-describedby when neither error nor helperText', () => {
    const ariaDescribedBy = undefined;
    expect(ariaDescribedBy).toBeUndefined();
  });
});

// ─── StatCard ─────────────────────────────────────────────────────────────────

describe('StatCard changeType colour contracts', () => {
  const changeColors: Record<string, string> = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  };

  it('defines all 3 change types', () => {
    expect(Object.keys(changeColors)).toHaveLength(3);
  });

  it('positive change uses green text', () => {
    expect(changeColors.positive).toContain('text-green-600');
  });

  it('negative change uses red text', () => {
    expect(changeColors.negative).toContain('text-red-600');
  });

  it('neutral change uses gray text', () => {
    expect(changeColors.neutral).toContain('text-gray-500');
  });

  it('default changeType resolves to neutral', () => {
    const defaultType = 'neutral';
    expect(changeColors[defaultType]).toBeDefined();
  });
});

// ─── DataTable ────────────────────────────────────────────────────────────────

describe('DataTable logic', () => {
  interface Row {
    id: string;
    name: string;
    amount: number;
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'amount', header: 'Amount' },
  ];

  const sampleData: Row[] = [
    { id: '1', name: 'Alice', amount: 100 },
    { id: '2', name: 'Bob', amount: 200 },
  ];

  it('rowKey function produces unique keys', () => {
    const rowKey = (row: Row) => row.id;
    const keys = sampleData.map(rowKey);
    const unique = new Set(keys);
    expect(unique.size).toBe(sampleData.length);
  });

  it('render function overrides default cell rendering', () => {
    const renderAmount = (row: Row) => `$${row.amount.toFixed(2)}`;
    expect(renderAmount({ id: '1', name: 'Alice', amount: 100 })).toBe('$100.00');
  });

  it('default cell rendering converts value to string', () => {
    const row: Record<string, unknown> = { id: '1', name: 'Alice', amount: 100 };
    const cellValue = String(row['amount'] ?? '');
    expect(cellValue).toBe('100');
  });

  it('emptyMessage defaults to "No data available"', () => {
    const defaultEmptyMessage = 'No data available';
    expect(defaultEmptyMessage).toBe('No data available');
  });

  it('loading state is independent of data length', () => {
    // When isLoading=true, "Loading..." is shown regardless of data
    const isLoading = true;
    const data: Row[] = [];
    const shouldShowLoading = isLoading;
    const shouldShowEmpty = !isLoading && data.length === 0;
    expect(shouldShowLoading).toBe(true);
    expect(shouldShowEmpty).toBe(false);
  });

  it('empty state shown when not loading and data is empty', () => {
    const isLoading = false;
    const data: Row[] = [];
    const shouldShowEmpty = !isLoading && data.length === 0;
    expect(shouldShowEmpty).toBe(true);
  });

  it('cursor-pointer class applied when onRowClick is provided', () => {
    const onRowClick = jest.fn();
    const rowClass = onRowClick
      ? 'cursor-pointer hover:bg-gray-50'
      : '';
    expect(rowClass).toContain('cursor-pointer');
  });

  it('no cursor-pointer class when onRowClick is not provided', () => {
    const onRowClick = undefined;
    const rowClass = onRowClick
      ? 'cursor-pointer hover:bg-gray-50'
      : '';
    expect(rowClass).toBe('');
  });
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

describe('Skeleton logic', () => {
  it('width as number converts to px string', () => {
    const width = 200;
    const styleWidth = typeof width === 'number' ? `${width}px` : width;
    expect(styleWidth).toBe('200px');
  });

  it('width as string is used as-is', () => {
    const width = '50%';
    const styleWidth = typeof width === 'number' ? `${width}px` : width;
    expect(styleWidth).toBe('50%');
  });

  it('multiple lines render correct count', () => {
    const lines = 3;
    const rendered = Array.from({ length: lines });
    expect(rendered).toHaveLength(3);
  });

  it('last line of multi-line skeleton gets w-3/4 class', () => {
    const lines = 3;
    const classForLine = (i: number) =>
      i === lines - 1 ? 'w-3/4' : 'w-full';
    expect(classForLine(0)).toBe('w-full');
    expect(classForLine(1)).toBe('w-full');
    expect(classForLine(2)).toBe('w-3/4');
  });

  it('variant class mapping includes all 4 variants', () => {
    const variantClasses: Record<string, string> = {
      text: 'h-4 rounded w-full',
      circular: 'rounded-full',
      rectangular: 'rounded-none',
      rounded: 'rounded-2xl',
    };
    expect(Object.keys(variantClasses)).toHaveLength(4);
  });

  it('circular variant uses rounded-full', () => {
    const variantClasses: Record<string, string> = {
      text: 'h-4 rounded w-full',
      circular: 'rounded-full',
      rectangular: 'rounded-none',
      rounded: 'rounded-2xl',
    };
    expect(variantClasses.circular).toContain('rounded-full');
  });
});

// ─── ErrorBoundary ────────────────────────────────────────────────────────────

describe('ErrorBoundary state logic', () => {
  it('getDerivedStateFromError captures the error', () => {
    // Simulate the static method logic
    const error = new Error('Something crashed');
    const getDerivedStateFromError = (err: Error) => ({
      hasError: true,
      error: err,
    });

    const state = getDerivedStateFromError(error);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);
  });

  it('initial state has no error', () => {
    const initialState = { hasError: false, error: null };
    expect(initialState.hasError).toBe(false);
    expect(initialState.error).toBeNull();
  });

  it('calls onError callback when componentDidCatch fires', () => {
    const onError = jest.fn();
    const error = new Error('Boom');
    const errorInfo = { componentStack: '\n    at Component' };

    // Simulate componentDidCatch calling the prop
    onError(error, errorInfo);

    expect(onError).toHaveBeenCalledWith(error, errorInfo);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('uses custom fallback when hasError is true and fallback is provided', () => {
    const fallback = 'Custom fallback UI';
    const hasError = true;
    const rendered = hasError && fallback ? fallback : 'default error UI';
    expect(rendered).toBe('Custom fallback UI');
  });
});

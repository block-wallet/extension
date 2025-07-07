
export const themeColors = {
  bg: {
    primary: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800',
    tertiary: 'bg-gray-100 dark:bg-gray-700',
    hover: 'hover:bg-gray-100 dark:hover:bg-gray-800',
    active: 'bg-gray-200 dark:bg-gray-600',
  },

  text: {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-600 dark:text-gray-300',
    tertiary: 'text-gray-500 dark:text-gray-400',
    muted: 'text-gray-400 dark:text-gray-500',
  },

  border: {
    primary: 'border-gray-300 dark:border-gray-600',
    secondary: 'border-gray-200 dark:border-gray-700',
    light: 'border-gray-100 dark:border-gray-800',
  },

  status: {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800/50',
      text: 'text-green-900 dark:text-green-100',
      icon: 'text-green-600 dark:text-green-400',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800/50',
      text: 'text-amber-900 dark:text-amber-100',
      icon: 'text-amber-600 dark:text-amber-400',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800/50',
      text: 'text-red-900 dark:text-red-100',
      icon: 'text-red-600 dark:text-red-400',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800/50',
      text: 'text-blue-900 dark:text-blue-100',
      icon: 'text-blue-600 dark:text-blue-400',
    },
  },

  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100',
    danger: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white',
    success: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white',
  },

  input: {
    base: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100',
    focus: 'focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent',
    error: 'border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400',
    disabled: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  },
} as const

export const cn = (...classes: (string | undefined | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}

export const getAlertClasses = (type: 'success' | 'warning' | 'error' | 'info') => {
  const baseClasses = 'p-4 rounded-lg border-l-4 transition-colors duration-150'
  const typeClasses = themeColors.status[type]

  return cn(
    baseClasses,
    typeClasses.bg,
    typeClasses.border,
    typeClasses.text
  )
}

export const getButtonClasses = (
  variant: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md',
  fullWidth = false
) => {
  const baseClasses = 'font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const variantClasses = themeColors.button[variant]
  const widthClasses = fullWidth ? 'w-full' : ''

  return cn(
    baseClasses,
    sizeClasses[size],
    variantClasses,
    widthClasses
  )
}

export const getInputClasses = (hasError = false, disabled = false) => {
  const baseClasses = 'w-full px-4 py-3 rounded-lg transition-colors duration-150'

  if (disabled) {
    return cn(baseClasses, themeColors.input.disabled)
  }

  if (hasError) {
    return cn(baseClasses, themeColors.input.error)
  }

  return cn(baseClasses, themeColors.input.base, themeColors.input.focus)
}

export const animations = {
  fadeIn: 'animate-in fade-in duration-200',
  fadeOut: 'animate-out fade-out duration-200',
  slideIn: 'animate-in slide-in-from-top-4 duration-300',
  slideOut: 'animate-out slide-out-to-top-4 duration-300',
  scaleIn: 'animate-in zoom-in-95 duration-200',
  scaleOut: 'animate-out zoom-out-95 duration-200',
} as const

export const layouts = {
  container: 'max-w-md w-full mx-auto',
  card: cn(themeColors.bg.primary, themeColors.border.primary, 'border rounded-lg shadow-sm'),
  modal: cn(themeColors.bg.primary, 'rounded-lg shadow-xl max-w-md w-full mx-4'),
  formField: 'space-y-2',
  buttonGroup: 'flex space-x-3',
  stack: 'space-y-4',
} as const

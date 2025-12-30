// Schemat kolorów dla komponentów - eliminuje duplikację klas Tailwind
export const colorSchemes = {
  amber: {
    bg: 'bg-amber-500/10',
    bgHover: 'hover:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    borderHover: 'hover:border-amber-500/50',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    bgHover: 'hover:bg-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
    borderHover: 'hover:border-cyan-500/50',
  },
  fuchsia: {
    bg: 'bg-fuchsia-500/10',
    bgHover: 'hover:bg-fuchsia-500/20',
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    border: 'border-fuchsia-500/30',
    borderHover: 'hover:border-fuchsia-500/50',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    bgHover: 'hover:bg-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/30',
    borderHover: 'hover:border-indigo-500/50',
  },
  green: {
    bg: 'bg-green-500/10',
    bgHover: 'hover:bg-green-500/20',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/30',
    borderHover: 'hover:border-green-500/50',
  },
  red: {
    bg: 'bg-red-500/10',
    bgHover: 'hover:bg-red-500/20',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/30',
    borderHover: 'hover:border-red-500/50',
  },
  orange: {
    bg: 'bg-orange-500/10',
    bgHover: 'hover:bg-orange-500/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/40',
    borderHover: 'hover:border-orange-500/60',
  },
} as const;

export type ColorScheme = keyof typeof colorSchemes;

// Klasy animacji dla przycisków
export const buttonAnimations = {
  scale: 'hover:scale-[1.02] active:scale-[0.98] transition-all duration-150',
} as const;

// Helper do generowania pełnej klasy kolorystycznej dla przycisku
export function getColorButtonClasses(color: ColorScheme): string {
  const scheme = colorSchemes[color];
  return `${scheme.bg} ${scheme.text} ${scheme.border} ${scheme.bgHover} ${scheme.borderHover}`;
}

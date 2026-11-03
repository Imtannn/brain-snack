/** Labels under the Drippy mark while the application hydrates. */

const LOADING_LABELS = [
  'Loading experience...',
  'Style is a way to say who you are without having to speak.',
  'Elegance is refusal.',
  'Simplicity is the keynote of all true elegance.',
  'Fashion fades; style is eternal.',
  'Clothes mean nothing until someone lives in them.',
  'Dress like you are already where you want to be.',
  'Fashion is the armor to survive everyday life.',
  'Create your own visual style — let it be unique and identifiable.',
  'What you wear is how you present yourself to the world.',
  'Good design is honest.',
  'Details create perfection, and perfection is not a detail.',
  'Less is more — until it is not enough.',
  'Wear the mood you want to feel.',
  'Confidence is the best look. Rock it and own it.',
  'Trends come and go; personal style stays.',
  'Every look is a first impression in progress.',
] as const

type LoadingLabel = (typeof LOADING_LABELS)[number]

export const DEFAULT_LOADING_LABEL: LoadingLabel = 'Loading experience...'

export const QUOTE_ROTATE_MS = 4200

/** Random quote order; loading line always first. */
export function createLoadingLabelRotation(): LoadingLabel[] {
  const quotes = LOADING_LABELS.filter((label) => label !== DEFAULT_LOADING_LABEL)
  for (let i = quotes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = quotes[i]!
    quotes[i] = quotes[j]!
    quotes[j] = temp
  }
  return [DEFAULT_LOADING_LABEL, ...quotes]
}

/** Public Drippy mark (shared `public/images/D.webp`). */
export function drippyMarkSrc(): string {
  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}images/D.webp`
}

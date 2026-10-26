import type { BridgeKind } from './model'

export function Silhouette({ kind }: { kind: BridgeKind }) {
  return <svg viewBox="0 0 100 40" fill="none" aria-hidden="true"><path d="M5 28H95M15 28V37M85 28V37" />
    {kind === 'beam' && <path d="M15 31H85M15 25H85" />}
    {kind === 'arch' && <path d="M15 37Q50 -2 85 37M28 28V24M40 28V19M60 28V19M72 28V24" />}
    {kind === 'suspension' && <path d="M22 37V4M78 37V4M5 29L22 7Q50 31 78 7L95 29M30 28V13M40 28V18M50 28V19M60 28V18M70 28V13" />}
    {kind === 'stayed' && <path d="M50 37V3M10 28L50 5L90 28M25 28L50 5L75 28M38 28L50 5L62 28" />}
  </svg>
}

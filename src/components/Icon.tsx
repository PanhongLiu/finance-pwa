import type { CSSProperties, ReactNode } from 'react'

export type IconName =
  | 'pen'
  | 'wallet'
  | 'list'
  | 'settings'
  | 'alert'
  | 'check'
  | 'trash'
  | 'plus'
  | 'spinner'
  | 'close'
  | 'download'
  | 'upload'

const PATHS: Record<IconName, ReactNode> = {
  pen: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1" />
      <path d="M3 8v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <circle cx="16" cy="13.5" r="1.3" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3.5 6h.01" />
      <path d="M3.5 12h.01" />
      <path d="M3.5 18h.01" />
    </>
  ),
  settings: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="9" cy="7" r="2.2" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="15" cy="17" r="2.2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.5 19.5h19Z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <line x1="12" y1="17" x2="12" y2="17.4" />
    </>
  ),
  check: <path d="M5 12.5 10 17.5 19.5 6.5" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  spinner: <path d="M12 3a9 9 0 1 0 9 9" />,
  close: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  upload: (
    <>
      <path d="M12 21V9" />
      <path d="M7 13l5-5 5 5" />
      <path d="M4 4h16" />
    </>
  )
}

export function Icon({
  name,
  size = 24,
  color,
  spin = false,
  className,
  style
}: {
  name: IconName
  size?: number
  color?: string
  spin?: boolean
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: 'none', ...(spin ? { animation: 'icon-spin 0.9s linear infinite' } : {}), ...style }}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}

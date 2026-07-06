const MARK_PATH =
  'M13 5 H35 Q38 5 38 8 V38 L34.5 43 L31 38 L27.5 43 L24 38 L20.5 43 L17 38 L13.5 43 L10 38 V8 Q10 5 13 5 Z ' +
  'M15.5 10 H32.5 Q34 10 34 11.5 Q34 13 32.5 13 H15.5 Q14 13 14 11.5 Q14 10 15.5 10 Z ' +
  'M15.5 15 H24.5 Q26 15 26 16.5 Q26 18 24.5 18 H15.5 Q14 18 14 16.5 Q14 15 15.5 15 Z ' +
  'M20 21 V27.5 H18 V21 H15 V30.5 H20 V34 H23 V21 Z ' +
  'M25 21 H33 V29.5 H28 V31 H33 V34 H25 V26.5 H30 V24 H25 Z'

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="var(--accent)" fillRule="evenodd" d={MARK_PATH} />
    </svg>
  )
}

export function Logo({
  markSize = 24,
  textClassName = 'text-lg',
  stacked = false,
}: {
  markSize?: number
  textClassName?: string
  stacked?: boolean
}) {
  return (
    <span className={`inline-flex items-center ${stacked ? 'flex-col gap-2' : 'gap-2'}`}>
      <LogoMark size={markSize} />
      <span className={`font-bold tracking-tight ${textClassName}`} style={{ color: 'var(--text)' }}>
        Recibo<span style={{ color: 'var(--accent)' }}>42</span>
      </span>
    </span>
  )
}

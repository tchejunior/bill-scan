export function SkeletonCard() {
  return (
    <div className="flex justify-between items-center py-3 border-b animate-pulse" style={{ borderColor: 'var(--border)' }}>
      <div className="space-y-2">
        <div className="h-3 w-32 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-2 w-20 rounded" style={{ background: 'var(--border)' }} />
      </div>
      <div className="h-3 w-16 rounded" style={{ background: 'var(--border)' }} />
    </div>
  )
}

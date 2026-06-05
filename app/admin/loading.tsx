export default function AdminLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-live="polite" aria-label="Loading admin page">
      <div className="flex items-center gap-3 rounded-lg border border-purple/25 bg-[#0F0D1A]/95 px-4 py-3 shadow-2xl shadow-purple/10">
        <span className="w-5 h-5 rounded-full border-2 border-accent/25 border-t-accent animate-spin" aria-hidden="true" />
        <span className="font-mono text-xs text-accent">Loading</span>
      </div>
    </div>
  )
}

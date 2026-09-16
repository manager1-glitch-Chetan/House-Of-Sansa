export default function SectionHeading({ children }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-4 w-1 rounded-full bg-hos-gold-500" />
      <h2 className="text-xs font-bold uppercase tracking-wider text-hos-ink-500">{children}</h2>
    </div>
  )
}

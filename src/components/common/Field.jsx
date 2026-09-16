export function Field({ label, required, error, children, hint, className }) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-hos-ink-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function TextInput(props) {
  return <input className="input" {...props} />
}

export function Select({ options = [], placeholder = 'Select…', ...props }) {
  return (
    <select className="input" {...props}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>
          {o.label ?? o}
        </option>
      ))}
    </select>
  )
}

export function TextArea(props) {
  return <textarea className="input" rows={3} {...props} />
}

import { useRef } from 'react'
import { Paperclip, X, FileText, Image as ImageIcon, Download } from 'lucide-react'
import { filesToAttachments, downloadDataUrl } from '@/lib/utils'

export default function FileUpload({ label, value = [], onChange, multiple = true, disabled }) {
  const inputRef = useRef(null)

  const handleFiles = async (e) => {
    const attachments = await filesToAttachments(e.target.files)
    onChange?.(multiple ? [...value, ...attachments] : attachments)
    e.target.value = ''
  }

  const removeAt = (id) => {
    onChange?.(value.filter((a) => a.id !== id))
  }

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {value.map((a) => (
          <div key={a.id} className="group relative flex items-center gap-1.5 rounded-lg border border-hos-ink-200 bg-hos-ink-50 px-2.5 py-1.5 text-xs">
            {a.type?.startsWith('image/') ? <ImageIcon size={13} /> : <FileText size={13} />}
            <span className="max-w-[140px] truncate">{a.name}</span>
            <button type="button" className="text-hos-ink-400 hover:text-hos-ink-700" onClick={() => downloadDataUrl(a.dataUrl, a.name)}>
              <Download size={12} />
            </button>
            {!disabled && (
              <button type="button" className="text-hos-ink-400 hover:text-red-600" onClick={() => removeAt(a.id)}>
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-hos-ink-300 px-3 py-1.5 text-xs font-medium text-hos-ink-600 hover:border-hos-gold-400 hover:text-hos-gold-600"
          >
            <Paperclip size={13} /> Attach File{multiple ? 's' : ''}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" multiple={multiple} className="hidden" onChange={handleFiles} />
    </div>
  )
}

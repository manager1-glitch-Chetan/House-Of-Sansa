import { ImageIcon } from 'lucide-react'
import Modal from '@/components/common/Modal'

/**
 * Table-cell button showing how many reference images an order has — click
 * to open them in <ReferenceImagesModal>. Stops propagation so it works
 * inside clickable rows (Orders list rows open the order).
 */
export function ReferenceImagesButton({ images, onOpen }) {
  if (!images?.length) return <span className="text-xs text-hos-ink-300">—</span>
  return (
    <button
      className="inline-flex items-center gap-1 rounded-lg border border-hos-ink-200 px-2 py-1 text-xs font-medium text-hos-ink-600 hover:bg-hos-gold-50"
      onClick={(e) => {
        e.stopPropagation()
        onOpen(images)
      }}
    >
      <ImageIcon size={13} /> {images.length}
    </button>
  )
}

export function ReferenceImagesModal({ images, onClose }) {
  return (
    <Modal open={!!images} onClose={onClose} title="Reference Images" size="lg">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images?.map((att) => (
          <a key={att.id} href={att.dataUrl} download={att.name} className="block overflow-hidden rounded-lg border border-hos-ink-200 hover:border-hos-gold-400">
            {att.type?.startsWith('image/') ? (
              <img src={att.dataUrl} alt={att.name} className="h-32 w-full object-cover" />
            ) : (
              <div className="flex h-32 w-full items-center justify-center bg-hos-ink-50 text-xs text-hos-ink-500">{att.name}</div>
            )}
          </a>
        ))}
      </div>
    </Modal>
  )
}

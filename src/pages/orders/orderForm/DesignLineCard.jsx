import { ChevronDown, ChevronUp, Copy, Gem, Trash2 } from 'lucide-react'
import { Field, TextInput, Select } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'
import { METAL_MASTER_KEYS } from '@/lib/constants'
import { lineSummary } from './model'

function GroupLabel({ children }) {
  return <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">{children}</h4>
}

export default function DesignLineCard({
  line,
  index,
  total,
  errors = {},
  masters,
  products,
  onUpdate,
  onRemove,
  onDuplicate,
  onToggleCollapsed,
  onProductChange,
  onMetalTypeChange,
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-hos-ink-100 bg-gradient-to-r from-hos-gold-50 to-white px-4 py-3">
        <button type="button" onClick={onToggleCollapsed} className="flex flex-1 items-center gap-2 text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hos-gold-500 text-white">
            <Gem size={15} />
          </span>
          <span>
            <span className="block font-display text-base font-semibold text-hos-ink-800">Design #{index + 1}</span>
            {line.collapsed && <span className="block text-xs text-hos-ink-500">{lineSummary(line)}</span>}
          </span>
          {line.collapsed ? <ChevronDown size={16} className="ml-auto text-hos-ink-400" /> : <ChevronUp size={16} className="ml-auto text-hos-ink-400" />}
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          title="Duplicate this design"
          className="shrink-0 rounded p-1.5 text-hos-ink-400 hover:bg-hos-gold-50 hover:text-hos-gold-600"
        >
          <Copy size={14} />
        </button>
        {total > 1 && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove this design"
            className="shrink-0 rounded p-1.5 text-hos-ink-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {!line.collapsed && (
        <>
          <div className="border-b border-hos-ink-100 p-4">
            <GroupLabel>Design Details</GroupLabel>
            <div className="mb-3">
              <FileUpload label="Reference Image" value={line.referenceImage} onChange={(v) => onUpdate({ referenceImage: v })} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Design / Item" required error={errors.productName} className="sm:col-span-2">
                <input
                  list={`product-list-${line.id}`}
                  className="input"
                  value={line.productName}
                  onChange={(e) => onProductChange(e.target.value)}
                  placeholder="Type or select"
                />
                <datalist id={`product-list-${line.id}`}>
                  {products.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </Field>
              <Field label="Product Code">
                <TextInput value={line.productCode} onChange={(e) => onUpdate({ productCode: e.target.value })} />
              </Field>
              <Field label="Pcs" required error={errors.quantity}>
                <TextInput type="number" min={1} value={line.quantity} onChange={(e) => onUpdate({ quantity: e.target.value })} />
              </Field>
              <Field label="Size">
                <TextInput value={line.size} onChange={(e) => onUpdate({ size: e.target.value })} placeholder="e.g. 14, US 7, 2.5&quot;" />
              </Field>
              <Field label="Target Date" required error={errors.targetDeliveryDate}>
                <TextInput type="date" value={line.targetDeliveryDate} onChange={(e) => onUpdate({ targetDeliveryDate: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-3">
              <GroupLabel>Metal Details</GroupLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Type">
                  <Select value={line.metalType} onChange={(e) => onMetalTypeChange(e.target.value)} options={(masters.metalType || []).map((m) => m.name)} placeholder="Select metal type…" />
                </Field>
                {line.metalType && (
                  <>
                    <Field label={`${line.metalType} Purity`}>
                      <Select
                        value={line.goldPurity}
                        onChange={(e) => onUpdate({ goldPurity: e.target.value })}
                        options={(masters[METAL_MASTER_KEYS[line.metalType]?.purity] || []).map((m) => m.name)}
                      />
                    </Field>
                    <Field label={`${line.metalType} Colour`}>
                      <Select
                        value={line.goldColour}
                        onChange={(e) => onUpdate({ goldColour: e.target.value })}
                        options={(masters[METAL_MASTER_KEYS[line.metalType]?.colour] || []).map((m) => m.name)}
                      />
                    </Field>
                    <Field label={`${line.metalType} Weight (g)`}>
                      <TextInput type="number" step="0.01" value={line.goldWeight} onChange={(e) => onUpdate({ goldWeight: e.target.value })} />
                    </Field>
                  </>
                )}
              </div>
            </div>

            <div>
              <GroupLabel>Diamond Details</GroupLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Diamond Pcs">
                  <TextInput type="number" min={0} value={line.diamondPcs} onChange={(e) => onUpdate({ diamondPcs: e.target.value })} />
                </Field>
                <Field label="Diamond Weight (ct)">
                  <TextInput type="number" step="0.01" value={line.diamondWeight} onChange={(e) => onUpdate({ diamondWeight: e.target.value })} />
                </Field>
                <Field label="Diamond Particular" className="sm:col-span-2">
                  <TextInput
                    value={line.diamondParticular}
                    onChange={(e) => onUpdate({ diamondParticular: e.target.value })}
                    placeholder="e.g. Round, VVS1, G"
                  />
                </Field>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

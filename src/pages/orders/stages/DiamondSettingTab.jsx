import { useEffect } from 'react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput, Select, TextArea } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'
import { todayISO } from '@/lib/utils'
import { logMaterialTransaction } from '@/lib/db'

const n = (v) => Number(v) || 0

export default function DiamondSettingTab({ order, masters, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'diamondSetting', onChanged)
  const { draft, setField, editMode, save, user } = ctx
  const disabled = !editMode

  // The Gem Stone stage (right after CAM/RPT) records what this design
  // needs before casting — pull that requirement in as the starting point
  // for what actually gets issued for setting.
  const gemRequirement = order.stages.gemStone?.particulars || []
  const gemRequiredPcs = gemRequirement.reduce((s, p) => s + (Number(p.pcs) || 0), 0)
  const gemRequiredWeight = gemRequirement.reduce((s, p) => s + (Number(p.weight) || 0), 0)

  useEffect(() => {
    if (!editMode) return
    if (!draft.issuedPcs && order.diamond?.pcs) setField('issuedPcs', order.diamond.pcs)
    if (!draft.issuedWeight && order.diamond?.weight) setField('issuedWeight', order.diamond.weight)
    if (!draft.gemstoneIssuedPcs && gemRequiredPcs) setField('gemstoneIssuedPcs', gemRequiredPcs)
    if (!draft.gemstoneIssuedWeight && gemRequiredWeight) setField('gemstoneIssuedWeight', gemRequiredWeight)
    if (gemRequirement.length === 1) {
      const only = gemRequirement[0]
      if (!draft.gemstoneType && only.type) setField('gemstoneType', only.type)
      if (!draft.gemstoneShape && only.shape) setField('gemstoneShape', only.shape)
      if (!draft.gemstoneSize && only.size) setField('gemstoneSize', only.size)
      if (!draft.gemstoneQuality && only.quality) setField('gemstoneQuality', only.quality)
      if (!draft.gemstoneColour && only.colour) setField('gemstoneColour', only.colour)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  const handleSubmit = async () => {
    const res = await save('Submit', {
      status: 'Completed',
      assignedPerson: user?.name || draft.assignedPerson,
      startDate: draft.startDate || todayISO(),
      completionDate: todayISO(),
    })
    if (res?.ok) {
      const stamp = { orderId: order.id, orderNumber: order.orderNumber, stage: 'diamondSetting', user }
      if (n(draft.issuedPcs) || n(draft.issuedWeight)) logMaterialTransaction({ ...stamp, material: 'diamond', type: 'Issued', qty: n(draft.issuedPcs), weight: n(draft.issuedWeight), remarks: draft.issueRemarks })
      if (n(draft.usedPcs) || n(draft.usedWeight)) logMaterialTransaction({ ...stamp, material: 'diamond', type: 'Consumed', qty: n(draft.usedPcs), weight: n(draft.usedWeight), remarks: draft.consumptionRemarks })
      if (n(draft.returnedPcs) || n(draft.returnedWeight)) logMaterialTransaction({ ...stamp, material: 'diamond', type: 'Returned', qty: n(draft.returnedPcs), weight: n(draft.returnedWeight) })
      if (n(draft.brokenLostPcs) || n(draft.brokenLostWeight)) logMaterialTransaction({ ...stamp, material: 'diamond', type: 'Broken/Lost', qty: n(draft.brokenLostPcs), weight: n(draft.brokenLostWeight) })

      if (n(draft.gemstoneIssuedPcs) || n(draft.gemstoneIssuedWeight)) logMaterialTransaction({ ...stamp, material: 'gemstone', type: 'Issued', qty: n(draft.gemstoneIssuedPcs), weight: n(draft.gemstoneIssuedWeight), remarks: draft.gemstoneIssueRemarks })
      if (n(draft.gemstoneUsedPcs) || n(draft.gemstoneUsedWeight)) logMaterialTransaction({ ...stamp, material: 'gemstone', type: 'Consumed', qty: n(draft.gemstoneUsedPcs), weight: n(draft.gemstoneUsedWeight), remarks: draft.gemstoneConsumptionRemarks })
      if (n(draft.gemstoneReturnedPcs) || n(draft.gemstoneReturnedWeight)) logMaterialTransaction({ ...stamp, material: 'gemstone', type: 'Returned', qty: n(draft.gemstoneReturnedPcs), weight: n(draft.gemstoneReturnedWeight) })
      if (n(draft.gemstoneBrokenLostPcs) || n(draft.gemstoneBrokenLostWeight)) logMaterialTransaction({ ...stamp, material: 'gemstone', type: 'Broken/Lost', qty: n(draft.gemstoneBrokenLostPcs), weight: n(draft.gemstoneBrokenLostWeight) })
    } else if (res?.error) alert(res.error)
    return res
  }

  return (
    <StageFrame ctx={ctx} stageKey="diamondSetting" onCancel={onCancel} onSubmit={handleSubmit} hideRemarks>
      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Diamond Issue</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Shape">
              <Select value={draft.shape || ''} onChange={(e) => setField('shape', e.target.value)} options={(masters.diamondShape || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Size">
              <Select value={draft.size || ''} onChange={(e) => setField('size', e.target.value)} options={(masters.diamondSize || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Quality">
              <Select value={draft.quality || ''} onChange={(e) => setField('quality', e.target.value)} options={(masters.diamondQuality || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Colour">
              <Select value={draft.colour || ''} onChange={(e) => setField('colour', e.target.value)} options={(masters.diamondColour || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Issued PCs">
              <TextInput type="number" value={draft.issuedPcs || ''} onChange={(e) => setField('issuedPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Issued Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.issuedWeight || ''} onChange={(e) => setField('issuedWeight', e.target.value)} disabled={disabled} />
            </Field>
            <FileUpload label="Before Setting Image" value={draft.beforeSettingImage || []} onChange={(v) => setField('beforeSettingImage', v)} disabled={disabled} multiple={false} />
          </div>
          <Field label="Remarks" className="mt-3">
            <TextArea rows={2} value={draft.issueRemarks || ''} onChange={(e) => setField('issueRemarks', e.target.value)} disabled={disabled} />
          </Field>
        </div>

        <div className="border-t border-hos-ink-100 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Diamond Consumption</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Used Pcs">
              <TextInput type="number" value={draft.usedPcs || ''} onChange={(e) => setField('usedPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Used Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.usedWeight || ''} onChange={(e) => setField('usedWeight', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Returned PCS">
              <TextInput type="number" value={draft.returnedPcs || ''} onChange={(e) => setField('returnedPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Returned Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.returnedWeight || ''} onChange={(e) => setField('returnedWeight', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Broken / Lost PCS">
              <TextInput type="number" value={draft.brokenLostPcs || ''} onChange={(e) => setField('brokenLostPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Broken / Lost Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.brokenLostWeight || ''} onChange={(e) => setField('brokenLostWeight', e.target.value)} disabled={disabled} />
            </Field>
            <FileUpload label="After Setting Image" value={draft.afterSettingImage || []} onChange={(v) => setField('afterSettingImage', v)} disabled={disabled} multiple={false} />
          </div>
          <Field label="Remarks" className="mt-3">
            <TextArea rows={2} value={draft.consumptionRemarks || ''} onChange={(e) => setField('consumptionRemarks', e.target.value)} disabled={disabled} />
          </Field>
        </div>

        <div className="border-t border-hos-ink-100 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Gem Stone Issue</h4>
          {gemRequirement.length > 0 && (
            <p className="mb-3 text-xs text-hos-ink-400">
              Requirement from Gem Stone stage: {gemRequirement.map((g) => `${g.type || 'Stone'} ${g.pcs || 0}pc/${g.weight || 0}ct`).join(', ')}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Type">
              <Select value={draft.gemstoneType || ''} onChange={(e) => setField('gemstoneType', e.target.value)} options={(masters.gemstoneType || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Shape">
              <Select value={draft.gemstoneShape || ''} onChange={(e) => setField('gemstoneShape', e.target.value)} options={(masters.gemstoneShape || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Size">
              <Select value={draft.gemstoneSize || ''} onChange={(e) => setField('gemstoneSize', e.target.value)} options={(masters.gemstoneSize || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Quality">
              <Select value={draft.gemstoneQuality || ''} onChange={(e) => setField('gemstoneQuality', e.target.value)} options={(masters.gemstoneQuality || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Colour">
              <Select value={draft.gemstoneColour || ''} onChange={(e) => setField('gemstoneColour', e.target.value)} options={(masters.gemstoneColour || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Issued PCs">
              <TextInput type="number" value={draft.gemstoneIssuedPcs || ''} onChange={(e) => setField('gemstoneIssuedPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Issued Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.gemstoneIssuedWeight || ''} onChange={(e) => setField('gemstoneIssuedWeight', e.target.value)} disabled={disabled} />
            </Field>
            <FileUpload label="Before Setting Image" value={draft.gemstoneBeforeSettingImage || []} onChange={(v) => setField('gemstoneBeforeSettingImage', v)} disabled={disabled} multiple={false} />
          </div>
          <Field label="Remarks" className="mt-3">
            <TextArea rows={2} value={draft.gemstoneIssueRemarks || ''} onChange={(e) => setField('gemstoneIssueRemarks', e.target.value)} disabled={disabled} />
          </Field>
        </div>

        <div className="border-t border-hos-ink-100 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Gem Stone Consumption</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Used Pcs">
              <TextInput type="number" value={draft.gemstoneUsedPcs || ''} onChange={(e) => setField('gemstoneUsedPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Used Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.gemstoneUsedWeight || ''} onChange={(e) => setField('gemstoneUsedWeight', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Returned PCS">
              <TextInput type="number" value={draft.gemstoneReturnedPcs || ''} onChange={(e) => setField('gemstoneReturnedPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Returned Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.gemstoneReturnedWeight || ''} onChange={(e) => setField('gemstoneReturnedWeight', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Broken / Lost PCS">
              <TextInput type="number" value={draft.gemstoneBrokenLostPcs || ''} onChange={(e) => setField('gemstoneBrokenLostPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Broken / Lost Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.gemstoneBrokenLostWeight || ''} onChange={(e) => setField('gemstoneBrokenLostWeight', e.target.value)} disabled={disabled} />
            </Field>
            <FileUpload label="After Setting Image" value={draft.gemstoneAfterSettingImage || []} onChange={(v) => setField('gemstoneAfterSettingImage', v)} disabled={disabled} multiple={false} />
          </div>
          <Field label="Remarks" className="mt-3">
            <TextArea rows={2} value={draft.gemstoneConsumptionRemarks || ''} onChange={(e) => setField('gemstoneConsumptionRemarks', e.target.value)} disabled={disabled} />
          </Field>
        </div>
      </div>
    </StageFrame>
  )
}

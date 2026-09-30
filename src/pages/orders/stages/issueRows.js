import { uid } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Issue rows for the Additional Issue stage — one row per diamond / gem stone
// type issued (e.g. Round 2.0mm + Pear 1.5mm on the same piece). Saved as
// `diamondIssues` / `gemstoneIssues`, with flat totals (`issuedPcs`,
// `gemstoneIssuedPcs`, …) kept alongside so reconciliation, reports and the
// Consumption stage keep reading simple numbers.
// ---------------------------------------------------------------------------

const n = (v) => Number(v) || 0

export function blankDiamondRow(extra = {}) {
  return { id: uid('di'), shape: '', size: '', quality: '', colour: '', pcs: '', weight: '', beforeSettingImage: [], ...extra }
}

export function blankGemRow(extra = {}) {
  return { id: uid('gi'), type: '', shape: '', size: '', quality: '', colour: '', pcs: '', weight: '', beforeSettingImage: [], ...extra }
}

export const hasIssueValue = (row) =>
  row.type || row.shape || row.size || row.quality || row.colour || row.pcs || row.weight || row.beforeSettingImage?.length

// Records saved before multiple rows existed keep one diamond / one gem stone
// in flat fields — surface that as row 1 so nothing entered earlier is lost.
export function diamondIssueRows(record = {}) {
  if (record.diamondIssues?.length) return record.diamondIssues
  const legacy = {
    id: 'di_legacy',
    shape: record.shape || '',
    size: record.size || '',
    quality: record.quality || '',
    colour: record.colour || '',
    pcs: record.issuedPcs || '',
    weight: record.issuedWeight || '',
    beforeSettingImage: record.beforeSettingImage || [],
  }
  return hasIssueValue(legacy) ? [legacy] : []
}

export function gemstoneIssueRows(record = {}) {
  if (record.gemstoneIssues?.length) return record.gemstoneIssues
  const legacy = {
    id: 'gi_legacy',
    type: record.gemstoneType || '',
    shape: record.gemstoneShape || '',
    size: record.gemstoneSize || '',
    quality: record.gemstoneQuality || '',
    colour: record.gemstoneColour || '',
    pcs: record.gemstoneIssuedPcs || '',
    weight: record.gemstoneIssuedWeight || '',
    beforeSettingImage: record.gemstoneBeforeSettingImage || [],
  }
  return hasIssueValue(legacy) ? [legacy] : []
}

export function issueTotals(rows) {
  return {
    pcs: rows.reduce((sum, r) => sum + n(r.pcs), 0),
    weight: Math.round(rows.reduce((sum, r) => sum + n(r.weight), 0) * 1000) / 1000,
  }
}

export const describeIssue = (row) => [row.type, row.shape, row.size, row.quality, row.colour].filter(Boolean).join(' ')

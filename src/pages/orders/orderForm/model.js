import { uid } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Pure helpers for the New Order form's state shape. Kept separate from the
// page/components so the "what does a blank/duplicated line look like" logic
// stays in one obvious place.
// ---------------------------------------------------------------------------

export function blankOrderLine() {
  return {
    id: uid('ol'),
    productName: '',
    productCode: '',
    quantity: 1,
    size: '',
    metalType: '',
    goldPurity: '',
    goldColour: '',
    goldWeight: '',
    diamondPcs: '',
    diamondWeight: '',
    diamondParticular: '',
    referenceImage: [],
    goldRemarks: '',
    diamondRemarks: '',
    collapsed: false,
  }
}

// Used by "Duplicate" on a design line — copies every design/metal/diamond
// value so the user only has to change what's different about the new
// design. Reference images are never carried over (each design's photo is
// its own), and a fresh id keeps edits to the copy from touching the
// original.
export function duplicateOrderLine(line) {
  return {
    ...line,
    id: uid('ol'),
    collapsed: false,
    referenceImage: [],
  }
}

export function lineSummary(line) {
  const bits = [line.productName || 'Untitled design', `${line.quantity || 0} pcs`]
  if (line.metalType) bits.push([line.metalType, line.goldPurity].filter(Boolean).join(' '))
  return bits.join(' — ')
}

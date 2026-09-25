// ---------------------------------------------------------------------------
// One-time demo data generator. Runs only when the orders collection is
// empty (first-ever load in a browser). It drives orders through the same
// Orders.create / Orders.updateStage engine used by the real UI, so the
// seeded data is guaranteed to be internally consistent (history, delay
// calculations, notifications, overall status) — nothing is faked.
// ---------------------------------------------------------------------------
import { Orders, Customers, Employees, Products, Masters, logMaterialTransaction, setFastMode } from './db'

// One Diamond Setting "Diamond Issue" row (see DiamondSettingTab).
let seedIssueCount = 0
function diamondIssue(shape, size, quality, colour, pcs, weight) {
  seedIssueCount += 1
  return { id: `di_seed_${seedIssueCount}`, shape, size, quality, colour, pcs, weight, beforeSettingImage: [] }
}

function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const SEED_USER = { name: 'System Setup', role: 'admin' }

const QC_ITEMS = ['Size Check', 'Diamond Setting Check', 'Prong Check', 'Polishing', 'Finishing', 'Rhodium Check']
const passChecklist = () => QC_ITEMS.map((item) => ({ item, result: 'Pass', remarks: '' }))

const GEMSTONE_SAMPLES = [
  { type: 'Ruby', shape: 'Round', size: '4mm', quality: 'AA', colour: 'Red', pcs: 4, weight: 1.2 },
  { type: 'Emerald', shape: 'Oval', size: '5mm', quality: 'AAA', colour: 'Green', pcs: 2, weight: 0.9 },
  { type: 'Sapphire', shape: 'Cushion', size: '4mm', quality: 'AA', colour: 'Blue', pcs: 6, weight: 1.6 },
  { type: 'Pearl', shape: 'Round', size: '6mm', quality: 'A', colour: 'White', pcs: 1, weight: 0.5 },
]

export async function seedDemoOrders() {
  setFastMode(true)
  try {
  const [customers, employees, products, masters] = await Promise.all([
    Customers.list(),
    Employees.list(),
    Products.list(),
    Masters.listAll(),
  ])
  const person = (role) => employees.find((e) => e.role === role)?.name || ''
  const karigarName = (i) => masters.karigar?.[i % masters.karigar.length]?.name || ''

  async function step(order, stageKey, patch, action) {
    await Orders.updateStage(order.id, stageKey, patch, { user: SEED_USER, action: action || 'Update' })
  }

  // Completed Karigar Assign patch, backdated around `completionDay` (a
  // negative addDays offset) so seeded orders don't hit the sequential-stage
  // lock that now sits between Planning and CAD. Karigar names come from the
  // Karigar master list (src/lib/constants.js's MASTER_TYPES), same as the
  // real Karigar Assign stage form.
  const assignKarigar = (i, completionDay) => ({
    status: 'Completed',
    karigarName: karigarName(i),
    assignedPerson: karigarName(i),
    startDate: addDays(completionDay - 1),
    targetDate: addDays(completionDay + 1),
    completionDate: addDays(completionDay),
  })

  // Completed Gem Stone patch, backdated around `completionDay`, so seeded
  // orders don't hit the sequential-stage lock that now sits between
  // CAM/RPT and Casting.
  const specifyGemstone = (i, completionDay) => ({
    status: 'Completed',
    approvedBy: person('production_manager'),
    particulars: [GEMSTONE_SAMPLES[i % GEMSTONE_SAMPLES.length]],
    startDate: addDays(completionDay - 1),
    completionDate: addDays(completionDay),
  })

  // ---- Order 1: brand new, just received -------------------------------
  await Orders.create(
    {
      customerName: customers[0].name,
      customerContact: customers[0].contact,
      salesPerson: person('sales'),
      orderType: 'New Order',
      priority: 'Normal',
      orderDate: addDays(0),
      targetDeliveryDate: addDays(25),
      productName: products[0].name,
      productCode: products[0].code,
      quantity: 2,
      size: 'US 7',
      customerRefNumber: 'REF-1001',
      customerRequirement: 'Classic solitaire setting, comfort fit band.',
      referenceImage: [],
      gold: { purity: '18K', colour: 'Yellow', estimatedWeight: 6.5, remarks: '' },
      diamond: { pcs: 12, weight: 0.85 },
    },
    SEED_USER
  )

  // ---- Order 2: in planning (on time) -----------------------------------
  let o2 = await Orders.create(
    {
      customerName: customers[1].name,
      customerContact: customers[1].contact,
      salesPerson: person('sales'),
      orderType: 'Custom Design',
      priority: 'High',
      orderDate: addDays(-3),
      targetDeliveryDate: addDays(30),
      productName: products[1].name,
      productCode: products[1].code,
      quantity: 1,
      size: '16 inch',
      gold: { purity: '18K', colour: 'Rose', estimatedWeight: 4.2, remarks: '' },
      diamond: { pcs: 40, weight: 1.1 },
    },
    SEED_USER
  )
  await step(o2, 'planning', { status: 'In Progress', assignedPerson: person('production_manager'), designerName: person('cad_designer'), cadVersion: 'V1' }, 'Start Planning')

  // ---- Order 3: in CAD, delayed ------------------------------------------
  let o3 = await Orders.create(
    {
      customerName: customers[2].name,
      customerContact: customers[2].contact,
      salesPerson: person('sales'),
      orderType: 'New Order',
      priority: 'Urgent',
      orderDate: addDays(-10),
      targetDeliveryDate: addDays(5),
      productName: products[2].name,
      productCode: products[2].code,
      quantity: 1,
      size: '7.5 inch',
      gold: { purity: '18K', colour: 'White', estimatedWeight: 8, remarks: '' },
      diamond: { pcs: 60, weight: 2.4 },
    },
    SEED_USER
  )
  await step(o3, 'planning', { status: 'Approved', assignedPerson: person('production_manager'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('production_manager'), completionDate: addDays(-8) }, 'Approve Planning')
  o3 = (await Orders.get(o3.id))
  await step(o3, 'karigarAssign', assignKarigar(0, -7), 'Assign Karigar')
  o3 = (await Orders.get(o3.id))
  await step(o3, 'cad', { status: 'In Progress', assignedPerson: person('cad_designer'), designerName: person('cad_designer'), cadVersion: 'V1' }, 'Start CAD')

  // ---- Order 4: CAM/RPT completed, casting pending (on time) -------------
  let o4 = await Orders.create(
    {
      customerName: customers[3].name,
      customerContact: customers[3].contact,
      salesPerson: person('sales'),
      orderType: 'Repeat Order',
      priority: 'Normal',
      orderDate: addDays(-14),
      targetDeliveryDate: addDays(12),
      productName: products[3].name,
      productCode: products[3].code,
      quantity: 2,
      size: '2.0mm stud',
      gold: { purity: '22K', colour: 'Yellow', estimatedWeight: 5, remarks: '' },
      diamond: { pcs: 24, weight: 0.6 },
    },
    SEED_USER
  )
  await step(o4, 'planning', { status: 'Approved', assignedPerson: person('production_manager'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('production_manager'), completionDate: addDays(-12) }, 'Approve Planning')
  o4 = await Orders.get(o4.id)
  await step(o4, 'karigarAssign', assignKarigar(1, -11), 'Assign Karigar')
  o4 = await Orders.get(o4.id)
  await step(o4, 'cad', { status: 'Approved', assignedPerson: person('cad_designer'), designerName: person('cad_designer'), cadVersion: 'V2', approvedBy: person('management'), completionDate: addDays(-9) }, 'Submit')
  o4 = await Orders.get(o4.id)
  await step(o4, 'camRpt', { status: 'Completed', assignedPerson: person('cam_operator'), machine: 'CAM-02', completionDate: addDays(-6) }, 'Complete')

  // ---- Order 5: casting done, filling pending, delayed -------------------
  let o5 = await Orders.create(
    {
      customerName: customers[4].name,
      customerContact: customers[4].contact,
      salesPerson: person('sales'),
      orderType: 'New Order',
      priority: 'High',
      orderDate: addDays(-20),
      targetDeliveryDate: addDays(-1),
      productName: products[4].name,
      productCode: products[4].code,
      quantity: 1,
      size: '18 inch',
      gold: { purity: '18K', colour: 'Yellow', estimatedWeight: 18, remarks: 'Bridal set' },
      diamond: { pcs: 120, weight: 3.2 },
    },
    SEED_USER
  )
  for (const [stage, patch] of [
    ['planning', { status: 'Approved', assignedPerson: person('production_manager'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('production_manager'), completionDate: addDays(-19) }],
    ['karigarAssign', assignKarigar(2, -18)],
    ['cad', { status: 'Approved', assignedPerson: person('cad_designer'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('management'), completionDate: addDays(-16) }],
    ['camRpt', { status: 'Completed', assignedPerson: person('cam_operator'), machine: 'CAM-01', completionDate: addDays(-13) }],
  ]) {
    o5 = await Orders.get(o5.id)
    await step(o5, stage, patch, 'Approve')
  }
  o5 = await Orders.get(o5.id)
  await step(o5, 'gemStone', specifyGemstone(0, -12), 'Specify Gem Stone')
  o5 = await Orders.get(o5.id)
  await step(
    o5,
    'casting',
    {
      status: 'Completed',
      assignedPerson: person('casting_operator'),
      completionDate: addDays(-10),
      castingDate: addDays(-10),
      goldPurity: '18K',
      goldColour: 'Yellow',
      sizeOfArticle: '18 inch',
      plannedPcs: 1,
      castedPcs: 1,
      goldWeight: 18.4,
      rejectedPcs: 0,
    },
    'Submit'
  )
  logMaterialTransaction({ orderId: o5.id, orderNumber: o5.orderNumber, material: 'gold', type: 'Final', weight: 18.4, stage: 'casting', user: SEED_USER })

  // ---- Order 6: diamond setting in progress, on time ----------------------
  let o6 = await Orders.create(
    {
      customerName: customers[5].name,
      customerContact: customers[5].contact,
      salesPerson: person('sales'),
      orderType: 'New Order',
      priority: 'Normal',
      orderDate: addDays(-22),
      targetDeliveryDate: addDays(8),
      productName: products[5].name,
      productCode: products[5].code,
      quantity: 1,
      size: '2.4 inch',
      gold: { purity: '18K', colour: 'Rose', estimatedWeight: 15, remarks: '' },
      diamond: { pcs: 80, weight: 2.5 },
    },
    SEED_USER
  )
  for (const [stage, patch] of [
    ['planning', { status: 'Approved', assignedPerson: person('production_manager'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('production_manager'), completionDate: addDays(-21) }],
    ['karigarAssign', assignKarigar(3, -20)],
    ['cad', { status: 'Approved', assignedPerson: person('cad_designer'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('management'), completionDate: addDays(-18) }],
    ['camRpt', { status: 'Completed', assignedPerson: person('cam_operator'), machine: 'CAM-02', completionDate: addDays(-15) }],
    ['gemStone', specifyGemstone(1, -14)],
    ['casting', { status: 'Completed', assignedPerson: person('casting_operator'), completionDate: addDays(-12), castingDate: addDays(-12), goldPurity: '18K', goldColour: 'Rose', sizeOfArticle: '2.4 inch', plannedPcs: 1, castedPcs: 1, goldWeight: 15.2, rejectedPcs: 0 }],
    ['filling', { status: 'Completed', assignedPerson: person('filling_operator'), completionDate: addDays(-8), fillingType: 'Hand', weightBeforeFilling: 15.2, weightAfterFilling: 15.35 }],
  ]) {
    o6 = await Orders.get(o6.id)
    await step(o6, stage, patch, 'Update')
  }
  o6 = await Orders.get(o6.id)
  await step(
    o6,
    'diamondSetting',
    {
      status: 'In Progress',
      assignedPerson: person('diamond_setter'),
      diamondIssues: [diamondIssue('Round', '2.0mm', 'VS1', 'F', 60, 1.9), diamondIssue('Pear', '1.5mm', 'VS2', 'G', 20, 0.6)],
      issuedPcs: 80,
      issuedWeight: 2.5,
    },
    'Start Setting'
  )

  // ---- Order 7: rhodium completed, ready for Final QC (on time) ----------
  let o7 = await Orders.create(
    {
      customerName: customers[0].name,
      salesPerson: person('sales'),
      orderType: 'New Order',
      priority: 'High',
      orderDate: addDays(-28),
      targetDeliveryDate: addDays(6),
      productName: products[0].name,
      productCode: products[0].code,
      quantity: 3,
      size: 'US 6',
      gold: { purity: '18K', colour: 'White', estimatedWeight: 9, remarks: '' },
      diamond: { pcs: 30, weight: 1.4 },
    },
    SEED_USER
  )
  for (const [stage, patch] of [
    ['planning', { status: 'Approved', assignedPerson: person('production_manager'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('production_manager'), completionDate: addDays(-27) }],
    ['karigarAssign', assignKarigar(0, -26)],
    ['cad', { status: 'Approved', assignedPerson: person('cad_designer'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('management'), completionDate: addDays(-24) }],
    ['camRpt', { status: 'Completed', assignedPerson: person('cam_operator'), machine: 'CAM-01', completionDate: addDays(-21) }],
    ['gemStone', specifyGemstone(2, -20)],
    ['casting', { status: 'Completed', assignedPerson: person('casting_operator'), completionDate: addDays(-18), castingDate: addDays(-18), goldPurity: '18K', goldColour: 'White', sizeOfArticle: 'US 6', plannedPcs: 3, castedPcs: 3, goldWeight: 9.2, rejectedPcs: 0 }],
    ['filling', { status: 'Completed', assignedPerson: person('filling_operator'), completionDate: addDays(-14), fillingType: 'Machine', weightBeforeFilling: 9.2, weightAfterFilling: 9.3 }],
    [
      'diamondSetting',
      {
        status: 'Completed',
        assignedPerson: person('diamond_setter'),
        completionDate: addDays(-10),
        diamondIssues: [diamondIssue('Round', '2.0mm', 'VVS1', 'D', 30, 1.4)],
        issuedPcs: 30,
        issuedWeight: 1.4,
        usedPcs: 30,
        usedWeight: 1.38,
        returnedPcs: 0,
        returnedWeight: 0,
        brokenLostPcs: 0,
        brokenLostWeight: 0,
      },
    ],
    ['rhodium', { status: 'Completed', assignedPerson: person('rhodium_operator'), completionDate: addDays(-6), rhodiumType: 'Full', weightBefore: 9.3, weightAfter: 9.35 }],
  ]) {
    o7 = await Orders.get(o7.id)
    await step(o7, stage, patch, 'Update')
  }

  // ---- Order 8: Final QC approved, packing in progress --------------------
  let o8 = await Orders.create(
    {
      customerName: customers[1].name,
      salesPerson: person('sales'),
      orderType: 'New Order',
      priority: 'Normal',
      orderDate: addDays(-30),
      targetDeliveryDate: addDays(2),
      productName: products[1].name,
      productCode: products[1].code,
      quantity: 1,
      size: '16 inch',
      gold: { purity: '18K', colour: 'Rose', estimatedWeight: 3.5, remarks: '' },
      diamond: { pcs: 18, weight: 0.7 },
    },
    SEED_USER
  )
  for (const [stage, patch] of [
    ['planning', { status: 'Approved', assignedPerson: person('production_manager'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('production_manager'), completionDate: addDays(-29) }],
    ['karigarAssign', assignKarigar(1, -28)],
    ['cad', { status: 'Approved', assignedPerson: person('cad_designer'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('management'), completionDate: addDays(-26) }],
    ['camRpt', { status: 'Completed', assignedPerson: person('cam_operator'), machine: 'CAM-02', completionDate: addDays(-23) }],
    ['gemStone', specifyGemstone(3, -22)],
    ['casting', { status: 'Completed', assignedPerson: person('casting_operator'), completionDate: addDays(-20), castingDate: addDays(-20), goldPurity: '18K', goldColour: 'Rose', sizeOfArticle: '16 inch', plannedPcs: 1, castedPcs: 1, goldWeight: 3.6, rejectedPcs: 0 }],
    ['filling', { status: 'Completed', assignedPerson: person('filling_operator'), completionDate: addDays(-16), fillingType: 'Hand', weightBeforeFilling: 3.6, weightAfterFilling: 3.65 }],
    ['diamondSetting', { status: 'Completed', assignedPerson: person('diamond_setter'), completionDate: addDays(-12), diamondIssues: [diamondIssue('Pear', '1.5mm', 'VS2', 'G', 18, 0.7)], issuedPcs: 18, issuedWeight: 0.7, usedPcs: 18, usedWeight: 0.69 }],
    ['rhodium', { status: 'Completed', assignedPerson: person('rhodium_operator'), completionDate: addDays(-8), rhodiumType: 'Prongs', weightBefore: 3.65, weightAfter: 3.68 }],
  ]) {
    o8 = await Orders.get(o8.id)
    await step(o8, stage, patch, 'Update')
  }
  o8 = await Orders.get(o8.id)
  await step(o8, 'finalQc', { status: 'Approved', assignedPerson: person('qc'), completionDate: addDays(-4), finalPcs: 1, finalGoldWeight: 3.65, finalDiamondPcs: 18, finalDiamondWeight: 0.69, checklist: passChecklist() }, 'QC Result: Pass')
  o8 = await Orders.get(o8.id)
  await step(o8, 'packing', { status: 'Pending', assignedPerson: person('packing'), tagNo: 'TAG-2201' }, 'Assign')

  // ---- Order 9: packed, delivery dispatched --------------------------------
  let o9 = await Orders.create(
    {
      customerName: customers[2].name,
      salesPerson: person('sales'),
      orderType: 'New Order',
      priority: 'Urgent',
      orderDate: addDays(-35),
      targetDeliveryDate: addDays(-2),
      productName: products[2].name,
      productCode: products[2].code,
      quantity: 1,
      size: '7 inch',
      gold: { purity: '18K', colour: 'White', estimatedWeight: 22, remarks: '' },
      diamond: { pcs: 90, weight: 3.8 },
    },
    SEED_USER
  )
  for (const [stage, patch] of [
    ['planning', { status: 'Approved', assignedPerson: person('production_manager'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('production_manager'), completionDate: addDays(-34) }],
    ['karigarAssign', assignKarigar(2, -33)],
    ['cad', { status: 'Approved', assignedPerson: person('cad_designer'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('management'), completionDate: addDays(-31) }],
    ['camRpt', { status: 'Completed', assignedPerson: person('cam_operator'), machine: 'CAM-01', completionDate: addDays(-28) }],
    ['gemStone', specifyGemstone(0, -27)],
    ['casting', { status: 'Completed', assignedPerson: person('casting_operator'), completionDate: addDays(-25), castingDate: addDays(-25), goldPurity: '18K', goldColour: 'White', sizeOfArticle: '7 inch', plannedPcs: 1, castedPcs: 1, goldWeight: 22.5, rejectedPcs: 0 }],
    ['filling', { status: 'Completed', assignedPerson: person('filling_operator'), completionDate: addDays(-21), fillingType: 'Laser', weightBeforeFilling: 22.5, weightAfterFilling: 22.6 }],
    ['diamondSetting', { status: 'Completed', assignedPerson: person('diamond_setter'), completionDate: addDays(-17), diamondIssues: [diamondIssue('Round', '2.5mm', 'VVS2', 'E', 90, 3.8)], issuedPcs: 90, issuedWeight: 3.8, usedPcs: 90, usedWeight: 3.75 }],
    ['rhodium', { status: 'Completed', assignedPerson: person('rhodium_operator'), completionDate: addDays(-13), rhodiumType: 'Full', weightBefore: 22.6, weightAfter: 22.65 }],
    ['finalQc', { status: 'Approved', assignedPerson: person('qc'), completionDate: addDays(-9), finalPcs: 1, finalGoldWeight: 22.5, finalDiamondPcs: 90, finalDiamondWeight: 3.75, checklist: passChecklist() }],
    [
      'packing',
      {
        status: 'Packed',
        assignedPerson: person('packing'),
        completionDate: addDays(-5),
        pcs: 1,
        tagNo: 'TAG-1187',
        certificateNo: 'CERT-771',
        invoiceNo: 'INV-5521',
        finalGoldWeight: 22.5,
        finalDiamondWeight: 3.75,
      },
    ],
  ]) {
    o9 = await Orders.get(o9.id)
    await step(o9, stage, patch, 'Update')
  }
  o9 = await Orders.get(o9.id)
  await step(o9, 'delivery', { status: 'Dispatched', assignedPerson: person('delivery'), dispatchDate: addDays(-2), pcs: 1, invoiceNo: 'INV-5521', courierTransporter: 'BlueDart', trackingNo: 'BD9988112' }, 'Dispatched')

  // ---- Order 10: fully delivered, ready to close ---------------------------
  let o10 = await Orders.create(
    {
      customerName: customers[3].name,
      salesPerson: person('sales'),
      orderType: 'New Order',
      priority: 'Normal',
      orderDate: addDays(-40),
      targetDeliveryDate: addDays(-10),
      productName: products[3].name,
      productCode: products[3].code,
      quantity: 2,
      size: '2.0mm stud',
      gold: { purity: '22K', colour: 'Yellow', estimatedWeight: 11, remarks: '' },
      diamond: { pcs: 20, weight: 0.9 },
    },
    SEED_USER
  )
  for (const [stage, patch] of [
    ['planning', { status: 'Approved', assignedPerson: person('production_manager'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('production_manager'), completionDate: addDays(-39) }],
    ['karigarAssign', assignKarigar(3, -38)],
    ['cad', { status: 'Approved', assignedPerson: person('cad_designer'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('management'), completionDate: addDays(-36) }],
    ['camRpt', { status: 'Completed', assignedPerson: person('cam_operator'), machine: 'CAM-02', completionDate: addDays(-33) }],
    ['gemStone', specifyGemstone(1, -32)],
    ['casting', { status: 'Completed', assignedPerson: person('casting_operator'), completionDate: addDays(-30), castingDate: addDays(-30), goldPurity: '22K', goldColour: 'Yellow', sizeOfArticle: '2.0mm stud', plannedPcs: 2, castedPcs: 2, goldWeight: 11.2, rejectedPcs: 0 }],
    ['filling', { status: 'Completed', assignedPerson: person('filling_operator'), completionDate: addDays(-26), fillingType: 'Hand', weightBeforeFilling: 11.2, weightAfterFilling: 11.3 }],
    ['diamondSetting', { status: 'Completed', assignedPerson: person('diamond_setter'), completionDate: addDays(-22), diamondIssues: [diamondIssue('Marquise', '1.5mm', 'SI1', 'H', 20, 0.9)], issuedPcs: 20, issuedWeight: 0.9, usedPcs: 20, usedWeight: 0.88 }],
    ['rhodium', { status: 'Completed', assignedPerson: person('rhodium_operator'), completionDate: addDays(-18), rhodiumType: 'Full', weightBefore: 11.3, weightAfter: 11.34 }],
    ['finalQc', { status: 'Approved', assignedPerson: person('qc'), completionDate: addDays(-14), finalPcs: 2, finalGoldWeight: 11.2, finalDiamondPcs: 20, finalDiamondWeight: 0.88, checklist: passChecklist() }],
    [
      'packing',
      {
        status: 'Packed',
        assignedPerson: person('packing'),
        completionDate: addDays(-10),
        pcs: 2,
        tagNo: 'TAG-0092',
        certificateNo: 'CERT-220',
        invoiceNo: 'INV-4410',
        finalGoldWeight: 11.2,
        finalDiamondWeight: 0.88,
      },
    ],
    ['delivery', { status: 'Delivered', assignedPerson: person('delivery'), completionDate: addDays(-7), dispatchDate: addDays(-7), pcs: 2, invoiceNo: 'INV-4410', courierTransporter: 'Hand Delivery' }],
  ]) {
    o10 = await Orders.get(o10.id)
    await step(o10, stage, patch, 'Update')
  }
  o10 = await Orders.get(o10.id)
  await Orders.closeOrder(o10.id, { remarks: 'Customer collected in person and confirmed satisfaction.' }, SEED_USER)

  // ---- Order 11: on-hold example (CAD on hold) -----------------------------
  let o11 = await Orders.create(
    {
      customerName: customers[4].name,
      salesPerson: person('sales'),
      orderType: 'Custom Design',
      priority: 'Low',
      orderDate: addDays(-6),
      targetDeliveryDate: addDays(35),
      productName: products[4].name,
      productCode: products[4].code,
      quantity: 1,
      size: '18 inch',
      gold: { purity: '18K', colour: 'Yellow', estimatedWeight: 14, remarks: 'Awaiting customer confirmation on design' },
      diamond: { pcs: 45, weight: 1.9 },
    },
    SEED_USER
  )
  await step(o11, 'planning', { status: 'Approved', assignedPerson: person('production_manager'), designerName: person('cad_designer'), cadVersion: 'V1', approvedBy: person('production_manager'), completionDate: addDays(-4) }, 'Approve Planning')
  o11 = await Orders.get(o11.id)
  await step(o11, 'karigarAssign', assignKarigar(0, -3), 'Assign Karigar')
  o11 = await Orders.get(o11.id)
  await step(o11, 'cad', { status: 'Hold', assignedPerson: person('cad_designer'), designerName: person('cad_designer'), remarks: 'Customer requested design change — on hold pending confirmation.' }, 'Hold')

  return true
  } finally {
    setFastMode(false)
  }
}

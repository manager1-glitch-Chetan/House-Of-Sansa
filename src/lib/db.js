// ---------------------------------------------------------------------------
// House of Sansa — local data layer
// ---------------------------------------------------------------------------
// This module is the single source of truth for all application data. It is
// deliberately written as an isolated "repository" layer — every function
// returns a Promise, mimicking calls to a real REST/GraphQL API — so that a
// future migration to a real backend (Node/Express + PostgreSQL, per the
// relational schema documented in DATABASE.md) only requires re-implementing
// the functions in this file; every screen in the app talks to this module
// only, never to localStorage directly.
//
// Persistence: browser localStorage (JSON blob). Attachments are stored as
// data URLs alongside the record they belong to, so they always stay linked
// to their order/stage per the business rules.
// ---------------------------------------------------------------------------

import { DB_KEY, STAGES, STAGE_KEYS, stageIndex, MASTER_TYPES, ORDER_OVERALL_STATUS, TERMINAL_STATUSES } from './constants'
import { uid, todayISO, computeDelay, summarizeFields } from './utils'

const LATENCY = 120 // ms — simulated network latency, keeps async UX honest
let fastMode = false // bypassed during first-run demo-data seeding only

export function setFastMode(on) {
  fastMode = on
}

function delay(result) {
  if (fastMode) return Promise.resolve(result)
  return new Promise((resolve) => setTimeout(() => resolve(result), LATENCY))
}

// ---------------------------------------------------------------------------
// Storage plumbing
// ---------------------------------------------------------------------------
function readRaw() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeRaw(state) {
  localStorage.setItem(DB_KEY, JSON.stringify(state))
}

// Default option lists for every Masters-backed dropdown. Shared by
// seedDatabase() (first run) and ensureMasterDefaults() (backfilling a master
// list that was added to the app after a user's DB was already seeded).
const MASTER_SEED_DEFAULTS = {
  metalType: ['Gold', 'Silver'],
  goldPurity: ['14K', '18K', '22K'],
  goldColour: ['Yellow', 'Rose', 'White'],
  silverPurity: ['925 Sterling', '999 Fine'],
  silverColour: ['White', 'Oxidized', 'Antique'],
  diamondShape: ['Round', 'Princess', 'Oval', 'Pear', 'Emerald', 'Marquise', 'Cushion'],
  diamondSize: ['0.5mm', '1.0mm', '1.5mm', '2.0mm', '2.5mm', '3.0mm'],
  diamondQuality: ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1'],
  diamondColour: ['D', 'E', 'F', 'G', 'H', 'I'],
  gemstoneType: ['Ruby', 'Emerald', 'Sapphire', 'Pearl', 'Amethyst', 'Topaz', 'Aquamarine', 'Tourmaline'],
  gemstoneShape: ['Round', 'Oval', 'Pear', 'Emerald', 'Cushion', 'Marquise', 'Cabochon'],
  gemstoneSize: ['3mm', '4mm', '5mm', '6mm', '8mm'],
  gemstoneQuality: ['AAA', 'AA', 'A', 'B'],
  gemstoneColour: ['Red', 'Green', 'Blue', 'Pink', 'Yellow', 'Purple'],
  settingType: ['Prong', 'Pave', 'Bezel', 'Channel', 'Invisible'],
  rhodiumType: ['White Rhodium', 'Black Rhodium', 'Rose Rhodium'],
  deliveryType: ['Hand Delivery', 'Courier', 'Transporter', 'Customer Pickup'],
  priority: ['Low', 'Normal', 'High', 'Urgent'],
  orderType: ['New Order', 'Repair', 'Repeat Order', 'Custom Design'],
  defectType: ['Casting Porosity', 'Surface Crack', 'Missing Diamond', 'Loose Diamond', 'Scratch', 'Dimension Mismatch'],
  packingType: ['Standard Box', 'Premium Box', 'Gift Box', 'Bulk Pack'],
  productCategory: ['Ring', 'Necklace', 'Earring', 'Bracelet', 'Pendant', 'Bangle'],
  department: ['Sales', 'Production Planning', 'CAD', 'CAM', 'Gem Stone', 'Casting', 'Filling', 'Diamond Setting', 'Rhodium', 'Quality Control', 'Packing', 'Delivery', 'Management'],
}

// Backfills any Masters list that ships with the app but is missing from a
// user's already-seeded DB (e.g. after this feature is added on top of an
// existing localStorage database), without touching lists that already exist
// (so items a user has since edited/removed are left alone).
function ensureMasterDefaults(state) {
  if (!state.masters) state.masters = {}
  let changed = false
  MASTER_TYPES.forEach((m) => {
    if (!(m.key in state.masters)) {
      state.masters[m.key] = (MASTER_SEED_DEFAULTS[m.key] || []).map((n) => ({ id: uid('m'), name: n, active: true }))
      changed = true
    }
  })
  if (changed) writeRaw(state)
}

let STATE = readRaw()
if (!STATE) {
  STATE = seedDatabase()
  writeRaw(STATE)
} else {
  ensureMasterDefaults(STATE)
}

export const dbEvents = new EventTarget()

function persist() {
  STATE.meta.updatedAt = new Date().toISOString()
  writeRaw(STATE)
  dbEvents.dispatchEvent(new Event('change'))
}

export function resetDatabase() {
  STATE = seedDatabase()
  writeRaw(STATE)
  return delay(true)
}

export function exportDatabaseJSON() {
  return JSON.stringify(STATE, null, 2)
}

// ---------------------------------------------------------------------------
// Generic collection helpers
// ---------------------------------------------------------------------------
function list(collection) {
  return delay(structuredClone(STATE[collection] || []))
}
function get(collection, id) {
  const item = (STATE[collection] || []).find((x) => x.id === id)
  return delay(item ? structuredClone(item) : null)
}
function create(collection, data) {
  const item = { id: uid(collection.slice(0, 3)), createdAt: new Date().toISOString(), ...data }
  STATE[collection].push(item)
  persist()
  return delay(structuredClone(item))
}
function update(collection, id, patch) {
  const idx = (STATE[collection] || []).findIndex((x) => x.id === id)
  if (idx === -1) return delay(null)
  STATE[collection][idx] = { ...STATE[collection][idx], ...patch, updatedAt: new Date().toISOString() }
  persist()
  return delay(structuredClone(STATE[collection][idx]))
}
function remove(collection, id) {
  STATE[collection] = (STATE[collection] || []).filter((x) => x.id !== id)
  persist()
  return delay(true)
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const Users = {
  list: () => list('users'),
  get: (id) => get('users', id),
  create: (data) => create('users', data),
  update: (id, patch) => update('users', id, patch),
  remove: (id) => remove('users', id),
  findByUsername: (username) =>
    delay(structuredClone(STATE.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null)),
}

// ---------------------------------------------------------------------------
// Masters (customers / employees / products live as first-class collections;
// simple dropdown lists live under STATE.masters[type])
// ---------------------------------------------------------------------------
export const Customers = {
  list: () => list('customers'),
  create: (data) => create('customers', data),
  update: (id, patch) => update('customers', id, patch),
  remove: (id) => remove('customers', id),
}
export const Employees = {
  list: () => list('employees'),
  create: (data) => create('employees', data),
  update: (id, patch) => update('employees', id, patch),
  remove: (id) => remove('employees', id),
}
export const Products = {
  list: () => list('products'),
  create: (data) => create('products', data),
  update: (id, patch) => update('products', id, patch),
  remove: (id) => remove('products', id),
}

export const Masters = {
  listType: (type) => delay(structuredClone(STATE.masters[type] || [])),
  listAll: () => delay(structuredClone(STATE.masters)),
  create: (type, data) => {
    const item = { id: uid('m'), active: true, createdAt: new Date().toISOString(), ...data }
    STATE.masters[type] = STATE.masters[type] || []
    STATE.masters[type].push(item)
    persist()
    return delay(structuredClone(item))
  },
  update: (type, id, patch) => {
    const arr = STATE.masters[type] || []
    const idx = arr.findIndex((x) => x.id === id)
    if (idx === -1) return delay(null)
    arr[idx] = { ...arr[idx], ...patch }
    persist()
    return delay(structuredClone(arr[idx]))
  },
  remove: (type, id) => {
    STATE.masters[type] = (STATE.masters[type] || []).filter((x) => x.id !== id)
    persist()
    return delay(true)
  },
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export const Notifications = {
  list: () => delay(structuredClone(STATE.notifications).sort((a, b) => new Date(b.at) - new Date(a.at))),
  markRead: (id) => update('notifications', id, { read: true }),
  markAllRead: () => {
    STATE.notifications = STATE.notifications.map((n) => ({ ...n, read: true }))
    persist()
    return delay(true)
  },
  unreadCount: () => delay(STATE.notifications.filter((n) => !n.read).length),
}

function pushNotification({ type, message, orderId, orderNumber, severity = 'info' }) {
  STATE.notifications.push({
    id: uid('ntf'),
    type,
    message,
    orderId,
    orderNumber,
    severity,
    read: false,
    at: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// Audit log (system-wide, in addition to per-order/per-stage history)
// ---------------------------------------------------------------------------
export const AuditLogs = {
  list: () => delay(structuredClone(STATE.auditLogs).sort((a, b) => new Date(b.at) - new Date(a.at))),
}

function pushAudit({ user, entity, entityId, action, details }) {
  STATE.auditLogs.push({
    id: uid('aud'),
    user: user?.name || 'System',
    role: user?.role || '-',
    entity,
    entityId,
    action,
    details: details || '',
    at: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
function nextOrderNumber() {
  const year = new Date().getFullYear()
  const seq = STATE.counters.order++
  return `HOS-${year}-${String(seq).padStart(4, '0')}`
}

function blankStageRecord(extra = {}) {
  return {
    status: 'Pending',
    assignedPerson: '',
    department: '',
    startDate: '',
    targetDate: '',
    completionDate: '',
    remarks: '',
    attachments: [],
    createdBy: '',
    approvedBy: '',
    approvalDate: '',
    history: [],
    ...extra,
  }
}

function initStages(order) {
  const s = {}
  s.orderReceived = blankStageRecord({
    status: 'Completed',
    assignedPerson: order.salesPerson,
    department: 'Sales',
    startDate: order.orderDate,
    targetDate: order.orderDate,
    completionDate: order.orderDate,
    createdBy: order.createdBy,
  })
  s.planning = blankStageRecord()
  s.karigarAssign = blankStageRecord()
  s.cad = blankStageRecord({ revisions: [] })
  s.camRpt = blankStageRecord()
  s.gemStone = blankStageRecord({ particulars: [] })
  s.casting = blankStageRecord()
  s.filling = blankStageRecord()
  s.diamondSetting = blankStageRecord()
  s.rhodium = blankStageRecord()
  s.finalQc = blankStageRecord({ checklist: [] })
  s.packing = blankStageRecord({ checklist: [] })
  s.delivery = blankStageRecord()
  s.closed = blankStageRecord()
  return s
}

export const Orders = {
  list: () => list('orders'),
  get: (id) => get('orders', id),
  getByNumber: (orderNumber) =>
    delay(structuredClone(STATE.orders.find((o) => o.orderNumber === orderNumber) || null)),

  create: (data, user) => {
    const orderNumber = nextOrderNumber()
    const orderReceivedFields = [
      { label: 'Order Date', value: data.orderDate },
      { label: 'Customer', value: data.customerName },
      { label: 'Design / Item', value: data.productName },
      { label: 'Pcs', value: data.quantity },
      { label: 'Size', value: data.size },
      { label: 'Metal Type', value: data.gold?.type },
      { label: 'Gold Purity', value: data.gold?.purity },
      { label: 'Gold Colour', value: data.gold?.colour },
      { label: 'Gold Weight', value: data.gold?.estimatedWeight },
      { label: 'Diamond Pcs', value: data.diamond?.pcs },
      { label: 'Diamond Weight', value: data.diamond?.weight },
      { label: 'Diamond Particulars', value: data.diamond?.particulars?.length ? `${data.diamond.particulars.length} type(s)` : undefined },
      { label: 'Target Date', value: data.targetDeliveryDate },
    ].filter((f) => f.value !== '' && f.value != null)

    const order = {
      id: uid('ord'),
      orderNumber,
      // Order Received is marked Completed below (initStages), so the order
      // starts life already sitting in the Order Planning queue, not stuck
      // on a stage that has no work-queue page of its own.
      currentStage: 'planning',
      overallStatus: ORDER_OVERALL_STATUS.NEW,
      createdBy: user?.name || 'System',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          id: uid('h'),
          at: new Date().toISOString(),
          user: user?.name || 'System',
          stage: 'orderReceived',
          prevStatus: '-',
          newStatus: 'Completed',
          action: 'Order Created',
          remarks: 'Order received and logged into the system.',
          fields: orderReceivedFields,
        },
      ],
      ...data,
    }
    order.stages = initStages(order)
    STATE.orders.push(order)
    pushNotification({
      type: 'New Order',
      message: `New order ${orderNumber} received for ${order.customerName}.`,
      orderId: order.id,
      orderNumber,
      severity: 'info',
    })
    pushAudit({ user, entity: 'order', entityId: order.id, action: 'CREATE', details: `Order ${orderNumber} created` })
    persist()
    return delay(structuredClone(order))
  },

  updateHeader: (id, patch, user) => {
    const order = STATE.orders.find((o) => o.id === id)
    if (!order) return delay(null)
    Object.assign(order, patch)
    pushAudit({ user, entity: 'order', entityId: id, action: 'UPDATE_HEADER', details: JSON.stringify(patch) })
    persist()
    return delay(structuredClone(order))
  },

  remove: (id) => remove('orders', id),

  /**
   * Central stage-update engine. Every stage screen in the UI calls this.
   * - Enforces sequential workflow unless `override` is passed (Admin/Mgmt).
   * - Recomputes delay, appends to stage history, advances currentStage when
   *   a stage reaches a terminal status, and raises notifications.
   */
  updateStage: (orderId, stageKey, patch, meta = {}) => {
    const order = STATE.orders.find((o) => o.id === orderId)
    if (!order) return delay(null)
    const { user, action = 'Update', remarks, override } = meta

    const idx = stageIndex(stageKey)
    if (idx > 0 && !override) {
      const prevKey = STAGE_KEYS[idx - 1]
      const prevStage = order.stages[prevKey]
      const prevDone = TERMINAL_STATUSES.includes(prevStage.status)
      if (!prevDone) {
        return delay({
          error: `Cannot update "${stageKey}" — previous stage "${prevKey}" is not completed yet. An Admin/Management override is required to bypass this.`,
        })
      }
    }

    const stage = order.stages[stageKey]
    const prevStatus = stage.status
    Object.assign(stage, patch)
    if (!stage.startDate && patch.status && patch.status !== 'Pending') {
      stage.startDate = stage.startDate || todayISO()
    }

    const terminal = TERMINAL_STATUSES.includes(stage.status)
    if (terminal && !stage.completionDate) stage.completionDate = todayISO()
    const delayInfo = computeDelay({
      targetDate: stage.targetDate,
      completionDate: stage.completionDate,
      status: stage.status,
      isTerminal: terminal,
    })
    stage.delayDays = delayInfo.delayDays
    stage.delayState = delayInfo.state

    const fields = summarizeFields(patch)

    stage.history.push({
      id: uid('h'),
      at: new Date().toISOString(),
      user: user?.name || 'System',
      stage: stageKey,
      prevStatus,
      newStatus: stage.status,
      action,
      remarks: remarks || patch.remarks || '',
      fields,
    })

    order.history.push({
      id: uid('h'),
      at: new Date().toISOString(),
      user: user?.name || 'System',
      stage: stageKey,
      prevStatus,
      newStatus: stage.status,
      action,
      remarks: remarks || patch.remarks || '',
      fields,
    })

    // Advance workflow pointer + overall status
    if (terminal) {
      const nextIdx = idx + 1
      if (nextIdx < STAGE_KEYS.length) {
        order.currentStage = STAGE_KEYS[nextIdx]
        const nextStage = order.stages[STAGE_KEYS[nextIdx]]
        if (!nextStage.startDate) nextStage.startDate = ''
      }
      pushNotification({
        type: 'Stage Completed',
        message: `${order.orderNumber}: "${stageKey}" marked ${stage.status}.`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        severity: 'success',
      })
    } else if (['Revision Required', 'Rework Required', 'QC Failed'].includes(stage.status)) {
      pushNotification({
        type: stage.status,
        message: `${order.orderNumber}: ${stageKey} flagged "${stage.status}".`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        severity: 'warning',
      })
    } else if (stage.status === 'In Progress' && prevStatus !== 'In Progress') {
      pushNotification({
        type: 'Stage Started',
        message: `${order.orderNumber}: ${stageKey} started.`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        severity: 'info',
      })
    }

    recomputeOverallStatus(order)
    pushAudit({ user, entity: 'order', entityId: orderId, action: `STAGE_${stageKey}_${action}`.toUpperCase(), details: remarks })
    persist()
    return delay(structuredClone(order))
  },

  closeOrder: (orderId, { remarks }, user) => {
    const order = STATE.orders.find((o) => o.id === orderId)
    if (!order) return delay(null)
    const qcOk = order.stages.finalQc.status === 'Approved'
    const packOk = order.stages.packing.status === 'Packed'
    const deliveryOk = order.stages.delivery.status === 'Delivered'
    if (!qcOk || !packOk || !deliveryOk) {
      return delay({ error: 'Order can only be closed after Final QC is Approved, Packing is Packed, and Delivery is Delivered.' })
    }
    const stage = order.stages.closed
    stage.status = 'Completed'
    stage.completionDate = todayISO()
    stage.closedBy = user?.name || 'System'
    stage.remarks = remarks
    stage.history.push({
      id: uid('h'),
      at: new Date().toISOString(),
      user: user?.name || 'System',
      stage: 'closed',
      prevStatus: 'Pending',
      newStatus: 'Completed',
      action: 'Order Closed',
      remarks,
    })
    order.currentStage = 'closed'
    order.overallStatus = ORDER_OVERALL_STATUS.CLOSED
    order.closedDate = todayISO()
    order.closedBy = user?.name || 'System'
    order.history.push({
      id: uid('h'),
      at: new Date().toISOString(),
      user: user?.name || 'System',
      stage: 'closed',
      prevStatus: '-',
      newStatus: 'Closed',
      action: 'Order Closed',
      remarks,
    })
    pushAudit({ user, entity: 'order', entityId: orderId, action: 'CLOSE_ORDER', details: remarks })
    persist()
    return delay(structuredClone(order))
  },
}

function recomputeOverallStatus(order) {
  if (order.stages.closed.status === 'Completed') {
    order.overallStatus = ORDER_OVERALL_STATUS.CLOSED
    return
  }
  if (order.stages.delivery.status === 'Delivered') {
    order.overallStatus = ORDER_OVERALL_STATUS.DELIVERED
    return
  }
  if (order.stages.packing.status === 'Packed' || order.stages.finalQc.status === 'Approved') {
    order.overallStatus = ORDER_OVERALL_STATUS.READY_FOR_DELIVERY
    return
  }
  const anyHold = STAGE_KEYS.some((k) => order.stages?.[k]?.status === 'Hold')
  if (anyHold) {
    order.overallStatus = ORDER_OVERALL_STATUS.HOLD
    return
  }
  const anyDelayed = STAGE_KEYS.some((k) => {
    const st = order.stages?.[k]
    if (!st?.targetDate) return false
    const terminal = TERMINAL_STATUSES.includes(st.status)
    const info = computeDelay({ targetDate: st.targetDate, completionDate: st.completionDate, status: st.status, isTerminal: terminal })
    return info.state === 'delayed' || info.state === 'completed-late'
  })
  if (anyDelayed) {
    order.overallStatus = ORDER_OVERALL_STATUS.DELAYED
    return
  }
  if (order.stages?.planning?.status === 'Pending') {
    order.overallStatus = ORDER_OVERALL_STATUS.NEW
    return
  }
  order.overallStatus = ORDER_OVERALL_STATUS.IN_PRODUCTION
}

// ---------------------------------------------------------------------------
// Material transactions (gold + diamond ledger, traceable per order)
// ---------------------------------------------------------------------------
export const MaterialTransactions = {
  list: (orderId) =>
    delay(structuredClone(STATE.materialTransactions.filter((t) => !orderId || t.orderId === orderId))),
  create: (data) => create('materialTransactions', data),
}

export function logMaterialTransaction({ orderId, orderNumber, material, type, qty, weight, stage, remarks, user }) {
  STATE.materialTransactions.push({
    id: uid('mt'),
    orderId,
    orderNumber,
    material, // 'gold' | 'diamond'
    type, // 'Issued' | 'Consumed' | 'Recovered' | 'Returned' | 'Broken/Lost' | 'Final'
    qty: qty ?? null,
    weight: weight ?? null,
    stage,
    remarks: remarks || '',
    user: user?.name || 'System',
    at: new Date().toISOString(),
  })
  persist()
}

// ---------------------------------------------------------------------------
// Role permission overrides (Admin-editable matrix, persisted in DB)
// ---------------------------------------------------------------------------
export const Permissions = {
  get: () => delay(structuredClone(STATE.rolePermissions)),
  set: (rolePermissions) => {
    STATE.rolePermissions = rolePermissions
    persist()
    return delay(structuredClone(STATE.rolePermissions))
  },
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
function seedDatabase() {
  const now = new Date().toISOString()
  const masters = {}
  MASTER_TYPES.forEach((m) => (masters[m.key] = (MASTER_SEED_DEFAULTS[m.key] || []).map((n) => ({ id: uid('m'), name: n, active: true }))))

  const users = [
    { id: uid('usr'), name: 'Chetan Sansa', username: 'admin', password: 'admin123', email: 'admin@houseofsansa.com', role: 'admin', department: 'Management', active: true },
    { id: uid('usr'), name: 'Anita Rao', username: 'management', password: 'pass123', email: 'anita@houseofsansa.com', role: 'management', department: 'Management', active: true },
    { id: uid('usr'), name: 'Rohit Sharma', username: 'sales1', password: 'pass123', email: 'rohit@houseofsansa.com', role: 'sales', department: 'Sales', active: true },
    { id: uid('usr'), name: 'Priya Verma', username: 'planner1', password: 'pass123', email: 'priya@houseofsansa.com', role: 'production_manager', department: 'Production Planning', active: true },
    { id: uid('usr'), name: 'Karan Mehta', username: 'cad1', password: 'pass123', email: 'karan@houseofsansa.com', role: 'cad_designer', department: 'CAD', active: true },
    { id: uid('usr'), name: 'Sunil Yadav', username: 'cam1', password: 'pass123', email: 'sunil@houseofsansa.com', role: 'cam_operator', department: 'CAM', active: true },
    { id: uid('usr'), name: 'Manish Gupta', username: 'casting1', password: 'pass123', email: 'manish@houseofsansa.com', role: 'casting_operator', department: 'Casting', active: true },
    { id: uid('usr'), name: 'Deepak Sahu', username: 'filling1', password: 'pass123', email: 'deepak@houseofsansa.com', role: 'filling_operator', department: 'Filling', active: true },
    { id: uid('usr'), name: 'Farhan Ali', username: 'setter1', password: 'pass123', email: 'farhan@houseofsansa.com', role: 'diamond_setter', department: 'Diamond Setting', active: true },
    { id: uid('usr'), name: 'Vikram Singh', username: 'rhodium1', password: 'pass123', email: 'vikram@houseofsansa.com', role: 'rhodium_operator', department: 'Rhodium', active: true },
    { id: uid('usr'), name: 'Neha Joshi', username: 'qc1', password: 'pass123', email: 'neha@houseofsansa.com', role: 'qc', department: 'Quality Control', active: true },
    { id: uid('usr'), name: 'Ramesh Patel', username: 'packing1', password: 'pass123', email: 'ramesh@houseofsansa.com', role: 'packing', department: 'Packing', active: true },
    { id: uid('usr'), name: 'Suresh Nair', username: 'delivery1', password: 'pass123', email: 'suresh@houseofsansa.com', role: 'delivery', department: 'Delivery', active: true },
  ]

  const customers = [
    { id: uid('cus'), name: 'Ananya Textiles Pvt Ltd', contact: '+91 98261 22334', email: 'ananya@textiles.com', address: 'Shastri Chowk, Raipur' },
    { id: uid('cus'), name: 'Ravi Chawla', contact: '+91 94255 11223', email: 'ravi.chawla@gmail.com', address: 'Civil Lines, Raipur' },
    { id: uid('cus'), name: 'Meera Kashyap', contact: '+91 97531 44556', email: 'meera.k@gmail.com', address: 'Telibandha, Raipur' },
    { id: uid('cus'), name: 'Golden Bazaar Retail', contact: '+91 90121 77889', email: 'purchase@goldenbazaar.in', address: 'GE Road, Raipur' },
    { id: uid('cus'), name: 'Sanjay Agrawal', contact: '+91 88271 33445', email: 'sanjay.a@gmail.com', address: 'Pandri, Raipur' },
    { id: uid('cus'), name: 'Kavita Deshmukh', contact: '+91 99771 22110', email: 'kavita.d@gmail.com', address: 'Shankar Nagar, Raipur' },
  ]

  const employees = users.map((u) => ({ id: uid('emp'), name: u.name, role: u.role, department: u.department, contact: '+91 90000 00000', active: true }))

  const products = [
    { id: uid('prd'), name: 'Solitaire Diamond Ring', code: 'RNG-001', category: 'Ring' },
    { id: uid('prd'), name: 'Diamond Halo Pendant', code: 'PND-014', category: 'Pendant' },
    { id: uid('prd'), name: 'Diamond Tennis Bracelet', code: 'BRC-007', category: 'Bracelet' },
    { id: uid('prd'), name: 'Diamond Drop Earrings', code: 'ERG-022', category: 'Earring' },
    { id: uid('prd'), name: 'Bridal Diamond Necklace Set', code: 'NCK-031', category: 'Necklace' },
    { id: uid('prd'), name: 'Diamond Eternity Bangle', code: 'BNG-009', category: 'Bangle' },
  ]

  const rolePermissions = null // null = use DEFAULT_ROLE_PERMISSIONS until admin customises

  return {
    meta: { createdAt: now, updatedAt: now, version: 1 },
    users,
    customers,
    employees,
    products,
    masters,
    orders: [],
    notifications: [],
    auditLogs: [],
    materialTransactions: [],
    rolePermissions,
    counters: { order: 1001 },
  }
}

// Expose STAGES for convenience where needed without re-importing constants
export { STAGES }

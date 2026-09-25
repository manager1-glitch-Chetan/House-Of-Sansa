// ---------------------------------------------------------------------------
// House of Sansa — core workflow & domain constants
// ---------------------------------------------------------------------------

// The 12-step order-to-delivery workflow. Order matters — it drives the
// timeline UI and the "cannot skip a stage" business rule.
// `route` is the URL segment used for that stage's dedicated page under
// /orders/:id/<route> — the Order Received stage lands on "overview" since
// its data is the intake summary rather than a separate action page.
export const STAGES = [
  { key: 'orderReceived', label: 'Order Received', dept: 'Sales', route: 'overview' },
  { key: 'planning', label: 'Order Planning', dept: 'Production Planning', route: 'planning' },
  { key: 'karigarAssign', label: 'Karigar Assign', dept: 'Production Planning', route: 'karigar-assign' },
  { key: 'cad', label: 'CAD', dept: 'CAD', route: 'cad' },
  { key: 'camRpt', label: 'CAM / RPT', dept: 'CAM', route: 'cam-rpt' },
  { key: 'gemStone', label: 'Gem Stone', dept: 'Gem Stone', route: 'gem-stone' },
  { key: 'casting', label: 'Casting', dept: 'Casting', route: 'casting' },
  { key: 'filling', label: 'Filling', dept: 'Filling', route: 'filling' },
  { key: 'diamondSetting', label: 'Diamond Setting', dept: 'Diamond Setting', route: 'diamond-setting' },
  { key: 'rhodium', label: 'Rhodium', dept: 'Rhodium', route: 'rhodium' },
  { key: 'finalQc', label: 'Final Jewellery Checking', dept: 'Quality Control', route: 'final-qc' },
  { key: 'packing', label: 'Packing', dept: 'Packing', route: 'packing' },
  { key: 'delivery', label: 'Delivery', dept: 'Delivery', route: 'delivery' },
  // Not a real production step -- auto-completed the moment Delivery is
  // marked Delivered (see updateStage's "terminal" branch in db.js), so it
  // reads as the workflow's finish line rather than a step someone has to
  // action separately.
  { key: 'closed', label: 'Complete', dept: 'Management', route: 'closed' },
]

export const STAGE_KEYS = STAGES.map((s) => s.key)

export const stageIndex = (key) => STAGE_KEYS.indexOf(key)
export const stageLabel = (key) => STAGES.find((s) => s.key === key)?.label || key
export const routeForStage = (key) => STAGES.find((s) => s.key === key)?.route || key
export const stageForRoute = (route) => STAGES.find((s) => s.route === route)?.key || route

// Generic status vocabulary shared across stages (each stage narrows this).
export const STAGE_STATUS = {
  NOT_STARTED: 'Not Started',
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted for Review',
  REVISION_REQUIRED: 'Revision Required',
  HOLD: 'Hold',
  QC_FAILED: 'QC Failed',
  REWORK: 'Rework Required',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

// Every status value, across every stage, that counts as "this stage is
// done" — used everywhere: sequential-workflow gating, delay calculation,
// dashboard/report aggregation, and the "lock after completion" rule.
// Casting/Filling/Diamond Setting/Rhodium finish on a QC verdict rather than
// a generic "Completed", so their pass statuses are included here too.
export const TERMINAL_STATUSES = [
  STAGE_STATUS.COMPLETED,
  STAGE_STATUS.APPROVED,
  'Delivered',
  'Packed',
  'Closed',
  'QC Passed',
]

export const ORDER_OVERALL_STATUS = {
  NEW: 'New',
  IN_PRODUCTION: 'In Production',
  DELAYED: 'Delayed',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  DELIVERED: 'Delivered',
  CLOSED: 'Closed',
  HOLD: 'Hold',
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
export const ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'management', label: 'Management' },
  { key: 'sales', label: 'Sales' },
  { key: 'production_manager', label: 'Production Manager' },
  { key: 'cad_designer', label: 'CAD Designer' },
  { key: 'cam_operator', label: 'CAM Operator' },
  { key: 'casting_operator', label: 'Casting Operator' },
  { key: 'filling_operator', label: 'Filling Operator' },
  { key: 'diamond_setter', label: 'Diamond Setter' },
  { key: 'rhodium_operator', label: 'Rhodium Operator' },
  { key: 'qc', label: 'QC' },
  { key: 'packing', label: 'Packing' },
  { key: 'delivery', label: 'Delivery' },
]

export const roleLabel = (key) => ROLES.find((r) => r.key === key)?.label || key

// Modules available in the left nav (used by permission checks). Reports
// were folded into the Dashboard, so there is no standalone Reports module.
export const MODULES = {
  DASHBOARD: 'dashboard',
  ORDERS: 'orders',
  MASTERS: 'masters',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
}

// Default module + stage access per role. Admin can edit this matrix at
// runtime (persisted in the DB) — this object only supplies the defaults.
export const DEFAULT_ROLE_PERMISSIONS = {
  admin: { modules: Object.values(MODULES), stages: [...STAGE_KEYS, '*'] },
  management: { modules: Object.values(MODULES), stages: [...STAGE_KEYS] },
  sales: { modules: [MODULES.DASHBOARD, MODULES.ORDERS, MODULES.NOTIFICATIONS], stages: ['orderReceived'] },
  production_manager: {
    modules: [MODULES.DASHBOARD, MODULES.ORDERS, MODULES.NOTIFICATIONS],
    stages: ['planning', 'karigarAssign', 'cad', 'camRpt', 'gemStone', 'casting', 'filling', 'diamondSetting', 'rhodium'],
  },
  cad_designer: { modules: [MODULES.DASHBOARD, MODULES.ORDERS, MODULES.NOTIFICATIONS], stages: ['cad'] },
  cam_operator: { modules: [MODULES.DASHBOARD, MODULES.ORDERS, MODULES.NOTIFICATIONS], stages: ['camRpt'] },
  casting_operator: { modules: [MODULES.DASHBOARD, MODULES.ORDERS, MODULES.NOTIFICATIONS], stages: ['casting'] },
  filling_operator: { modules: [MODULES.DASHBOARD, MODULES.ORDERS, MODULES.NOTIFICATIONS], stages: ['filling'] },
  diamond_setter: { modules: [MODULES.DASHBOARD, MODULES.ORDERS, MODULES.NOTIFICATIONS], stages: ['diamondSetting'] },
  rhodium_operator: { modules: [MODULES.DASHBOARD, MODULES.ORDERS, MODULES.NOTIFICATIONS], stages: ['rhodium'] },
  qc: { modules: [MODULES.DASHBOARD, MODULES.ORDERS, MODULES.NOTIFICATIONS], stages: ['finalQc'] },
  packing: { modules: [MODULES.DASHBOARD, MODULES.ORDERS, MODULES.NOTIFICATIONS], stages: ['packing'] },
  delivery: { modules: [MODULES.DASHBOARD, MODULES.ORDERS, MODULES.NOTIFICATIONS], stages: ['delivery'] },
}

// ---------------------------------------------------------------------------
// Dropdown master keys (all fed from the Masters module)
// ---------------------------------------------------------------------------
export const MASTER_TYPES = [
  { key: 'karigar', label: 'Karigar', fields: ['name'] },
  { key: 'metalType', label: 'Metal Type', fields: ['name'] },
  { key: 'goldPurity', label: 'Gold Purity', fields: ['name'] },
  { key: 'goldColour', label: 'Gold Colour', fields: ['name'] },
  { key: 'silverPurity', label: 'Silver Purity', fields: ['name'] },
  { key: 'silverColour', label: 'Silver Colour', fields: ['name'] },
  { key: 'diamondShape', label: 'Diamond Shape', fields: ['name'] },
  { key: 'diamondSize', label: 'Diamond Size', fields: ['name'] },
  { key: 'diamondQuality', label: 'Diamond Quality', fields: ['name'] },
  { key: 'diamondColour', label: 'Diamond Colour', fields: ['name'] },
  { key: 'gemstoneType', label: 'Gemstone Type', fields: ['name'] },
  { key: 'gemstoneShape', label: 'Gemstone Shape', fields: ['name'] },
  { key: 'gemstoneSize', label: 'Gemstone Size', fields: ['name'] },
  { key: 'gemstoneQuality', label: 'Gemstone Quality', fields: ['name'] },
  { key: 'gemstoneColour', label: 'Gemstone Colour', fields: ['name'] },
  { key: 'settingType', label: 'Setting Type', fields: ['name'] },
  { key: 'rhodiumType', label: 'Rhodium Type', fields: ['name'] },
  { key: 'deliveryType', label: 'Delivery Type', fields: ['name'] },
  { key: 'priority', label: 'Priority', fields: ['name'] },
  { key: 'orderType', label: 'Order Type', fields: ['name'] },
  { key: 'defectType', label: 'Defect Type', fields: ['name'] },
  { key: 'packingType', label: 'Packing Type', fields: ['name'] },
  { key: 'productCategory', label: 'Product Category', fields: ['name'] },
  { key: 'department', label: 'Department', fields: ['name'] },
]

// Which Masters lists back the Purity / Colour dropdowns for each metal type
// selected on the Order Received form.
export const METAL_MASTER_KEYS = {
  Gold: { purity: 'goldPurity', colour: 'goldColour' },
  Silver: { purity: 'silverPurity', colour: 'silverColour' },
}

export const GOLD_TOLERANCE_GRAMS = 0.05
export const DIAMOND_TOLERANCE_PCS = 0
export const GEMSTONE_TOLERANCE_PCS = 0

export const CURRENT_USER_KEY = 'hos_session_v1'
export const DB_KEY = 'hos_erp_db_v1'
// Per-table hidden-column choices (DataTable `columnsKey`), stored per browser.
export const TABLE_COLUMNS_KEY_PREFIX = 'hos_table_cols_v1:'

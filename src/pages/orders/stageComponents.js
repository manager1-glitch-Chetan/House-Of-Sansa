import PlanningTab from './stages/PlanningTab'
import KarigarAssignTab from './stages/KarigarAssignTab'
import CadTab from './stages/CadTab'
import CamRptTab from './stages/CamRptTab'
import GemStoneTab from './stages/GemStoneTab'
import CastingTab from './stages/CastingTab'
import FillingTab from './stages/FillingTab'
import DiamondSettingTab from './stages/DiamondSettingTab'
import RhodiumTab from './stages/RhodiumTab'
import FinalQcTab from './stages/FinalQcTab'
import PackingTab from './stages/PackingTab'
import DeliveryTab from './stages/DeliveryTab'
import ClosedTab from './stages/ClosedTab'

// Shared registry — the actual per-stage form component for each stage key.
// Used both by the full-page order flow (OrderStagePage) and by the
// "Action" button on each stage's work-queue table (StageQueuePage), so the
// exact same form opens either way.
export const STAGE_COMPONENTS = {
  planning: PlanningTab,
  karigarAssign: KarigarAssignTab,
  cad: CadTab,
  camRpt: CamRptTab,
  gemStone: GemStoneTab,
  casting: CastingTab,
  filling: FillingTab,
  diamondSetting: DiamondSettingTab,
  rhodium: RhodiumTab,
  finalQc: FinalQcTab,
  packing: PackingTab,
  delivery: DeliveryTab,
  closed: ClosedTab,
}

/** 方格远征：运行时规则修饰（由遗物聚合） */
export type RogueModifiers = {
  /** N→1 */
  reverse: boolean
  /** 下一格轻微高亮 */
  hintNext: boolean
  /** 未点区域变暗 */
  fog: boolean
  /** 彩色干扰更吵（更多色调） */
  loudColors: boolean
  /** 每点对 N 个后洗牌 */
  reshuffleEvery: number | null
  /** 层时限加减（秒） */
  timerDeltaSec: number
  /** 点对后格子消失（行囊；默认不消失） */
  vanishCleared: boolean
  /** 开局自动按顺序消掉前 N 个数（行囊） */
  autoClearCount: number
}

export type RelicRarity = 'common' | 'rare' | 'epic'

/** 遗物倾向：增益带代价、减益有补偿、险注自担风险 */
export type RelicKind = 'buff' | 'debuff' | 'risk'

export type RelicDef = {
  id: string
  name: string
  description: string
  rarity: RelicRarity
  kind: RelicKind
  /** 应用到修饰器 */
  apply: (m: RogueModifiers) => void
  /** 获得时立刻改专注（可正可负） */
  focusOnPickup?: number
}

export type LayerKind = 'normal' | 'elite' | 'boss'

export type LayerDef = {
  index: number
  kind: LayerKind
  label: string
  gridSize: number
  /** 基础时限（秒），再加遗物 timerDelta */
  baseTimeSec: number
  /** 选卡时稀有权重加成 */
  rareWeightBonus: number
  /** 本层固定规则干扰（与遗物叠加；八层阶段最高 6×6，不加 7/8） */
  layerMods?: Partial<RogueModifiers>
  /** 给玩家看的本层提示 */
  hint?: string
}

export type RogueRunResult = {
  won: boolean
  layersCleared: number
  focusLeft: number
  totalWrong: number
  durationMs: number
  relics: string[]
  seed: string
}

export function emptyModifiers(): RogueModifiers {
  return {
    reverse: false,
    hintNext: false,
    fog: false,
    loudColors: false,
    reshuffleEvery: null,
    timerDeltaSec: 0,
    vanishCleared: false,
    autoClearCount: 0,
  }
}

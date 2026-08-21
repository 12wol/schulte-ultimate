import { emptyModifiers, type LayerDef, type RogueModifiers, type RelicDef } from './types'

export const START_FOCUS = 3
export const ROGUE_VARIANT_ID = 'schulte-rogue'

/** 八层配置（见 docs/schulte-rogue-design.md） */
export const ROGUE_LAYERS: LayerDef[] = [
  { index: 1, kind: 'normal', label: '林间小径', gridSize: 3, baseTimeSec: 45, rareWeightBonus: 0 },
  { index: 2, kind: 'normal', label: '蘑菇坡', gridSize: 4, baseTimeSec: 50, rareWeightBonus: 0 },
  { index: 3, kind: 'normal', label: '河滩', gridSize: 4, baseTimeSec: 45, rareWeightBonus: 0 },
  { index: 4, kind: 'elite', label: '精英·古树', gridSize: 5, baseTimeSec: 55, rareWeightBonus: 2 },
  { index: 5, kind: 'normal', label: '雾谷', gridSize: 5, baseTimeSec: 50, rareWeightBonus: 0 },
  { index: 6, kind: 'normal', label: '断桥', gridSize: 5, baseTimeSec: 45, rareWeightBonus: 1 },
  { index: 7, kind: 'elite', label: '精英·夜市', gridSize: 6, baseTimeSec: 60, rareWeightBonus: 2 },
  { index: 8, kind: 'boss', label: 'Boss·终章方阵', gridSize: 6, baseTimeSec: 70, rareWeightBonus: 0 },
]

export const RELICS: RelicDef[] = [
  {
    id: 'magnifier',
    name: '放大镜',
    description: '正确的下一格会轻轻呼吸提示。',
    rarity: 'common',
    apply: (m) => {
      m.hintNext = true
    },
  },
  {
    id: 'reverse-watch',
    name: '倒走表',
    description: '之后改成从大点到小。',
    rarity: 'rare',
    apply: (m) => {
      m.reverse = true
    },
  },
  {
    id: 'kaleidoscope',
    name: '万花筒',
    description: '颜色更吵，别被晃花眼。',
    rarity: 'common',
    apply: (m) => {
      m.loudColors = true
    },
  },
  {
    id: 'quake',
    name: '地震',
    description: '每点对 3 个，格子会重新洗一遍。',
    rarity: 'rare',
    apply: (m) => {
      m.reshuffleEvery = 3
    },
  },
  {
    id: 'calm-tea',
    name: '镇定茶',
    description: '立刻回复 1 点专注。',
    rarity: 'common',
    apply: () => undefined,
    focusOnPickup: 1,
  },
  {
    id: 'small-hourglass',
    name: '小沙漏',
    description: '每层时限 +8 秒。',
    rarity: 'common',
    apply: (m) => {
      m.timerDeltaSec += 8
    },
  },
  {
    id: 'gambler-dice',
    name: '赌徒骰',
    description: '点错一次扣 2 点专注；选遗物时更容易刷到稀有。',
    rarity: 'rare',
    apply: () => undefined,
  },
  {
    id: 'fog',
    name: '迷雾',
    description: '还没点到的格子会变暗。',
    rarity: 'common',
    apply: (m) => {
      m.fog = true
    },
  },
  {
    id: 'big-hourglass',
    name: '大沙漏',
    description: '每层时限 +15 秒。',
    rarity: 'rare',
    apply: (m) => {
      m.timerDeltaSec += 15
    },
  },
  {
    id: 'focus-leaf',
    name: '专注叶',
    description: '立刻回复 1 点专注，且之后层时限 +5 秒。',
    rarity: 'rare',
    apply: (m) => {
      m.timerDeltaSec += 5
    },
    focusOnPickup: 1,
  },
]

const BY_ID = Object.fromEntries(RELICS.map((r) => [r.id, r])) as Record<string, RelicDef>

export function getRelic(id: string): RelicDef | undefined {
  return BY_ID[id]
}

/** 聚合遗物 → 战斗修饰 */
export function buildModifiers(relicIds: string[]): RogueModifiers {
  const m = emptyModifiers()
  for (const id of relicIds) {
    BY_ID[id]?.apply(m)
  }
  return m
}

export function hasGamblerDice(relicIds: string[]): boolean {
  return relicIds.includes('gambler-dice')
}

/** Boss 层额外固定规则 */
export function withBossPack(base: RogueModifiers): RogueModifiers {
  return {
    ...base,
    reverse: true,
    reshuffleEvery: base.reshuffleEvery ?? 4,
    loudColors: true,
  }
}

function rarityWeight(r: RelicDef['rarity'], bonus: number): number {
  if (r === 'common') return 8
  if (r === 'rare') return 3 + bonus
  return 1 + Math.floor(bonus / 2)
}

/** 三选一：不重复已有遗物 */
export function rollRelicChoices(
  owned: string[],
  rareWeightBonus: number,
  count = 3,
): RelicDef[] {
  const pool = RELICS.filter((r) => !owned.includes(r.id))
  if (pool.length === 0) return []

  const picked: RelicDef[] = []
  const bag = [...pool]

  while (picked.length < count && bag.length > 0) {
    const weights = bag.map((r) => rarityWeight(r.rarity, rareWeightBonus))
    const sum = weights.reduce((a, b) => a + b, 0)
    let roll = Math.random() * sum
    let idx = 0
    for (let i = 0; i < bag.length; i += 1) {
      roll -= weights[i] ?? 0
      if (roll <= 0) {
        idx = i
        break
      }
    }
    const [choice] = bag.splice(idx, 1)
    if (choice) picked.push(choice)
  }

  return picked
}

export function npcResultLine(won: boolean, layersCleared: number): string {
  if (won) return '哇，你走到终章啦！岛上的风都在为你鼓掌～'
  if (layersCleared <= 1) return '才刚出门就晃悠回来啦，喝口茶再出发？'
  if (layersCleared <= 4) return '走了半程山林，下次带上放大镜也许更稳～'
  return '就差一点点！终章方阵在等你回来挑战哦。'
}

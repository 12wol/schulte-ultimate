import { emptyModifiers, type LayerDef, type RogueModifiers, type RelicDef } from './types'

export const START_FOCUS = 3
export const ROGUE_VARIANT_ID = 'schulte-rogue'
/** 远征成绩入库用的统一 grid_size（榜单聚合桶，与末层实际网格无关） */
export const ROGUE_LEADERBOARD_GRID = 5

/** 八层配置：时限按约 5×5≈30s 水平收紧；最高 6×6 */
export const ROGUE_LAYERS: LayerDef[] = [
  {
    index: 1,
    kind: 'normal',
    label: '林间小径',
    gridSize: 3,
    baseTimeSec: 16,
    rareWeightBonus: 0,
    hint: '热热身，沙漏不等人哦。',
  },
  {
    index: 2,
    kind: 'normal',
    label: '蘑菇坡',
    gridSize: 4,
    baseTimeSec: 26,
    rareWeightBonus: 0,
    hint: '格子多了点，时限也更贴身。',
  },
  {
    index: 3,
    kind: 'normal',
    label: '河滩',
    gridSize: 4,
    baseTimeSec: 20,
    rareWeightBonus: 0,
    hint: '水声催人：本层更赶时间。',
  },
  {
    index: 4,
    kind: 'elite',
    label: '精英·古树',
    gridSize: 5,
    baseTimeSec: 34,
    rareWeightBonus: 2,
    layerMods: { loudColors: true },
    hint: '树影斑驳——颜色开始捣乱。（5×5 大约半分钟量级）',
  },
  {
    index: 5,
    kind: 'normal',
    label: '雾谷',
    gridSize: 5,
    baseTimeSec: 30,
    rareWeightBonus: 0,
    layerMods: { reshuffleEvery: 5 },
    hint: '雾气搅动：每点对几个，格子会轻轻重排（不是「迷雾」遗物那种好找）。',
  },
  {
    index: 6,
    kind: 'normal',
    label: '断桥',
    gridSize: 5,
    baseTimeSec: 26,
    rareWeightBonus: 1,
    layerMods: { reshuffleEvery: 4 },
    hint: '桥在晃：每点对几个，格子会重排。',
  },
  {
    index: 7,
    kind: 'elite',
    label: '精英·夜市',
    gridSize: 6,
    baseTimeSec: 40,
    rareWeightBonus: 2,
    layerMods: { loudColors: true, reshuffleEvery: 3 },
    hint: '灯火晃眼，摊位还在挪来挪去。',
  },
  {
    index: 8,
    kind: 'boss',
    label: 'Boss·终章方阵',
    gridSize: 6,
    baseTimeSec: 36,
    rareWeightBonus: 0,
    layerMods: { reverse: true, loudColors: true, reshuffleEvery: 3 },
    hint: '终章 6×6：倒序 + 变色 + 重排，时间更紧。',
  },
]

export const RELICS: RelicDef[] = [
  // —— 普通增益：轻帮一把，几乎无代价 ——
  {
    id: 'magnifier',
    name: '放大镜',
    description: '正确的下一格会轻轻呼吸提示。',
    rarity: 'common',
    kind: 'buff',
    apply: (m) => {
      m.hintNext = true
    },
  },
  {
    id: 'calm-tea',
    name: '镇定茶',
    description: '立刻回复 1 点专注。',
    rarity: 'common',
    kind: 'buff',
    apply: () => undefined,
    focusOnPickup: 1,
  },
  {
    id: 'small-hourglass',
    name: '小沙漏',
    description: '每层时限 +6 秒。',
    rarity: 'common',
    kind: 'buff',
    apply: (m) => {
      m.timerDeltaSec += 6
    },
  },

  // —— 稀有增益：桌面轻松很多，但要付「难度税」 ——
  {
    id: 'fog',
    name: '聚光雾',
    description: '只亮当前要找的那一格，其它变暗更好定位；每层时限 −8 秒。',
    rarity: 'rare',
    kind: 'buff',
    apply: (m) => {
      m.fog = true
      m.timerDeltaSec -= 8
    },
  },
  {
    id: 'vanish-pouch',
    name: '消格袋',
    description: '点对的格子会消失，桌面清爽；每层时限 −8 秒。',
    rarity: 'rare',
    kind: 'buff',
    apply: (m) => {
      m.vanishCleared = true
      m.timerDeltaSec -= 8
    },
  },
  {
    id: 'fairy-snip',
    name: '仙灵剪刀',
    description: '每层开局自动按序消掉前 3 个数；每层时限 −10 秒，并立刻 −1 专注。',
    rarity: 'rare',
    kind: 'buff',
    apply: (m) => {
      m.autoClearCount = Math.max(m.autoClearCount, 3)
      m.timerDeltaSec -= 10
    },
    focusOnPickup: -1,
  },
  {
    id: 'big-hourglass',
    name: '大沙漏',
    description: '每层时限 +12 秒；颜色会更吵一点（有得必有失）。',
    rarity: 'rare',
    kind: 'buff',
    apply: (m) => {
      m.timerDeltaSec += 12
      m.loudColors = true
    },
  },
  {
    id: 'focus-leaf',
    name: '专注叶',
    description: '立刻 +1 专注、每层 +5 秒；但之后每点对 5 个会重排一次。',
    rarity: 'rare',
    kind: 'buff',
    apply: (m) => {
      m.timerDeltaSec += 5
      if (m.reshuffleEvery == null || m.reshuffleEvery > 5) {
        m.reshuffleEvery = 5
      }
    },
    focusOnPickup: 1,
  },

  // —— 减益：规则变难，但给时间/专注补偿 ——
  {
    id: 'kaleidoscope',
    name: '万花筒',
    description: '颜色更吵，别被晃花眼；补偿：每层时限 +8 秒。',
    rarity: 'common',
    kind: 'debuff',
    apply: (m) => {
      m.loudColors = true
      m.timerDeltaSec += 8
    },
  },
  {
    id: 'reverse-watch',
    name: '倒走表',
    description: '之后改成从大点到小；补偿：每层时限 +12 秒。',
    rarity: 'rare',
    kind: 'debuff',
    apply: (m) => {
      m.reverse = true
      m.timerDeltaSec += 12
    },
  },
  {
    id: 'quake',
    name: '地震',
    description: '每点对 3 个就全盘重排；补偿：立刻 +1 专注，每层 +6 秒。',
    rarity: 'rare',
    kind: 'debuff',
    apply: (m) => {
      m.reshuffleEvery = 3
      m.timerDeltaSec += 6
    },
    focusOnPickup: 1,
  },

  // —— 险注 ——
  {
    id: 'gambler-dice',
    name: '赌徒骰',
    description: '点错一次扣 2 点专注；选遗物时更容易刷到稀有。',
    rarity: 'rare',
    kind: 'risk',
    apply: () => undefined,
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

/** Boss / 层固定规则：与遗物修饰合并（层规则可覆盖同名字段的「更难」侧） */
export function mergeLayerModifiers(
  relicMods: RogueModifiers,
  layer: LayerDef,
): RogueModifiers {
  const extra = layer.layerMods ?? {}
  const reshuffleCandidates = [relicMods.reshuffleEvery, extra.reshuffleEvery ?? null].filter(
    (n): n is number => typeof n === 'number' && n > 0,
  )
  return {
    reverse: relicMods.reverse || Boolean(extra.reverse),
    hintNext: relicMods.hintNext || Boolean(extra.hintNext),
    fog: relicMods.fog || Boolean(extra.fog),
    loudColors: relicMods.loudColors || Boolean(extra.loudColors),
    reshuffleEvery:
      reshuffleCandidates.length > 0 ? Math.min(...reshuffleCandidates) : null,
    timerDeltaSec: relicMods.timerDeltaSec + (extra.timerDeltaSec ?? 0),
    vanishCleared: relicMods.vanishCleared || Boolean(extra.vanishCleared),
    autoClearCount: Math.max(relicMods.autoClearCount, extra.autoClearCount ?? 0),
  }
}

/** @deprecated 使用 mergeLayerModifiers；保留以免旧引用报错 */
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

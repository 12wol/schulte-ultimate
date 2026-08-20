export type VariantDefinition = {
  id: string
  name: string
  description: string
  /** Placeholder for future variants — keep registry open */
  status: 'live' | 'coming_soon'
}

export const VARIANT_REGISTRY: VariantDefinition[] = [
  {
    id: 'schulte',
    name: '舒尔特方格',
    description: '按 1→N 顺序点击，记录完成时间',
    status: 'live',
  },
  {
    id: 'schulte-reverse',
    name: '倒序方格',
    description: '从大到小点击（规划中）',
    status: 'coming_soon',
  },
  {
    id: 'schulte-color',
    name: '双色干扰',
    description: '彩色干扰下的搜索（规划中）',
    status: 'coming_soon',
  },
]

export function getLiveVariants() {
  return VARIANT_REGISTRY.filter((v) => v.status === 'live')
}

export function getVariant(id: string) {
  return VARIANT_REGISTRY.find((v) => v.id === id)
}

export const GRID_SIZE_OPTIONS = [3, 4, 5, 6, 7] as const

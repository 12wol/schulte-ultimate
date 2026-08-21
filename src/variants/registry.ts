export type VariantDefinition = {
  id: string
  name: string
  description: string
  /** Placeholder for future variants — keep registry open */
  status: 'live' | 'coming_soon'
  /** 可选：独立路由（默认 /play?variant=id） */
  href?: string
}

export const VARIANT_REGISTRY: VariantDefinition[] = [
  {
    id: 'schulte',
    name: '舒尔特方格',
    description: '按顺序点格子，越快越厉害！',
    status: 'live',
  },
  {
    id: 'schulte-rogue',
    name: '方格远征',
    description: '八层肉鸽：时限催着走，专注力是命，路边捡遗物改规则～',
    status: 'live',
    href: '/rogue',
  },
  {
    id: 'schulte-reverse',
    name: '倒序方格',
    description: '还在装修中，过几天再来看看～',
    status: 'coming_soon',
  },
  {
    id: 'schulte-color',
    name: '双色干扰',
    description: '还在装修中，过几天再来看看～',
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

import './island-busy.css'

type Props = {
  label?: string
}

/**
 * 动森风忙碌指示（奶油底 + 青绿斜纹），替代库内黑底 Loading 全屏。
 * 库内另有 Progress / Skeleton，但 Progress 需明确百分比，Skeleton 偏占位；
 * 数据拉取场景用本组件更合适。
 */
export function IslandBusy({ label }: Props) {
  return (
    <div className="island-busy" role="status" aria-live="polite" aria-busy="true">
      <div className="island-busy__track" aria-hidden>
        <div className="island-busy__fill" />
      </div>
      {label ? <p className="island-busy__label">{label}</p> : null}
    </div>
  )
}

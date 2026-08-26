import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"
import {
  aprsSymbolSpritePosition,
  type AprsSymbolTable,
} from "@/modules/codeplug/index"

function AprsSymbolIcon({
  table,
  index,
  size = 32,
  className,
}: {
  table: AprsSymbolTable
  index: number
  size?: 20 | 32
  className?: string
}) {
  const { column, row } = aprsSymbolSpritePosition(index)
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundImage: `url(/aprs-symbols/${table}@2x.png)`,
    backgroundPosition: `${-column * size}px ${-row * size}px`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${16 * size}px ${6 * size}px`,
  }

  return (
    <span
      aria-hidden="true"
      className={cn("block shrink-0", className)}
      style={style}
    />
  )
}

export { AprsSymbolIcon }

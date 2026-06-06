import { cn } from '@/lib/utils'

export interface ProgressiveBlurProps {
  className?: string
  height?: string
  width?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  blurLevels?: number[]
}

export function ProgressiveBlur({
  className,
  height = '30%',
  width = '30%',
  position = 'bottom',
  blurLevels = [0.5, 1, 2, 4, 8, 16],
}: ProgressiveBlurProps) {
  const isHorizontal = position === 'left' || position === 'right'

  const getMask = (start: number, mid: number, end: number) => {
    const dir =
      position === 'bottom'
        ? 'to bottom'
        : position === 'top'
          ? 'to top'
          : position === 'right'
            ? 'to right'
            : 'to left'
    return `linear-gradient(${dir}, rgba(0,0,0,0) ${start}%, rgba(0,0,0,1) ${mid}%, rgba(0,0,0,1) ${end}%, rgba(0,0,0,0) ${end + 100 / blurLevels.length}%)`
  }

  return (
    <div
      className={cn('pointer-events-none absolute z-10', className, {
        'top-0': position === 'top',
        'bottom-0': position === 'bottom',
        'left-0 top-0 h-full': position === 'left',
        'right-0 top-0 h-full': position === 'right',
        'inset-x-0': !isHorizontal,
      })}
      style={isHorizontal ? { width } : { height }}
    >
      {blurLevels.map((blur, i) => {
        const startPercent = i * (100 / blurLevels.length)
        const midPercent = (i + 0.5) * (100 / blurLevels.length)
        const endPercent = (i + 1) * (100 / blurLevels.length)
        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              zIndex: i + 1,
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: getMask(startPercent, midPercent, endPercent),
              WebkitMaskImage: getMask(startPercent, midPercent, endPercent),
            }}
          />
        )
      })}
    </div>
  )
}

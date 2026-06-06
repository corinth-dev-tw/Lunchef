import React, { MouseEvent, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string
  duration?: string
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  ({ className, children, rippleColor = '#ffffff', duration = '600ms', onClick, ...props }, ref) => {
    const [buttonRipples, setButtonRipples] = useState<
      Array<{ x: number; y: number; size: number; key: number }>
    >([])

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = event.clientX - rect.left - size / 2
      const y = event.clientY - rect.top - size / 2
      setButtonRipples((prev) => [...prev, { x, y, size, key: Date.now() }])
      onClick?.(event)
    }

    useEffect(() => {
      if (buttonRipples.length === 0) return
      const last = buttonRipples[buttonRipples.length - 1]
      const t = setTimeout(
        () => setButtonRipples((prev) => prev.filter((r) => r.key !== last.key)),
        parseInt(duration),
      )
      return () => clearTimeout(t)
    }, [buttonRipples, duration])

    return (
      <button
        className={cn(
          'relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 px-4 py-2 text-center',
          className,
        )}
        onClick={handleClick}
        ref={ref}
        {...props}
      >
        <div className="relative z-10">{children}</div>
        <span className="pointer-events-none absolute inset-0">
          {buttonRipples.map((ripple) => (
            <span
              className="animate-rippling absolute rounded-full opacity-30"
              key={ripple.key}
              style={
                {
                  width: `${ripple.size}px`,
                  height: `${ripple.size}px`,
                  top: `${ripple.y}px`,
                  left: `${ripple.x}px`,
                  backgroundColor: rippleColor,
                  transform: 'scale(0)',
                  '--duration': duration,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      </button>
    )
  },
)
RippleButton.displayName = 'RippleButton'

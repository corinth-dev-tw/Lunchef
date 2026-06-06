const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'arrived', 'completed'] as const

const STATUS_LABELS: Record<string, string> = {
  pending: '待確認',
  confirmed: '已確認',
  preparing: '準備中',
  arrived: '已送達',
  completed: '已完成',
  cancelled: '已取消',
}

interface OrderStatusStepperProps {
  status: string
  compact?: boolean
}

export function OrderStatusStepper({ status, compact = false }: OrderStatusStepperProps) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className={`font-medium text-red-600 ${compact ? 'text-xs' : 'text-sm'}`}>
          已取消
        </span>
      </div>
    )
  }

  const currentIndex = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number])

  return (
    <div className="flex items-center gap-0">
      {STATUS_FLOW.map((step, i) => {
        const isDone = i < currentIndex
        const isActive = i === currentIndex
        const isLast = i === STATUS_FLOW.length - 1

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`rounded-full transition-all ${
                  compact ? 'h-2 w-2' : 'h-2.5 w-2.5'
                } ${
                  isDone
                    ? 'bg-green-500'
                    : isActive
                      ? 'bg-green-500 ring-2 ring-green-200 ring-offset-1'
                      : 'bg-gray-200'
                }`}
              />
              {!compact && (
                <span
                  className={`mt-1 text-[10px] font-medium leading-tight text-center ${
                    isActive ? 'text-green-600' : isDone ? 'text-gray-500' : 'text-gray-300'
                  }`}
                  style={{ maxWidth: 36 }}
                >
                  {STATUS_LABELS[step]}
                </span>
              )}
            </div>
            {!isLast && (
              <div
                className={`h-0.5 transition-colors ${compact ? 'w-4' : 'w-6'} ${
                  isDone ? 'bg-green-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

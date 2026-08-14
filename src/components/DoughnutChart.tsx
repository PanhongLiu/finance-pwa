import { useEffect, useRef } from 'react'
import { Chart, DoughnutController, ArcElement, Tooltip, type ChartConfiguration } from 'chart.js'
import { formatCNY } from '../utils/money'

Chart.register(DoughnutController, ArcElement, Tooltip)

export interface DoughnutSlice {
  label: string
  value: number // 分
  color: string
}

export function DoughnutChart({
  data,
  centerLabel,
  centerSub
}: {
  data: DoughnutSlice[]
  centerLabel?: string
  centerSub?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart<'doughnut'> | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const cfg: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: data.map((d) => d.color),
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 4
          }
        ]
      },
      options: {
        cutout: '68%',
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed as number
                return ` ${ctx.label}：${formatCNY(v)}`
              }
            }
          }
        }
      }
    }
    chartRef.current = new Chart(canvasRef.current, cfg)
    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
    // 仅在挂载时创建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.data.labels = data.map((d) => d.label)
    chart.data.datasets[0].data = data.map((d) => d.value)
    chart.data.datasets[0].backgroundColor = data.map((d) => d.color)
    chart.update()
  }, [data])

  const hasData = data.some((d) => d.value !== 0)

  return (
    <div className="chart-wrap" style={{ position: 'relative' }}>
      <div style={{ position: 'relative', width: 220, height: 220 }}>
        <canvas ref={canvasRef} className="doughnut-canvas" />
        {hasData && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            {centerSub && <div style={{ fontSize: 12, color: '#8e8e93' }}>{centerSub}</div>}
            {centerLabel && (
              <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{centerLabel}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Build an ECharts `option` object for the AdminView volume chart
 * (Phase 6e.2). Keeps the verbose options-object pattern out of the
 * view so the template stays readable.
 *
 * Reads the design tokens from CSS custom properties at evaluation
 * time so the chart picks up the current dark/light palette without
 * importing the theme TS module.
 */

import { computed, type ComputedRef, type Ref } from 'vue'
import type { VolumeResponse } from '@/api/dashboard'

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function useVolumeChartOptions(
  data: Ref<VolumeResponse | null>,
): ComputedRef<Record<string, unknown>> {
  return computed(() => {
    const series = data.value?.series ?? []
    const accent = cssVar('--accent', '#3b82f6')
    const text2 = cssVar('--text-2', '#94a3b8')
    const text3 = cssVar('--text-3', '#64748b')
    const border = cssVar('--border', '#e5e7eb')
    const surface2 = cssVar('--surface-2', '#f5f5f5')

    return {
      grid: { left: 48, right: 16, top: 16, bottom: 32 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: cssVar('--surface', '#fff'),
        borderColor: border,
        textStyle: { color: cssVar('--text', '#111'), fontSize: 12 },
        formatter: (params: Array<{ axisValueLabel: string; data: [string, number]; marker: string }>) => {
          if (!params.length) return ''
          const row = series.find((b) => b.ts === params[0]?.data?.[0])
          const usd = row ? Number(row.volume_usd).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'
          const count = row ? row.tx_count : 0
          const unpriced = row ? row.unpriced_count : 0
          const unpricedLine =
            unpriced > 0
              ? `<div style="font-size:11px;color:${text3};margin-top:2px">${unpriced} sin tasa FX</div>`
              : ''
          return (
            `<div style="font-weight:600;font-size:12px;margin-bottom:4px">${params[0]?.axisValueLabel ?? ''}</div>` +
            `<div style="font-size:13px;font-weight:500">$${usd}</div>` +
            `<div style="font-size:11px;color:${text2}">${count} tx</div>` +
            unpricedLine
          )
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: series.map((b) => b.ts),
        axisLine: { lineStyle: { color: border } },
        axisLabel: { color: text3, fontSize: 10 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: text3,
          fontSize: 10,
          formatter: (v: number) => {
            if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
            if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
            return `$${v}`
          },
        },
        splitLine: { lineStyle: { color: surface2 } },
      },
      series: [
        {
          name: 'Volumen USD',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: series.map((b) => [b.ts, Number(b.volume_usd)]),
          lineStyle: { color: accent, width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: accent + '40' },
                { offset: 1, color: accent + '00' },
              ],
            },
          },
        },
      ],
    }
  })
}

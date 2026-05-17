/**
 * Modular ECharts registration (Phase 6e.2).
 *
 * `echarts/core` is tree-shake-safe: importing the full `echarts`
 * bundle pulls every chart type and component (~1 MB). Instead we
 * register only the pieces the dashboard actually uses, which keeps
 * the AdminView chunk around the size of a stock Chart.js bundle.
 *
 * Add a registration here whenever a new chart type lands so every
 * view shares one registry (vue-echarts looks up types lazily).
 */

import { use } from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
])

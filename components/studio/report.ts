// The starting report: one page of purse totals, charts and a ledger grid.
import type { AgReportState, AgWidgetLayoutState } from 'ag-studio';

const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number): AgWidgetLayoutState => ({ xTrack, yTrack, xSpan, ySpan });
const title = (text: string) => ({ title: { enabled: true, text } });
const sum = (id: string) => ({ id, aggregation: 'sum' as const });
const font = (fontSize: number, fontWeight: 'normal' | 'bold' = 'normal') => ({
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontSize,
  fontWeight,
  fontStyle: 'normal' as const,
});
const kpi = (text: string, id: string) => ({
  type: 'value' as const,
  dataMapping: { value: [sum(id)] },
  format: {
    title: { enabled: true, text, typography: font(14, 'bold') },
    caption: { enabled: true, text: '', typography: font(0) },
    style: { typography: font(24) },
  },
});

export const purseReport: AgReportState = {
  selectedPageId: 'spend',
  pages: [
    {
      id: 'spend',
      widgets: {
        'kpi-paid': kpi('Paid out', 'spends.paid'),
        'kpi-pending': kpi('Waiting for your yes', 'spends.pending'),
        'kpi-blocked': kpi('Blocked', 'spends.blocked'),
        'kpi-refunded': kpi('Refunded', 'spends.refunded'),
        'by-agent': {
          type: 'column-chart-grouped',
          dataMapping: {
            categoryKey: [{ id: 'spends.agent' }],
            valueKey: [sum('spends.paid'), sum('spends.blocked'), sum('spends.pending')],
          },
          format: { ...title('Money by agent'), style: { theme: { common: { legend: { enabled: true } } } } },
        },
        'by-status': {
          type: 'donut-chart',
          dataMapping: { categoryKey: [{ id: 'spends.status' }], valueKey: [sum('spends.amount')] },
          format: title('Requests by outcome'),
        },
        'by-day': {
          type: 'line-chart',
          dataMapping: { categoryKey: [{ id: 'calendar::day' }], valueKey: [sum('spends.paid'), sum('spends.blocked')] },
          format: { ...title('Spend by day'), style: { theme: { common: { legend: { enabled: true } } } } },
        },
        'by-shop': {
          type: 'bar-chart-grouped',
          dataMapping: { categoryKey: [{ id: 'spends.merchant' }], valueKey: [sum('spends.paid')] },
          format: title('Paid by shop'),
        },
        ledger: {
          type: 'grid',
          dataMapping: {
            cols: [
              { id: 'spends.date' },
              { id: 'spends.agent' },
              { id: 'spends.item' },
              { id: 'spends.merchant' },
              { id: 'spends.status' },
              { id: 'spends.decidedBy' },
              sum('spends.amount'),
              { id: 'spends.flag' },
            ],
          },
          format: title('Every request'),
        },
      },
      widgetLayout: {
        'kpi-paid': at(0, 0, 6, 7),
        'kpi-pending': at(6, 0, 6, 7),
        'kpi-blocked': at(12, 0, 6, 7),
        'kpi-refunded': at(18, 0, 6, 7),
        'by-agent': at(0, 7, 14, 18),
        'by-status': at(14, 7, 10, 18),
        'by-day': at(0, 25, 14, 18),
        'by-shop': at(14, 25, 10, 18),
        ledger: at(0, 43, 24, 22),
      },
    },
  ],
};

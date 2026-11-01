// AG Studio theme in the Dialog look: light grey page, white cards, radius 24, ink text.
// Orange stays off charts and is kept for the main buttons only.
import { studioTheme } from 'ag-studio';

const INK = '#181825';
const MUTED = '#636363';
const LINE = 'rgba(24,24,37,0.08)';
const line = { width: 1, color: LINE };
const PALETTE = ['#12372a', '#8f86f5', '#4cb89a', '#9a9a9a', '#c97b84', '#e0b455', '#5aa5d6', '#8b6fd1', '#b5845a', '#3d6e63'];

const palette = Object.fromEntries(
  PALETTE.flatMap((c, i) => [
    [`chartPaletteFills${i + 1}Color`, c],
    [`chartPaletteStrokes${i + 1}Color`, c],
  ]),
);

export const purseTheme = studioTheme.withParams({
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontSize: 14,
  textColor: INK,
  foregroundColor: INK,
  subtleTextColor: MUTED,
  backgroundColor: '#ffffff',
  borderColor: LINE,
  accentColor: '#12372a',
  iconColor: INK,
  rowHoverColor: '#f7f7f7',

  studioWrapperBorder: false,
  studioWrapperBorderRadius: 0,
  studioWrapperSpacing: 0,
  studioWrapperBackgroundColor: 'transparent',
  studioCanvasBorder: false,
  studioCanvasBorderRadius: 0,
  studioCanvasShadow: false,
  studioCanvasBackgroundColor: 'transparent',
  studioCanvasPadding: 20,
  studioCanvasRowHeight: 18,

  studioWidgetBackgroundColor: 'rgba(255,255,255,0.62)',
  studioWidgetBorder: { width: 1, color: 'rgba(255,255,255,0.9)' },
  studioWidgetBorderRadius: 28,
  studioWidgetPadding: 14,
  studioWidgetTitleFontFamily: '"DM Sans", Inter, sans-serif',
  studioWidgetTitleFontSize: 16,
  studioWidgetTitleFontWeight: 600,
  studioWidgetTitleTextColor: INK,
  studioWidgetSubtitleTextColor: MUTED,
  studioWidgetCaptionTextColor: MUTED,
  studioWidgetResizeBorderColor: INK,

  studioPanelContainerBackgroundColor: 'rgba(255,255,255,0.8)',
  studioPanelContainerBorder: line,
  studioPanelDividerColor: LINE,
  studioPanelDividerActiveColor: INK,
  studioToggleButtonActiveBackgroundColor: '#f7f7f7',
  studioToggleButtonActiveBorderColor: INK,
  studioToggleButtonActiveColor: INK,

  gridHeaderBackgroundColor: 'transparent',
  gridHeaderTextColor: MUTED,
  gridHeaderFontWeight: 600,
  gridRowHeight: 40,
  gridRowBorder: line,
  gridHeaderRowBorder: line,
  gridWrapperBorder: false,

  chartFontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  chartTextColor: INK,
  chartSubtleTextColor: MUTED,
  chartAxisLineColor: LINE,
  chartGridLineColor: LINE,
  ...palette,
});

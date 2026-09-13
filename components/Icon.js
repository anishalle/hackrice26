import { Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import {
  CaretLeft, CaretRight, CaretDown, CaretUp, ArrowRight, ArrowUp,
  Microphone, Paperclip, MagnifyingGlass, X, Bell, Sparkle,
  Waveform, Broadcast, ArrowsHorizontal, SquaresFour, ArrowsClockwise,
  SlidersHorizontal, Crosshair,
} from 'phosphor-react-native';

// SF Symbols on iOS, phosphor everywhere else. Keyed by role so callers never
// have to know which set they're getting.
//
// Outline glyphs only — no `.fill` variants. A filled symbol next to a chevron
// reads as a different family, and the chevrons are the weight everything else
// is matched to.
const ICONS = {
  back: ['chevron.left', CaretLeft],
  next: ['chevron.right', CaretRight],
  down: ['chevron.down', CaretDown],
  voteUp: ['chevron.up', CaretUp],
  voteDown: ['chevron.down', CaretDown],
  forward: ['arrow.right', ArrowRight],
  send: ['arrow.up', ArrowUp],
  mic: ['mic', Microphone],
  attach: ['paperclip', Paperclip],
  search: ['magnifyingglass', MagnifyingGlass],
  clear: ['xmark.circle', X],
  bell: ['bell', Bell],

  // Category glyphs (see `tagGlyph` in the theme) — listed here so the
  // non-iOS fallback shows the right shape instead of a generic sparkle.
  waveform: ['waveform', Waveform],
  'dot.radiowaves.left.and.right': ['dot.radiowaves.left.and.right', Broadcast],
  'arrow.left.and.right': ['arrow.left.and.right', ArrowsHorizontal],
  'square.grid.2x2': ['square.grid.2x2', SquaresFour],
  'arrow.triangle.2.circlepath': ['arrow.triangle.2.circlepath', ArrowsClockwise],
  'slider.horizontal.3': ['slider.horizontal.3', SlidersHorizontal],
  scope: ['scope', Crosshair],
};

// Phosphor has a coarser weight scale than SF; collapse onto its nearest.
const PHOSPHOR_WEIGHT = {
  ultraLight: 'thin',
  thin: 'thin',
  light: 'light',
  regular: 'regular',
  medium: 'regular',
  semibold: 'bold',
  bold: 'bold',
};

export default function Icon({ name, size = 20, color, weight = 'light' }) {
  // Known roles map to a matched SF/phosphor pair; anything else is treated as
  // a raw SF Symbol name (skill tiles pick their own), with a generic glyph
  // standing in off-iOS.
  const [sf, Fallback] = ICONS[name] ?? [name, Sparkle];

  if (Platform.OS !== 'ios') {
    return <Fallback size={size} color={color} weight={PHOSPHOR_WEIGHT[weight] ?? 'light'} />;
  }
  return <SymbolView name={sf} size={size} tintColor={color} weight={weight} resizeMode="scaleAspectFit" />;
}

// Four accents and nothing else: Easter pastels rather than crayons. All four
// sit in a narrow luminance band (0.76-0.83) so no one accent shouts over the
// others, and desaturated enough to sit on the lilac page without vibrating
// against it.
//
// The warm accent is an apricot rather than a yellow. A pastel yellow carries
// its lightness in green, which lands it paler and dustier than its
// neighbours however it is mixed; at hue 33 it keeps its chroma at the same
// luminance as the rest. It reads as a pair with the peach instead of
// contrasting against it, so the set is two warms and two cools.
//
// Blue still needs watching: a pastel blue drifts into the lilac ground unless
// it holds a cornflower edge, so it is the least washed of the four.
export const accents = {
  peach: '#F8B4A8',
  amber: '#F8C98A',
  mint: '#A2E3C0',
  periwinkle: '#AFC6F7',
};

export const colors = {
  // Two grounds. `page` is the app's lilac; `bg` stays the warmer near-white
  // and belongs to the chat alone. Bubble's tail mask is painted in it, so
  // the two have to agree or the tail shows a seam.
  page: '#ECE9F8',
  bg: '#FBFAF8',
  surface: '#FFFFFF',
  ink: '#151515',
  inkMuted: '#7A7A74',
  border: '#ECEAE4',
  ...accents,
};

// Categories cycle the four accents. Text is always ink. A fifth and sixth
// hue for "legible version of the fill" is exactly the randomness we dropped.
export const tagPalette = {
  Speech: { bg: accents.amber, text: colors.ink },
  Mobility: { bg: accents.mint, text: colors.ink },
  Daily: { bg: accents.periwinkle, text: colors.ink },
  Care: { bg: accents.peach, text: colors.ink },
  Voice: { bg: accents.peach, text: colors.ink },
  Automation: { bg: accents.periwinkle, text: colors.ink },
  Sight: { bg: accents.mint, text: colors.ink },
  Hearing: { bg: accents.amber, text: colors.ink },
};

// Abstract line glyphs, one per category, the same family as the chevrons and
// the waveform. A picture of an eye or a pair of lungs carries detail nothing
// else here has, which is what made the set look borrowed.
export const tagGlyph = {
  Speech: 'waveform',
  Voice: 'dot.radiowaves.left.and.right',
  Mobility: 'arrow.left.and.right',
  Daily: 'square.grid.2x2',
  Care: 'arrow.triangle.2.circlepath',
  Automation: 'slider.horizontal.3',
  Sight: 'scope',
  Hearing: 'dot.radiowaves.left.and.right',
};

export const cardShadow = {
  shadowColor: '#151515',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 20,
  elevation: 3,
};

export const softShadow = {
  shadowColor: '#151515',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.04,
  shadowRadius: 10,
  elevation: 2,
};

export const fonts = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
};

export const type = {
  display: { fontFamily: fonts.light, fontSize: 38, lineHeight: 46, letterSpacing: -0.6 },
  title: { fontFamily: fonts.light, fontSize: 30, lineHeight: 36, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  callout: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  footnote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
};

export const spacing = (n) => n * 8;

export const radii = {
  pill: 999,
  card: 28,
  tile: 20,
};

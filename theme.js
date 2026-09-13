// Four accents and nothing else. `blue` and `agent` are sampled straight from
// Axl's two blobatars, so the mascot and the interface share their hues.
export const accents = {
  blue: '#B6D3FF',
  green: '#C8FFB7',
  purple: '#E0CDFF',
  agent: '#FFCB72',
};

export const colors = {
  bg: '#FBFAF8',        // near-white ground; cards are pure white on top of it
  surface: '#FFFFFF',
  ink: '#151515',
  inkMuted: '#7A7A74',
  border: '#ECEAE4',
  ...accents,
};

// Categories cycle the four accents. Text is always ink — a fifth and sixth
// hue for "legible version of the fill" is exactly the randomness we dropped.
export const tagPalette = {
  Speech: { bg: accents.agent, text: colors.ink },
  Mobility: { bg: accents.green, text: colors.ink },
  Daily: { bg: accents.blue, text: colors.ink },
  Care: { bg: accents.purple, text: colors.ink },
  Voice: { bg: accents.purple, text: colors.ink },
  Automation: { bg: accents.blue, text: colors.ink },
  Sight: { bg: accents.green, text: colors.ink },
  Hearing: { bg: accents.agent, text: colors.ink },
};

// Abstract line glyphs, one per category — the same family as the chevrons and
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

// Persona-inspired design tokens: soft pastel/easter palette, indigo accent, light-weight grotesk type.
export const colors = {
  bg: '#F7F5EF',        // warm off-white, like Persona's paper background
  surface: '#FFFFFF',
  ink: '#151515',        // near-black text
  inkMuted: '#6B6B66',
  indigo: '#5B57F2',     // Persona's accent
  navy: '#0A0A2E',       // Persona's dark section
  periwinkle: '#C4C6FA', // Persona's hero card
  pastelGreen: '#C9EBD7',
  pastelMint: '#A9E5C4',
  pastelLavender: '#DCD8FA',
  pastelYellow: '#F7E7B4',
  pastelPeach: '#F6DCC8',
  pastelBlue: '#C7E3F6',
  pastelRose: '#F6D2DC',
  border: '#E7E3D8',
};

// Per-category chip colors — bg is the soft pastel fill, text a darker ink
// tint of the same hue so chips stay legible without needing color-mix().
export const tagPalette = {
  Sight: { bg: colors.pastelGreen, text: '#1F5C3F' },
  Hearing: { bg: colors.pastelLavender, text: '#3B3591' },
  Speech: { bg: colors.pastelYellow, text: '#7A5B0A' },
  Mobility: { bg: colors.pastelPeach, text: '#8A4A22' },
  Voice: { bg: colors.pastelBlue, text: '#1E5A80' },
  Automation: { bg: colors.pastelRose, text: '#8A2E4C' },
};

export const cardShadow = {
  shadowColor: '#151515',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 3,
};

export const fonts = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const spacing = (n) => n * 8;

export const radii = {
  pill: 999,
  card: 40,
};

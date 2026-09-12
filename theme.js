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
  border: '#E7E3D8',
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

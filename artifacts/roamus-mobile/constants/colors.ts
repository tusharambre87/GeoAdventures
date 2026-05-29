import { Colors, FontFamily } from './theme';

export { FontFamily };

const colors = {
  light: {
    text: Colors.textDeep,
    tint: Colors.primary,

    background: Colors.background,
    foreground: Colors.textDeep,

    card: Colors.cardBg,
    cardForeground: Colors.textDeep,

    primary: Colors.primary,
    primaryForeground: Colors.white,

    secondary: '#EDE9E4',
    secondaryForeground: Colors.textDeep,

    muted: '#EDE9E4',
    mutedForeground: Colors.textMuted,

    accent: Colors.sage,
    accentForeground: Colors.white,

    destructive: '#ef4444',
    destructiveForeground: Colors.white,

    border: Colors.border,
    input: Colors.border,

    sage: Colors.sage,
  },
  radius: 12,
};

export default colors;

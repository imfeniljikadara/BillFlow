export const COLORS = {
  // Light Backgrounds
  background: '#F8F9FA', // Very light grey
  cardBg: '#FFFFFF',     // White

  // Typography
  textPrimary: '#111827',
  textSecondary: '#6B7280',

  // Accents
  primary: '#2563EB',       // Royal Blue
  secondary: '#1E293B',     // Slate Dark
  accent: '#4F46E5',        // Indigo

  // Status
  success: '#10B981',
  error: '#EF4444',
  pending: '#F59E0B',

  // Utilities
  glass: 'rgba(255, 255, 255, 0.9)',
  glassBorder: 'rgba(0, 0, 0, 0.05)',
  white: '#FFFFFF',
  black: '#000000',
  border: '#E5E7EB',
};

export const FONTS = {
  regular: { fontWeight: '400' as const },
  medium: { fontWeight: '500' as const },
  bold: { fontWeight: '700' as const },
  heavy: { fontWeight: '800' as const },
};

export const SPACING = {
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

// Gradients matching the clean look
export const GRADIENTS = {
  primary: ['#2563EB', '#1D4ED8'] as const,
  card: ['#FFFFFF', '#FFFFFF'] as const,
  dark: ['#1F2937', '#111827'] as const,
  blueCard: ['#2563EB', '#1E40AF'] as const,
  accent: ['#4F46E5', '#3730A3'] as const, // Added back for onboarding
};

import { Text, type TextProps } from 'react-native';

import { Palette, Typography } from '@/constants/theme';

export type AppTextVariant = keyof typeof Typography;

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  color?: string;
  center?: boolean;
}

/** Themed text primitive. Every screen should prefer this over raw <Text>. */
export function AppText({
  variant = 'body',
  color = Palette.text,
  center,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[Typography[variant], { color }, center ? { textAlign: 'center' } : null, style]}
    />
  );
}

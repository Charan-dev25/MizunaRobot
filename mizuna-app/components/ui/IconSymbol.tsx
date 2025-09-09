// Fallback for using MaterialIcons on Android and web.

import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'gear': 'settings',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */

type Props = {
  name: string;       // e.g. "house", "house.fill", "chart.bar", "gearshape.fill"
  size?: number;
  color?: string;
};

function mapToIonicons(symbol: string) {
  const filled = symbol.endsWith('.fill');
  const base = symbol.replace('.fill', '');
  switch (base) {
    case 'house':
      return filled ? 'home' : 'home-outline';
    case 'chart.bar':
      return filled ? 'stats-chart' : 'stats-chart-outline';
    case 'bubble.left.and.bubble.right':
      return filled ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
    case 'gearshape':
      return filled ? 'settings' : 'settings-outline';
    default:
      return filled ? 'ellipse' : 'ellipse-outline';
  }
}

export function IconSymbol({
  name,
  size = 28,
  color,
}: Props) {
  const theme = useTheme();
  const finalColor = color ?? (theme.dark ? '#fff' : '#000');
  const ionName = mapToIonicons(name);
  return <Ionicons name={ionName as any} size={size} color={finalColor} />;
}

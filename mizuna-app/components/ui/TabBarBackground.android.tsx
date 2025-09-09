import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/constants/ThemeContext';

export default function TabBarBackground() {
  const { theme, isDark } = useAppTheme();
  
  const backgroundColor = isDark 
    ? 'rgba(18,18,18,0.96)'
    : 'rgba(255,255,255,0.96)';
    
  const borderColor = isDark
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(0,0,0,0.08)';

  return (
    <View
      style={[
        styles.background,
        {
          backgroundColor,
          borderTopColor: borderColor,
        },
      ]}
    />
  );
}

export function useBottomTabOverflow() {
  return 16;
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
});
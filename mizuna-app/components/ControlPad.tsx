import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/constants/ThemeContext';

// --- Type Definitions ---
interface ControlButtonProps {
  iconName: React.ComponentProps<typeof Feather>['name'];
  onPressIn: () => void;
  onPressOut: () => void;
  style?: object;
}

interface ControlPadProps {
  sendCmd: (command: string) => void;
}

// --- Reusable Button Component ---
const ControlButton: React.FC<ControlButtonProps> = ({ iconName, onPressIn, onPressOut, style }) => {
  const { theme } = useAppTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        getStyles(theme).buttonBase,
        style,
        pressed && getStyles(theme).buttonPressed
      ]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Feather name={iconName} size={32} color={theme.text} />
    </Pressable>
  );
};

// --- Main ControlPad Component ---
const ControlPad: React.FC<ControlPadProps> = ({ sendCmd }) => {
  const { theme } = useAppTheme();
  const styles = getStyles(theme);
  const handlePressIn = (cmd: string) => () => sendCmd(cmd);
  const handlePressOut = () => sendCmd('S'); // Stop on release

  return (
    <View style={styles.padContainer}>
      <ControlButton iconName="arrow-up" onPressIn={handlePressIn('F')} onPressOut={handlePressOut} style={styles.upButton} />
      <ControlButton iconName="arrow-left" onPressIn={handlePressIn('L')} onPressOut={handlePressOut} style={styles.leftButton} />
      <ControlButton iconName="arrow-right" onPressIn={handlePressIn('R')} onPressOut={handlePressOut} style={styles.rightButton} />
      <ControlButton iconName="arrow-down" onPressIn={handlePressIn('B')} onPressOut={handlePressOut} style={styles.downButton} />
    </View>
  );
};


// --- Stylesheet ---
const getStyles = (theme: any) => StyleSheet.create({
  padContainer: { width: 210, height: 210, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  buttonBase: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      ios: { shadowColor: theme.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 5 },
    }),
  },
  buttonPressed: { backgroundColor: theme.surface, transform: [{ scale: 0.95 }] },
  upButton: { top: 0 },
  downButton: { bottom: 0 },
  leftButton: { left: 0, top: 70 },
  rightButton: { right: 0, top: 70 },
});

export default ControlPad;
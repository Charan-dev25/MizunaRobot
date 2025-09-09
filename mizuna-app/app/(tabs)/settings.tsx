import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Platform, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/constants/ThemeContext';

export default function SettingsScreen() {
  const [autoConnect, setAutoConnect] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [voiceControl, setVoiceControl] = useState(false);
  const [faceRecognition, setFaceRecognition] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  const showAlert = (title: string, message: string) => {
    Alert.alert(title, message);
  } 

  const { mode, setMode, isDark, theme } = useAppTheme();
  const styles = getStyles(theme);

  // initialize state from context
  React.useEffect(() => setDarkMode(mode !== 'light'), [mode]);

  const settingSections = [
    {
      title: 'CONNECTION',
      icon: 'wifi',
      items: [
        {
          title: 'Auto Connect',
          subtitle: 'Connect to robot automatically when in range',
          value: autoConnect,
          onToggle: setAutoConnect,
          type: 'switch' as const,
        },
        {
          title: 'Network Settings',
          subtitle: 'Configure WiFi and connection preferences',
          icon: 'settings',
          onPress: () => showAlert('Network Settings', 'Configure your network settings here'),
          type: 'button' as const,
        },
        {
          title: 'Robot IP Address',
          subtitle: 'raspberrypi.local',
          icon: 'router',
          onPress: () => showAlert('IP Address', 'Change robot IP address'),
          type: 'button' as const,
        },
      ]
    },
    {
      title: 'INTERFACE',
      icon: 'palette',
      items: [
        {
          title: 'Dark Mode',
          subtitle: 'Use dark theme throughout the app',
          value: darkMode,
          onToggle: (v: boolean) => {
            setDarkMode(v);
            setMode(v ? 'dark' : 'light');
          },
          type: 'switch' as const,
        },
        {
          title: 'Notifications',
          subtitle: 'Receive alerts and status updates',
          value: notifications,
          onToggle: setNotifications,
          type: 'switch' as const,
        },
        {
          title: 'Haptic Feedback',
          subtitle: 'Feel vibrations for button presses',
          value: hapticFeedback,
          onToggle: setHapticFeedback,
          type: 'switch' as const,
        },
      ]
    },
    {
      title: 'ADVANCED',
      icon: 'build',
      items: [
        {
          title: 'Developer Mode',
          subtitle: 'Enable advanced debugging features',
          icon: 'code',
          onPress: () => showAlert('Developer Mode', 'Enable developer options'),
          type: 'button' as const,
        },
        {
          title: 'Export Logs',
          subtitle: 'Download system and error logs',
          icon: 'download',
          onPress: () => showAlert('Export Logs', 'Logs will be saved to your device'),
          type: 'button' as const,
        },
        {
          title: 'Reset Memory',
          subtitle: 'Reset all learned data and preferences',
          icon: 'restore',
          onPress: () => Alert.alert(
            'Reset Memory',
            'This will reset all learned data and preferences. Are you sure?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset', 
                style: 'destructive', 
                onPress: async () => {
                  try {
                    const res = await fetch('http://raspberrypi.local:5000/clear_context', {
                      method: 'POST',
                    });
                    const json = await res.json();
                    if (json.status === 'ok') {
                      Alert.alert('Memory Reset', `Deleted ${json.deleted_count} items from memory.`);
                    } else {
                      Alert.alert('Error', json.detail || 'Failed to reset memory.');
                    }
                  } catch (e) {
                    Alert.alert('Error', 'Could not connect to robot.');
                  }
                }
              }
            ]
          ),
          type: 'button' as const,
          destructive: true,
        },
      ]
    }
  ];

  return (
    <LinearGradient colors={[theme.background, theme.card, theme.background]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('../../assets/images/mizuna.png')} style={styles.headerIcon} />
            <MaterialIcons name="settings" size={24} color={theme.primary} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>SETTINGS</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {settingSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name={section.icon as any} size={18} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
              </View>
              
              <View style={styles.sectionContent}>
                {section.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={[
                    styles.settingItem,
                    itemIndex === section.items.length - 1 && styles.settingItemLast
                  ]}>
                    <View style={styles.settingLeft}>
                      {(item as any).icon && (
                        <View style={styles.settingIcon}>
                          <MaterialIcons 
                            name={(item as any).icon as any} 
                            size={20} 
                            color={(item as any).destructive ? theme.error : theme.textSecondary} 
                          />
                        </View>
                      )}
                      <View style={styles.settingText}>
                        <Text style={[
                          styles.settingTitle,
                          { color: theme.text },
                          (item as any).destructive && { color: theme.error }
                        ]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.settingRight}>
                      {item.type === 'switch' && (
                        <Switch
                          value={item.value}
                          onValueChange={item.onToggle}
                          trackColor={{ false: theme.border, true: theme.primary + '55' }}
                          thumbColor={item.value ? theme.primary : theme.textSecondary}
                          ios_backgroundColor={theme.border}
                        />
                      )}
                      {item.type === 'button' && (
                        <TouchableOpacity 
                          style={[styles.settingButton, { backgroundColor: theme.surface }]}
                          onPress={item.onPress}
                        >
                          <Feather 
                            name="chevron-right" 
                            size={18} 
                            color={(item as any).destructive ? theme.error : theme.textSecondary} 
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={[styles.appName, { color: theme.text }]}>Mizuna Robot Controller</Text>
            <Text style={[styles.appVersion, { color: theme.textSecondary }]}>Version 1.0.0</Text>
            <Text style={[styles.appCopyright, { color: theme.textSecondary }]}>© 2025 Mizuna Robotics</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    letterSpacing: 2,
  },
  headerIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 25,
  },
  section: {
    backgroundColor: theme.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: { 
        shadowColor: theme.primary, 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 10 
      },
      android: { 
        elevation: 8 
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sectionContent: {
    paddingVertical: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  settingRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingButton: {
    padding: 8,
    borderRadius: 8,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 5,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  appVersion: {
    fontSize: 14,
    fontWeight: '500',
  },
  appCopyright: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 5,
  },
});

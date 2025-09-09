import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Animated, Platform, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import ControlPad from '../../components/ControlPad';
import { useAppTheme } from '@/constants/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';

// --- Configuration ---
// IMPORTANT: Change this to your robot's actual network address.
const ROBOT_BASE_URL = 'http://mizuna.local';
const CAMERA_STREAM_URL = 'http://raspberrypi.local:5000/stream.mjpg';

// HTML wrapper for better MJPEG handling on iOS
const MJPEG_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { height: 100%; background: #000; overflow: hidden; }
      .container { 
        position: fixed; 
        inset: 0; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        background: #000; 
      }
      img { 
        max-width: 100%; 
        max-height: 100%; 
        object-fit: contain; 
        display: block; 
      }
    </style>
  </head>
  <body>
    <div class="container">
      <img src="${CAMERA_STREAM_URL}" alt="Camera Stream" />
    </div>
    <script>
      // Report status back to React Native
      const img = document.querySelector('img');
      img.onload = () => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'load', data: 'stream-loaded'}));
        }
      };
      img.onerror = () => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', data: 'stream-error'}));
        }
      };
    </script>
  </body>
</html>
`;

type Status = {
  text: string;
  isError: boolean;
};

/**
 * The main screen for controlling the robot.
 */
export default function RobotControlScreen() {
  const [speed, setSpeed] = useState(400);
  const [status, setStatus] = useState<Status>({ text: 'Ready', isError: false });
  const statusAnimation = useRef(new Animated.Value(1)).current;
  const { theme, isDark } = useAppTheme();
  const colorScheme = useColorScheme();
  const styles = getStyles(theme, isDark);

  // --- Robot Communication ---
  const updateStatus = (text: string, isError = false) => {
    setStatus({ text, isError });
    statusAnimation.setValue(0);
    Animated.timing(statusAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const sendRobotRequest = async (endpoint: string, params?: Record<string, string>) => {
    const url = new URL(`${ROBOT_BASE_URL}/${endpoint}`);
    if (params) url.search = new URLSearchParams(params).toString();

    try {
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Robot responded with status: ${response.status}`);
    } catch (error) {
      console.error(`Request to "${endpoint}" failed:`, error);
      updateStatus('Connection Error', true);
    }
  };

  const sendCmd = (command: string) => {
    updateStatus(`CMD: ${command}`);
    sendRobotRequest('cmd', { c: command });
  };

  const setRobotSpeed = (currentSpeed: number) => {
    const roundedSpeed = Math.round(currentSpeed);
    updateStatus(`Speed: ${roundedSpeed}`);
    sendRobotRequest('speed', { v: String(roundedSpeed) });
  };

  const animatedStatusStyle = {
    opacity: statusAnimation,
    color: status.isError ? theme.error : theme.primary,
  };

  return (
    <LinearGradient colors={[theme.background, theme.surface, theme.background]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('../../assets/images/mizuna.png')} style={styles.headerIcon} />
            <Feather name="radio" size={20} color={theme.primary} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>MIZUNA</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.streamContainer}>
            <WebView
              source={{ html: MJPEG_HTML }}
              style={styles.stream}
              javaScriptEnabled={true}
              domStorageEnabled={false}
              allowsInlineMediaPlaybook={true}
              mediaPlaybackRequiresUserAction={false}
              originWhitelist={['*']}
              mixedContentMode="always"
              onMessage={(event) => {
                try {
                  const message = JSON.parse(event.nativeEvent.data);
                  if (message.type === 'load') {
                    updateStatus('Camera: Stream connected');
                  } else if (message.type === 'error') {
                    updateStatus('Camera: Stream error', true);
                  }
                } catch (e) {
                  console.warn('WebView message parse error:', e);
                }
              }}
              onLoadStart={() => updateStatus('Camera: Connecting...')}
              onLoadEnd={() => updateStatus('Camera: WebView loaded')}
              onError={() => updateStatus('Camera: WebView error', true)}
              renderError={() => (
                <View style={styles.streamPlaceholder}>
                  <Feather name="video-off" size={24} color={theme.textSecondary} />
                  <Text style={styles.streamPlaceholderText}>Stream Unavailable</Text>
                </View>
              )}
            />
          </View>
          <View style={styles.statusBar}>
            <Animated.Text style={[styles.statusText, animatedStatusStyle]}>
              {status.text}
            </Animated.Text>
          </View>
        </View>

        <View style={[styles.panel, styles.controlsPanel]}>
          <ControlPad sendCmd={sendCmd} />
          <View style={styles.speedControlContainer}>
            <Text style={styles.label}>SPEED</Text>
            <Slider
              style={styles.slider}
              minimumValue={200}
              maximumValue={1023}
              step={1}
              value={speed}
              onValueChange={setSpeed}
              onSlidingComplete={setRobotSpeed}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.textSecondary}
            />
            <View style={styles.speedTag}>
              <Text style={styles.speedTagText}>{Math.round(speed)}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// --- Stylesheet ---
const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
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
  panel: {
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
  streamContainer: { 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    overflow: 'hidden',
    height: 260,
    backgroundColor: theme.surface,
  },
  stream: { 
    width: '100%', 
    height: '100%',
    backgroundColor: theme.surface,
  },
  streamPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  streamPlaceholderText: { color: theme.textSecondary, fontSize: 12 },
  statusBar: { paddingVertical: 8, paddingHorizontal: 15, backgroundColor: 'rgba(0,0,0,0.03)' },
  statusText: { fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  controlsPanel: { alignItems: 'center', paddingVertical: 20 },
  speedControlContainer: { width: '90%', alignItems: 'center', marginTop: 15 },
  label: { color: theme.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  slider: { width: '100%', height: 40 },
  speedTag: { backgroundColor: theme.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.border, minWidth: 60, alignItems: 'center', marginTop: 5 },
  speedTagText: { color: theme.text, fontSize: 16, fontWeight: '600' },
});
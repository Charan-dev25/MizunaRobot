import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Animated, Platform, Dimensions, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../constants/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width } = Dimensions.get('window');

// Configuration
const ROBOT_BASE_URL = 'http://raspberrypi.local:5000';

export default function StatsScreen() {
  const { theme, isDark } = useAppTheme();
  const colorScheme = useColorScheme();
  const styles = getStyles(theme, isDark);
  const [signalStrength, setSignalStrength] = useState(4);
  const [cpuTemp, setCpuTemp] = useState<number | null>(null);
  const [gpuTemp, setGpuTemp] = useState<number | null>(null);
  const [uptime, setUptime] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastTempUpdate, setLastTempUpdate] = useState<Date | null>(null);
  const [robotStatus, setRobotStatus] = useState<string>('unknown');
  const [avgResponseTime, setAvgResponseTime] = useState<number | null>(null);
  const [systemLoad, setSystemLoad] = useState<number | null>(null);
  const [diskUsage, setDiskUsage] = useState<number | null>(null);

  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Pulse animation for online indicator
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    
    if (isOnline) {
      pulse();
    }
  }, [isOnline, pulseAnimation]);

  // Fetch temperature data from robot
  const fetchTemperature = async () => {
    try {
      const response = await fetch(`${ROBOT_BASE_URL}/temperature`);
      if (response.ok) {
        const data = await response.json();
        setCpuTemp(data.cpu_temp);
        setGpuTemp(data.gpu_temp);
        setLastTempUpdate(new Date(data.timestamp * 1000));
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch (error) {
      console.error('Failed to fetch temperature:', error);
      setIsOnline(false);
    }
  };

  // Fetch uptime data from robot
  const fetchUptime = async () => {
    try {
      const response = await fetch(`${ROBOT_BASE_URL}/uptime`);
      if (response.ok) {
        const data = await response.json();
        setUptime(data.app_uptime.formatted);
      }
    } catch (error) {
      console.error('Failed to fetch uptime:', error);
    }
  };

  // Fetch performance data from robot
  const fetchPerformance = async () => {
    try {
      const response = await fetch(`${ROBOT_BASE_URL}/performance`);
      if (response.ok) {
        const data = await response.json();
        setRobotStatus(data.robot_connectivity.robot_status);
        setAvgResponseTime(data.robot_connectivity.stats.avg_response_time);
        if (data.system) {
          setSystemLoad(data.system.cpu.percent);
          setDiskUsage(data.system.disk.percent);
        }
      }
    } catch (error) {
      console.error('Failed to fetch performance:', error);
    }
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    // Initial fetches
    fetchTemperature();
    fetchUptime();
    fetchPerformance();
    
    const tempInterval = setInterval(fetchTemperature, 30000); // Every 30 seconds
    const uptimeInterval = setInterval(fetchUptime, 60000); // Every minute
    const perfInterval = setInterval(fetchPerformance, 180000); // Every 3 minutes
    
    // Simulate other data updates
    const dataInterval = setInterval(() => {
      setSignalStrength(prev => Math.max(1, Math.min(4, Math.round(prev + (Math.random() - 0.5) * 2))));
    }, 10000);

    return () => {
      clearInterval(tempInterval);
      clearInterval(uptimeInterval);
      clearInterval(perfInterval);
      clearInterval(dataInterval);
    };
  }, []);

  const getTemperatureColor = (temp: number | null) => {
    if (!temp) return theme.textSecondary;
    if (temp > 80) return theme.error;
    if (temp > 70) return theme.warning;
    return theme.success;
  };

  const getTemperatureStatus = (temp: number | null) => {
    if (!temp) return 'Unknown';
    if (temp > 80) return 'Critical';
    if (temp > 70) return 'Warning';
    return 'Normal';
  };

  return (
    <LinearGradient colors={[theme.background, theme.surface, theme.background]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style={isDark ? "light" : "dark"} />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Animated.View style={[styles.onlineIndicator, { transform: [{ scale: pulseAnimation }] }]}>
              <View style={[styles.onlineDot, { backgroundColor: isOnline ? theme.success : theme.error }]} />
            </Animated.View>
            <Image source={require('../../assets/images/mizuna.png')} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>STATISTICS</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: 80, // Add extra padding to ensure full scrollability
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Temperature Status */}
          <View style={styles.statusPanel}>
            <View style={styles.statusHeader}>
              <MaterialIcons name="thermostat" size={16} color={isDark ? theme.primary : '#000'} />
              <Text style={styles.statusTitle}>Temperature Monitor</Text>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? theme.success : theme.error }]} />
            </View>
            <Text style={styles.statusText}>
              {lastTempUpdate 
                ? `Last updated: ${lastTempUpdate.toLocaleTimeString()}`
                : isOnline ? 'Fetching data...' : 'Offline - Cannot connect to robot'
              }
            </Text>
          </View>

          {/* Main Stats Grid */}
          <View style={styles.mainStatsGrid}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={[isDark ? theme.primary + '20' : '#00000020', isDark ? theme.primary + '10' : '#00000010', isDark ? theme.primary + '05' : '#00000005']}
                style={styles.statCardGradient}
              >
                <MaterialIcons name="wifi" size={32} color={isDark ? theme.primary : '#000'} />
                <Text style={styles.statValue}>{signalStrength}/4</Text>
                <Text style={styles.statLabel}>Signal Strength</Text>
                <View style={styles.signalBars}>
                  {[...Array(4)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.signalBar,
                        { 
                          opacity: i < signalStrength ? 1 : 0.2,
                          height: 8 + (i * 4),
                        }
                      ]}
                    />
                  ))}
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={[isDark ? theme.warning + '20' : '#FFA50020', isDark ? theme.warning + '10' : '#FFA50010', isDark ? theme.warning + '05' : '#FFA50005']}
                style={styles.statCardGradient}
              >
                <MaterialIcons name="thermostat" size={32} color={theme.warning} />
                <Text style={styles.statValue}>
                  {cpuTemp ? `${cpuTemp}°C` : 'N/A'}
                </Text>
                <Text style={styles.statLabel}>CPU Temp</Text>
                <Text style={[styles.tempStatus, { color: getTemperatureColor(cpuTemp) }]}>
                  {getTemperatureStatus(cpuTemp)}
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={[isDark ? theme.primary + '20' : '#00000020', isDark ? theme.primary + '10' : '#00000010', isDark ? theme.primary + '05' : '#00000005']}
                style={styles.statCardGradient}
              >
                <MaterialIcons name="memory" size={32} color={isDark ? theme.primary : '#000'} />
                <Text style={styles.statValue}>
                  {gpuTemp ? `${gpuTemp}°C` : 'N/A'}
                </Text>
                <Text style={styles.statLabel}>GPU Temp</Text>
                <Text style={[styles.tempStatus, { color: getTemperatureColor(gpuTemp) }]}>
                  {getTemperatureStatus(gpuTemp)}
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={[isDark ? theme.secondary + '20' : '#70809020', isDark ? theme.secondary + '10' : '#70809010', isDark ? theme.secondary + '05' : '#70809005']}
                style={styles.statCardGradient}
              >
                <MaterialIcons name="access-time" size={32} color={theme.secondary} />
                <Text style={styles.statValue}>{uptime || 'Loading...'}</Text>
                <Text style={styles.statLabel}>Uptime</Text>
                <Text style={styles.uptimeDetail}>App runtime</Text>
              </LinearGradient>
            </View>
          </View>

          {/* System Health Panel */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Ionicons name="pulse" size={20} color={theme.primary} />
              <Text style={styles.panelTitle}>SYSTEM HEALTH</Text>
            </View>
            <View style={styles.healthContent}>
              <View style={styles.healthItem}>
                <View style={styles.healthIndicator}>
                  <View style={[
                    styles.healthDot, 
                    { backgroundColor: robotStatus === 'online' ? theme.success : robotStatus === 'offline' ? theme.error : theme.warning }
                  ]} />
                  <Text style={[styles.healthLabel, { color: theme.text }]}>Robot Connection</Text>
                </View>
                <Text style={[
                  styles.healthStatus, 
                  { color: robotStatus === 'online' ? theme.success : robotStatus === 'offline' ? theme.error : theme.warning }
                ]}>
                  {robotStatus.toUpperCase()}
                </Text>
              </View>
              <View style={styles.healthItem}>
                <View style={styles.healthIndicator}>
                  <View style={[styles.healthDot, { backgroundColor: isOnline ? theme.success : theme.error }]} />
                  <Text style={[styles.healthLabel, { color: theme.text }]}>Camera Stream</Text>
                </View>
                <Text style={[
                  styles.healthStatus, 
                  { color: isOnline ? theme.success : theme.error }
                ]}>
                  {isOnline ? 'ACTIVE' : 'OFFLINE'}
                </Text>
              </View>
              <View style={styles.healthItem}>
                <View style={styles.healthIndicator}>
                  <View style={[
                    styles.healthDot, 
                    { backgroundColor: (cpuTemp && cpuTemp > 70) ? theme.error : (cpuTemp && cpuTemp > 60) ? theme.warning : theme.success }
                  ]} />
                  <Text style={[styles.healthLabel, { color: theme.text }]}>Temperature Monitor</Text>
                </View>
                <Text style={[
                  styles.healthStatus, 
                  { color: (cpuTemp && cpuTemp > 70) ? theme.error : (cpuTemp && cpuTemp > 60) ? theme.warning : theme.success }
                ]}>
                  {cpuTemp ? getTemperatureStatus(cpuTemp) : 'UNKNOWN'}
                </Text>
              </View>
              <View style={styles.healthItem}>
                <View style={styles.healthIndicator}>
                  <View style={[styles.healthDot, { backgroundColor: theme.warning }]} />
                  <Text style={[styles.healthLabel, { color: theme.text }]}>Voice Control</Text>
                </View>
                <Text style={[styles.healthStatus, { color: theme.warning }]}>STANDBY</Text>
              </View>
            </View>
          </View>

          {/* Performance Metrics */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Ionicons name="speedometer" size={20} color={theme.primary} />
              <Text style={styles.panelTitle}>PERFORMANCE</Text>
            </View>
            <View style={styles.metricsContent}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>CPU Usage</Text>
                <View style={styles.metricBar}>
                  <View style={[
                    styles.metricFill, 
                    { 
                      width: systemLoad ? `${Math.min(systemLoad, 100)}%` : '0%', 
                      backgroundColor: systemLoad && systemLoad > 80 ? theme.error : systemLoad && systemLoad > 60 ? theme.warning : theme.primary 
                    }
                  ]} />
                </View>
                <Text style={styles.metricValue}>{systemLoad ? `${Math.round(systemLoad)}%` : 'N/A'}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Disk Usage</Text>
                <View style={styles.metricBar}>
                  <View style={[
                    styles.metricFill, 
                    { 
                      width: diskUsage ? `${Math.min(diskUsage, 100)}%` : '0%', 
                      backgroundColor: diskUsage && diskUsage > 90 ? theme.error : diskUsage && diskUsage > 75 ? theme.warning : theme.success 
                    }
                  ]} />
                </View>
                <Text style={styles.metricValue}>{diskUsage ? `${Math.round(diskUsage)}%` : 'N/A'}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Robot Ping</Text>
                <View style={styles.metricBar}>
                  <View style={[
                    styles.metricFill, 
                    { 
                      width: avgResponseTime ? `${Math.min((avgResponseTime / 1000) * 100, 100)}%` : '0%', 
                      backgroundColor: avgResponseTime && avgResponseTime > 500 ? theme.error : avgResponseTime && avgResponseTime > 200 ? theme.warning : theme.success 
                    }
                  ]} />
                </View>
                <Text style={styles.metricValue}>
                  {avgResponseTime ? `${Math.round(avgResponseTime)}ms` : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

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
    borderBottomColor: 'rgba(102, 252, 241, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    marginRight: 12,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: { 
    color: theme.text, 
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
    gap: 20,
  },
  mainStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    minWidth: (width - 55) / 2,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
    ...Platform.select({
      ios: { 
        shadowColor: isDark ? theme.primary : '#66FCF1', 
        shadowOffset: { width: 0, height: 6 }, 
        shadowOpacity: 0.15, 
        shadowRadius: 12 
      },
      android: { 
        elevation: 10 
      },
    }),
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: isDark ? theme.border + '40' : 'rgba(102, 252, 241, 0.3)',
    borderRadius: 20,
  },
  statValue: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
    textAlign: 'center',
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: 8,
  },
  signalBar: {
    width: 4,
    backgroundColor: theme.primary,
    borderRadius: 2,
  },
  tempStatus: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
  },
  uptimeDetail: {
    color: theme.textSecondary,
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
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
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 10,
  },
  panelTitle: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  healthContent: {
    padding: 20,
    gap: 15,
  },
  healthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthLabel: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '500',
  },
  healthStatus: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  metricsContent: {
    padding: 20,
    gap: 20,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  metricLabel: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '500',
    width: 80,
  },
  metricBar: {
    flex: 1,
    height: 6,
    backgroundColor: theme.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  metricFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricValue: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  statusPanel: {
    backgroundColor: theme.card,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 15,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusTitle: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    backgroundColor: theme.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cardTitle: {
    flex: 1,
    color: isDark ? theme.primary : '#000',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  cardValue: {
    color: isDark ? theme.primary : '#000',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardSubValue: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});

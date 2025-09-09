import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, FlatList, ActivityIndicator, SafeAreaView, Animated, Image, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../constants/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';

const ROBOT_BASE_URL = 'http://raspberrypi.local:5000';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  spoken?: boolean;
  error?: boolean;
};

export default function ChatScreen() {
  const { theme, isDark } = useAppTheme();
  const colorScheme = useColorScheme();
  const styles = getStyles(theme, isDark);
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const [isOnline, setIsOnline] = useState(false);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: String(Date.now()), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${ROBOT_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Request failed');
      }
      const botMsg: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        text: data?.reply ?? 'No response',
        spoken: data?.voice?.spoken === true,
      };
      setMessages(prev => [...prev, botMsg]);
      setIsOnline(true); // Assume online if successful
    } catch (e: any) {
      const errMsg: Message = {
        id: String(Date.now() + 2),
        role: 'assistant',
        text: e?.message || 'Error contacting robot',
        error: true,
      };
      setMessages(prev => [...prev, errMsg]);
      setIsOnline(false);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  };

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

  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
        setKeyboardHeight(e.endCoordinates?.height || 0)
        // ensure list scrolls to bottom when keyboard opens
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50)
      })
      const hideSub = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0)
      })
      return () => {
        showSub.remove()
        hideSub.remove()
      }
    }
    return undefined
  }, [])

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.role === 'user' ? styles.userContainer : styles.botContainer]}>
      {item.role === 'assistant' && (
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[isDark ? theme.primary : '#66FCF1', isDark ? theme.secondary : '#45A29E']}
            style={styles.avatar}
          >
            <Ionicons name="sparkles" size={16} color="#fff" />
          </LinearGradient>
        </View>
      )}
      <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
        {item.role === 'user' ? (
          <View style={styles.userBubbleContent}>
            <Text style={styles.bubbleText}>{item.text}</Text>
          </View>
        ) : (
          <LinearGradient
            colors={item.error 
              ? [isDark ? '#33001a' : '#fff2f2', isDark ? '#1a0010' : '#ffe6e6']
              : [isDark ? theme.card : '#ffffff', isDark ? theme.surface : '#f8f9fa']
            }
            style={styles.botBubbleGradient}
          >
            <Text style={[styles.bubbleText, item.error ? styles.errorText : undefined]}>{item.text}</Text>
            <View style={styles.metaContainer}>
              <View style={styles.metaRow}>
                <Ionicons 
                  name={item.spoken ? "volume-high" : "chatbubble-outline"} 
                  size={12} 
                  color={theme.textSecondary} 
                />
                <Text style={styles.metaText}>
                  {item.spoken ? 'Spoken' : 'Text only'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        )}
      </View>
    </View>
  );

  return (
    <LinearGradient colors={[theme.background, theme.surface, theme.background]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Animated.View style={[styles.onlineIndicator, { transform: [{ scale: pulseAnimation }] }]}>
              <View style={[styles.onlineDot, { backgroundColor: isOnline ? theme.success : theme.error }]} />
            </Animated.View>
            <Image source={require('../../assets/images/mizuna.png')} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>CHAT MIZUNA</Text>
          </View>
        </View>

        {/* Only use KeyboardAvoidingView on iOS */}
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior="padding"
            keyboardVerticalOffset={0}
          >
            <ChatContent
              {...{ messages, listRef, insets, styles, renderItem, loading, input, setInput, send, isDark, theme, keyboardHeight }}
            />
          </KeyboardAvoidingView>
        ) : (
          <ChatContent
            {...{ messages, listRef, insets, styles, renderItem, loading, input, setInput, send, isDark, theme, keyboardHeight }}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

// Extracted chat content for clarity
function ChatContent({ messages, listRef, insets, styles, renderItem, loading, input, setInput, send, isDark, theme, keyboardHeight }) {
  // Extra space above navigation bar (adjust if needed)
  const NAV_EXTRA = Platform.OS === 'android' ? 56 : 12;

  return (
    <>
      <View style={styles.chatContainer}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            {
              // Include nav extra gap so messages don't get hidden behind nav/input
              paddingBottom: Platform.OS === 'android'
                ? Math.max(90, keyboardHeight + insets.bottom + NAV_EXTRA + 12)
                : styles.list.paddingBottom,
            },
          ]}
          style={styles.messagesList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={[isDark ? theme.primary + '10' : '#66FCF110', 'transparent']}
                style={styles.emptyStateGradient}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={48} color={theme.textSecondary} />
                <Text style={styles.emptyTitle}>Chat with Mizuna</Text>
                <Text style={styles.emptySubtitle}>
                  Ask me anything! I can help with questions, provide information, or just have a friendly conversation.
                </Text>
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Try asking:</Text>
                  <Text style={styles.suggestion}>• &ldquo;Tell me a fun fact&rdquo;</Text>
                  <Text style={styles.suggestion}>• &ldquo;What&rsquo;s the weather like?&rdquo;</Text>
                  <Text style={styles.suggestion}>• &ldquo;Help me with something&rdquo;</Text>
                </View>
              </LinearGradient>
            </View>
          )}
        />
      </View>

      <View
        // Keep input visually above nav/keyboard by applying marginBottom = keyboard height + nav extra
        style={[
          styles.inputContainer,
          {
            paddingBottom: Platform.OS === 'ios' ? insets.bottom + 18 : insets.bottom + 8,
            marginBottom: Platform.OS === 'android' ? keyboardHeight + NAV_EXTRA : 0,
          },
        ]}
      >
        <View style={styles.inputRow}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ask Mizuna..."
              placeholderTextColor={theme.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              returnKeyType="send"
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
            onPress={send}
            disabled={loading || !input.trim()}
          >
            <LinearGradient
              colors={
                loading || !input.trim()
                  ? [theme.textSecondary, theme.textSecondary]
                  : [isDark ? theme.primary : '#66FCF1', isDark ? theme.secondary : '#45A29E']
              }
              style={styles.sendBtnGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

// In your getStyles, reduce paddingBottom for Android in .list and .inputContainer:
const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  
  // Header
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

  // Chat container
  keyboardView: { flex: 1 },
  chatContainer: { flex: 1 },
  messagesList: { flex: 1 },
  list: { 
    padding: 16, 
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 80, // Reduce from 180 to 80
  },

  // Empty state
  emptyState: {
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 28,
  paddingVertical: 16,
  },
  emptyStateGradient: {
  alignItems: 'center',
  padding: 20,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: isDark ? theme.border + '40' : 'rgba(0,0,0,0.06)',
  maxWidth: 360,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: theme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  suggestionsContainer: {
    alignItems: 'flex-start',
    gap: 6,
  },
  suggestionsTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  suggestion: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },

  // Messages
  messageContainer: {
  marginBottom: 12,
  },
  userContainer: {
  alignItems: 'flex-end',
  },
  botContainer: {
  alignItems: 'flex-start',
  flexDirection: 'row',
  gap: 12,
  },
  avatarContainer: {
    marginTop: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  bubble: {
  maxWidth: '78%',
  borderRadius: 16,
  overflow: 'hidden',
    ...Platform.select({
      ios: {
    shadowColor: isDark ? theme.primary : '#66FCF1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  userBubble: {
    backgroundColor: 'transparent',
  },
  userBubbleContent: {
  backgroundColor: isDark ? theme.primary + '22' : '#66FCF122',
  borderWidth: 1,
  borderColor: isDark ? theme.primary + '44' : '#66FCF144',
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 16,
  },
  botBubble: {
    backgroundColor: 'transparent',
  },
  botBubbleGradient: {
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: isDark ? theme.border + '60' : 'rgba(0,0,0,0.06)',
  },
  bubbleText: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  errorText: {
    color: theme.error,
  },
  metaContainer: {
  marginTop: 8,
  paddingTop: 8,
  borderTopWidth: 1,
  borderTopColor: isDark ? theme.border + '20' : 'rgba(0,0,0,0.04)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Input
  inputContainer: {
  borderTopWidth: 1,
  borderTopColor: theme.border,
  backgroundColor: theme.surface,
  },
  inputRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingTop: 10,
  gap: 12,
  },
  inputWrapper: {
  flex: 1,
  backgroundColor: isDark ? theme.inputBackground || theme.card : '#f2f4f6',
  borderRadius: 22,
  borderWidth: 1,
  borderColor: isDark ? theme.inputBorder || theme.border : 'rgba(0,0,0,0.06)',
  paddingHorizontal: 12,
  paddingVertical: 6,
  maxHeight: 120,
  },
  input: {
  color: theme.text,
  fontSize: 16,
  paddingVertical: 10,
  maxHeight: 90,
  textAlignVertical: 'center',
  },
  sendBtn: {
  width: 52,
  height: 52,
  borderRadius: 26,
  overflow: 'hidden',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});

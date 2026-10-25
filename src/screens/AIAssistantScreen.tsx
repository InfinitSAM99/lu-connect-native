import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, ActivityIndicator, KeyboardAvoidingView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { askAI, APP_GUIDE_DOCS } from '../lib/ai';
import AssistantSplash from '../components/AssistantSplash';

const MODES = [
  { key: 'chat', label: 'Assistant', placeholder: 'Ask anything…' },
  { key: 'guide', label: 'App Guide', placeholder: 'Ask about LU CONNECT…' },
];

export default function AIAssistantScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('chat');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setMessages([]);
    setErrMsg('');
  }, [mode]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, sending]);

  const activeMode = MODES.find((m) => m.key === mode);

  const send = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || sending) return;
    
    setErrMsg('');
    setInput('');
    
    // Force keyboard to stay open
    inputRef.current?.focus();

    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setSending(true);
    
    const { reply, error } = await askAI({
      messages: nextMessages,
      mode,
      appDocs: mode === 'guide' ? APP_GUIDE_DOCS : '',
    });
    
    setSending(false);
    if (error) { setErrMsg(error); return; }
    setMessages([...nextMessages, { role: 'assistant', content: reply }]);
    
    // Re-focus after AI responds
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  if (!splashDone) {
    return <AssistantSplash onDone={() => setSplashDone(true)} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* COMPACT HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Ionicons name="sparkles" size={28} color="#ef4444" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.headerTitle}>LU Assistant</Text>
          <Text style={styles.headerSub}>Ask anything about LU CONNECT</Text>
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <TouchableOpacity key={m.key} style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={() => setMode(m.key)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* MESSAGES */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="always"
      >
        {messages.length === 0 && !sending && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubble-ellipses" size={40} color="#6d7382" />
            </View>
            <Text style={styles.emptyTitle}>LU CONNECT Assistant</Text>
            <Text style={styles.emptySub}>
              {mode === 'guide'
                ? 'Ask me how to use any part of LU CONNECT.'
                : 'Ask me anything — homework, ideas, or general questions.'}
            </Text>
          </View>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <View key={i} style={[styles.msgRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
              <View style={[
                styles.msgBubble,
                { backgroundColor: isUser ? '#ef4444' : '#141414' },
                isUser ? { borderTopLeftRadius: 16, borderTopRightRadius: 4 } : { borderTopLeftRadius: 4, borderTopRightRadius: 16 },
              ]}>
                {isUser ? (
                  <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>{m.content}</Text>
                ) : (
                  <Markdown style={markdownStyles}>{m.content}</Markdown>
                )}
              </View>
            </View>
          );
        })}

        {sending && (
          <View style={[styles.msgRow, { justifyContent: 'flex-start' }]}>
            <View style={[styles.msgBubble, { backgroundColor: '#141414', borderTopLeftRadius: 4 }]}>
              <ActivityIndicator color="#6d7382" size="small" />
            </View>
          </View>
        )}

        {errMsg ? <View style={styles.errBox}><Text style={{ color: '#ef4444', fontSize: 13 }}>{errMsg}</Text></View> : null}
      </ScrollView>

      {/* COMPOSER */}
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={activeMode?.placeholder || 'Ask anything…'}
          placeholderTextColor="#6d7382"
          // REMOVED editable={!sending} so keyboard stays open
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.5 }]}
          onPress={() => send()}
          disabled={!input.trim() || sending}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const markdownStyles = {
  body: { color: '#fff', fontSize: 14, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  heading1: { color: '#fff', fontWeight: '700', fontSize: 18, marginVertical: 6 },
  heading2: { color: '#fff', fontWeight: '700', fontSize: 16, marginVertical: 6 },
  heading3: { color: '#fff', fontWeight: '700', fontSize: 15, marginVertical: 6 },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  code_inline: { backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', paddingHorizontal: 4, borderRadius: 4, fontSize: 13 },
  code_block: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 8, color: '#fff', fontSize: 13 },
  fence: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 8, color: '#fff', fontSize: 13 },
  link: { color: '#ef4444' },
  blockquote: { borderLeftWidth: 3, borderLeftColor: '#ef4444', paddingLeft: 10, marginVertical: 6 },
} as const;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#6d7382', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  tabBtn: { flex: 1, backgroundColor: '#141414', borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#ef4444' },
  tabText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptySub: { fontSize: 13, color: '#6d7382', textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  msgRow: { flexDirection: 'row', marginBottom: 12 },
  msgBubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  errBox: { backgroundColor: 'rgba(239,68,68,0.14)', padding: 12, borderRadius: 12, marginBottom: 12 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1f1f1f', backgroundColor: '#000' },
  input: { flex: 1, backgroundColor: '#141414', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, color: '#fff', fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
});

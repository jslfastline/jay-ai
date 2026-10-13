import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/MessageBubble';
import { AttachmentSheet, type AttachmentSource } from '@/components/chat/AttachmentSheet';
import { Composer } from '@/components/chat/Composer';
import { MenuButton } from '@/components/navigation/SideMenu';
import { AppText, Icon, Logo, MockBanner } from '@/components/ui';
import { AppConfig } from '@/config';
import { Gradients, Palette, Radius, Spacing } from '@/constants/theme';
import { ai, usingMockProvider, type BackendHealth, type ChatStreamHandle } from '@/services/api';
import { attachmentService, type PickOutcome } from '@/services/attachments';
import { useApp } from '@/store/AppContext';
import type { ChatAttachment, ChatMessage } from '@/types';
import { createId, nowIso, titleFromPrompt } from '@/utils/format';

const INTRO_MESSAGE: ChatMessage = {
  id: 'intro',
  role: 'system',
  content: 'Ask Jay AI anything, or attach a photo, document or video to get started.',
  createdAt: '1970-01-01T00:00:00.000Z',
};

const EXAMPLE_PROMPTS = [
  'Write a 30-second promo script for my app',
  'Give me 5 video ideas about travel',
  'Summarize this document in bullet points',
  'Explain APIs like I am five',
];

export default function ChatScreen() {
  const { addCreation, updateCreation, creations, settings } = useApp();
  const params = useLocalSearchParams<{ chat?: string }>();
  const mock = usingMockProvider();

  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const messagesRef = useRef<ChatMessage[]>([INTRO_MESSAGE]);
  const streamRef = useRef<ChatStreamHandle | null>(null);
  const conversationId = useRef<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const prefsRef = useRef({ instructions: settings.instructions, style: settings.responseStyle });

  useEffect(() => {
    prefsRef.current = { instructions: settings.instructions, style: settings.responseStyle };
  }, [settings.instructions, settings.responseStyle]);

  const commit = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    const prev = messagesRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const videoEnabled = health?.capabilities.video ?? false;

  useEffect(() => {
    let active = true;
    ai.health()
      .then((result) => {
        if (active) setHealth(result);
      })
      .catch(() => {
        if (active) setHealth(null);
      });
    return () => {
      active = false;
      streamRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const id = params.chat;
    if (!id) return;
    const creation = creations.find((item) => item.id === id && item.kind === 'chat');
    if (creation && creation.kind === 'chat') {
      streamRef.current?.close();
      streamRef.current = null;
      conversationId.current = creation.id;
      commit(creation.messages);
      requestAnimationFrame(() => {
        setStreaming(false);
        setInput('');
        setAttachments([]);
        setBanner(null);
        scrollToEnd();
      });
    }
    router.setParams({ chat: undefined });
  }, [params.chat, creations, commit, scrollToEnd]);

  const persist = useCallback(
    (next: ChatMessage[]) => {
      const userTurns = next.filter((message) => message.role === 'user');
      if (userTurns.length === 0) return;
      const title = titleFromPrompt(userTurns[0].content || 'Attachment');
      if (conversationId.current) {
        const id = conversationId.current;
        updateCreation(id, (creation) =>
          creation.kind === 'chat' ? { ...creation, messages: next, updatedAt: nowIso() } : creation
        );
      } else {
        const id = createId('chat');
        conversationId.current = id;
        addCreation({
          kind: 'chat',
          id,
          title,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          messages: next,
        });
      }
    },
    [addCreation, updateCreation]
  );

  const runCompletion = useCallback(
    async (history: ChatMessage[]) => {
      const assistantId = createId('msg');
      commit((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          createdAt: nowIso(),
          status: 'streaming',
          mock,
        },
      ]);
      setStreaming(true);
      setBanner(null);
      scrollToEnd();

      try {
        const handle = await ai.streamChat(
          history,
          {
            onDelta: (chunk) =>
              commit((prev) =>
                prev.map((message) =>
                  message.id === assistantId
                    ? { ...message, content: message.content + chunk }
                    : message
                )
              ),
            onDone: (full) => {
              streamRef.current = null;
              commit((prev) =>
                prev.map((message) =>
                  message.id === assistantId
                    ? { ...message, content: full || message.content, status: 'sent' }
                    : message
                )
              );
              setStreaming(false);
              persist(messagesRef.current);
              scrollToEnd();
            },
            onError: (message) => {
              streamRef.current = null;
              commit((prev) =>
                prev.map((item) =>
                  item.id === assistantId ? { ...item, status: 'error', error: message } : item
                )
              );
              setStreaming(false);
            },
          },
          { instructions: prefsRef.current.instructions, style: prefsRef.current.style }
        );
        streamRef.current = handle;
      } catch (error) {
        streamRef.current = null;
        const message =
          error instanceof Error ? error.message : 'Message failed. Please try again.';
        commit((prev) =>
          prev.map((item) =>
            item.id === assistantId ? { ...item, status: 'error', error: message } : item
          )
        );
        setStreaming(false);
      }
    },
    [commit, mock, persist, scrollToEnd]
  );

  const submit = useCallback(
    (text: string, files: ChatAttachment[] = []) => {
      const trimmed = text.trim();
      if ((!trimmed && files.length === 0) || streaming) return;

      const userMessage: ChatMessage = {
        id: createId('msg'),
        role: 'user',
        content: trimmed,
        createdAt: nowIso(),
        status: 'sent',
        attachments: files.length > 0 ? files : undefined,
      };
      const next = [...messagesRef.current, userMessage];
      commit(next);
      setInput('');
      setAttachments([]);
      scrollToEnd();
      void runCompletion(next);
    },
    [commit, runCompletion, scrollToEnd, streaming]
  );

  const stop = useCallback(() => {
    const id = messagesRef.current[messagesRef.current.length - 1]?.id;
    streamRef.current?.close();
    streamRef.current = null;
    setStreaming(false);
    commit((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant' && last.status === 'streaming' && !last.content) {
        return prev.slice(0, -1);
      }
      return prev.map((message) =>
        message.id === id && message.status === 'streaming'
          ? { ...message, status: 'sent' }
          : message
      );
    });
  }, [commit]);

  const retry = useCallback(() => {
    if (streaming) return;
    let trimmed = [...messagesRef.current];
    while (trimmed.length > 0 && trimmed[trimmed.length - 1].status === 'error') {
      trimmed = trimmed.slice(0, -1);
    }
    commit(trimmed);
    void runCompletion(trimmed);
  }, [commit, runCompletion, streaming]);

  const regenerate = useCallback(
    (messageId: string) => {
      if (streaming) return;
      const all = messagesRef.current;
      const index = all.findIndex((item) => item.id === messageId);
      if (index < 0) return;
      let userIndex = -1;
      for (let i = index; i >= 0; i -= 1) {
        if (all[i].role === 'user') {
          userIndex = i;
          break;
        }
      }
      if (userIndex < 0) return;
      const trimmed = all.slice(0, userIndex + 1);
      commit(trimmed);
      void runCompletion(trimmed);
    },
    [commit, runCompletion, streaming]
  );

  const startNewChat = useCallback(() => {
    streamRef.current?.close();
    streamRef.current = null;
    conversationId.current = null;
    setStreaming(false);
    setInput('');
    setAttachments([]);
    setBanner(null);
    commit([INTRO_MESSAGE]);
  }, [commit]);

  const addAttachments = useCallback((outcome: PickOutcome) => {
    if (outcome.error) {
      setBanner(outcome.error);
      return;
    }
    if (outcome.attachments.length > 0) {
      setBanner(null);
      setAttachments((prev) =>
        [...prev, ...outcome.attachments].slice(0, AppConfig.maxAttachmentsPerMessage)
      );
    }
  }, []);

  const handleSource = useCallback(
    async (source: AttachmentSource) => {
      setSheetVisible(false);
      setBanner(null);
      try {
        const outcome =
          source === 'camera'
            ? await attachmentService.takePhoto()
            : source === 'images'
              ? await attachmentService.pickImages()
              : source === 'video'
                ? await attachmentService.pickVideo()
                : await attachmentService.pickDocument();
        addAttachments(outcome);
      } catch (error) {
        setBanner(error instanceof Error ? error.message : 'Could not attach that file.');
      }
    },
    [addAttachments]
  );

  const hasConversation = messages.some((message) => message.role === 'user');
  const { label: statusLabel, color: statusColor } = connectionStatus(mock, health);

  return (
    <View style={styles.root}>
      <LinearGradient colors={Gradients.screen} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <MenuButton />
          <View style={styles.headerText}>
            <AppText variant="heading">Jay AI</AppText>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <AppText variant="tiny" color={Palette.textMuted} numberOfLines={1}>
                {statusLabel}
              </AppText>
            </View>
          </View>
          <Pressable
            onPress={startNewChat}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Start new chat"
            style={({ pressed }) => [styles.newChat, pressed && { opacity: 0.8 }]}>
            <Icon name="create-outline" size={16} color={Palette.text} />
            <AppText variant="small">New</AppText>
          </Pressable>
        </View>

        {mock ? (
          <View style={styles.bannerWrap}>
            <MockBanner
              compact
              message="Mock mode — replies are simulated and clearly labelled until you connect a backend."
            />
          </View>
        ) : null}

        {banner ? (
          <View style={styles.bannerWrap}>
            <View style={styles.noticeBanner}>
              <Icon name="alert-circle" size={14} color={Palette.warning} />
              <AppText variant="small" color={Palette.warning} style={styles.flex}>
                {banner}
              </AppText>
            </View>
          </View>
        ) : null}

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                streaming={streaming && item === messages[messages.length - 1]}
                onRetry={item.status === 'error' ? retry : undefined}
                onRegenerate={regenerate}
              />
            )}
            contentContainerStyle={styles.messages}
            onContentSizeChange={scrollToEnd}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              hasConversation ? null : <WelcomePanel onSelect={(prompt) => submit(prompt)} />
            }
          />

          <Composer
            value={input}
            onChangeText={setInput}
            attachments={attachments}
            onRemoveAttachment={(id) =>
              setAttachments((prev) => prev.filter((item) => item.id !== id))
            }
            onAttach={() => setSheetVisible(true)}
            onSend={() => submit(input, attachments)}
            onStop={stop}
            streaming={streaming}
            maxAttachments={AppConfig.maxAttachmentsPerMessage}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AttachmentSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onChoose={handleSource}
        videoEnabled={videoEnabled}
      />
    </View>
  );
}

function connectionStatus(
  mock: boolean,
  health: BackendHealth | null
): { label: string; color: string } {
  if (mock) return { label: 'Development mode — simulated replies', color: Palette.warning };
  if (!health) return { label: 'Checking connection…', color: Palette.textMuted };
  if (health.configured) return { label: `Connected · ${health.model}`, color: Palette.success };
  return { label: 'Backend online — no provider key set', color: Palette.danger };
}

function WelcomePanel({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <View style={styles.welcome}>
      <Logo size={72} glow style={styles.welcomeIcon} />
      <AppText variant="heading" center>
        Ask me anything
      </AppText>
      <AppText variant="small" color={Palette.textSecondary} center>
        Ask a question, or attach photos, documents and videos.
      </AppText>
      <View style={styles.chips}>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => onSelect(prompt)}
            accessibilityRole="button"
            accessibilityLabel={prompt}
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]}>
            <AppText variant="small" color={Palette.textSecondary}>
              {prompt}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.deepNavy,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  newChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  bannerWrap: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  messages: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  welcome: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.two,
  },
  welcomeIcon: {
    marginBottom: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
});

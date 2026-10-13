import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Share, StyleSheet, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';
import type { ChatAttachment, ChatMessage } from '@/types';
import { humanFileSize } from '@/services/attachments';

import { MarkdownText } from './chat/MarkdownText';
import { AppText } from './ui/AppText';
import { Icon, type IconName } from './ui/Icon';
import { Logo } from './ui/Logo';

export interface MessageBubbleProps {
  message: ChatMessage;
  /** True while this assistant message is actively streaming. */
  streaming?: boolean;
  /** Retry the failed message. */
  onRetry?: () => void;
  /** Regenerate an assistant reply (asks the model again). */
  onRegenerate?: (messageId: string) => void;
}

/** Pulsing Jay AI logo shown while the assistant is composing a reply. */
function ThinkingLogo({ size = 26 }: { size?: number }) {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Logo size={size} />
    </Animated.View>
  );
}

function attachmentIcon(kind: ChatAttachment['kind']): IconName {
  if (kind === 'image') return 'image';
  if (kind === 'video') return 'video';
  return 'file-text';
}

function AttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.kind === 'image') {
    return (
      <Image
        source={{ uri: attachment.uri }}
        style={styles.imageThumb}
        contentFit="cover"
        transition={150}
        accessibilityLabel={attachment.name ?? 'Attached image'}
      />
    );
  }
  return (
    <View style={styles.fileChip}>
      <Icon name={attachmentIcon(attachment.kind)} size={16} color={Palette.primaryBright} />
      <View style={styles.fileChipText}>
        <AppText variant="small" numberOfLines={1}>
          {attachment.name ?? (attachment.kind === 'video' ? 'Video' : 'Document')}
        </AppText>
        {attachment.size ? (
          <AppText variant="tiny" color={Palette.textMuted}>
            {humanFileSize(attachment.size)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/** Icon-only action button used for copy / share / reload. */
function ActionIcon({
  name,
  label,
  onPress,
  tint = Palette.textSecondary,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
      <Icon name={name} size={15} color={tint} />
    </Pressable>
  );
}

function MessageActions({
  content,
  onRegenerate,
}: {
  content: string;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = async () => {
    await Clipboard.setStringAsync(content);
    void Haptics.selectionAsync().catch(() => {});
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  const share = () => {
    void Haptics.selectionAsync().catch(() => {});
    void Share.share({ message: content }).catch(() => {});
  };

  return (
    <View style={styles.actions}>
      {onRegenerate ? (
        <ActionIcon name="refresh" label="Regenerate response" onPress={onRegenerate} />
      ) : null}
      <ActionIcon
        name={copied ? 'checkmark-circle' : 'copy'}
        label={copied ? 'Copied' : 'Copy response'}
        onPress={copy}
        tint={copied ? Palette.success : Palette.textSecondary}
      />
      <ActionIcon name="share-outline" label="Share response" onPress={share} />
    </View>
  );
}

/** Single chat message bubble with Markdown, attachments and action icons. */
export function MessageBubble({ message, streaming, onRetry, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (message.role === 'system') {
    return (
      <View style={styles.notice}>
        <Icon name="info" size={14} color={Palette.textMuted} />
        <AppText variant="small" color={Palette.textMuted} style={styles.noticeText}>
          {message.content}
        </AppText>
      </View>
    );
  }

  const hasAttachments = Boolean(message.attachments?.length);
  const isError = message.status === 'error';
  const showActions = !isUser && !isError && Boolean(message.content) && !streaming;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser ? (
        <View style={styles.avatar}>
          <Logo size={26} />
        </View>
      ) : null}

      <View style={[styles.bubble, isUser ? styles.user : styles.assistant, isError && styles.errorBubble]}>
        {hasAttachments ? (
          <View style={styles.attachments}>
            {message.attachments!.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </View>
        ) : null}

        {isUser ? (
          message.content ? (
            <AppText variant="body" color={Palette.white}>
              {message.content}
            </AppText>
          ) : null
        ) : message.content ? (
          <MarkdownText>{message.content}</MarkdownText>
        ) : streaming ? (
          <View style={styles.thinking}>
            <ThinkingLogo size={24} />
            <AppText variant="small" color={Palette.textMuted}>
              Jay AI is thinking…
            </AppText>
          </View>
        ) : (
          <AppText variant="small" color={Palette.textMuted}>
            (empty response)
          </AppText>
        )}

        {isError ? (
          <View style={styles.errorRow}>
            <Icon name="alert-circle" size={14} color={Palette.danger} />
            <AppText variant="tiny" color={Palette.danger} style={styles.errorText}>
              {message.error ?? 'Something went wrong.'}
            </AppText>
            {onRetry ? (
              <ActionIcon name="refresh" label="Retry message" onPress={onRetry} tint={Palette.primaryBright} />
            ) : null}
          </View>
        ) : null}

        {showActions ? (
          <MessageActions
            content={message.content}
            onRegenerate={onRegenerate ? () => onRegenerate(message.id) : undefined}
          />
        ) : null}

        {!isUser && message.mock ? (
          <AppText variant="tiny" color={Palette.warning}>
            Simulated response · mock mode
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-end',
    maxWidth: '100%',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  noticeText: {
    textAlign: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56, 128, 248, 0.35)',
  },
  bubble: {
    maxWidth: '86%',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    gap: Spacing.one,
  },
  user: {
    backgroundColor: Palette.primary,
    borderBottomRightRadius: Spacing.one,
  },
  assistant: {
    backgroundColor: Palette.cardElevated,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderBottomLeftRadius: Spacing.one,
  },
  errorBubble: {
    borderColor: 'rgba(248, 113, 113, 0.55)',
  },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  imageThumb: {
    width: 120,
    height: 120,
    borderRadius: Radius.md,
    backgroundColor: Palette.deepNavy,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(2, 6, 23, 0.35)',
    maxWidth: 220,
  },
  fileChipText: {
    flex: 1,
    gap: 1,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  action: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    backgroundColor: 'rgba(2, 6, 23, 0.25)',
  },
  actionPressed: {
    opacity: 0.6,
    borderColor: 'rgba(56, 128, 248, 0.5)',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
    marginTop: Spacing.one,
  },
  errorText: {
    flexShrink: 1,
  },
});

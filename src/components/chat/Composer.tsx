import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { Palette, Radius, Serif, Spacing } from '@/constants/theme';
import type { ChatAttachment } from '@/types';

export interface ComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  attachments: ChatAttachment[];
  onRemoveAttachment: (id: string) => void;
  onAttach: () => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  maxAttachments: number;
}

/** Message composer with attachment previews, attach, send and stop controls. */
export function Composer({
  value,
  onChangeText,
  attachments,
  onRemoveAttachment,
  onAttach,
  onSend,
  onStop,
  streaming,
  disabled,
  maxAttachments,
}: ComposerProps) {
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !streaming && !disabled;
  const atLimit = attachments.length >= maxAttachments;

  return (
    <View style={styles.wrapper}>
      {attachments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewRow}
          keyboardShouldPersistTaps="handled">
          {attachments.map((attachment) => (
            <View key={attachment.id} style={styles.preview}>
              {attachment.kind === 'image' ? (
                <Image
                  source={{ uri: attachment.uri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.previewIcon}>
                  <Icon
                    name={attachment.kind === 'video' ? 'video' : 'file-text'}
                    size={20}
                    color={Palette.primaryBright}
                  />
                </View>
              )}
              <Pressable
                onPress={() => onRemoveAttachment(attachment.id)}
                accessibilityRole="button"
                accessibilityLabel="Remove attachment"
                hitSlop={6}
                style={styles.remove}>
                <Icon name="close" size={12} color={Palette.white} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.inputRow}>
        <Pressable
          onPress={onAttach}
          disabled={atLimit || disabled}
          accessibilityRole="button"
          accessibilityLabel="Add attachment"
          accessibilityState={{ disabled: atLimit || disabled }}
          style={({ pressed }) => [
            styles.attach,
            (atLimit || disabled) && { opacity: 0.4 },
            pressed && { opacity: 0.7 },
          ]}>
          <Icon name="paperclip" size={20} color={Palette.primaryBright} />
        </Pressable>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={attachments.length > 0 ? 'Add a message…' : 'Ask Jay AI anything…'}
          placeholderTextColor={Palette.textMuted}
          selectionColor={Palette.primaryBright}
          style={styles.input}
          multiline
          maxLength={4000}
          editable={!disabled}
        />

        {streaming ? (
          <Pressable
            onPress={onStop}
            accessibilityRole="button"
            accessibilityLabel="Stop generating"
            style={({ pressed }) => [styles.action, styles.stop, pressed && { opacity: 0.85 }]}>
            <Icon name="stop" size={20} color={Palette.white} />
          </Pressable>
        ) : (
          <Pressable
            onPress={canSend ? onSend : undefined}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
            style={({ pressed }) => [styles.action, !canSend && styles.actionDisabled, pressed && { opacity: 0.85 }]}>
            <Icon name="arrow-up" size={20} color={Palette.white} />
          </Pressable>
        )}
      </View>

      {atLimit ? (
        <AppText variant="tiny" color={Palette.textMuted} style={styles.limit}>
          Attachment limit reached ({maxAttachments} per message).
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderTopColor: Palette.borderSoft,
    backgroundColor: 'rgba(11, 19, 39, 0.94)',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  previewRow: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  preview: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    overflow: 'visible',
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Palette.cardElevated,
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.cardElevated,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.danger,
    borderWidth: 2,
    borderColor: Palette.deepNavy,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  attach: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 128, 248, 0.3)',
  },
  input: {
    flex: 1,
    color: Palette.text,
    fontSize: 16,
    fontFamily: Serif.regular,
    maxHeight: 132,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  action: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
  },
  stop: {
    backgroundColor: Palette.danger,
  },
  actionDisabled: {
    opacity: 0.4,
  },
  limit: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.one,
  },
});

import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Icon, type IconName } from '@/components/ui';
import { Palette, Radius, Spacing } from '@/constants/theme';

export type AttachmentSource = 'camera' | 'images' | 'video' | 'document';

export interface AttachmentSheetProps {
  visible: boolean;
  onClose: () => void;
  onChoose: (source: AttachmentSource) => void;
  /** Disable the video option when the configured model cannot read video. */
  videoEnabled?: boolean;
}

interface Option {
  source: AttachmentSource;
  icon: IconName;
  label: string;
  description: string;
}

const OPTIONS: Option[] = [
  { source: 'camera', icon: 'camera', label: 'Camera', description: 'Take a new photo' },
  { source: 'images', icon: 'images', label: 'Photos', description: 'Pick from your library' },
  { source: 'video', icon: 'video', label: 'Video', description: 'Attach a video clip' },
  { source: 'document', icon: 'file-text', label: 'Document', description: 'PDF, DOCX, TXT, CSV' },
];

/** Bottom sheet listing the available attachment sources. */
export function AttachmentSheet({ visible, onClose, onChoose, videoEnabled = true }: AttachmentSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close attachments">
        <Pressable
          style={[styles.panel, { paddingBottom: Spacing.four + insets.bottom }]}
          onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <AppText variant="label" style={styles.title}>
            Attach to your message
          </AppText>

          {OPTIONS.map((option) => {
            const disabled = option.source === 'video' && !videoEnabled;
            return (
              <Pressable
                key={option.source}
                disabled={disabled}
                onPress={() => onChoose(option.source)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ disabled }}
                style={({ pressed }) => [
                  styles.option,
                  pressed && { opacity: 0.85 },
                  disabled && { opacity: 0.4 },
                ]}>
                <View style={styles.optionIcon}>
                  <Icon name={option.icon} size={20} color={Palette.primaryBright} />
                </View>
                <View style={styles.optionText}>
                  <AppText variant="label">{option.label}</AppText>
                  <AppText variant="small" color={Palette.textSecondary}>
                    {disabled ? 'Not supported by the current model' : option.description}
                  </AppText>
                </View>
                <Icon name="chevron-forward" size={18} color={Palette.textMuted} />
              </Pressable>
            );
          })}

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.85 }]}>
            <AppText variant="label" color={Palette.textSecondary}>
              Cancel
            </AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.65)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: Palette.navy,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    marginBottom: Spacing.two,
  },
  title: {
    marginBottom: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    backgroundColor: Palette.card,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
  },
});

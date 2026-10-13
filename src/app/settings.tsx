import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import {
  AppText,
  Button,
  Card,
  ChoiceGroup,
  Icon,
  Logo,
  Screen,
  SectionHeader,
  TextField,
} from '@/components/ui';
import { Palette, Spacing } from '@/constants/theme';
import { useApp, type Locale, type ResponseStyle } from '@/store/AppContext';

const APP_VERSION = '1.0.0';

const STYLE_OPTIONS = [
  { value: 'concise', label: 'Concise', hint: 'Short & direct' },
  { value: 'balanced', label: 'Balanced', hint: 'Default' },
  { value: 'detailed', label: 'Detailed', hint: 'In depth' },
] as const;

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Kiswahili' },
] as const;

export default function SettingsScreen() {
  const { settings, setSettings } = useApp();
  const [instructions, setInstructions] = useState(settings.instructions);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 1800);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const dirty = instructions.trim() !== settings.instructions.trim();

  const saveInstructions = () => {
    setSettings({ instructions: instructions.trim() });
    setJustSaved(true);
  };

  return (
    <Screen>
      <ScreenHeader title="Settings" subtitle="Make Jay AI feel like yours" />

      <View style={styles.section}>
        <SectionHeader title="How Jay AI replies" />
        <Card style={styles.card}>
          <TextField
            label="Custom instructions"
            placeholder="e.g. Always answer in Kiswahili, call me Jay, keep it friendly and use simple examples."
            value={instructions}
            onChangeText={setInstructions}
            multiline
            maxLength={2000}
            hint={`${instructions.length}/2000 · Jay AI follows these whenever it writes back.`}
          />
          <View style={styles.saveRow}>
            <Button
              label={justSaved ? 'Saved' : 'Save instructions'}
              icon={justSaved ? 'checkmark-circle' : 'checkmark'}
              size="sm"
              onPress={saveInstructions}
              disabled={!dirty}
              style={styles.flex}
            />
            {settings.instructions.length > 0 ? (
              <Button
                label="Clear"
                variant="secondary"
                size="sm"
                icon="close"
                onPress={() => {
                  setInstructions('');
                  setSettings({ instructions: '' });
                }}
              />
            ) : null}
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Reply length" subtitle="How much detail you usually want" />
        <Card style={styles.card}>
          <ChoiceGroup<ResponseStyle>
            options={STYLE_OPTIONS}
            value={settings.responseStyle}
            onChange={(value) => setSettings({ responseStyle: value })}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Preferences" />
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <Icon name="globe-outline" size={18} color={Palette.primaryBright} />
            <AppText variant="small" style={styles.flex}>
              Language
            </AppText>
          </View>
          <ChoiceGroup<Locale>
            options={LANGUAGE_OPTIONS}
            value={settings.locale}
            onChange={(value) => setSettings({ locale: value })}
          />
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <Icon name="phone-portrait-outline" size={18} color={Palette.primaryBright} />
            <AppText variant="small" style={styles.flex}>
              Haptic feedback
            </AppText>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(value) => setSettings({ hapticsEnabled: value })}
              trackColor={{ false: Palette.border, true: Palette.primary }}
              thumbColor={Palette.white}
              accessibilityLabel="Haptic feedback"
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="About" />
        <Card style={styles.card}>
          <View style={styles.brand}>
            <Logo size={52} />
            <View style={styles.flex}>
              <AppText variant="title">Jay AI</AppText>
              <AppText variant="small" color={Palette.textSecondary}>
                Your creative AI studio for chat, images and video.
              </AppText>
            </View>
          </View>
          <View style={styles.divider} />
          <Row label="Version" value={`v${APP_VERSION}`} />
          <Row label="Made by" value="Jay Bros" />
          <Row label="Company" value="JSL FastLine" />
        </Card>
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <AppText variant="small" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="small" color={Palette.textMuted} style={styles.right}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.two,
  },
  saveRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  right: {
    textAlign: 'right',
    flexShrink: 1,
  },
  flex: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: Spacing.one,
  },
});

import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { MenuButton } from '@/components/navigation/SideMenu';
import {
  AppText,
  Button,
  Card,
  ChoiceGroup,
  EmptyState,
  Icon,
  type IconName,
  MockBanner,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { locales } from '@/i18n';
import { usingMockProvider } from '@/services/api';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import type { CreditTransaction } from '@/types';
import { formatCredits } from '@/utils/credits';
import { formatRelativeTime } from '@/utils/format';

export default function ProfileScreen() {
  const { profile, credits, ledger, grantCredits, spendCredits, settings, setSettings } = useApp();
  const { user, isLocal, signOut } = useAuth();
  const mock = usingMockProvider();

  const topUp = () => {
    grantCredits(50, 'Development top-up (test credit)', mock);
  };

  const testSpend = () => {
    const ok = spendCredits(5, 'Test spend from profile', mock);
    if (!ok) {
      Alert.alert('Insufficient credits', 'Top up from this screen to continue testing.');
    }
  };

  return (
    <Screen>
      <View style={styles.screenHeader}>
        <MenuButton />
        <View style={styles.flex}>
          <SectionHeader title="Profile" subtitle="Account, preferences and credits" />
        </View>
      </View>

      {mock ? <MockBanner compact /> : null}

      <Card glow style={styles.profileCard}>
        <View style={styles.avatar}>
          <Icon name="person" size={26} color={Palette.primaryBright} />
        </View>
        <View style={styles.profileText}>
          <AppText variant="heading">{profile.displayName}</AppText>
          <AppText variant="small" color={Palette.textSecondary} numberOfLines={1}>
            {user?.email ?? profile.id}
          </AppText>
          <AppText variant="tiny" color={isLocal ? Palette.warning : Palette.success}>
            {profile.plan === 'pro' ? 'Pro plan' : 'Free plan'} ·{' '}
            {isLocal ? 'Local device account' : 'Signed in'}
          </AppText>
        </View>
      </Card>

      <Card gradient style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <View>
            <AppText variant="tiny" color="rgba(255,255,255,0.8)">
              CURRENT BALANCE
            </AppText>
            <AppText variant="display" color={Palette.white}>
              {formatCredits(credits)}
            </AppText>
            <AppText variant="tiny" color="rgba(255,255,255,0.75)">
              credits
            </AppText>
          </View>
          <Icon name="flash" size={40} color="rgba(255,255,255,0.9)" />
        </View>
        <AppText variant="small" color="rgba(255,255,255,0.8)">
          Credits power your AI generations. Top up to keep creating.
        </AppText>
        <View style={styles.balanceActions}>
          <Button label="Top up +50" size="sm" onPress={topUp} style={styles.flex} />
          <Button
            label="Test spend −5"
            size="sm"
            variant="secondary"
            onPress={testSpend}
            style={styles.flex}
          />
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Account" />
        <Card style={styles.card}>
          <SettingRow
            icon="person"
            title="Signed in as"
            value={user?.email ?? 'Local device account'}
          />
          <SettingRow
            icon="flash-outline"
            title="Plan"
            value={profile.plan === 'pro' ? 'Pro' : 'Free'}
          />
          <SettingRow
            icon="settings"
            title="AI preferences"
            value="Instructions & style"
            onPress={() => router.push('/settings')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Appearance" />
        <Card style={styles.card}>
          <SettingRow icon="sparkles" title="Theme" value="Dark (default)" />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Language" />
        <Card style={styles.card}>
          <ChoiceGroup
            label=""
            options={locales}
            value={settings.locale}
            onChange={(value) => setSettings({ locale: value })}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Voice & Audio" />
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <Icon name="mic" size={18} color={Palette.primaryBright} />
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
          <AppText variant="tiny" color={Palette.textMuted}>
            Voice input and spoken replies are on the roadmap.
          </AppText>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Notifications" />
        <Card style={styles.card}>
          <SettingRow icon="info" title="Push notifications" value="Coming soon" />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Privacy & Security" />
        <Card style={styles.card}>
          <Bullet>Your chats and creations stay on your device unless you share them.</Bullet>
          <Bullet>Requests are processed securely to generate your AI responses.</Bullet>
          <Bullet>Signing out clears the local data stored on this device.</Bullet>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Help & Support" />
        <Card style={styles.card}>
          <SettingRow icon="info" title="App version" value="Jay AI v1.0.0" />
          <SettingRow icon="person" title="Made by" value="Jay Bros · JSL FastLine" />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Credit history" subtitle="Ledger of grants, spends, and refunds" />
        {ledger.length === 0 ? (
          <Card>
            <EmptyState
              icon="receipt-outline"
              title="No transactions yet"
              message="Spending or topping up credits will record ledger entries here."
            />
          </Card>
        ) : (
          <View style={styles.list}>
            {ledger.slice(0, 20).map((transaction) => (
              <LedgerRow key={transaction.id} transaction={transaction} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Button
          label="Sign out"
          variant="danger"
          icon="log-out-outline"
          onPress={() => {
            Alert.alert('Sign out?', 'Local data will be cleared on this device.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: signOut },
            ]);
          }}
        />
      </View>
    </Screen>
  );
}

function LedgerRow({ transaction }: { transaction: CreditTransaction }) {
  const positive = transaction.type === 'grant' || transaction.type === 'refund';
  const color = positive ? Palette.success : Palette.text;

  return (
    <View style={styles.ledgerRow}>
      <View
        style={[
          styles.ledgerIcon,
          { backgroundColor: positive ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' },
        ]}>
        <Icon
          name={positive ? 'arrow-down' : 'arrow-up'}
          size={14}
          color={positive ? Palette.success : Palette.danger}
        />
      </View>
      <View style={styles.ledgerText}>
        <AppText variant="small" numberOfLines={1}>
          {transaction.description}
        </AppText>
        <AppText variant="tiny" color={Palette.textMuted}>
          {formatRelativeTime(transaction.createdAt)}
          {transaction.mock ? ' · mock' : ''}
        </AppText>
      </View>
      <AppText variant="label" color={color}>
        {transaction.amount >= 0 ? '+' : ''}
        {formatCredits(transaction.amount)}
      </AppText>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  value,
  onPress,
}: {
  icon: IconName;
  title: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Icon name={icon} size={18} color={Palette.primaryBright} />
      <AppText variant="small" style={styles.flex}>
        {title}
      </AppText>
      <AppText variant="small" color={Palette.textMuted} style={styles.value} numberOfLines={1}>
        {value}
      </AppText>
      {onPress ? <Icon name="chevron-forward" size={16} color={Palette.textMuted} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.settingRow}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.8 }]}>
      {content}
    </Pressable>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bullet}>
      <Icon name="checkmark-circle" size={15} color={Palette.success} />
      <AppText variant="small" color={Palette.textSecondary} style={styles.flex}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(56, 128, 248, 0.4)',
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  balanceCard: {
    gap: Spacing.three,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  value: {
    flexShrink: 1,
  },
  section: {
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  ledgerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerText: {
    flex: 1,
    gap: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
});

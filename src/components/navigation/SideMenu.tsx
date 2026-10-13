import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Icon, type IconName, Logo } from '@/components/ui';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { formatRelativeTime } from '@/utils/format';

const RECENT_LIMIT = 3;

interface SideMenuContextValue {
  open: () => void;
  close: () => void;
  visible: boolean;
}

const SideMenuContext = createContext<SideMenuContextValue | null>(null);

export function SideMenuProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const value = useMemo<SideMenuContextValue>(() => ({ open, close, visible }), [open, close, visible]);

  return (
    <SideMenuContext.Provider value={value}>
      {children}
      <SideMenuOverlay visible={visible} onClose={close} />
    </SideMenuContext.Provider>
  );
}

export function useSideMenu(): SideMenuContextValue {
  const context = useContext(SideMenuContext);
  if (!context) throw new Error('useSideMenu must be used within a SideMenuProvider');
  return context;
}

/** Hamburger button that opens the side menu. */
export function MenuButton({ tint = Palette.text }: { tint?: string }) {
  const { open } = useSideMenu();
  return (
    <Pressable
      onPress={open}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      style={({ pressed }) => [styles.menuButton, pressed && { opacity: 0.7 }]}>
      <Icon name="menu" size={20} color={tint} />
    </Pressable>
  );
}

function SideMenuOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(320, width * 0.84);
  const slideRef = useRef(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(slideRef.current, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const tx = React.useMemo(() => new Animated.Value(-panelWidth), [panelWidth]);
  const bo = React.useMemo(() => new Animated.Value(0), []);

  React.useEffect(() => {
    tx.setValue(-panelWidth);
  }, [panelWidth, tx]);
  React.useEffect(() => {
    const anim = slideRef.current;
    const listener = anim.addListener(({ value }) => {
      tx.setValue(-panelWidth + value * panelWidth);
    });
    return () => anim.removeListener(listener);
  }, [panelWidth, tx]);
  React.useEffect(() => {
    const anim = slideRef.current;
    const listener = anim.addListener(({ value }) => {
      bo.setValue(value);
    });
    return () => anim.removeListener(listener);
  }, [bo]);

  const go = useCallback(
    (fn: () => void) => {
      onClose();
      requestAnimationFrame(fn);
    },
    [onClose]
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.backdrop, { opacity: bo }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
        </Animated.View>
        <Animated.View
          style={[
            styles.panel,
            { width: panelWidth, transform: [{ translateX: tx }], paddingTop: insets.top + Spacing.four },
          ]}>
          <SideMenuContent onNavigate={go} onClose={onClose} bottomInset={insets.bottom} />
        </Animated.View>
      </View>
    </Modal>
  );
}

function SideMenuContent({
  onNavigate,
  onClose,
  bottomInset,
}: {
  onNavigate: (fn: () => void) => void;
  onClose: () => void;
  bottomInset: number;
}) {
  const { creations, profile } = useApp();
  const { user, signOut } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const chats = useMemo(
    () =>
      creations
        .filter((creation) => creation.kind === 'chat')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [creations]
  );
  const visibleChats = expanded ? chats : chats.slice(0, RECENT_LIMIT);

  const openChat = (id: string) =>
    onNavigate(() => router.push({ pathname: '/chat', params: { chat: id } }));

  return (
    <View style={styles.content}>
      <View style={styles.brand}>
        <Logo size={40} />
        <View style={styles.flex}>
          <AppText variant="label">Jay AI</AppText>
          <AppText variant="tiny" color={Palette.textMuted}>
            Your Smart Assistant
          </AppText>
        </View>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close menu">
          <Icon name="close" size={20} color={Palette.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <MenuItem icon="tools" label="Tools" onPress={() => onNavigate(() => router.push('/tools'))} />
        <MenuItem
          icon="sparkles"
          label="Video Studio"
          onPress={() => onNavigate(() => router.push('/video-studio'))}
        />
        <MenuItem
          icon="person"
          label="Profile"
          onPress={() => onNavigate(() => router.push('/profile'))}
        />
        <MenuItem
          icon="settings"
          label="Settings"
          onPress={() => onNavigate(() => router.push('/settings'))}
        />

        <View style={styles.divider} />

        <AppText variant="tiny" color={Palette.textMuted} style={styles.sectionLabel}>
          RECENT CHATS
        </AppText>

        {chats.length === 0 ? (
          <AppText variant="small" color={Palette.textMuted} style={styles.emptyChats}>
            No chats yet. Ask Jay AI something to get started.
          </AppText>
        ) : (
          <>
            {visibleChats.map((chat) => (
              <Pressable
                key={chat.id}
                onPress={() => openChat(chat.id)}
                accessibilityRole="button"
                accessibilityLabel={chat.title}
                style={({ pressed }) => [styles.chatRow, pressed && styles.rowPressed]}>
                <Icon name="chatbubbles" size={16} color={Palette.textSecondary} />
                <View style={styles.flex}>
                  <AppText variant="small" numberOfLines={1}>
                    {chat.title}
                  </AppText>
                  <AppText variant="tiny" color={Palette.textMuted}>
                    {formatRelativeTime(chat.updatedAt)}
                  </AppText>
                </View>
              </Pressable>
            ))}

            {chats.length > RECENT_LIMIT ? (
              <Pressable
                onPress={() => setExpanded((value) => !value)}
                accessibilityRole="button"
                style={styles.readMore}>
                <AppText variant="small" color={Palette.primaryBright}>
                  {expanded ? 'Show less' : `Read more (${chats.length - RECENT_LIMIT})`}
                </AppText>
                <Icon
                  name={expanded ? 'chevron-back' : 'chevron-forward'}
                  size={14}
                  color={Palette.primaryBright}
                />
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomInset + Spacing.four }]}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Icon name="person" size={18} color={Palette.primaryBright} />
          </View>
          <View style={styles.flex}>
            <AppText variant="small" numberOfLines={1}>
              {profile.displayName}
            </AppText>
            <AppText variant="tiny" color={Palette.textMuted} numberOfLines={1}>
              {user?.email ?? (user ? 'Signed in' : 'Local device account')}
            </AppText>
          </View>
        </View>
        <Pressable
          onPress={() =>
            onNavigate(() => {
              void signOut();
              router.replace('/(auth)/sign-in');
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={({ pressed }) => [styles.logout, pressed && styles.rowPressed]}>
          <Icon name="log-out-outline" size={18} color={Palette.danger} />
          <AppText variant="small" color={Palette.danger}>
            Log out
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.item, pressed && styles.rowPressed]}>
      <Icon name={icon} size={18} color={Palette.textSecondary} />
      <AppText variant="body" style={styles.flex}>
        {label}
      </AppText>
      <Icon name="chevron-forward" size={16} color={Palette.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
  },
  panel: {
    backgroundColor: '#0b1327',
    borderRightWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  scroll: {
    gap: Spacing.one,
    paddingBottom: Spacing.four,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
  },
  rowPressed: {
    backgroundColor: 'rgba(56, 128, 248, 0.12)',
  },
  divider: {
    height: 1,
    backgroundColor: Palette.borderSoft,
    marginVertical: Spacing.two,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.one,
  },
  emptyChats: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
  },
  readMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  footer: {
    borderTopWidth: 1,
    borderColor: Palette.border,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
});

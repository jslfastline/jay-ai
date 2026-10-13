import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { CreationCard } from '@/components/CreationCard';
import { MenuButton } from '@/components/navigation/SideMenu';
import {
  AppText,
  EmptyState,
  Icon,
  type IconName,
  MockBanner,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { usingMockProvider } from '@/services/api';
import { useApp } from '@/store/AppContext';
import type { Creation, CreationKind } from '@/types';

type Filter = 'all' | CreationKind;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'video', label: 'Videos' },
  { value: 'image', label: 'Images' },
  { value: 'chat', label: 'Chats' },
];

interface Tool {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  route: string;
}

const TOOLS: Tool[] = [
  {
    id: 'video',
    icon: 'videocam',
    title: 'Video Studio',
    description: 'Multi-scene cinematic videos',
    route: '/video-studio',
  },
  {
    id: 'image',
    icon: 'image',
    title: 'Image Generation',
    description: 'Create art from a prompt',
    route: '/image-studio',
  },
  {
    id: 'analysis',
    icon: 'scan',
    title: 'Image Analysis',
    description: 'Ask questions about a photo',
    route: '/image-analysis',
  },
  {
    id: 'voice',
    icon: 'mic',
    title: 'Voice Chat',
    description: 'Talk things through',
    route: '/chat',
  },
  {
    id: 'code',
    icon: 'code',
    title: 'Coding Assistant',
    description: 'Debug and explain code',
    route: '/chat',
  },
  {
    id: 'search',
    icon: 'search',
    title: 'Search',
    description: 'Research with citations',
    route: '/chat',
  },
];

export default function ToolsScreen() {
  const { creations, removeCreation } = useApp();
  const mock = usingMockProvider();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered =
    filter === 'all' ? creations : creations.filter((creation) => creation.kind === filter);

  const openCreation = (creation: Creation) => {
    if (creation.kind === 'video') {
      router.push({ pathname: '/video/[id]', params: { id: creation.id } });
    } else if (creation.kind === 'image') {
      router.push('/image-studio');
    } else if (creation.kind === 'chat') {
      router.push({ pathname: '/chat', params: { chat: creation.id } });
    } else {
      router.push('/image-analysis');
    }
  };

  const confirmDelete = (creation: Creation) => {
    Alert.alert('Delete creation?', `"${creation.title}" will be removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeCreation(creation.id) },
    ]);
  };

  return (
    <Screen>
      <View style={styles.screenHeader}>
        <MenuButton />
        <View style={styles.flex}>
          <SectionHeader title="Tools" subtitle="Powerful tools for your goals" />
        </View>
      </View>

      {mock ? <MockBanner compact /> : null}

      <View style={styles.grid}>
        {TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} onPress={() => router.push(tool.route as never)} />
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Recent"
          action={
            creations.length > 0 ? (
              <View style={styles.filters}>
                {FILTERS.map((item) => {
                  const active = filter === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => setFilter(item.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[styles.filterPill, active && styles.filterActive]}>
                      <AppText
                        variant="tiny"
                        color={active ? Palette.white : Palette.textSecondary}>
                        {item.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : undefined
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon="albums-outline"
            title={filter === 'all' ? 'Nothing here yet' : `No ${filter} creations yet`}
            message="Your generated videos, images, and chats will appear here."
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((creation) => (
              <CreationCard
                key={creation.id}
                creation={creation}
                onPress={openCreation}
                onDelete={confirmDelete}
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function ToolCard({ tool, onPress }: { tool: Tool; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tool.title}. ${tool.description}`}
      style={({ pressed }) => [styles.tool, pressed && styles.toolPressed]}>
      <View style={styles.toolIcon}>
        <Icon name={tool.icon} size={22} color={Palette.primaryBright} />
      </View>
      <AppText variant="label" numberOfLines={1}>
        {tool.title}
      </AppText>
      <AppText variant="tiny" color={Palette.textMuted} numberOfLines={2}>
        {tool.description}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tool: {
    width: '48%',
    flexGrow: 1,
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  toolPressed: {
    opacity: 0.85,
    borderColor: 'rgba(56, 128, 248, 0.4)',
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    marginBottom: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    justifyContent: 'flex-end',
  },
  filterPill: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primaryBright,
  },
  list: {
    gap: Spacing.two,
  },
});

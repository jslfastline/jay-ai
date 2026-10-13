import { Pressable, StyleSheet, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

export interface ChoiceGroupProps<T extends string | number> {
  label?: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
}

/** Single-select pill group used for style/duration/scene/aspect pickers. */
export function ChoiceGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  columns,
}: ChoiceGroupProps<T>) {
  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="label" color={Palette.textSecondary}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              style={[
                styles.pill,
                columns ? { width: `${100 / columns - 2}%` } : undefined,
                selected && styles.selected,
              ]}>
              <AppText
                variant="label"
                color={selected ? Palette.white : Palette.textSecondary}
                center>
                {option.label}
              </AppText>
              {option.hint ? (
                <AppText
                  variant="tiny"
                  color={selected ? 'rgba(255,255,255,0.8)' : Palette.textMuted}
                  center>
                  {option.hint}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pill: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    minWidth: 64,
  },
  selected: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primaryBright,
  },
});

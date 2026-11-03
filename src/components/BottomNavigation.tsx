import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// These are the four main sections of the app.
export type MainTab = 'home' | 'journal' | 'progress' | 'profile';

type Props = {
  selected: MainTab; // Highlight the section currently open.
  onSelect: (tab: MainTab) => void; // Ask App.tsx to change sections.
  disabled?: boolean; // Prevent navigation while an operation is saving.
};

// Keep the labels and icons together for easy editing.
const tabs: { key: MainTab; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'journal', label: 'Journal', icon: '📖' },
  { key: 'progress', label: 'Progress', icon: '🌷' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

export default function BottomNavigation({
  selected,
  onSelect,
  disabled = false,
}: Props) {
  // Match the navigation bar to the selected app theme.
  const { colours } = useTheme();
  const styles = createStyles(colours);

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const isSelected = selected === tab.key;

          return (
            <Pressable
              key={tab.key}
              onPress={() => onSelect(tab.key)}
              disabled={disabled}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{
                selected: isSelected,
                disabled,
              }}
              style={({ pressed }) => [
                styles.tab,
                isSelected && styles.selectedTab,
                (pressed || disabled) && styles.pressed,
              ]}
            >
              {/* Separate the emoji from its label for clear rendering. */}
              <Text style={styles.icon}>{tab.icon}</Text>

              <Text
                style={[
                  styles.label,
                  isSelected && styles.selectedLabel,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Rebuild the navigation colours when the theme changes.
const createStyles = (
  colours: ReturnType<typeof useTheme>['colours']
) =>
  StyleSheet.create({
    container: {
      backgroundColor: colours.background,
      borderTopWidth: 1,
      borderTopColor: colours.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    bar: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      flexDirection: 'row',
      gap: 4,
    },
    tab: {
      flex: 1,
      minHeight: 58,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      paddingVertical: 8,
      gap: 4,
    },
    selectedTab: {
      backgroundColor: colours.lavender,
    },
    icon: {
      fontSize: 21,
    },
    label: {
      fontSize: 11,
      fontWeight: '500',
      color: colours.muted,
    },
    selectedLabel: {
      fontWeight: '700',
      color: colours.primary,
    },
    pressed: {
      opacity: 0.65,
    },
  });
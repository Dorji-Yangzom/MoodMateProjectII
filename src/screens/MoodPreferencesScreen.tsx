import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// These are the choices passed to the recommendation algorithm.
export type MoodPreferences = {
  mood: 'Happy' | 'Calm' | 'Sad' | 'Stressed' | 'Bored';
  energy: 'Low' | 'Medium' | 'High';
  minutes: number;
  location: 'Indoor' | 'Outdoor';
};

// Describe the values supplied by App.tsx.
type Props = {
  onBack: () => void;
  onContinue: (preferences: MoodPreferences) => void;
  continueLabel?: string;
};

// Reuse the same button design for each choice.
type ChoiceProps = {
  label: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
};

// Show the emoji and label separately so both remain visible.
function Choice({ label, emoji, selected, onPress }: ChoiceProps) {
    // Each choice reads the same shared theme as the screen.
    const { colours } = useTheme();
    const styles = createStyles(colours);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.selectedChoice,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {emoji && <Text style={{ fontSize: 18 }}>{emoji}</Text>}

        <Text
          style={[
            styles.choiceText,
            selected && styles.selectedText,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MoodPreferencesScreen({
  onBack,
  onContinue,
  continueLabel = 'Find my activities →',
}: Props) {
  // Hooks belong inside the screen function.
  const { isDark, colours } = useTheme();
  const styles = createStyles(colours);

  // Store the user's selected options.
  // Store the user's selected options.
  const [mood, setMood] = useState<MoodPreferences['mood']>('Calm');
  const [energy, setEnergy] = useState<MoodPreferences['energy']>('Medium');
  const [minutes, setMinutes] = useState(15);
  const [location, setLocation] =
    useState<MoodPreferences['location']>('Indoor');

  const moods: MoodPreferences['mood'][] = [
    'Happy', 'Calm', 'Sad', 'Stressed', 'Bored',
  ];
  const energies: MoodPreferences['energy'][] = ['Low', 'Medium', 'High'];
  const locations: MoodPreferences['location'][] = ['Indoor', 'Outdoor'];

  const moodEmojis = {
    Happy: '😊',
    Calm: '😌',
    Sad: '😔',
    Stressed: '😣',
    Bored: '😐',
  };

  function handleContinue() {
    // Send the current choices to the next screen.
    onContinue({ mood, energy, minutes, location });
  }

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back to Home</Text>
        </Pressable>

        <Text style={styles.eyebrow}>A MOMENT FOR YOU</Text>
        <Text style={styles.title}>Let’s check in 🌸</Text>
        <Text style={styles.subtitle}>
          Choose what feels right. We’ll help you find an activity.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How are you feeling?</Text>
          <View style={styles.options}>
            {moods.map((item) => (
              <Choice
                key={item}
                label={item}
                emoji={moodEmojis[item]}
                selected={mood === item}
                onPress={() => setMood(item)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your energy level</Text>
          <View style={styles.options}>
            {energies.map((item) => (
              <Choice
                key={item}
                label={item}
                selected={energy === item}
                onPress={() => setEnergy(item)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How much time do you have?</Text>
          <View style={styles.options}>
            {[5, 15, 30, 60, 120].map((item) => (
              <Choice
                key={item}
                label={`${item} min`}
                selected={minutes === item}
                onPress={() => setMinutes(item)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Where would you like to be?</Text>
          <View style={styles.options}>
            {locations.map((item) => (
              <Choice
                key={item}
                label={item}
                emoji={item === 'Indoor' ? '🏡' : '🌿'}
                selected={location === item}
                onPress={() => setLocation(item)}
              />
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleContinue}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>{continueLabel}</Text>
        </Pressable>

        <Text style={styles.footer}>
          There’s no perfect answer. Start with how you feel.
        </Text>
      </ScrollView>
    </View>
  );
}

// Share these themed styles between the screen and Choice components.
const createStyles = (
  colours: ReturnType<typeof useTheme>['colours']
) =>
  StyleSheet.create({
    // Screen background and spacing.
    container: {
      flex: 1,
      backgroundColor: colours.background,
    },
    content: {
      flexGrow: 1,
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 48,
    },
    backButton: {
      alignSelf: 'flex-start',
      minHeight: 44,
      justifyContent: 'center',
      marginBottom: 22,
    },
    backText: {
      fontSize: 14,
      fontWeight: '600',
      color: colours.primary,
    },

    // Heading and introductory text.
    eyebrow: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: colours.muted,
      marginBottom: 10,
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colours.text,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 23,
      color: colours.muted,
      marginTop: 10,
      marginBottom: 26,
    },

    // Mood, energy, time and location sections.
    section: {
      backgroundColor: colours.input,
      padding: 20,
      borderRadius: 24,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colours.text,
      marginBottom: 14,
    },
    options: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },

    // Unselected choices use a surface colour.
    choice: {
      minHeight: 46,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colours.border,
      backgroundColor: colours.surface,
      justifyContent: 'center',
    },

    // Selected choices use a contrasting label on the primary colour.
    selectedChoice: {
      backgroundColor: colours.primary,
      borderColor: colours.primary,
    },
    choiceText: {
      fontSize: 14,
      fontWeight: '600',
      color: colours.text,
    },
    selectedText: {
      color: colours.buttonText,
    },

    // Continue button and footer.
    button: {
      backgroundColor: colours.primary,
      borderRadius: 26,
      minHeight: 56,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    buttonText: {
      fontSize: 17,
      fontWeight: '700',
      color: colours.buttonText,
    },
    footer: {
      fontSize: 12,
      lineHeight: 19,
      color: colours.muted,
      textAlign: 'center',
      marginTop: 18,
    },
    pressed: {
      opacity: 0.75,
    },
  });
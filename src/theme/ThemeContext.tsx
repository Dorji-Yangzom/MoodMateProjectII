import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Each theme provides the same colours, making screens easy to update.
type ThemeColours = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  lavender: string;
  pink: string;
  yellow: string;
  border: string;
  input: string;
  buttonText: string;
};

const lightColours: ThemeColours = {
  background: '#FFFCFF',
  surface: '#FFFFFF',
  text: '#392D46',
  muted: '#81718D',
  primary: '#8950CF',
  lavender: '#F0E7FA',
  pink: '#FCECF4',
  yellow: '#FFF5D9',
  border: '#EEE4F3',
  input: '#F7F1FC',
  buttonText: '#FFFFFF',
};

const darkColours: ThemeColours = {
  background: '#19141F',
  surface: '#261E30',
  text: '#F5EDF9',
  muted: '#BDAEC9',
  primary: '#C49AF5',
  lavender: '#382747',
  pink: '#422738',
  yellow: '#403721',
  border: '#493851',
  input: '#302538',
  buttonText: '#24152F',
};

type ThemeValue = {
  isDark: boolean;
  colours: ThemeColours;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

// Keep the preference on this phone between app launches.
const STORAGE_KEY = 'moodmate.theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  // Chain storage writes so quick taps cannot save out of order.
  const pendingWrite = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;

    async function loadTheme() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);

        if (active) {
          setIsDark(saved === 'dark');
        }
      } catch {
        console.warn('[Theme] Could not load theme preference');
      } finally {
        if (active) {
          setReady(true);
        }
      }
    }

    void loadTheme();

    return () => {
      active = false; // Ignore results after the provider closes.
    };
  }, []);

  useEffect(() => {
    // Wait for loading so the default cannot overwrite a saved theme.
    if (!ready) return;

    pendingWrite.current = pendingWrite.current
      .then(() =>
        AsyncStorage.setItem(
          STORAGE_KEY,
          isDark ? 'dark' : 'light'
        )
      )
      .catch(() => {
        console.warn('[Theme] Could not save theme preference');
      });
  }, [isDark, ready]);

  function toggleTheme() {
    if (!ready) return; // Avoid changes while loading the preference.
    setIsDark((current) => !current);
  }

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        colours: isDark ? darkColours : lightColours,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Screens use this hook to access the selected theme.
export function useTheme(): ThemeValue {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }

  return theme;
}


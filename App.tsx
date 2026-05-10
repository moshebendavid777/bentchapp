import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import prayerData from './src/data/birkatHamazon.json';

type Language = 'hebrew';
type Nusach = 'Ashkenazi' | 'Sephardi';
type Occasion =
  | 'weekday'
  | 'shabbat'
  | 'yom_tov'
  | 'rosh_chodesh'
  | 'chanukah'
  | 'purim'
  | 'chol_hamoed_pesach'
  | 'chol_hamoed_sukkot'
  | 'pesach'
  | 'sukkot'
  | 'shemini_atzeret'
  | 'shavuot'
  | 'rosh_hashanah'
  | 'bris'
  | 'sheva_berachot';
type FontScale = 'compact' | 'comfortable' | 'large';
type Participants = '1' | '3' | '10';
type AppScreen = 'home' | 'reader';

type Preferences = {
  language: Language;
  nusach: Nusach;
  occasion: Occasion;
  fontScale: FontScale;
  participants: Participants;
  hostedMeal: boolean;
};

type ShowIf = {
  occasion?: Occasion[];
  participants_min?: number;
  hosted_meal?: boolean;
};

type ContentLine = {
  role?: 'leader' | 'group';
  text: string;
};

type DynamicItem = {
  id: string;
  type?: 'conditional';
  show_if?: ShowIf;
  text: string;
};

type PrayerSection = {
  id: string;
  title: string;
  type: 'core' | 'conditional' | 'dynamic' | 'mapping';
  show_if?: ShowIf;
  intro?: string;
  text?: string;
  content?: ContentLine[];
  variants?: Partial<Record<Occasion, { title: string; text: string }>>;
  items?: DynamicItem[] | Partial<Record<Occasion, string>>;
};

type PrayerVersion = {
  id: string;
  title: string;
  nusach: Nusach;
  language: Language;
  version: string;
  sections: PrayerSection[];
  supported_occasions: Occasion[];
};

const PREFERENCES_KEY = '@bentchapp/preferences';
const SPLASH_LOGO = require('./src/assets/splash_bentchapp.png');
const HEADER_LOGO = require('./src/assets/logo_inner.png');

const DEFAULT_PREFERENCES: Preferences = {
  language: 'hebrew',
  nusach: 'Sephardi',
  occasion: 'weekday',
  fontScale: 'comfortable',
  participants: '1',
  hostedMeal: false,
};

const FONT_SIZES: Record<FontScale, number> = {
  compact: 19,
  comfortable: 23,
  large: 29,
};

const FONT_LABELS: Record<FontScale, string> = {
  compact: 'Small',
  comfortable: 'Medium',
  large: 'Large',
};

const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: 'hebrew', label: 'Hebrew' },
];

const NUSACHIM: Array<{ value: Nusach; label: string }> = [
  { value: 'Ashkenazi', label: 'Ashkenazi' },
  { value: 'Sephardi', label: 'Sephardi' },
];

const OCCASIONS: Array<{ value: Occasion; label: string }> = [
  { value: 'weekday', label: 'Weekday' },
  { value: 'shabbat', label: 'Shabbat' },
  { value: 'yom_tov', label: 'Yom Tov' },
  { value: 'rosh_chodesh', label: 'Rosh Chodesh' },
  { value: 'chanukah', label: 'Chanukah' },
  { value: 'purim', label: 'Purim' },
  { value: 'chol_hamoed_pesach', label: 'Chol Hamoed Pesach' },
  { value: 'chol_hamoed_sukkot', label: 'Chol Hamoed Sukkot' },
  { value: 'pesach', label: 'Pesach' },
  { value: 'sukkot', label: 'Sukkot' },
  { value: 'shemini_atzeret', label: 'Shemini Atzeret' },
  { value: 'shavuot', label: 'Shavuot' },
  { value: 'rosh_hashanah', label: 'Rosh Hashanah' },
  { value: 'bris', label: 'Bris' },
  { value: 'sheva_berachot', label: 'Sheva Berachot' },
];

const PARTICIPANT_OPTIONS: Array<{ value: Participants; label: string }> = [
  { value: '1', label: '1-2' },
  { value: '3', label: '3+' },
  { value: '10', label: '10+' },
];

const QUICK_ACCESS = [
  { title: 'Al Hamichya', icon: '♪' },
  { title: 'Boreh Nefashot', icon: '●' },
  { title: 'Tefilat Haderech', icon: '⌂' },
  { title: 'Asher Yatzar', icon: '♥' },
];

const NAV_ITEMS = [
  { screen: 'home' as AppScreen, title: 'Home', icon: '⌂' },
  { screen: 'reader' as AppScreen, title: 'Reader', icon: '▤' },
  { screen: 'home' as AppScreen, title: 'Audio', icon: '◉' },
  { screen: 'home' as AppScreen, title: 'Bookmarks', icon: '□' },
  { screen: 'home' as AppScreen, title: 'More', icon: '…' },
];

const typedPrayerData = prayerData as {
  versions: PrayerVersion[];
};

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#fffaf2" />
      <BentchApp />
    </SafeAreaProvider>
  );
}

function BentchApp() {
  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);
  const [isReady, setIsReady] = useState(false);
  const [screen, setScreen] = useState<AppScreen>('home');

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      const savedPreferences = await loadPreferences();
      const minimumSplash = new Promise<void>(resolve =>
        setTimeout(resolve, 5000),
      );
      await minimumSplash;

      if (isMounted) {
        setPreferences(savedPreferences);
        setIsReady(true);
      }
    }

    boot();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)).catch(
        () => undefined,
      );
    }
  }, [isReady, preferences]);

  if (!isReady) {
    return <SplashScreen />;
  }

  if (screen === 'reader') {
    return (
      <ReaderScreen
        preferences={preferences}
        setPreferences={setPreferences}
        onBack={() => setScreen('home')}
      />
    );
  }

  return (
    <HomeScreen
      preferences={preferences}
      setPreferences={setPreferences}
      onStart={() => setScreen('reader')}
      onNavigate={setScreen}
    />
  );
}

async function loadPreferences(): Promise<Preferences> {
  try {
    const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!stored) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(stored) as Partial<Preferences>;
    return {
      language: parsed.language ?? DEFAULT_PREFERENCES.language,
      nusach: parsed.nusach ?? DEFAULT_PREFERENCES.nusach,
      occasion: parsed.occasion ?? DEFAULT_PREFERENCES.occasion,
      fontScale: parsed.fontScale ?? DEFAULT_PREFERENCES.fontScale,
      participants: parsed.participants ?? DEFAULT_PREFERENCES.participants,
      hostedMeal: parsed.hostedMeal ?? DEFAULT_PREFERENCES.hostedMeal,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function SplashScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.78, 430);

  return (
    <View style={styles.splash}>
      <View style={[styles.splashContent, { paddingTop: insets.top + 24 }]}>
        <Image
          accessibilityLabel="Bentch"
          resizeMode="contain"
          source={SPLASH_LOGO}
          style={[styles.splashLogo, { width: logoWidth }]}
        />
      </View>

      <View style={styles.splashWave}>
        <View style={styles.splashWaveCutout} />
        <View style={styles.splashGoldCurve} />
        <View style={styles.splashLoading}>
          <ActivityIndicator color="#d8ad58" size="large" />
          <Text style={styles.splashLoadingText}>Loading...</Text>
        </View>
      </View>
    </View>
  );
}

function HomeScreen({
  preferences,
  setPreferences,
  onStart,
  onNavigate,
}: {
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
  onStart: () => void;
  onNavigate: (screen: AppScreen) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.homeScreen}>
      <ScrollView
        style={styles.homeScroll}
        contentContainerStyle={[
          styles.homeContent,
          { paddingBottom: insets.bottom + 126 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.homeTop}>
          <Image
            accessibilityLabel="BentchApp"
            resizeMode="contain"
            source={HEADER_LOGO}
            style={styles.homeLogo}
          />
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.settingsButton,
              pressed && styles.softPressed,
            ]}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </Pressable>
        </View>

        <View style={styles.homeCard}>
          <Text style={styles.homeCardTitle}>Choose Nusach</Text>
          <Text style={styles.homeCardSubtitle}>Your selection is saved</Text>

          <View style={styles.nusachGrid}>
            {NUSACHIM.slice()
              .reverse()
              .map(option => (
                <NusachCard
                  key={option.value}
                  label={option.label}
                  selected={preferences.nusach === option.value}
                  onPress={() =>
                    setPreferences(current => ({
                      ...current,
                      nusach: option.value,
                    }))
                  }
                />
              ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onStart}
            style={({ pressed }) => [
              styles.startButton,
              pressed && styles.startButtonPressed,
            ]}
          >
            <Text style={styles.startIcon}>▰</Text>
            <Text style={styles.startText}>Start Birkat Hamazon</Text>
            <Text style={styles.startArrow}>›</Text>
          </Pressable>
          <Text style={styles.savedHint}>
            Continue with your saved settings
          </Text>

          <Text style={styles.quickTitle}>Quick Access</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACCESS.map(item => (
              <Pressable
                accessibilityRole="button"
                key={item.title}
                style={({ pressed }) => [
                  styles.quickTile,
                  pressed && styles.softPressed,
                ]}
              >
                <View style={styles.quickIconCircle}>
                  <Text style={styles.quickIcon}>{item.icon}</Text>
                </View>
                <Text style={styles.quickText}>{item.title}</Text>
                <View style={styles.quickUnderline} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.greetingCard}>
          <View style={styles.greetingIconCircle}>
            <Text style={styles.greetingIcon}>▣</Text>
          </View>
          <View style={styles.greetingCopy}>
            <Text style={styles.greetingTitle}>Good morning! ☼</Text>
            <Text style={styles.greetingText}>
              Have a great day and a meaningful bench.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, { bottom: insets.bottom + 16 }]}>
        {NAV_ITEMS.map(item => {
          const isActive = item.screen === 'home' && item.title === 'Home';
          return (
            <Pressable
              accessibilityRole="button"
              key={item.title}
              onPress={() => {
                if (item.screen === 'reader') {
                  onStart();
                } else {
                  onNavigate(item.screen);
                }
              }}
              style={styles.navItem}
            >
              <Text style={[styles.navIcon, isActive && styles.navIconActive]}>
                {item.icon}
              </Text>
              <Text style={[styles.navText, isActive && styles.navTextActive]}>
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function NusachCard({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const isSephardi = label === 'Sephardi';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.nusachCard,
        selected && styles.nusachCardSelected,
        pressed && styles.softPressed,
      ]}
    >
      {selected && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
      <View
        style={[styles.nusachIconCircle, selected && styles.nusachIconSelected]}
      >
        <Text style={[styles.nusachIcon, selected && styles.nusachIconActive]}>
          {isSephardi ? '⌂' : '✡'}
        </Text>
      </View>
      <Text style={styles.nusachLabel}>{label}</Text>
      <View
        style={[
          styles.nusachUnderline,
          selected && styles.nusachUnderlineActive,
        ]}
      />
    </Pressable>
  );
}

function ReaderScreen({
  preferences,
  setPreferences,
  onBack,
}: {
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
  onBack: () => void;
}) {
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 393, 0.86), 1.28);
  const horizontalPadding = Math.max(18, width * 0.036);
  const selectedOccasion = getSelectedLabel(OCCASIONS, preferences.occasion);
  const selectedVersion = useMemo(
    () =>
      typedPrayerData.versions.find(
        version => version.nusach === preferences.nusach,
      ) ?? typedPrayerData.versions[0],
    [preferences.nusach],
  );
  const visibleSections = useMemo(
    () =>
      selectedVersion.sections.filter(section =>
        shouldShow(section.show_if, preferences),
      ),
    [preferences, selectedVersion],
  );
  const currentSection =
    visibleSections.find(section => section.id === 'birkat_hazan') ??
    visibleSections[0];
  const currentLines = currentSection
    ? getSectionLines(currentSection, preferences)
    : [];
  const hebrewText = currentLines.map(line => line.text).join(' ');
  const progressWidth = `${100 / Math.max(visibleSections.length, 1)}%`;

  return (
    <SafeAreaView style={styles.readerScreen}>
      <ScrollView
        style={styles.reader}
        contentContainerStyle={[
          styles.readerPageContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: 26 * scale,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.readerTopBar}>
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              styles.readerCircleButton,
              {
                borderRadius: 24 * scale,
                height: 48 * scale,
                width: 48 * scale,
              },
              pressed && styles.softPressed,
            ]}
          >
            <Text style={[styles.readerCircleIcon, { fontSize: 30 * scale }]}>
              ‹
            </Text>
          </Pressable>
          <Text style={[styles.readerHeaderTitle, { fontSize: 25 * scale }]}>
            Birkat Hamazon
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.readerCircleButton,
              {
                borderRadius: 24 * scale,
                height: 48 * scale,
                width: 48 * scale,
              },
              pressed && styles.softPressed,
            ]}
          >
            <Text style={[styles.readerBookmarkIcon, { fontSize: 26 * scale }]}>
              ♡
            </Text>
          </Pressable>
        </View>

        <View style={[styles.readerFilterRow, { gap: 16 * scale }]}>
          <ReaderPill
            icon="⌂"
            label="Nusach"
            scale={scale}
            value={preferences.nusach}
            onPress={() =>
              setPreferences(current => ({
                ...current,
                nusach:
                  current.nusach === 'Sephardi' ? 'Ashkenazi' : 'Sephardi',
              }))
            }
          />
          <ReaderPill
            icon="▣"
            label="Occasion"
            scale={scale}
            value={selectedOccasion}
            onPress={() =>
              setPreferences(current => ({
                ...current,
                occasion: current.occasion === 'weekday' ? 'shabbat' : 'weekday',
              }))
            }
          />
        </View>

        <View style={styles.readerTabs}>
          {['Hebrew', 'Transliteration', 'English'].map((tab, index) => (
            <View key={tab} style={styles.readerTab}>
              <Text
                style={[
                  styles.readerTabText,
                  index === 0 && styles.readerTabTextActive,
                  { fontSize: 18 * scale },
                ]}
              >
                {tab}
              </Text>
              {index === 0 && <View style={styles.readerTabUnderline} />}
            </View>
          ))}
        </View>

        <View
          style={[
            styles.prayerReaderCard,
            {
              borderRadius: 18 * scale,
              minHeight: 460 * scale,
              paddingTop: 34 * scale,
            },
          ]}
        >
          <Text style={[styles.prayerEyebrow, { fontSize: 17 * scale }]}>
            {currentSection?.title ?? 'ברכת הזן'}
          </Text>
          <Text
            style={[
              styles.readerHebrewText,
              {
                fontSize: 37 * scale,
                lineHeight: 58 * scale,
              },
            ]}
          >
            {hebrewText}
          </Text>
          <View style={styles.readerProgressFooter}>
            <Text style={[styles.readerProgressCount, { fontSize: 16 * scale }]}>
              1 / {Math.max(visibleSections.length, 1)}
            </Text>
            <Text style={[styles.readerProgressTitle, { fontSize: 16 * scale }]}>
              Intro
            </Text>
            <Text style={[styles.readerProgressArrow, { fontSize: 28 * scale }]}>
              →
            </Text>
          </View>
          <View style={styles.readerProgressTrack}>
            <View style={[styles.readerProgressFill, { width: progressWidth }]} />
          </View>
        </View>

        <View
          style={[
            styles.translationCard,
            { borderRadius: 18 * scale, padding: 20 * scale },
          ]}
        >
          <Text
            style={[
              styles.translationText,
              { fontSize: 18 * scale, lineHeight: 28 * scale },
            ]}
          >
            Baruch Atah Adonai, our God, King of the universe, who sustains the
            world with goodness, with kindness, with compassion. He provides
            food for all the world with His great goodness, always and forever.
          </Text>
          <Text style={[styles.translationIcon, { fontSize: 36 * scale }]}>▤</Text>
        </View>

        <View style={[styles.readerToolBar, { borderRadius: 18 * scale }]}>
          {[
            ['Aא', 'Text Size'],
            ['☼', 'Light Mode'],
            ['אבג', 'Transliteration'],
            ['▤', 'English'],
            ['♡', 'Bookmark'],
          ].map(([icon, label], index) => (
            <Pressable
              accessibilityRole="button"
              key={label}
              style={({ pressed }) => [
                styles.readerTool,
                pressed && styles.softPressed,
              ]}
            >
              <Text
                style={[
                  styles.readerToolIcon,
                  index === 0 && styles.readerToolIconActive,
                  { fontSize: 26 * scale },
                ]}
              >
                {icon}
              </Text>
              <Text style={[styles.readerToolText, { fontSize: 12 * scale }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReaderPill({
  icon,
  label,
  value,
  scale,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  scale: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.readerPill,
        {
          borderRadius: 18 * scale,
          minHeight: 56 * scale,
          paddingHorizontal: 16 * scale,
        },
        pressed && styles.softPressed,
      ]}
    >
      <Text style={[styles.readerPillIcon, { fontSize: 30 * scale }]}>{icon}</Text>
      <View style={styles.readerPillCopy}>
        <Text style={[styles.readerPillLabel, { fontSize: 13 * scale }]}>
          {label}
        </Text>
        <Text style={[styles.readerPillValue, { fontSize: 17 * scale }]}>
          {value}
        </Text>
      </View>
      <Text style={[styles.readerPillChevron, { fontSize: 24 * scale }]}>⌄</Text>
    </Pressable>
  );
}

function ControlGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.controlGroup}>
      <Text style={styles.controlTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map(option => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              isSelected && styles.segmentSelected,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected && styles.segmentTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PrayerSectionView({
  section,
  preferences,
  fontSize,
  textAlign,
  writingDirection,
}: {
  section: PrayerSection;
  preferences: Preferences;
  fontSize: number;
  textAlign: 'left' | 'right';
  writingDirection: 'ltr' | 'rtl';
}) {
  const lines = getSectionLines(section, preferences);

  if (lines.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.prayerSection,
        section.type === 'conditional' && styles.additionSection,
      ]}
    >
      <Text style={[styles.sectionTitle, { textAlign, writingDirection }]}>
        {section.title}
      </Text>
      {lines.map(line => (
        <Text
          key={line.id}
          style={[
            styles.prayerText,
            line.role && styles.roleText,
            { fontSize, lineHeight: Math.round(fontSize * 1.72), textAlign },
            { writingDirection },
          ]}
        >
          {line.role ? `${getRoleLabel(line.role)}: ` : ''}
          {line.text}
        </Text>
      ))}
    </View>
  );
}

function getSectionLines(section: PrayerSection, preferences: Preferences) {
  const lines: Array<{ id: string; text: string; role?: 'leader' | 'group' }> =
    [];

  if (section.intro) {
    lines.push({ id: `${section.id}-intro`, text: section.intro });
  }

  if (section.text) {
    lines.push({ id: `${section.id}-text`, text: section.text });
  }

  section.content?.forEach((line, index) => {
    lines.push({
      id: `${section.id}-content-${index}`,
      text: line.text,
      role: line.role,
    });
  });

  const variant = section.variants?.[preferences.occasion];
  if (variant) {
    lines.push({
      id: `${section.id}-${preferences.occasion}`,
      text: `${variant.title}: ${variant.text}`,
    });
  }

  if (
    section.type === 'mapping' &&
    section.items &&
    !Array.isArray(section.items)
  ) {
    const label = section.items[preferences.occasion];
    if (label) {
      lines.push({ id: `${section.id}-mapping`, text: label });
    }
  }

  if (section.type === 'dynamic' && Array.isArray(section.items)) {
    section.items
      .filter(item => shouldShow(item.show_if, preferences))
      .forEach(item => {
        lines.push({ id: item.id, text: item.text });
      });
  }

  return lines;
}

function shouldShow(showIf: ShowIf | undefined, preferences: Preferences) {
  if (!showIf) {
    return true;
  }

  if (
    showIf.participants_min &&
    Number(preferences.participants) < showIf.participants_min
  ) {
    return false;
  }

  if (showIf.occasion && !showIf.occasion.includes(preferences.occasion)) {
    return false;
  }

  if (
    typeof showIf.hosted_meal === 'boolean' &&
    showIf.hosted_meal !== preferences.hostedMeal
  ) {
    return false;
  }

  return true;
}

function getRoleLabel(role: 'leader' | 'group') {
  return role === 'leader' ? 'מזמן' : 'המסובים';
}

function getSelectedLabel<T extends string>(
  options: Array<{ value: T; label: string }>,
  value: T,
) {
  return options.find(option => option.value === value)?.label ?? value;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6f1e7',
  },
  splash: {
    alignItems: 'center',
    backgroundColor: '#fffaf2',
    flex: 1,
    overflow: 'hidden',
  },
  splashContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 170,
  },
  splashLogo: {
    aspectRatio: 1024 / 843,
    maxWidth: '92%',
  },
  splashWave: {
    alignItems: 'center',
    backgroundColor: '#142c49',
    bottom: 0,
    height: '31%',
    justifyContent: 'center',
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
  },
  splashWaveCutout: {
    backgroundColor: '#fffaf2',
    borderBottomLeftRadius: 420,
    borderBottomRightRadius: 420,
    height: 170,
    left: -64,
    position: 'absolute',
    right: -64,
    top: -136,
    transform: [{ rotate: '7deg' }],
  },
  splashGoldCurve: {
    borderColor: '#d7a74f',
    borderRadius: 420,
    borderTopWidth: 1,
    height: 148,
    left: -52,
    position: 'absolute',
    right: -52,
    top: -32,
    transform: [{ rotate: '7deg' }],
  },
  splashLoading: {
    alignItems: 'center',
    gap: 18,
    marginTop: 42,
  },
  splashLoadingText: {
    color: '#fffaf2',
    fontSize: 21,
    fontWeight: '500',
    letterSpacing: 1,
  },
  homeScreen: {
    backgroundColor: '#fffaf2',
    flex: 1,
  },
  homeScroll: {
    flex: 1,
  },
  homeContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  homeTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  homeLogo: {
    aspectRatio: 1326 / 529,
    height: 150,
    marginLeft: -16,
    maxWidth: '82%',
  },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: '#fffdf8',
    borderColor: '#eadfce',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    shadowColor: '#122845',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    width: 56,
  },
  settingsIcon: {
    color: '#102846',
    fontSize: 28,
    fontWeight: '700',
  },
  homeCard: {
    backgroundColor: '#fffdf8',
    borderColor: '#eadfce',
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#122845',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  homeCardTitle: {
    color: '#102846',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
  },
  homeCardSubtitle: {
    color: '#6d7480',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  nusachGrid: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 28,
  },
  nusachCard: {
    alignItems: 'center',
    backgroundColor: '#fffdf8',
    borderColor: '#e9e1d6',
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minHeight: 210,
    justifyContent: 'center',
    padding: 16,
    shadowColor: '#122845',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  nusachCardSelected: {
    backgroundColor: '#fff8ea',
    borderColor: '#d5a044',
  },
  checkBadge: {
    alignItems: 'center',
    backgroundColor: '#d6a247',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    top: 18,
    width: 40,
  },
  checkText: {
    color: '#fffdf8',
    fontSize: 26,
    fontWeight: '800',
    marginTop: -2,
  },
  nusachIconCircle: {
    alignItems: 'center',
    backgroundColor: '#f2eee7',
    borderRadius: 56,
    height: 112,
    justifyContent: 'center',
    marginBottom: 18,
    width: 112,
  },
  nusachIconSelected: {
    backgroundColor: '#f8e7c9',
  },
  nusachIcon: {
    color: '#102846',
    fontSize: 44,
    fontWeight: '800',
  },
  nusachIconActive: {
    color: '#d6a247',
  },
  nusachLabel: {
    color: '#102846',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  nusachUnderline: {
    backgroundColor: '#d7d2ca',
    borderRadius: 2,
    height: 4,
    marginTop: 18,
    width: 52,
  },
  nusachUnderlineActive: {
    backgroundColor: '#d6a247',
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: '#102846',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'center',
    marginTop: 30,
    minHeight: 86,
    paddingHorizontal: 24,
    shadowColor: '#102846',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  startButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  startIcon: {
    color: '#f0be64',
    fontSize: 34,
  },
  startText: {
    color: '#fffdf8',
    flex: 1,
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
  },
  startArrow: {
    color: '#fffdf8',
    fontSize: 44,
    fontWeight: '300',
    marginTop: -4,
  },
  savedHint: {
    color: '#6d7480',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 18,
    textAlign: 'center',
  },
  quickTitle: {
    color: '#102846',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 34,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 18,
  },
  quickTile: {
    alignItems: 'center',
    backgroundColor: '#fffdf8',
    borderColor: '#eadfce',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 150,
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#122845',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  quickIconCircle: {
    alignItems: 'center',
    backgroundColor: '#f2eee7',
    borderRadius: 42,
    height: 76,
    justifyContent: 'center',
    marginBottom: 14,
    width: 76,
  },
  quickIcon: {
    color: '#102846',
    fontSize: 34,
    fontWeight: '800',
  },
  quickText: {
    color: '#102846',
    fontSize: 14,
    fontWeight: '800',
    minHeight: 36,
    textAlign: 'center',
  },
  quickUnderline: {
    backgroundColor: '#d6a247',
    borderRadius: 2,
    height: 3,
    marginTop: 8,
    width: 40,
  },
  greetingCard: {
    alignItems: 'center',
    backgroundColor: '#102846',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 22,
    marginHorizontal: 4,
    marginTop: 28,
    minHeight: 120,
    padding: 22,
    shadowColor: '#102846',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  greetingIconCircle: {
    alignItems: 'center',
    backgroundColor: '#223b5d',
    borderRadius: 42,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  greetingIcon: {
    color: '#f0be64',
    fontSize: 38,
  },
  greetingCopy: {
    flex: 1,
  },
  greetingTitle: {
    color: '#fffdf8',
    fontSize: 26,
    fontWeight: '800',
  },
  greetingText: {
    color: '#fffdf8',
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 24,
    marginTop: 8,
  },
  bottomNav: {
    alignItems: 'center',
    backgroundColor: '#fffdf8',
    borderColor: '#eadfce',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    height: 94,
    justifyContent: 'space-around',
    left: 24,
    position: 'absolute',
    right: 24,
    shadowColor: '#122845',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  navIcon: {
    color: '#8c9198',
    fontSize: 30,
    fontWeight: '700',
  },
  navIconActive: {
    color: '#d09a37',
  },
  navText: {
    color: '#767d85',
    fontSize: 14,
    fontWeight: '700',
  },
  navTextActive: {
    color: '#d09a37',
  },
  softPressed: {
    opacity: 0.75,
  },
  layout: {
    flex: 1,
  },
  layoutWide: {
    flexDirection: 'row',
  },
  controls: {
    backgroundColor: '#fffaf0',
    borderBottomColor: '#e0d4bd',
    borderBottomWidth: StyleSheet.hairlineWidth,
    padding: 16,
    rowGap: 14,
  },
  controlsWide: {
    borderBottomWidth: 0,
    borderRightColor: '#e0d4bd',
    borderRightWidth: StyleSheet.hairlineWidth,
    maxWidth: 360,
    padding: 22,
    width: '34%',
  },
  headerLogo: {
    alignSelf: 'flex-start',
    aspectRatio: 1326 / 529,
    height: 54,
    marginBottom: 4,
    maxWidth: '72%',
  },
  controlGroup: {
    rowGap: 8,
  },
  controlTitle: {
    color: '#463a29',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    alignItems: 'center',
    backgroundColor: '#efe5d1',
    borderRadius: 8,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  segmentSelected: {
    backgroundColor: '#183d36',
  },
  segmentPressed: {
    opacity: 0.78,
  },
  segmentText: {
    color: '#4e402c',
    fontSize: 14,
    fontWeight: '700',
  },
  segmentTextSelected: {
    color: '#fffaf0',
  },
  reader: {
    flex: 1,
  },
  readerContent: {
    padding: 20,
    paddingBottom: 48,
  },
  readerKicker: {
    color: '#80683f',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  readerTitle: {
    color: '#183d36',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 22,
  },
  prayerSection: {
    borderTopColor: '#ddcfb8',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 22,
  },
  additionSection: {
    backgroundColor: '#fff6df',
    borderRadius: 8,
    borderTopWidth: 0,
    marginBottom: 14,
    marginTop: 4,
    padding: 18,
  },
  sectionTitle: {
    color: '#615038',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  prayerText: {
    color: '#231f1a',
    fontWeight: '500',
  },
  roleText: {
    marginBottom: 8,
  },
});

export default App;

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
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
  variants?: Partial<Record<Occasion, {title: string; text: string}>>;
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

const DEFAULT_PREFERENCES: Preferences = {
  language: 'hebrew',
  nusach: 'Ashkenazi',
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

const LANGUAGES: Array<{value: Language; label: string}> = [
  {value: 'hebrew', label: 'Hebrew'},
];

const NUSACHIM: Array<{value: Nusach; label: string}> = [
  {value: 'Ashkenazi', label: 'Ashkenazi'},
  {value: 'Sephardi', label: 'Sephardi'},
];

const OCCASIONS: Array<{value: Occasion; label: string}> = [
  {value: 'weekday', label: 'Weekday'},
  {value: 'shabbat', label: 'Shabbat'},
  {value: 'yom_tov', label: 'Yom Tov'},
  {value: 'rosh_chodesh', label: 'Rosh Chodesh'},
  {value: 'chanukah', label: 'Chanukah'},
  {value: 'purim', label: 'Purim'},
  {value: 'chol_hamoed_pesach', label: 'Chol Hamoed Pesach'},
  {value: 'chol_hamoed_sukkot', label: 'Chol Hamoed Sukkot'},
  {value: 'pesach', label: 'Pesach'},
  {value: 'sukkot', label: 'Sukkot'},
  {value: 'shemini_atzeret', label: 'Shemini Atzeret'},
  {value: 'shavuot', label: 'Shavuot'},
  {value: 'rosh_hashanah', label: 'Rosh Hashanah'},
  {value: 'bris', label: 'Bris'},
  {value: 'sheva_berachot', label: 'Sheva Berachot'},
];

const PARTICIPANT_OPTIONS: Array<{value: Participants; label: string}> = [
  {value: '1', label: '1-2'},
  {value: '3', label: '3+'},
  {value: '10', label: '10+'},
];

const typedPrayerData = prayerData as {
  versions: PrayerVersion[];
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <BentchApp />
    </SafeAreaProvider>
  );
}

function BentchApp() {
  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);
  const [isReady, setIsReady] = useState(false);

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

  return (
    <ReaderScreen preferences={preferences} setPreferences={setPreferences} />
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

  return (
    <View style={[styles.splash, {paddingTop: insets.top + 24}]}>
      <View style={styles.splashMark}>
        <Text style={styles.splashHebrew}>ברכת המזון</Text>
        <Text style={styles.splashTitle}>Bentch</Text>
      </View>
      <ActivityIndicator color="#f8f0df" size="large" />
    </View>
  );
}

function ReaderScreen({
  preferences,
  setPreferences,
}: {
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
}) {
  const {width} = useWindowDimensions();
  const isWide = width >= 720;
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
  const textAlign = 'right';
  const writingDirection = 'rtl';
  const fontSize = FONT_SIZES[preferences.fontScale];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.layout, isWide && styles.layoutWide]}>
        <View style={[styles.controls, isWide && styles.controlsWide]}>
          <Text style={styles.appTitle}>Bentch</Text>
          <Text style={styles.appSubtitle}>Birkat Hamazon</Text>

          <ControlGroup title="Language">
            <SegmentedControl
              options={LANGUAGES}
              value={preferences.language}
              onChange={language =>
                setPreferences(current => ({...current, language}))
              }
            />
          </ControlGroup>

          <ControlGroup title="Nusach">
            <SegmentedControl
              options={NUSACHIM}
              value={preferences.nusach}
              onChange={nusach =>
                setPreferences(current => ({...current, nusach}))
              }
            />
          </ControlGroup>

          <ControlGroup title="Occasion">
            <SegmentedControl
              options={OCCASIONS.filter(option =>
                selectedVersion.supported_occasions.includes(option.value),
              )}
              value={preferences.occasion}
              onChange={occasion =>
                setPreferences(current => ({...current, occasion}))
              }
            />
          </ControlGroup>

          <ControlGroup title="Text Size">
            <SegmentedControl
              options={Object.keys(FONT_LABELS).map(value => ({
                value: value as FontScale,
                label: FONT_LABELS[value as FontScale],
              }))}
              value={preferences.fontScale}
              onChange={fontScale =>
                setPreferences(current => ({...current, fontScale}))
              }
            />
          </ControlGroup>

          <ControlGroup title="Participants">
            <SegmentedControl
              options={PARTICIPANT_OPTIONS}
              value={preferences.participants}
              onChange={participants =>
                setPreferences(current => ({...current, participants}))
              }
            />
          </ControlGroup>

          <ControlGroup title="Hosted Meal">
            <SegmentedControl
              options={[
                {value: 'false', label: 'No'},
                {value: 'true', label: 'Yes'},
              ]}
              value={String(preferences.hostedMeal)}
              onChange={hostedMeal =>
                setPreferences(current => ({
                  ...current,
                  hostedMeal: hostedMeal === 'true',
                }))
              }
            />
          </ControlGroup>
        </View>

        <ScrollView
          style={styles.reader}
          contentContainerStyle={styles.readerContent}
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.readerKicker, {textAlign}]}>
            {selectedVersion.nusach} ·{' '}
            {getSelectedLabel(OCCASIONS, preferences.occasion)}
          </Text>
          <Text style={[styles.readerTitle, {textAlign, writingDirection}]}>
            ברכת המזון
          </Text>

          {visibleSections.map(section => (
            <PrayerSectionView
              key={section.id}
              section={section}
              preferences={preferences}
              fontSize={fontSize}
              textAlign={textAlign}
              writingDirection={writingDirection}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
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
  options: Array<{value: T; label: string}>;
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
            style={({pressed}) => [
              styles.segment,
              isSelected && styles.segmentSelected,
              pressed && styles.segmentPressed,
            ]}>
            <Text
              style={[
                styles.segmentText,
                isSelected && styles.segmentTextSelected,
              ]}>
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
      ]}>
      <Text style={[styles.sectionTitle, {textAlign, writingDirection}]}>
        {section.title}
      </Text>
      {lines.map(line => (
        <Text
          key={line.id}
          style={[
            styles.prayerText,
            line.role && styles.roleText,
            {fontSize, lineHeight: Math.round(fontSize * 1.72), textAlign},
            {writingDirection},
          ]}>
          {line.role ? `${getRoleLabel(line.role)}: ` : ''}
          {line.text}
        </Text>
      ))}
    </View>
  );
}

function getSectionLines(section: PrayerSection, preferences: Preferences) {
  const lines: Array<{id: string; text: string; role?: 'leader' | 'group'}> =
    [];

  if (section.intro) {
    lines.push({id: `${section.id}-intro`, text: section.intro});
  }

  if (section.text) {
    lines.push({id: `${section.id}-text`, text: section.text});
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

  if (section.type === 'mapping' && section.items && !Array.isArray(section.items)) {
    const label = section.items[preferences.occasion];
    if (label) {
      lines.push({id: `${section.id}-mapping`, text: label});
    }
  }

  if (section.type === 'dynamic' && Array.isArray(section.items)) {
    section.items
      .filter(item => shouldShow(item.show_if, preferences))
      .forEach(item => {
        lines.push({id: item.id, text: item.text});
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
  options: Array<{value: T; label: string}>,
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
    backgroundColor: '#183d36',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  splashMark: {
    alignItems: 'center',
    marginBottom: 48,
  },
  splashHebrew: {
    color: '#f8f0df',
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  splashTitle: {
    color: '#d9b66d',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
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
  appTitle: {
    color: '#183d36',
    fontSize: 30,
    fontWeight: '800',
  },
  appSubtitle: {
    color: '#735f3d',
    fontSize: 14,
    fontWeight: '600',
    marginTop: -8,
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

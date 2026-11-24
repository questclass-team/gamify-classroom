/**
 * The landing's copy and its worked example. Facts follow what QuestClass does today (points with
 * a reason, ranks by threshold, badges, rankings by nickname, reward history, groups, LDAP login,
 * CSV import); the student, the nicknames and the amounts are an illustration, not real data.
 */

export const PRODUCT = {
  name: 'QuestClass',
  faculty: 'Wydział Matematyki i Informatyki UAM',
  pitch:
    'Prowadzący przyznaje punkty i odznaki w kilka kliknięć. Student widzi swoje postępy, rangę i miejsce w rankingu pod własnym nickiem.',
  semester: 'Semestr zimowy 2026/27',
} as const

/** The example's currency: every group names its own, "Punkty" by default. */
export const UNIT = 'pkt'

/** The core loop, in order. It is a real sequence, so numbering it carries information. */
export const LOOP = [
  {
    id: 'zajecia',
    title: 'Zajęcia',
    text: 'Prowadzący przyznaje punkty za aktywność, zadania i projekty, jednej osobie albo kilku naraz.',
  },
  {
    id: 'punkty',
    title: 'Punkty',
    text: 'Nagroda trafia na konto od razu, z wpisem w historii: kto, kiedy, ile i za co.',
  },
  {
    id: 'ranga',
    title: 'Ranga',
    text: 'Progi rang ustala prowadzący. Ranga rośnie sama, gdy punktów przybywa.',
  },
  {
    id: 'ranking',
    title: 'Ranking',
    text: 'Ranking grupy układa miejsca według punktów albo odznak i pokazuje tylko nicki.',
  },
] as const

export interface Activity {
  id: string
  label: string
  points: number
}

/** Rewards a teacher might give; the teacher types the points and the reason each time. */
export const ACTIVITIES: readonly Activity[] = [
  { id: 'aktywnosc', label: 'Aktywność na zajęciach', points: 10 },
  { id: 'tablica', label: 'Zadanie przy tablicy', points: 25 },
  { id: 'projekt', label: 'Bonus za projekt', points: 50 },
  { id: 'termin', label: 'Laboratorium przed terminem', points: 80 },
]

export interface LandingRank {
  name: string
  threshold: number
  /** What reaching it means in the example group. */
  text: string
}

/** The example group's ladder; every group sets its own names and thresholds. */
export const RANKS: readonly LandingRank[] = [
  { name: 'Iskra', threshold: 0, text: 'Pierwsza ranga grupy. Każdy zaczyna tutaj.' },
  { name: 'Kometa', threshold: 100, text: 'Pierwsza setka za aktywność i zadania.' },
  { name: 'Gwiazda', threshold: 300, text: 'Regularna praca przez pół semestru.' },
  { name: 'Supernowa', threshold: 600, text: 'Najwyższa ranga tej grupy.' },
]

/** Index of the rank reached with `points` (the highest threshold at or below them). */
export function rankIndex(points: number) {
  return RANKS.findLastIndex((rank) => rank.threshold <= points)
}

export const STUDENT = {
  nick: 'Cicha_Sowa',
  points: 285,
} as const

/** The lab the Ranga chapter adds, crossing into the next rank. */
export const LAB = { name: 'Laboratorium 7', points: 40 } as const

export interface Hero {
  nick: string
  points: number
  badges: number
  /** True for the example student. */
  me?: boolean
}

export const LEADERBOARD: readonly Hero[] = [
  { nick: 'Nocny_Kruk', points: 412, badges: 3 },
  { nick: 'Cicha_Sowa', points: 285, badges: 4, me: true },
  { nick: 'Lambda_Lis', points: 241, badges: 2 },
  { nick: 'BugHunter', points: 198, badges: 5 },
  { nick: 'Smoczy_Kod', points: 176, badges: 1 },
]

export const PRIVACY = {
  title: 'W rankingu tylko nicki',
  text: 'Student wybiera nick i pod nim występuje w rankingu. Imię i nazwisko widzi wyłącznie prowadzący jego grupy.',
}

export const ROLES = [
  {
    id: 'student',
    name: 'Student',
    text: 'Zbiera punkty i odznaki, awansuje w rangach i widzi swoje miejsce w rankingu, pod własnym nickiem.',
    abilities: [
      'Stan w każdej grupie: punkty, ranga, odznaki',
      'Ranking grupy bez imion i nazwisk',
      'Historia nagród: kto, kiedy, ile i za co',
    ],
  },
  {
    id: 'prowadzacy',
    name: 'Prowadzący',
    text: 'Tworzy grupy i ustala w nich zasady gry, potem przyznaje nagrody po zajęciach.',
    abilities: [
      'Własna waluta i progi rang w każdej grupie',
      'Punkty dla wielu studentów naraz',
      'Odznaki: tworzenie, przyznawanie, cofanie',
    ],
  },
  {
    id: 'administrator',
    name: 'Administrator',
    text: 'Pilnuje dostępu: logowanie kontem wydziałowym, import kont z pliku CSV i żadnych lokalnych haseł.',
    abilities: [
      'Logowanie przez LDAP (domena LABS)',
      'Import kont studentów i prowadzących',
      'Raport z pominiętych wierszy importu',
    ],
  },
] as const

export const FAQ = [
  {
    q: 'Czy moje nazwisko pojawi się w rankingu?',
    a: 'Nie. Ranking pokazuje tylko nick. Imię i nazwisko widzi wyłącznie prowadzący Twojej grupy.',
  },
  {
    q: 'Jak się zalogować?',
    a: 'Kontem wydziałowym w domenie LABS, tym samym co w pracowniach. QuestClass nie przechowuje haseł.',
  },
  {
    q: 'Hasło jest dobre, a logowanie nie działa. Co dalej?',
    a: 'Konto musi najpierw zaimportować administrator. Jeśli zobaczysz komunikat, że konta nie ma w systemie, napisz do administratora.',
  },
  {
    q: 'Kto ustala zasady?',
    a: 'Prowadzący, osobno dla każdej grupy: nazwę i ikonę waluty, progi rang i odznaki.',
  },
  {
    q: 'Czy mogę być w kilku grupach?',
    a: 'Tak. Każda grupa ma własne punkty, rangi, odznaki i ranking.',
  },
] as const

export const TEAM = {
  credit: 'Projekt zespołowy, Inżynieria oprogramowania, WMiI UAM',
  members: ['Kyslytsia', 'Kavaliou', 'Isianov', 'Muczyński', 'Codogni'],
  supervisor: 'W. Wawrzyniak',
}

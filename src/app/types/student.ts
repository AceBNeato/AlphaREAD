export interface StudentProfile {
  id: string;
  name: string;
  avatar: string;
  accent: AccentType;
  phoneticBias: number; // 0.0-1.0, higher = more forgiving
  mlConfidenceThreshold: number; // 0.0-1.0
  useMLValidator: boolean;
  createdAt: string;
  stats: StudentStats;
}

export interface StudentStats {
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  lastLevel: number;
  weakSounds: string[];
  strongSounds: string[];
  sessionHistory: SessionRecord[];
}

export interface SessionRecord {
  date: string;
  level: number;
  score: number;
  duration: number; // seconds
}

export type AccentType = 
  | 'en-US'   // American
  | 'en-GB'   // British
  | 'en-AU'   // Australian
  | 'en-IN'   // Indian
  | 'en-NG'   // Nigerian
  | 'fil-PH'  // Filipino
  | 'en-CA'   // Canadian
  | 'en-NZ';  // New Zealand

export const ACCENT_OPTIONS: { value: AccentType; label: string; flag: string }[] = [
  { value: 'en-US', label: 'American English', flag: '🇺🇸' },
  { value: 'en-GB', label: 'British English', flag: '🇬🇧' },
  { value: 'en-AU', label: 'Australian English', flag: '🇦🇺' },
  { value: 'en-IN', label: 'Indian English', flag: '🇮🇳' },
  { value: 'en-NG', label: 'Nigerian English', flag: '🇳🇬' },
  { value: 'fil-PH', label: 'Filipino English', flag: '🇵🇭' },
  { value: 'en-CA', label: 'Canadian English', flag: '🇨🇦' },
  { value: 'en-NZ', label: 'New Zealand English', flag: '🇳🇿' },
];

export const AVATAR_OPTIONS = ['🧒', '👧', '👦', '👩', '👨', '🧑', '🧕', '👳', '👲', '🧓'];

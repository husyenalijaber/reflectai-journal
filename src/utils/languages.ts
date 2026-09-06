export interface LanguageOption {
  code: string;
  displayCode: string;
  name: string;
  nativeName: string;
}

export const APAC_LANGUAGES: LanguageOption[] = [
  { code: 'en', displayCode: 'EN', name: 'English', nativeName: 'English' },
  { code: 'id', displayCode: 'ID', name: 'Bahasa Indonesia', nativeName: 'Indonesia' },
  { code: 'ms', displayCode: 'MS', name: 'Bahasa Melayu', nativeName: 'Melayu' },
  { code: 'ja', displayCode: 'JA', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', displayCode: 'KO', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', displayCode: 'ZH', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'vi', displayCode: 'VI', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', displayCode: 'TH', name: 'Thai', nativeName: 'ไทย' },
  { code: 'fil', displayCode: 'FIL', name: 'Filipino / Tagalog', nativeName: 'Tagalog' },
  { code: 'hi', displayCode: 'HI', name: 'Hindi', nativeName: 'हिन्दी' },
];


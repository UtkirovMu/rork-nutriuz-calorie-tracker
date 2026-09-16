export interface CountryCode {
  name: string;
  dial: string;
  code: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { name: "O'zbekiston", dial: '+998', code: 'UZ', flag: '\u{1F1FA}\u{1F1FF}' },
  { name: 'Rossiya', dial: '+7', code: 'RU', flag: '\u{1F1F7}\u{1F1FA}' },
  { name: 'Qozog\'iston', dial: '+7', code: 'KZ', flag: '\u{1F1F0}\u{1F1FF}' },
  { name: 'Tojikiston', dial: '+992', code: 'TJ', flag: '\u{1F1F9}\u{1F1EF}' },
  { name: 'Qirg\'iziston', dial: '+996', code: 'KG', flag: '\u{1F1F0}\u{1F1EC}' },
  { name: 'Turkmaniston', dial: '+993', code: 'TM', flag: '\u{1F1F9}\u{1F1F2}' },
  { name: 'Turkiya', dial: '+90', code: 'TR', flag: '\u{1F1F9}\u{1F1F7}' },
  { name: 'AQSH', dial: '+1', code: 'US', flag: '\u{1F1FA}\u{1F1F8}' },
  { name: 'Buyuk Britaniya', dial: '+44', code: 'GB', flag: '\u{1F1EC}\u{1F1E7}' },
  { name: 'Germaniya', dial: '+49', code: 'DE', flag: '\u{1F1E9}\u{1F1EA}' },
  { name: 'Fransiya', dial: '+33', code: 'FR', flag: '\u{1F1EB}\u{1F1F7}' },
  { name: 'Italiya', dial: '+39', code: 'IT', flag: '\u{1F1EE}\u{1F1F9}' },
  { name: 'Ispaniya', dial: '+34', code: 'ES', flag: '\u{1F1EA}\u{1F1F8}' },
  { name: 'Janubiy Koreya', dial: '+82', code: 'KR', flag: '\u{1F1F0}\u{1F1F7}' },
  { name: 'Xitoy', dial: '+86', code: 'CN', flag: '\u{1F1E8}\u{1F1F3}' },
  { name: 'Yaponiya', dial: '+81', code: 'JP', flag: '\u{1F1EF}\u{1F1F5}' },
  { name: 'Hindiston', dial: '+91', code: 'IN', flag: '\u{1F1EE}\u{1F1F3}' },
  { name: 'Braziliya', dial: '+55', code: 'BR', flag: '\u{1F1E7}\u{1F1F7}' },
  { name: 'Pokiston', dial: '+92', code: 'PK', flag: '\u{1F1F5}\u{1F1F0}' },
  { name: 'Misr', dial: '+20', code: 'EG', flag: '\u{1F1EA}\u{1F1EC}' },
  { name: 'Saudiya Arabistoni', dial: '+966', code: 'SA', flag: '\u{1F1F8}\u{1F1E6}' },
  { name: 'BAA', dial: '+971', code: 'AE', flag: '\u{1F1E6}\u{1F1EA}' },
  { name: 'Ukraina', dial: '+380', code: 'UA', flag: '\u{1F1FA}\u{1F1E6}' },
  { name: 'Belarus', dial: '+375', code: 'BY', flag: '\u{1F1E7}\u{1F1FE}' },
  { name: 'Gruziya', dial: '+995', code: 'GE', flag: '\u{1F1EC}\u{1F1EA}' },
  { name: 'Ozarbayjon', dial: '+994', code: 'AZ', flag: '\u{1F1E6}\u{1F1FF}' },
  { name: 'Armeniya', dial: '+374', code: 'AM', flag: '\u{1F1E6}\u{1F1F2}' },
  { name: 'Moldava', dial: '+373', code: 'MD', flag: '\u{1F1F2}\u{1F1E9}' },
  { name: 'Polsha', dial: '+48', code: 'PL', flag: '\u{1F1F5}\u{1F1F1}' },
  { name: 'Chexiya', dial: '+420', code: 'CZ', flag: '\u{1F1E8}\u{1F1FF}' },
  { name: 'Kanada', dial: '+1', code: 'CA', flag: '\u{1F1E8}\u{1F1E6}' },
  { name: 'Avstraliya', dial: '+61', code: 'AU', flag: '\u{1F1E6}\u{1F1FA}' },
  { name: 'Indoneziya', dial: '+62', code: 'ID', flag: '\u{1F1EE}\u{1F1E9}' },
  { name: 'Malayziya', dial: '+60', code: 'MY', flag: '\u{1F1F2}\u{1F1FE}' },
  { name: 'Tailand', dial: '+66', code: 'TH', flag: '\u{1F1F9}\u{1F1ED}' },
  { name: 'Vetnam', dial: '+84', code: 'VN', flag: '\u{1F1FB}\u{1F1F3}' },
  { name: 'Filippin', dial: '+63', code: 'PH', flag: '\u{1F1F5}\u{1F1ED}' },
  { name: 'Meksika', dial: '+52', code: 'MX', flag: '\u{1F1F2}\u{1F1FD}' },
  { name: 'Argentina', dial: '+54', code: 'AR', flag: '\u{1F1E6}\u{1F1F7}' },
  { name: 'Nigeriya', dial: '+234', code: 'NG', flag: '\u{1F1F3}\u{1F1EC}' },
];

export const DEFAULT_COUNTRY = COUNTRY_CODES[0];

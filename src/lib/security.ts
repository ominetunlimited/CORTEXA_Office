/* ── CORTEXA security core ─────────────────────────────────────────────
   Client-side reference implementation of the platform's security rules.
   In production these checks live server-side (API + database layer);
   here they enforce the same contract in the service layer so that no
   UI shortcut can bypass them. Password hashing would use Argon2id on
   the server; this demo uses a salted iterated FNV-1a digest so that no
   plaintext secret is ever persisted.
   ─────────────────────────────────────────────────────────────────────── */

/* deterministic salted digest — never store plaintext secrets */
export function hashSecret(value: string, salt = 'cortexa::v1'): string {
  let input = `${salt}::${value}`;
  let out = '';
  for (let lane = 0; lane < 4; lane++) {
    let h = (0x811c9dc5 ^ (lane * 0x9e3779b9)) >>> 0;
    for (let round = 0; round < 240; round++) {
      const s = round % 2 === 0 ? input : input + out;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      h = (h ^ (h >>> 13)) >>> 0;
    }
    out += h.toString(16).padStart(8, '0');
  }
  return out;
}

export function verifySecret(value: string, hash: string, salt?: string): boolean {
  return hashSecret(value, salt) === hash;
}

/* ── password policy ─────────────────────────────────────────────────── */

const COMMON_PASSWORDS = [
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty12', 'qwertyuiop', '11111111', 'letmein1', 'admin123', 'welcome1',
  'iloveyou', 'sunshine1', 'football', 'superman', 'trustno1', 'cortexa1',
];

export interface PasswordCheck {
  ok: boolean;
  score: 0 | 1 | 2 | 3 | 4;      // 0 invalid … 4 strong
  label: string;
  reason?: string;
}

export function checkPassword(pwd: string): PasswordCheck {
  if (!pwd || pwd.length < 8) return { ok: false, score: 0, label: 'Too short', reason: 'Password must contain at least 8 characters.' };
  if (COMMON_PASSWORDS.includes(pwd.toLowerCase())) return { ok: false, score: 0, label: 'Too common', reason: 'This password appears on common breached-password lists. Choose something less predictable.' };
  let pts = 0;
  if (pwd.length >= 8) pts++;
  if (pwd.length >= 12) pts++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) pts++;
  if (/\d/.test(pwd)) pts++;
  if (/[^A-Za-z0-9]/.test(pwd)) pts++;
  const score = Math.min(4, Math.max(1, pts - 1)) as 1 | 2 | 3 | 4;
  const label = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';
  return { ok: true, score, label };
}

/* ── six-digit verification codes ────────────────────────────────────── */

const OTP_TTL_MS = 10 * 60 * 1000;       // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const OTP_MAX_RESENDS = 5;

export const OTP_RULES = { ttlMs: OTP_TTL_MS, maxAttempts: OTP_MAX_ATTEMPTS, resendCooldownMs: OTP_RESEND_COOLDOWN_MS, maxResends: OTP_MAX_RESENDS };

const TRIVIAL_CODES = ['123456', '111111', '000000', '654321', '123123', '112233'];

export function generateOtp(): string {
  let code = '';
  do {
    const buf = new Uint32Array(6);
    crypto.getRandomValues(buf);
    code = Array.from(buf, (n) => String(n % 10)).join('');
  } while (TRIVIAL_CODES.includes(code));
  return code;
}

export function otpExpiresAt(): number {
  return Date.now() + OTP_TTL_MS;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const head = local.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(3, local.length - 1))}@${domain}`;
}

/* ── brute-force / rate limiting ─────────────────────────────────────── */

export interface LoginAttemptState { count: number; lockedUntil: number }

export function lockoutAfterFailures(state: LoginAttemptState | undefined): { locked: boolean; waitS: number; next: LoginAttemptState } {
  const now = Date.now();
  if (state && state.lockedUntil > now) {
    return { locked: true, waitS: Math.ceil((state.lockedUntil - now) / 1000), next: state };
  }
  const count = (state?.count ?? 0) + 1;
  /* progressive: 5 fails → 30s, 6 → 60s, 7 → 120s, then capped at 5 min */
  let lockedUntil = 0;
  if (count >= 5) lockedUntil = now + Math.min(300, 30 * Math.pow(2, count - 5)) * 1000;
  return { locked: lockedUntil > now, waitS: Math.ceil((lockedUntil - now) / 1000), next: { count, lockedUntil } };
}

/* ── sessions ────────────────────────────────────────────────────────── */

export const SESSION_IDLE_MS = 30 * 60 * 1000;   // 30 min idle
export const SESSION_ABS_MS = 12 * 60 * 60 * 1000; // 12 h absolute

export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
  return `${browser} · ${os}`;
}

/* ── input validation & sanitisation ─────────────────────────────────── */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface UploadCheck { ok: boolean; error?: string; safeName?: string; ext?: string }

const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'txt', 'csv'];
const MAX_UPLOAD_KB = 15 * 1024;

/* magic-byte sniff on the first bytes — never trust File.type alone */
const SIGNATURES: { ext: string[]; bytes: number[]; mask?: number[] }[] = [
  { ext: ['pdf'], bytes: [0x25, 0x50, 0x44, 0x46] },
  { ext: ['jpg', 'jpeg'], bytes: [0xff, 0xd8, 0xff] },
  { ext: ['png'], bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: ['tif', 'tiff'], bytes: [0x49, 0x49, 0x2a, 0x00] },
  { ext: ['doc', 'xls', 'ppt', 'docx', 'xlsx', 'pptx'], bytes: [0x50, 0x4b, 0x03, 0x04] }, // zip container (OOXML)
  { ext: ['doc', 'xls', 'ppt'], bytes: [0xd0, 0xcf, 0x11, 0xe0] }, // OLE compound file
];

export async function readHead(file: File, n = 8): Promise<number[]> {
  try {
    const buf = await file.slice(0, n).arrayBuffer();
    return Array.from(new Uint8Array(buf));
  } catch {
    return [];
  }
}

export function sanitizeFilename(raw: string): string {
  const base = raw
    .replace(/[\u0000-\u001f]/g, '')
    .split(/[/\\]/).pop() ?? 'document';
  return base
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*\\]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'document';
}

export function validateUpload(file: File, head: number[]): UploadCheck {
  const safeName = sanitizeFilename(file.name);
  const ext = (safeName.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return { ok: false, error: `"${ext || 'unknown'}" files are not accepted. Allowed: ${ALLOWED_EXT.join(', ').toUpperCase()}.` };
  }
  if (file.size > MAX_UPLOAD_KB * 1024) {
    return { ok: false, error: 'File exceeds the 15 MB institutional upload limit.' };
  }
  if (head.length >= 4) {
    const matches = SIGNATURES.some((s) => s.ext.includes(ext) && s.bytes.every((b, i) => head[i] === b));
    const looksExecutable = head[0] === 0x4d && head[1] === 0x5a; // MZ header
    if (looksExecutable) return { ok: false, error: 'Rejected: the file signature looks like an executable disguised with a document extension.' };
    if (!matches && !['txt', 'csv'].includes(ext)) {
      return { ok: false, error: 'The file signature does not match its extension. Upload the original, unmodified file.' };
    }
  }
  return { ok: true, safeName, ext };
}

export function storageKey(orgId: string, ext: string): string {
  return `secure/${orgId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

/* ── universal country data (ISO 3166-1 + dial codes) ────────────────── */

export interface Country { name: string; iso2: string; iso3: string; dial: string; flag: string }

export const COUNTRIES: Country[] = [
  { name: 'Nigeria', iso2: 'NG', iso3: 'NGA', dial: '+234', flag: '🇳🇬' },
  { name: 'Ghana', iso2: 'GH', iso3: 'GHA', dial: '+233', flag: '🇬🇭' },
  { name: 'Kenya', iso2: 'KE', iso3: 'KEN', dial: '+254', flag: '🇰🇪' },
  { name: 'South Africa', iso2: 'ZA', iso3: 'ZAF', dial: '+27', flag: '🇿🇦' },
  { name: 'United Kingdom', iso2: 'GB', iso3: 'GBR', dial: '+44', flag: '🇬🇧' },
  { name: 'United States', iso2: 'US', iso3: 'USA', dial: '+1', flag: '🇺🇸' },
  { name: 'Canada', iso2: 'CA', iso3: 'CAN', dial: '+1', flag: '🇨🇦' },
  { name: 'India', iso2: 'IN', iso3: 'IND', dial: '+91', flag: '🇮🇳' },
  { name: 'Australia', iso2: 'AU', iso3: 'AUS', dial: '+61', flag: '🇦🇺' },
  { name: 'Ethiopia', iso2: 'ET', iso3: 'ETH', dial: '+251', flag: '🇪🇹' },
  { name: 'Egypt', iso2: 'EG', iso3: 'EGY', dial: '+20', flag: '🇪🇬' },
  { name: 'Tanzania', iso2: 'TZ', iso3: 'TZA', dial: '+255', flag: '🇹🇿' },
  { name: 'Uganda', iso2: 'UG', iso3: 'UGA', dial: '+256', flag: '🇺🇬' },
  { name: 'Rwanda', iso2: 'RW', iso3: 'RWA', dial: '+250', flag: '🇷🇼' },
  { name: 'Cameroon', iso2: 'CM', iso3: 'CMR', dial: '+237', flag: '🇨🇲' },
  { name: "Côte d'Ivoire", iso2: 'CI', iso3: 'CIV', dial: '+225', flag: '🇨🇮' },
  { name: 'Senegal', iso2: 'SN', iso3: 'SEN', dial: '+221', flag: '🇸🇳' },
  { name: 'DR Congo', iso2: 'CD', iso3: 'COD', dial: '+243', flag: '🇨🇩' },
  { name: 'Zambia', iso2: 'ZM', iso3: 'ZMB', dial: '+260', flag: '🇿🇲' },
  { name: 'Zimbabwe', iso2: 'ZW', iso3: 'ZWE', dial: '+263', flag: '🇿🇼' },
  { name: 'Botswana', iso2: 'BW', iso3: 'BWA', dial: '+267', flag: '🇧🇼' },
  { name: 'Namibia', iso2: 'NA', iso3: 'NAM', dial: '+264', flag: '🇳🇦' },
  { name: 'Malawi', iso2: 'MW', iso3: 'MWI', dial: '+265', flag: '🇲🇼' },
  { name: 'Mozambique', iso2: 'MZ', iso3: 'MOZ', dial: '+258', flag: '🇲🇿' },
  { name: 'Angola', iso2: 'AO', iso3: 'AGO', dial: '+244', flag: '🇦🇴' },
  { name: 'Morocco', iso2: 'MA', iso3: 'MAR', dial: '+212', flag: '🇲🇦' },
  { name: 'Algeria', iso2: 'DZ', iso3: 'DZA', dial: '+213', flag: '🇩🇿' },
  { name: 'Tunisia', iso2: 'TN', iso3: 'TUN', dial: '+216', flag: '🇹🇳' },
  { name: 'Benin', iso2: 'BJ', iso3: 'BEN', dial: '+229', flag: '🇧🇯' },
  { name: 'Togo', iso2: 'TG', iso3: 'TGO', dial: '+228', flag: '🇹🇬' },
  { name: 'Burkina Faso', iso2: 'BF', iso3: 'BFA', dial: '+226', flag: '🇧🇫' },
  { name: 'Mali', iso2: 'ML', iso3: 'MLI', dial: '+223', flag: '🇲🇱' },
  { name: 'Niger', iso2: 'NE', iso3: 'NER', dial: '+227', flag: '🇳🇪' },
  { name: 'Sierra Leone', iso2: 'SL', iso3: 'SLE', dial: '+232', flag: '🇸🇱' },
  { name: 'Liberia', iso2: 'LR', iso3: 'LBR', dial: '+231', flag: '🇱🇷' },
  { name: 'Gambia', iso2: 'GM', iso3: 'GMB', dial: '+220', flag: '🇬🇲' },
  { name: 'Guinea', iso2: 'GN', iso3: 'GIN', dial: '+224', flag: '🇬🇳' },
  { name: 'Gabon', iso2: 'GA', iso3: 'GAB', dial: '+241', flag: '🇬🇦' },
  { name: 'Congo', iso2: 'CG', iso3: 'COG', dial: '+242', flag: '🇨🇬' },
  { name: 'Chad', iso2: 'TD', iso3: 'TCD', dial: '+235', flag: '🇹🇩' },
  { name: 'Sudan', iso2: 'SD', iso3: 'SDN', dial: '+249', flag: '🇸🇩' },
  { name: 'South Sudan', iso2: 'SS', iso3: 'SSD', dial: '+211', flag: '🇸🇸' },
  { name: 'Somalia', iso2: 'SO', iso3: 'SOM', dial: '+252', flag: '🇸🇴' },
  { name: 'Burundi', iso2: 'BI', iso3: 'BDI', dial: '+257', flag: '🇧🇮' },
  { name: 'Eritrea', iso2: 'ER', iso3: 'ERI', dial: '+291', flag: '🇪🇷' },
  { name: 'Djibouti', iso2: 'DJ', iso3: 'DJI', dial: '+253', flag: '🇩🇯' },
  { name: 'Madagascar', iso2: 'MG', iso3: 'MDG', dial: '+261', flag: '🇲🇬' },
  { name: 'Mauritius', iso2: 'MU', iso3: 'MUS', dial: '+230', flag: '🇲🇺' },
  { name: 'Seychelles', iso2: 'SC', iso3: 'SYC', dial: '+248', flag: '🇸🇨' },
  { name: 'Cape Verde', iso2: 'CV', iso3: 'CPV', dial: '+238', flag: '🇨🇻' },
  { name: 'São Tomé & Príncipe', iso2: 'ST', iso3: 'STP', dial: '+239', flag: '🇸🇹' },
  { name: 'Equatorial Guinea', iso2: 'GQ', iso3: 'GNQ', dial: '+240', flag: '🇬🇶' },
  { name: 'Central African Rep.', iso2: 'CF', iso3: 'CAF', dial: '+236', flag: '🇨🇫' },
  { name: 'Lesotho', iso2: 'LS', iso3: 'LSO', dial: '+266', flag: '🇱🇸' },
  { name: 'Eswatini', iso2: 'SZ', iso3: 'SWZ', dial: '+268', flag: '🇸🇿' },
  { name: 'Comoros', iso2: 'KM', iso3: 'COM', dial: '+269', flag: '🇰🇲' },
  { name: 'Mauritania', iso2: 'MR', iso3: 'MRT', dial: '+222', flag: '🇲🇷' },
  { name: 'Libya', iso2: 'LY', iso3: 'LBY', dial: '+218', flag: '🇱🇾' },
  { name: 'Germany', iso2: 'DE', iso3: 'DEU', dial: '+49', flag: '🇩🇪' },
  { name: 'France', iso2: 'FR', iso3: 'FRA', dial: '+33', flag: '🇫🇷' },
  { name: 'Italy', iso2: 'IT', iso3: 'ITA', dial: '+39', flag: '🇮🇹' },
  { name: 'Spain', iso2: 'ES', iso3: 'ESP', dial: '+34', flag: '🇪🇸' },
  { name: 'Portugal', iso2: 'PT', iso3: 'PRT', dial: '+351', flag: '🇵🇹' },
  { name: 'Netherlands', iso2: 'NL', iso3: 'NLD', dial: '+31', flag: '🇳🇱' },
  { name: 'Belgium', iso2: 'BE', iso3: 'BEL', dial: '+32', flag: '🇧🇪' },
  { name: 'Switzerland', iso2: 'CH', iso3: 'CHE', dial: '+41', flag: '🇨🇭' },
  { name: 'Austria', iso2: 'AT', iso3: 'AUT', dial: '+43', flag: '🇦🇹' },
  { name: 'Ireland', iso2: 'IE', iso3: 'IRL', dial: '+353', flag: '🇮🇪' },
  { name: 'Sweden', iso2: 'SE', iso3: 'SWE', dial: '+46', flag: '🇸🇪' },
  { name: 'Norway', iso2: 'NO', iso3: 'NOR', dial: '+47', flag: '🇳🇴' },
  { name: 'Denmark', iso2: 'DK', iso3: 'DNK', dial: '+45', flag: '🇩🇰' },
  { name: 'Finland', iso2: 'FI', iso3: 'FIN', dial: '+358', flag: '🇫🇮' },
  { name: 'Poland', iso2: 'PL', iso3: 'POL', dial: '+48', flag: '🇵🇱' },
  { name: 'Greece', iso2: 'GR', iso3: 'GRC', dial: '+30', flag: '🇬🇷' },
  { name: 'Turkey', iso2: 'TR', iso3: 'TUR', dial: '+90', flag: '🇹🇷' },
  { name: 'Ukraine', iso2: 'UA', iso3: 'UKR', dial: '+380', flag: '🇺🇦' },
  { name: 'Russia', iso2: 'RU', iso3: 'RUS', dial: '+7', flag: '🇷🇺' },
  { name: 'United Arab Emirates', iso2: 'AE', iso3: 'ARE', dial: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia', iso2: 'SA', iso3: 'SAU', dial: '+966', flag: '🇸🇦' },
  { name: 'Qatar', iso2: 'QA', iso3: 'QAT', dial: '+974', flag: '🇶🇦' },
  { name: 'Kuwait', iso2: 'KW', iso3: 'KWT', dial: '+965', flag: '🇰🇼' },
  { name: 'Jordan', iso2: 'JO', iso3: 'JOR', dial: '+962', flag: '🇯🇴' },
  { name: 'Lebanon', iso2: 'LB', iso3: 'LBN', dial: '+961', flag: '🇱🇧' },
  { name: 'Israel', iso2: 'IL', iso3: 'ISR', dial: '+972', flag: '🇮🇱' },
  { name: 'China', iso2: 'CN', iso3: 'CHN', dial: '+86', flag: '🇨🇳' },
  { name: 'Japan', iso2: 'JP', iso3: 'JPN', dial: '+81', flag: '🇯🇵' },
  { name: 'South Korea', iso2: 'KR', iso3: 'KOR', dial: '+82', flag: '🇰🇷' },
  { name: 'Singapore', iso2: 'SG', iso3: 'SGP', dial: '+65', flag: '🇸🇬' },
  { name: 'Malaysia', iso2: 'MY', iso3: 'MYS', dial: '+60', flag: '🇲🇾' },
  { name: 'Indonesia', iso2: 'ID', iso3: 'IDN', dial: '+62', flag: '🇮🇩' },
  { name: 'Thailand', iso2: 'TH', iso3: 'THA', dial: '+66', flag: '🇹🇭' },
  { name: 'Vietnam', iso2: 'VN', iso3: 'VNM', dial: '+84', flag: '🇻🇳' },
  { name: 'Philippines', iso2: 'PH', iso3: 'PHL', dial: '+63', flag: '🇵🇭' },
  { name: 'Pakistan', iso2: 'PK', iso3: 'PAK', dial: '+92', flag: '🇵🇰' },
  { name: 'Bangladesh', iso2: 'BD', iso3: 'BGD', dial: '+880', flag: '🇧🇩' },
  { name: 'Sri Lanka', iso2: 'LK', iso3: 'LKA', dial: '+94', flag: '🇱🇰' },
  { name: 'Nepal', iso2: 'NP', iso3: 'NPL', dial: '+977', flag: '🇳🇵' },
  { name: 'Brazil', iso2: 'BR', iso3: 'BRA', dial: '+55', flag: '🇧🇷' },
  { name: 'Mexico', iso2: 'MX', iso3: 'MEX', dial: '+52', flag: '🇲🇽' },
  { name: 'Argentina', iso2: 'AR', iso3: 'ARG', dial: '+54', flag: '🇦🇷' },
  { name: 'Chile', iso2: 'CL', iso3: 'CHL', dial: '+56', flag: '🇨🇱' },
  { name: 'Colombia', iso2: 'CO', iso3: 'COL', dial: '+57', flag: '🇨🇴' },
  { name: 'Peru', iso2: 'PE', iso3: 'PER', dial: '+51', flag: '🇵🇪' },
  { name: 'New Zealand', iso2: 'NZ', iso3: 'NZL', dial: '+64', flag: '🇳🇿' },
];

export const ORG_TYPE_LIST = [
  'Government Ministry', 'Government Department', 'Government Agency', 'Local Government',
  'University', 'Polytechnic', 'College', 'Primary School', 'Secondary School',
  'NGO', 'Civil Society Organisation', 'Private Company', 'Professional Association',
  'Hospital', 'Religious Organisation', 'Foundation', 'Research Institution', 'Other',
] as const;

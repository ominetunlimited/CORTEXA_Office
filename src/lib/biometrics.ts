/* CORTEXA biometric unlock (Web Authentication API).
   Uses the device's platform authenticator — fingerprint / Face ID / Windows
   Hello — when one is available and the origin is trusted. Everything is
   defensive: on unsupported devices, denied permission or sandboxed contexts
   the helpers report unavailable and the caller falls back to the password.
   Enrollment metadata is device-local (localStorage); the private key never
   leaves the secure element, so nothing sensitive is persisted by the app.  */

const ENROLL_KEY = 'cortexa.biometric.enrollments.v1';

interface Enrollment { userId: string; credentialId: string; label: string; at: number }

function readEnrollments(): Enrollment[] {
  try { return JSON.parse(localStorage.getItem(ENROLL_KEY) ?? '[]') as Enrollment[]; } catch { return []; }
}
function writeEnrollments(list: Enrollment[]) {
  try { localStorage.setItem(ENROLL_KEY, JSON.stringify(list)); } catch { /* unavailable */ }
}

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function rpId(): string {
  try { return window.location.hostname || 'localhost'; } catch { return 'localhost'; }
}

/** True when the browser exposes WebAuthn and a platform authenticator. */
export function biometricSupported(): boolean {
  try {
    return typeof window !== 'undefined' &&
      !!window.PublicKeyCredential &&
      typeof navigator !== 'undefined' &&
      !!navigator.credentials;
  } catch { return false; }
}

/** Async probe — resolves true only if a user-verifying platform authenticator
 *  (fingerprint / Face ID / Windows Hello) is present and usable.            */
export async function platformAuthenticatorAvailable(): Promise<boolean> {
  if (!biometricSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

export function isEnrolled(userId: string): boolean {
  return readEnrollments().some((e) => e.userId === userId);
}

export function enrolledLabel(userId: string): string | null {
  return readEnrollments().find((e) => e.userId === userId)?.label ?? null;
}

export function clearEnrollment(userId: string): void {
  writeEnrollments(readEnrollments().filter((e) => e.userId !== userId));
}

/** Register this device's authenticator for the user. Returns ok, or a reason. */
export async function enrollBiometric(userId: string, userName: string): Promise<{ ok: boolean; reason?: string }> {
  if (!biometricSupported()) return { ok: false, reason: 'WebAuthn is not supported by this browser.' };
  try {
    const available = await platformAuthenticatorAvailable();
    if (!available) return { ok: false, reason: 'No fingerprint / Face ID hardware is available here.' };
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId);
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'CORTEXA', id: rpId() },
        user: { id: userIdBytes, name: userName, displayName: userName },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   /* ES256 */
          { type: 'public-key', alg: -257 },  /* RS256 */
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;
    if (!cred) return { ok: false, reason: 'The prompt was dismissed.' };
    const existing = readEnrollments().filter((e) => e.userId !== userId);
    existing.push({ userId, credentialId: toB64(cred.rawId), label: deviceGuess(), at: Date.now() });
    writeEnrollments(existing);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/denied|not.?allowed|security/i.test(msg)) return { ok: false, reason: 'Permission was denied or this context is not trusted for biometrics.' };
    return { ok: false, reason: 'Enrollment failed — use your password instead.' };
  }
}

/** Ask the platform authenticator to verify the user. Returns ok, or a reason. */
export async function verifyBiometric(userId: string): Promise<{ ok: boolean; reason?: string }> {
  const enrollment = readEnrollments().find((e) => e.userId === userId);
  if (!enrollment) return { ok: false, reason: 'This device is not enrolled for biometric unlock.' };
  if (!biometricSupported()) return { ok: false, reason: 'WebAuthn is not supported by this browser.' };
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: rpId(),
        allowCredentials: [{ type: 'public-key', id: fromB64(enrollment.credentialId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return assertion ? { ok: true } : { ok: false, reason: 'Verification was cancelled.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/denied|not.?allowed|security/i.test(msg)) return { ok: false, reason: 'Permission was denied or this context is not trusted for biometrics.' };
    return { ok: false, reason: 'Biometric check failed — use your password instead.' };
  }
}

function deviceGuess(): string {
  try {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/.test(ua)) return 'Face ID / Touch ID';
    if (/Android/.test(ua)) return 'Android fingerprint';
    if (/Windows/.test(ua)) return 'Windows Hello';
    if (/Mac/.test(ua)) return 'Touch ID';
    return 'Platform authenticator';
  } catch { return 'Platform authenticator'; }
}

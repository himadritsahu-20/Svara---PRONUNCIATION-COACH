// Mock backend that persists to localStorage.
// Implements /api/auth/register, /api/auth/login, /api/auth/me and sessions_history.
// Passwords are hashed with PBKDF2-SHA256 (100k iterations) via Web Crypto —
// a real, secure hashing scheme (not plain SHA-256).

export type User = {
  id: string;
  email: string;
  name: string;
  streak: number;
  created_at: string;
};

export type SessionRecord = {
  id: string;
  user_id: string;
  sanskrit_text: string;
  score: number;
  feedback_json: any;
  created_at: string;
};

type StoredUser = User & { password_hash: string; salt: string };

const USERS_KEY = 'svara:users';
const SESSIONS_KEY = 'svara:sessions';
const TOKEN_KEY = 'svara:token';

const read = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fallback; }
  catch { return fallback; }
};
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
};

async function pbkdf2(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = fromHex(saltHex);
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key, 256
  );
  return toHex(bits);
}

async function hashPassword(password: string) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const hash = await pbkdf2(password, salt);
  return { salt, hash };
}

async function verifyPassword(password: string, saltHex: string, expected: string) {
  const hash = await pbkdf2(password, saltHex);
  return hash === expected;
}

// --- public API ---

export async function register(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
  await new Promise(r => setTimeout(r, 350)); // simulate latency
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  if (!name.trim()) throw new Error('Please enter your name.');

  const users = read<StoredUser[]>(USERS_KEY, []);
  if (users.some(u => u.email === email)) throw new Error('An account with this email already exists.');

  const { salt, hash } = await hashPassword(password);
  const user: StoredUser = {
    id: uuid(), email, name: name.trim(),
    streak: 3,
    created_at: new Date().toISOString(),
    password_hash: hash, salt,
  };
  users.push(user);
  write(USERS_KEY, users);

  const token = issueToken(user.id);
  const { password_hash, salt: _s, ...publicUser } = user;
  return { user: publicUser, token };
}

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  await new Promise(r => setTimeout(r, 300));
  email = email.trim().toLowerCase();
  if (!email || !password) throw new Error('Email and password are required.');

  const users = read<StoredUser[]>(USERS_KEY, []);
  const user = users.find(u => u.email === email);
  if (!user) throw new Error('No account found with that email.');
  const ok = await verifyPassword(password, user.salt, user.password_hash);
  if (!ok) throw new Error('Incorrect password.');

  const token = issueToken(user.id);
  const { password_hash, salt: _s, ...publicUser } = user;
  return { user: publicUser, token };
}

export async function me(): Promise<User | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const userId = parseToken(token);
  if (!userId) return null;
  const users = read<StoredUser[]>(USERS_KEY, []);
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  const { password_hash, salt, ...publicUser } = user;
  // light "sync streak" — bump every new UTC day of visit
  const today = new Date().toISOString().slice(0, 10);
  const lastKey = `svara:lastVisit:${user.id}`;
  const last = localStorage.getItem(lastKey);
  if (last !== today) {
    if (last) {
      const diff = Math.round((Date.parse(today) - Date.parse(last)) / 86400000);
      user.streak = diff === 1 ? user.streak + 1 : 1;
    }
    localStorage.setItem(lastKey, today);
    write(USERS_KEY, users);
    publicUser.streak = user.streak;
  }
  return publicUser;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

function issueToken(userId: string) {
  // "JWT-like" opaque token: base64url(header).base64url(payload).sig
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: userId, iat: Date.now() }));
  const sig = btoa(userId + ':' + Date.now());
  const token = `${header}.${payload}.${sig}`;
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

function parseToken(token: string): string | null {
  try {
    const [, payload] = token.split('.');
    const data = JSON.parse(atob(payload));
    return data.sub ?? null;
  } catch { return null; }
}

// --- sessions_history ---

export function saveSession(userId: string, sanskrit_text: string, score: number, feedback_json: any): SessionRecord {
  const all = read<SessionRecord[]>(SESSIONS_KEY, []);
  const record: SessionRecord = {
    id: uuid(), user_id: userId, sanskrit_text, score, feedback_json,
    created_at: new Date().toISOString(),
  };
  all.unshift(record);
  write(SESSIONS_KEY, all);
  return record;
}

export function getSessions(userId: string): SessionRecord[] {
  return read<SessionRecord[]>(SESSIONS_KEY, []).filter(s => s.user_id === userId);
}

export function getSessionCount(userId: string | null): number {
  if (!userId) return 0;
  return getSessions(userId).length;
}

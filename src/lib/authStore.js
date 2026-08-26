// Accounts + session. Passwords are stored as PBKDF2 hashes; legacy plain-text
// users are migrated to hashed storage on their next successful sign-in.

import { USERS_KEY, SESSION_KEY, read, write, uid, notify } from './storage';
import { seedData } from './seed';

const PASSWORD_HASH_BYTES = 32;
const PASSWORD_ITERATIONS = 120000;

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i);
  }
  return output;
}

async function hashPassword(password, saltBytes = crypto.getRandomValues(new Uint8Array(16))) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PASSWORD_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PASSWORD_HASH_BYTES * 8,
  );

  return {
    salt: bytesToBase64(saltBytes),
    hash: bytesToBase64(new Uint8Array(hashBuffer)),
  };
}

async function verifyPassword(password, salt, hash) {
  const saltBytes = base64ToBytes(salt);
  const computed = await hashPassword(password, saltBytes);
  return computed.hash === hash;
}

// The session snapshot is cached so getSession() is referentially stable
// between changes — required by useSyncExternalStore, which compares
// snapshots with Object.is on every render.
let sessionCache;
let sessionCacheLoaded = false;

function refreshSessionCache() {
  sessionCache = read(SESSION_KEY, null);
  sessionCacheLoaded = true;
}

export function getSession() {
  if (!sessionCacheLoaded) refreshSessionCache();
  return sessionCache;
}

export async function signUp({ name, email, password }) {
  const users = read(USERS_KEY, []);
  const trimmedEmail = String(email || '').trim().toLowerCase();
  const trimmedName = String(name || '').trim();
  if (!trimmedName || !trimmedEmail || !password) {
    throw new Error('Please complete all fields.');
  }
  if (users.some((u) => (u.email || '').toLowerCase() === trimmedEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const passwordRecord = await hashPassword(String(password));
  const user = {
    id: uid(),
    name: trimmedName,
    email: trimmedEmail,
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
  };
  users.push(user);
  write(USERS_KEY, users);
  write(SESSION_KEY, { userId: user.id, name: user.name, email: user.email });
  refreshSessionCache();
  seedData(user.id);
  notify();
}

export async function signIn({ email, password }) {
  const users = read(USERS_KEY, []);
  const trimmedEmail = String(email || '').trim().toLowerCase();
  const user = users.find((u) => (u.email || '').toLowerCase() === trimmedEmail);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const validLegacyPassword = user.password && user.password === password;
  const validHashedPassword = user.passwordHash && user.passwordSalt
    ? await verifyPassword(String(password), user.passwordSalt, user.passwordHash)
    : false;

  if (!validLegacyPassword && !validHashedPassword) {
    throw new Error('Invalid email or password.');
  }

  if (validLegacyPassword && !user.passwordHash) {
    const passwordRecord = await hashPassword(String(password));
    user.passwordHash = passwordRecord.hash;
    user.passwordSalt = passwordRecord.salt;
    delete user.password;
    write(USERS_KEY, users);
  }

  write(SESSION_KEY, { userId: user.id, name: user.name, email: user.email });
  refreshSessionCache();
  notify();
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
  refreshSessionCache();
  notify();
}

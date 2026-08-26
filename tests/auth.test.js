import { beforeEach, describe, expect, it } from 'vitest';
import { getSession, signIn, signOut, signUp } from '../src/lib/store';

const USERS_KEY = 'flow_users';

function storedUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

beforeEach(() => {
  localStorage.clear();
  signOut(); // also resets the cached session snapshot
});

describe('signUp', () => {
  it('creates an account and starts a session', async () => {
    await signUp({ name: 'Jane', email: 'jane@example.com', password: 'hunter2' });
    const session = getSession();
    expect(session).not.toBeNull();
    expect(session.email).toBe('jane@example.com');
    expect(session.name).toBe('Jane');
  });

  it('stores a salted hash, never the plain-text password', async () => {
    await signUp({ name: 'Jane', email: 'jane@example.com', password: 'hunter2' });
    const [user] = storedUsers();
    expect(user.passwordHash).toBeTruthy();
    expect(user.passwordSalt).toBeTruthy();
    expect(user.password).toBeUndefined();
    expect(JSON.stringify(user)).not.toContain('hunter2');
  });

  it('rejects missing fields', async () => {
    await expect(signUp({ name: '', email: 'a@b.co', password: 'x' })).rejects.toThrow('complete all fields');
    await expect(signUp({ name: 'A', email: '  ', password: 'x' })).rejects.toThrow('complete all fields');
    await expect(signUp({ name: 'A', email: 'a@b.co', password: '' })).rejects.toThrow('complete all fields');
  });

  it('rejects duplicate emails case-insensitively', async () => {
    await signUp({ name: 'Jane', email: 'jane@example.com', password: 'hunter2' });
    await expect(
      signUp({ name: 'Other', email: 'JANE@example.com', password: 'other' }),
    ).rejects.toThrow('already exists');
  });
});

describe('signIn', () => {
  beforeEach(async () => {
    await signUp({ name: 'Jane', email: 'jane@example.com', password: 'hunter2' });
    signOut();
  });

  it('signs in with the correct password', async () => {
    await signIn({ email: 'Jane@Example.com ', password: 'hunter2' });
    expect(getSession()?.email).toBe('jane@example.com');
  });

  it('rejects a wrong password', async () => {
    await expect(signIn({ email: 'jane@example.com', password: 'nope' })).rejects.toThrow(
      'Invalid email or password',
    );
    expect(getSession()).toBeNull();
  });

  it('rejects an unknown email', async () => {
    await expect(signIn({ email: 'ghost@example.com', password: 'hunter2' })).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('migrates legacy plain-text users to hashed storage', async () => {
    const users = storedUsers();
    users.push({ id: 'legacy1', name: 'Old', email: 'old@example.com', password: 'legacy-pass' });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    await signIn({ email: 'old@example.com', password: 'legacy-pass' });

    const migrated = storedUsers().find((u) => u.id === 'legacy1');
    expect(migrated.password).toBeUndefined();
    expect(migrated.passwordHash).toBeTruthy();
    expect(migrated.passwordSalt).toBeTruthy();

    // And the hashed credentials keep working.
    signOut();
    await signIn({ email: 'old@example.com', password: 'legacy-pass' });
    expect(getSession()?.email).toBe('old@example.com');
  });
});

describe('signOut', () => {
  it('clears the session', async () => {
    await signUp({ name: 'Jane', email: 'jane@example.com', password: 'hunter2' });
    signOut();
    expect(getSession()).toBeNull();
  });
});

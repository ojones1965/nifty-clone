// Speaks short confirmations through a local Voicebox instance
// (voicebox.sh) running on this machine. Best-effort, like sync.js: if
// Voicebox isn't running, this gives up silently rather than interrupting
// the app.

const BASE_URL = 'http://127.0.0.1:17493';
const PROFILE = 'Jarvis';
const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 120; // 60s budget — short lines still take 15-20s on this model

export async function speakConfirmation(text) {
  try {
    const generation = await postSpeak(text);
    const completed = await waitForCompletion(generation);
    if (!completed) return;
    await playAudio(completed.id);
  } catch {
    console.warn('Voicebox unavailable; skipping spoken confirmation.');
  }
}

async function postSpeak(text) {
  const res = await fetch(`${BASE_URL}/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, profile: PROFILE }),
  });
  if (!res.ok) throw new Error(`speak failed: ${res.status}`);
  return res.json();
}

async function waitForCompletion(generation) {
  let current = generation;
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (current.status === 'completed') return current;
    if (current.status === 'error' || current.status === 'failed') return null;
    const res = await fetch(`${BASE_URL}/history/${current.id}`);
    if (!res.ok) throw new Error(`history failed: ${res.status}`);
    current = await res.json();
    if (current.status !== 'completed') await sleep(POLL_INTERVAL_MS);
  }
  return current.status === 'completed' ? current : null;
}

async function playAudio(generationId) {
  const res = await fetch(`${BASE_URL}/audio/${generationId}`);
  if (!res.ok) throw new Error(`audio failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  await new Audio(url).play();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

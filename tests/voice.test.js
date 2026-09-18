import { afterEach, describe, expect, it, vi } from 'vitest';
import { speakConfirmation } from '../src/lib/voice.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function blobResponse(blob, status = 200) {
  return new Response(blob, { status });
}

function stubHappyPath({ speakId = 'gen1' } = {}) {
  const playMock = vi.fn(async () => {});
  const AudioMock = vi.fn(function AudioStub() {
    return { play: playMock };
  });
  const fetchMock = vi.fn(async (url) => {
    if (url.endsWith('/speak')) return jsonResponse({ id: speakId, status: 'generating' });
    if (url.endsWith(`/history/${speakId}`)) return jsonResponse({ id: speakId, status: 'completed' });
    if (url.endsWith(`/audio/${speakId}`)) return blobResponse(new Blob(['audio']));
    throw new Error(`unexpected url: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('Audio', AudioMock);
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  return { fetchMock, AudioMock, playMock };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete URL.createObjectURL;
});

describe('speakConfirmation', () => {
  it('posts the text and Jarvis profile to /speak', async () => {
    const { fetchMock } = stubHappyPath();

    await speakConfirmation('Sold Blue Jacket for $45 on Poshmark.');

    const [url, init] = fetchMock.mock.calls.find(([callUrl]) => callUrl.endsWith('/speak'));
    expect(url).toBe('http://127.0.0.1:17493/speak');
    expect(JSON.parse(init.body)).toEqual({ text: 'Sold Blue Jacket for $45 on Poshmark.', profile: 'Jarvis' });
  });

  it('plays the generated audio once the generation completes', async () => {
    const { playMock } = stubHappyPath();

    await speakConfirmation('hello');

    expect(playMock).toHaveBeenCalledOnce();
  });

  it('does not throw when Voicebox is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));

    await expect(speakConfirmation('hello')).resolves.toBeUndefined();
  });

  it('gives up without playing audio when generation fails', async () => {
    const AudioMock = vi.fn();
    vi.stubGlobal('Audio', AudioMock);
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url.endsWith('/speak')) return jsonResponse({ id: 'gen1', status: 'generating' });
      if (url.endsWith('/history/gen1')) return jsonResponse({ id: 'gen1', status: 'error', error: 'boom' });
      throw new Error(`unexpected url: ${url}`);
    }));

    await speakConfirmation('hello');

    expect(AudioMock).not.toHaveBeenCalled();
  });
});

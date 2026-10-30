import { NextRequest, NextResponse } from 'next/server';

/**
 * Split text into semantic sentence and clause chunks under maxLength.
 * Never cuts across words, handles punctuation gracefully.
 */
function splitIntoChunks(text: string, maxLength = 140): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return [clean];

  const chunks: string[] = [];
  // Split on sentence boundaries: periods, exclamation, questions, colons, semicolons
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
  const rawSentences = clean.match(sentenceRegex) || [clean];

  let currentChunk = '';

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxLength) {
      // Sentence is longer than max length; split by commas or clauses
      const clauses = trimmed.split(/([,;—]\s+)/);
      for (const clause of clauses) {
        if (!clause.trim()) continue;
        if ((currentChunk + ' ' + clause).trim().length <= maxLength) {
          currentChunk = (currentChunk + ' ' + clause).trim();
        } else {
          if (currentChunk) chunks.push(currentChunk);
          // If a single clause is still too long, split by words
          if (clause.length > maxLength) {
            const words = clause.split(/\s+/);
            let wordChunk = '';
            for (const word of words) {
              if ((wordChunk + ' ' + word).trim().length <= maxLength) {
                wordChunk = (wordChunk + ' ' + word).trim();
              } else {
                if (wordChunk) chunks.push(wordChunk);
                wordChunk = word;
              }
            }
            currentChunk = wordChunk;
          } else {
            currentChunk = clause.trim();
          }
        }
      }
    } else if ((currentChunk + ' ' + trimmed).trim().length <= maxLength) {
      currentChunk = (currentChunk + ' ' + trimmed).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = trimmed;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Fetch a single audio chunk from Google Translate TTS
 */
async function fetchGoogleTtsChunk(textChunk: string): Promise<Buffer | null> {
  try {
    const encoded = encodeURIComponent(textChunk);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=en&client=tw-ob`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      if (arrayBuf.byteLength > 200) {
        return Buffer.from(arrayBuf);
      }
    }
  } catch (err) {
    console.warn('Error fetching Google TTS chunk:', err);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'Joey' } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text prompt is required' }, { status: 400 });
    }

    const cleanText = text.trim();

    // 1. First Attempt: Requested TTS endpoint (ttsmp3 with Joey voice) if short enough
    if (cleanText.length <= 250) {
      try {
        const params = new URLSearchParams();
        params.append('msg', cleanText);
        params.append('lang', voice || 'Joey');
        params.append('source', 'ttsmp3');

        const ttsRes = await fetch('https://ttsmp3.com/makemp3_new.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Origin: 'https://ttsmp3.com',
            Referer: 'https://ttsmp3.com/',
          },
          body: params.toString(),
        });

        if (ttsRes.ok) {
          const textData = await ttsRes.text();
          try {
            const ttsData = JSON.parse(textData);
            if (ttsData.Error === 0 && ttsData.URL) {
              const audioRes = await fetch(ttsData.URL);
              if (audioRes.ok) {
                const arrayBuffer = await audioRes.arrayBuffer();
                const base64Audio = Buffer.from(arrayBuffer).toString('base64');
                return NextResponse.json({
                  audio: base64Audio,
                  mimeType: 'audio/mpeg',
                  audioUrl: ttsData.URL,
                  provider: 'ttsmp3-joey',
                });
              }
            }
          } catch (_) {}
        }
      } catch (primaryErr) {
        console.warn('TTSMP3 provider unavailable, falling back to chunked Google TTS:', primaryErr);
      }
    }

    // 2. High-Fidelity Server Fallback: Chunked Google TTS with seamless MP3 concatenation
    try {
      const chunks = splitIntoChunks(cleanText, 140);
      const audioBuffers: Buffer[] = [];

      for (const chunk of chunks) {
        const buf = await fetchGoogleTtsChunk(chunk);
        if (buf) {
          audioBuffers.push(buf);
        }
      }

      if (audioBuffers.length > 0) {
        const combined = Buffer.concat(audioBuffers);
        const base64Audio = combined.toString('base64');
        return NextResponse.json({
          audio: base64Audio,
          mimeType: 'audio/mpeg',
          provider: 'google-tts-chunked',
          chunksCount: audioBuffers.length,
        });
      }
    } catch (fallbackErr) {
      console.warn('Google TTS chunking failed:', fallbackErr);
    }

    return NextResponse.json(
      { error: 'TTS audio could not be synthesized', fallbackToBrowser: true },
      { status: 502 }
    );
  } catch (err: any) {
    console.error('TTS route unexpected error:', err);
    return NextResponse.json({ error: err.message || 'TTS generation failed' }, { status: 500 });
  }
}

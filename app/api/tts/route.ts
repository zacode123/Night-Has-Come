import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'Joey' } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text prompt is required' }, { status: 400 });
    }

    const cleanText = text.trim();

    // 1. First Attempt: Requested TTS endpoint (ttsmp3 with Joey voice)
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
        } catch (_) {
          // Response was not JSON (e.g. Cloudflare captcha challenge)
        }
      }
    } catch (primaryErr) {
      console.warn('TTSMP3 provider unavailable, falling back to Google TTS:', primaryErr);
    }

    // 2. High-Fidelity Server Fallback: Google Translate TTS stream (MP3 audio/mpeg, 100% reliable)
    try {
      const encodedQuery = encodeURIComponent(cleanText.slice(0, 300));
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedQuery}&tl=en&client=tw-ob`;

      const gRes = await fetch(googleTtsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (gRes.ok) {
        const arrayBuffer = await gRes.arrayBuffer();
        if (arrayBuffer.byteLength > 200) {
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');
          return NextResponse.json({
            audio: base64Audio,
            mimeType: 'audio/mpeg',
            provider: 'google-tts',
          });
        }
      }
    } catch (fallbackErr) {
      console.warn('Google TTS fallback also failed:', fallbackErr);
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

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'Joey' } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Text prompt is required' }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.append('msg', text);
    params.append('lang', voice || 'Joey');
    params.append('source', 'ttsmp3');

    const ttsRes = await fetch('https://ttsmp3.com/makemp3_new.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!ttsRes.ok) {
      throw new Error(`TTSMP3 API failed with status ${ttsRes.status}`);
    }

    const ttsData = await ttsRes.json();
    if (ttsData.Error !== 0 || !ttsData.URL) {
      throw new Error(ttsData.Message || 'TTSMP3 generation failed');
    }

    const audioUrl = ttsData.URL;

    // Fetch the actual audio file from ttsmp3.com so we can return base64
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      throw new Error('Failed to fetch generated audio file');
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    return NextResponse.json({
      audio: base64Audio,
      mimeType: 'audio/mpeg',
      audioUrl: audioUrl,
    });
  } catch (err: any) {
    console.error('TTS error:', err);
    return NextResponse.json({ error: err.message || 'TTS generation failed' }, { status: 500 });
  }
}

// Vercel Serverless Function — proxies Whisper API calls
// Users' audio goes to this endpoint, we call OpenAI with OUR key
export const config = { api: { bodyParser: false }, maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return res.status(500).json({ error: 'Server not configured' });

  try {
    // Forward the raw audio to OpenAI Whisper
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    const formData = new FormData();
    formData.append('file', new Blob([body], { type: 'audio/webm' }), 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'text');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const text = await response.text();
    res.status(200).json({ text: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

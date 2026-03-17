const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');

class WhisperService {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audioBuffer) {
    const tmpPath = path.join(os.tmpdir(), `verby-${Date.now()}.webm`);
    fs.writeFileSync(tmpPath, Buffer.from(audioBuffer));
    try {
      const transcription = await this.client.audio.transcriptions.create({
        model: 'whisper-1',
        file: fs.createReadStream(tmpPath),
        response_format: 'text',
      });
      return transcription.trim();
    } finally {
      fs.unlinkSync(tmpPath);
    }
  }
}

module.exports = WhisperService;

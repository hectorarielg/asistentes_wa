import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import fetch from 'node-fetch';

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID;

export const generarAudioDesdeTexto = async (texto: string): Promise<Readable> => {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: texto,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });

  if (!response.ok) {
    throw new Error(`🧨 Error generando voz: ${response.statusText}`);
  }

  return response.body as Readable;
};

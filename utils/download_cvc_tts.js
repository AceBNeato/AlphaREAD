import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CVC_WORDS = [
  "BAT", "BED", "BET", "BIB", "BIG", "BOX", "BUD", "BUG", "CAN", "CAR",
  "COB", "CUP", "CUT", "DID", "DIG", "DOG", "DOT", "FAN", "FED", "FIT",
  "FIX", "GAS", "GET", "GOT", "GUM", "GUN", "HAM", "HAT", "HER", "HID",
  "HIM", "HIP", "HOP", "HOT", "HUG", "HUM", "JAM", "JOG", "KIT", "LAD",
  "LED", "LET", "LID", "MAD", "MAN", "MEN", "MET", "MID", "MIX", "NAG",
  "NAP", "NET", "PAD", "PAN", "PEN", "PIN", "POT", "RAG", "RAM", "RAT",
  "RED", "RID", "RUG", "RUN", "SAG", "SET", "SIN", "SIP", "SIT", "SIX",
  "SUM", "TAN", "TAX", "TEN", "TIP", "TOP", "TUB", "TUG", "VAN", "VET",
  "WED", "WET", "WIG", "WIN", "YET"
];

const outputDir = path.join(__dirname, '..', 'public', 'audio', 'cvc-audio');

// Ensure directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function downloadTTS(word) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word.toLowerCase())}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${word}: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(outputDir, `cvc-${word.toLowerCase()}.mp3`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Saved: ${filePath}`);
}

async function run() {
  console.log(`Starting download of ${CVC_WORDS.length} CVC words...`);
  for (const word of CVC_WORDS) {
    try {
      await downloadTTS(word);
      // Brief delay to be polite to the server
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Error downloading ${word}:`, error);
    }
  }
  console.log('Finished!');
}

run();

import fs from 'fs';
import https from 'https';
import path from 'path';

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'audio', 'letter-names');

// Ensure directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadTTS(text, filename) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${text}: ${res.statusCode}`));
        return;
      }
      
      const fileStream = fs.createWriteStream(filename);
      res.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      
      fileStream.on('error', (err) => {
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log('Downloading letter name audio files...');
  
  for (const letter of LETTERS) {
    const filename = path.join(OUTPUT_DIR, `name-${letter.toLowerCase()}.mp3`);
    try {
      // The name of the letter itself
      await downloadTTS(letter, filename);
      console.log(`Downloaded: ${letter} -> name-${letter.toLowerCase()}.mp3`);
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Error downloading ${letter}:`, err.message);
    }
  }
  
  console.log('Finished downloading all letter names!');
}

main();

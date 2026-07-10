import fs from 'fs';
import path from 'path';
import * as googleTTS from 'google-tts-api';

const TAGALOG_WORDS = [
  "AKO","ATE","ASO","APO","ABO","APA","AMA","AMIN","ATIN","BASO","BAGO","BATA","TULA","BATO","BATOK","BAKAL","BALAK","BALIK","BARKO","DAGA","DAGAT","GABI","GUHIT","GALIT","DAHIL","ISA","IBA","IYO","INA","IPIS","IBON","GOMA","GULO","KASO","KESO","LAKI","LARO","LUMA","LUTO","LOBO","MATA","MAPA","MALI","KAHIT","KAPIT","KANIN","KAHEL","MAHAL","OSO","OPO","PALA","PUSA","PUSO","PUNO","PILA","PULA","PERA","SIRA","SAMA","SANA","SALO","TIRA","TABO","TAMA","TASA","TALO","BAKA","TAHOL","AHAS","APAT","AKIN","ABOT","ULO","UBO","UPO","URI","ULAP","ULAM","WALO","KANTA","PAPEL","DAMIT","HITO","HIRAP","LAKAD","DASAL","TUNOG","BULAK","LAMAN","KANTO","BAHA","TAKBO","RELO","GUSTO","HINDI","ISDA","PATO","BIBE","MANOK","PATING","PAGONG","UNGGOY","ILONG","BIBIG","LABI","DILA","BUHOK","DALIRI","SIKO","TUHOD","PAA","TIYAN","LIKOD","PISNGI","KUKO","ITLOG","GATAS","KARNE","SOPAS","KENDI","SAGING","PINYA","UBAS","PAKWAN","MESA","KAMA","UNAN","KUMOT","TINIDOR","BOTE","LAPIS","GUNTING","ULAN","LUPA","ILOG","BUNDOK","DAMO","NIYOG","DAHON","SANGA","LOLO","LOLA","GURO","DOKTOR","PULIS","KUSINA","BANYO","SILID","HARDIN"
];

const PHONETIC_OVERRIDES = {
  "baka": "ba ka" // Workaround to prevent Google TTS from saying the English translation "cow"
};

const downloadAudio = async (text, dir, filename) => {
  try {
    const url = googleTTS.getAudioUrl(text, {
      lang: 'tl', // 'tl' stands for Tagalog in Google Translate. It defaults to a Filipino female AI voice.
      slow: false,
      host: 'https://translate.google.com',
    });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(path.join(dir, filename), Buffer.from(buffer));
    console.log(`Downloaded ${filename}`);
  } catch (err) {
    console.error(`Failed to download ${filename}:`, err.message);
  }
  // Add a small delay to avoid rate limits
  await new Promise(r => setTimeout(r, 250));
};

const run = async () => {
  const dir = path.join(process.cwd(), 'public', 'audio', 'tagalog-words');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log(`Downloading ${TAGALOG_WORDS.length} Tagalog words...`);

  for (let w of TAGALOG_WORDS) {
    const filename = `${w.toLowerCase()}.mp3`;
    const file = path.join(dir, filename);
    const textToSpeak = PHONETIC_OVERRIDES[w.toLowerCase()] || w.toLowerCase();
    
    // Always redownload if it's in the overrides, to fix broken files
    if (!fs.existsSync(file) || PHONETIC_OVERRIDES[w.toLowerCase()]) {
      await downloadAudio(textToSpeak, dir, filename);
    } else {
      console.log(`Skipped ${filename} (already exists)`);
    }
  }

  console.log("Done!");
};

run().catch(console.error);

import fs from 'fs';
import path from 'path';
import * as googleTTS from 'google-tts-api';

const LONG_VOWELS_WORDS = [
  "cake", "make", "bake", "mail", "tail", "rain", "day", "say", "way",
  "bee", "feet", "seed", "leaf", "meat", "seat", "Pete", "here", "eve",
  "kite", "bite", "like", "pie", "tie", "lie", "night", "high", "sigh",
  "bone", "cone", "home", "boat", "goat", "road", "cute", "mute", "cube"
];

const LONG_VOWELS_PATTERNS = [
  "a_e", "ai", "ay", "ee", "ea", "e_e", "i_e", "ie", "igh", "o_e", "oa", "u_e"
];

const BLENDS_WORDS = [
  "bless", "blade", "blame", "brave", "broke", "bride", "clean", "close", "clay", 
  "crane", "crab", "cream", "drive", "dream", "drone", "flame", "flip", "flag", 
  "frame", "free", "freeze", "globe", "glide", "glad", "green", "grape", "grass", 
  "play", "plane", "plate", "prone", "prize", "pride", "scale", "score", "scope", 
  "skin", "skate", "skip", "slap", "slide", "slow", "smile", "smoke", "smell", 
  "snake", "snail", "snore", "spot", "spin", "spell", "stone", "state", "steam", 
  "sweet", "swim", "sway", "tree", "train", "trade", "twin", "twigs", "tweet", 
  "chair", "cheese", "chase", "shop", "sheep", "shape", "these", "this", "those", 
  "theme", "thin", "thigh", "whale", "white", "wheel", "phone", "photo", "phase", 
  "street", "string", "stripe", "splat", "split", "splash", "sprint", "sprout", 
  "spray", "scrape", "screen", "scram", "square", "squid", "squeak", "shrank", 
  "shrub", "shred", "ring", "sing", "king", "hand", "sand", "land", "plant", 
  "grant", "paint", "fast", "last", "past", "lamp", "camp", "stamp", "task", 
  "disk", "risk", "volt", "melt", "belt", "cold", "gold", "grind", "craft", 
  "draft", "left"
];

const BLENDS_PATTERNS = [
  "bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "sc", "sk", 
  "sl", "sm", "sn", "sp", "st", "sw", "tr", "tw", "ch", "sh", "th", "th", "wh", "ph", 
  "str", "spl", "spr", "scr", "squ", "shr", "ng", "nd", "nt", "st", "mp", "sk", 
  "lt", "ld", "ft" // Note: we have 'th(d)' and 'th(t)', we'll just download 'th' as sound
];

// Helper to sanitize patterns for phonetics if needed
const getPhonetic = (text) => {
  text = text.toLowerCase();
  if (text.includes('_')) return text.replace('_', ' '); // a_e -> a e
  if (text === 'th(d)') return 'th';
  if (text === 'th(t)') return 'th';
  return text;
}

const downloadAudio = async (text, dir, filename) => {
  const url = googleTTS.getAudioUrl(text, {
    lang: 'en-US',
    slow: false,
    host: 'https://translate.google.com',
  });
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(path.join(dir, filename), Buffer.from(buffer));
  console.log(`Downloaded ${filename}`);
  // Add a small delay
  await new Promise(r => setTimeout(r, 200));
};

const run = async () => {
  const longVowelsDir = path.join(process.cwd(), 'public', 'audio', 'long-vowels-audio');
  const blendsDir = path.join(process.cwd(), 'public', 'audio', 'blends-audio');
  
  if (!fs.existsSync(longVowelsDir)) fs.mkdirSync(longVowelsDir, { recursive: true });
  if (!fs.existsSync(blendsDir)) fs.mkdirSync(blendsDir, { recursive: true });

  for (let w of LONG_VOWELS_WORDS) {
    const file = path.join(longVowelsDir, `${w.toLowerCase()}.mp3`);
    if (!fs.existsSync(file)) await downloadAudio(w, longVowelsDir, `${w.toLowerCase()}.mp3`);
  }

  for (let p of LONG_VOWELS_PATTERNS) {
    const file = path.join(longVowelsDir, `${p.toLowerCase()}.mp3`);
    if (!fs.existsSync(file)) await downloadAudio(getPhonetic(p), longVowelsDir, `${p.toLowerCase()}.mp3`);
  }

  for (let w of BLENDS_WORDS) {
    const file = path.join(blendsDir, `${w.toLowerCase()}.mp3`);
    if (!fs.existsSync(file)) await downloadAudio(w, blendsDir, `${w.toLowerCase()}.mp3`);
  }

  // Blends patterns are named blend-*.mp3
  const blendsDataPatterns = [
    "bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "sc", "sk", 
    "sl", "sm", "sn", "sp", "st", "sw", "tr", "tw", "ch", "sh", "th(d)", "th(t)", "wh", "ph", 
    "str", "spl", "spr", "scr", "squ", "shr", "ng", "nd", "nt", "st", "mp", "sk", 
    "lt", "ld", "ft"
  ];
  
  for (let p of blendsDataPatterns) {
    const file = path.join(blendsDir, `blend-${p.toLowerCase()}.mp3`);
    if (!fs.existsSync(file)) await downloadAudio(getPhonetic(p), blendsDir, `blend-${p.toLowerCase()}.mp3`);
  }

  console.log("Done!");
};

run().catch(console.error);

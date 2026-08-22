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

const CVC_SENTENCES = [
  "The car is red.", "Jake ran far.", "Tom is on the bed.", "The cat is on the bed.",
  "The toy car is red.", "Pam is on the red bed.", "The dog has a red cap.", "The pig ran.",
  "The man got mad.", "Dan sat on the mat.", "Ben has a big toy car.", "The boy is big.",
  "The pig got wet.", "Joy has a hen.", "The kid ran to the man.", "It was a big box.",
  "The fan is on the mat.", "Jon is a big boy.", "Max is on the bus.", "Tim has a red pen.",
  "The pot is hot.", "Her leg is big.", "A cap is on the box.", "Pam has six cats.",
  "The fan is red.", "Kim got a big dog.", "Sam has a red pin.", "The cap is on the big bed.",
  "Jen ran to the bed.", "The big bag is on the mat."
];

const LONG_VOWELS_SENTENCES = [
  "I want to bake a cake.", "Pam likes to play at the park.", "My name is Pete.",
  "The rain will stop soon.", "The mail came today.", "Wait for me at home.",
  "Mom wants to pay for the cake.", "We will go home tonight.", "I made a big cake for Mom.",
  "I need to meet him at nine.", "The bee is cute.", "The bed is wide and big.",
  "Gab wants me to be on his right side.", "The tea is so hot.", "Tom and Max like to eat hot cake.",
  "Delete my name inside the mail.", "Ben and James like meat.", "The dog dives into the sea.",
  "We had fried egg for dinner at home.", "Ella rides her red bike.", "Dad will make me a kite.",
  "Jade, fix the bed well.", "Ted has five pairs of socks.", "We ate a sweet pie.",
  "Kent gave me five dogs.", "Jen got a hot cake.", "I sleep so well at night.",
  "Let's turn off the light.", "Dad gave Mom a rose.", "We need to vote for the right person.",
  "Let's go home late.", "The soap has a sweet smell.", "The road has bike lanes.",
  "The red coat fits Jane.", "Keep your tone low.", "Let's make five rows.",
  "The cake mom bakes is on the pan.", "Yen will use her bike.", "The cube is so cold.",
  "The cute cat is near me."
];

const BLENDS_SENTENCES = [
  "I can clean the desk each day.", "We can skate at the park today.", "She can drive the cart with care.",
  "We can play in the yard tonight.", "Those kids can help the class well.", "We can feed the sheep each day.",
  "We can see the whale swim fast.", "Dad can fix the chair today.", "The scope of the test covers the entire book.",
  "The street is safe for all.", "The plant will grow big soon.", "The white cat can run fast.",
  "The grass feels soft on bare feet.", "I can skate in the park today.", "Kim can make art with the clay.",
  "Mom made the drive so much fun.", "We can feed the sheep each day.", "Those kids can clap for the team.",
  "The tree gave us cool shade.", "We can ride the train home.", "The crane can lift the big log.",
  "Mom put the cream on cake.", "We can see the whale swim well.", "Dad can fix the chair today.",
  "We can plant flowers outside our home.", "The plane can take us far.", "The hands of Shane and Jim are clean.",
  "Ben left the lamp inside the box.", "Her teacher gave grapes and lemons to her classmates.",
  "The snake hides under the chair."
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
  const longVowelsDir = path.join(process.cwd(), 'public', 'audio', 'english', 'long-vowels-audio');
  const blendsDir = path.join(process.cwd(), 'public', 'audio', 'english', 'blends-audio');
  const sentencesDir = path.join(process.cwd(), 'public', 'audio', 'english', 'sentences-audio');
  
  if (!fs.existsSync(longVowelsDir)) fs.mkdirSync(longVowelsDir, { recursive: true });
  if (!fs.existsSync(blendsDir)) fs.mkdirSync(blendsDir, { recursive: true });
  
  // Wipe out the old sentences audio directory completely so no obsolete files remain
  if (fs.existsSync(sentencesDir)) {
      console.log("Cleaning old sentences directory...");
      fs.rmSync(sentencesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(sentencesDir, { recursive: true });

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

  console.log("Downloading Sentences...");
  
  const allSentences = [...CVC_SENTENCES, ...LONG_VOWELS_SENTENCES, ...BLENDS_SENTENCES];
  
  // Make sure we filter out unique sentences in case of duplicates (like "We can feed the sheep each day.")
  const uniqueSentences = [...new Set(allSentences)];

  for (let sentence of uniqueSentences) {
    const filename = sentence.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '.mp3';
    const file = path.join(sentencesDir, filename);
    if (!fs.existsSync(file)) await downloadAudio(sentence, sentencesDir, filename);
  }

  console.log("Done!");
};

run().catch(console.error);

const fs = require('fs');

const formatSentence = (filename) => {
  const name = filename.replace('.mp3', '');
  const words = name.split('-');
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
};

const lvl3Files = fs.readdirSync('public/audio/filipino/sentences-audio/level3').filter(f => f.endsWith('.mp3'));
const lvl3Sentences = lvl3Files.map(formatSentence);

let t = fs.readFileSync('src/app/data/tagalog_levels.ts', 'utf8');

const lvl3Formatted = 'export const TAGALOG_SENTENCES = [\n' + lvl3Sentences.map(x => `  "${x}"`).join(',\n') + '\n];';
t = t.replace(/export const TAGALOG_SENTENCES = \[[\s\S]*?\];/, lvl3Formatted);

fs.writeFileSync('src/app/data/tagalog_levels.ts', t);
console.log('Successfully injected Level 3 sentences into TAGALOG_SENTENCES.');

const fs = require('fs');

let t = fs.readFileSync('src/app/data/tagalog_levels.ts', 'utf8');

const namesToCapitalize = [
  'nanay', 'tatay', 'kuya', 'ate', 'lolo', 'lola', 'bunso',
  'maya', 'tina', 'nilo', 'narubi', 'lito', 'ben', 'alan', 'ara', 'ken', 'minda',
  'reyna', 'elena', 'tin', 'mark', 'tino', 'marta', 'abril', 'lunes', 'cora', 'aling'
];

function capitalizeNames(sentence) {
  return sentence.split(' ').map(word => {
    // Strip trailing punctuation to check
    const cleanWord = word.replace(/[.,!?]+$/, '').toLowerCase();
    if (namesToCapitalize.includes(cleanWord)) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  }).join(' ');
}

// Extract TAGALOG_SENTENCES
const tsMatch = t.match(/export const TAGALOG_SENTENCES = \[([\s\S]*?)\];/);
if (tsMatch) {
  const tsContent = tsMatch[1];
  const lines = tsContent.split('\n');
  const newLines = lines.map(line => {
    const m = line.match(/"([^"]+)"/);
    if (m) {
      return `  "${capitalizeNames(m[1])}"`;
    }
    return line;
  });
  t = t.replace(tsMatch[0], `export const TAGALOG_SENTENCES = [${newLines.join('\n')}];`);
}

// Extract TAGALOG_BLENDS_SENTENCES
const tbsMatch = t.match(/export const TAGALOG_BLENDS_SENTENCES = \[([\s\S]*?)\];/);
if (tbsMatch) {
  const tbsContent = tbsMatch[1];
  const lines = tbsContent.split('\n');
  const newLines = lines.map(line => {
    const m = line.match(/"([^"]+)"/);
    if (m) {
      return `  "${capitalizeNames(m[1])}"`;
    }
    return line;
  });
  t = t.replace(tbsMatch[0], `export const TAGALOG_BLENDS_SENTENCES = [${newLines.join('\n')}];`);
}

fs.writeFileSync('src/app/data/tagalog_levels.ts', t);
console.log("Successfully capitalized names in sentences.");

const fs = require('fs');
const path = require('path');

const audioDir = 'public/audio/filipino/sentences-audio/level4';
const txtContent = fs.readFileSync('organized_sentences.txt', 'utf8');

// Parse Level 4 sentences from organized_sentences.txt
let sentences = [];
let inLevel4 = false;
for (const line of txtContent.split('\n')) {
  if (line.includes('Level 4 Sentences') || line.includes('Not Found in current data')) {
    inLevel4 = true;
    continue;
  }
  if (line.includes('Level 3 Sentences')) {
    inLevel4 = false;
    continue;
  }
  if (inLevel4 && line.trim().startsWith('- ')) {
    sentences.push(line.trim().substring(2));
  }
}

// Ensure all existing files are lowercase .mp3 first
const files = fs.readdirSync(audioDir);
for (const f of files) {
  if (f.endsWith('.MP3')) {
    fs.renameSync(path.join(audioDir, f), path.join(audioDir, f.replace('.MP3', '.mp3')));
  }
}

// Re-read files
const allFiles = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function levenshtein(a, b) {
  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1,
        matrix[i - 1][j] + 1,
        matrix[i - 1][j - 1] + indicator
      );
    }
  }
  return matrix[a.length][b.length];
}

const foundSentences = [];
const missingSentences = [];

for (const s of sentences) {
  const slug = slugify(s);
  const targetFile = slug + '.mp3';
  
  if (allFiles.includes(targetFile)) {
    foundSentences.push(s);
    continue;
  }
  
  // Find closest file
  let bestMatch = null;
  let bestDist = Infinity;
  for (const f of allFiles) {
    const dist = levenshtein(targetFile, f);
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = f;
    }
  }
  
  if (bestMatch && bestDist < 20) { // arbitrary threshold
    console.log(`Renaming: ${bestMatch} -> ${targetFile}`);
    fs.renameSync(path.join(audioDir, bestMatch), path.join(audioDir, targetFile));
    allFiles.splice(allFiles.indexOf(bestMatch), 1);
    allFiles.push(targetFile);
    foundSentences.push(s);
  } else {
    console.log(`WARNING: Could not find matching audio for: ${s}`);
    missingSentences.push(s);
  }
}

// Update tagalog_levels.ts
let t = fs.readFileSync('src/app/data/tagalog_levels.ts', 'utf8');
const tsMatch = t.match(/export const TAGALOG_BLENDS_SENTENCES = \[([\s\S]*?)\];/);
if (tsMatch) {
  const newLines = foundSentences.map((s, idx) => `  "${s}"${idx === foundSentences.length - 1 ? '' : ','}`);
  t = t.replace(tsMatch[0], `export const TAGALOG_BLENDS_SENTENCES = [\n${newLines.join('\n')}\n];`);
  fs.writeFileSync('src/app/data/tagalog_levels.ts', t);
  console.log("Successfully updated TAGALOG_BLENDS_SENTENCES with " + foundSentences.length + " sentences.");
}

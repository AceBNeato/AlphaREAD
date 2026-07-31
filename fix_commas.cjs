const fs = require('fs');

let t = fs.readFileSync('src/app/data/tagalog_levels.ts', 'utf8');

// Extract TAGALOG_SENTENCES
const tsMatch = t.match(/export const TAGALOG_SENTENCES = \[([\s\S]*?)\];/);
if (tsMatch) {
  const tsContent = tsMatch[1];
  const lines = tsContent.split('\n').filter(l => l.trim() !== '');
  const newLines = lines.map((line, idx) => {
    const m = line.match(/"([^"]+)"/);
    if (m) {
      const isLast = idx === lines.length - 1;
      return `  "${m[1]}"${isLast ? '' : ','}`;
    }
    return line;
  });
  t = t.replace(tsMatch[0], `export const TAGALOG_SENTENCES = [\n${newLines.join('\n')}\n];`);
}

// Extract TAGALOG_BLENDS_SENTENCES
const tbsMatch = t.match(/export const TAGALOG_BLENDS_SENTENCES = \[([\s\S]*?)\];/);
if (tbsMatch) {
  const tbsContent = tbsMatch[1];
  const lines = tbsContent.split('\n').filter(l => l.trim() !== '');
  const newLines = lines.map((line, idx) => {
    const m = line.match(/"([^"]+)"/);
    if (m) {
      const isLast = idx === lines.length - 1;
      return `  "${m[1]}"${isLast ? '' : ','}`;
    }
    return line;
  });
  t = t.replace(tbsMatch[0], `export const TAGALOG_BLENDS_SENTENCES = [\n${newLines.join('\n')}\n];`);
}

fs.writeFileSync('src/app/data/tagalog_levels.ts', t);
console.log("Successfully fixed commas in sentences.");

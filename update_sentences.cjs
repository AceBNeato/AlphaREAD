const fs = require('fs');
const s = fs.readFileSync('filipino-lvl4-sentences', 'utf8').split('\n').filter(l => l.trim().length > 0).map(l => l.replace(/^\d+\.\s*/, '').trim());
const formatted = 'export const TAGALOG_BLENDS_SENTENCES = [\n' + s.map(x => `  "${x}"`).join(',\n') + '\n];';
let t = fs.readFileSync('src/app/data/tagalog_levels.ts', 'utf8');
t = t.replace(/export const TAGALOG_BLENDS_SENTENCES = \[[\s\S]*?\];/, formatted);
fs.writeFileSync('src/app/data/tagalog_levels.ts', t);

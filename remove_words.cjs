const fs = require('fs');

let t = fs.readFileSync('src/app/data/tagalog_levels.ts', 'utf8');

// Remove Tanggap and Kapwa
t = t.split('\n').filter(line => !line.includes('"Tanggap"') && !line.includes('"Kapwa"')).join('\n');

// Wait! In the array `gitna: [{ word: "Sangay", highlights: [2, 3] }, { word: "Langit", highlights: [2, 3] }, { word: "Tanggap", highlights: [2, 3] }]`
// If I just remove Tanggap, the line before it might have a trailing comma.
// Let's fix trailing commas.
t = t.replace(/,\s*\]/g, '\n        ]');

fs.writeFileSync('src/app/data/tagalog_levels.ts', t);
console.log("Successfully removed Tanggap and Kapwa.");

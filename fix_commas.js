const fs = require('fs');
let c = fs.readFileSync('src/app/data/tagalog_levels.ts', 'utf8');
c = c.replace(/("[\w\s\.,]+")(\s*\r?\n\s*")/g, '$1,$2');
fs.writeFileSync('src/app/data/tagalog_levels.ts', c);
console.log('Done fixing syntax');

const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('C:/xampp/htdocs/AlphabetGO/src/app/components');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('-y-1 active:border-b-0')) {
        console.log("Fixing:", file);
        let newContent = content.replace(/-y-1 active:border-b-0/g, 'className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0');
        fs.writeFileSync(file, newContent, 'utf8');
    }
});

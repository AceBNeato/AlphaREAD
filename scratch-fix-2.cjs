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
    
    let newContent = content;
    
    const mess1 = 'active:translateclassName="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 active:translateclassName="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0';
    
    const mess2 = 'active:translateclassName="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0';

    // Must replace mess1 first (the longer one)
    newContent = newContent.split(mess1).join('active:translate-y-1 active:border-b-0');
    newContent = newContent.split(mess2).join('active:translate-y-1 active:border-b-0');

    if (newContent !== content) {
        console.log("Fixed mess in:", file);
        fs.writeFileSync(file, newContent, 'utf8');
    }
});

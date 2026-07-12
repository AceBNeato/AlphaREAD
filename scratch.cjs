const fs = require('fs');
const glob = require('glob');
const path = 'c:/xampp/htdocs/AlphabetGO/src/app/components/Level*.tsx';
const files = glob.sync(path);
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  let regex = /className(?:Name)?=\s*\{?[\`\"']([\s\S]*?)[\`\"']\}?/g;
  content = content.replace(regex, (match, classString) => {
    if (!classString.includes('active:scale-95')) return match;
    
    let newClass = classString;
    if (classString.includes('border-b-[6px]')) {
      newClass = newClass.replace(/active:scale-95/g, 'active:translate-y-[6px] active:border-b-0');
    } else if (classString.includes('border-b-[4px]') || classString.includes('border-b-4')) {
      newClass = newClass.replace(/active:scale-95/g, 'active:translate-y-[4px] active:border-b-0');
    } else if (classString.includes('border-b-2') || classString.includes('border-b-[3px]')) {
      newClass = newClass.replace(/active:scale-95/g, 'active:translate-y-[2px] active:border-b-0');
    } else {
      newClass = newClass.replace(/active:scale-95/g, 'active:translate-y-1');
    }
    return match.replace(classString, newClass);
  });
  
  // catch any remaining
  content = content.replace(/active:scale-95/g, 'active:translate-y-1');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
    changedFiles++;
  }
});
console.log('Total files updated:', changedFiles);

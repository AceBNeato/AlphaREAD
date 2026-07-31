const fs = require('fs');

const inputList = [
"Sasama ako kay ate mamayang gabi.",
"Umalis si kuya sa bahay para pumunta sa kanyang kaibigan.",
"Ako ay may alagang pusa at aso sa bahay.",
"May apat na lapis sa loob ng silid-aralan.",
"Si Maya ay may apat na lobo.",
"Sasayaw kami bukas sa simbahan.",
"Ang luto ni Nanay ang gusto kong kainin.",
"Si Tatay ay isang marangal na pulis.",
"May baboy kaming inaalagaan sa bakuran.",
"May gatas na binili si Nanay para kay Bunso.",
"Bitbit ni Lolo ang kahoy na binili niya kay Aling Cora.",
"Inamoy ko ang masarap na pagkaing dala ni Kuya.",
"Araw-araw akong pupunta sa bahay nina Lola at Lolo para mayakap sila.",
"May libreng sabaw sa kainan sa labas ng paaralan.",
"Natatanaw ko ang mga bulaklak na halaman ng aming guro.",
"Ang malalaking puno sa gubat ay nakakatulong upang hindi bumaha.",
"Makulay na tela ang gusto ko para sa aking damit.",
"Naaliw ako sa sanggol na nakita ko kanina.",
"Mabait si Reyna Elena kasi binigyan niya ng pagkain ang batang paslit.",
"Nabuhay ang halaman na muntik nang mamatay.",
"May pwesto kami sa palengke, at doon kami nagtitinda.",
"Sasakay kami sa tren papuntang bayan.",
"Bibili kami sa prutasan ng maraming mangga.",
"Magpapalitson si Nanay sa kaarawan nina Ate at Kuya.",
"Tsaa ang iinumin namin kapag wala nang gatas.",
"Nagkuwento si Marta na napakabait daw ng kaniyang lola.",
"Malamig ang klima kapag may Bagyo, kaya makapal ang dyaket ko.",
"Masaya ang tropa nina Ben at Mark habang nagluluto.",
"Suot ko ang blusang ibinigay ng paborito kong guro.",
"Isasara ko ang gripo pagkatapos kong maligo.",
"Mataas ang grado ni Tino kasi nag-aaral siya nang mabuti.",
"Sa Abril kami luluwas papunta sa ibang bansa.",
"May sobra akong dalang pagkain.",
"Sasakay tayo sa dyip ni Tatay papuntang simbahan.",
"Magkagrupo sina Ben at Tin sa isang proyekto.",
"Malaki ang premyong napanalunan ni Kuya sa paligsahan.",
"Dala ko ang dyaket na hiniram ko kay Minda.",
"May klase na sa Lunes, kaya matutulog ako nang maaga.",
"Maganda ang ngiti ni Marla dahil nanalo siya sa laro.",
"Kuwintas ang regalong ibinigay ni Nanay kay Tatay.",
"Bago ang tsinelas na isinuot ni Ara kahapon.",
"May plaka ang sasakyang nasa labas ng bahay.",
"Paborito ni Lolo ang makinig sa radyo tuwing umaga.",
"Puwede raw sumakay ng bisikleta papuntang paaralan.",
"Bigay ni Ken ang sumbrerong suot ko ngayon."
];

// Read from tagalog_levels.ts
const content = fs.readFileSync('src/app/data/tagalog_levels.ts', 'utf8');

const getSentences = (varName) => {
    const regex = new RegExp(`export const ${varName} = \\s*\\[([^\\]]+)\\]`);
    const match = content.match(regex);
    if (!match) return [];
    
    // Extract strings
    const strRegex = /"([^"]+)"/g;
    let strings = [];
    let m;
    while ((m = strRegex.exec(match[1])) !== null) {
        strings.push(m[1]);
    }
    return strings;
};

const level3 = getSentences('TAGALOG_SENTENCES');
const level4 = getSentences('TAGALOG_BLENDS_SENTENCES');

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const l3Set = new Set(level3.map(normalize));
const l4Set = new Set(level4.map(normalize));

let l3Out = [];
let l4Out = [];
let notFound = [];

for (const line of inputList) {
    const norm = normalize(line);
    if (l3Set.has(norm)) {
        l3Out.push(line);
    } else if (l4Set.has(norm)) {
        l4Out.push(line);
    } else {
        // Try fuzzy matching (mostly matches)
        let found = false;
        
        const fuzzyMatch = (arr, normLine) => {
            for (const s of arr) {
                const normS = normalize(s);
                if (normS.includes(normLine) || normLine.includes(normS)) return true;
                // Levenshtein or just simple checks. e.g. bagyo kaya makapal ang jacket ko -> dyaket ko
                if (normS.slice(0,10) === normLine.slice(0,10)) return true; // first 10 chars
            }
            return false;
        };

        if (fuzzyMatch(level3, norm)) {
            l3Out.push(line);
            found = true;
        } else if (fuzzyMatch(level4, norm)) {
            l4Out.push(line);
            found = true;
        }

        if (!found) {
            notFound.push(line);
        }
    }
}

let result = "Level 3 Sentences (Salita Master):\n";
result += l3Out.map(s => "- " + s).join("\n") + "\n\n";

result += "Level 4 Sentences (Kambal Katinig / Blends):\n";
result += l4Out.map(s => "- " + s).join("\n") + "\n\n";

if (notFound.length > 0) {
    result += "Not Found in current data (New Sentences):\n";
    result += notFound.map(s => "- " + s).join("\n") + "\n";
}

fs.writeFileSync('C:\\xampp\\htdocs\\AlphabetGO\\organized_sentences.txt', result);
console.log('Done!');

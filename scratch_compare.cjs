const fs = require('fs');
const userList = `ako
ate
aso
apo
abo
apa
ama
amin
atin
baso
bago
bata
tula
bato
batok
bakal
balak
balik
barko
daga
dagat
gabi
guhit
galit
dahil
isa
iba
iyo
ina
ipis
ibon
goma
gulo
kaso
keso
laki
laro
luma
luto
lobo
mata
mapa
mali
kahit
kapit
kanin
kahel
mahal
oso
opo
pala
pusa
puso
puno
pila
pula
pera
sira
sama
sana
salo
tira
tabo
tama
tasa
talo
baka
tahol
ahas
apat
akin
abot
ulo
ubo
upo
uri
ulap
ulam
walo
kanta
papel
damit
ipis
hito
hirap
lakad
dasal
tunog
bulak
baso
laman
kanto
baha
takbo
relo
ulap
gusto
hindi
aso
pusa
baka
daga
ibon
isda
pato
bibe
manok
ahas
ipis
pating
pagong
unggoy
ulo
mata
ilong
bibig
labi
dila
buhok
daliri
siko
tuhod
paa
puso
tiyan
likod
pisngi
kuko
kanin
ulam
itlog
gatas
keso
isda
karne
sopas
kendi
saging
pinya
ubas
pakwan
mesa
kama
unan
kumot
baso
tasa
tinidor
bote
lapis
papel
goma
gunting
relo
ulap
ulan
lupa
dagat
ilog
bundok
puno
damo
bato
niyog
dahon
sanga
ate
lolo
lola
guro
doktor
pulis
bata
kusina
banyo
silid
hardin`;

const oldWords = [
  "AKO", "ISA", "OSO", "ULO", "ATE", "IBA", "OPO", "UBO", "ASO", "IYO", "PALA", "UPO",
  "APO", "INA", "PUSA", "URI", "ABO", "IPIS", "PUSO", "ULAP", "APA", "IBON", "PUNO", "ULAM",
  "AMA", "GABI", "PILA", "WALO", "AMIN", "GOMA", "PULA", "KANTA", "ATIN", "GULO", "PERA", "PAPEL",
  "BASO", "KASO", "SIRA", "DAMIT", "BAGO", "KESO", "SAMA", "HITO", "BATA", "KUYA", "SANA",
  "BULA", "LAKI", "SAYA", "HIRAP", "BATO", "LARO", "SALO", "LAKAD", "BATOK", "LUMA", "TIRA", "DASAL",
  "BAKAL", "LUTO", "TABO", "TUNOG", "BALAK", "LOBO", "TAMA", "BULAK", "BALIK", "MATA", "TASA",
  "BAGAL", "MAPA", "TALO", "LAMAN", "BARKO", "MALI", "HAYOP", "KANTO", "DAGA", "KAHIT", "BAKA", "BAHA",
  "DAGAT", "KAPIT", "TAHOL", "TAKBO", "GUHIT", "KAHEL", "APAT", "GALIT", "AKIN", "GUSTO",
  "DAHIL", "MAHAL", "ABOT", "HINDI", "KANIN", "AHAS", "RELO",
  "ISDA", "PATO", "BIBE", "MANOK", "PATING", "PAGONG", "UNGGOY", "ILONG", "BIBIG", "LABI",
  "DILA", "BUHOK", "KAMAY", "DALIRI", "SIKO", "TUHOD", "PAA", "TIYAN", "LIKOD", "PISNGI", "KUKO",
  "ITLOG", "GATAS", "KARNE", "SOPAS", "KENDI", "SAGING", "PINYA", "UBAS", "PAKWAN",
  "MESA", "KAMA", "UNAN", "KUMOT", "TINIDOR", "BOTE", "LAPIS", "AKLAT", "LIBRO", "BAG", "GUNTING",
  "ARAW", "BUWAN", "ULAN", "APOY", "LUPA", "ILOG", "BUNDOK", "DAMO", "NIYOG", "DAHON", "SANGA",
  "NANAY", "TATAY", "LOLO", "LOLA", "GURO", "DOKTOR", "PULIS", "BAHAY", "PALENGKE", "BANYO",
  "SILID", "HARDIN"
];

const parsed = [...new Set(userList.split('\n').map(w => w.trim().toUpperCase()).filter(Boolean))];

const newWords = parsed.filter(w => !oldWords.includes(w));
const removedWords = oldWords.filter(w => !parsed.includes(w));

console.log('Total unique words:', parsed.length);
console.log('New words:', JSON.stringify(newWords));
console.log('Removed words:', JSON.stringify(removedWords));
console.log('Formatted array:', JSON.stringify(parsed));

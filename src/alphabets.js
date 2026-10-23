// The Abc sheet in each language: the letters (or, in Japanese, the hiragana) and what Fatima says for each one.
// [shown, key (the audio file's name), what's said, the word (for the phone's own voice, until the audio is made)]
// English says the sound too ("B… buh… bear."); the other languages say the letter and a word that starts with it.
const en = [
  ['A', 'a', 'A… ah… apple.', 'apple'], ['B', 'b', 'B… buh… bear.', 'bear'], ['C', 'c', 'C… kuh… cat.', 'cat'], ['D', 'd', 'D… duh… dog.', 'dog'],
  ['E', 'e', 'E… eh… egg.', 'egg'], ['F', 'f', 'F… fff… fish.', 'fish'], ['G', 'g', 'G… guh… goat.', 'goat'], ['H', 'h', 'H… hhh… hat.', 'hat'],
  ['I', 'i', 'I… ih… igloo.', 'igloo'], ['J', 'j', 'J… juh… jam.', 'jam'], ['K', 'k', 'K… kuh… kite.', 'kite'], ['L', 'l', 'L… lll… lion.', 'lion'],
  ['M', 'm', 'M… mmm… moon.', 'moon'], ['N', 'n', 'N… nnn… nest.', 'nest'], ['O', 'o', 'O… oh… octopus.', 'octopus'], ['P', 'p', 'P… puh… pig.', 'pig'],
  ['Q', 'q', 'Q… kwuh… queen.', 'queen'], ['R', 'r', 'R… rrr… rabbit.', 'rabbit'], ['S', 's', 'S… sss… sun.', 'sun'], ['T', 't', 'T… tuh… tree.', 'tree'],
  ['U', 'u', 'U… uh… umbrella.', 'umbrella'], ['V', 'v', 'V… vvv… van.', 'van'], ['W', 'w', 'W… wuh… whale.', 'whale'], ['X', 'x', 'X… ks… fox.', 'fox'],
  ['Y', 'y', 'Y… yuh… yo-yo.', 'yo-yo'], ['Z', 'z', 'Z… zzz… zebra.', 'zebra'],
];
const de = [
  ['A', 'a', 'A… wie Affe.', 'Affe'], ['Ä', 'ae', 'Ä… wie Ärmel.', 'Ärmel'], ['B', 'b', 'B… wie Ball.', 'Ball'], ['C', 'c', 'C… wie Clown.', 'Clown'],
  ['D', 'd', 'D… wie Dino.', 'Dino'], ['E', 'e', 'E… wie Ente.', 'Ente'], ['F', 'f', 'F… wie Fisch.', 'Fisch'], ['G', 'g', 'G… wie Gans.', 'Gans'],
  ['H', 'h', 'H… wie Hase.', 'Hase'], ['I', 'i', 'I… wie Igel.', 'Igel'], ['J', 'j', 'J… wie Jacke.', 'Jacke'], ['K', 'k', 'K… wie Katze.', 'Katze'],
  ['L', 'l', 'L… wie Löwe.', 'Löwe'], ['M', 'm', 'M… wie Maus.', 'Maus'], ['N', 'n', 'N… wie Nase.', 'Nase'], ['O', 'o', 'O… wie Ohr.', 'Ohr'],
  ['Ö', 'oe', 'Ö… wie Öl.', 'Öl'], ['P', 'p', 'P… wie Pinguin.', 'Pinguin'], ['Q', 'q', 'Q… wie Qualle.', 'Qualle'], ['R', 'r', 'R… wie Rabe.', 'Rabe'],
  ['S', 's', 'S… wie Sonne.', 'Sonne'], ['ß', 'sz', 'Eszett… wie Fuß.', 'Fuß'], ['T', 't', 'T… wie Tiger.', 'Tiger'], ['U', 'u', 'U… wie Uhr.', 'Uhr'],
  ['Ü', 'ue', 'Ü… wie Überraschung.', 'Überraschung'], ['V', 'v', 'V… wie Vogel.', 'Vogel'], ['W', 'w', 'W… wie Wal.', 'Wal'], ['X', 'x', 'X… wie Xylofon.', 'Xylofon'],
  ['Y', 'y', 'Y… wie Yak.', 'Yak'], ['Z', 'z', 'Z… wie Zebra.', 'Zebra'],
];
const fr = [
  ['A', 'a', 'A… comme ananas.', 'ananas'], ['B', 'b', 'B… comme ballon.', 'ballon'], ['C', 'c', 'C… comme chat.', 'chat'], ['D', 'd', 'D… comme dauphin.', 'dauphin'],
  ['E', 'e', 'E… comme escargot.', 'escargot'], ['F', 'f', 'F… comme fleur.', 'fleur'], ['G', 'g', 'G… comme girafe.', 'girafe'], ['H', 'h', 'H… comme hibou.', 'hibou'],
  ['I', 'i', 'I… comme île.', 'île'], ['J', 'j', 'J… comme jardin.', 'jardin'], ['K', 'k', 'K… comme koala.', 'koala'], ['L', 'l', 'L… comme lion.', 'lion'],
  ['M', 'm', 'M… comme maison.', 'maison'], ['N', 'n', 'N… comme nuage.', 'nuage'], ['O', 'o', 'O… comme oiseau.', 'oiseau'], ['P', 'p', 'P… comme poisson.', 'poisson'],
  ['Q', 'q', 'Q… comme quatre.', 'quatre'], ['R', 'r', 'R… comme renard.', 'renard'], ['S', 's', 'S… comme soleil.', 'soleil'], ['T', 't', 'T… comme tortue.', 'tortue'],
  ['U', 'u', 'U… comme uniforme.', 'uniforme'], ['V', 'v', 'V… comme vache.', 'vache'], ['W', 'w', 'W… comme wagon.', 'wagon'], ['X', 'x', 'X… comme xylophone.', 'xylophone'],
  ['Y', 'y', 'Y… comme yaourt.', 'yaourt'], ['Z', 'z', 'Z… comme zèbre.', 'zèbre'],
];
const es = [
  ['A', 'a', 'A… de árbol.', 'árbol'], ['B', 'b', 'B… de ballena.', 'ballena'], ['C', 'c', 'C… de casa.', 'casa'], ['D', 'd', 'D… de dedo.', 'dedo'],
  ['E', 'e', 'E… de elefante.', 'elefante'], ['F', 'f', 'F… de flor.', 'flor'], ['G', 'g', 'G… de gato.', 'gato'], ['H', 'h', 'H… de helado.', 'helado'],
  ['I', 'i', 'I… de iglú.', 'iglú'], ['J', 'j', 'J… de jirafa.', 'jirafa'], ['K', 'k', 'K… de koala.', 'koala'], ['L', 'l', 'L… de luna.', 'luna'],
  ['M', 'm', 'M… de mano.', 'mano'], ['N', 'n', 'N… de nube.', 'nube'], ['Ñ', 'nn', 'Eñe… de ñandú.', 'ñandú'], ['O', 'o', 'O… de oso.', 'oso'],
  ['P', 'p', 'P… de perro.', 'perro'], ['Q', 'q', 'Q… de queso.', 'queso'], ['R', 'r', 'R… de ratón.', 'ratón'], ['S', 's', 'S… de sol.', 'sol'],
  ['T', 't', 'T… de tortuga.', 'tortuga'], ['U', 'u', 'U… de uva.', 'uva'], ['V', 'v', 'V… de vaca.', 'vaca'], ['W', 'w', 'W… de waterpolo.', 'waterpolo'],
  ['X', 'x', 'X… de xilófono.', 'xilófono'], ['Y', 'y', 'Y… de yoyó.', 'yoyó'], ['Z', 'z', 'Z… de zapato.', 'zapato'],
];
// Japanese: the 46 hiragana, in order (あいうえお…), each with a word that starts with it (を and ん, which no word
// starts with, are said in a short phrase)
const JA = [
  ['あ', 'a', 'あり'], ['い', 'i', 'いぬ'], ['う', 'u', 'うさぎ'], ['え', 'e', 'えんぴつ'], ['お', 'o', 'おにぎり'],
  ['か', 'ka', 'かさ'], ['き', 'ki', 'きつね'], ['く', 'ku', 'くま'], ['け', 'ke', 'けむし'], ['こ', 'ko', 'こあら'],
  ['さ', 'sa', 'さかな'], ['し', 'shi', 'しか'], ['す', 'su', 'すいか'], ['せ', 'se', 'せみ'], ['そ', 'so', 'そら'],
  ['た', 'ta', 'たこ'], ['ち', 'chi', 'ちょう'], ['つ', 'tsu', 'つき'], ['て', 'te', 'てがみ'], ['と', 'to', 'とり'],
  ['な', 'na', 'なす'], ['に', 'ni', 'にんじん'], ['ぬ', 'nu', 'ぬいぐるみ'], ['ね', 'ne', 'ねこ'], ['の', 'no', 'のはら'],
  ['は', 'ha', 'はな'], ['ひ', 'hi', 'ひよこ'], ['ふ', 'fu', 'ふね'], ['へ', 'he', 'へび'], ['ほ', 'ho', 'ほし'],
  ['ま', 'ma', 'まど'], ['み', 'mi', 'みかん'], ['む', 'mu', 'むし'], ['め', 'me', 'めだか'], ['も', 'mo', 'もも'],
  ['や', 'ya', 'やま'], ['ゆ', 'yu', 'ゆき'], ['よ', 'yo', 'よる'],
  ['ら', 'ra', 'らっぱ'], ['り', 'ri', 'りんご'], ['る', 'ru', 'るーぺ'], ['れ', 're', 'れもん'], ['ろ', 'ro', 'ろうそく'],
  ['わ', 'wa', 'わに'], ['を', 'wo', 'ほんを よむ'], ['ん', 'n', 'みかん'],
];
const ja = JA.map(([ch, key, word]) => [ch, key, `${ch}。 ${word}。`, word]);
export const ALPHABETS = { en, de, fr, es, ja };
export const alphabetFor = (lang) => ALPHABETS[lang] || en;

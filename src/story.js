// The books inside the app. Only Different ships with the app now (4 Nov 2026): Falling, Small Wonders, the old
// Rough Lives and Tips for Authors, Two Snakes and the Pip sample were hidden, and their pictures and narration are
// gone from the app to keep it small (they live on in git history; the new books come from the Book Store).

// "Different", written and illustrated by Jörg Schmidt. Converted from the print PDF:
// each printed spread (one picture + one line) becomes one reader page.
export const DIFFERENT = {
  id: 'different',
  copyright: '© 2020 Jörg Schmidt. All rights reserved. First published in 2020.',
  process: 'Written and illustrated by hand by Jörg Schmidt. No AI was used for the words or the pictures.',
  minAge: 4, maxAge: 8, // age rating (the Store Manager's rating wins when set there)
  title: 'Different',
  // PLACEHOLDER synopsis (Jörg will replace this with his own text)
  blurb: 'A gentle story about the quiet feeling of not quite fitting in, and the warm discovery that the things that make us different are the very things that make us belong.',
  author: 'Jörg Schmidt',
  // Translations (18 Oct 2026): the words for each page, in order, and the store description.
  // Until each language has its own narration, the phone reads translated pages aloud in that language.
  langs: {
    de: { title: 'Anders', author: 'Jörg Schmidt',
      blurb: 'Eine sanfte Geschichte über das leise Gefühl, nicht ganz dazuzugehören, und die warme Entdeckung, dass genau das, was uns anders macht, uns dazugehören lässt.',
      texts: ['Anders. Geschrieben und illustriert von Jörg Schmidt.', 'Ich fühle mich anders.', 'Ich fühle mich seltsam.', 'Ich fühle mich komisch.', 'Ich fühle mich ängstlich.', 'Ich fühle mich merkwürdig.', 'Ich fühle mich fehl am Platz.', 'Ich fühle mich schräg.', 'Ich fühle mich zurückgelassen.', 'Ich fühle mich ausgeschlossen.', 'Ich fühle mich hässlich.', 'Ich fühle mich unpassend.', 'Ich fühle mich einzigartig.', 'Ich fühle mich besonders.', 'Ich fühle mich geliebt.', 'Ich fühle mich außergewöhnlich.'] },
    fr: { title: 'Différent', author: 'Jörg Schmidt',
      blurb: 'Une douce histoire sur ce petit sentiment de ne pas tout à fait trouver sa place, et la chaleureuse découverte que ce qui nous rend différents est justement ce qui nous fait appartenir.',
      texts: ['Différent. Écrit et illustré par Jörg Schmidt.', 'Je me sens différent.', 'Je me sens étrange.', 'Je me sens bizarre.', 'Je me sens anxieux.', 'Je me sens tout drôle.', 'Je ne me sens pas à ma place.', 'Je me sens loufoque.', 'Je me sens laissé derrière.', 'Je me sens mis à l’écart.', 'Je me sens moche.', 'Je me sens incompatible.', 'Je me sens unique.', 'Je me sens spécial.', 'Je me sens aimé.', 'Je me sens extraordinaire.'] },
    es: { title: 'Diferente', author: 'Jörg Schmidt',
      blurb: 'Una historia tierna sobre esa sensación silenciosa de no encajar del todo, y el cálido descubrimiento de que lo que nos hace diferentes es justo lo que nos hace pertenecer.',
      texts: ['Diferente. Escrito e ilustrado por Jörg Schmidt.', 'Me siento diferente.', 'Me siento extraño.', 'Me siento raro.', 'Me siento ansioso.', 'Me siento como un bicho raro.', 'Me siento fuera de lugar.', 'Me siento estrafalario.', 'Me siento rezagado.', 'Me siento excluido.', 'Me siento feo.', 'Me siento incompatible.', 'Me siento único.', 'Me siento especial.', 'Me siento querido.', 'Me siento extraordinario.'] },
    ja: { title: 'ちがう', author: 'ヨルク・シュミット',
      blurb: 'みんなと すこし ちがう きがする――そんな しずかな きもちと、ちがう ところこそが じぶんの いばしょを つくってくれる、という あたたかい はっけんの おはなし。',
      texts: ['ちがう。 さく・え ヨルク・シュミット。', 'みんなと ちがう きもち。', 'ふしぎな きもち。', 'へんてこな きもち。', 'ふあんな きもち。', 'みょうな きもち。', 'いばしょが ない きもち。', 'おばけ みたいな きもち。', 'おいていかれた きもち。', 'なかまはずれの きもち。', 'じぶんが みにくい きもち。', 'なにとも あわない きもち。', 'せかいで ひとつだけの きもち。', 'とくべつな きもち。', 'あいされて いる きもち。', 'とびきり すてきな きもち。'] },
    ar: { title: 'مختلف', author: 'يورغ شميت',
      blurb: 'قصة لطيفة عن ذلك الإحساس الهادئ بأننا لا ننتمي تمامًا، وعن الاكتشاف الدافئ بأن ما يجعلنا مختلفين هو بالضبط ما يجعلنا ننتمي.',
      texts: ['مختلف. تأليف ورسوم يورغ شميت.', 'أشعر أنني مختلف.', 'أشعر أنني غريب.', 'أشعر أنني عجيب.', 'أشعر بالقلق.', 'أشعر أنني غريب الأطوار.', 'أشعر أنني لست في مكاني.', 'أشعر أنني لا أشبه أحدًا.', 'أشعر أنهم تركوني وراءهم.', 'أشعر أنني مُستبعَد.', 'أشعر أنني قبيح.', 'أشعر أنني لا أنسجم مع أحد.', 'أشعر أنني فريد.', 'أشعر أنني مميَّز.', 'أشعر أنني محبوب.', 'أشعر أنني استثنائي.'] },
  },
  syllables: {
    different: ['dif', 'fer', 'ent'], strange: ['strange'], anxious: ['anx', 'ious'], weird: ['weird'],
    freaky: ['freak', 'y'], behind: ['be', 'hind'], ugly: ['ug', 'ly'], incompatible: ['in', 'com', 'pat', 'i', 'ble'],
    unique: ['u', 'nique'], special: ['spe', 'cial'], loved: ['loved'], extraordinary: ['ex', 'tra', 'or', 'di', 'nar', 'y'],
    illustrated: ['il', 'lus', 'trat', 'ed'], written: ['writ', 'ten'], place: ['place'],
  },
  pages: [
    { pid: 'd01', titlePage: true, image: require('../assets/books/different/d01.jpg'), w: 1600, h: 1600, text: "Different. Written and illustrated by Jörg Schmidt." },
    { pid: 'd02', image: require('../assets/books/different/d02.jpg'), w: 1600, h: 1600, text: "I feel different." },
    { pid: 'd03', image: require('../assets/books/different/d03.jpg'), w: 1600, h: 1600, text: "I feel strange." },
    { pid: 'd04', image: require('../assets/books/different/d04.jpg'), w: 1600, h: 1600, text: "I feel odd." },
    { pid: 'd05', image: require('../assets/books/different/d05.jpg'), w: 1600, h: 1600, text: "I feel anxious." },
    { pid: 'd06', image: require('../assets/books/different/d06.jpg'), w: 1600, h: 1600, text: "I feel weird." },
    { pid: 'd07', image: require('../assets/books/different/d07.jpg'), w: 1600, h: 1600, text: "I feel out of place." },
    { pid: 'd08', image: require('../assets/books/different/d08.jpg'), w: 1600, h: 1600, text: "I feel freaky." },
    { pid: 'd09', image: require('../assets/books/different/d09.jpg'), w: 1600, h: 1600, text: "I feel left behind." },
    { pid: 'd10', image: require('../assets/books/different/d10.jpg'), w: 1600, h: 1600, text: "I feel left out." },
    { pid: 'd11', image: require('../assets/books/different/d11.jpg'), w: 1600, h: 1600, text: "I feel ugly." },
    { pid: 'd12', image: require('../assets/books/different/d12.jpg'), w: 1600, h: 1600, text: "I feel incompatible." },
    { pid: 'd13', image: require('../assets/books/different/d13.jpg'), w: 1600, h: 1600, text: "I feel unique." },
    { pid: 'd14', image: require('../assets/books/different/d14.jpg'), w: 1600, h: 1600, text: "I feel special." },
    { pid: 'd15', image: require('../assets/books/different/d15.jpg'), w: 1600, h: 1600, text: "I feel loved." },
    { pid: 'd16', image: require('../assets/books/different/d16.jpg'), w: 1600, h: 1600, text: "I feel extraordinary." },
  ],
};

export const STORIES = [DIFFERENT];

// Split text into words with their character ranges, so read-aloud progress can be mapped to a word.
export function tokenize(text) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text))) out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

// a word without the punctuation around it (letters of every language are kept: é, ü, ñ, かな…)
export function cleanWord(w) {
  return w.replace(/[.,!?;:"“”„‘«»()\[\]¡¿。、!?「」『』…—–・]/g, '').replace(/^['’-]+|['’-]+$/g, '');
}

export function syllablesFor(story, word) {
  const k = word.toLowerCase();
  if (story.syllables && story.syllables[k]) return story.syllables[k];
  if (k.length <= 3) return [k];
  return k.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/g) || [k];
}

// The books shown in My Library and the Book Store for now (Jörg will add two more later).
// The others stay in the app, just hidden: add their ids back here to show them again.
export const SHOWN_BOOKS = ['different']; // (two-snakes hidden 19 Oct 2026; the built-in Rough Lives and Tips for Authors hidden 3 Nov 2026:
// Jörg's own editable versions are in the Book Store now, so the old ones show nowhere)

// A book in another language: its translated title, description and page words (books without that
// language stay as they are). The reader then reads it in that language.
export function localizeStory(story, lang) {
  const L = story && story.langs && lang && lang !== 'en' ? story.langs[lang] : null;
  if (!L) return story;
  return {
    ...story,
    lang,
    title: L.title || story.title,
    author: L.author || story.author,
    blurb: L.blurb || story.blurb,
    syllables: {}, // the sounding-out parts are English
    pages: story.pages.map((p, i) => (L.texts && L.texts[i] != null ? { ...p, text: L.texts[i] } : p)),
  };
}

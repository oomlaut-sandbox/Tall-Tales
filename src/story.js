// Sample story. Real books will come from the upload portal; this file mirrors that shape.
// Hotspot x/y are fractions of the original image size.
export const SAMPLE_STORY = {
  id: 'pip',
  title: 'Pip and the Pond of Stars',
  syllables: {
    turtle: ['tur', 'tle'], little: ['lit', 'tle'], morning: ['mor', 'ning'], twinkled: ['twin', 'kled'],
    leopard: ['leo', 'pard'], hiding: ['hi', 'ding'], bicycle: ['bi', 'cy', 'cle'], almost: ['al', 'most'],
    needles: ['nee', 'dles'], whispered: ['whis', 'pered'], hundred: ['hun', 'dred'], asleep: ['a', 'sleep'],
    above: ['a', 'bove'], around: ['a', 'round'], tired: ['tired'], climbed: ['climbed'], bobbed: ['bobbed'],
  },
  pages: [
    {
      pid: 'p1', image: require('../assets/pages/p1.jpg'), w: 900, h: 1053,
      text: 'Pip the turtle swam in a pond full of stars. The stars bobbed around him like bright little boats. “Where do you all go in the morning?” Pip asked. The stars only twinkled.',
      hotspots: [
        { x: 0.57, y: 0.66, say: 'Pip the turtle', word: 'turtle' },
        { x: 0.33, y: 0.18, say: 'A twinkling star', word: 'stars' },
        { x: 0.5, y: 0.88, say: 'Smooth, round rocks' },
      ],
    },
    {
      pid: 'p2', image: require('../assets/pages/p2.jpg'), w: 900, h: 975,
      text: 'When the sun came up, the stars were gone. Pip climbed out of the pond to look for them. A leopard sat high on a warm rock. “The stars are not lost,” said Leopard. “They are only hiding behind the sky.”',
      hotspots: [
        { x: 0.69, y: 0.39, say: 'Leopard, resting on a rock', word: 'leopard' },
        { x: 0.1, y: 0.6, say: 'A tall giraffe' },
        { x: 0.15, y: 0.05, say: 'The morning sun', word: 'sun' },
      ],
    },
    {
      pid: 'p3', image: require('../assets/pages/p3.jpg'), w: 900, h: 817,
      text: 'Next, Pip met a man on a very tall bicycle. It had five wheels and a horn. “Climb up!” said the man. “From up here, you can almost touch the sky.” Pip held on tight.',
      hotspots: [
        { x: 0.42, y: 0.42, say: 'Toot toot! The horn', word: 'horn' },
        { x: 0.47, y: 0.88, say: 'Five wheels', word: 'wheels' },
        { x: 0.85, y: 0.82, say: 'Two ladies out for a walk' },
      ],
    },
    {
      pid: 'p4', image: require('../assets/pages/p4.jpg'), w: 900, h: 1053,
      text: 'They rode until the day grew tired. Pip curled up on a soft bed of pine needles. Above the trees, one star blinked, then two, then a hundred. “There you are,” Pip whispered, and he fell asleep.',
      hotspots: [{ x: 0.5, y: 0.5, say: 'Soft pine needles', word: 'needles' }],
    },
  ],
};


// "Different", written and illustrated by Jörg Schmidt. Converted from the print PDF:
// each printed spread (one picture + one line) becomes one reader page.
export const DIFFERENT = {
  id: 'different',
  title: 'Different',
  author: 'Jörg Schmidt',
  syllables: {
    different: ['dif', 'fer', 'ent'], strange: ['strange'], anxious: ['anx', 'ious'], weird: ['weird'],
    freaky: ['freak', 'y'], behind: ['be', 'hind'], ugly: ['ug', 'ly'], incompatible: ['in', 'com', 'pat', 'i', 'ble'],
    unique: ['u', 'nique'], special: ['spe', 'cial'], loved: ['loved'], extraordinary: ['ex', 'tra', 'or', 'di', 'nar', 'y'],
    illustrated: ['il', 'lus', 'trat', 'ed'], written: ['writ', 'ten'], place: ['place'],
  },
  pages: [
    { pid: 'd01', image: require('../assets/books/different/d01.jpg'), w: 1600, h: 1600, text: "Different. Written and illustrated by Jörg Schmidt." },
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

export const STORIES = [DIFFERENT, SAMPLE_STORY];

// Split text into words with their character ranges, so read-aloud progress can be mapped to a word.
export function tokenize(text) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text))) out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

export function cleanWord(w) {
  return w.replace(/[^A-Za-z'’-]/g, '');
}

export function syllablesFor(story, word) {
  const k = word.toLowerCase();
  if (story.syllables && story.syllables[k]) return story.syllables[k];
  if (k.length <= 3) return [k];
  return k.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/g) || [k];
}

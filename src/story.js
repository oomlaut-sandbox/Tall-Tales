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
  // PLACEHOLDER synopsis (Jörg will replace this with his own text)
  blurb: 'A gentle story about the quiet feeling of not quite fitting in, and the warm discovery that the things that make us different are the very things that make us belong.',
  author: 'Jörg Schmidt',
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

// "Falling" by Jörg Schmidt: converted from his PDF (cover, then words page + picture page pairs).
export const FALLING = {
  id: 'falling',
  title: 'Falling',
  author: 'Jörg Schmidt',
  syllables: {
    falling: ['fall', 'ing'], raindrop: ['rain', 'drop'], raindrops: ['rain', 'drops'], shining: ['shin', 'ing'],
    rolling: ['roll', 'ing'], appeared: ['ap', 'peared'], beauty: ['beau', 'ty'], swallow: ['swal', 'low'],
    suddenly: ['sud', 'den', 'ly'], bumblebee: ['bum', 'ble', 'bee'], hiding: ['hid', 'ing'], afraid: ['a', 'fraid'],
    closer: ['clos', 'er'], opened: ['o', 'pened'], different: ['dif', 'fer', 'ent'], returned: ['re', 'turned'],
    illustrated: ['il', 'lus', 'trat', 'ed'], written: ['writ', 'ten'], happy: ['hap', 'py'], along: ['a', 'long'],
  },
  pages: [
    { pid: 'f01', titlePage: true, image: require('../assets/books/falling/f01.jpg'), w: 1600, h: 1600, text: "Falling. Written and illustrated by Jörg Schmidt." },
    { pid: 'f02', image: require('../assets/books/falling/f02.jpg'), w: 1600, h: 1600, text: "The sun was shining bright over the rolling hills." },
    { pid: 'f03', image: require('../assets/books/falling/f03.jpg'), w: 1600, h: 1600, text: "Then the sky turned grey and a dark storm cloud appeared." },
    { pid: 'f04', image: require('../assets/books/falling/f04.jpg'), w: 1600, h: 1600, text: "From it fell a tiny raindrop." },
    { pid: 'f05', image: require('../assets/books/falling/f05.jpg'), w: 1600, h: 1600, text: "The raindrop looked out over the fields below and smiled at all the beauty." },
    { pid: 'f06', image: require('../assets/books/falling/f06.jpg'), w: 1600, h: 1600, text: "Soon she met other raindrops and they laughed and played." },
    { pid: 'f07', image: require('../assets/books/falling/f07.jpg'), w: 1600, h: 1600, text: "Then, along came a swallow." },
    { pid: 'f08', image: require('../assets/books/falling/f08.jpg'), w: 1600, h: 1600, text: "The swallow said, “How can you be so happy?” “What do you mean?” asked the raindrop. “You’re falling!”" },
    { pid: 'f09', image: require('../assets/books/falling/f09.jpg'), w: 1600, h: 1600, text: "The raindrop suddenly became very sad." },
    { pid: 'f10', image: require('../assets/books/falling/f10.jpg'), w: 1600, h: 1600, text: "Then the raindrop met a bumblebee, hiding under the leaves of an old oak tree." },
    { pid: 'f11', image: require('../assets/books/falling/f11.jpg'), w: 1600, h: 1600, text: "“Why so sad?” asked the bumblebee. “I’m scared,” said the raindrop. “Don’t be afraid. You’re not alone. I’ll be with you.”" },
    { pid: 'f12', image: require('../assets/books/falling/f12.jpg'), w: 1600, h: 1600, text: "As the ground came closer and closer, the raindrop closed her eyes and… BLOOP!" },
    { pid: 'f13', image: require('../assets/books/falling/f13.jpg'), w: 1600, h: 1600, text: "When she opened her eyes, she saw she wasn’t alone. She felt different. But it felt good." },
    { pid: 'f14', image: require('../assets/books/falling/f14.jpg'), w: 1600, h: 1600, text: "The sun returned and the sky was bright and blue." },
  ],
};

// "Small Wonders": six short nature poems. Pictures are public-domain natural history plates from the 1800s
// (Wikimedia Commons): Köhler's Medizinal-Pflanzen 1887 (dandelion, fern, oak), Lovell's Edible Mollusca 1884
// (snail), Hussey's Illustrations of British Mycology 1847 (mushroom), Audubon's Birds of America 1827–38 (robin).
export const SMALL_WONDERS = {
  id: 'small-wonders',
  title: 'Small Wonders',
  author: 'Oomlaut',
  storeShelf: 'new',
  blurb: 'Six little poems about the small wonders of nature, from a dandelion clock to a singing robin, each with a beautiful drawing from a natural history book of the 1800s.',
  syllables: {
    dandelion: ['dan', 'de', 'li', 'on'], little: ['lit', 'tle'], gently: ['gent', 'ly'], sleepy: ['sleep', 'y'],
    lacy: ['la', 'cy'], hurry: ['hur', 'ry'], worry: ['wor', 'ry'], wherever: ['wher', 'ev', 'er'],
    mushrooms: ['mush', 'rooms'], beneath: ['be', 'neath'], spotted: ['spot', 'ted'], village: ['vil', 'lage'],
    overnight: ['o', 'ver', 'night'], acorn: ['a', 'corn'], mighty: ['might', 'y'], branches: ['branch', 'es'],
    robin: ['rob', 'in'], toadstools: ['toad', 'stools'], become: ['be', 'come'], wonders: ['won', 'ders'],
    tallest: ['tall', 'est'], orange: ['or', 'ange'], morning: ['morn', 'ing'], slowly: ['slow', 'ly'], unfurl: ['un', 'furl'],
    rushing: ['rush', 'ing'], snowy: ['snow', 'y'], under: ['un', 'der'], away: ['a', 'way'], along: ['a', 'long'],
    nature: ['na', 'ture'], drawings: ['draw', 'ings'], poems: ['po', 'ems'], opens: ['o', 'pens'],
  },
  pages: [
    { pid: 'sw01', titlePage: true, image: require('../assets/books/small-wonders/cover.jpg'), w: 1600, h: 1600, text: 'Small Wonders. Nature poems with drawings from the 1800s.' },
    { pid: 'sw02', image: require('../assets/books/small-wonders/dandelion.jpg'), w: 1600, h: 1600, text: 'A dandelion clock,\na moon of fluff and light.\nI make a wish and blow,\nand off the seeds take flight.' },
    { pid: 'sw03', image: require('../assets/books/small-wonders/fern.jpg'), w: 1600, h: 1600, text: 'The fern is curled up tight,\na sleepy little swirl.\nThen slowly, day by day,\nI watch its leaves unfurl.' },
    { pid: 'sw04', image: require('../assets/books/small-wonders/snail.jpg'), w: 1600, h: 1600, text: 'The snail is never rushing,\nit doesn’t need to worry.\nIt takes its house along,\nso why be in a hurry?' },
    { pid: 'sw05', image: require('../assets/books/small-wonders/mushroom.jpg'), w: 1600, h: 1600, text: 'The rain has gone away.\nLook under all the trees!\nRed hats with snowy spots,\nas tiny as you please.' },
    { pid: 'sw06', image: require('../assets/books/small-wonders/acorn.jpg'), w: 1600, h: 1600, text: 'A little acorn sleeps\nbeneath its cap of brown.\nOne day it will become\nthe tallest oak in town.' },
    { pid: 'sw07', image: require('../assets/books/small-wonders/robin.jpg'), w: 1600, h: 1600, text: 'A robin in the tree\npuffs out her orange chest.\nShe sings her morning song,\nthe song she knows the best.' },
  ],
};

// "The Rough Lives of Animals": Jörg's pictures, short darkly funny verses. The cover is the ostrich, no words.
export const ROUGH_LIVES = {
  id: 'rough-lives',
  title: 'The Rough Lives of Animals',
  author: 'Oomlaut',
  storeShelf: 'new',
  blurb: 'A worried cat, an elephant who is totally fine, a hedgehog who needs a hug, a wolf nobody follows and an ostrich who has stopped reading the news. Deadpan one-liners in the spirit of the old newspaper cartoons, for anxious times.',
  syllables: {
    animals: ['an', 'i', 'mals'], rough: ['rough'], worried: ['wor', 'ried'], unravels: ['un', 'rav', 'els'],
    everything: ['ev', 'ery', 'thing'], elephant: ['el', 'e', 'phant'], balloon: ['bal', 'loon'], holding: ['hold', 'ing'],
    morning: ['morn', 'ing'], nobody: ['no', 'bod', 'y'], hustle: ['hus', 'tle'], ostrich: ['os', 'trich'],
    calmer: ['calm', 'er'], noticed: ['no', 'ticed'], bottom: ['bot', 'tom'], away: ['a', 'way'],
    hedgehog: ['hedge', 'hog'], very: ['ver', 'y'], circles: ['cir', 'cles'], thursday: ['thurs', 'day'],
    networking: ['net', 'work', 'ing'], mittens: ['mit', 'tens'], suddenly: ['sud', 'den', 'ly'], realized: ['re', 'al', 'ized'],
    gerald: ['ger', 'ald'], experts: ['ex', 'perts'], confident: ['con', 'fi', 'dent'], unbeknownst: ['un', 'be', 'knownst'],
    florida: ['flor', 'i', 'da'], introductions: ['in', 'tro', 'duc', 'tions'], afternoon: ['af', 'ter', 'noon'], forty: ['for', 'ty'],
    doris: ['dor', 'is'], honestly: ['hon', 'est', 'ly'], sunset: ['sun', 'set'], posted: ['post', 'ed'], started: ['start', 'ed'], instead: ['in', 'stead'], photo: ['pho', 'to'],
  },
  pages: [
    { pid: 'rl01', titlePage: true, image: require('../assets/books/rough-lives/cover.jpg'), w: 1600, h: 1600, text: 'The Rough Lives of Animals.' },
    { pid: 'rl02', image: require('../assets/books/rough-lives/cat.jpg'), w: 1600, h: 1600, text: 'Suddenly, Mittens realized the yarn had been watching her the whole time.' },
    { pid: 'rl03', image: require('../assets/books/rough-lives/elephant.jpg'), w: 1600, h: 1600, text: 'Despite what the experts said, Gerald remained confident in the balloon.' },
    { pid: 'rl04', image: require('../assets/books/rough-lives/fox.jpg'), w: 1600, h: 1600, text: 'Unbeknownst to Fox, the mouse had moved to Florida in March.' },
    { pid: 'rl06', image: require('../assets/books/rough-lives/snail.jpg'), w: 1600, h: 1600, text: '“Sure, it’s small. But it’s paid off.”' },
    { pid: 'rl07', image: require('../assets/books/rough-lives/hedgehog.jpg'), w: 1600, h: 1600, text: 'Free hugs. Day forty-one.' },
    { pid: 'rl08', image: require('../assets/books/rough-lives/dogs.jpg'), w: 1600, h: 1600, text: 'Introductions at the dog park often went well into the afternoon.' },
    { pid: 'rl09', image: require('../assets/books/rough-lives/wolf.jpg'), w: 1600, h: 1600, text: 'Wolf skipped the howl and posted the sunset instead. Two likes, both from his mother.' },
    { pid: 'rl10', image: require('../assets/books/rough-lives/cover.jpg'), w: 1600, h: 1600, text: 'Doris had stopped watching the news, and honestly, she had never felt calmer.' },
  ],
};

// "Two Snakes Walk into a Bar": Jörg's drawings (the rabbit is by Annika). Absurd, surreal, gentle.
// The cover is the snakes, no words.
export const TWO_SNAKES = {
  id: 'two-snakes',
  title: 'Two Snakes Walk into a Bar',
  author: 'Oomlaut',
  storeShelf: 'new',
  blurb: 'A bean-shaped bee, a hamster who goes nowhere at all, an elephant made mostly of quiet and a horse who isn’t sure what he is. A small, strange book about how weird and how beautiful the world is.',
  syllables: {
    snakes: ['snakes'], chocolate: ['choc', 'late'], somewhere: ['some', 'where'], rabbit: ['rab', 'bit'],
    nobody: ['no', 'bod', 'y'], around: ['a', 'round'], began: ['be', 'gan'], elephant: ['el', 'e', 'phant'],
    mostly: ['most', 'ly'], hamster: ['ham', 'ster'], nowhere: ['no', 'where'], magic: ['mag', 'ic'],
    anyway: ['an', 'y', 'way'], forgot: ['for', 'got'], tuesdays: ['tues', 'days'], happy: ['hap', 'py'],
    scared: ['scared'], robot: ['ro', 'bot'], giant: ['gi', 'ant'], little: ['lit', 'tle'], beautiful: ['beau', 'ti', 'ful'],
    strange: ['strange'], very: ['ver', 'y'], about: ['a', 'bout'], neither: ['nei', 'ther'],
  },
  pages: [
    { pid: 'ts01', titlePage: true, image: require('../assets/books/two-snakes/snakes.jpg'), w: 1600, h: 1600, text: 'Two Snakes Walk into a Bar.' },
    { pid: 'ts02', image: require('../assets/books/two-snakes/snakes.jpg'), w: 1600, h: 1600, text: 'Two snakes walked into a bar. It was a chocolate bar. They were very small snakes.' },
    { pid: 'ts03', image: require('../assets/books/two-snakes/rabbit.jpg'), w: 1600, h: 1600, text: 'Somewhere, a rabbit is having the best day of her whole life, and nobody knows why. Not even the rabbit.' },
    { pid: 'ts04', image: require('../assets/books/two-snakes/dogs.jpg'), w: 1600, h: 1600, text: 'Two dogs met in the park and went around and around, until nobody could tell where one dog ended and the other began.' },
    { pid: 'ts05', image: require('../assets/books/two-snakes/elephant.jpg'), w: 1600, h: 1600, text: 'An elephant is mostly made of quiet. You can hear it if you stand very close.' },
    { pid: 'ts06', image: require('../assets/books/two-snakes/hamster.jpg'), w: 1600, h: 1600, text: 'The hamster ran all night and went nowhere at all, which, if you think about it, is a kind of magic.' },
    { pid: 'ts07', image: require('../assets/books/two-snakes/bee.jpg'), w: 1600, h: 1600, text: 'This bee is shaped like a bean. She does not know this. She flies anyway.' },
    { pid: 'ts08', image: require('../assets/books/two-snakes/fox.jpg'), w: 1600, h: 1600, text: 'The fox jumped so high, he forgot what he was jumping for. Up there, it didn’t matter.' },
    { pid: 'ts09', image: require('../assets/books/two-snakes/wolf.jpg'), w: 1600, h: 1600, text: 'Wolf’s hair stands up when he is happy, when he is scared, and on Tuesdays.' },
    { pid: 'ts10', image: require('../assets/books/two-snakes/horse.jpg'), w: 1600, h: 1600, text: '“What are you?” asked the blue thing. “I’m not sure yet,” said the horse. “Me neither,” said the blue thing.' },
    { pid: 'ts11', image: require('../assets/books/two-snakes/robot.jpg'), w: 1600, h: 1600, text: 'The robot took one giant step, and the whole world gave a little hop. What a strange, beautiful place it is.' },
  ],
};

export const STORIES = [DIFFERENT, SMALL_WONDERS, ROUGH_LIVES, TWO_SNAKES, FALLING, SAMPLE_STORY];

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

// The books shown in My Library and the Book Store for now (Jörg will add two more later).
// The others stay in the app, just hidden: add their ids back here to show them again.
export const SHOWN_BOOKS = ['different', 'rough-lives', 'two-snakes'];

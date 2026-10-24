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

// "Falling" by Jörg Schmidt: converted from his PDF (cover, then words page + picture page pairs).
export const FALLING = {
  id: 'falling',
  minAge: 4, maxAge: 8, // age rating (the Store Manager's rating wins when set there)
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
  minAge: 3, maxAge: 7, // age rating (the Store Manager's rating wins when set there)
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
  minAge: 6, maxAge: 10, // age rating (the Store Manager's rating wins when set there)
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
  minAge: 4, maxAge: 8, // age rating (the Store Manager's rating wins when set there)
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

// "Tips for Authors": the guide for parents and young authors, as a book in My Library (not in the Book Store).
// Its pictures are borrowed from the other books.
export const TIPS = {
  id: 'tips',
  minAge: 18, // a guide for grown-ups: hidden whenever a child's age is set in Settings
  title: 'Tips for Authors',
  author: 'Oomlaut',
  libraryOnly: true,
  // Translations (18 Oct 2026): the words for each page, in order.
  langs: {
    de: { title: 'Tipps für Autoren', texts: [
      'Tipps für Autoren. Ideen für eigene Bücher, für Erwachsene und junge Autoren.',
      'Jede Familie hat Geschichten, die es wert sind, aufbewahrt zu werden. Du brauchst nur eine Kamera, ein paar Worte und ein wenig Zeit. Hier sind ein paar Ideen für den Anfang.',
      'Unser großes Abenteuer heute. Ein Spaziergang im Wald, ein Besuch bei Oma, der erste Wackelzahn. Mach für jede Seite ein Foto und lass dein Kind erzählen, was passiert ist. Zuerst haben wir … dann haben wir … am schönsten war …',
      'Sammeln. Steine, Käfer, Blätter und Blumen. Fotografiere oder male jeden Fund, gib ihm einen Namen und eine Tatsache, echt oder ausgedacht. Schon hast du dein eigenes Naturbuch.',
      'Zeichnungen. Fotografiere eine Zeichnung, und sie wird zu einer Seite. Lass dein Kind die Geschichte erzählen und schreib seine Worte genau so auf, wie es sie sagt.',
      'Lektionen. Eine Geschichte kann große Dinge sanfter machen: ein neues Geschwisterchen, eine neue Schule, Zähneputzen, Abschied nehmen. Nimm eure eigenen Fotos, damit die Geschichte von euch handelt.',
      'Spaß in der Gruppe. Eine ganze Klasse kann zusammen ein Buch machen. Jedes Kind gestaltet eine Seite: ein Klassenausflug, ein Lieblingstier oder was es einmal werden will.',
      'Lies es vor. Nimm deine eigene Stimme beim Vorlesen auf. In vielen Jahren wird genau diese Stimme der Schatz sein.',
      'Noch mehr Ideen. Ein Buch „Alles über mich“ zu jedem Geburtstag. Die Abenteuer eines Lieblingskuscheltiers im Haus. Der Traum von letzter Nacht. Opa erzählt, wie es war, als er klein war.',
      'Ein paar Tipps. Ein oder zwei Sätze pro Seite reichen völlig. Fotografiere bei Tageslicht. Die Seiten sind quadratisch, lass also Platz an den Rändern. Nimm eine Zeichnung deines Kindes als Titelbild.',
      'Veröffentlichen. Autorinnen und Autoren, ob jung oder alt, können ihre Bücher an den Oomlaut-Buchladen schicken. Wenn dein Buch fertig ist, erfährst du auf oomlaut.com, wie es geht.',
      'Noch mehr Ideen gefällig? Besuche das Ideenzimmer unter Ideen und Hilfe. Dort findest du viele weitere Bücher zum gemeinsamen Gestalten, von großen Momenten und Alltagsabläufen bis zu Gefühlen und Familiengeschichten.',
    ] },
    fr: { title: 'Conseils pour les auteurs', texts: [
      'Conseils pour les auteurs. Des idées pour créer vos propres livres, pour les grands comme pour les jeunes auteurs.',
      'Chaque famille a des histoires qui méritent d’être gardées. Il suffit d’un appareil photo, de quelques mots et d’un peu de temps. Voici quelques idées pour commencer.',
      'Notre grande aventure du jour. Une balade en forêt, une visite chez Mamie, une première dent tombée. Prenez une photo pour chaque page et laissez votre enfant raconter ce qui s’est passé. D’abord on a… puis on a… le meilleur moment, c’était…',
      'Les collections. Cailloux, insectes, feuilles et fleurs. Photographiez ou dessinez chaque trouvaille, puis donnez-lui un nom et une anecdote, vraie ou inventée. Et voilà votre propre guide de la nature.',
      'Les dessins. Prenez un dessin en photo et il devient une page. Laissez votre enfant raconter l’histoire, et écrivez ses mots exactement comme il les dit.',
      'Les leçons. Une histoire peut rendre les grands moments plus doux : un bébé qui arrive, une nouvelle école, le brossage des dents, dire au revoir. Utilisez vos propres photos, pour que l’histoire parle de lui.',
      'À plusieurs. Toute une classe peut faire un livre ensemble. Chaque enfant crée une page : une sortie de classe, un animal préféré, ou ce qu’il veut faire plus tard.',
      'Lisez-le à voix haute. Enregistrez votre propre voix en lisant le livre. Dans quelques années, cette voix sera un trésor.',
      'D’autres idées. Un livre « Tout sur moi » à chaque anniversaire. Les aventures d’un jouet préféré dans la maison. Le rêve de la nuit dernière. Papi qui raconte quand il était petit.',
      'Quelques conseils. Une ou deux phrases par page, c’est bien assez. Prenez les photos à la lumière du jour. Les pages sont carrées : laissez de la place sur les bords. Utilisez un dessin de votre enfant pour la couverture.',
      'Être publié. Les auteurs, petits et grands, peuvent envoyer leurs livres à la librairie Oomlaut. Quand votre livre est prêt, rendez-vous sur oomlaut.com pour savoir comment faire.',
      'Besoin de plus d’idées ? Visitez la Salle des idées dans Idées et aide. Vous y trouverez bien d’autres livres à faire ensemble, des grands moments et routines du quotidien aux émotions et histoires de famille.',
    ] },
    es: { title: 'Consejos para autores', texts: [
      'Consejos para autores. Ideas para hacer tus propios libros, para adultos y jóvenes autores.',
      'Cada familia tiene historias que vale la pena guardar. Solo necesitas una cámara, unas pocas palabras y un poco de tiempo. Aquí tienes algunas ideas para empezar.',
      'Nuestra gran aventura de hoy. Un paseo por el bosque, una visita a la abuela, el primer diente que se cae. Haz una foto para cada página y deja que tu hijo cuente lo que pasó. Primero… luego… lo mejor fue…',
      'Colecciones. Piedras, bichos, hojas y flores. Fotografía o dibuja cada hallazgo, y dale un nombre y un dato, real o inventado. Ya tienes tu propia guía de campo.',
      'Dibujos. Haz una foto de un dibujo y se convierte en una página. Deja que tu hijo cuente la historia y escribe sus palabras tal como las dice.',
      'Lecciones. Un cuento puede hacer más suaves las cosas grandes: un hermanito nuevo, un colegio nuevo, lavarse los dientes, decir adiós. Usa tus propias fotos, para que el cuento hable de él.',
      'En grupo. Toda una clase puede hacer un libro juntos. Cada niño hace una página: una excursión, su animal favorito o lo que quiere ser de mayor.',
      'Léelo en voz alta. Graba tu propia voz leyendo el libro. Dentro de muchos años, esa voz será el tesoro.',
      'Más ideas. Un libro «Todo sobre mí» en cada cumpleaños. Las aventuras de un juguete favorito por la casa. El sueño de anoche. El abuelo recordando cuando era pequeño.',
      'Algunos consejos. Una o dos frases por página son suficientes. Haz las fotos con luz de día. Las páginas son cuadradas, así que deja espacio en los bordes. Usa un dibujo de tu hijo para la portada.',
      'Publica tu libro. Autores pequeños y grandes pueden enviar sus libros a la librería de Oomlaut. Cuando tu libro esté listo, visita oomlaut.com para saber cómo.',
      '¿Necesitas más ideas? Visita la Sala de ideas en Ideas y ayuda. Encontrarás muchos más libros para hacer juntos, desde grandes momentos y rutinas diarias hasta sentimientos e historias de familia.',
    ] },
    ja: { title: '作家のためのヒント', texts: [
      '作家のためのヒント。おとなにも、わかい作家にも。じぶんの本をつくるためのアイデア集です。',
      'どの家族にも、のこしておきたいお話があります。ひつようなのは、カメラと、すこしのことばと、すこしの時間だけ。はじめるためのアイデアをしょうかいします。',
      'きょうの だいぼうけん。森のおさんぽ、おばあちゃんの家、はじめてぬけた歯。ページごとに写真を1まいとって、お子さんに何があったかを話してもらいましょう。さいしょに…それから…いちばんたのしかったのは…',
      'あつめる。石、虫、葉っぱ、花。見つけたものを写真にとるか絵にかいて、なまえと、ほんとうでもつくりばなしでもいいので、ひとことをそえましょう。じぶんだけの図かんのできあがりです。',
      '絵。絵を写真にとれば、それがページになります。お子さんにお話をしてもらい、話したとおりのことばで書きましょう。',
      'まなび。お話は、大きなできごとをやさしくしてくれます。あたらしい赤ちゃん、あたらしい学校、歯みがき、おわかれ。家族の写真をつかえば、お子さん自身のお話になります。',
      'みんなで。クラスみんなで1さつの本をつくれます。ひとり1ページずつ。遠足のこと、すきな動物、大きくなったらなりたいもの。',
      '声にだして よもう。本をよむ自分の声をろくおんしましょう。何年もたったとき、その声がたからものになります。',
      'もっとアイデア。たんじょうびごとの「わたしのこと」の本。おうちのなかで、だいすきなおもちゃがぼうけんするお話。ゆうべ見たゆめ。おじいちゃんが小さかったころの思い出。',
      'ちょっとしたコツ。1ページに1〜2文で十分です。写真は明るい昼間に。ページは正方形なので、まわりにすこしよゆうを。表紙にはお子さんがかいた絵をどうぞ。',
      '本を出そう。子どもも大人も、作家ならだれでも、Oomlautの本やさんに本をおくれます。本ができたら、oomlaut.com でやりかたを見てください。',
      'もっとアイデアがほしいときは、「アイデアと サポート」の アイデアのへやへ。大きなできごとや まいにちの しゅうかん、きもちや かぞくの おはなしまで、いっしょに つくれる本が たくさん あります。',
    ] },
  },
  syllables: {
    authors: ['au', 'thors'], adventure: ['ad', 'ven', 'ture'], collecting: ['col', 'lect', 'ing'], drawings: ['draw', 'ings'],
    lessons: ['les', 'sons'], camera: ['cam', 'er', 'a'], grandma: ['grand', 'ma'], photograph: ['pho', 'to', 'graph'],
    exactly: ['ex', 'act', 'ly'], gentler: ['gen', 'tler'], favourite: ['fa', 'vour', 'ite'], birthday: ['birth', 'day'],
    daylight: ['day', 'light'], published: ['pub', 'lished'], oomlaut: ['oom', 'laut'], treasure: ['trea', 'sure'],
  },
  pages: [
    { pid: 'tp01', titlePage: true, image: require('../assets/books/tips/cover.jpg'), w: 1600, h: 1600, text: 'Tips for Authors. Ideas for making your own books, for grown-ups and young authors alike.' },
    { pid: 'tp02', blankArt: true, w: 1600, h: 1600, text: 'Every family has stories worth keeping. All you need is a camera, a few words and a little time. Here are some ideas to get you started.' },
    { pid: 'tp03', blankArt: true, w: 1600, h: 1600, text: 'Our Big Adventure Today. A walk in the woods, a visit to Grandma, a first lost tooth. Take one photo for each page and let your child tell what happened. First we… then we… the best part was…' },
    { pid: 'tp04', blankArt: true, w: 1600, h: 1600, text: 'Collecting. Rocks, bugs, leaves and flowers. Photograph or draw each find, then give it a name and one fact, real or made up. Now you have your very own field guide.' },
    { pid: 'tp05', blankArt: true, w: 1600, h: 1600, text: 'Drawings. Take a photo of a drawing and it becomes a page. Let your child tell the story, and type their words exactly as they say them.' },
    { pid: 'tp06', blankArt: true, w: 1600, h: 1600, text: 'Lessons. A story can make big things gentler: a new baby, a new school, brushing teeth, saying goodbye. Use your own photos, so the story is about them.' },
    { pid: 'tp07', blankArt: true, w: 1600, h: 1600, text: 'Group Fun. A whole class can make a book together. Each child makes one page: a class trip, a favourite animal, or what they want to be.' },
    { pid: 'tp08', blankArt: true, w: 1600, h: 1600, text: 'Read It Aloud. Record your own voice reading the book. Years from now, that voice will be the treasure.' },
    { pid: 'tp09', blankArt: true, w: 1600, h: 1600, text: 'More Ideas. An All About Me book on every birthday. A favourite toy’s adventures around the house. Last night’s dream. Grandpa remembering when he was little.' },
    { pid: 'tp10', blankArt: true, w: 1600, h: 1600, text: 'A Few Tips. One or two sentences a page is plenty. Take photos in daylight. Pages are square, so leave room around the edges. Use your child’s own drawing for the cover.' },
    { pid: 'tp11', blankArt: true, w: 1600, h: 1600, text: 'Get Published. Authors young and old can send their books to the Oomlaut Book Store. When your book is ready, visit oomlaut.com to find out how.' },
    { pid: 'tp12', blankArt: true, w: 1600, h: 1600, text: 'Need more ideas? Visit the Ideas Room in Ideas and Support. You’ll find many more books to make together, from big moments and everyday routines to feelings and family stories.' },
  ],
};

export const STORIES = [DIFFERENT, SMALL_WONDERS, ROUGH_LIVES, TWO_SNAKES, FALLING, SAMPLE_STORY, TIPS];

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
export const SHOWN_BOOKS = ['different', 'rough-lives', 'tips']; // (two-snakes hidden 19 Oct 2026)

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

// Turns a story into a PDF on the phone and opens the share sheet (Files, Mail, AirDrop, print shop…)
// or the print options.
// Two layouts: "stacked" (the book as in the app: picture square above words square, one page each) and "spreads"
// (picture page, then a words page, like a printed picture book).
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { EBGaramond_400Regular } from '@expo-google-fonts/eb-garamond';
import { bookFont } from './theme';

const FONT_FILES = { serif: EBGaramond_400Regular };

const SIZE = 576; // 8 × 8 inch pages (72 per inch), like a square picture book

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function imageData(image) {
  if (!image) return null;
  try {
    let uri = image.uri;
    if (!uri) {
      const a = Asset.fromModule(image);
      await a.downloadAsync();
      uri = a.localUri || a.uri;
    }
    const b64 = await new File(uri).base64();
    const type = /\.png($|\?)/i.test(uri) ? 'image/png' : 'image/jpeg';
    return `data:${type};base64,${b64}`;
  } catch (e) {
    return null;
  }
}

async function fontFace(fontKey) {
  if (fontKey === 'sans') return ''; // Helvetica is built into the phone
  const file = FONT_FILES[fontKey] || FONT_FILES.serif;
  try {
    const a = Asset.fromModule(file);
    await a.downloadAsync();
    const b64 = await new File(a.localUri || a.uri).base64();
    return `@font-face{font-family:Story;src:url(data:font/ttf;base64,${b64}) format('truetype');}`;
  } catch (e) {
    return '';
  }
}

// "stacked" pages are US Letter (8.5 × 11 inches) with the book drawn like the app: two squares, the
// picture above the words, each with a thin black outline, the words centred in theirs.
// All sizes are points (72 per inch) and the page's CSS uses pt too, so the book lands in the middle.
const PAGE_W = 612, PAGE_H = 792, SQ = 340; // portrait: about 3/4 inch of white above and below the book
// "landscape" pages are US Letter sideways (11 × 8.5 inches) with the two squares side by side,
// centred, like the app held sideways.
const pageSize = (layout) => (layout === 'spreads' ? { w: SIZE, h: SIZE } : layout === 'landscape' ? { w: PAGE_H, h: PAGE_W } : { w: PAGE_W, h: PAGE_H });

function css(face, family, layout) {
  const { w, h } = pageSize(layout);
  return `${face}
@page{size:${w}pt ${h}pt;margin:0}
html,body{margin:0;padding:0;background:#fff}
*{box-sizing:border-box}
.pg{width:${w}pt;height:${h}pt;overflow:hidden;position:relative;page-break-after:always;break-after:page;
  display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:${family};color:#2b2b2b}
.pg:last-child{page-break-after:auto;break-after:auto}
.title h1{font-weight:400;font-size:56pt;margin:0 48pt;text-align:center;line-height:1.1}
.title .by{font-size:18pt;margin-top:18pt;color:#555}
.title .made{position:absolute;bottom:28pt;font-size:12pt;color:#888;font-family:Helvetica,Arial,sans-serif}
.full img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.full::after,.words::after{content:'';position:absolute;inset:4pt;border:1.5pt solid #000}
.words p{font-size:28pt;line-height:1.5;margin:0 64pt;text-align:center}
.book{width:${SQ}pt;display:flex;flex-direction:column}
.sq{width:${SQ}pt;height:${SQ}pt;border:1.5pt solid #000;overflow:hidden;position:relative}
.sq + .sq{border-top:none}
.book.row{flex-direction:row;width:auto}
.book.row .sq{width:330pt;height:330pt}
.book.row .sq + .sq{border-top:1.5pt solid #000;border-left:none}
.sq img{width:100%;height:100%;object-fit:cover;display:block}
.sq.txt{display:flex;align-items:center;justify-content:center;padding:0 ${Math.round(SQ * 0.09)}pt}
.sq.txt p{font-size:22pt;line-height:1.55;margin:0;text-align:center}
.num{position:absolute;bottom:22pt;font-size:11pt;color:#999;font-family:Helvetica,Arial,sans-serif}`;
}

export async function buildStoryHtml(story0, layout = 'stacked', fontKey = 'serif') {
  const story = { ...story0, pages: story0.pages.filter((p) => !p.titlePage) }; // the PDF makes its own title page
  const face = await fontFace(fontKey);
  const pics = [];
  for (const p of story.pages) pics.push(await imageData(p.image));
  const out = [];
  out.push(`<div class="pg title"><h1>${esc(story.title)}</h1>${story.author ? `<div class="by">by ${esc(story.author)}</div>` : ''}<div class="made">Made with Oomlaut Reader</div></div>`);
  story.pages.forEach((p, i) => {
    const pic = pics[i];
    if (layout === 'spreads') {
      if (pic) out.push(`<div class="pg full"><img src="${pic}"/></div>`);
      if (p.text && p.text.trim()) out.push(`<div class="pg words"><p>${esc(p.text)}</p></div>`);
    } else {
      out.push(`<div class="pg"><div class="book${layout === 'landscape' ? ' row' : ''}"><div class="sq">${pic ? `<img src="${pic}"/>` : ''}</div><div class="sq txt">${p.text ? `<p>${esc(p.text)}</p>` : ''}</div></div><div class="num">${i + 1}</div></div>`);
    }
  });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css(face, bookFont(fontKey).css, layout)}</style></head><body>${out.join('')}</body></html>`;
}

async function makePdf(story, layout, fontKey) {
  const html = await buildStoryHtml(story, layout, fontKey);
  const { w, h } = pageSize(layout);
  const { uri } = await Print.printToFileAsync({ html, width: w, height: h, margins: { top: 0, right: 0, bottom: 0, left: 0 } });
  return uri;
}

// Makes the same PDF as sharing, then opens the phone's print options (AirPrint on iPhone).
export async function printStory(story, layout, fontKey) {
  const uri = await makePdf(story, layout, fontKey);
  try {
    await Print.printAsync({ uri });
  } catch (e) {
    // closing the print screen without printing isn't a problem ('Printing did not complete' on iPhone)
    if (!/cancel|did not complete|not completed|dismiss/i.test(String(e && e.message))) throw e;
  }
}

export async function shareStoryPdf(story, layout, fontKey) {
  const uri = await makePdf(story, layout, fontKey);
  let shareUri = uri;
  try {
    const name = (story.title || 'My story').replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'My story';
    const target = new File(Paths.cache, `${name}.pdf`);
    if (target.exists) target.delete();
    const f = new File(uri);
    await f.move(target);
    shareUri = f.uri;
  } catch (e) {}
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(shareUri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: story.title });
}

// Turns a story into a PDF on the phone and opens the share sheet (Files, Mail, AirDrop, print shop…)
// or the print options.
// Two layouts: "stacked" (picture above the words, one page each) and "spreads"
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

function css(face, family) {
  return `${face}
@page{size:${SIZE}px ${SIZE}px;margin:0}
html,body{margin:0;padding:0;background:#fff}
*{box-sizing:border-box}
.pg{width:${SIZE}px;height:${SIZE}px;overflow:hidden;position:relative;page-break-after:always;break-after:page;
  display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:${family};color:#2b2b2b}
.pg:last-child{page-break-after:auto;break-after:auto}
.title h1{font-weight:400;font-size:64px;margin:0 48px;text-align:center;line-height:1.1}
.title .by{font-size:18px;margin-top:18px;color:#555}
.title .made{position:absolute;bottom:28px;font-size:12px;color:#888;font-family:Helvetica,Arial,sans-serif}
.full img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.words p{font-size:28px;line-height:1.5;margin:0 64px;text-align:center}
.stack{justify-content:flex-start;padding-top:36px}
.stack .pic{width:396px;height:396px;background:#eee;overflow:hidden;flex:0 0 auto}
.stack .pic img{width:100%;height:100%;object-fit:cover;display:block}
.stack .txt{flex:1;width:100%;display:flex;align-items:center;justify-content:center;padding:0 64px 30px}
.stack p{font-size:19px;line-height:1.5;margin:0;text-align:center}
.num{position:absolute;bottom:18px;font-size:11px;color:#999;font-family:Helvetica,Arial,sans-serif}`;
}

export async function buildStoryHtml(story, layout = 'stacked', fontKey = 'serif') {
  const face = await fontFace(fontKey);
  const pics = [];
  for (const p of story.pages) pics.push(await imageData(p.image));
  const out = [];
  out.push(`<div class="pg title"><h1>${esc(story.title)}</h1>${story.author ? `<div class="by">by ${esc(story.author)}</div>` : ''}<div class="made">Made with oomlaut Reader</div></div>`);
  story.pages.forEach((p, i) => {
    const pic = pics[i];
    if (layout === 'spreads') {
      if (pic) out.push(`<div class="pg full"><img src="${pic}"/></div>`);
      if (p.text && p.text.trim()) out.push(`<div class="pg words"><p>${esc(p.text)}</p></div>`);
    } else {
      out.push(`<div class="pg stack"><div class="pic">${pic ? `<img src="${pic}"/>` : ''}</div><div class="txt">${p.text ? `<p>${esc(p.text)}</p>` : ''}</div><div class="num">${i + 1}</div></div>`);
    }
  });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css(face, bookFont(fontKey).css)}</style></head><body>${out.join('')}</body></html>`;
}

async function makePdf(story, layout, fontKey) {
  const html = await buildStoryHtml(story, layout, fontKey);
  const { uri } = await Print.printToFileAsync({ html, width: SIZE, height: SIZE, margins: { top: 0, right: 0, bottom: 0, left: 0 } });
  return uri;
}

// Makes the same PDF as sharing, then opens the phone's print options (AirPrint on iPhone).
export async function printStory(story, layout, fontKey) {
  const uri = await makePdf(story, layout, fontKey);
  try {
    await Print.printAsync({ uri });
  } catch (e) {
    if (!/cancel/i.test(String(e && e.message))) throw e;
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

// Guard: the Ideas and Support search field must keep its words in the middle of the pill, top to bottom.
// The rule (October 2026): the one-line iPhone field centres its words its own way and kept putting them low, so the
// field is a text box (multiline, one line only, no scrolling) as tall as the pill, whose single line is placed in the
// middle by padding: paddingTop = (pill height - lineHeight) / 2, paddingBottom 0, and it doesn't grow with the
// phone's text size (allowFontScaling={false}). Runs in CI and before every TestFlight build; a failure stops the build.
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'screens', 'Help.js'), 'utf8');
const problems = [];
const styleOf = (name) => {
  const m = src.match(new RegExp(`\\n\\s*${name}:\\s*\\{([\\s\\S]*?)\\}\\s*,\\s*(?://[^\\n]*)?\\n`));
  return m ? m[1] : null;
};
const num = (style, key) => { const m = style && style.match(new RegExp(`(?:^|[^a-zA-Z])${key}:\\s*(\\d+(?:\\.\\d+)?)`)); return m ? Number(m[1]) : null; };
const wrap = styleOf('searchWrap');
const field = styleOf('search');
if (!wrap) problems.push('searchWrap style not found');
if (!field) problems.push('search style not found');
if (wrap && field) {
  const H = num(wrap, 'height'), h = num(field, 'height'), lh = num(field, 'lineHeight'), fsz = num(field, 'fontSize'), pt = num(field, 'paddingTop'), pb = num(field, 'paddingBottom');
  if (!H) problems.push('searchWrap needs a fixed height');
  if (h !== H) problems.push('search field must be as tall as the pill');
  if (!lh || !fsz || lh < fsz || lh > fsz * 1.4) problems.push('search field needs a lineHeight close to its fontSize');
  if (H && lh && pt !== (H - lh) / 2) problems.push(`search field needs paddingTop = (pill height - lineHeight) / 2 = ${(H - lh) / 2}`);
  if (pb !== 0) problems.push('search field needs paddingBottom: 0');
  if (/paddingVertical|translateY|marginTop|marginBottom/.test(field)) problems.push('search field must not be nudged (paddingVertical / translateY / margins)');
}
const tag = (src.match(/<TextInput(?:(?!<TextInput)[\s\S])*?style=\{styles\.search\}[\s\S]*?\/>/) || [])[0] || '';
if (!tag) problems.push('the search TextInput (style={styles.search}) was not found');
if (!/allowFontScaling=\{false\}/.test(tag)) problems.push('search field needs allowFontScaling={false}');
if (!/\bmultiline\b/.test(tag) || !/scrollEnabled=\{false\}/.test(tag)) problems.push('search field must be a one-line text box: multiline and scrollEnabled={false}');
if (!/submitBehavior="blurAndSubmit"/.test(tag)) problems.push('search field: Return must finish, not add a line (submitBehavior="blurAndSubmit")');
if (problems.length) {
  console.error('SEARCH FIELD CHECK FAILED:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log('search field: centred (a one-line text box as tall as the pill, its line placed in the middle by padding)');

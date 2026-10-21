// Guard: the Ideas and Support search field must keep its words in the middle of the pill, top to bottom.
// The rule that works on iOS: the pill (searchWrap) is a fixed height and centres its child; the field (search)
// is only as tall as its words: no height, no vertical padding, no font padding, no textAlignVertical tricks.
// Runs in CI and before every TestFlight build; a failure stops the build.
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'screens', 'Help.js'), 'utf8');
const problems = [];
const styleOf = (name) => {
  const m = src.match(new RegExp(`\\n\\s*${name}:\\s*\\{([\\s\\S]*?)\\}\\s*,\\s*(?://[^\\n]*)?\\n`));
  return m ? m[1] : null;
};
const wrap = styleOf('searchWrap');
const field = styleOf('search');
if (!wrap) problems.push('searchWrap style not found');
if (!field) problems.push('search style not found');
if (wrap) {
  if (!/height:\s*\d+/.test(wrap)) problems.push('searchWrap needs a fixed height');
  if (!/justifyContent:\s*'center'/.test(wrap)) problems.push("searchWrap must centre its child (justifyContent: 'center')");
}
if (field) {
  if (/(^|[^a-zA-Z])height:/.test(field)) problems.push('search field must not have a height (it must be only as tall as its words)');
  if (/paddingTop|paddingBottom/.test(field)) problems.push('search field must not have top or bottom padding');
  if (!/paddingVertical:\s*0/.test(field)) problems.push('search field needs paddingVertical: 0');
  if (!/includeFontPadding:\s*false/.test(field)) problems.push('search field needs includeFontPadding: false');
  if (/lineHeight/.test(field)) problems.push('search field must not set a lineHeight (iOS then sets the words off-centre)');
  if (/textAlignVertical|translateY|marginTop|marginBottom/.test(field)) problems.push('search field must not be nudged (textAlignVertical / translateY / margins)');
}
// the field must sit directly in the pill
if (!/styles\.searchWrap[^\n]*\n(?:(?!<\/Pressable>|<\/View>)[\s\S])*?<TextInput[\s\S]*?style=\{styles\.search\}/.test(src)) problems.push('the search TextInput must sit in the searchWrap pill and use styles.search alone');
if (problems.length) {
  console.error('SEARCH FIELD CHECK FAILED:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log('search field: centred (pill centres a field only as tall as its words)');

// Web preview: a text file chosen in the browser (phones use textFile.native.js).
export function pickTextFile() {
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.csv,.txt,text/*';
      input.onchange = () => { const f = input.files && input.files[0]; if (!f) return resolve(null); f.text().then(resolve, () => resolve(null)); };
      input.click();
    } catch (e) { resolve(null); }
  });
}

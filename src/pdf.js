// Web preview only. PDF export runs on the phone (pdf.native.js).
export async function shareStoryPdf() {
  throw new Error('Making PDFs works in the iPhone and Android app.');
}

export async function printStory() {
  throw new Error('Printing works in the iPhone and Android app.');
}

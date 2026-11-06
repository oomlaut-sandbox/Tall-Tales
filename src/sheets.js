// Sheets of paper to draw on (Jörg, 5 Nov 2026): used in Things to share (a child's own) and on the Teacher's Desk
// (a sheet for the class). Square, like the drawing page.
import { Asset } from 'expo-asset';

export const PAPERS = [
  ['canvas', 'Canvas', require('../assets/sheets/canvas.jpg')],
  ['lined', 'Lined paper', require('../assets/sheets/lined.jpg')],
  ['graph', 'Graph paper', require('../assets/sheets/graph.jpg')],
  ['kraft', 'Kraft paper', require('../assets/sheets/kraft.jpg')],
];
// the paper as a file on the device (the drawing tools and the finished picture need one)
export async function paperFile(src) { const a = Asset.fromModule(src); await a.downloadAsync(); return a.localUri || a.uri; }

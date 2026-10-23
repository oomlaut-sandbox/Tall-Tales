// A drawing tool in the tray, from Jörg's renders, shown just as they are. Tip up; the bottom is hidden by the edge
// of the tray.
import React from 'react';
import { Image, View } from 'react-native';

const TOOLS = {
  eraser: [require('../../assets/tools/eraser.png'), null, 178, 390],
  pencil: [require('../../assets/tools/pencil.png'), null, 85, 390],
  pen: [require('../../assets/tools/pen.png'), null, 77, 382],
  water: [require('../../assets/tools/water.png'), null, 77, 392],
  crayon: [require('../../assets/tools/crayon.png'), null, 90, 389],
  roller: [require('../../assets/tools/roller.png'), null, 231, 387],
};

export default function ToolPic({ kind, width, height }) {
  const T = TOOLS[kind];
  if (!T) return null;
  const [img, , iw, ih] = T;
  const k = Math.min(height / ih, (width * 1.15) / iw);
  const w = iw * k, h = ih * k;
  return (
    <View pointerEvents="none" style={{ width, height, alignItems: 'center' }}>
      <View style={{ width: w, height: h }}>
        <Image source={img} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} />
      </View>
    </View>
  );
}

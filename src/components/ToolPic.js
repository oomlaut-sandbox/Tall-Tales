// A drawing tool in the tray, from Jörg's renders: the tool itself, and over it the parts that take the colour you're
// drawing with (a pencil's lead, the pen's barrel, the brush's bristles, the crayon's wax, the roller), laid on as
// that colour, multiplied, so their texture shows through. Tip up; the bottom is hidden by the edge of the tray.
import React from 'react';
import { Image, View } from 'react-native';

const TOOLS = {
  eraser: [require('../../assets/tools/eraser.png'), null, 178, 390],
  pencil: [require('../../assets/tools/pencil.png'), require('../../assets/tools/pencil-paint.png'), 85, 390],
  pen: [require('../../assets/tools/pen.png'), require('../../assets/tools/pen-paint.png'), 77, 382],
  water: [require('../../assets/tools/water.png'), require('../../assets/tools/water-paint.png'), 77, 392],
  crayon: [require('../../assets/tools/crayon.png'), require('../../assets/tools/crayon-paint.png'), 90, 389],
  roller: [require('../../assets/tools/roller.png'), require('../../assets/tools/roller-paint.png'), 231, 387],
};

export default function ToolPic({ kind, color, width, height }) {
  const T = TOOLS[kind];
  if (!T) return null;
  const [img, paint, iw, ih] = T;
  const k = Math.min(height / ih, (width * 1.15) / iw);
  const w = iw * k, h = ih * k;
  return (
    <View pointerEvents="none" style={{ width, height, alignItems: 'center' }}>
      <View style={{ width: w, height: h }}>
        <Image source={img} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} />
        {paint ? <Image source={paint} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, tintColor: color, mixBlendMode: 'multiply' }} /> : null}
      </View>
    </View>
  );
}

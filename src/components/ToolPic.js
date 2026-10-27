// A drawing tool in the tray, from Jörg's renders, shown just as they are. Tip up; the bottom is hidden by the edge
// of the tray.
import React from 'react';
import { Image, View } from 'react-native';

const TOOLS = {
  eraser: [require('../../assets/tools/eraser.png'), null, 176, 455],
  pencil: [require('../../assets/tools/pencil.png'), null, 85, 455],
  pen: [require('../../assets/tools/pen.png'), null, 98, 454],
  water: [require('../../assets/tools/water.png'), null, 67, 458],
  crayon: [require('../../assets/tools/crayon.png'), null, 79, 455],
  smudge: [require('../../assets/tools/smudge.png'), null, 62, 432], // a paper blending stump
  roller: [require('../../assets/tools/roller.png'), null, 227, 447],
};

// floor: where the tray's edge is (from the top of the box): every tool runs past it (a short one like the eraser is
// moved down until it does; the tops needn't line up)
export default function ToolPic({ kind, width, height, floor }) {
  const T = TOOLS[kind];
  if (!T) return null;
  const [img, , iw, ih] = T;
  const k = Math.min(height / ih, (width * 0.78) / iw); // (room between the tools)
  const w = iw * k, h = ih * k;
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={{ width, height: Math.max(height, (floor || 0) + 40), alignItems: 'center' }}>
      <View style={{ width: w, height: h, marginTop: floor != null ? Math.max(0, floor + Math.max(14, h * 0.2) - h) : 0 }}>
        {/* its shadow on the tray: its own shape, dark and soft, a little down and to the right */}
        {/* one picture, its soft shadow drawn by the phone from its own shape (a second, darkened copy showed as a double) */}
        <Image source={img} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 3, height: 5 } }} />
      </View>
    </View>
  );
}

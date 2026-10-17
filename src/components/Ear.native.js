// The notebook's rounded dog-ear on the phone, drawn smoothly with Skia (the web preview uses Ear.js).
// The drawing reaches P points further up and left, for the flap's soft shadow on the page.
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { BlurMask, Canvas, Group, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { EAR_PAD as P, earPaths } from './earPaths';

export function EarArt({ e, r, under, flap }) {
  const D = useMemo(() => {
    const p = earPaths(e, r);
    return { under: Skia.Path.MakeFromSVGString(p.under), flap: Skia.Path.MakeFromSVGString(p.flap), fold: Skia.Path.MakeFromSVGString(p.fold) };
  }, [e, r]);
  const S = e + P;
  return (
    <View pointerEvents="none" style={{ width: S, height: S }}>
      <Canvas style={{ width: S, height: S }}>
        <Group transform={[{ translateX: P }, { translateY: P }]}>
          <Path path={D.under} color={under} />
          <Path path={D.under}>
            <LinearGradient start={vec(e / 2, e / 2)} end={vec(e * 0.75, e * 0.75)} colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0)']} />
          </Path>
          {/* the lifted corner's shadow, cast softly onto the page around it */}
          <Group transform={[{ translateX: -2.5 }, { translateY: -2 }]}>
            <Path path={D.flap} color="rgba(0,0,0,0.3)"><BlurMask blur={4} style="normal" /></Path>
          </Group>
          <Path path={D.flap} color={flap} />
          <Path path={D.fold} color="rgba(0,0,0,0.12)" style="stroke" strokeWidth={1} />
        </Group>
      </Canvas>
    </View>
  );
}

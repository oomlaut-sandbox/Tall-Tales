// The notebook's rounded dog-ear on the phone, drawn smoothly with Skia (the web preview uses Ear.js).
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { earPaths } from './earPaths';

export function EarArt({ e, r, under, flap }) {
  const P = useMemo(() => {
    const p = earPaths(e, r);
    return { under: Skia.Path.MakeFromSVGString(p.under), flap: Skia.Path.MakeFromSVGString(p.flap), fold: Skia.Path.MakeFromSVGString(p.fold) };
  }, [e, r]);
  return (
    <View pointerEvents="none" style={{ width: e, height: e }}>
      <Canvas style={{ width: e, height: e }}>
        <Path path={P.under} color={under} />
        <Path path={P.under}>
          <LinearGradient start={vec(e / 2, e / 2)} end={vec(e * 0.75, e * 0.75)} colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0)']} />
        </Path>
        <Path path={P.flap} color={flap} />
        <Path path={P.fold} color="rgba(0,0,0,0.12)" style="stroke" strokeWidth={1} />
      </Canvas>
    </View>
  );
}

// Draws a turning page with Skia: the page underneath, a soft shadow along the fold,
// the flat part of the turning page, and its lifted back (mirrored, paper-tinted).
import React from 'react';
import { Canvas, Group, Image, Path, Rect, LinearGradient, BlurMask, Skia, vec, makeImageFromView } from '@shopify/react-native-skia';

export const supportsCurl = true;

export async function snapshot(ref) {
  try {
    if (!ref || !ref.current) return null;
    return await makeImageFromView(ref);
  } catch (e) {
    return null;
  }
}

function toPath(pts) {
  const p = Skia.Path.Make();
  if (!pts.length) return p;
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  p.close();
  return p;
}

export function CurlCanvas({ width: W, height: H, under, turning, fold }) {
  if (!fold || !turning) return null;
  const { M, nx, ny, angle, depth } = fold;
  const front = toPath(fold.front);
  const cut = toPath(fold.cut);
  const shadeW = Math.max(20, Math.min(70, depth * 0.6));
  const shadeA = Math.min(0.38, (depth / W) * 0.6);
  const reflect = [
    { translateX: M[0] }, { translateY: M[1] }, { rotate: angle }, { scaleY: -1 }, { rotate: -angle },
    { translateX: -M[0] }, { translateY: -M[1] },
  ];
  const g0 = vec(M[0], M[1]);
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} pointerEvents="none">
      {under ? <Image image={under} x={0} y={0} width={W} height={H} fit="fill" /> : <Rect x={0} y={0} width={W} height={H} color="#f2f2f0" />}
      <Rect x={0} y={0} width={W} height={H}>
        <LinearGradient start={g0} end={vec(M[0] + nx * shadeW, M[1] + ny * shadeW)} colors={[`rgba(0,0,0,${shadeA})`, 'rgba(0,0,0,0)']} />
      </Rect>
      <Group clip={front}>
        <Image image={turning} x={0} y={0} width={W} height={H} fit="fill" />
      </Group>
      <Group transform={reflect}>
        <Path path={cut} color="rgba(0,0,0,0.35)">
          <BlurMask blur={7} style="normal" />
        </Path>
        <Group clip={cut}>
          <Image image={turning} x={0} y={0} width={W} height={H} fit="fill" />
          <Rect x={0} y={0} width={W} height={H} color="rgba(232,230,225,0.86)" />
          <Rect x={0} y={0} width={W} height={H}>
            <LinearGradient
              start={g0}
              end={vec(M[0] + nx * Math.max(1, depth), M[1] + ny * Math.max(1, depth))}
              colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0)', 'rgba(255,255,255,0.35)', 'rgba(0,0,0,0.08)']}
              positions={[0, Math.min(0.5, 22 / Math.max(1, depth)), 0.55, 1]}
            />
          </Rect>
        </Group>
      </Group>
    </Canvas>
  );
}

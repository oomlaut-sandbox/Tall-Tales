// Draws a turning page with Skia: the page underneath, a soft shadow along the fold,
// the flat part of the turning page, and its lifted back (mirrored, paper-tinted).
import React from 'react';
import { Canvas, Group, Image, ImageShader, Path, Rect, LinearGradient, BlurMask, Skia, Vertices, vec, rect, makeImageFromView } from '@shopify/react-native-skia';
import { flapMesh, FLAP_INDICES } from '../flapCurl';

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
      {under ? <Image image={under} x={0} y={0} width={W} height={H} fit="fill" /> : <Rect x={0} y={0} width={W} height={H} color="#c9c9c9" />}
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

// The flip-up page turn, drawn as a bending sheet (see src/flapCurl.js for the shape).
// front: a picture of the page being turned away from; back: a picture of the page being turned to.
// Also casts a soft shadow onto the pages beneath it.
export function FlapCurl({ width: W, height: H, artH, p, front, back }) {
  if (!front || !back || !W || !H) return null;
  const strips = flapMesh({ W, H, artH, p });
  const sh = Math.sin(Math.PI * Math.max(0, Math.min(1, p)));
  const area = rect(0, 0, W, H);
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} pointerEvents="none">
      <Rect x={0} y={artH} width={W} height={(H - artH) * 0.6}>
        <LinearGradient start={vec(0, artH)} end={vec(0, artH + (H - artH) * 0.6)} colors={[`rgba(0,0,0,${(0.3 * sh).toFixed(3)})`, 'rgba(0,0,0,0)']} />
      </Rect>
      <Rect x={0} y={artH * 0.4} width={W} height={artH * 0.6}>
        <LinearGradient start={vec(0, artH)} end={vec(0, artH * 0.4)} colors={[`rgba(0,0,0,${(0.3 * sh * (p > 0.5 ? 1 : 0.3)).toFixed(3)})`, 'rgba(0,0,0,0)']} />
      </Rect>
      {strips.map((st, i) => {
        const g = Math.round(255 * st.light);
        const c = `rgb(${g},${g},${g})`;
        return (
          <Vertices key={i} vertices={st.verts.map((v) => vec(v.x, v.y))} textures={st.tex.map((t) => vec(t.x, t.y))}
            colors={[c, c, c, c]} indices={FLAP_INDICES} mode="triangles" blendMode="modulate">
            <ImageShader image={st.face === 'front' ? front : back} fit="fill" rect={area} />
          </Vertices>
        );
      })}
    </Canvas>
  );
}

// Draws a turning page with Skia: the page underneath, a soft shadow along the fold,
// the flat part of the turning page, and its lifted back (mirrored, paper-tinted).
import React from 'react';
import { Canvas, Group, Image, Path, Rect, LinearGradient, BlurMask, Skia, vec, rect, makeImageFromView } from '@shopify/react-native-skia';
import { computePeel, peelCorner } from '../fold';

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
        {/* a fine white edge all round the turned part, so the paper reads as having thickness */}
        <Path path={cut} style="stroke" strokeWidth={1.6} strokeJoin="round" color="rgba(255,255,255,0.95)" />
      </Group>
    </Canvas>
  );
}

// The flip-up page turn as a paper peel: the words half of the page peels up from its bottom
// corner along a diagonal crease, folds over the spine and settles onto the top half.
// front: picture of the page being turned away from (a); back: picture of the page turned to (b).
// The page's own views sit underneath (b whole, and a's picture on the top half).
export function FlapPeel({ width: W, height: H, artH, t, corner, front, back }) {
  if (!front || !back || !W || !H) return null;
  const textH = H - artH;
  const C = corner === 'left' ? [0, H] : [W, H];
  const fold = computePeel(peelCorner(t, C, W, H, artH), C, W, H, artH);
  const flap = toPath([[0, artH], [W, artH], [W, H], [0, H]]);
  const full = { x: 0, y: 0, width: W, height: H, fit: 'fill' };
  const fadeIn = Math.max(0, Math.min(1, (t - 0.8) / 0.2)); // the top strip the flap can't reach
  if (!fold) {
    return (
      <Canvas style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} pointerEvents="none">
        <Group clip={flap}><Image image={front} {...full} /></Group>
      </Canvas>
    );
  }
  const { M, nx, ny, angle, depth } = fold;
  const frontPath = toPath(fold.front);
  const cut = toPath(fold.cut);
  const shadeW = Math.max(18, Math.min(60, depth * 0.55));
  const shadeA = Math.min(0.32, (depth / W) * 0.5 + 0.08);
  const g0 = vec(M[0], M[1]);
  const reflect = [
    { translateX: M[0] }, { translateY: M[1] }, { rotate: angle }, { scaleY: -1 }, { rotate: -angle },
    { translateX: -M[0] }, { translateY: -M[1] },
  ];
  // flat flap position → where that spot of the next page's picture is (mirrored over the spine)
  const k = artH / textH;
  const spine = [{ translateY: artH }, { scaleY: -1 / k }, { translateY: -artH }];
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} pointerEvents="none">
      {/* shadow on the uncovered words area, along the crease */}
      <Group clip={flap}>
        <Rect x={0} y={artH} width={W} height={textH}>
          <LinearGradient start={g0} end={vec(M[0] + nx * shadeW, M[1] + ny * shadeW)} colors={[`rgba(0,0,0,${shadeA.toFixed(3)})`, 'rgba(0,0,0,0)']} />
        </Rect>
      </Group>
      {/* The folded flap is shorter than the picture square, so it can't reach the very top:
          only that thin top strip fades in to the next picture (the flap itself stays solid). */}
      {fadeIn > 0 && artH > textH ? (
        <Group clip={rect(0, 0, W, artH - textH)} opacity={fadeIn}><Image image={back} {...full} /></Group>
      ) : null}
      {/* the part of the words half still lying flat */}
      <Group clip={frontPath}><Image image={front} {...full} /></Group>
      {/* the lifted part, folded over: its back shows the next page's picture */}
      <Group transform={reflect}>
        <Path path={cut} color="rgba(0,0,0,0.28)">
          <BlurMask blur={8} style="normal" />
        </Path>
        <Group clip={cut}>
          <Group transform={spine}><Image image={back} {...full} /></Group>
          <Rect x={0} y={0} width={W} height={H}>
            <LinearGradient
              start={g0}
              end={vec(M[0] + nx * Math.max(1, depth), M[1] + ny * Math.max(1, depth))}
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0)', 'rgba(255,255,255,0.12)', 'rgba(0,0,0,0.05)']}
              positions={[0, Math.min(0.5, 20 / Math.max(1, depth)), 0.55, 1]}
            />
          </Rect>
        </Group>
      </Group>
    </Canvas>
  );
}

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
      </Group>
    </Canvas>
  );
}

// The flip-up page turn as a paper peel: the words half of the page peels up from its bottom
// corner along a diagonal crease, folds over the spine and settles onto the top half.
// front: picture of the page being turned away from (a); back: picture of the page turned to (b).
// The page's own views sit underneath (b whole, and a's picture on the top half).
// The lifted flap rises toward the reader: a perspective that leaves the crease where it is and
// makes the paper further from it look bigger (strongest mid-turn, none at the start and end).
// Returned as a row-major 4x4 matrix for a Skia Group.
export function liftMatrix(M, nx, ny, t, textH) {
  const c = (0.3 * Math.sin(Math.PI * Math.max(0, Math.min(1, t)))) / Math.max(1, textH);
  if (c < 1e-6) return null;
  const fx = -ny, fy = nx; // along the crease; the flap lies on the -n side
  const A = [[fx, fy, -(fx * M[0] + fy * M[1])], [-nx, -ny, nx * M[0] + ny * M[1]], [0, 0, 1]];
  const P = [[1, 0, 0], [0, 1, 0], [0, -c, 1]];
  const B = [[fx, -nx, M[0]], [fy, -ny, M[1]], [0, 0, 1]];
  const mul = (X, Y) => X.map((r) => [0, 1, 2].map((j) => r[0] * Y[0][j] + r[1] * Y[1][j] + r[2] * Y[2][j]));
  const h = mul(B, mul(P, A));
  return [h[0][0], h[0][1], 0, h[0][2], h[1][0], h[1][1], 0, h[1][2], 0, 0, 1, 0, h[2][0], h[2][1], 0, h[2][2]];
}

// ox, oy: where the book sits inside the canvas. The canvas covers the whole screen, so the
// lifted paper can swing out over the grey and past the screen edges.
// sideways: the book lies on its side (picture left, words right). The peel is worked out exactly as
// upright (in a frame turned a quarter turn), so it looks and feels the same: W and H are then the
// upright frame's size (W = the page height, H = twice that) and the pictures are turned to match.
// matte: plain paper (no sheen on the lifted page, softer shadows), for the notebook.
// round: the pages' corner radius (the notebook's pages are rounded), so the flat part keeps clean corners.
export function FlapPeel({ width: W, height: H, artH, t, corner, front, back, ox = 0, oy = 0, canvasW, canvasH, sideways, matte, round = 0 }) {
  if (!front || !back || !W || !H) return null;
  const CW = canvasW || W, CH = canvasH || H;
  // upright frame -> screen. Sideways: a quarter turn, so the frame's top (the picture) lands on the left.
  const at = sideways
    ? [{ translateX: ox }, { translateY: oy }, { translateY: W }, { rotate: -Math.PI / 2 }]
    : [{ translateX: ox }, { translateY: oy }];
  // a page picture drawn into the frame (sideways pictures are wide, so they're turned back)
  const pic = (img) => (sideways
    ? <Group transform={[{ translateX: W }, { rotate: Math.PI / 2 }]}><Image image={img} x={0} y={0} width={H} height={W} fit="fill" /></Group>
    : <Image image={img} x={0} y={0} width={W} height={H} fit="fill" />);
  const textH = H - artH;
  const C = corner === 'left' ? [0, H] : [W, H];
  const fold = computePeel(peelCorner(t, C, W, H, artH), C, W, H, artH);
  const flap = toPath([[0, artH], [W, artH], [W, H], [0, H]]);
  const full = { x: 0, y: 0, width: W, height: H, fit: 'fill' };
  const fadeIn = Math.max(0, Math.min(1, (t - 0.75) / 0.25)); // the top strip the flap can't reach
  if (!fold) {
    return (
      <Canvas style={{ position: 'absolute', left: 0, top: 0, width: CW, height: CH }} pointerEvents="none">
        <Group transform={at}><Group clip={flap}>{pic(front)}</Group></Group>
      </Canvas>
    );
  }
  const { M, nx, ny, angle, depth } = fold;
  // all the shading fades away as the page lands (and fades in as a backward turn starts)
  const settle = 1 - Math.max(0, Math.min(1, (t - 0.82) / 0.18));
  const frontPath = toPath(fold.front);
  const roundRect = round ? Skia.RRectXY(Skia.XYWHRect(0, 0, W, H), round, round) : null;
  const cut = toPath(fold.cut);
  const shadeW = Math.max(18, Math.min(60, depth * 0.55));
  const shadeA = Math.min(0.32, (depth / W) * 0.5 + 0.08) * settle;
  const g0 = vec(M[0], M[1]);
  const reflect = [
    { translateX: M[0] }, { translateY: M[1] }, { rotate: angle }, { scaleY: -1 }, { rotate: -angle },
    { translateX: -M[0] }, { translateY: -M[1] },
  ];
  // flat flap position → the spot of the next page's picture it lands on (mirrored over the spine,
  // at true size, so the last frame matches the finished page exactly)
  const spine = [{ translateY: artH }, { scaleY: -1 }, { translateY: -artH }];
  const lift = liftMatrix(M, nx, ny, t, textH);
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width: CW, height: CH }} pointerEvents="none">
      <Group transform={at}>
      {/* shadow on the uncovered words area, along the crease */}
      <Group clip={flap}>
        <Rect x={0} y={artH} width={W} height={textH}>
          <LinearGradient start={g0} end={vec(M[0] + nx * shadeW, M[1] + ny * shadeW)} colors={[`rgba(0,0,0,${shadeA.toFixed(3)})`, 'rgba(0,0,0,0)']} />
        </Rect>
      </Group>
      {/* The folded flap is shorter than the picture square, so it can't reach the very top:
          only that thin top strip fades in to the next picture (the flap itself stays solid). */}
      {fadeIn > 0 && artH > textH ? (
        <Group clip={rect(0, 0, W, artH - textH)} opacity={fadeIn}>{pic(back)}</Group>
      ) : null}
      {/* the part of the words half still lying flat */}
      <Group clip={round ? roundRect : undefined}><Group clip={frontPath}>{pic(front)}</Group></Group>
      {/* the lifted part's shadow on the page */}
      <Group transform={reflect}>
        <Path path={cut} color={`rgba(0,0,0,${((matte ? 0.16 : 0.28) * settle).toFixed(3)})`}>
          <BlurMask blur={8} style="normal" />
        </Path>
      </Group>
      {/* the lifted part, folded over and rising toward the reader: its back shows the next page's picture */}
      <Group matrix={lift || undefined}>
      <Group transform={reflect}>
        <Group clip={cut}>
          <Group transform={spine}>{pic(back)}</Group>
          <Rect x={0} y={0} width={W} height={H}>
            <LinearGradient
              start={g0}
              end={vec(M[0] + nx * Math.max(1, depth), M[1] + ny * Math.max(1, depth))}
              colors={matte ? [`rgba(0,0,0,${(0.1 * settle).toFixed(3)})`, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)'] : [`rgba(0,0,0,${(0.2 * settle).toFixed(3)})`, 'rgba(0,0,0,0)', `rgba(255,255,255,${(0.12 * settle).toFixed(3)})`, `rgba(0,0,0,${(0.05 * settle).toFixed(3)})`]}
              positions={[0, Math.min(0.5, 20 / Math.max(1, depth)), 0.55, 1]}
            />
          </Rect>
        </Group>
      </Group>
      </Group>
      </Group>
    </Canvas>
  );
}

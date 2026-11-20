import { useEffect, useMemo } from 'react';
import { signTexture } from '../monsters/labelTextures';

/** On-screen height of a sign as a share of the canvas height (signs keep a constant size, map style). */
export const SIGN_SCREEN_HEIGHT = 0.034;
// With sizeAttenuation off, sprite scale is in view units at distance 1: 2 * tan(fov / 2) spans the screen height.
const FOV_SPAN = 2 * Math.tan(((45 / 2) * Math.PI) / 180);

/** Name board for a habitat or building: canvas texture on a sprite, readable from any zoom level. */
/** hang: 'above' sits on the anchor (building roofs), 'below' hangs under it (habitat front rims, never covers the plot). */
export function Sign({ text, position, name, hang = 'above' }: { text: string; position: [number, number, number]; name?: string; hang?: 'above' | 'below' }) {
  const { texture, aspect } = useMemo(() => signTexture(text), [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  const h = SIGN_SCREEN_HEIGHT * FOV_SPAN;
  return (
    <sprite name={name ?? `sign-${text}`} position={position} scale={[h * aspect, h, 1]} center={[0.5, hang === 'above' ? 0 : 1]} renderOrder={10}>
      {/* Drawn over scenery: a raised plot rim or a pole must never hide a name. */}
      <spriteMaterial map={texture} sizeAttenuation={false} transparent depthWrite={false} depthTest={false} />
    </sprite>
  );
}

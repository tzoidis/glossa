// Where a finger is in the village scene, as the percent position WorldItem stores.

const MARGIN = 4;

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const clamp = (v: number) => Math.min(100 - MARGIN, Math.max(MARGIN, v));

/** Percent of the scene, kept a little inside the edges so an item never leaves it. */
export function scenePercent(clientX: number, clientY: number, scene: Rect): { x: number; y: number } {
  return {
    x: clamp(((clientX - scene.left) / scene.width) * 100),
    y: clamp(((clientY - scene.top) / scene.height) * 100),
  };
}

export function insideScene(clientX: number, clientY: number, scene: Rect): boolean {
  return clientX >= scene.left && clientX <= scene.left + scene.width && clientY >= scene.top && clientY <= scene.top + scene.height;
}

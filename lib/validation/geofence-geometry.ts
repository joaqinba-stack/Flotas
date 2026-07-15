// Ray casting sobre un polígono de [lat, lon]. Suficiente para geocercas
// simples del MVP; una geometría más precisa (PostGIS) queda para hardening.
export function pointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
  const [py, px] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

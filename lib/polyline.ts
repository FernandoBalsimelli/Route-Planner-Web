export function decodePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0, lat = 0, lng = 0;
  function delta() {
    let result = 0, shift = 0, byte: number;
    do {
      if (index >= encoded.length || shift > 30) throw new Error('INVALID_POLYLINE');
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) throw new Error('INVALID_POLYLINE');
      result |= (byte & 31) << shift; shift += 5;
    } while (byte >= 32);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
  try {
    while (index < encoded.length) {
      lat += delta(); lng += delta();
      if (Math.abs(lat) > 9000000 || Math.abs(lng) > 18000000) return [];
      points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
  } catch { return []; }
}

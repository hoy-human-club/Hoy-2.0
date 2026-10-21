/** Map coordinate validation; never substitutes a guessed location. */
export function validCoordinate(value: number, limit: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= limit;
}

export function mapCoordinates(lat: number, lng: number, fallback: { lat: number; lng: number }): { lat: number; lng: number } {
  // Coordinates describe one location: reject an invalid pair together.
  return validCoordinate(lat, 90) && validCoordinate(lng, 180) ? { lat, lng } : fallback;
}

export function mapEmbedUrl(provider: 'none' | 'google' | 'osm', lat: number, lng: number): string | null {
  if (!validCoordinate(lat, 90) || !validCoordinate(lng, 180)) return null;
  if (provider === 'google') return `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  if (provider === 'osm') {
    const pad = 0.006;
    const box = [Math.max(-180, lng - pad), Math.max(-90, lat - pad * 0.7), Math.min(180, lng + pad), Math.min(90, lat + pad * 0.7)].map(n => n.toFixed(5)).join(',');
    return `https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik&marker=${lat},${lng}`;
  }
  return null;
}

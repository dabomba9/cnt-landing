// Mapbox configuration. Replace MAPBOX_TOKEN with your Mapbox public token.
// Get one at https://account.mapbox.com/access-tokens
//
// Until a token is set, the map falls back to OpenStreetMap tiles so the page
// still renders.
export const MAPBOX_TOKEN = 'REPLACE_WITH_YOUR_MAPBOX_TOKEN';

// Pick a Mapbox style URL. Use 'outdoors-v12' for a natural/RV feel.
export const MAPBOX_STYLE = 'mapbox/outdoors-v12';

export const TILE_URL = MAPBOX_TOKEN.startsWith('REPLACE_')
  ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  : `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;

export const TILE_ATTRIBUTION = MAPBOX_TOKEN.startsWith('REPLACE_')
  ? '© OpenStreetMap contributors'
  : '© Mapbox © OpenStreetMap';

// ============================================================================
// P39/A1 — Map style switcher
// Three basemap options the visitor picks via the Layers panel.
// When a Mapbox token is configured, all three are Mapbox styles; when not,
// streets falls back to OSM, satellite + terrain fall back to free
// alternatives (Esri / OpenTopoMap).
// ============================================================================

export type TileStyleKey = 'streets' | 'satellite' | 'terrain';

interface TileStyleEntry {
  url: string;
  attribution: string;
  label: string;
}

const hasMapboxToken = !MAPBOX_TOKEN.startsWith('REPLACE_');
const mb = (style: string) =>
  `https://api.mapbox.com/styles/v1/${style}/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;

export const TILE_STYLES: Record<TileStyleKey, TileStyleEntry> = {
  streets: {
    url: hasMapboxToken
      ? mb('mapbox/outdoors-v12')
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: hasMapboxToken
      ? '© Mapbox © OpenStreetMap'
      : '© OpenStreetMap contributors',
    label: 'Streets',
  },
  satellite: {
    url: hasMapboxToken
      ? mb('mapbox/satellite-streets-v12')
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: hasMapboxToken
      ? '© Mapbox © OpenStreetMap'
      : 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
    label: 'Satellite',
  },
  terrain: {
    url: hasMapboxToken
      ? mb('mapbox/outdoors-v12')
      : 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: hasMapboxToken
      ? '© Mapbox © OpenStreetMap'
      : 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)',
    label: 'Terrain',
  },
};

export const MAP_DEFAULT_CENTER: [number, number] = [39.5, -98.35]; // continental US center
export const MAP_DEFAULT_ZOOM = 4;

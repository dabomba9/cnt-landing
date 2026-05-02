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

export const MAP_DEFAULT_CENTER: [number, number] = [39.5, -98.35]; // continental US center
export const MAP_DEFAULT_ZOOM = 4;

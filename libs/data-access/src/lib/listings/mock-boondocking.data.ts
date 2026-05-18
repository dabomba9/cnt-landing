import type { Amenity } from './mock-listings.data';
import { IBoondockingListing } from './mock-listings.data';

/**
 * Boondocking (public-land dispersed) listings.
 *
 * Lives in its own file because the shape is materially different from private
 * stays — no price, no rating, no Instant Book, no host. The ids continue the
 * numbering used by `MOCK_LISTINGS` (1–80) to keep routing/favorites stable.
 */

const IMG = 'assets/images/host_opportunity.webp';

const A_BOON = {
  blm:   ['back-in','pets','campfires','tents-allowed','vehicles-allowed'] as Amenity[],
  usfs:  ['back-in','pets','campfires','tents-allowed','potable-water','toilet'] as Amenity[],
  nps:   ['back-in','pets','tents-allowed','toilet'] as Amenity[],
};

export const MOCK_BOONDOCKING: IBoondockingListing[] = [
  { id:81, kind:'boondocking', title:'Joshua Tree South BLM',       location:'Twentynine Palms, CA', lat:33.7405, lng:-115.4421, category:'offgrid', amenities:A_BOON.blm,  image:IMG, agency:'BLM' },
  { id:82, kind:'boondocking', title:'Alabama Hills Dispersed',     location:'Lone Pine, CA',        lat:36.6065, lng:-118.1146, category:'offgrid', amenities:A_BOON.blm,  image:IMG, agency:'BLM' },
  { id:83, kind:'boondocking', title:'San Rafael Swell',            location:'Green River, UT',      lat:38.7100, lng:-110.6500, category:'offgrid', amenities:A_BOON.blm,  image:IMG, agency:'BLM' },
  { id:84, kind:'boondocking', title:'Lolo Pass NF',                location:'Lolo, MT',             lat:46.6300, lng:-114.5600, category:'offgrid', amenities:A_BOON.usfs, image:IMG, agency:'USFS' },
  { id:85, kind:'boondocking', title:'Coconino Forest Roads',       location:'Flagstaff, AZ',        lat:35.1500, lng:-111.6700, category:'offgrid', amenities:A_BOON.usfs, image:IMG, agency:'USFS' },
  { id:86, kind:'boondocking', title:'Valley of the Gods',          location:'Mexican Hat, UT',      lat:37.2658, lng:-109.8783, category:'offgrid', amenities:A_BOON.blm,  image:IMG, agency:'BLM' },
  { id:87, kind:'boondocking', title:'Anza-Borrego Dispersed',      location:'Borrego Springs, CA',  lat:33.2683, lng:-116.4061, category:'offgrid', amenities:A_BOON.blm,  image:IMG, agency:'State Park' },
  { id:88, kind:'boondocking', title:'White River NF Access',       location:'Vail, CO',             lat:39.6062, lng:-106.6300, category:'offgrid', amenities:A_BOON.usfs, image:IMG, agency:'USFS' },
  { id:89, kind:'boondocking', title:'Mojave Preserve Backcountry', location:'Baker, CA',            lat:35.0700, lng:-115.6000, category:'offgrid', amenities:A_BOON.nps,  image:IMG, agency:'NPS' },
  { id:90, kind:'boondocking', title:'Bonneville Salt Flats',       location:'Wendover, UT',         lat:40.7600, lng:-113.8400, category:'offgrid', amenities:A_BOON.blm,  image:IMG, agency:'BLM' },
  { id:91, kind:'boondocking', title:'Sedona Dispersed (FR 525)',   location:'Sedona, AZ',           lat:34.8650, lng:-111.8800, category:'offgrid', amenities:A_BOON.usfs, image:IMG, agency:'USFS' },
  { id:92, kind:'boondocking', title:'Hartman Rocks',               location:'Gunnison, CO',         lat:38.4830, lng:-106.9620, category:'offgrid', amenities:A_BOON.blm,  image:IMG, agency:'BLM' },
  { id:93, kind:'boondocking', title:'Maze District Overlook',      location:'Hanksville, UT',       lat:38.1450, lng:-110.1340, category:'offgrid', amenities:A_BOON.nps,  image:IMG, agency:'NPS' },
  { id:94, kind:'boondocking', title:'Diamond Fork Hot Springs Road',location:'Spanish Fork, UT',    lat:40.0980, lng:-111.3550, category:'offgrid', amenities:A_BOON.usfs, image:IMG, agency:'USFS' },
  { id:95, kind:'boondocking', title:'Sawtooth NRA Dispersed',      location:'Stanley, ID',          lat:44.2160, lng:-114.9290, category:'offgrid', amenities:A_BOON.usfs, image:IMG, agency:'USFS' },
  { id:96, kind:'boondocking', title:'Ozark-St Francis NF',         location:'Russellville, AR',     lat:35.5380, lng:-93.2400,  category:'offgrid', amenities:A_BOON.usfs, image:IMG, agency:'USFS' },
  { id:97, kind:'boondocking', title:'Snow Canyon Approach',        location:'Ivins, UT',            lat:37.2070, lng:-113.6420, category:'offgrid', amenities:A_BOON.blm,  image:IMG, agency:'BLM' },
  { id:98, kind:'boondocking', title:'Daniel Boone NF Dispersed',   location:'Stanton, KY',          lat:37.7600, lng:-83.6800,  category:'offgrid', amenities:A_BOON.usfs, image:IMG, agency:'USFS' },
  { id:99, kind:'boondocking', title:'Lake Powell Lone Rock Beach', location:'Big Water, UT',        lat:37.0093, lng:-111.5340, category:'offgrid', amenities:A_BOON.nps,  image:IMG, agency:'NPS' },
  { id:100,kind:'boondocking', title:'Green Mountain NF Dispersed', location:'Manchester, VT',       lat:43.1830, lng:-72.9580,  category:'offgrid', amenities:A_BOON.usfs, image:IMG, agency:'USFS' },
];

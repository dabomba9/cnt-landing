import { readPublishedSnapshot, IPublishedSnapshot } from './published-snapshot.util';
import type { IDraftListing, IHouseRules } from './draft-listing.types';

export type Category = 'vineyard' | 'farm' | 'brewery' | 'attraction' | 'offgrid';

export const CATEGORY_META: Record<Category, { label: string; color: string; icon: string }> = {
  vineyard:   { label: 'Vineyard',   color: '#A541A1', icon: 'wine_bar' },
  farm:       { label: 'Farm',       color: '#DE5260', icon: 'agriculture' },
  brewery:    { label: 'Brewery',    color: '#E8A23D', icon: 'sports_bar' },
  attraction: { label: 'Attraction', color: '#3B7B7A', icon: 'attractions' },
  offgrid:    { label: 'Off-Grid',   color: '#295d42', icon: 'forest' },
};

export type Amenity =
  | 'back-in' | 'pull-through' | 'electricity' | 'potable-water' | 'dump-station' | 'sewage'
  | 'cell-coverage' | 'wifi' | 'campfires' | 'pets' | 'trash' | 'recycle' | 'picnic-table'
  | 'toilet' | 'shower' | 'laundry' | 'tents-allowed' | 'vehicles-allowed' | 'hot-tub'
  | 'wheelchair'
  // Added in the amenities expansion:
  | 'ev-charging' | 'fire-ring' | 'outdoor-grill' | 'generator-ok'
  | 'outdoor-lighting' | 'sunshade' | 'water-fill' | 'lockable-storage';

export const AMENITY_LABELS: Record<Amenity, string> = {
  'back-in':         'Back In',
  'pull-through':    'Pull Through',
  'electricity':     'Electricity',
  'potable-water':   'Potable Water',
  'dump-station':    'Dump Station',
  'sewage':          'Sewage',
  'cell-coverage':   'Cell Phone Coverage',
  'wifi':            'Wifi',
  'campfires':       'Campfires Allowed',
  'pets':            'Pets Allowed',
  'trash':           'Trash Provided',
  'recycle':         'Recycle Provided',
  'picnic-table':    'Picnic Table',
  'toilet':          'Toilet Available',
  'shower':          'Shower',
  'laundry':         'Laundry',
  'tents-allowed':   'Tents Allowed',
  'vehicles-allowed':'Vehicles Allowed',
  'hot-tub':         'Hot Tub/Pool',
  'wheelchair':      'Wheelchair Accessible',
  'ev-charging':       'EV Charging',
  'fire-ring':         'Fire Ring',
  'outdoor-grill':     'Outdoor Grill',
  'generator-ok':      'Generator-Friendly',
  'outdoor-lighting':  'Outdoor Lighting',
  'sunshade':          'Sunshade',
  'water-fill':        'Drinking-Water Fill',
  'lockable-storage':  'Lockable Storage',
};

export const AMENITY_GROUP: Amenity[] = [
  'pull-through','electricity','potable-water','dump-station',
  'sewage','cell-coverage','wifi','campfires',
  'pets','trash','recycle','picnic-table',
  'toilet','shower','laundry','tents-allowed',
  'vehicles-allowed','hot-tub','wheelchair',
];

export const AMENITY_ICONS: Record<Amenity, string> = {
  'back-in':           'directions_car',
  'pull-through':      'swap_horiz',
  'electricity':       'bolt',
  'potable-water':     'water_drop',
  'dump-station':      'delete',
  'sewage':            'plumbing',
  'cell-coverage':     'signal_cellular_alt',
  'wifi':              'wifi',
  'campfires':         'local_fire_department',
  'pets':              'pets',
  'trash':             'delete_outline',
  'recycle':           'recycling',
  'picnic-table':      'outdoor_grill',
  'toilet':            'wc',
  'shower':            'shower',
  'laundry':           'local_laundry_service',
  'tents-allowed':     'camping',
  'vehicles-allowed':  'commute',
  'hot-tub':           'hot_tub',
  'wheelchair':        'accessible',
  'ev-charging':       'ev_station',
  'fire-ring':         'local_fire_department',
  'outdoor-grill':     'outdoor_grill',
  'generator-ok':      'power',
  'outdoor-lighting':  'wb_incandescent',
  'sunshade':          'umbrella',
  'water-fill':        'local_drink',
  'lockable-storage':  'lock',
};

export type RvType = 'class-a' | 'class-b' | 'class-c' | 'fifth-wheel' | 'travel-trailer' | 'truck-camper' | 'teardrop' | 'popup';

export const RV_TYPES: { id: RvType; label: string; image: string }[] = [
  { id: 'class-a',         label: 'Class A',         image: 'assets/images/Class-A_CNT.svg' },
  { id: 'class-b',         label: 'Class B',         image: 'assets/images/Class-B_CNT.svg' },
  { id: 'class-c',         label: 'Class C',         image: 'assets/images/Class-C_CNT.svg' },
  { id: 'fifth-wheel',     label: 'Fifth Wheel',     image: 'assets/images/FifthWheel_CNT.svg' },
  { id: 'travel-trailer',  label: 'Travel Trailer',  image: 'assets/images/Travel_CNT.svg' },
  { id: 'truck-camper',    label: 'Truck Camper',    image: 'assets/images/App_TruckCamper_CNT.svg' },
  { id: 'teardrop',        label: 'Teardrop',        image: 'assets/images/TearDrop_CNT.svg' },
  { id: 'popup',           label: 'Popup Camper',    image: 'assets/images/Popup_CNT.svg' },
];

/** Listing kind — drives the entire booking/discovery treatment downstream. */
export type ListingKind = 'private' | 'boondocking';

/** Managing agency for boondocking sites. */
export type ListingAgency = 'BLM' | 'USFS' | 'NPS' | 'State Park' | 'Army Corps' | 'County' | 'Other';

/** Shared base for every map-pinnable stay, regardless of kind. */
export interface IListingBase {
  id: number;
  title: string;
  location: string;
  lat: number;
  lng: number;
  category: Category;
  amenities: Amenity[];
  image: string;
}

/**
 * Private host stay — has a price, rating, reviews, and a Reserve/Instant Book path.
 * `kind` is optional so historical entries without it still narrow to this branch.
 */
export interface IPrivateListing extends IListingBase {
  kind?: 'private';
  price: number;
  rating: number;
  reviewCount: number;
  /** Instant Book — booking confirms automatically when dates are available. */
  instantBook: boolean;
}

/**
 * Boondocking public-land entry — no price, no rating, no reservation flow.
 * Lives in `MOCK_BOONDOCKING` (see `./mock-boondocking.data.ts`).
 */
export interface IBoondockingListing extends IListingBase {
  kind: 'boondocking';
  agency: ListingAgency;
}

export type IListing = IPrivateListing | IBoondockingListing;

export const AGENCY_META: Record<ListingAgency, { label: string; icon: string }> = {
  'BLM':         { label: 'Bureau of Land Management', icon: 'landscape' },
  'USFS':        { label: 'U.S. Forest Service',       icon: 'park' },
  'NPS':         { label: 'National Park Service',     icon: 'forest' },
  'State Park':  { label: 'State Park',                icon: 'park' },
  'Army Corps':  { label: 'Army Corps of Engineers',   icon: 'shield' },
  'County':      { label: 'County Park',               icon: 'apartment' },
  'Other':       { label: 'Public land',               icon: 'public' },
};

const IMG = {
  vineyard:    'assets/images/host_vineyard.webp',
  farm:        'assets/images/host_farm.webp',
  brewery:     'assets/images/host_brewery.webp',
  attraction:  'assets/images/host_museum.webp',
  offgrid:     'assets/images/host_opportunity.webp',
  alpaca:      'assets/images/host_alpaca.webp',
  dairy:       'assets/images/host_dairy.webp',
  hops:        'assets/images/host_hops.webp',
  village:     'assets/images/host_village.webp',
  boondocking: 'assets/images/host_opportunity.webp',
};

/** Amenity bundles for boondocking — typically no hookups, just terrain + permit info. */
const A_BOON = {
  blm:   ['back-in','pets','campfires','tents-allowed','vehicles-allowed'] as Amenity[],
  usfs:  ['back-in','pets','campfires','tents-allowed','potable-water','toilet'] as Amenity[],
  nps:   ['back-in','pets','tents-allowed','toilet'] as Amenity[],
};

const A = {
  vineyard: ['back-in','electricity','potable-water','wifi','picnic-table','toilet','pets','trash'] as Amenity[],
  farm:     ['back-in','electricity','potable-water','pets','campfires','trash','tents-allowed'] as Amenity[],
  brewery:  ['pull-through','electricity','potable-water','wifi','cell-coverage','toilet','pets'] as Amenity[],
  attract:  ['pull-through','electricity','potable-water','dump-station','sewage','wifi','cell-coverage','shower','laundry','toilet'] as Amenity[],
  offgrid:  ['back-in','campfires','cell-coverage','pets','tents-allowed'] as Amenity[],
};

const RAW_LISTINGS: Omit<IPrivateListing, 'reviewCount' | 'instantBook'>[] = [
  // California — wine country & coast
  { id:1,  title:'Heritage Oak Vineyard',     location:'St. Helena, CA',     lat:38.5052, lng:-122.4724, price:125, rating:4.9, category:'vineyard',   amenities:[...A.vineyard,'hot-tub'],         image:IMG.vineyard },
  { id:2,  title:'Whispering Pines Winery',   location:'Healdsburg, CA',     lat:38.6102, lng:-122.8694, price:95,  rating:4.7, category:'vineyard',   amenities:A.vineyard,                        image:IMG.vineyard },
  { id:3,  title:'Summit Crest Estate',       location:'Sonoma, CA',         lat:38.2919, lng:-122.4580, price:165, rating:5.0, category:'vineyard',   amenities:[...A.vineyard,'sewage','laundry'], image:IMG.vineyard },
  { id:4,  title:'Paso Robles Hideaway',      location:'Paso Robles, CA',    lat:35.6266, lng:-120.6910, price:80,  rating:4.6, category:'vineyard',   amenities:A.vineyard,                        image:IMG.vineyard },
  { id:5,  title:'Anza Desert Ranch',         location:'Anza, CA',           lat:33.5552, lng:-116.6739, price:45,  rating:4.4, category:'offgrid',    amenities:[...A.offgrid,'potable-water'],    image:IMG.offgrid },
  { id:6,  title:'Mendocino Coast Stay',      location:'Mendocino, CA',      lat:39.3076, lng:-123.7995, price:110, rating:4.8, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:7,  title:'Big Sur Bluff',             location:'Big Sur, CA',        lat:36.2704, lng:-121.8081, price:140, rating:4.9, category:'attraction', amenities:[...A.attract,'shower'],           image:IMG.attraction },
  { id:8,  title:'Joshua Tree Outpost',       location:'Joshua Tree, CA',    lat:34.1347, lng:-116.3131, price:55,  rating:4.5, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:9,  title:'Capay Valley Farmstay',     location:'Esparto, CA',        lat:38.6877, lng:-122.0196, price:65,  rating:4.7, category:'farm',       amenities:A.farm,                            image:IMG.farm },
  { id:10, title:'Half Moon Bay Coast',       location:'Half Moon Bay, CA',  lat:37.4636, lng:-122.4286, price:105, rating:4.6, category:'attraction', amenities:A.attract,                         image:IMG.attraction },

  // Oregon
  { id:11, title:'Willamette Hop Yard',       location:'McMinnville, OR',    lat:45.2104, lng:-123.1959, price:75,  rating:4.8, category:'brewery',    amenities:A.brewery,                         image:IMG.hops },
  { id:12, title:'Bend High Desert Brewery',  location:'Bend, OR',           lat:44.0582, lng:-121.3153, price:65,  rating:4.7, category:'brewery',    amenities:A.brewery,                         image:IMG.brewery },
  { id:13, title:'Hood River Orchard',        location:'Hood River, OR',     lat:45.7054, lng:-121.5215, price:70,  rating:4.6, category:'farm',       amenities:A.farm,                            image:IMG.farm },
  { id:14, title:'Crater Lake Gateway',       location:'Prospect, OR',       lat:42.7506, lng:-122.4905, price:50,  rating:4.5, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:15, title:'Cannon Beach Coast Camp',   location:'Cannon Beach, OR',   lat:45.8918, lng:-123.9615, price:115, rating:4.8, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:16, title:'Dundee Hills Vines',        location:'Dundee, OR',         lat:45.2790, lng:-123.0143, price:85,  rating:4.7, category:'vineyard',   amenities:A.vineyard,                        image:IMG.vineyard },

  // Washington
  { id:17, title:'Walla Walla Estates',       location:'Walla Walla, WA',    lat:46.0646, lng:-118.3430, price:90,  rating:4.8, category:'vineyard',   amenities:A.vineyard,                        image:IMG.vineyard },
  { id:18, title:'Olympic Peninsula Farm',    location:'Sequim, WA',         lat:48.0791, lng:-123.1024, price:60,  rating:4.6, category:'farm',       amenities:A.farm,                            image:IMG.farm },
  { id:19, title:'San Juan Coast Stay',       location:'Friday Harbor, WA',  lat:48.5346, lng:-123.0218, price:135, rating:4.9, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:20, title:'Yakima Hop Field',          location:'Yakima, WA',         lat:46.6021, lng:-120.5059, price:55,  rating:4.5, category:'brewery',    amenities:A.brewery,                         image:IMG.hops },

  // Idaho / Montana / Wyoming
  { id:21, title:'Sun Valley Hideout',        location:'Ketchum, ID',        lat:43.6805, lng:-114.3645, price:95,  rating:4.7, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:22, title:'Coeur d\'Alene Lakeside',   location:'Coeur d\'Alene, ID', lat:47.6777, lng:-116.7805, price:120, rating:4.8, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:23, title:'Bozeman Brewery Pad',       location:'Bozeman, MT',        lat:45.6770, lng:-111.0429, price:70,  rating:4.7, category:'brewery',    amenities:A.brewery,                         image:IMG.brewery },
  { id:24, title:'Glacier Ranch Camp',        location:'Whitefish, MT',      lat:48.4108, lng:-114.3375, price:85,  rating:4.9, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:25, title:'Big Sky Cattle Ranch',      location:'Big Sky, MT',        lat:45.2618, lng:-111.3084, price:80,  rating:4.6, category:'farm',       amenities:A.farm,                            image:IMG.farm },
  { id:26, title:'Jackson Hole Outpost',      location:'Jackson, WY',        lat:43.4799, lng:-110.7624, price:140, rating:4.9, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:27, title:'Cody Yellowstone Edge',     location:'Cody, WY',           lat:44.5263, lng:-109.0565, price:65,  rating:4.6, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },

  // Utah
  { id:28, title:'Camping in the Pines',      location:'Alton, UT',          lat:37.4391, lng:-112.4860, price:64,  rating:4.7, category:'offgrid',    amenities:['back-in','electricity'],         image:IMG.offgrid },
  { id:29, title:'Winding River Ranch',       location:'Panguitch, UT',      lat:37.8225, lng:-112.4358, price:85,  rating:4.8, category:'farm',       amenities:['pull-through','electricity','potable-water','dump-station','sewage','cell-coverage','wifi'], image:IMG.farm },
  { id:30, title:'RV Campers Secret Garden',  location:'Richfield, UT',      lat:38.7705, lng:-112.0844, price:93,  rating:4.7, category:'farm',       amenities:['back-in','electricity','potable-water','cell-coverage','wifi','campfires','trash'], image:IMG.farm },
  { id:31, title:'Moab Slickrock Stay',       location:'Moab, UT',           lat:38.5733, lng:-109.5498, price:75,  rating:4.8, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:32, title:'Zion Gateway Ranch',        location:'Hurricane, UT',      lat:37.1750, lng:-113.2891, price:90,  rating:4.7, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:33, title:'Bryce Canyon Outpost',      location:'Tropic, UT',         lat:37.6275, lng:-112.0832, price:70,  rating:4.6, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },

  // Colorado
  { id:34, title:'Grand Junction Vines',      location:'Palisade, CO',       lat:39.1097, lng:-108.3506, price:80,  rating:4.7, category:'vineyard',   amenities:A.vineyard,                        image:IMG.vineyard },
  { id:35, title:'Durango Mountain Farm',     location:'Durango, CO',        lat:37.2753, lng:-107.8801, price:75,  rating:4.6, category:'farm',       amenities:A.farm,                            image:IMG.dairy },
  { id:36, title:'Crested Butte Wildflower',  location:'Crested Butte, CO',  lat:38.8697, lng:-106.9878, price:100, rating:4.9, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:37, title:'Steamboat Brewery Stop',    location:'Steamboat Springs, CO', lat:40.4850, lng:-106.8317, price:78, rating:4.7, category:'brewery', amenities:A.brewery,                          image:IMG.brewery },
  { id:38, title:'Pagosa Hot Spring Camp',    location:'Pagosa Springs, CO', lat:37.2695, lng:-107.0098, price:95,  rating:4.8, category:'attraction', amenities:[...A.attract,'hot-tub'],          image:IMG.attraction },

  // New Mexico
  { id:39, title:'Santa Fe High Desert',      location:'Santa Fe, NM',       lat:35.6870, lng:-105.9378, price:65,  rating:4.6, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:40, title:'Taos Mesa Camp',            location:'Taos, NM',           lat:36.4072, lng:-105.5734, price:55,  rating:4.5, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:41, title:'Hatch Chile Farm',          location:'Hatch, NM',          lat:32.6663, lng:-107.1525, price:50,  rating:4.4, category:'farm',       amenities:A.farm,                            image:IMG.farm },

  // Arizona
  { id:42, title:'Sedona Red Rock Stay',      location:'Sedona, AZ',         lat:34.8697, lng:-111.7610, price:120, rating:4.9, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:43, title:'Flagstaff Pine Camp',       location:'Flagstaff, AZ',      lat:35.1983, lng:-111.6513, price:60,  rating:4.6, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:44, title:'Tucson Sonoran Ranch',      location:'Tucson, AZ',         lat:32.2226, lng:-110.9747, price:55,  rating:4.5, category:'farm',       amenities:A.farm,                            image:IMG.farm },
  { id:45, title:'Page Lake Powell View',     location:'Page, AZ',           lat:36.9147, lng:-111.4558, price:70,  rating:4.6, category:'attraction', amenities:A.attract,                         image:IMG.attraction },

  // Texas Hill Country
  { id:46, title:'Fredericksburg Vines',      location:'Fredericksburg, TX', lat:30.2752, lng:-98.8720,  price:85,  rating:4.7, category:'vineyard',   amenities:A.vineyard,                        image:IMG.vineyard },
  { id:47, title:'Hill Country Brewery',      location:'Driftwood, TX',      lat:30.1119, lng:-98.0008,  price:65,  rating:4.6, category:'brewery',    amenities:A.brewery,                         image:IMG.brewery },
  { id:48, title:'Big Bend Ranch Camp',       location:'Terlingua, TX',      lat:29.3181, lng:-103.6168, price:45,  rating:4.5, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:49, title:'Austin Lakeside',           location:'Austin, TX',         lat:30.2672, lng:-97.7431,  price:90,  rating:4.7, category:'attraction', amenities:A.attract,                         image:IMG.attraction },

  // Midwest
  { id:50, title:'Ozarks Hidden Hollow',      location:'Branson, MO',        lat:36.6437, lng:-93.2185,  price:50,  rating:4.5, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:51, title:'Door County Cherry Farm',   location:'Sturgeon Bay, WI',   lat:44.8344, lng:-87.3770,  price:65,  rating:4.7, category:'farm',       amenities:A.farm,                            image:IMG.farm },
  { id:52, title:'Madison Brewery Stay',      location:'Madison, WI',        lat:43.0731, lng:-89.4012,  price:60,  rating:4.6, category:'brewery',    amenities:A.brewery,                         image:IMG.brewery },
  { id:53, title:'North Shore Camp',          location:'Grand Marais, MN',   lat:47.7506, lng:-90.3343,  price:70,  rating:4.7, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:54, title:'Minneapolis Hop Pad',       location:'Minneapolis, MN',    lat:44.9778, lng:-93.2650,  price:55,  rating:4.5, category:'brewery',    amenities:A.brewery,                         image:IMG.brewery },
  { id:55, title:'Iowa Heartland Farm',       location:'Decorah, IA',        lat:43.3033, lng:-91.7857,  price:45,  rating:4.4, category:'farm',       amenities:A.farm,                            image:IMG.dairy },

  // Michigan / Great Lakes
  { id:56, title:'Traverse City Vineyard',    location:'Traverse City, MI',  lat:44.7631, lng:-85.6206,  price:80,  rating:4.7, category:'vineyard',   amenities:A.vineyard,                        image:IMG.vineyard },
  { id:57, title:'Sleeping Bear Dunes',       location:'Empire, MI',         lat:44.8108, lng:-86.0581,  price:75,  rating:4.8, category:'attraction', amenities:A.attract,                         image:IMG.attraction },

  // Northeast
  { id:58, title:'Finger Lakes Estate',       location:'Hammondsport, NY',   lat:42.4109, lng:-77.2197,  price:90,  rating:4.8, category:'vineyard',   amenities:A.vineyard,                        image:IMG.vineyard },
  { id:59, title:'Adirondack Hideaway',       location:'Lake Placid, NY',    lat:44.2795, lng:-73.9799,  price:85,  rating:4.7, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:60, title:'Vermont Dairy Farm',        location:'Stowe, VT',          lat:44.4654, lng:-72.6874,  price:70,  rating:4.7, category:'farm',       amenities:A.farm,                            image:IMG.dairy },
  { id:61, title:'Burlington Brewery Camp',   location:'Burlington, VT',     lat:44.4759, lng:-73.2121,  price:65,  rating:4.6, category:'brewery',    amenities:A.brewery,                         image:IMG.brewery },
  { id:62, title:'White Mountains Camp',      location:'North Conway, NH',   lat:44.0537, lng:-71.1281,  price:60,  rating:4.5, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:63, title:'Acadia Coast Camp',         location:'Bar Harbor, ME',     lat:44.3876, lng:-68.2039,  price:110, rating:4.9, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:64, title:'Maine Lobster Farm',        location:'Camden, ME',         lat:44.2098, lng:-69.0648,  price:85,  rating:4.7, category:'farm',       amenities:A.farm,                            image:IMG.farm },

  // Mid-Atlantic / Appalachia
  { id:65, title:'Shenandoah Vista',          location:'Luray, VA',          lat:38.6651, lng:-78.4595,  price:65,  rating:4.6, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:66, title:'Charlottesville Vineyard',  location:'Charlottesville, VA',lat:38.0293, lng:-78.4767,  price:90,  rating:4.7, category:'vineyard',   amenities:A.vineyard,                        image:IMG.vineyard },
  { id:67, title:'Blue Ridge Brewery',        location:'Asheville, NC',      lat:35.5951, lng:-82.5515,  price:75,  rating:4.8, category:'brewery',    amenities:A.brewery,                         image:IMG.brewery },
  { id:68, title:'Smoky Mountain Camp',       location:'Gatlinburg, TN',     lat:35.7143, lng:-83.5102,  price:60,  rating:4.6, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:69, title:'Bourbon Trail Farm',        location:'Bardstown, KY',      lat:37.8092, lng:-85.4669,  price:55,  rating:4.5, category:'farm',       amenities:A.farm,                            image:IMG.farm },

  // Southeast
  { id:70, title:'Savannah Coast Camp',       location:'Savannah, GA',       lat:32.0809, lng:-81.0912,  price:80,  rating:4.6, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:71, title:'Peach Country Orchard',     location:'Macon, GA',          lat:32.8407, lng:-83.6324,  price:50,  rating:4.4, category:'farm',       amenities:A.farm,                            image:IMG.farm },
  { id:72, title:'Florida Keys Beachside',    location:'Marathon, FL',       lat:24.7136, lng:-81.0900,  price:140, rating:4.9, category:'attraction', amenities:A.attract,                         image:IMG.attraction },
  { id:73, title:'Panhandle Cypress Camp',    location:'Apalachicola, FL',   lat:29.7263, lng:-84.9858,  price:55,  rating:4.5, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:74, title:'New Orleans Bayou Stop',    location:'Slidell, LA',        lat:30.2752, lng:-89.7812,  price:65,  rating:4.5, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:75, title:'Charleston Lowcountry',     location:'Charleston, SC',     lat:32.7765, lng:-79.9311,  price:95,  rating:4.7, category:'attraction', amenities:A.attract,                         image:IMG.attraction },

  // Plains
  { id:76, title:'Black Hills Outpost',       location:'Custer, SD',         lat:43.7666, lng:-103.5985, price:60,  rating:4.6, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:77, title:'Badlands Edge Camp',        location:'Wall, SD',           lat:43.9928, lng:-102.2415, price:50,  rating:4.4, category:'offgrid',    amenities:A.offgrid,                         image:IMG.offgrid },
  { id:78, title:'Nebraska Sandhills Ranch',  location:'Valentine, NE',      lat:42.8730, lng:-100.5510, price:45,  rating:4.3, category:'farm',       amenities:A.farm,                            image:IMG.farm },
  { id:79, title:'Kansas Flint Hills',        location:'Cottonwood Falls, KS',lat:38.3719,lng:-96.5439,  price:40,  rating:4.4, category:'farm',       amenities:A.farm,                            image:IMG.farm },
  { id:80, title:'Ozark Cabin Hollow',        location:'Eureka Springs, AR', lat:36.4015, lng:-93.7377,  price:65,  rating:4.6, category:'offgrid',    amenities:A.offgrid,                         image:IMG.alpaca },

];

// Deterministic review count + instant-book flag derived from id so mock data is stable across reloads.
// id=1 (Heritage Oak) is force-true; about 60% of others are instant-bookable.
export const MOCK_LISTINGS: IPrivateListing[] = RAW_LISTINGS.map(l => ({
  ...l,
  reviewCount: ((l.id * 17 + 23) % 380) + 12,
  instantBook: l.id === 1 ? true : ((l.id * 11 + 7) % 10) < 6,
}));

export const PRICE_RANGE = {
  min: Math.min(...MOCK_LISTINGS.map(l => l.price)),
  max: Math.max(...MOCK_LISTINGS.map(l => l.price)),
};

import { MOCK_BOONDOCKING } from './mock-boondocking.data';

/** Unified view across private stays + boondocking — used by /search and /wishlists. */
export const ALL_LISTINGS: IListing[] = [...MOCK_LISTINGS, ...MOCK_BOONDOCKING];

/** Look up a listing of either kind by numeric id. */
export function findListing(id: number): IListing | undefined {
  return ALL_LISTINGS.find(l => l.id === id);
}

/**
 * Listings flagged as "New" — small deterministic subset (~15%).
 * In a real backend this would come from a `createdAt` field; here we mock it.
 */
export const NEW_LISTING_IDS: Set<number> = new Set(
  MOCK_LISTINGS.filter(l => (l.id * 13 + 5) % 23 < 4).map(l => l.id),
);

/**
 * "Best Value" — for each category, the cheapest listing among those with
 * rating ≥ 4.7. Surfaced as a marketing chip on cards.
 */
export const BEST_VALUE_IDS: Set<number> = (() => {
  const out = new Set<number>();
  const cats = new Set(MOCK_LISTINGS.map(l => l.category));
  for (const cat of cats) {
    const candidates = MOCK_LISTINGS
      .filter(l => l.category === cat && l.rating >= 4.7)
      .sort((a, b) => a.price - b.price);
    if (candidates.length > 0) out.add(candidates[0].id);
  }
  return out;
})();

// =============================================================================
// LISTING DETAIL — extended fields for /listing detail page
// =============================================================================

export interface IHost {
  name: string;
  initials: string;
  avatar: string;          // image URL — photo of the host or a relevant scene
  joinedYear: number;
  bio: string;
  responseHours: number;   // e.g., 2 = "typically responds within 2 hours"
}

export type CancellationTier = 'easy-goin' | 'moderate' | 'strict' | 'exclusive';

export const CANCELLATION_TIER_META: Record<CancellationTier, { label: string; summary: string; color: string }> = {
  'easy-goin':  { label: "Easy Goin'", summary: 'Free cancellation up to 1 day before check-in.',           color: '#295d42' },
  'moderate':   { label: 'Moderate',    summary: 'Free cancellation up to 3 days before check-in.',          color: '#3B7B7A' },
  'strict':     { label: 'Strict',      summary: 'Half refund up to 7 days before check-in.',                color: '#E8A23D' },
  'exclusive':  { label: 'Exclusive',   summary: 'Non-refundable. No refunds for cancellations.',            color: '#A541A1' },
};

export interface IReview {
  authorName: string;
  authorInitials: string;
  date: string;            // "March 2026"
  rating: number;          // 1-5
  text: string;
}

export interface ISubScores {
  cleanliness: number;
  communication: number;
  hookups: number;
  location: number;
  value: number;
}

export type TrustBadge = 'verified-host' | 'id-checked' | 'land-insured' | 'superhost';

export const TRUST_BADGE_META: Record<TrustBadge, { label: string; icon: string }> = {
  'verified-host': { label: 'Verified host',  icon: 'verified' },
  'id-checked':    { label: 'ID checked',     icon: 'badge' },
  'land-insured':  { label: 'Land insured',   icon: 'shield' },
  'superhost':     { label: 'Superhost',      icon: 'workspace_premium' },
};

export type NearbyType = 'gas' | 'grocery' | 'dump' | 'attraction' | 'restaurant';

export const NEARBY_META: Record<NearbyType, { label: string; icon: string }> = {
  'gas':         { label: 'Gas station',   icon: 'local_gas_station' },
  'grocery':     { label: 'Grocery',       icon: 'shopping_cart' },
  'dump':        { label: 'Dump station',  icon: 'water_drop' },
  'attraction':  { label: 'Attraction',    icon: 'attractions' },
  'restaurant':  { label: 'Restaurant',    icon: 'restaurant' },
};

export interface INearbyPoi {
  type: NearbyType;
  name: string;
  distance: string;        // "0.8 mi"
}

export type PadType   = 'gravel' | 'grass' | 'concrete' | 'dirt';
export type Leveling  = 'level' | 'mostly-level' | 'needs-blocks';
export type SewerType = 'full-hookup' | 'dump-station' | 'none';
export type SlideoutClearance = 'tight' | 'moderate' | 'open';
export type HookupAmps = 30 | 50 | null;

export const PAD_TYPE_META: Record<PadType, { label: string }> = {
  'gravel':   { label: 'Gravel' },
  'grass':    { label: 'Grass' },
  'concrete': { label: 'Concrete' },
  'dirt':     { label: 'Dirt' },
};

export const LEVELING_META: Record<Leveling, { label: string }> = {
  'level':         { label: 'Level' },
  'mostly-level':  { label: 'Mostly level' },
  'needs-blocks':  { label: 'Needs blocks' },
};

export const SEWER_META: Record<SewerType, { label: string }> = {
  'full-hookup':  { label: 'Full hookup' },
  'dump-station': { label: 'Dump station' },
  'none':         { label: 'None' },
};

export const CLEARANCE_META: Record<SlideoutClearance, { label: string }> = {
  'tight':    { label: 'Tight — measure first' },
  'moderate': { label: 'Moderate' },
  'open':     { label: 'Open — slides clear' },
};

export interface IListingFaq {
  q: string;
  a: string;
}

export interface IAddOn {
  id: string;
  label: string;
  description: string;
  icon: string;             // material symbols name
  price: number;
  unit: 'per stay' | 'per night' | 'per person' | 'per unit';
  /** Optional square thumbnail data URL — host-uploaded; ~400px max. */
  photo?: string;
}

export interface ISiteSpecs {
  padType: PadType;
  padLength: number;        // feet
  maxRigLength: number;     // feet
  leveling: Leveling;
  hookupAmps: HookupAmps;
  waterAvailable: boolean;
  sewerType: SewerType;
  bigRigFriendly: boolean;
  slideoutClearance: SlideoutClearance;
}

export interface IListingDetail {
  description: string;
  host: IHost;
  photos: string[];
  /** Optional per-photo captions, index-aligned with `photos`. Empty/undefined for seeded listings. */
  photoCaptions?: string[];
  houseRules: string[];
  cancellationTier: CancellationTier;
  maxGuests: number;        // e.g. 4 — total guests the site can accommodate
  maxStayNights: number;    // e.g. 14 — longest reservation allowed
  subScores: ISubScores;
  reviews: IReview[];
  nearby: INearbyPoi[];
  trustBadges: TrustBadge[];
  /** ISO YYYY-MM-DD strings — dates already booked / unavailable. */
  unavailableDates: string[];
  siteSpecs: ISiteSpecs;
  addOns: IAddOn[];
  faqs: IListingFaq[];
}

const HOST_POOL: Pick<IHost, 'name' | 'initials'>[] = [
  { name: 'Aaron R.',     initials: 'AR' },
  { name: 'Jenna M.',     initials: 'JM' },
  { name: 'Mike T.',      initials: 'MT' },
  { name: 'Sarah L.',     initials: 'SL' },
  { name: 'David W.',     initials: 'DW' },
  { name: 'Carolyn K.',   initials: 'CK' },
  { name: 'Tom & Becky',  initials: 'TB' },
  { name: 'Marcus B.',    initials: 'MB' },
  { name: 'Elena P.',     initials: 'EP' },
  { name: 'Greg & Linda', initials: 'GL' },
];

const TIER_BY_INDEX: CancellationTier[] = ['easy-goin', 'moderate', 'strict', 'exclusive'];

const PHOTO_POOL = [
  'assets/images/host_vineyard.webp',
  'assets/images/host_farm.webp',
  'assets/images/host_brewery.webp',
  'assets/images/host_museum.webp',
  'assets/images/host_opportunity.webp',
  'assets/images/host_alpaca.webp',
  'assets/images/host_dairy.webp',
  'assets/images/host_hops.webp',
  'assets/images/host_village.webp',
];

const CATEGORY_DESCRIPTIONS: Record<Category, (location: string) => string> = {
  vineyard: (loc) => `Tucked between rows of producing vines, this stay puts you steps from the cellar door. Mornings start with fog rolling off the trellises and end with a glass from the host's own pour. ${loc} is one of the most photographed wine regions in the country, and your spot here lets you skip the crowds and post up among the people actually growing what's in your glass. Hookups are dialed; the WiFi reaches the patio; and the on-site picnic table seats six.`,
  farm: (loc) => `Working family farm with chickens, a couple of friendly dogs, and a host who grew up walking these fields. ${loc} sits in some of the most fertile country in the region, and the daily rhythm out here will reset whatever city pace you arrived with. Expect rooster wake-ups, fresh eggs left at your door if you ask, and the host's coffee on the porch most mornings.`,
  brewery: (loc) => `Right behind the brewhouse — close enough to walk over for last call, far enough that the kegs don't keep you up. ${loc} has earned a reputation as a destination for serious beer travelers, and your stay puts you among locals who know which taps to chase. Pull-through access is straightforward; the brewery's bathrooms are open during operating hours; and the pizza oven runs Friday evenings.`,
  attraction: (loc) => `An iconic basecamp for ${loc} — the kind of stop that earns its place on every road-trip itinerary. The site is set up for full hookups and easy pull-through, with cell coverage strong enough for working remote and a WiFi extender on the office side of the property if you need it. Trails, scenic drives, and the headline attraction are all within a short drive.`,
  offgrid: (loc) => `Real off-grid stay — quiet, dark skies, and a million stars on a clear night. ${loc} is exactly as remote as it sounds. Cell coverage is spotty (we'll send a guide on what works in the area). Bring water, bring layers, and plan to power down. The host checks in once on arrival and otherwise leaves you to your trip.`,
};

const HOUSE_RULES_BY_CATEGORY: Record<Category, string[]> = {
  vineyard: [
    'Quiet hours from 10 PM – 8 AM (please respect the host\'s home and the vines).',
    'No glassware in the vineyard rows — please use plastic or stainless tumblers.',
    'Pets welcome on leash; please clean up after them.',
    'Dump station is available for use; please follow posted instructions.',
    'Up to 2 vehicles allowed at the site; coordinate with host for additional.',
  ],
  farm: [
    'Quiet hours from 9 PM – 7 AM (yes, the rooster crows earlier).',
    'Please don\'t feed or pet the working animals without asking the host first.',
    'Pets welcome on leash; please keep them away from livestock.',
    'No campfires unless host has lit one; check fire conditions on arrival.',
    'Drive slowly on the farm road — kids and animals.',
  ],
  brewery: [
    'Quiet hours from 11 PM – 8 AM (the brewery closes at 10).',
    'Please don\'t leave glassware outside overnight.',
    'Pets welcome inside the brewery on leash and well-behaved.',
    'No outside alcohol consumed in the brewery seating area.',
    'Designated drivers always — even from your campsite.',
  ],
  attraction: [
    'Quiet hours from 10 PM – 8 AM.',
    'Please don\'t leave gear unattended at the picnic table overnight.',
    'Pets welcome on leash.',
    'Campfires only in the provided fire ring; douse fully before leaving.',
    'Trail map is in the welcome envelope on arrival.',
  ],
  offgrid: [
    'Pack it in, pack it out — there is no on-site trash service.',
    'Campfires only in the existing ring and only when conditions allow (check posted board).',
    'No generators between 10 PM and 7 AM.',
    'Pets welcome and very leash-recommended (wildlife present).',
    'Cell coverage spotty — share an itinerary before you arrive.',
  ],
};

const HOST_BIOS: Record<Category, string> = {
  vineyard:    'Third-generation winemaker who started hosting RVers because she wanted to share what makes this region special with the people willing to take the long way.',
  farm:        'Born on this land, raised on it, hosting on it. Knows every gate, every back road, and where the best sunset spot is.',
  brewery:     'Brewed his first batch in his garage in 2014. Now runs the place. Hosts because RV travelers tend to be his favorite customers.',
  attraction:  'Long-time RVer who knows what travelers actually need at a basecamp. Built the site to be the stop she wished existed when she was on the road.',
  offgrid:     'Bought this land twenty years ago and has spent every weekend since making it the kind of quiet you can\'t buy in town. Hosts because the right people deserve to find it.',
};

const REVIEW_POOL: Pick<IReview, 'authorName' | 'authorInitials' | 'text'>[] = [
  { authorName: 'Jamie & Pat',   authorInitials: 'JP', text: "Beautiful spot. Hookups were spotless, host left a handwritten welcome note, and the views at sunset were the kind you don't get at a campground. Already booked again." },
  { authorName: 'Renee K.',      authorInitials: 'RK', text: "Easily one of our favorite stays of the trip. Quiet, clean, and the host was around when we needed her and invisible when we didn't. Exactly what we look for." },
  { authorName: 'Doug M.',       authorInitials: 'DM', text: "Pull-through was generous, 50 amp held strong, and the WiFi reached the dinette. Host gave us a tip on a back road that saved us 40 minutes. Highly recommend." },
  { authorName: 'The Hendersons',authorInitials: 'TH', text: "Brought the dogs and they had the run of the field. Gravel pad was level, water pressure great, and the host's coffee on the porch in the morning was a nice touch." },
  { authorName: 'Carlos & Ana',  authorInitials: 'CA', text: "Worth the detour. The location is exactly what the listing showed, and we appreciated the clear arrival instructions. We'll be telling friends." },
  { authorName: 'Jenna T.',      authorInitials: 'JT', text: "Solo traveler — felt safe, comfortable, and welcomed. Host checked in once and left me to my trip. Loved it." },
  { authorName: 'Mark & Eli',    authorInitials: 'ME', text: "Site is well-maintained and exactly as described. Loved the picnic table and fire ring setup. Stargazing here is unreal." },
  { authorName: 'Priya S.',      authorInitials: 'PS', text: "Communication was top-notch from booking to checkout. Host responded within minutes every time. Would book again in a heartbeat." },
];

const NEARBY_POOL: INearbyPoi[] = [
  { type: 'gas',        name: 'Shell',                   distance: '1.2 mi' },
  { type: 'grocery',    name: 'Country Market',          distance: '2.4 mi' },
  { type: 'dump',       name: 'Public dump station',     distance: '3.8 mi' },
  { type: 'restaurant', name: "Mercer's Diner",          distance: '1.7 mi' },
  { type: 'attraction', name: 'State park trailhead',    distance: '4.5 mi' },
];

const COMMON_ADDONS: IAddOn[] = [
  { id: 'early-checkin',  label: 'Early check-in (12 PM)',   description: 'Arrive 2 hours earlier than standard.',           icon: 'login',         price: 25, unit: 'per stay' },
  { id: 'late-checkout',  label: 'Late check-out (1 PM)',    description: 'Stay 2 hours longer on departure day.',           icon: 'logout',        price: 25, unit: 'per stay' },
  { id: 'extra-vehicle',  label: 'Extra vehicle',            description: 'Bring a second vehicle (towable or otherwise).',  icon: 'directions_car',price: 15, unit: 'per night' },
  { id: 'pet-fee',        label: 'Pet fee',                  description: 'Up to two well-behaved pets.',                    icon: 'pets',          price: 20, unit: 'per stay' },
];

const ADDONS_BY_CATEGORY: Record<Category, IAddOn[]> = {
  vineyard: [
    { id: 'tasting-flight',  label: 'Tasting flight',         description: 'Five-pour tasting at the cellar door.',           icon: 'wine_bar',      price: 45, unit: 'per person' },
    { id: 'cheese-board',    label: 'Cheese & charcuterie',   description: 'Local cheese, cured meats, and a fresh baguette.',icon: 'restaurant',    price: 35, unit: 'per stay' },
    { id: 'vineyard-walk',   label: 'Sunrise vineyard walk',  description: 'Guided 45-min walk through the rows.',            icon: 'hiking',        price: 25, unit: 'per person' },
  ],
  farm: [
    { id: 'farm-tour',       label: 'Working farm tour',      description: 'Behind-the-scenes tour with the host.',           icon: 'agriculture',   price: 20, unit: 'per person' },
    { id: 'egg-basket',      label: 'Fresh egg basket',       description: 'A dozen eggs at your door each morning.',         icon: 'egg',           price: 15, unit: 'per stay' },
    { id: 'animal-feed',     label: 'Feed the animals',       description: 'Hands-on with chickens, goats, and donkeys.',     icon: 'cruelty_free',  price: 18, unit: 'per person' },
  ],
  brewery: [
    { id: 'brewery-tour',    label: 'Brewery tour & flight',  description: '30-min tour ending with a 4-pour tasting.',       icon: 'sports_bar',    price: 30, unit: 'per person' },
    { id: 'growler-fill',    label: 'Growler fill',           description: 'Take home a 64oz growler of any house pour.',     icon: 'local_drink',   price: 18, unit: 'per stay' },
    { id: 'pizza-voucher',   label: 'Pizza night voucher',    description: '$25 credit for the brewhouse pizza oven.',        icon: 'local_pizza',   price: 25, unit: 'per stay' },
  ],
  attraction: [
    { id: 'park-passes',     label: 'Park entry passes',      description: 'Daily entry to the local park or attraction.',    icon: 'confirmation_number', price: 25, unit: 'per person' },
    { id: 'sunrise-tour',    label: 'Sunrise scenic tour',    description: 'Host-led drive to the best vantage points.',      icon: 'wb_sunny',      price: 35, unit: 'per person' },
    { id: 'trail-map',       label: 'Trail guide pack',       description: 'Printed maps + curated route recommendations.',   icon: 'map',           price: 10, unit: 'per stay' },
  ],
  offgrid: [
    { id: 'firewood',        label: 'Firewood bundle',        description: 'Seasoned hardwood, split, ready to burn.',        icon: 'local_fire_department', price: 25, unit: 'per stay' },
    { id: 'stargazing-kit',  label: 'Stargazing kit',         description: 'Star chart, red-light headlamp, and binoculars.', icon: 'nights_stay',   price: 15, unit: 'per stay' },
    { id: 'water-fill',      label: 'Fresh water delivery',   description: '40 gallons delivered to your site.',              icon: 'water_drop',    price: 30, unit: 'per stay' },
  ],
};

const FAQS_BY_CATEGORY: Record<Category, IListingFaq[]> = {
  vineyard: [
    { q: 'Can I taste wine on-site?', a: 'Yes — the tasting room is a short walk from the RV pad and welcomes guests during posted hours. Some hosts include a complimentary pour; others offer a discounted flight.' },
    { q: 'Is there cell service?', a: 'Coverage varies by carrier. Most guests report reliable 4G/LTE on at least one major network; the host will share specifics in your arrival message.' },
    { q: 'Can I have a fire?', a: 'No open campfires in vineyard rows. Propane fire pits are generally welcome at the RV pad — confirm with the host before arrival.' },
    { q: 'Are pets allowed in the rows?', a: 'Pets are welcome at the pad on-leash, but please keep them out of the planted rows. Cleanup bags are provided at the pad.' },
  ],
  farm: [
    { q: 'Can we interact with the animals?', a: 'Some hosts offer scheduled visits or feedings; others ask guests to admire from a distance. Check the listing or message your host.' },
    { q: 'Is the farm noisy in the morning?', a: 'Yes — most farms wake up early. If you\'re a light sleeper, bring earplugs or pick a date outside busy seasons (planting/harvest).' },
    { q: 'Can kids run around?', a: 'Generally yes, but please supervise around equipment, fences, and livestock. The host will point out any off-limits areas on arrival.' },
    { q: 'Do you sell farm products?', a: 'Many host farms offer eggs, honey, produce, or meat for purchase. Ask the host for what\'s in season during your stay.' },
  ],
  brewery: [
    { q: 'How close is the taproom?', a: 'Walking distance from the RV pad — typically a few hundred feet. Hours posted on the listing.' },
    { q: 'Can I bring my own alcohol?', a: 'You\'re welcome to drink at your site. Outside alcohol typically isn\'t allowed inside the brewery taproom.' },
    { q: 'Is there food on-site?', a: 'Many hosts run a kitchen, food truck, or partner with one. Hours and menu vary; check the listing for specifics.' },
    { q: 'Are growler refills available?', a: 'Yes at most host breweries. Bring your own growler or buy one at the taproom.' },
  ],
  attraction: [
    { q: 'How far is the main attraction?', a: 'The pad is positioned for easy access — typically a 5–15 minute drive. Exact details in the listing.' },
    { q: 'Is parking available at the attraction?', a: 'Most major attractions have day-use lots; some require advance reservation. Ask the host for tips.' },
    { q: 'Can I leave my rig and take a day trip?', a: 'Yes, the site is yours for the duration of your booking. Lock up valuables and let the host know your rough plans.' },
    { q: 'Are there food options nearby?', a: 'The host\'s welcome packet includes their favorite local spots — small towns near attractions usually have at least 2–3 solid options.' },
  ],
  offgrid: [
    { q: 'Will my generator work here?', a: 'Yes, with quiet-hour restrictions (typically 10 PM – 7 AM). Confirm wattage and noise limits with the host before arrival.' },
    { q: 'Is there cell service?', a: 'Limited or none. We strongly recommend downloading offline maps and sharing your itinerary with someone before arrival.' },
    { q: 'How do I get water?', a: 'There\'s no on-site water hookup. Bring a full freshwater tank or arrange a delivery add-on with the host.' },
    { q: 'Can I have a fire?', a: 'Only in the existing fire ring and only when conditions allow — check the posted board on arrival. Always douse fully before leaving.' },
  ],
};

// Hand-authored detail for the marquee listing (id=1, Heritage Oak Vineyard).
const HERITAGE_OAK_DETAIL: IListingDetail = {
  description: `Heritage Oak Vineyard has been growing Cabernet, Merlot, and Petite Sirah on the same hillside outside St. Helena since 1979. We host two RV sites year-round — both with full hookups, both shaded by the namesake oak — and we treat every guest the way we treat the people who pour our wine.

You'll be steps from the production barn, a five-minute walk from the tasting room, and a short drive from Calistoga, Yountville, and the Oakville Grocery for everything in between. Mornings here are quiet — fog off the valley floor, herons on the pond. Afternoons are for tasting flights or a swim. Evenings end with whatever you've poured into one of the patio tumblers we leave for guests.

We're available all weekend and during business hours weekdays; outside that, you'll have arrival instructions, our cell, and a shared map of the property's best vantage points.`,
  host: {
    name: 'Marcus B.',
    initials: 'MB',
    avatar: 'assets/images/host_alpaca.webp',
    joinedYear: 2022,
    bio: 'Third-generation winemaker who started hosting RVers because he wanted to share what makes this region special with the people willing to take the long way.',
    responseHours: 2,
  },
  photos: [
    'assets/images/host_vineyard.webp',
    'assets/images/host_alpaca.webp',
    'assets/images/host_farm.webp',
    'assets/images/host_village.webp',
    'assets/images/host_dairy.webp',
  ],
  houseRules: [
    'Quiet hours from 10 PM – 8 AM (please respect the host\'s home and the vines).',
    'Please use the patio tumblers — no glassware in the vineyard rows.',
    'Pets welcome on leash; please clean up after them and keep them out of the rows.',
    'Dump station is on the production-barn side of the property.',
    'Up to 2 vehicles allowed at the site; coordinate with host for additional.',
    'Please don\'t pick fruit from the vines.',
  ],
  cancellationTier: 'moderate',
  maxGuests: 4,
  maxStayNights: 14,
  subScores: {
    cleanliness: 4.95,
    communication: 4.92,
    hookups: 4.88,
    location: 4.97,
    value: 4.85,
  },
  reviews: [
    { authorName: 'Renee & Tom',   authorInitials: 'RT', date: 'May 2026',       rating: 5, text: "We've stayed at a lot of vineyards on our trip down the coast and this was easily the best. Marcus left us a bottle of his Petite Sirah, the pad was perfectly level, and we had the place to ourselves most of the weekend." },
    { authorName: 'The Pattersons',authorInitials: 'TP', date: 'April 2026',     rating: 5, text: "Hookups were dialed, host was responsive, and the walk down to the tasting room is the best 5 minutes of any vineyard stay we've had. Already planning to come back next harvest." },
    { authorName: 'Diego R.',      authorInitials: 'DR', date: 'March 2026',     rating: 5, text: "Quiet, clean, and exactly as described. Marcus knows the area and pointed us to a back road into Calistoga that we never would've found. The oak shade in the afternoon is no joke." },
    { authorName: 'Karen M.',      authorInitials: 'KM', date: 'February 2026',  rating: 5, text: "Solo traveler in a Class B — felt completely at home. Marcus checked in once on arrival and left me to my own devices. The fog rolling off the valley in the morning is something else." },
    { authorName: 'The Bensons',   authorInitials: 'TB', date: 'January 2026',   rating: 5, text: "Marcus is the real deal. The vineyard tour he gave us when we asked was easily a $50 experience and he just shared it because we were curious. The site itself is pristine — gravel pad, full hookups, picnic table under the oak." },
    { authorName: 'Hannah & Phil', authorInitials: 'HP', date: 'December 2025',  rating: 5, text: "Brought our two dogs and they had a great time on the leash trails Marcus pointed out. Site is well-shaded, hookups were strong, and the location is unbeatable for a Napa weekend." },
    { authorName: 'Greg L.',       authorInitials: 'GL', date: 'November 2025',  rating: 5, text: "First time trying CurbNTurf and this set the bar. Communication from Marcus was perfect — clear directions, gate code in advance, a quick check-in when we got here. Will be back." },
    { authorName: 'Marisa & Joel', authorInitials: 'MJ', date: 'October 2025',   rating: 4, text: "Beautiful setup and a wonderful host. Only knock — the WiFi got patchy near the back of the rig. Not a dealbreaker but worth knowing if you're working remote. The wine more than made up for it." },
    { authorName: 'Will & Chris',  authorInitials: 'WC', date: 'September 2025', rating: 5, text: "Pulled in late and Marcus had everything ready. The morning view across the rows is exactly what we were hoping for. Big rig fit easy with room to spare. 10/10 will return." },
    { authorName: 'Penelope D.',   authorInitials: 'PD', date: 'August 2025',    rating: 5, text: "Loved everything. The picnic table under the oak became our dining room for three nights. Marcus's wine recommendations across the valley were spot on." },
    { authorName: 'The Kims',      authorInitials: 'TK', date: 'July 2025',      rating: 5, text: "Couldn't ask for more. Quiet, gorgeous, and exactly what we hoped a working vineyard stay would feel like. Marcus made us feel like guests, not customers." },
    { authorName: 'Ben R.',        authorInitials: 'BR', date: 'June 2025',      rating: 4, text: "Great spot. Site itself is excellent. We had a small issue with the gate code that took a couple texts to sort out but Marcus fixed it within minutes. Would book again." },
  ],
  nearby: [
    { type: 'restaurant', name: 'Auberge du Soleil',      distance: '3.2 mi' },
    { type: 'grocery',    name: 'Oakville Grocery',       distance: '4.1 mi' },
    { type: 'gas',        name: 'Chevron — St. Helena',   distance: '2.6 mi' },
    { type: 'dump',       name: 'On-site dump station',   distance: 'On site' },
    { type: 'attraction', name: 'Bothe-Napa State Park',  distance: '5.4 mi' },
  ],
  trustBadges: ['verified-host', 'id-checked', 'land-insured', 'superhost'],
  unavailableDates: generateUnavailableDates(1),
  siteSpecs: {
    padType: 'gravel',
    padLength: 50,
    maxRigLength: 45,
    leveling: 'mostly-level',
    hookupAmps: 50,
    waterAvailable: true,
    sewerType: 'full-hookup',
    bigRigFriendly: true,
    slideoutClearance: 'open',
  },
  addOns: [
    { id: 'private-tasting',  label: 'Private tasting with Marcus',  description: 'Six-pour tasting hosted in the cellar.',            icon: 'wine_bar',      price: 65, unit: 'per person' },
    { id: 'cheese-board',     label: 'Cheese & charcuterie',         description: 'Local cheese, cured meats, and a fresh baguette.',  icon: 'restaurant',    price: 35, unit: 'per stay' },
    { id: 'vineyard-walk',    label: 'Sunrise vineyard walk',        description: 'Guided 45-min walk through the rows with Marcus.',  icon: 'hiking',        price: 25, unit: 'per person' },
    { id: 'early-checkin',    label: 'Early check-in (12 PM)',       description: 'Arrive 2 hours earlier than standard.',             icon: 'login',         price: 25, unit: 'per stay' },
    { id: 'late-checkout',    label: 'Late check-out (1 PM)',        description: 'Stay 2 hours longer on departure day.',             icon: 'logout',        price: 25, unit: 'per stay' },
  ],
  faqs: [
    { q: 'Can we walk to the tasting room?', a: 'Yes — about 5 minutes from the pad on a paved path. The tasting room is open Friday through Sunday, 11 AM – 5 PM. Marcus comps a flight for guests with a stay of 2+ nights.' },
    { q: 'Is there cell service and WiFi?', a: 'Both major networks (Verizon, AT&T) get full bars at the pad. WiFi reaches the patio reliably; signal is weaker at the back of larger rigs. Marcus shares the password in the welcome message.' },
    { q: 'Can I have a fire at the site?', a: 'Propane fire pits and stoves are welcome at the pad. No open campfires anywhere on the vineyard property — fire risk during dry months is real and the entire valley is on alert in summer.' },
    { q: 'Are pets allowed in the vineyard rows?', a: 'Pets are welcome at the pad on-leash. Please keep them out of the planted rows during growing season — disturbed soil and nibbled fruit can affect the harvest. Cleanup bags are at the pad.' },
    { q: 'What\'s the dump station situation?', a: 'Full hookups at the pad, plus a public dump station on the production-barn side of the property if you need an additional drain. Free for guests during your stay.' },
    { q: 'Can I extend my stay if a neighboring date opens up?', a: 'Yes — message Marcus directly. He\'ll confirm same-day if the calendar allows and apply the same nightly rate. CurbNTurf processes the change through your booking.' },
  ],
};

/**
 * Returns the full detail block for a listing. The marquee listing (id=1) has
 * hand-authored content; everything else is generated deterministically from
 * the listing's id, category, and location so each page feels complete.
 */
export function getListingDetail(listing: IListing): IListingDetail {
  if (listing.id === 1) return HERITAGE_OAK_DETAIL;

  // User-published listings get their detail rebuilt from the publish-time snapshot
  // so we render the host's actual photos, name, rules, etc. — not the mock pools.
  if (listing.kind !== 'boondocking') {
    const snap = readPublishedSnapshot(listing.id);
    if (snap) return buildUserPublishedDetail(listing, snap);
  }

  const hostBase = HOST_POOL[listing.id % HOST_POOL.length];
  const photoStart = listing.id % PHOTO_POOL.length;
  const photos = [
    listing.image,
    PHOTO_POOL[(photoStart + 1) % PHOTO_POOL.length],
    PHOTO_POOL[(photoStart + 3) % PHOTO_POOL.length],
    PHOTO_POOL[(photoStart + 5) % PHOTO_POOL.length],
    PHOTO_POOL[(photoStart + 7) % PHOTO_POOL.length],
  ];

  // Pick host avatar deterministically from PHOTO_POOL based on host name index
  const avatarIdx = (listing.id * 3 + 1) % PHOTO_POOL.length;

  return {
    description: CATEGORY_DESCRIPTIONS[listing.category](listing.location),
    host: {
      ...hostBase,
      avatar: PHOTO_POOL[avatarIdx],
      joinedYear: 2020 + (listing.id % 5),
      bio: HOST_BIOS[listing.category],
      responseHours: 2,
    },
    photos,
    houseRules: HOUSE_RULES_BY_CATEGORY[listing.category],
    cancellationTier: TIER_BY_INDEX[listing.id % TIER_BY_INDEX.length],
    maxGuests: 2 + ((listing.id * 5) % 5),  // 2–6 guests, deterministic
    maxStayNights: 7 + ((listing.id * 3) % 14), // 7–20 nights
    subScores: generateSubScores(listing),
    reviews: generateReviews(listing),
    nearby: generateNearby(listing),
    trustBadges: generateTrustBadges(listing),
    unavailableDates: generateUnavailableDates(listing.id),
    siteSpecs: generateSiteSpecs(listing),
    addOns: [...ADDONS_BY_CATEGORY[listing.category], ...COMMON_ADDONS],
    faqs: FAQS_BY_CATEGORY[listing.category],
  };
}

function generateSiteSpecs(listing: IListing): ISiteSpecs {
  const padTypes: PadType[]   = ['gravel', 'grass', 'concrete', 'dirt'];
  const leveling: Leveling[]  = ['level', 'mostly-level', 'needs-blocks'];
  const sewers: SewerType[]   = ['full-hookup', 'dump-station', 'none'];
  const clearance: SlideoutClearance[] = ['tight', 'moderate', 'open'];
  const padLength = 30 + ((listing.id * 7) % 25);
  const maxRig    = Math.max(25, padLength - 5);
  const ampPick: HookupAmps = listing.id % 3 === 0 ? 30 : 50;
  const isOffgrid = listing.category === 'offgrid';
  return {
    padType: padTypes[listing.id % padTypes.length],
    padLength,
    maxRigLength: maxRig,
    leveling: leveling[listing.id % leveling.length],
    hookupAmps: isOffgrid ? null : ampPick,
    waterAvailable: !isOffgrid,
    sewerType: isOffgrid ? 'none' : sewers[(listing.id * 2) % sewers.length],
    bigRigFriendly: maxRig >= 38,
    slideoutClearance: clearance[(listing.id * 3) % clearance.length],
  };
}

/**
 * Deterministic mock booked-dates over the next ~120 days. Mixes 2-3 weekend
 * blocks with scattered single nights so the calendar feels lived-in.
 */
function generateUnavailableDates(id: number): string[] {
  const out = new Set<string>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (base: Date, n: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d;
  };

  // 3 weekend blocks (3-night each) starting at deterministic offsets
  const weekendStarts = [
    7 + (id * 3) % 14,    // ~weeks 1-3
    35 + (id * 5) % 14,   // ~weeks 5-7
    70 + (id * 7) % 14,   // ~weeks 10-12
  ];
  for (const start of weekendStarts) {
    for (let i = 0; i < 3; i++) out.add(iso(addDays(today, start + i)));
  }

  // ~6 scattered single days
  for (let i = 0; i < 6; i++) {
    const offset = 14 + (id * 11 + i * 17) % 100;
    out.add(iso(addDays(today, offset)));
  }

  return Array.from(out);
}

function generateSubScores(listing: IListing): ISubScores {
  // Boondocking sites have no curated rating — return all-zero sub-scores so any
  // template that does render them (none should, post-narrowing) sees blank state.
  if (listing.kind === 'boondocking') {
    return { cleanliness: 0, communication: 0, hookups: 0, location: 0, value: 0 };
  }
  // Sub-scores cluster around the listing's overall rating, with small deterministic deltas.
  const base = listing.rating;
  const jitter = (seed: number) => (((listing.id * seed) % 7) - 3) * 0.04;
  const clamp = (v: number) => Math.max(4.4, Math.min(5.0, +v.toFixed(2)));
  return {
    cleanliness:   clamp(base + jitter(2)),
    communication: clamp(base + jitter(3)),
    hookups:       clamp(base + jitter(5)),
    location:      clamp(base + jitter(7)),
    value:         clamp(base + jitter(11)),
  };
}

function generateReviews(listing: IListing): IReview[] {
  const months = [
    'May 2026', 'April 2026', 'March 2026', 'February 2026', 'January 2026',
    'December 2025', 'November 2025', 'October 2025', 'September 2025',
    'August 2025', 'July 2025', 'June 2025',
  ];
  return months.map((date, i) => {
    const r = REVIEW_POOL[(listing.id * 3 + i) % REVIEW_POOL.length];
    // Mostly 5-star, occasional 4 or 3 — deterministic per listing+index.
    const rollSeed = (listing.id * 7 + i * 13) % 20;
    const rating = rollSeed < 16 ? 5 : rollSeed < 19 ? 4 : 3;
    return { ...r, date, rating };
  });
}

function generateNearby(listing: IListing): INearbyPoi[] {
  const start = listing.id % NEARBY_POOL.length;
  return [0, 1, 2, 3, 4].map(i => NEARBY_POOL[(start + i) % NEARBY_POOL.length]);
}

function generateTrustBadges(listing: IListing): TrustBadge[] {
  if (listing.kind === 'boondocking') return [];
  const badges: TrustBadge[] = ['verified-host', 'id-checked', 'land-insured'];
  if (listing.rating >= 4.85 && listing.reviewCount >= 80) badges.push('superhost');
  return badges;
}

// ─────────────────────── User-published listing detail builders ───────────────────────

/**
 * Build an `IListingDetail` for a user-published listing from its saved snapshot.
 * Reflects only what the host actually entered — no mock host, no stock photos,
 * no fabricated add-ons / reviews / trust badges.
 */
function buildUserPublishedDetail(listing: IListing, snap: IPublishedSnapshot): IListingDetail {
  const d = snap.draft;
  return {
    description: d.description || `${listing.title} — hosted on CurbNTurf.`,
    host: {
      name: snap.hostName,
      initials: snap.hostInitials,
      avatar: snap.hostAvatar,
      joinedYear: snap.hostJoinedYear,
      bio: '',
      responseHours: 24,
    },
    photos: (d.photos && d.photos.length > 0) ? d.photos : [listing.image],
    photoCaptions: d.photoCaptions ?? [],
    houseRules: houseRulesFromDraft(d.rules, d.customRules ?? ''),
    cancellationTier: d.cancellationTier ?? 'moderate',
    maxGuests: d.guestCapacity ?? 2,
    maxStayNights: d.maxNights ?? 14,
    subScores: { cleanliness: 0, communication: 0, hookups: 0, location: 0, value: 0 },
    reviews: [],
    nearby: generateNearby(listing), // location-based, fine to auto-compute
    trustBadges: [],                  // new host — no badges yet
    unavailableDates: [],
    siteSpecs: siteSpecsFromDraft(d),
    // Filter incomplete rows (no name / negative price) so half-edited add-ons
    // never reach guests. Host's working copy is preserved in the draft.
    addOns: (d.addOns ?? []).filter(a => a.label?.trim().length >= 2 && (a.price ?? 0) >= 0),
    faqs: [],                         // wizard doesn't collect FAQs (yet)
  };
}

/** Convert the wizard's IHouseRules booleans + custom textarea into the string[] the detail uses. */
function houseRulesFromDraft(rules: IHouseRules | undefined, customRules: string): string[] {
  const out: string[] = [];
  if (rules?.noSmoking)   out.push('No smoking on the property');
  if (rules?.noParties)   out.push('No parties or events');
  if (rules?.quietHours)  out.push('Quiet hours 10 PM – 7 AM');
  if (rules?.noFireworks) out.push('No fireworks on the premises');
  if (rules?.noFirearms)  out.push('No firearms on the premises');
  for (const line of (customRules || '').split('\n').map(l => l.trim()).filter(Boolean)) {
    out.push(line);
  }
  return out;
}

/** Derive an ISiteSpecs from the wizard's max-rig + amenities. */
function siteSpecsFromDraft(d: IDraftListing): ISiteSpecs {
  const amenities = d.amenities ?? [];
  const hasElectricity = amenities.includes('electricity');
  const hasWater = amenities.includes('potable-water');
  const hasSewage = amenities.includes('sewage');
  const hasDump = amenities.includes('dump-station');
  const maxRigLength = d.maxRig?.length && d.maxRig.length > 0 ? d.maxRig.length : 35;
  const sewerType: SewerType = hasSewage ? 'full-hookup' : hasDump ? 'dump-station' : 'none';
  return {
    padType: 'gravel',                          // sensible default; future: ask in wizard
    padLength: maxRigLength,
    maxRigLength,
    leveling: 'mostly-level',
    hookupAmps: hasElectricity ? 30 : null,
    waterAvailable: hasWater,
    sewerType,
    bigRigFriendly: maxRigLength >= 38,
    slideoutClearance: 'moderate',
  };
}

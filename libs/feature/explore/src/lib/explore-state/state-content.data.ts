export interface ITopDestination {
  city: string;
  blurb: string;
}

export interface IStateContent {
  slug: string;
  name: string;
  abbrev: string;
  tagline: string;
  /** Hero background image — relative path or full URL. */
  heroImage: string;
  intro: string[];
  topDestinations: ITopDestination[];
  thingsToDo: string[];
  nearbyStates: string[];
}

export const STATE_CONTENT: Record<string, IStateContent> = {
  'arizona': {
    slug: 'arizona',
    name: 'Arizona',
    abbrev: 'AZ',
    tagline: 'Red rock canyons, saguaro deserts, and dark-sky country wide enough to lose yourself in.',
    heroImage: 'assets/images/host_opportunity.webp',
    intro: [
      'Arizona is the long, slow road. Rim country pines in the north, Sonoran cactus seas in the south, and a state highway grid that connects them with some of the most cinematic driving in America.',
      'Most CurbNTurf hosts here lean into the landscape — quiet ranches outside Sedona, off-grid pads near the North Rim, working farms in the Sulphur Springs Valley. Bring water, bring a topo map, and plan around the heat.',
    ],
    topDestinations: [
      { city: 'Sedona', blurb: 'Red rock vortex country and the gateway to Oak Creek Canyon.' },
      { city: 'Flagstaff', blurb: 'High-altitude ponderosa town, basecamp for the Grand Canyon and the San Francisco Peaks.' },
      { city: 'Tucson', blurb: 'Saguaro National Park, sky islands, and the best Sonoran food in the Southwest.' },
      { city: 'Page', blurb: 'Lake Powell, Antelope Canyon, and Horseshoe Bend in a single afternoon.' },
      { city: 'Bisbee', blurb: 'A copper-mining ghost town turned arts colony in the southeast hills.' },
      { city: 'Jerome', blurb: 'A near-vertical mining town hung from Cleopatra Hill above the Verde Valley.' },
    ],
    thingsToDo: [
      'Drive 89A from Flagstaff down through Oak Creek Canyon into Sedona for one of the best descents in the West. Stop in Cottonwood for Verde Valley wine country before climbing back up to Jerome.',
      'Time your trip carefully. April through May and October through November are the sweet spot — winter snow closes the high country and summer afternoons in the low desert routinely break 110 degrees. Tucson and Bisbee are pleasant when the rim is buried.',
      'Pack double the water you think you need, a real paper Arizona Atlas (cell coverage drops fast outside the I-17 corridor), and dark-sky friendly red-bulb headlamps if you want to enjoy why Flagstaff is the world\'s first International Dark Sky City.',
    ],
    nearbyStates: ['nevada', 'utah', 'new-mexico', 'california'],
  },

  'arkansas': {
    slug: 'arkansas',
    name: 'Arkansas',
    abbrev: 'AR',
    tagline: 'Ozark hollows, mountain springs, and one of the most underrated road-trip states in the South.',
    heroImage: 'assets/images/host_farm.webp',
    intro: [
      'Arkansas surprises people. Forested ridges in the north hide some of the clearest rivers east of the Rockies. The Delta in the east is flat farm country and blues-trail towns. The Ouachita range in the west runs east-west — geologically rare and full of switchback drives.',
      'CurbNTurf hosts in Arkansas tend to be on family land — cabin hollows around Eureka Springs, working orchards along the Buffalo River, quiet pads outside Hot Springs. Cell service is patchy in the hollows; plan offline maps before you roll in.',
    ],
    topDestinations: [
      { city: 'Eureka Springs', blurb: 'A Victorian mountain town stacked into the Ozarks with hot springs and switchback streets.' },
      { city: 'Hot Springs', blurb: 'America\'s smallest national park and a row of working bathhouses on Central Avenue.' },
      { city: 'Buffalo National River', blurb: 'The country\'s first national river — float trips, bluffs, and elk herds.' },
      { city: 'Bentonville', blurb: 'World-class mountain bike trails and the Crystal Bridges art museum in one stop.' },
      { city: 'Mountain View', blurb: 'Folk music capital and gateway to Blanchard Springs Caverns.' },
    ],
    thingsToDo: [
      'Float the Buffalo River in spring while it\'s still running. Summer water levels drop fast and what was a paddle becomes a drag. Outfitters in Ponca and Gilbert run shuttle service that pairs well with a multi-day base camp.',
      'The Pig Trail Scenic Byway (AR-23) between Ozark and Brashears is short but spectacular — tight curves, hardwood canopy, almost no traffic outside fall foliage weekends.',
      'Bring rain gear and bug spray May through August. Humidity is real, ticks are real, and afternoon thunderstorms roll up fast. Fall is the unanimous best season here.',
    ],
    nearbyStates: ['missouri', 'oklahoma', 'texas'],
  },

  'california': {
    slug: 'california',
    name: 'California',
    abbrev: 'CA',
    tagline: 'Pacific cliffs, redwood canyons, and the most photographed wine country on earth.',
    heroImage: 'assets/images/host_vineyard.webp',
    intro: [
      'California is less a state than a stack of climates — fog-belt coast, Mediterranean wine valleys, Sierra granite, Mojave desert. You can wake up in a redwood grove and end the day under Joshua trees, and the road in between is the point.',
      'CurbNTurf has its deepest network here. Vineyard pads in Napa, Sonoma, and Paso Robles sit alongside coastal hosts in Mendocino and Big Sur, working farms in the Capay Valley, and off-grid sites in Anza and Joshua Tree. Reserve early on summer weekends, especially in wine country.',
    ],
    topDestinations: [
      { city: 'Napa Valley', blurb: 'The slow-paced wine country original — Highway 29 and the Silverado Trail bookend it.' },
      { city: 'Sonoma', blurb: 'Cooler, looser, and more diverse than Napa — pinot in the Russian River, zin in Dry Creek.' },
      { city: 'Big Sur', blurb: 'Highway 1 between Carmel and San Simeon — cliffs, sea otters, and Bixby Bridge.' },
      { city: 'Mendocino', blurb: 'A windswept Victorian village with Anderson Valley pinot a half hour inland.' },
      { city: 'Paso Robles', blurb: 'Cab-leaning hill country, olive oil tastings, and the underrated Central Coast.' },
      { city: 'Joshua Tree', blurb: 'High-desert stargazing, granite scrambling, and the Pioneertown side trip.' },
    ],
    thingsToDo: [
      'Drive Highway 1 north from Cambria through Big Sur to Carmel — about three hours without stops, but plan a full day. Slides close sections of the highway most winters; check Caltrans QuickMap before committing.',
      'Wine country food is the equal of the wine. Book a long lunch at Single Thread in Healdsburg, eat oysters at Hog Island in Marshall, and pick up a deli sandwich at Oakville Grocery for a vineyard picnic. Bring a corkscrew.',
      'Summers are dry and fire season is real — check inciweb.nwcg.gov for active incidents before camping anywhere east of the coast range. Spring (March–May) and fall (September–October) are the sweet spot for both wine country and the coast.',
    ],
    nearbyStates: ['oregon', 'nevada', 'arizona'],
  },

  'colorado': {
    slug: 'colorado',
    name: 'Colorado',
    abbrev: 'CO',
    tagline: 'Fourteeners, alpine river valleys, and ski towns that turn into wildflower country in July.',
    heroImage: 'assets/images/host_opportunity.webp',
    intro: [
      'Colorado is altitude. Even the prairie east of Denver sits a mile up, and the western half is one continuous range of rivers, passes, and old mining towns. Summer here is short and brilliant — wildflowers in July, aspens in late September.',
      'CurbNTurf hosts cluster on the western slope and in the San Juans — vineyard pads in Palisade, mountain farms outside Durango, brewery stays in Steamboat Springs. Acclimate at lower elevations before pushing above 9,000 feet, and be ready for afternoon thunderstorms basically every summer day.',
    ],
    topDestinations: [
      { city: 'Crested Butte', blurb: 'Wildflower capital of Colorado, set in a high alpine basin.' },
      { city: 'Durango', blurb: 'Narrow-gauge railroad, Animas River, and the gateway to Mesa Verde.' },
      { city: 'Steamboat Springs', blurb: 'A real working ranch town with hot springs and a low-key brewery scene.' },
      { city: 'Palisade', blurb: 'Western slope wine and peach country in the Grand Valley.' },
      { city: 'Pagosa Springs', blurb: 'The world\'s deepest hot springs and the eastern San Juans.' },
      { city: 'Telluride', blurb: 'A box canyon ski town with one of the country\'s best film festivals.' },
    ],
    thingsToDo: [
      'Drive the San Juan Skyway — Durango to Silverton to Ouray to Telluride and back. It\'s 233 miles of mining-town switchbacks and is worth a full day. Million Dollar Highway between Silverton and Ouray has no guardrails, on purpose.',
      'July wildflowers in Crested Butte are a national event. Get the Crested Butte Wildflower Festival schedule and time a visit around it. The shoulder weeks just before and after are quieter and almost as good.',
      'Afternoon thunderstorms above treeline are not a suggestion — climb early and be off ridges by noon. Carry a layer for elevation drops; mountain mornings can be 40 degrees in August.',
    ],
    nearbyStates: ['utah', 'wyoming', 'new-mexico'],
  },

  'florida': {
    slug: 'florida',
    name: 'Florida',
    abbrev: 'FL',
    tagline: 'Spring-fed rivers, Gulf Coast sunsets, and the most varied coastal driving in the lower 48.',
    heroImage: 'assets/images/host_village.webp',
    intro: [
      'Florida rewards travelers who get off I-95 and I-75. The Panhandle\'s emerald-water beaches feel like a different state from Miami. The springs belt in the north has clearer water than the Caribbean. The Keys are their own country.',
      'CurbNTurf hosts trend coastal — the Keys, Apalachicola, and a few inland near the springs. Winter (December–March) is high season; summer is hot, humid, and storm-prone. The reward of summer is having a place mostly to yourself.',
    ],
    topDestinations: [
      { city: 'The Florida Keys', blurb: 'US-1 to Key West — 113 miles of bridges and reef country.' },
      { city: 'Apalachicola', blurb: 'A working oyster town on the Forgotten Coast in the Panhandle.' },
      { city: 'St. Augustine', blurb: 'The oldest continuously occupied European city in the country.' },
      { city: 'Crystal River', blurb: 'Manatee springs and Gulf coast fishing villages.' },
      { city: '30A', blurb: 'A 24-mile beach road through pastel coastal towns between Destin and Panama City.' },
      { city: 'Everglades', blurb: 'Sawgrass prairie, mangrove tunnels, and the Tamiami Trail.' },
    ],
    thingsToDo: [
      'Snorkel or paddle the springs — Ginnie, Ichetucknee, Three Sisters, Silver Glen — for water that stays 72 degrees year-round and visibility that can hit 200 feet.',
      'The Overseas Highway to Key West is a destination in itself. Plan three days minimum: Marathon, Bahia Honda, Key West. Sunrise from Bahia Honda Bridge is the photo you\'re thinking of.',
      'Hurricane season runs June through November and peaks in September. If you\'re traveling then, watch the National Hurricane Center five-day cone and have a flex window in your itinerary.',
    ],
    nearbyStates: ['georgia'],
  },

  'georgia': {
    slug: 'georgia',
    name: 'Georgia',
    abbrev: 'GA',
    tagline: 'Live-oak coast, north Georgia mountains, and small-town squares that still mean something.',
    heroImage: 'assets/images/host_farm.webp',
    intro: [
      'Georgia covers more ground than people give it credit for. The Blue Ridge tail-end is in the north, peach and pecan country runs through the middle, and the Atlantic coast hides barrier islands as wild as anywhere on the eastern seaboard.',
      'CurbNTurf hosts here lean rural — peach orchards near Macon, mountain pads near Blue Ridge, coastal stops outside Savannah. Atlanta is fine to drive through, less fine to park around; treat it as a midpoint, not a destination.',
    ],
    topDestinations: [
      { city: 'Savannah', blurb: 'Spanish moss, twenty-two squares, and the best food city you\'re underrating.' },
      { city: 'Blue Ridge', blurb: 'A north Georgia mountain town with trout streams and a scenic railway.' },
      { city: 'Cumberland Island', blurb: 'Wild horses and oak forests on a barrier island reachable only by ferry.' },
      { city: 'Athens', blurb: 'College town with a real music scene and Sunday morning farm markets.' },
      { city: 'Macon', blurb: 'Cherry blossoms, peach country, and the geographic center of the state.' },
    ],
    thingsToDo: [
      'Drive GA-348 (the Richard Russell Scenic Highway) through the Chattahoochee National Forest. It\'s short — 14 miles — but it\'s the prettiest road in the state outside fall weekends.',
      'Eat your way through Savannah and the Sea Islands. Shrimp and grits at The Grey, oysters from McIntosh County, anything at Husk in nearby Charleston if you cross the line.',
      'Spring (April) and fall (October–November) are the comfortable seasons. Summers are real-deal Southern humid; winters are mild but rainy. Cumberland Island ferry sells out months in advance for spring weekends.',
    ],
    nearbyStates: ['florida', 'south-carolina', 'north-carolina'],
  },

  'idaho': {
    slug: 'idaho',
    name: 'Idaho',
    abbrev: 'ID',
    tagline: 'Glacial lakes, river canyons, and more wilderness per capita than anywhere south of Alaska.',
    heroImage: 'assets/images/host_opportunity.webp',
    intro: [
      'Idaho is the wildest of the lower-48 states by most metrics — biggest contiguous wilderness, deepest river canyon, fewest people per acre once you get north of Boise. The panhandle around Coeur d\'Alene feels like Montana; the Sawtooths feel like the Alps.',
      'CurbNTurf hosts cluster around Sun Valley, the panhandle lakes, and the Snake River plain. Summer is short and bright; shoulder seasons are real; winter belongs to skiers and people who already know what they\'re doing.',
    ],
    topDestinations: [
      { city: 'Sun Valley / Ketchum', blurb: 'America\'s original ski town and a summer trail-running mecca.' },
      { city: 'Coeur d\'Alene', blurb: 'A glacial lake the size of a small ocean, surrounded by panhandle pines.' },
      { city: 'Sawtooth Range', blurb: 'Granite spires above Stanley — alpine lakes and the Salmon River headwaters.' },
      { city: 'Hells Canyon', blurb: 'The deepest river gorge in North America, on the Oregon border.' },
      { city: 'McCall', blurb: 'A high-mountain lake town with Payette Lake at its center.' },
      { city: 'Boise', blurb: 'A river-town capital with a Basque quarter and a long greenbelt.' },
    ],
    thingsToDo: [
      'Drive the Sawtooth Scenic Byway (ID-75) from Ketchum through Galena Summit into Stanley. It\'s 60 miles, two hours with stops, and ends at the Salmon River with the Sawtooths laid out like a postcard.',
      'Float a stretch of the Salmon — outfitter day trips out of Stanley, multi-day permitted runs deeper in. The Middle Fork is a bucket-list float; the lottery for non-commercial permits opens in January.',
      'Wildfire smoke can drift in from late July through September. Check airnow.gov before committing to long valley drives. June and early October are the most reliable air-quality windows.',
    ],
    nearbyStates: ['montana', 'wyoming', 'oregon', 'washington'],
  },

  'illinois': {
    slug: 'illinois',
    name: 'Illinois',
    abbrev: 'IL',
    tagline: 'Prairie horizons, Mississippi river towns, and the underrated Shawnee country in the south.',
    heroImage: 'assets/images/host_farm.webp',
    intro: [
      'Illinois is two states. The northern half is Chicago and its commuter halo; the southern half is Shawnee National Forest, sandstone canyons, and small river towns straight out of Mark Twain. Most travelers only see the I-55 corridor and miss the rest.',
      'CurbNTurf hosts trend rural here — farm stays in the central prairie, river-bluff pads along the Mississippi, and Shawnee-adjacent sites in the south. Spring and fall are easy; summer humidity and winter cold are both real.',
    ],
    topDestinations: [
      { city: 'Galena', blurb: 'A preserved 19th-century river town in the driftless area near Iowa.' },
      { city: 'Shawnee National Forest', blurb: 'Garden of the Gods sandstone and the only national forest in Illinois.' },
      { city: 'Starved Rock State Park', blurb: 'Sandstone canyons and frozen waterfalls along the Illinois River.' },
      { city: 'Springfield', blurb: 'Lincoln\'s home, presidential library, and the state capitol.' },
      { city: 'Alton', blurb: 'A Mississippi bluff town with Great River Road access in both directions.' },
    ],
    thingsToDo: [
      'Drive the Great River Road (IL-100/IL-3) along the Mississippi — Alton south to Cairo is mostly empty highway with bluff overlooks and pie diners. Northern stretches near Galena are flashier but more crowded.',
      'Shawnee in mid-October is a sleeper destination. Garden of the Gods at sunrise, Rim Rock loop in the afternoon, and a beer in Carbondale to close it out. Hostels and small lodges fill up fast.',
      'Pack for humidity June through August and cold rain in spring. Mosquitoes in the river bottoms are world-class; treat your gear before you go.',
    ],
    nearbyStates: ['indiana', 'iowa', 'wisconsin', 'missouri'],
  },

  'indiana': {
    slug: 'indiana',
    name: 'Indiana',
    abbrev: 'IN',
    tagline: 'Limestone hills, Ohio River bluffs, and a quiet country-road grid built for slow miles.',
    heroImage: 'assets/images/host_farm.webp',
    intro: [
      'Indiana is flatter than its neighbors think and hillier than its reputation. The southern third is real terrain — limestone caves, Ohio River cliffs, and Hoosier National Forest. The center is corn-and-soybean farm country broken up by college towns and old courthouse squares.',
      'CurbNTurf hosts here are mostly working farms and quiet pads in the southern hills. Cell coverage is solid; the roads are well-graded; the surprise is how empty they get on a Tuesday afternoon.',
    ],
    topDestinations: [
      { city: 'Bloomington', blurb: 'A college town with a real food scene and Hoosier National Forest at its back.' },
      { city: 'Brown County', blurb: 'A hill-country pocket of artist studios, hardwoods, and Indiana\'s biggest state park.' },
      { city: 'Madison', blurb: 'An Ohio River town with one of the best preserved 19th-century main streets in the Midwest.' },
      { city: 'Marengo Cave', blurb: 'A National Natural Landmark cave system in the limestone country.' },
      { city: 'Indiana Dunes', blurb: 'Lake Michigan dunes country and the newest national park in the state.' },
    ],
    thingsToDo: [
      'Drive IN-46 from Bloomington east through Brown County to Columbus. It\'s a good 90-minute loop with hardwood canopies, and Columbus has a surprising concentration of mid-century modern architecture worth a half-day.',
      'Mid- to late-October is peak fall color in Brown County and gets crowded — book hosts well in advance, or come the second week of November for almost the same color and far fewer people.',
      'Limestone caves stay 54 degrees year-round; bring a layer even in August. Spring rains can flood low river roads — the Ohio River bluffs are spectacular but the access roads can close after storms.',
    ],
    nearbyStates: ['illinois', 'ohio', 'kentucky', 'michigan'],
  },

  'iowa': {
    slug: 'iowa',
    name: 'Iowa',
    abbrev: 'IA',
    tagline: 'Driftless bluffs, Mississippi overlooks, and small farm towns where the food is the surprise.',
    heroImage: 'assets/images/host_farm.webp',
    intro: [
      'Iowa\'s reputation is corn. The reality is the driftless area in the northeast — limestone bluffs, trout streams, hill towns the glaciers missed. The Loess Hills along the western edge are the only formation like them in the Western Hemisphere outside China.',
      'CurbNTurf hosts here are heritage farms and quiet country pads. Pace is slow, prices are reasonable, and you\'ll mostly be sharing roads with combines.',
    ],
    topDestinations: [
      { city: 'Decorah', blurb: 'A driftless-area college town with Norwegian roots and the Upper Iowa River.' },
      { city: 'Dubuque', blurb: 'Mississippi River bluffs, a working riverfront, and easy access to Wisconsin and Illinois.' },
      { city: 'Effigy Mounds', blurb: 'Ancient earthen burial mounds shaped like animals along the Mississippi.' },
      { city: 'Loess Hills Scenic Byway', blurb: 'A 220-mile route along the wind-deposited bluffs of western Iowa.' },
      { city: 'Pella', blurb: 'A Dutch heritage town in central Iowa, peak charm during May tulip festival.' },
    ],
    thingsToDo: [
      'The Driftless Area Scenic Byway through northeast Iowa beats every state park drive in the state. Plan a long lunch in Decorah, hit Effigy Mounds, and cross the Black Hawk Bridge into Wisconsin if you\'re feeling it.',
      'Iowa farm food is undersold. Stop at Hatchery Hill in Lansing, Pulpit Rock Brewing in Decorah, and any small-town meat locker for jerky and brats. Sweetcorn season in August is real.',
      'Severe weather is part of summer here — tornado watches roll through May and June. Have a go-bag and a NOAA weather radio in the rig if you\'re traveling those months.',
    ],
    nearbyStates: ['minnesota', 'wisconsin', 'illinois', 'missouri'],
  },

  'kentucky': {
    slug: 'kentucky',
    name: 'Kentucky',
    abbrev: 'KY',
    tagline: 'Bluegrass horse country, bourbon trail backroads, and Appalachian hollers in the east.',
    heroImage: 'assets/images/host_dairy.webp',
    intro: [
      'Kentucky is a state of belts. Bluegrass horse country in the central limestone basin, the Bourbon Trail running through it, the Appalachian coalfields in the east, and Mammoth Cave country in the west. Roads here are old, often narrow, and worth the slow pace.',
      'CurbNTurf hosts run from working farms in the bourbon belt to mountain pads in the Red River Gorge. Bring decent walking shoes — distillery tours involve a lot of standing.',
    ],
    topDestinations: [
      { city: 'Bardstown', blurb: 'The self-styled bourbon capital, with a half-dozen distilleries inside 20 minutes.' },
      { city: 'Lexington', blurb: 'Horse farm country, with white-fence drives in every direction.' },
      { city: 'Red River Gorge', blurb: 'Sandstone arches and world-class climbing in the Daniel Boone National Forest.' },
      { city: 'Mammoth Cave', blurb: 'The longest cave system on earth, with tours from easy to crawl-on-your-belly.' },
      { city: 'Louisville', blurb: 'Derby city, a real food scene, and the Ohio River waterfront.' },
    ],
    thingsToDo: [
      'Run the Bourbon Trail in three days, not one. Buffalo Trace in Frankfort, Woodford in Versailles, and either Maker\'s Mark or Heaven Hill on the third day. Hire a driver for at least one of them.',
      'Red River Gorge in October is one of the prettiest places east of the Mississippi. Climbing season runs March through November; Miguel\'s Pizza is the unofficial basecamp.',
      'Spring (April–May) and fall (September–October) are the comfort seasons. Summer is humid and tick-heavy in the gorge country; winter is mild but distillery hours shrink.',
    ],
    nearbyStates: ['indiana', 'ohio', 'virginia'],
  },

  'maine': {
    slug: 'maine',
    name: 'Maine',
    abbrev: 'ME',
    tagline: 'Granite coast, working harbors, and pine-and-blueberry country once you head inland.',
    heroImage: 'assets/images/host_village.webp',
    intro: [
      'Maine\'s coast gets the postcards but it\'s only a thin strip. The interior is bigger than people realize — Moosehead Lake, the Allagash, Baxter State Park and Katahdin. Cell service drops fast once you leave US-1.',
      'CurbNTurf hosts cluster around Acadia and the midcoast — Camden, Belfast, Bar Harbor — with a few inland near the lakes. Summer (July–August) is the real season; foliage in early October is the second peak. Black flies in May and June are worse than the mosquitoes.',
    ],
    topDestinations: [
      { city: 'Bar Harbor / Acadia', blurb: 'The granite-and-spruce capital of the eastern seaboard.' },
      { city: 'Camden', blurb: 'A working harbor with Mount Battie behind it and Penobscot Bay in front.' },
      { city: 'Portland', blurb: 'A small city with an outsized food scene and easy access to Casco Bay.' },
      { city: 'Moosehead Lake', blurb: 'Maine\'s largest lake, surrounded by pulp-and-paper country and serious wilderness.' },
      { city: 'Boothbay Harbor', blurb: 'A classic midcoast harbor town with botanical gardens and ferry runs.' },
    ],
    thingsToDo: [
      'Drive the Park Loop Road in Acadia at sunrise — Cadillac Mountain is the first place in the lower 48 to see the sun from October through March. Then breakfast at Jordan Pond House for popovers.',
      'Lobster shacks are a religion. Five Islands in Georgetown, Red\'s Eats in Wiscasset (the line is real), McLoons on Spruce Head. BYOB in most cases.',
      'Bring layers in any season — the coast can be 60 degrees in July with fog. Inland Maine in shoulder season is muddy until late May; fall foliage peaks first in the north and rolls south through October.',
    ],
    nearbyStates: ['new-hampshire', 'vermont'],
  },

  'michigan': {
    slug: 'michigan',
    name: 'Michigan',
    abbrev: 'MI',
    tagline: 'Two peninsulas, four Great Lakes, and more freshwater coastline than any state in the country.',
    heroImage: 'assets/images/host_brewery.webp',
    intro: [
      'Michigan is shaped by water. The Lower Peninsula has sand dunes, cherry orchards, and the Sleeping Bear coast. The Upper Peninsula is a different country — Pictured Rocks, the Porcupine Mountains, and a road grid that thins out fast.',
      'CurbNTurf hosts cluster on the Leelanau Peninsula around Traverse City, with a handful in the UP and along the western Lake Michigan shore. Plan ferry slots well ahead if you\'re hauling to Mackinac Island country.',
    ],
    topDestinations: [
      { city: 'Traverse City', blurb: 'Leelanau wine country, cherry orchards, and Sleeping Bear Dunes.' },
      { city: 'Sleeping Bear Dunes', blurb: 'Some of the largest freshwater dunes in the country, on the Lake Michigan shore.' },
      { city: 'Pictured Rocks', blurb: 'Mineral-stained sandstone cliffs along Lake Superior in the UP.' },
      { city: 'Mackinac Island', blurb: 'No-cars Victorian island town between the peninsulas.' },
      { city: 'Marquette', blurb: 'The cultural capital of the Upper Peninsula, on Lake Superior.' },
    ],
    thingsToDo: [
      'Drive M-22 around the Leelanau Peninsula — 116 miles of wineries, cherry stands, and lake views. Pair it with the Pierce Stocking Scenic Drive inside Sleeping Bear for a full day.',
      'The UP is bigger than people expect. Don\'t try to do Pictured Rocks and the Porcupine Mountains in one weekend; pick one. Munising for Pictured Rocks, Ontonagon for the Porkies.',
      'July and August are the season. Lake Superior beaches stay cold even in summer — pack a hoodie. Black flies and mosquitoes peak in June; September is underrated.',
    ],
    nearbyStates: ['wisconsin', 'indiana', 'ohio'],
  },

  'minnesota': {
    slug: 'minnesota',
    name: 'Minnesota',
    abbrev: 'MN',
    tagline: 'Boreal lakes, the North Shore, and one of the great paddle-country traditions in North America.',
    heroImage: 'assets/images/host_opportunity.webp',
    intro: [
      'Minnesota\'s personality is the North Shore and the Boundary Waters. Duluth to Grand Portage along Lake Superior is one of the great drives. The BWCAW inland is a million-acre wilderness of paddle routes and portages.',
      'CurbNTurf hosts cluster around the Twin Cities and the North Shore. Summer is short and intense. Mosquitoes are no joke in June. Winter is for ice fishing and people who own real parkas.',
    ],
    topDestinations: [
      { city: 'Grand Marais', blurb: 'A North Shore harbor town and the gateway to the Boundary Waters.' },
      { city: 'Duluth', blurb: 'The biggest city on Lake Superior, with the Aerial Lift Bridge and a good craft scene.' },
      { city: 'Boundary Waters', blurb: 'A million acres of lakes, portages, and the country\'s most-visited wilderness.' },
      { city: 'Ely', blurb: 'A canoe-country basecamp with the International Wolf Center.' },
      { city: 'Minneapolis', blurb: 'River city with chain-of-lakes paddling inside the city limits.' },
    ],
    thingsToDo: [
      'Drive MN-61 from Duluth to Grand Portage. Five hours straight, but plan a day or two — stop at Gooseberry Falls, Split Rock Lighthouse, Tettegouche, and Cascade River.',
      'The BWCA permit lottery opens in January for the next paddle season. If you\'re going outfitter-supported, Sawbill or Tuscarora can handle the permit and gear; bring a head net regardless.',
      'September is the unsung best month — cooler, fewer bugs, and aspen color starts late in the month. October is short but stunning.',
    ],
    nearbyStates: ['wisconsin', 'iowa', 'south-dakota'],
  },

  'missouri': {
    slug: 'missouri',
    name: 'Missouri',
    abbrev: 'MO',
    tagline: 'Spring-fed rivers, Ozark hill country, and barbecue traditions worth a special trip.',
    heroImage: 'assets/images/host_farm.webp',
    intro: [
      'Missouri is two river states glued together. The Missouri River cuts the north; the Mississippi forms the eastern edge. Between them are the Ozarks — clear rivers, dolomite bluffs, and small towns built around floats and fishing.',
      'CurbNTurf hosts trend rural — the Ozark hills, the Missouri wine country around Hermann, and a few near Branson. Spring and fall are gentle; summer is humid and storm-prone.',
    ],
    topDestinations: [
      { city: 'Branson', blurb: 'Ozark family-entertainment town next to Table Rock Lake.' },
      { city: 'Hermann', blurb: 'Missouri River wine country with German heritage and Norton grapes.' },
      { city: 'Current River', blurb: 'Spring-fed Ozark float country, part of the Ozark National Scenic Riverways.' },
      { city: 'Kansas City', blurb: 'Barbecue capital of the country and the western edge of the state.' },
      { city: 'St. Louis', blurb: 'River-and-arch city with a strong food scene and Forest Park.' },
    ],
    thingsToDo: [
      'Float the Current or the Jacks Fork — Missouri\'s national scenic riverways are spring-fed and stay cold all summer. Outfitters in Eminence and Van Buren rent canoes and kayaks with shuttle.',
      'Do the Kansas City barbecue circuit on a Friday: Joe\'s for burnt ends, LC\'s for ribs, Q39 for the city-wide modern take. Drive to Hermann the next day for Norton tastings.',
      'Tornado season runs March through June and severe storms can move fast. Keep a NOAA radio handy and don\'t camp in low river bottoms during watches.',
    ],
    nearbyStates: ['arkansas', 'iowa', 'illinois', 'oklahoma'],
  },

  'montana': {
    slug: 'montana',
    name: 'Montana',
    abbrev: 'MT',
    tagline: 'Glacier-cut peaks, big-sky valleys, and rivers that earned the state its reputation.',
    heroImage: 'assets/images/host_opportunity.webp',
    intro: [
      'Montana lives up to the marketing. Glacier National Park in the north, the Yellowstone gateway in the south, and Big Sky country between them. Distances are real — Bozeman to Glacier is six hours, and the road is the best part.',
      'CurbNTurf hosts cluster around Bozeman, Whitefish, and the Bitterroot. Summer (mid-June to early September) is short and busy. Wildfire smoke is increasingly part of August. Fall is the locals\' favorite season for a reason.',
    ],
    topDestinations: [
      { city: 'Bozeman', blurb: 'River-and-mountain college town and the gateway to Yellowstone\'s north entrance.' },
      { city: 'Whitefish', blurb: 'A working ski town outside Glacier National Park\'s west entrance.' },
      { city: 'Big Sky', blurb: 'Resort country in the Madison Range with cattle ranches still in operation.' },
      { city: 'Missoula', blurb: 'A college and rivers town with Bitterroot access in three directions.' },
      { city: 'Livingston', blurb: 'A small Yellowstone-gateway town with an outsized fly-fishing reputation.' },
    ],
    thingsToDo: [
      'Drive Going-to-the-Sun Road in Glacier as soon as it fully opens in late June or early July. Logan Pass is the highlight; vehicle reservation system is in effect — book the day they release.',
      'Fly-fish the Madison, the Gallatin, or the Yellowstone. Outfitters in Livingston, Bozeman, and Ennis run drift trips that\'ll teach you in a day. Salmonfly hatch in late June is a religious event.',
      'Pack for any season any day. Mountain weather flips fast; carry a hardshell, gloves, and a fleece year-round if you\'re heading above treeline.',
    ],
    nearbyStates: ['idaho', 'wyoming', 'south-dakota'],
  },

  'nebraska': {
    slug: 'nebraska',
    name: 'Nebraska',
    abbrev: 'NE',
    tagline: 'Sandhills, Platte River migrations, and one of the most underrated empty drives in the country.',
    heroImage: 'assets/images/host_farm.webp',
    intro: [
      'Nebraska gets passed through by most travelers, which is the state\'s gift. The Sandhills cover a quarter of it — grass-covered dunes, working ranches, and ranch roads with no cell service. The Platte River sandhill crane migration each March is one of the great wildlife spectacles in North America.',
      'CurbNTurf hosts trend ranch and farm. Plan offline maps and a full tank — gas stations are spaced like they were in the 1950s.',
    ],
    topDestinations: [
      { city: 'Valentine', blurb: 'Sandhills capital, with the Niobrara River and miles of ranch country.' },
      { city: 'Kearney', blurb: 'The center of the spring crane migration along the Platte.' },
      { city: 'Chimney Rock', blurb: 'An Oregon Trail landmark in the western panhandle.' },
      { city: 'Lincoln', blurb: 'College-football capital and a surprisingly good food town.' },
      { city: 'Scottsbluff', blurb: 'Western Nebraska crossroads with Scotts Bluff National Monument overlooking it.' },
    ],
    thingsToDo: [
      'Drive the Sandhills Journey Scenic Byway (US-2) from Grand Island to Alliance. Two hundred seventy miles of grass dunes, cattle, and the BNSF mainline. Catch a sunset over the dunes near Mullen.',
      'Time a March trip around the sandhill crane staging on the Platte near Kearney and Grand Island — half a million birds in a single 80-mile stretch. Audubon\'s Rowe Sanctuary runs blind reservations that fill fast.',
      'Wind is constant. Drive earlier in the day for less of it. Summer thunderstorms can move fast across the open plains; keep a weather radio in the rig.',
    ],
    nearbyStates: ['south-dakota', 'iowa', 'colorado', 'wyoming'],
  },

  'nevada': {
    slug: 'nevada',
    name: 'Nevada',
    abbrev: 'NV',
    tagline: 'Basin and range, Highway 50 emptiness, and dark skies that rewrite what you thought stars looked like.',
    heroImage: 'assets/images/host_opportunity.webp',
    intro: [
      'Nevada is mostly sagebrush and silence. The Loneliest Road in America (US-50) crosses it east-west with two-hundred-mile gaps between gas stops. Great Basin National Park in the east is one of the least-visited in the system.',
      'CurbNTurf hosts cluster around Reno-Tahoe and the Las Vegas exurbs, with a few in the rural east. Distances are deceptive — fill up every chance you get and carry water.',
    ],
    topDestinations: [
      { city: 'Lake Tahoe', blurb: 'Alpine lake on the California line — Incline Village and Stateline are the Nevada sides.' },
      { city: 'Great Basin National Park', blurb: 'Bristlecone pines, Lehman Caves, and the country\'s darkest night skies.' },
      { city: 'Valley of Fire', blurb: 'Red sandstone formations an hour from Las Vegas.' },
      { city: 'Reno', blurb: 'A river-town gateway to Tahoe and the eastern Sierra.' },
      { city: 'Ely', blurb: 'A high-desert mining town with the Northern Nevada Railway and US-50 at its door.' },
    ],
    thingsToDo: [
      'Drive US-50 across the state — Carson City to Ely or further. The Highway 50 Survival Guide passport (free at chambers of commerce along the route) is a kitschy fun overlay.',
      'Stargaze at Great Basin. The park\'s annual Astronomy Festival in September is one of the best in the country. Wheeler Peak is drivable to nearly 10,000 feet for the best skies.',
      'Summer in the basin is hot; winter at altitude is cold. Spring and fall are the sweet spot. Fuel and food are scarce on US-50 — top off before you commit.',
    ],
    nearbyStates: ['california', 'arizona', 'utah', 'oregon'],
  },

  'new-hampshire': {
    slug: 'new-hampshire',
    name: 'New Hampshire',
    abbrev: 'NH',
    tagline: 'White Mountain notches, granite peaks, and small lake towns that take their seasons seriously.',
    heroImage: 'assets/images/host_village.webp',
    intro: [
      'New Hampshire packs four-season terrain into a small state. The White Mountains are the dramatic core — Mount Washington has the worst recorded weather on earth. The Lakes Region in the south is summer cottage country. The seacoast is short but real.',
      'CurbNTurf hosts cluster around the White Mountains and the Lakes Region. Fall foliage (last week of September through second week of October in the north) is the busiest period of the year. Book early.',
    ],
    topDestinations: [
      { city: 'North Conway', blurb: 'White Mountain basecamp with outlet shopping and Cathedral Ledge climbing.' },
      { city: 'Franconia Notch', blurb: 'A glacier-carved gap with the Flume Gorge and Cannon Mountain.' },
      { city: 'Lake Winnipesaukee', blurb: 'The state\'s biggest lake, with Wolfeboro and Meredith on its shores.' },
      { city: 'Mount Washington Valley', blurb: 'The auto road, the cog railway, and the worst weather in America.' },
      { city: 'Portsmouth', blurb: 'A working seacoast town with strong food and the Isles of Shoals offshore.' },
    ],
    thingsToDo: [
      'Drive the Kancamagus Highway (NH-112) — 35 miles through the White Mountain National Forest with no services and the prettiest fall color east of the Smokies. Sabbaday Falls is a quick stop midway.',
      'Mount Washington can be summited by car (the Auto Road), train (the Cog), or foot (Tuckerman Ravine, Lion Head). Even in July, summit temps can hit freezing — pack a real shell.',
      'Foliage windows are short and crowds peak the first week of October in the north. The week before and after are nearly as good with fewer people. Mud season (late April–May) is a real thing.',
    ],
    nearbyStates: ['vermont', 'maine'],
  },

  'new-mexico': {
    slug: 'new-mexico',
    name: 'New Mexico',
    abbrev: 'NM',
    tagline: 'High desert mesas, ancient pueblos, and chile country with a road network worth getting lost in.',
    heroImage: 'assets/images/host_opportunity.webp',
    intro: [
      'New Mexico is the high desert at its most cinematic — adobe villages, red sandstone, juniper-piñon woodland that smells like the Southwest at sunrise. Northern New Mexico holds altitude that surprises people; Santa Fe is at 7,000 feet.',
      'CurbNTurf hosts cluster around Santa Fe, Taos, and the Hatch chile valley in the south. Spring winds are real; July monsoon afternoons are spectacular. Fall is the locals\' season.',
    ],
    topDestinations: [
      { city: 'Santa Fe', blurb: 'America\'s oldest state capital, with art galleries and Sangre de Cristo views.' },
      { city: 'Taos', blurb: 'A high-desert mesa town with a millennium-old pueblo and ski mountain.' },
      { city: 'White Sands National Park', blurb: 'Gypsum dunes you can sled down, near Alamogordo in the south.' },
      { city: 'Bandelier National Monument', blurb: 'Cliff-dwelling pueblos in the Jemez Mountains.' },
      { city: 'Hatch', blurb: 'The chile capital of the world, with green chile season in late August.' },
      { city: 'Silver City', blurb: 'A high-country gateway to the Gila Wilderness in the southwest corner.' },
    ],
    thingsToDo: [
      'Drive the High Road from Santa Fe to Taos (NM-503/76/518) instead of the river road. It threads through Chimayó, Truchas, and Las Trampas — old churches, weaving studios, and views toward the Sangre de Cristos.',
      'Time a fall trip around Hatch chile season (late August through September). Buy a sack roasted in front of you and learn how to peel and freeze them.',
      'Afternoon thunderstorms are the rule July through September. Plan high-country hikes for early morning. Sunsets are unreasonable in any season.',
    ],
    nearbyStates: ['arizona', 'colorado', 'texas', 'oklahoma'],
  },

  'new-york': {
    slug: 'new-york',
    name: 'New York',
    abbrev: 'NY',
    tagline: 'Adirondack lakes, Finger Lakes wine country, and a state much bigger upstate than people think.',
    heroImage: 'assets/images/host_vineyard.webp',
    intro: [
      'New York is mostly upstate. The Adirondacks are the largest park east of the Mississippi. The Finger Lakes have a serious cool-climate wine scene. The Catskills, the St. Lawrence, the Niagara frontier — there\'s a year of road trips here without seeing the city.',
      'CurbNTurf hosts cluster around the Finger Lakes (Hammondsport, Geneva, Cayuga) and the Adirondacks (Lake Placid, Saranac). Summer is the season; fall foliage rolls south through October.',
    ],
    topDestinations: [
      { city: 'Lake Placid', blurb: 'Two-time Olympic host town in the high peaks region of the Adirondacks.' },
      { city: 'Finger Lakes', blurb: 'Glacial lake wine country — riesling, pinot, cool-climate sparkling.' },
      { city: 'Hudson Valley', blurb: 'Apple orchards, Catskill foothills, and weekenders\' food towns.' },
      { city: 'Cooperstown', blurb: 'Baseball Hall of Fame and Otsego Lake in central New York.' },
      { city: 'Niagara Falls', blurb: 'Better from the Canadian side, but the New York side has the actual mist trail.' },
      { city: 'Catskills', blurb: 'Mountain country two hours from the city, with the original ski lodges still in operation.' },
    ],
    thingsToDo: [
      'Tour Finger Lakes wineries by lake. Seneca and Cayuga are the biggest; Keuka has the longest history. Hermann J. Wiemer in Dundee and Ravines on Keuka are reference-quality riesling.',
      'Adirondacks 46ers (the high peaks) are a project of a lifetime; even a single high peak — Cascade or Algonquin — is a real day. Lake Placid and Keene Valley are the basecamps.',
      'Foliage timing: third week of September in the high Adirondacks, first week of October in the Catskills, mid-October in the Hudson Valley. Mud season hits late April–May.',
    ],
    nearbyStates: ['vermont', 'pennsylvania', 'new-hampshire'],
  },

  'north-carolina': {
    slug: 'north-carolina',
    name: 'North Carolina',
    abbrev: 'NC',
    tagline: 'Appalachian ridges in the west, Outer Banks in the east, and the best barbecue argument in the South.',
    heroImage: 'assets/images/host_brewery.webp',
    intro: [
      'North Carolina is three states. The mountains in the west, the piedmont in the middle, and the coastal plain stretching out to the Outer Banks. Asheville to Cape Hatteras is a full day\'s drive and they feel like different countries.',
      'CurbNTurf hosts trend mountain — around Asheville, the Blue Ridge Parkway, and the southern Appalachians. Summers are humid and heavy; mid-October fall color in the high country is the best in the Southeast.',
    ],
    topDestinations: [
      { city: 'Asheville', blurb: 'Mountain food and craft-brewery capital, with the Biltmore Estate and the Blue Ridge Parkway.' },
      { city: 'Outer Banks', blurb: 'The barrier-island chain — Kitty Hawk, Hatteras, Ocracoke.' },
      { city: 'Boone / Blowing Rock', blurb: 'High Country college and resort towns on the Blue Ridge Parkway.' },
      { city: 'Cherokee', blurb: 'The Eastern Band Cherokee gateway to Great Smoky Mountains National Park.' },
      { city: 'Wilmington', blurb: 'A working coastal city with Wrightsville Beach and the USS North Carolina.' },
    ],
    thingsToDo: [
      'Drive the Blue Ridge Parkway from Asheville north to Boone — about three hours without stops, but plan a day. Mile 364 (Craggy Gardens), Mile 305 (Linn Cove Viaduct), and the Linville Falls overlook are all worth pulling over.',
      'Asheville for breweries (Wicked Weed, Burial, Highland) and food (Cúrate, Buxton Hall). Hatteras for surf, ferry, and a full-week sand-and-fish vibe. Pick one or do both with a real driving day in between.',
      'Hurricane season hits the Outer Banks late August through October. Keep a flex window. The mountains stay drivable in any season but the Parkway closes sections in winter.',
    ],
    nearbyStates: ['virginia', 'south-carolina', 'georgia'],
  },

  'ohio': {
    slug: 'ohio',
    name: 'Ohio',
    abbrev: 'OH',
    tagline: 'Lake Erie islands, Hocking Hills sandstone, and Amish country backroads.',
    heroImage: 'assets/images/host_farm.webp',
    intro: [
      'Ohio is more varied than its reputation. Hocking Hills in the southeast has slot-canyon-style sandstone gorges. Lake Erie has a working island chain (Put-in-Bay, Kelleys). Amish country in Holmes County is the largest in the world.',
      'CurbNTurf hosts trend rural — Amish country farms, Hocking Hills cabins, lake-shore pads on Erie. Summer and fall are easy; winter is gray.',
    ],
    topDestinations: [
      { city: 'Hocking Hills', blurb: 'Old Man\'s Cave, Ash Cave, and slot-canyon hiking south of Columbus.' },
      { city: 'Holmes County', blurb: 'The largest Amish settlement in the world, with cheese and furniture trails.' },
      { city: 'Put-in-Bay', blurb: 'A Lake Erie island town reachable by ferry from Catawba Point.' },
      { city: 'Cuyahoga Valley', blurb: 'A national park strung along the river between Cleveland and Akron.' },
      { city: 'Cincinnati', blurb: 'River city with Findlay Market, OTR, and a chili tradition all its own.' },
    ],
    thingsToDo: [
      'Hocking Hills loop in a day: Old Man\'s Cave, Cedar Falls, Ash Cave. Add the rim trail at Conkle\'s Hollow if you have the legs. The Hocking River canopy is at its best mid-October.',
      'Ohio Amish country isn\'t a theme park. Buy at a roadside stand, eat at a family-style table (Der Dutchman, Boyd & Wurthmann), and respect that businesses close on Sundays.',
      'Summer thunderstorms come fast off Lake Erie. Lake-effect snow buries the northern counties in winter. Spring and fall are forgiving.',
    ],
    nearbyStates: ['indiana', 'kentucky', 'pennsylvania', 'michigan'],
  },

  'oklahoma': {
    slug: 'oklahoma',
    name: 'Oklahoma',
    abbrev: 'OK',
    tagline: 'Cross-timbers prairie, Wichita Mountain granite, and a Route 66 stretch that still feels honest.',
    heroImage: 'assets/images/host_farm.webp',
    intro: [
      'Oklahoma is geographically the elbow of the Plains and the Southwest — Wichita Mountains in the southwest are real granite, the Ozark foothills are in the east, and the panhandle pushes into mesa country. Route 66 runs the diagonal.',
      'CurbNTurf hosts trend ranch and farm. Cell coverage is solid along I-40 and I-44; the rural roads are quiet and well-graded.',
    ],
    topDestinations: [
      { city: 'Wichita Mountains', blurb: 'Granite peaks, bison herds, and Mount Scott in the southwest.' },
      { city: 'Tulsa', blurb: 'Art Deco architecture, the Bob Dylan Center, and a strong food scene.' },
      { city: 'Talimena Scenic Drive', blurb: 'A 54-mile ridge-top byway across the Ouachitas in the southeast.' },
      { city: 'Tahlequah', blurb: 'Cherokee Nation capital and Illinois River float country.' },
      { city: 'Oklahoma City', blurb: 'Bricktown, the National Memorial, and a working stockyards district.' },
    ],
    thingsToDo: [
      'Drive Route 66 from Miami through Tulsa to Oklahoma City — about three hours of preserved roadside Americana. Pops 66 in Arcadia is the obvious stop; the Round Barn next door is the better one.',
      'Wichita Mountains Wildlife Refuge for an early-morning drive — bison, longhorns, and prairie dogs in the first hour after sunrise. Mount Scott summit road is gorgeous at golden hour.',
      'Tornado season (April–June) is real and serious; have a plan and a weather radio. Summer heat is the other constraint — May and October are the comfort months.',
    ],
    nearbyStates: ['texas', 'arkansas', 'missouri', 'new-mexico'],
  },

  'oregon': {
    slug: 'oregon',
    name: 'Oregon',
    abbrev: 'OR',
    tagline: 'Coastal cliffs, Willamette wine country, and a high desert that most travelers never see.',
    heroImage: 'assets/images/host_hops.webp',
    intro: [
      'Oregon\'s diversity is its surprise. The coast is rocky, foggy, and almost entirely public. The Willamette Valley is one of the world\'s great pinot noir regions. The high desert east of the Cascades is empty in the way Nevada is empty.',
      'CurbNTurf hosts cluster in wine country (McMinnville, Dundee), Bend and the Cascades, and along the coast. Summer (July–September) is dry and reliable; winter is wet on the western side and ski-season sharp east of the crest.',
    ],
    topDestinations: [
      { city: 'Bend', blurb: 'High desert mountain town with a brewery on every corner and Cascade access.' },
      { city: 'McMinnville', blurb: 'Willamette wine country basecamp — pinot, pinot, and more pinot.' },
      { city: 'Cannon Beach', blurb: 'Haystack Rock, sea stacks, and the moodiest stretch of Highway 101.' },
      { city: 'Crater Lake', blurb: 'The deepest lake in the country, in the caldera of a collapsed volcano.' },
      { city: 'Hood River', blurb: 'Columbia Gorge windsurfing town with orchards and a brewery row.' },
      { city: 'Joseph', blurb: 'A gateway to the Wallowas in the far northeast — the Alps of Oregon.' },
    ],
    thingsToDo: [
      'Drive Highway 101 from Astoria to Brookings over three days — about 360 miles, but every pull-off is worth it. Cannon Beach for the Haystack, Yachats for tide pools, Bandon for the dunes.',
      'Willamette wine country pairs perfectly with a McMinnville base. Visit Beaux Frères, Eyrie, Domaine Drouhin in Dundee. Lunch at Hayward in McMinnville or Tina\'s in Dundee.',
      'July through October is the reliable dry window. Smoke from California fires can drift north in late August; check airnow.gov. The coast stays cool — a fleece is a year-round item.',
    ],
    nearbyStates: ['california', 'washington', 'idaho', 'nevada'],
  },

  'pennsylvania': {
    slug: 'pennsylvania',
    name: 'Pennsylvania',
    abbrev: 'PA',
    tagline: 'Allegheny ridges, Pennsylvania Dutch country, and small-town main streets that still work.',
    heroImage: 'assets/images/host_museum.webp',
    intro: [
      'Pennsylvania is two states tilted into each other — Philadelphia in the east, Pittsburgh in the west, and the Allegheny ridges between them. Pennsylvania Dutch country south of the Susquehanna is the country\'s oldest Amish settlement.',
      'CurbNTurf hosts trend rural — farms in Lancaster County, mountain pads in the Poconos and the Allegheny National Forest. Summer humidity is real; fall foliage is one of the best east of the Mississippi.',
    ],
    topDestinations: [
      { city: 'Lancaster County', blurb: 'Pennsylvania Dutch country — Amish farms, covered bridges, family-style tables.' },
      { city: 'Poconos', blurb: 'The eastern mountain region with lakes, ski resorts, and weekend towns.' },
      { city: 'Pittsburgh', blurb: 'Three rivers, working bridges, and an underrated food scene.' },
      { city: 'Gettysburg', blurb: 'The Civil War battlefield with auto-tour and ranger-led options.' },
      { city: 'Allegheny National Forest', blurb: 'A half-million acres of hardwood country in the northwest.' },
    ],
    thingsToDo: [
      'Drive the PA Wilds — Route 6 through the northern tier counties. Kinzua Bridge State Park, the Pine Creek Gorge (Pennsylvania\'s Grand Canyon), and Cherry Springs Dark Sky Park in one long arc.',
      'Lancaster County eating is a project. Bird-in-Hand Family Restaurant for the family-style spread, Central Market in Lancaster City for picnic supplies, the roadside Amish stands for shoofly pie.',
      'Foliage peaks first week of October in the north, second week in the central ridges, mid- to late October in the south. Cherry Springs night-sky viewing is best September–October.',
    ],
    nearbyStates: ['new-york', 'ohio', 'west-virginia'],
  },

  'south-carolina': {
    slug: 'south-carolina',
    name: 'South Carolina',
    abbrev: 'SC',
    tagline: 'Lowcountry tide marshes, Blue Ridge headwaters, and one of the most preserved coastal cultures in America.',
    heroImage: 'assets/images/host_village.webp',
    intro: [
      'South Carolina is small and varied. The Lowcountry around Charleston is salt-marsh, oak alleys, and a Gullah cultural heritage that has lived along the coast for centuries. The Upstate is Blue Ridge country with whitewater rivers and the southern terminus of the Foothills Trail.',
      'CurbNTurf hosts trend coastal — around Charleston, Beaufort, and the Sea Islands. Spring (March–May) and fall (October–November) are the comfort seasons; summer is humid and gnat-heavy; winter is mild and underrated.',
    ],
    topDestinations: [
      { city: 'Charleston', blurb: 'The Holy City — Rainbow Row, oyster roasts, and one of the great American food towns.' },
      { city: 'Beaufort', blurb: 'A working Lowcountry town between Charleston and Savannah, and the gateway to Hunting Island.' },
      { city: 'Hilton Head', blurb: 'A barrier-island resort town with bike paths and the Atlantic in three directions.' },
      { city: 'Greenville', blurb: 'An Upstate Main Street that consistently makes best-downtown lists.' },
      { city: 'Caesars Head', blurb: 'A Blue Ridge escarpment with Raven Cliff Falls and serious foliage in October.' },
    ],
    thingsToDo: [
      'Drive the Ace Basin between Charleston and Beaufort — slow rural roads through salt marsh and oak hammocks. Stop at Bowens Island Restaurant outside Charleston for cluster oysters with a hammer.',
      'Charleston eating: Husk for Southern, Rodney Scott\'s for whole-hog barbecue, Leon\'s for oysters and gin and tonics, Lewis Barbecue for brisket. Reservations needed for the dinner spots; lunch is more flexible.',
      'No-see-um gnats and mosquitoes are the summer reality on the coast — DEET and a screen tent are not optional. Hurricane season runs August–October; book flexible if you\'re traveling then.',
    ],
    nearbyStates: ['north-carolina', 'georgia'],
  },

  'south-dakota': {
    slug: 'south-dakota',
    name: 'South Dakota',
    abbrev: 'SD',
    tagline: 'Black Hills granite, Badlands erosion, and a state that earns the trip across the prairie to reach it.',
    heroImage: 'assets/images/host_opportunity.webp',
    intro: [
      'South Dakota is two distinct halves split by the Missouri River. East River is farm country and the lake belt around the river. West River is Black Hills, Badlands, and Lakota country — and the reason most people come.',
      'CurbNTurf hosts trend west — Custer, Wall, the Spearfish Canyon area. Summer (June–early September) is the busy season around Mount Rushmore and the Sturgis Rally\'s footprint; September is the locals\' favorite month.',
    ],
    topDestinations: [
      { city: 'Custer', blurb: 'Black Hills basecamp with Custer State Park and the Crazy Horse Memorial.' },
      { city: 'Badlands National Park', blurb: 'Eroded buttes, mixed-grass prairie, and dawn light worth setting an alarm for.' },
      { city: 'Spearfish Canyon', blurb: 'A limestone river canyon in the northern Black Hills, peak fall color in October.' },
      { city: 'Wall', blurb: 'The Wall Drug stop and the gateway to the Badlands\' eastern entrance.' },
      { city: 'Deadwood', blurb: 'A historic mining town in the northern Hills, with restored downtown gambling.' },
    ],
    thingsToDo: [
      'Drive the Iron Mountain Road and Needles Highway (US-16A and SD-87) in Custer State Park — granite tunnels, pigtail bridges, and the Cathedral Spires. Plan a morning loop to avoid bus traffic.',
      'Badlands at sunrise is the experience. Camp at Cedar Pass or stay nearby and drive in for first light at the Pinnacles Overlook. The Notch Trail is a quick scramble that rewards.',
      'August Sturgis Rally turns the Hills into a 700,000-rider party. If you\'re not part of it, plan around the first two weeks of August. September is empty, cool, and stunning.',
    ],
    nearbyStates: ['nebraska', 'wyoming', 'montana', 'minnesota'],
  },

  'texas': {
    slug: 'texas',
    name: 'Texas',
    abbrev: 'TX',
    tagline: 'Hill Country wineries, Big Bend desert, and Gulf Coast — a state too big to do in a single trip.',
    heroImage: 'assets/images/host_farm.webp',
    intro: [
      'Texas is a country. Hill Country in the center, Big Bend desert in the far west, Piney Woods in the east, the Gulf Coast in the south. Driving east-west across the state takes most of two days. Plan in regions, not statewide loops.',
      'CurbNTurf hosts cluster in the Hill Country (Fredericksburg, Driftwood, Wimberley) with outliers in Big Bend country and around Austin. Spring wildflowers (March–April) and fall (October–November) are the comfort seasons.',
    ],
    topDestinations: [
      { city: 'Fredericksburg', blurb: 'Hill Country wine capital with German heritage and US-290 wineries in both directions.' },
      { city: 'Big Bend', blurb: 'Desert mountains, Rio Grande canyons, and one of the darkest skies in the lower 48.' },
      { city: 'Austin', blurb: 'Music city, food trucks, and a working river running through downtown.' },
      { city: 'Marfa', blurb: 'A high desert art town with the Marfa Lights and a sunset drive worth its own trip.' },
      { city: 'Hill Country', blurb: 'Bluebonnets in March, swimming holes in summer, BBQ joints year-round.' },
      { city: 'Galveston', blurb: 'A working Gulf Coast island with a Strand district and serious seafood.' },
    ],
    thingsToDo: [
      'Drive US-290 from Austin to Fredericksburg — wine country with brisket-and-sausage stops in Driftwood, Lockhart (a small detour south), and Luckenbach. Plan a slow Saturday.',
      'Big Bend takes a week minimum. Chisos Basin for the high country, Santa Elena Canyon for the river, Boquillas crossing into Mexico for the side trip. Marfa is a half-day add on the drive in or out.',
      'Spring wildflowers (mid-March to mid-April) and fall (mid-October through November) are the comfort windows. Summer Hill Country is hot but pool-and-river country is the play. Hurricane season hits the coast June–November.',
    ],
    nearbyStates: ['oklahoma', 'arkansas', 'new-mexico'],
  },

  'utah': {
    slug: 'utah',
    name: 'Utah',
    abbrev: 'UT',
    tagline: 'Five national parks, slickrock canyons, and a slot-canyon-and-arch density that has no equal.',
    heroImage: 'assets/images/host_opportunity.webp',
    intro: [
      'Utah\'s southern half is the densest concentration of national parks in the country — Zion, Bryce, Capitol Reef, Arches, Canyonlands. The Wasatch Front in the north is mountain country with serious skiing. The space between is BLM land most travelers don\'t know is open to them.',
      'CurbNTurf hosts cluster around Moab, the Bryce-Zion corridor, and the Wasatch Back. Spring (April–May) and fall (September–October) are the sweet spots; summer in the south is brutal.',
    ],
    topDestinations: [
      { city: 'Moab', blurb: 'Slickrock biking, Arches and Canyonlands at the doorstep, Colorado River in town.' },
      { city: 'Zion', blurb: 'The Narrows, Angel\'s Landing, and a shuttle system that\'s now mandatory in season.' },
      { city: 'Bryce Canyon', blurb: 'Hoodoo amphitheaters at 9,000 feet — sunrise from Sunrise Point is the iconic view.' },
      { city: 'Capitol Reef', blurb: 'The least-visited of the five, with the Waterpocket Fold and pioneer orchards.' },
      { city: 'Hurricane', blurb: 'A Zion gateway with quieter trails and Sand Hollow State Park nearby.' },
      { city: 'Park City', blurb: 'Wasatch Back ski town with a working main street and summer mountain biking.' },
    ],
    thingsToDo: [
      'Drive UT-12 from Bryce east to Capitol Reef. Hundred-twenty-four miles, two hours without stops, plan a full day. Hogback Ridge between Boulder and Escalante is one of the most exposed driving stretches in the country.',
      'Mighty Five trip: 7–10 days minimum to do them all without rushing. Add Grand Staircase-Escalante and Goblin Valley as the connective tissue. Permits for the Wave (in Arizona but accessed from Kanab) require a daily lottery.',
      'Summer south of I-70 routinely hits 100+ degrees. Hike at sunrise, rest mid-day, hike again at sunset. Carry water like your trip depends on it — because it does.',
    ],
    nearbyStates: ['arizona', 'colorado', 'nevada', 'wyoming'],
  },

  'vermont': {
    slug: 'vermont',
    name: 'Vermont',
    abbrev: 'VT',
    tagline: 'Green Mountain ridges, dairy farm valleys, and the country\'s most concentrated fall foliage.',
    heroImage: 'assets/images/host_dairy.webp',
    intro: [
      'Vermont is small enough to drive end-to-end in three hours but rewards weeks of slow exploration. The Green Mountains run the spine; the Champlain Valley to the west is dairy and wine country; the Northeast Kingdom is the wildest and most underrated quarter.',
      'CurbNTurf hosts trend farm and mountain — Stowe, Burlington area, the Mad River Valley. Fall foliage (last week of September through first week of October in the north) is the busiest week of the year. Book months ahead.',
    ],
    topDestinations: [
      { city: 'Stowe', blurb: 'A working ski town with a covered-bridge village and Smugglers\' Notch behind it.' },
      { city: 'Burlington', blurb: 'A small lakefront city with the best food scene in the state.' },
      { city: 'Mad River Valley', blurb: 'Waitsfield, Warren, and Sugarbush — a quieter alternative to Stowe.' },
      { city: 'Northeast Kingdom', blurb: 'The wildest counties — Lake Willoughby, Burke Mountain, dark skies.' },
      { city: 'Woodstock', blurb: 'A picture-postcard village in the Quechee Gorge area.' },
    ],
    thingsToDo: [
      'Drive VT-100 the length of the state — Stamford to Newport, 217 miles of mountain spine. Plan a full day with stops in Weston, Killington, Waitsfield, and Stowe. Most traveled in foliage season for good reason.',
      'Vermont eats well. Sample dairy at Cabot, Jasper Hill, and Shelburne Farms; eat at Hen of the Wood in Waterbury or Burlington; pick up Heady Topper at the Alchemist in Stowe.',
      'Foliage peaks in the Northeast Kingdom around September 25, central state around October 1, southern state around October 8. Mud season (mid-April to mid-May) is real and dirt roads can become impassable.',
    ],
    nearbyStates: ['new-hampshire', 'new-york', 'maine'],
  },

  'virginia': {
    slug: 'virginia',
    name: 'Virginia',
    abbrev: 'VA',
    tagline: 'Shenandoah ridges, Chesapeake tidewater, and one of the deepest layered histories in the country.',
    heroImage: 'assets/images/host_museum.webp',
    intro: [
      'Virginia covers a lot — Blue Ridge in the west, Piedmont horse country in the middle, Tidewater out to the Chesapeake. The Skyline Drive through Shenandoah and the Blue Ridge Parkway south of it are bookends of one of the best mountain drives in the East.',
      'CurbNTurf hosts cluster around Charlottesville, the Shenandoah Valley, and a few near the coast. Spring (April–May) and fall (October–early November) are the comfort seasons.',
    ],
    topDestinations: [
      { city: 'Charlottesville', blurb: 'Wine country, Monticello, and a college-town main street.' },
      { city: 'Luray / Shenandoah', blurb: 'Caverns and the northern entrance to Skyline Drive.' },
      { city: 'Staunton', blurb: 'A preserved Shenandoah Valley downtown with a Shakespeare festival.' },
      { city: 'Virginia Beach', blurb: 'The Atlantic resort city and a launch point for the Eastern Shore.' },
      { city: 'Roanoke', blurb: 'A Blue Ridge Parkway gateway in southwest Virginia.' },
    ],
    thingsToDo: [
      'Drive Skyline Drive (US Route designation through Shenandoah National Park) — 105 miles ridge-top with overlooks every mile or two. Plan an overnight at Skyland or Big Meadows in fall.',
      'Charlottesville wine: Barboursville, King Family, Pippin Hill, RdV. Pair with a Monticello visit and lunch in town. Reservations for tastings are now standard.',
      'Foliage peaks the second to third week of October in the high country. The Eastern Shore is best in spring before the crowds and the bugs. Hurricane season hits the coast August–October.',
    ],
    nearbyStates: ['north-carolina', 'west-virginia', 'kentucky', 'pennsylvania'],
  },

  'washington': {
    slug: 'washington',
    name: 'Washington',
    abbrev: 'WA',
    tagline: 'Olympic rainforest, Cascade volcanoes, and the country\'s most underrated wine region.',
    heroImage: 'assets/images/host_vineyard.webp',
    intro: [
      'Washington is split by the Cascades into two different climates. West-side is mossy temperate rainforest — the Olympic Peninsula, the San Juans, Puget Sound. East-side is high desert sagebrush, the Columbia Basin, and Walla Walla wine country.',
      'CurbNTurf hosts cluster on the Olympic Peninsula, in the San Juans, and in Walla Walla. Summer (July–September) is the dry season; the rest of the year, west-side rain is the rule and east-side stays surprisingly clear.',
    ],
    topDestinations: [
      { city: 'Olympic Peninsula', blurb: 'Rainforest, ocean coast, and Hurricane Ridge in one park.' },
      { city: 'San Juan Islands', blurb: 'Ferry-only archipelago with orca pods and Friday Harbor as the hub.' },
      { city: 'Walla Walla', blurb: 'Big-red wine country in the southeast — Cabernet, Syrah, and a working Main Street.' },
      { city: 'Mount Rainier', blurb: 'The state\'s defining peak, with Paradise as the south side basecamp.' },
      { city: 'Methow Valley', blurb: 'A high-and-dry valley in the North Cascades — Mazama, Winthrop, summer trails.' },
      { city: 'Sequim', blurb: 'Olympic Peninsula\'s lavender capital, in the rain shadow of the Olympics.' },
    ],
    thingsToDo: [
      'Drive the North Cascades Highway (WA-20) from Burlington to Winthrop — 106 miles through the most underrated national park in the country. Closes in winter; open mid-April to mid-November typically.',
      'Walla Walla wine takes two days minimum. Cayuse, Leonetti, Woodward Canyon are reference-quality reds. Pair with Walla Walla onions and a long lunch at Saffron.',
      'July through September is the reliable dry window everywhere. October on the east side is still beautiful and quiet. West side is rain-gear country eight months a year — embrace it or visit in summer.',
    ],
    nearbyStates: ['oregon', 'idaho', 'montana'],
  },

  'west-virginia': {
    slug: 'west-virginia',
    name: 'West Virginia',
    abbrev: 'WV',
    tagline: 'New River canyons, Allegheny ridges, and the East\'s wildest and quietest mountain state.',
    heroImage: 'assets/images/host_opportunity.webp',
    intro: [
      'West Virginia is mountains all the way through. New River Gorge became a national park in 2020 — the southern third of the state turns over to whitewater country every spring. The Allegheny highlands in the east have some of the highest elevations in the East and surprising weather year-round.',
      'CurbNTurf hosts trend mountain — Fayetteville near the New, Davis and Thomas in the highlands, scattered farms in the eastern panhandle. Cell coverage drops fast off the interstates.',
    ],
    topDestinations: [
      { city: 'Fayetteville / New River Gorge', blurb: 'Whitewater rafting, world-class climbing, and the New River Gorge Bridge.' },
      { city: 'Davis / Canaan Valley', blurb: 'High-elevation valley with Blackwater Falls and Dolly Sods Wilderness nearby.' },
      { city: 'Lewisburg', blurb: 'An arts-and-eating Greenbrier Valley town with a preserved downtown.' },
      { city: 'Harpers Ferry', blurb: 'Confluence of the Potomac and Shenandoah rivers and a key Civil War site.' },
      { city: 'Snowshoe', blurb: 'A high-mountain ski resort that doubles as summer trail country.' },
    ],
    thingsToDo: [
      'Run the New River — outfitters in Fayetteville do day trips on the Lower New (April–October) and the Upper Gauley releases (six fall weekends, world-class). Long Point hike for the bridge view if you\'re not on the water.',
      'Dolly Sods is the closest thing to subarctic terrain in the East — heath barrens, bog, and weather that turns on a dime. Bring layers in any season; FR-75 is the access road and it\'s rough.',
      'Spring whitewater (March–May) and fall foliage (early to mid-October at high elevation, late October at lower) are the headline seasons. Mountain weather is unpredictable — check forecasts the day of, not the day before.',
    ],
    nearbyStates: ['virginia', 'pennsylvania', 'ohio', 'kentucky'],
  },

  'wisconsin': {
    slug: 'wisconsin',
    name: 'Wisconsin',
    abbrev: 'WI',
    tagline: 'Door County orchards, Driftless coulees, and a Northwoods big enough to disappear into.',
    heroImage: 'assets/images/host_dairy.webp',
    intro: [
      'Wisconsin is dairy country, but the geography is more varied than the reputation. The Driftless Area in the southwest is unglaciated bluff country. Door County to the east is the thumb sticking into Lake Michigan with cherry orchards and ferry service. The Northwoods are 4 million acres of lake-and-forest.',
      'CurbNTurf hosts trend farm and lake-side. Summer is short and golden — book early for July weekends in Door County. Fall (mid-September to mid-October) is the locals\' favorite.',
    ],
    topDestinations: [
      { city: 'Door County', blurb: 'A peninsula of cherry orchards, harbor villages, and ferry runs to Washington Island.' },
      { city: 'Madison', blurb: 'Two-lake college town with a strong food scene and Saturday farmer\'s market on the Square.' },
      { city: 'Bayfield / Apostle Islands', blurb: 'Sea caves, sailboats, and Lake Superior\'s only national lakeshore.' },
      { city: 'Driftless Area', blurb: 'Unglaciated coulees and trout streams in the southwest corner.' },
      { city: 'Wisconsin Dells', blurb: 'Sandstone river bluffs (and an obvious water-park overlay).' },
    ],
    thingsToDo: [
      'Drive the Door County loop — WI-42 up the bay side, WI-57 down the lake side. Hit fish boils in Ellison Bay or Fish Creek (a tradition, not a kitsch), Wilson\'s in Ephraim for ice cream, the Cana Island Lighthouse for the photo.',
      'Madison eating is sneaky-good. L\'Etoile on the Square, Old Fashioned for Friday fish fry, Forequarter for a long bar dinner. The Dane County farmers\' market is one of the best in the country.',
      'July and August are the Door County peak — book three months out for weekends. September is nearly as good and quieter. Northwoods opens in May and closes effectively in late October when most lodges shut down.',
    ],
    nearbyStates: ['minnesota', 'michigan', 'iowa', 'illinois'],
  },

  'wyoming': {
    slug: 'wyoming',
    name: 'Wyoming',
    abbrev: 'WY',
    tagline: 'Yellowstone geysers, Teton spires, and a state with more antelope than people.',
    heroImage: 'assets/images/host_opportunity.webp',
    intro: [
      'Wyoming is the least populated state and it shows on every road. Yellowstone in the northwest, the Tetons just south, the Wind River range deeper in the wilderness. The eastern half of the state is the high plains — empty, windy, full of antelope.',
      'CurbNTurf hosts cluster around Jackson, Cody, and the Bighorn Basin. Summer (mid-June through early September) is the season; everything outside that window is either ski-town busy (Jackson) or genuinely empty.',
    ],
    topDestinations: [
      { city: 'Jackson', blurb: 'Teton gateway and elk-refuge town — the entry point to both parks.' },
      { city: 'Yellowstone', blurb: 'Geysers, bison herds, and the Lamar Valley wolf-watching corridor.' },
      { city: 'Grand Teton', blurb: 'The Cathedral Group above Jenny Lake — the most photographed mountains in the country.' },
      { city: 'Cody', blurb: 'A working western town and Yellowstone\'s east entrance.' },
      { city: 'Lander', blurb: 'Wind River basecamp on the prairie\'s edge — climbing, fishing, and Sinks Canyon.' },
      { city: 'Sheridan', blurb: 'A Bighorns gateway in the north — historic main street and Bighorn National Forest above.' },
    ],
    thingsToDo: [
      'Drive the Beartooth Highway (US-212) from Red Lodge, Montana into Yellowstone\'s northeast entrance. It tops out at 10,947 feet, opens late May or early June, and is one of the best mountain highways in the country.',
      'Lamar Valley at sunrise for wolves and bison — pull off at any of the marked turnouts, scopes welcome. Hayden Valley is the Yellowstone-side equivalent and has heavy bison traffic at dawn and dusk.',
      'Yellowstone roads close in winter except for the north-entrance corridor. Summer weekends are the busiest. Plan early-morning starts and avoid mid-day in the geyser basins. Wildlife is real — keep distance, especially from bison and elk.',
    ],
    nearbyStates: ['montana', 'idaho', 'colorado', 'south-dakota'],
  },
};

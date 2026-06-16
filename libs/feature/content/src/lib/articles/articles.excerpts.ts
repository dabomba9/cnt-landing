/** Hand-written editorial excerpts keyed by article id.
 *
 *  These override the auto-generated lead-paragraph excerpts that the
 *  importer produces from the article body (which read as raw filler:
 *  "Hey there, fellow traveler!"). The override is applied at module
 *  load by `articles.data.ts` so every consumer of `ARTICLES`
 *  (cards, SEO meta, OG description, sitemap) gets the editorial
 *  copy.
 *
 *  Voice: adventure-forward, freedom-focused, concrete benefit. Three
 *  lines (~200 chars) so the card clamp + the SEO meta-description
 *  spec are both happy.
 *
 *  When a new article is imported, add its id here. The importer
 *  prints a warning for any catalog id missing from this map.
 */
export const EXCERPT_OVERRIDES: Record<number, string> = {
  46: 'Park campgrounds are tougher to book than ever. Skip the booking battle: how to find verified private RV stays in the gateway towns around Yellowstone, Glacier, and Grand Teton — closer to the trailhead, with real space and quiet.',
  45: 'Crowded campgrounds and bored kids are a bad combination. The activities, host-stay tactics, and sanity savers that turn a private farm into the kind of stop your kids actually remember — and let parents breathe.',
  44: 'When the thermostat climbs and you\'re parked without shore power, your home-on-wheels turns into a rolling toaster. The shade, airflow, and battery tactics that keep an off-grid summer rig livable.',
  43: 'New to CurbNTurf? A step-by-step walkthrough of finding a private stay, messaging a host, locking in your dates, and rolling up to your first booking with everything you need to know already squared away.',
  42: 'Before the season starts. A top-to-tail checklist for getting your rig road-ready — tires, roof, AC, batteries, plumbing — so the only surprises this summer are the good ones at the vineyard you didn\'t plan for.',
  41: 'Apple-picking in October, strawberries in May, lavender in July. A month-by-month look at harvest-season farm and vineyard stays where the rig parks just steps from the source — built for road-trippers chasing the seasons.',
  40: 'The photo, headline, and amenity copy that turn casual scrollers into bookings. Five concrete tips — plus the exact AI prompts to draft your listing description — for hosts who want their turf to stand out.',
  39: 'Hidden membership fees? Recurring subscriptions? Annual renewals? Straight answers on what CurbNTurf actually costs, what\'s free for guests, what hosts pay, and why the model is built differently from the names you already know.',
  38: 'When your campsite is also a working farm or vineyard, dinner stops being an afterthought. How to plan an RV foodie tour around private farm stays — vineyard wines, fresh dairy, just-picked produce — built into the route.',
  37: 'Farm income shouldn\'t ride entirely on the harvest. How agritourism — hosting RVers on quiet acreage you already own — diversifies revenue without piling on another full-time job, and what it looks like in practice.',
  36: 'Full hookups, partial, or just a level patch of dirt? A plain-English guide to the amenity icons on every CurbNTurf listing so you book the right kind of night — and stop discovering surprises eight hours into the drive.',
  35: 'The best trips don\'t follow a script. How to build a multi-stop RV road trip around private vineyards, working farms, and quiet acreage — anchor stops, scenic detours, and the routing tricks that turn a route into a story.',
  34: 'Half a million new rigs hit the road every year. The number of campgrounds didn\'t budge. Why your next best stay isn\'t on any traditional map — and how a fast-growing private-land network is filling the gap.',
  33: 'A step-by-step walkthrough for landowners: how to vet your property, build a listing that actually books, set a fair nightly rate, and start earning from acreage you already own — no construction, no big upfront spend.',
  32: '14 million visitors a year, most of them stuck in the same gravel lots. A region-by-region guide to private RV stays around the Smokies — Tennessee for action, North Carolina for solitude — that the crowds don\'t know exist.',
  31: 'Working farms, lakeside ranches, hilltop vineyards, even mountain estates. Seven private-land RV stays that prove the best campsite of your trip might not look like a campsite at all — and how to find each kind.',
  30: 'A founder\'s letter on where CurbNTurf came from, what we shipped this year, the math that drove the bet, and the roadmap for the host network, traveler tools, and editorial coverage heading into 2026.',
  29: 'Frozen hookups, seasonal closures, and check-in cutoffs that ignore the snowstorm rolling in. Why winter RV travelers are skipping the campground entirely — and what the private-land alternative actually looks like in February.',
  28: 'The single free step that can triple a host\'s CurbNTurf bookings. A step-by-step walkthrough for claiming your Google Business Profile, dialing in the listing, and showing up when travelers search the map.',
  27: 'Fall is a host\'s golden season — if the property\'s ready for it. A complete checklist for landowners: drainage, weatherproofing, lighting, and the small amenity upgrades that turn fall lookers into peak-season bookings.',
  26: 'Half a million new RVs every year. Only 18,000 campgrounds to absorb them. A regional breakdown of where demand is strongest, what acreage hosts are charging, and how landowners are turning idle pasture into nightly income.',
  25: 'Forty private acres in the Sangre de Cristos for $36 a night. The story — and the model — behind a marketplace that swaps overcrowded RV parks for private land hosted by the people who actually own it.',
  24: 'Renting a rig from RVshare and booking a stay through CurbNTurf is a one-two punch for the first big RV trip you\'ve been planning forever. How the two platforms work together, what to expect, and how to pull it off.',
  23: 'Your CurbNTurf listing already works hard. A Google Business Profile makes it work harder — surfacing your property on Maps, in local searches, and on the routes RVers actually plan around. Setup, step by step.',
  22: 'A primer for hosts new to the platform: what CurbNTurf is, how the listing surfaces work, the tools you have for messaging, pricing, and security, and the promotion tactics that move a fresh listing into its first booking.',
  21: 'What separates a one-night sleep from the stop guests photograph and message friends about. The amenity upgrades, presentation choices, and small touches that lift a CurbNTurf listing\'s rating — and keep it booked.',
  20: 'Bison in the Rockies, alligators in the Everglades, elk in Olympic. The national parks where RVers see the most wildlife — including the campground tips, time-of-day windows, and lens advice the wildlife guides swear by.',
  19: 'Golden-hour light, alpine peaks, and a rig parked exactly where you need to be at sunrise. How RV travel changes outdoor photography — and the gear, location strategy, and timing tricks that turn road-trip shots into portfolio shots.',
  18: 'Free, remote, and dispersed — the kind of camping that put RVs on the road in the first place. How to find legitimate boondocking spots on public land, what to look for in private alternatives, and how to camp the rules right.',
  17: 'Six months in the South, on the move. What the snowbird life actually looks like for full-timers — the routes, the long-stay hosts, the budget math, and why the destination matters less than the rhythm of the season.',
  16: 'Frozen lines, cracked tanks, and four-figure repair bills. The full winterizing routine for any rig — antifreeze, blowouts, battery storage, and dry-storage prep — so the first warm weekend of spring isn\'t a service appointment.',
  15: 'The rules of the road that aren\'t on any sign. Quiet hours, fire rules, dog leashes, light pollution, and the small habits that separate respected RVers from the ones the campground host warns the next visitor about.',
  14: 'Fall colors, crisp air, campfire smoke. And, lately, fully booked campgrounds before Labor Day. How CurbNTurf opens up private vineyards, farms, and quiet acreage for the season when the leaves turn and the routes flow easier.',
  13: 'Harvest Hosts has spent the past few years buying up its competition. What that means for current members — price changes, network shifts, and feature gaps — plus a clear-eyed look at where the platform is heading next.',
  12: 'Renting an RV before you commit to buying is one of the smartest tests in the hobby. The real pros — flexibility, lower cost of entry — and the real cons — fuel, size constraints, mileage caps — and how to decide if it fits.',
  11: 'Tailgate with a kitchen, queen bed, and clean bathroom thirty feet from the parking lot. How RVers turn game-day weekends into something that beats every parking-lot grill — and the planning, hookups, and rules that make it work.',
  10: 'Wi-Fi that holds, mornings that hit different, and the same job — just done from the road. How digital nomads are mixing remote work with RV travel: power, signal, routing, and the host stays built around long-term Wi-Fi.',
  9:  'Farms have land, RVers want quiet, and the two needs line up better than any conventional campground. Why agribusiness owners are well-positioned to host RVers, what it adds to the operation, and what guests actually look for.',
  8:  'Twenty-two pieces of gear that pull weight on every trip. From power management to leveling, safety, and the little kitchen upgrades that change everything — a no-fluff accessory list for RVers who don\'t want to test gear on the road.',
  7:  'Tire failures, propane leaks, weather you didn\'t see coming. The safety checks, gear, and habits that separate prepared RVers from the ones telling rescue-call stories — pre-trip, on the road, and at the campsite.',
  6:  'Day three of the CurbNTurf RV Convention 2024. Speaker recaps from Nathan Gwilliam on podcasting and storytelling, plus the full lineup — the talks, the takeaways, and the people building the next chapter of the RV life.',
  5:  'Day two of the CurbNTurf RV Convention 2024. Speaker recaps including Rose and Glynn Willard on building a full-time mobile career — plus the rest of the Day 2 lineup, the talks, and the notes from the road-warriors who showed up.',
  4:  'Day one of the CurbNTurf RV Convention 2024. Speaker recaps including Patrick Buchanan of RV Life on partnerships and platform-building — plus the full Day 1 lineup, the talks, and the founders who shaped the program.',
  3:  'Long miles, new smells, and a dog that\'s never set foot in a national forest. The pre-trip prep, in-rig setup, and campground etiquette that make RV travel with pets actually relaxing — for the pets and the people.',
  2:  'The Pacific Coast Highway, Grand Canyon, Yellowstone, the Smokies, and Acadia. Five RV destinations that pull families back trip after trip — plus the stay, route, and timing notes that make each one work.',
  1:  'No hookups, no neighbors, no rules — just the rig and the sky. The essentials of off-grid RV boondocking: water, power, waste, navigation, and the prep that lets you stretch a week of free camping into a story you tell for years.',
};

// Distilled from the official JOMO GUIDE 2026 PDF (pages 1–13).
// Static content for the Info tab. Each section shows a summary, with the
// full guide text behind a toggle so everything is available in the app.

export type InfoSection = {
  id: string;
  title: string;
  emoji: string; // section accent, rendered as decorative
  summary: string; // always-visible one-liner
  details: { heading?: string; body: string }[]; // full guide text, behind a toggle
};

export const EMERGENCY = {
  title: 'Emergency reference',
  items: [
    { label: '112', detail: 'Ambulance · Police · Fire — life-threatening ONLY. Say: "Alversjö 8, Eksjö" (AL-vers-shuh AY-ta EX-shuh)' },
    { label: '1177', detail: 'Healthcare advice 24/7 (or +46 771 11 77 00). Hospital: Höglandssjukhuset, Eksjö' },
    { label: '+46 77 145 0450', detail: 'Pharmacy: Apoteket Lejonet, Eksjö' },
  ],
  fire: 'In case of fire: 1) Yell "Fire! Help" 2) Use your camp\'s 6 kg ABC extinguisher 3) If uncontrollable call 112 — say "Alversjö 8, Eksjö" 4) Tell Helm at HQ (barn/water tap) — Clown Police can radio them.',
  support: [
    { who: 'Sanctuary', what: 'First stop for non-life-threatening health concerns: physical & mental first aid, someone to listen. Cuts, sprains, wasp stings, feeling overwhelmed.' },
    { who: 'Clown Police', what: 'Safety concerns, disputes, non-consensual behaviour. Red noses, at least one always at HQ and on radio ("CQ").' },
    { who: 'Consent Team', what: 'On-call all hours for consent breaches. Contact the nearest Clown or go to the Sanctuary.' },
    { who: 'Escorts', what: 'Accompany you when you feel unsafe, help calm situations.' },
    { who: 'Helm', what: 'Last resort, 24/7, serious emergencies: missing child, assault, unresponsive person, fire. Reach via Clown Police, Sanctuary, Threshold or HQ.' },
    { who: 'HQ', what: 'Red wooden house by the water station — shared by Helm & Clown Police.' },
  ],
};

export const INFO_SECTIONS: InfoSection[] = [
  {
    id: 'sharing',
    title: 'About this guide',
    emoji: '💌',
    summary: '1,213 events and 314 destinations to enjoy and miss out on. The printed guide is for sharing — this app is your offline companion.',
    details: [
      { heading: 'For sharing', body: 'The printed version is NOT for personal use — share it with at least two other people, and leave it in public spaces instead of your own bag or tent. This app is the offline companion; keep it on your phone.' },
      { heading: 'Want to change the schedule?', body: 'Want to host a spontaneous workshop, or change something in the schedule? Use signs at your camp, the analogue information boards on the playa, and spread rumors (clowns love \'em).' },
      { heading: 'How it\'s sorted', body: 'Destinations are sorted by the type of their offering; events are sorted by day and starting time.' },
      { heading: 'Gifted to you by', body: 'Schoepa, Larissa, Alex, Maja, Robin, Fay, Marcus, Anuta. <3<3<3' },
    ],
  },
  {
    id: 'signs',
    title: 'Signs & inclusivity icons',
    emoji: '🚩',
    summary: 'How to read the guide: event categories, how locations are written, and the inclusivity icons on events, camps and dreams.',
    details: [
      { heading: 'Categories', body: 'Art/Installation · Food/Drinks · Care/Support · Music/Show · Games/Play · Party/Gathering · Movement/Bodywork · Workshop/Class · Weird shit/Other · Crafting/Arting · Ritual/Ceremony.' },
      { heading: 'Location', body: 'Listed as Neighborhood + grid square letter and number (e.g. "Downtown, K21"). Camps also give their own clues. Check the Map tab.' },
      { heading: 'Event icons', body: 'Little monkey = kids friendly · Big monkey = adults only · Sex positive = welcomes physical intimacy and acts of sexual expression (can also be a lecture or sharing circle on body, gender, sexuality) · Sober event · Sensory content = loud noise, flashy lights, wild tastes · Triggering themes = violence, sexual abuse, traumatic incidents · Queer-inclusive = host took real steps to make queer folks feel safe · Queer-focused = only for people who identify as queer.' },
      { heading: 'Camp & dream icons', body: 'How many people the camp/dream fits · Sober camp · Kid friendly · Adults only · Body-positive (nudity, touch, explicit discussion welcome) · Sex positive (sexual activity welcome, not necessarily at all times) · Designed for queer inclusion · Pet-friendly zone (if unmarked, it\'s pet-free) · Triggering themes · Sensory content.' },
    ],
  },
  {
    id: 'principles',
    title: 'Principles & philosophy',
    emoji: '✦',
    summary: 'The Borderland runs on Burning Man\'s 10 Principles plus an essential 11th: consent. No spectators, no money, no central boss — you\'re co-creating.',
    details: [
      { heading: 'Do-ocracy', body: 'Leadership through action. See a need? Don\'t complain — do it!' },
      { heading: 'Participation', body: 'A participatory event. No spectators, only collaborators.' },
      { heading: 'Membership', body: 'Not a ticket — you\'re co-creating, not attending.' },
      { heading: 'Gifting', body: 'No money or bartering at the Borderland. Give freely — no strings attached.' },
      { heading: 'Decentralization', body: 'No central production team. Community-driven roles (called "realities") keep the Borderland running.' },
    ],
  },
  {
    id: 'lingo',
    title: 'Lingo & culture',
    emoji: '💬',
    summary: 'The words you\'ll hear around the fire — and what they mean.',
    details: [
      { heading: 'Build', body: 'Pre-event days when infrastructure (power, toilets, etc.) is set up. Please help!' },
      { heading: 'Strike', body: 'Removing everything post-event. Yes, everything.' },
      { heading: 'Realities', body: 'The roles that keep Borderland running (water, toilets, power, etc.). Join in!' },
      { heading: 'Helm', body: 'Sober designated head of operations during the Borderland.' },
      { heading: 'Clown Police', body: 'Friendly, sober Borderlings who roam Alversjö offering a listening ear and a helping hand — not rangers, not pros, just proactive participants.' },
      { heading: 'The Sanctuary / The Threshold', body: 'The Sanctuary is medical & psychological care. The Threshold is the gate.' },
      { heading: 'Decompression', body: 'Post-burn gathering to process & integrate the experience.' },
      { heading: 'Dreams', body: 'Workshops, art and events created by participants.' },
      { heading: 'Main Stage', body: 'HA, got you! There isn\'t one — this isn\'t a festival.' },
      { heading: 'BYOC', body: 'Bring your own cup, so people can gift you delicious drinks!' },
      { heading: 'Virgin', body: 'First-timer at a burn.' },
      { heading: 'Sparkle pony', body: 'Someone who shows up, shines, and disappears without contributing. Don\'t be that pony.' },
    ],
  },
  {
    id: 'consent',
    title: 'Consent culture',
    emoji: '🖤',
    summary: 'Borderland is a consent culture. Check in before you touch — every time, every body. Consent is real only when it\'s enthusiastic and sober enough to mean it.',
    details: [
      { heading: 'FRIES', body: 'Consent should be Freely given · Reversible · Informed · Enthusiastic · Specific. An easy way to remember what consent should look like, as opposed to an automatic reaction, an attempt to be polite, or a freeze/fawn response.' },
      { heading: 'Touch', body: 'Just because you hugged someone yesterday doesn\'t mean you can surprise them with a hug today. "Surprise contact" isn\'t always wanted.' },
      { heading: 'Sex', body: 'Consent can be revoked once it\'s been given.' },
      { heading: 'Kink', body: 'Consent for one thing isn\'t consent for another. If I said you can spank me, that doesn\'t permit you to grope me.' },
      { heading: 'Gifts', body: 'Disclose what is in your gifts, even if it\'s just essential oils. Some people have sensitivities or allergies.' },
      { heading: 'Food', body: 'Disclose the ingredients — one person\'s innocuous ingredient can be someone else\'s allergy.' },
      { heading: 'Photos & video', body: 'Ask before recording or taking pictures. Ask again to share. Ask explicitly again for commercial use.' },
      { heading: 'Need support after an incident?', body: 'Clown Police (general support, first stop) · Sanctuary (medical or psychological care) · BCT drop boxes, visibly placed across the site: Sanctuary, HQ, Penta Plaza, and the bridge between Downtown & Bison North.' },
    ],
  },
  {
    id: 'respect',
    title: 'Respect the hosts',
    emoji: '🙏',
    summary: 'Someone spent months building what you walked into; someone\'s on shift right now, missing the party so you can be safe inside it. The kindest thing you can do is make their job easy.',
    details: [
      { heading: 'Respect the roles', body: 'If a consent angel declines your entry to a playspace, or asks you to leave — please go. No negotiation, no explanations. Their job is to keep the space safe for everyone, and arguing makes it harder. Same goes for Clown Police and anyone else holding a role — they\'re gifting their time so yours can be beautiful.' },
      { heading: 'Dance floor etiquette', body: 'The dance floor is a sanctuary — some people are there to connect, some are deep in their own world, and both are equally valid. Before you tap a shoulder, make eye contact, or dance close, read the room: is this person looking outward, inviting connection? Or eyes-closed, turned inward, somewhere else entirely? If it\'s the latter — leave them there. You can always connect at the edges, over tea, or when someone clearly surfaces and looks around. The music will still be there.' },
    ],
  },
  {
    id: 'safety',
    title: 'Safety & first aid',
    emoji: '🦺',
    summary: 'Come prepared to be responsible for your own survival. Prioritize sleep, eat and drink enough — basic needs matter more than we think.',
    details: [
      { heading: 'Emergency', body: 'Emergency phone number in Sweden is 112 — ask Helm for aid. See the Emergency reference above.' },
      { heading: 'Personal safety', body: 'The Borderland can be a challenging environment; come prepared to be responsible for your own survival, including knowing your own limits with e.g. intoxicants. Stay home if you\'re sick.' },
      { heading: 'Ticks', body: 'There are a lot of ticks at Alversjö. They can carry Borrelia/Lyme disease and, less commonly, TBE (tick-borne encephalitis). Remove any tick within 24 hours — if infected you can get antibiotics from your doctor at home. Check daily even if you\'re careful.' },
      { heading: 'Who to ask for help', body: 'Clown Police (red noses) for safety concerns, disputes, or a calm pair of hands — at least one always at HQ and on radio. The Sanctuary for your body, mind and psyche. The Consent Team, on-call all hours for consent breaches. Escorts accompany you when you feel unsafe. Helm is the last resort for serious emergencies (missing child, assault, unresponsive person, death, fire, disease outbreak) — reach via Clown Police.' },
    ],
  },
  {
    id: 'gate',
    title: 'Gate, vehicles & wristbands',
    emoji: '🚐',
    summary: 'Vehicle use on site is heavily restricted. Wear your wristband at all times — Borderland is a members-only event under Swedish law.',
    details: [
      { heading: 'Vehicles', body: 'Vehicle use on site is heavily restricted. All vehicles on site and in long-term parking must display a Borderland Car Identity Card in the window. Long-term parking next to the entrance is accessible at all times.' },
      { heading: 'Threshold opening hours', body: 'From Wednesday, an additional security gate is in place near road 40 — it won\'t be locked, but please close it behind you. If you\'re sleeping in your vehicle you can enter when the gate is open, 09–22h daily, one entry only — no grocery runs; your vehicle stays parked until you leave. Locked 22–09h, no entries or exits. All gates open for exodus Sunday 26 July at 06:00.' },
      { heading: 'On-site driving', body: 'Never stop or park on a fire road. Speed limit is 10 km/h at all times. Do not drive when intoxicated or too tired.' },
      { heading: 'Wristbands', body: 'Every participant must wear a wristband at all times. Anyone found without one will be escorted to the gate. Borderland is treated as a members-only event by Swedish authorities — only members are permitted. Alert the Clown Police if you need help with trespassers.' },
    ],
  },
  {
    id: 'nature',
    title: 'Nature, lakes & cows',
    emoji: '🐄',
    summary: 'Swim in the lakes, but leave no trace — and absolutely no glitter, feathers, sequins or anything loose that sparkles. A single piece of tin can kill a cow.',
    details: [
      { heading: 'The lakes', body: 'You can swim! With several thousand of us, we need to leave no trace. No soap, shampoo, conditioner or lotion in the water — not even eco-friendly. Rinse off sunscreen and makeup before you swim. Don\'t dive — it looks deep, but there are big rocks and pointy sticks just below the surface. The lake is home to birds, insects and other creatures — be kind to your hosts, and look out for each other in the water.' },
      { heading: 'Nature reserve', body: 'Camps and structures are only permitted on our land — not in the surrounding nature reserve (a few exceptions are made for Dreams in advance, with the County Administrative Board / Länsstyrelsen).' },
      { heading: 'The cows, glitter & tinsel', body: 'Right after we leave, a collective of cows comes back, and they\'re extremely sensitive to eating anything shiny — a single piece of tin can kill a cow, and microplastics are now illegal under Swedish law. So: absolutely NO glitter (yes, including biodegradable), NO feathers, NO sequins, NO rhinestones, NO tinsels for deco — and nothing else from your outfit that sheds, falls off, or escapes into the wild. If it sparkles and it\'s loose — leave it at home.' },
      { heading: 'Pets', body: 'Keep the name tag on your pet so we can reunite lost ones. Dogs must be on a leash at all times, including in the lakes. 24/7 pet-free places: dancefloors, play spaces, and the effigy burn. Individual camps and workshops decide their own pet policy. Found a pet in distress? Contact Clown Police. A loose pet without its owner? Bring it to HQ.' },
    ],
  },
  {
    id: 'trash',
    title: 'Trash & LNT station',
    emoji: '♻️',
    summary: 'Set up an LNT trash station in your camp. Transparent bags only so we can see what\'s inside — and don\'t mix waste.',
    details: [
      { heading: 'How to sort', body: 'Paper packaging & tetra pak (juice, milk, plant drink) + cardboard · Plastic (hard and soft) · Wood (clean/painted kept separate from pressure-impregnated) · Metal scraps, screws, nails, cleaned cans · Glass (transparent and coloured, emptied first) · Bio/food waste in the provided compostable paper bags only · Residual/general waste for whatever doesn\'t fit above (but no bulky stuff like mattresses, furniture, carpets or art installations).' },
      { heading: 'Empty the bags', body: 'Empty out waste bags before throwing stuff in the container, then throw the plastic bag in the plastic container — or better, reuse it. Respect opening hours and don\'t leave waste on the ground for someone else.' },
      { heading: 'Not welcome at LNT (bring it home)', body: 'Camp structures (sofas, tables, tents, mattresses), toxic waste (electronics, batteries, chemicals), and pant (deposit cans & bottles). Refundables from Denmark and Sweden go home with you.' },
      { heading: 'Container station hours', body: 'Manned Monday–Saturday 13:00–17:00, and Strike Sunday 12:00–16:00. Bring waste during the week so Sunday isn\'t a mountain of it.' },
    ],
  },
  {
    id: 'strike',
    title: 'Strike (teardown)',
    emoji: '🎪',
    summary: 'Strike is how Borderland gently dissolves back into the land — a communal effort. Pitching in is a great way to contribute. If you\'d rather a chill one, you\'re kindly asked to leave on Sunday.',
    details: [
      { heading: 'What is Strike', body: 'A communal effort to return the land to itself. Borderlings staying for strike move their sleeping device to Sunny Hills (unless another solution is communicated with the Strike lead). You\'ll be fed by communal breakfast & dinner while the land slowly returns to itself — often experienced as another level of connection with the community.' },
      { heading: 'Strike schedule', body: 'Sunday 26th — 12:00 power goes off; 14:00 camps without bigger dream structures need to be gone; 17:00 communal MOOP-sweep. Monday–Wednesday 27–29th — 10:00 strike meeting at the barn; sign up at REA or appear spontaneously.' },
      { heading: 'Decompression', body: 'Strike is a way of decomp. As infrastructure (like toilets) is removed, the land has limited capacity, reserved for people contributing to the strike. If you\'d rather a chill decompression, you\'re kindly asked to leave on Sunday.' },
      { heading: 'MOOP', body: 'When you see MOOP, pick it up and bring it to your camp recycling station. MOOP-sweeps are group line-searches covering all the land so it\'s completely MOOP-free before we hand it to the farmers.' },
      { heading: 'Striking your dreams', body: 'Bigger dream structures that can\'t be done by Sunday 14:00 are encouraged to communicate with strike lead Artur Rodrigues. Communication is our human power tool to avoid friction, misunderstanding & conflicts.' },
      { heading: 'Gifting to the land', body: 'Want to gift useful stuff? Talk to the info person at the barn during strike — you need approval before leaving anything. Dry/canned storable food, genuinely-fresh food, and household consumables (toilet paper, hand & dish soap) are welcome in the marked spot.' },
      { heading: 'Vehicle logistics', body: 'During packing there\'ll be lots of vehicles and machines moving. Give big machines right of way. Do not stop or park at any roads or work area (not even shortly). The gravel area in the southwest corner of Missing Piece and the container park need to be cleared for machines at all times.' },
    ],
  },
  {
    id: 'synchronicity',
    title: 'Synchronicity',
    emoji: '🌀',
    summary: 'Stop chasing workshops and unlock the synchronicities that lead you to the moments you\'re meant to have. Wherever you are is exactly where you\'re meant to be.',
    details: [
      { heading: 'The invitation', body: 'As you fully lean into THIS moment, magic and meaning present themselves, and you start to see synchronicities that would have passed you by unnoticed had you been rushing to the next thing. Your present moment will always be the most important event to attend.' },
      { heading: 'Your inner compass', body: 'The Universe doesn\'t give you what you want — it gives you back who you are, or what you need to learn to become who you\'re meant to be. When your actions are truly derived from your inner truth, the world around you starts to match your inside.' },
      { heading: 'Synchronicity (noun)', body: '1) The meaningful coincidence of two or more events with no discernible causal connection, but whose occurrence together has significance to the person experiencing them. 2) A regularly occurring phenomenon at The Borderland; bringing people together, planting insights, and turning the most rational minds into spiritual.' },
      { body: 'Pick your favourites to visit, but be prepared for synchronicity to take over — don\'t follow your plans too hard. Happy missing out! 🙌' },
    ],
  },
];

// Official map anchors (approx grid positions read off the guide's map pages).
export const PLAZAS: { name: string; grid: string }[] = [
  { name: 'Pamper plaza', grid: 'Q6' },
  { name: 'Penta plaza', grid: 'M11' },
  { name: 'Bayt-al-Noor plaza', grid: 'O10' },
  { name: 'Snacktown plaza', grid: 'P10' },
  { name: 'Lowlands plaza', grid: 'Q12' },
  { name: 'Fire plaza', grid: 'T17' },
  { name: 'Earth plaza', grid: 'S19' },
  { name: 'Water plaza', grid: 'Q18' },
  { name: 'Cuddle plaza', grid: 'Q21' },
  { name: 'Sunset plaza', grid: 'O22' },
  { name: 'Shameless plaza', grid: 'N21' },
  { name: "Captain's plaza", grid: 'K23' },
  { name: 'Lakeside plaza', grid: 'H21' },
];

export type Place = {
  name: string;
  grid: string;
  kind: 'building' | 'facility' | 'safety';
  icon?: 'info' | 'toilet' | 'trash' | 'water';
};

export const PLACES: Place[] = [
  { name: 'The Villa', grid: 'K14', kind: 'building' },
  { name: 'The Barn', grid: 'L19', kind: 'building' },
  { name: 'The Machinehall', grid: 'M19', kind: 'building' },
  { name: 'HQ (Clowns, Helm)', grid: 'K20', kind: 'safety' },
  { name: 'Sanctuary', grid: 'K13', kind: 'safety' },
  { name: 'Threshold (gate)', grid: 'L4', kind: 'building' },
  { name: 'Infopoint WTF', grid: 'M20', kind: 'facility', icon: 'info' },
  { name: 'Water', grid: 'L21', kind: 'facility', icon: 'water' },
  { name: 'Toilet G7', grid: 'G7', kind: 'facility', icon: 'toilet' },
  { name: 'Toilet M6', grid: 'M6', kind: 'facility', icon: 'toilet' },
  { name: 'Toilet P8', grid: 'P8', kind: 'facility', icon: 'toilet' },
  { name: 'Toilet M14', grid: 'M14', kind: 'facility', icon: 'toilet' },
  { name: 'Toilet O19', grid: 'O19', kind: 'facility', icon: 'toilet' },
  { name: 'Toilet N21', grid: 'N21', kind: 'facility', icon: 'toilet' },
  { name: 'Toilet R21', grid: 'R21', kind: 'facility', icon: 'toilet' },
  { name: 'Trash containers', grid: 'L15', kind: 'facility', icon: 'trash' },
];

export const MAP_META = {
  note: 'Each square is 50×50 m. The map is rotated 11° anti-clockwise. Some happenings float free of the grid.',
  consentDropboxes: 'Consent dropboxes & report forms at: Sanctuary, HQ, Penta Plaza, and the bridge between Downtown & Bison North.',
};

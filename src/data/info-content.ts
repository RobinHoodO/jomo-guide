// Transcribed verbatim from the official JOMO GUIDE 2026 PDF (pages 1–13).
// Static content for the Info tab. Each section shows a summary, with the
// full guide text behind a toggle so everything is available in the app.
// Text is kept word-for-word as printed in the guide.

export type InfoSection = {
  id: string;
  title: string;
  emoji: string; // section accent, rendered as decorative
  summary: string; // always-visible one-liner (verbatim guide lead line)
  details: { heading?: string; body?: string }[]; // full guide text, behind a toggle
};

export const EMERGENCY = {
  title: 'Emergency reference',
  items: [
    { label: '112', detail: 'Ambulance, Police, Fire Brigade — LIFE-THREATENING EMERGENCIES ONLY. Say: "Alversjö 8, Eksjö" (AL-vers-shuh AY-ta EX-shuh)' },
    { label: '1177', detail: 'Hospital: Höglandssjukhuset, Eksjö and for Healthcare advice 24/7 (free from Sweden). Or call +46 771 11 77 00.' },
    { label: '+46 77 145 0450', detail: 'Pharmacy: Apoteket Lejonet, Eksjö' },
  ],
  fire: 'In case of fire: 1. Yell "Fire! Help" 2. Use your camp\'s 6 kg ABC extinguisher 3. If uncontrollable: call 112 — say "Alversjö 8, Eksjö" 4. Tell Helm at HQ (barn/water tap) — Clown Police can radio them immediately.',
  support: [
    { who: 'Sanctuary', what: 'Your first stop for non-life-threatening health concerns. Physical and mental first aid; someone to listen; help accessing additional support. For example: cuts, sprains, wasp stings, or feeling overwhelmed.' },
    { who: 'Clown Police', what: 'Helps with safety concerns. Supports disputes and non-consensual behaviour; shares safety information; helps you access emergency services. Find them on site (red noses) or at HQ. Radio: "CQ".' },
    { who: 'Escorts', what: 'Helps if you feel unsafe. Accompanies you when you feel unsafe; helps calm situations; supports other safety teams.' },
    { who: 'Helm (Last Resort)', what: 'On call 24/7 for serious emergencies. Steps in when other teams have reached their limits; coordinates the response; makes final decisions when needed. Contact via Clown Police, Sanctuary, Threshold, or HQ.' },
    { who: 'HQ: Red Wooden House', what: 'By the water station — shared by Helm & Clown Police.' },
  ],
};

export const INFO_SECTIONS: InfoSection[] = [
  {
    id: 'sharing',
    title: 'The Joy of Missing Out',
    emoji: '💌',
    summary: 'It\'s not easy to herd cats, but we did it for you! In this guide we gathered 1213 events and 314 destinations that you can enjoy on the playa and miss out on.',
    details: [
      { heading: 'This guide is for sharing', body: 'This printed version is NOT for personal use. Share this guide with at least two other people, and leave it in public spaces instead of your own bag or tent.' },
      { heading: 'Change the schedule', body: 'Want to host a spontaneous workshop? Or you want to make a change in the following schedule? Use signs at your camp, the analogue information boards on the playa, and spread rumors! (clowns love\'em)' },
      { heading: 'How it\'s sorted', body: 'Destinations are sorted by type of their offering, events are sorted by day and starting time of the event. Pick your favourites to visit, but be prepared for syncronicity to take over and don\'t try to follow your plans too hard! Happy missing out.' },
      { heading: 'Gifted to you by', body: 'JOMO-guide 2026 is gifted to you by: Schoepa, Larissa, Alex, Maja, Robin, Fay, Marcus, Anuta <3<3<3<3<3<3<3<3' },
    ],
  },
  {
    id: 'signs',
    title: 'Signs & instructions',
    emoji: '🚩',
    summary: 'Event and camps/dreams categories, how locations are written, and the inclusivity icons.',
    details: [
      { heading: 'Event and camps/dreams categories' },
      { heading: 'Location', body: 'This year, you\'ll find both the camps\' own clues and extra help from our placement map—listed as: Neighborhood + grid square letter and number. Check out the map!' },
      { heading: 'Inclusivity icons for events' },
      { heading: 'Inclusivity icons for camps and dreams' },
    ],
  },
  {
    id: 'principles',
    title: 'Principles & Philosophy',
    emoji: '✦',
    summary: '10+1 Principles: the Borderland is guided by Burning Man\'s 10 Principles plus an essential 11th: consent.',
    details: [
      { heading: 'Do-ocracy', body: 'Leadership through action. See a need? Don\'t complain — do it!' },
      { heading: 'Decentralization', body: 'No central production team. Community-driven roles (called realities) keep the Borderland running.' },
      { heading: 'Participatory event', body: 'No spectators, only collaborators.' },
      { heading: 'Membership', body: 'Not a ticket — you\'re co-creating, not attending.' },
      { heading: 'Gifting', body: 'No money or bartering at the Borderland. Give freely — no strings attached.' },
    ],
  },
  {
    id: 'lingo',
    title: 'Lingo',
    emoji: '💬',
    summary: 'The words you\'ll hear around the Borderland — making it happen, and the creative culture.',
    details: [
      { heading: 'Build', body: 'Pre-event days when infrastructure (power, toilets, etc.) is set up. Please help!' },
      { heading: 'Strike', body: 'Removing everything post-event. Yes, everything.' },
      { heading: 'Realities', body: 'The roles that keep Borderland running (water, toilets, power, etc.). Join in!' },
      { heading: 'Helm', body: 'Sober designated head of operations during the Borderland.' },
      { heading: 'Clown Police', body: 'Friendly, sober Borderlings who roam Alversjö offering a listening ear and a helping hand — not rangers, not pros, just proactive participants.' },
      { heading: 'The Sanctuary / The Threshold', body: 'The Sanctuary: Medical/psychological care. The Threshold: Gate.' },
      { heading: 'Decompression', body: 'Post-burn gathering to process & integrate the experience.' },
      { heading: 'Dreams', body: 'Workshops, art, and events created by participants.' },
      { heading: 'Main Stage', body: 'HA got you! There isn\'t one - this isn\'t a festival.' },
      { heading: 'BYOC', body: 'Bring your own cup, so people can gift you delicious drinks!' },
      { heading: 'Virgin', body: 'First timer at a burn.' },
      { heading: 'Sparkle pony', body: 'Someone who shows up, shines, and disappears without contributing. Don\'t be that pony.' },
    ],
  },
  {
    id: 'leave-it-better',
    title: 'Leave it Better',
    emoji: '🌱',
    summary: 'LNT, LBT and MOOP — how we hand the land back better than we found it.',
    details: [
      { heading: 'LNT (Leave No Trace)', body: 'After Borderland, no one should be able to tell we were there. Take everything you brought (including trash) back with you. Pick up litter if you see it. Be mindful of MOOP-ey stuff like feathers, sequins, cigarette butts non-biodegradable glitter/soap/toothpaste.' },
      { heading: 'LBT (Leave a Better Trace)', body: 'We now have our own land — so we can build things that last. Some art and infrastructure may stay for future use. Let\'s leave it better than we found it.' },
      { heading: 'MOOP (Matter Out of Place)', body: 'Anything that doesn\'t belong — trash, glitter, cigarette butts or rogue tent pegs. If you drop it, pick it up. If you see it, grab it.' },
    ],
  },
  {
    id: 'consent',
    title: 'Consent & Borderland',
    emoji: '🖤',
    summary: 'Borderland is a consent culture. Check in before you touch – every time, every body. Consent is real only when it\'s enthusiastic and sober enough to mean it.',
    details: [
      { body: 'We believe consent encompasses many aspects of our interactions:' },
      { heading: 'Touch', body: 'Just because you hugged someone yesterday doesn\'t mean you can surprise them with a hug today. "Surprise contact" isn\'t always wanted.' },
      { heading: 'Sex', body: 'Consent can be revoked once it\'s been given.' },
      { heading: 'Kink', body: 'Consent for one thing isn\'t consent for another. If I said you can spank me, that doesn\'t permit you to grope me.' },
      { heading: 'Gifts', body: 'Disclose what is in your gifts, even if it\'s just essential oils. Some people have sensitivities or allergies.' },
      { heading: 'Food', body: 'Disclose the ingredients, as one person\'s innocuous ingredient can be someone else\'s allergy.' },
      { heading: 'Photos & Video', body: 'Ask before recording or taking pictures. Ask again to share. Ask explicitly again for a commercial use.' },
      { heading: 'Consent FRIES', body: 'Freely Given · Reversible · Informed · Enthusiastic · Specific. FRIES is an easy way to remember what consent ideally should look like, as opposed to an automatic reaction, attempt to be polite, or other freeze/fawn responses.' },
      { heading: 'Need support after an incident?', body: 'Clown Police — general support, first stop. Sanctuary — medical or psychological care. BCT Drop Boxes — visibly placed across the site (see box locations on map).' },
    ],
  },
  {
    id: 'respect',
    title: 'Respect',
    emoji: '🙏',
    summary: 'The camps, the playspaces, the late-night magic — none of it runs itself. Someone spent months building what you walked into. Someone is on shift right now, missing the party, so you can be safe inside it.',
    details: [
      { heading: 'Respect the hosts', body: 'If a consent angel declines your entry to a playspace, or asks you to leave — please go. No negotiation, no explanations. Their job is to keep the space safe for everyone, and arguing makes it harder. Same goes for Clown Police and anyone else holding a role. They\'re gifting their time so yours can be beautiful. The kindest thing you can do is make their job easy.' },
      { heading: 'Dance floor etiquette', body: 'The dance floor is a sanctuary — some people are there to connect, some are deep in their own world, and both are equally valid. Before you tap someone on the shoulder, make eye contact, or start dancing close to someone, read the room: Is this person looking outward, making eye contact, inviting connection? Or are they eyes-closed, turned inward, somewhere else entirely? If it\'s the latter — leave them there. Let them have it. Last year, unwanted contact and conversation on the dance floor pulled a lot of people out of moments they\'d been waiting all year for. You can always connect at the edges, over tea, or when someone clearly surfaces and looks around. The music will still be there.' },
    ],
  },
  {
    id: 'safety',
    title: 'Safety',
    emoji: '🦺',
    summary: 'The Borderland can be a challenging environment; come prepared to be responsible for your own survival.',
    details: [
      { heading: 'Emergency and first aid', body: 'Emergency phone number in Sweden: 112 Ask HELM for aid — see more on the Emergency Reference page in this guide.' },
      { heading: 'Personal safety', body: 'The Borderland can be a challenging environment; come prepared to be responsible for your own survival, including knowing your own limits with e.g intoxicants. Stay at home if you are sick. Prioritize sleep, eat and drink enough, basic needs are more important than we think.' },
      { heading: 'Ticks', body: 'There are a lot of ticks at Alversjö. They can carry a bacteria (Borrelia/Lyme disease) and/or a less common virus (TBE: Tick-borne encephalitis). Remove the tick within 24 hours. If infected you can get antibiotics from your local doctor when you come home. Check daily even if you are careful and try to avoid ticks, you can get bitten.' },
      { heading: 'People you can ask for help at any time', body: 'The Clown Police (look for red noses) are your first call for safety concerns, disputes, or any situation that needs a calm pair of hands. At least one is always at HQ and on radio. The Consent Team is on-call all-hour for consent breaches. Contact the nearest Clown or go to the Sanctuary — they will reach the Consent Team. Escorts can accompany someone who feels unsafe or support de-escalation when a situation is unclear. They work alongside Clown Police, Sanctuary, and Helm. The Sanctuary is the place for your body, mind and psyche. Come for a warm cup of tea, a chat, someone who listens, or support getting more professional help. Find their tent on site. Helm is the last resort for serious emergencies: missing child, assault, unresponsive person, death, fire, disease outbreak. Reach via Clown Police.' },
    ],
  },
  {
    id: 'gate',
    title: 'Gate',
    emoji: '🚐',
    summary: 'Vehicle use on site is heavily restricted, because hippies are soft and cuddly and we don\'t want you to die.',
    details: [
      { heading: 'Vehicles at Borderland', body: 'All vehicles on site and in long-term parking must display a Borderland Car Identity Card in the window (check your membership site). This is for safety – if an emergency involves your vehicle, we need to be able to reach you. Long-term parking next to the entrance is accessible at all times.' },
      { heading: 'Threshold opening hours', body: 'From Wednesday, an additional security gate will be in place near road 40: it won\'t be locked, but please close it behind you. If you\'re sleeping in your vehicle, you can enter when the gate is open: 09-22h daily. One entry only – no grocery runs. Your vehicle stays parked until you leave the event. The gate is locked 22-09h, no entries or exits during those hours. All gates opens for exodus Sunday 26 July at 06.' },
      { heading: 'On-site driving', body: 'Never stop or park on a fire road. Speed limit is 10 km/h at all times. Do not drive when intoxicated or too tired.' },
      { heading: 'Wristbands are everyone\'s own responsibility', body: 'Every participant must wear a wristband at all times. Anyone found without one will be escorted to the gate by the Clown Police or fellow burners – either to get their wristband sorted or to leave the site. Borderland is treated as a members-only event by Swedish authorities. We all need to make sure it keeps that way. For legal reasons and the safety of everyone on site, only members are permitted at Borderland. Alert the Clown Police if you need help with trespassers.' },
    ],
  },
  {
    id: 'nature',
    title: 'Nature',
    emoji: '🐄',
    summary: 'You can swim in the lakes. Yay! With several thousand of us, though, we need to leave no trace.',
    details: [
      { heading: 'The lakes in Alversjö', body: 'The lake is home to birds, insects and other creatures — we\'re visitors here, so be kind to your hosts. Look out for each other in the water too. No soap, shampoo, conditioner or lotion in the water — not even eco-friendly. Rinse off sunscreen and makeup before you swim. Don\'t dive. It looks deep, but there are big rocks and pointy sticks lurking just below the surface.' },
      { heading: 'Surrounded by a nature reserve', body: 'Camps and structures are only permitted on our land - not in the reserve. A few exceptions have been made for Dreams in advance, collaborating with the County Administrative Board (Länsstyrelsen), who manages the reserve.' },
      { heading: 'The cows and the glitter & tinsels', body: 'Right after we leave Alversjö, a collective of cows comes back, and they are really really sensitive to eating anything shiny. A single piece of tin can kill a cow. Microplastics are now illegal under Swedish law. And this land is surrounded by a protected nature reserve that we want to keep coming back to. So: absolutely NO glitter (yes, including biodegradable), NO feathers, NO sequins, NO rhinestones, NO tinsels for deco, and nothing else from your outfit that sheds, falls off, or escapes into the wild. If it sparkles and it\'s loose — leave it at home.' },
      { heading: 'Pets at Borderland', body: 'We love that you want to bring your pet friends - just make sure you keep the name tag. This helps us reunite lost pets with their humans. Dogs must be on a leash at all times, including in the lakes. 24/7 pet-free places: dancefloors, play spaces, and the effigy burn. Individual camps and workshops decide their own pet policy - check the JOMO-guide. If you find a pet in distress, contact Clown Police. A loose pet without its owner? Please bring it to Headquarters.' },
    ],
  },
  {
    id: 'trash',
    title: 'Trash',
    emoji: '♻️',
    summary: 'Set up a LNT trash station in your camp and sort in accordance with the guidelines in transparent waste bags only so we can see what\'s in them. Don\'t mix waste — you\'ll have a hell of a time un-mixing when you get to the containers.',
    details: [
      { heading: 'How to sort', body: 'Paper packaging and tetra pack (juice, milk, plant drink etc.) + cardboard (corrugated and not corrugated). Plastic — both hard and soft. Wood — clean and with paint and lacquer / varnish; Wood — pressure impregnated. Metal scraps, screws and nails. Cleaned food cans, beer cans and soda cans. Refundables from Denmark and Sweden go home with you. Transparent glass — empty out the bottle / jar beforehand; Coloured glass — empty out the bottle / jar beforehand. Bio / Food waste — in the provided compostable paper bags only. At the LNT waste container station you can pick up a stack. Residual / General waste — whatever doesn\'t fit in one of the above categories — but NO bulky stuff you just wanna get rid of like e.g. mattresses, furniture, carpets, art installations.' },
      { heading: 'Empty the bags', body: 'Empty out the waste bags before throwing stuff in the container. Then throw the plastic waste bag in the container for plastic — or even better: reuse it. Please respect opening hours and don\'t leave your waste on the ground for someone else to deal with.' },
      { heading: 'NOT welcome at LNT (bring it with you when leaving)', body: 'Camp structures (sofas, tables, tents, mattresses, etc.). Toxic waste (electronics, batteries, chemicals, etc.). Pant (deposit cans & bottles).' },
      { heading: 'The container station is manned', body: 'Monday to Saturday: from 13:00 to 17:00. Strike Sunday: from 12:00 to 16:00. Bring your waste to the container station during the week so we don\'t receive a mountain of waste on Sunday (strike).' },
    ],
  },
  {
    id: 'strike',
    title: 'Strike',
    emoji: '🎪',
    summary: 'Strike is how Borderland gently dissolves back into the all-year-round Alversjö land, a communal effort.',
    details: [
      { heading: 'What is Strike?', body: 'Pitching in on strike and respecting the strike guidelines is great way to contribute and to make the whole wind-down smoother for every exhausted Borderling. Dreams and reality strike will go on until we are finished: the more people joining early strike days, the more we support our great strike heroes working until the end is reached. Borderlings staying for strike move their sleeping device to Sunny Hills unless another solution is communicated with Strike lead. And yes, you\'ll be fed by communal breakfast & dinner, watered and surrounded by gorgeous company while the land slowly returns to itself. Strike is often experienced as another level of connection with the community making the magic Borderland happen.' },
      { heading: 'Strike schedule', body: 'Sunday 26th — 12.00 Power goes off. 14.00 Camps without bigger dream structures need to been gone. Sunday shifts to be signed up at REA (or show up on site): 12.00 DoET Power rolling cables; 17.00 Communal MOOP-sweep. Monday, Tuesday, Wednesday 27-29th — 10.00 Strike meeting at the barn. Sign up at REA or appear spontaneously. Reality leads present their work&needs for the day. More info on site.' },
      { heading: 'Decompression', body: 'Strike is a way of decomp. If you rather prefer a chill one, you are kindly asked to leave the land on Sunday. As the Borderland infrastructure (like toilets) is removed, the land has a limited capacity of hosting people which is reserved to people contributing to the strike. Also, MOOP-sweeps with a lot of camps staying on the fields are very unsmooth. Your contribution to a smooth strike counts.' },
      { heading: 'Striking your dreams', body: 'Bigger dream structures that are not able to be done at Sunday 14.00 are kindly encouraged to communicate with strike lead Artur Rodrigues. Communication is our human power tool to avoid friction, misunderstanding & conflicts.' },
      { heading: 'Striking more then your camp', body: 'You can support your local reality service by striking fire roads & electric cables around your camp (or elsewhere). Fire roads: the plastic bands goes into plastic recycling and the sticks are collected into piles at the fields to be picked up by the fire road team. Cables: roll the cables and place them at the nearest PDU (power distribution unit) to be picked up by the DoET Power team.' },
      { heading: 'MOOP: Matter out of place', body: 'When you see MOOP, pick it up and bring it to your camp recycling station. During strike every little piece of MOOP around your camp should be MOOPed before you can consider your camp fully striked. The MOOP-sweeps during strike is simply group line searching covering all pieces of land making sure the land is completely MOOP-free when we are handing over the land to the farmers. MOOP-sweep shifts can be signed up at REA or by showing up at the barn Sunday 17.00 and on the Strike meetings at 10.00 Monday-Wednesday.' },
      { heading: 'Gifting', body: 'Want to gift useful stuff to the land & community? Talk to the info person at the barn during strike. You need approval before leaving anything. Food gifts for the hungry strike team are very welcome in the marked spot: Dry & canned storable food: much appreciated. Fresh food: only if it\'s genuinely still fresh. Household consumables: toilet paper, hand & dish soap etc. are also welcome.' },
      { heading: 'Vehicle Logistics', body: 'When bringing your car into the playa for packing there will be a lot of vehicles, machines & hippies moving around. Please do your best to conduct the traffic flow. Big machines need space, give them right of way. Do not stop or park at any roads or work area (not even shortly). The gravel area in the southwest corner of Missing Piece and the container park (both close to Plutonia entrance) needs to be cleared for the machines at all times.' },
    ],
  },
  {
    id: 'synchronicity',
    title: 'Synchronicity Guide',
    emoji: '🌀',
    summary: 'Stop chasing workshops in the JOMO guide and instead unlock the synchronicities that will lead you to the exact moments and meetings you\'re meant to have.',
    details: [
      { body: 'Your life can only happen where you are. Wherever you are is exactly where you\'re meant to be. As you fully lean into THIS moment, magic and meaning present themselves, and you start to see synchronicities that would have passed you by unnoticed, had you been rushing to the next thing. Your present moment will always be the most important event to attend.' },
      { body: 'The Universe doesn\'t give you what you want. It gives you back who you are, or what you need to learn in order to become who you\'re meant to be. Your Inner Compass is the instrument that will make all your synchronicities make sense. When your actions are truly derived from your inner truth, the world around you starts to match your inside.' },
      { heading: 'Synchronicity | noun', body: '1. The meaningful coincidence of two or more events, where there is no discernible causal connection, but their occurrence together have significance or meaning to the individual experiencing them. 2. A regularly occurring phenomenon at The Borderland; bringing people together, planting insights into human brains, and turning the most rational minds into spiritual!' },
    ],
  },
];

export const SIGN_EVENT_CATEGORIES = [
  'Art/Installation',
  'Food/Drinks',
  'Care/Support/Pampering',
  'Music/Performance/Show',
  'Games/Play',
  'Party/Gathering',
  'Yoga/Movement/Bodywork',
  'Workshop/Class',
  'Weird shit/Other',
  'Crafting/Pimping/Arting',
  'Ritual/Ceremony',
  'Dating',
];

export const SIGN_CAMP_CATEGORIES = [
  'Art/Installation',
  'Food/Drinks',
  'Pampering/Care',
  'Music/Show',
  'Games/Play',
  'Party/Gathering',
  'Movement/Bodywork',
  'Workshop/Class',
  'Weird shit/Other',
  'Crafting/Arting',
  'Ritual/Ceremony',
];

export const SIGN_EVENT_ICONS = [
  { icon: '🐒', meaning: 'Kids friendly' },
  { icon: '🦍', meaning: 'Adults only' },
  { icon: '🖤', meaning: 'Sex positive' },
  { icon: '😇', meaning: 'Sober' },
  { icon: '💥', meaning: 'Sensory content' },
  { icon: '🚨', meaning: 'Triggering themes' },
  { icon: '🌈', meaning: 'Queer-inclusive' },
  { icon: '🌈🌈', meaning: 'Queer-focused' },
];

export const SIGN_CAMP_ICONS = [
  { icon: '👥', meaning: 'capacity' },
  { icon: '😇', meaning: 'Sober' },
  { icon: '🐒', meaning: 'Kid friendly' },
  { icon: '🦍', meaning: 'Adults only' },
  { icon: '🍑', meaning: 'Body-positive' },
  { icon: '🖤', meaning: 'Sex positive' },
  { icon: '🌈', meaning: 'Queer inclusion' },
  { icon: '🐩', meaning: 'Pet-friendly' },
  { icon: '🚨', meaning: 'Triggering themes' },
  { icon: '💥', meaning: 'Sensory content' },
];

export type Plaza = {
  name: string;
  grid: string;
  // Measured offsets so app markers sit exactly on the artwork's printed bubbles.
  nudge?: { x: number; y: number };
};

// Official map anchors (approx grid positions read off the guide's map pages).
export const PLAZAS: Plaza[] = [
  { name: 'Pamper plaza', grid: 'Q6', nudge: { x: -18, y: 8 } },
  { name: 'Penta plaza', grid: 'M11', nudge: { x: 12, y: 9.5 } },
  { name: 'Bayt-al-Noor plaza', grid: 'O10', nudge: { x: 21, y: 7 } },
  { name: 'Snacktown plaza', grid: 'P10', nudge: { x: 26.5, y: 7 } },
  { name: 'Lowlands plaza', grid: 'Q12', nudge: { x: 17, y: -1.5 } },
  { name: 'Fire plaza', grid: 'T17', nudge: { x: -11.5, y: 3 } },
  { name: 'Earth plaza', grid: 'S19', nudge: { x: 24, y: 0.5 } },
  { name: 'Water plaza', grid: 'Q18', nudge: { x: 8, y: 7 } },
  { name: 'Cuddle plaza', grid: 'Q21', nudge: { x: 25.5, y: 8.5 } },
  { name: 'Sunset plaza', grid: 'O22', nudge: { x: -1, y: 7 } },
  { name: 'Shameless plaza', grid: 'N21', nudge: { x: 18, y: -10.5 } },
  { name: "Captain's plaza", grid: 'K23', nudge: { x: 7.5, y: -6.5 } },
  { name: 'Lakeside plaza', grid: 'H21', nudge: { x: -8, y: 7 } },
];

export type PlaceIcon = 'info' | 'toilet' | 'trash' | 'water' | 'sanctuary' | 'gate';

export type Place = {
  name: string;
  grid: string;
  // numbered = the 4 key buildings (shown as a numbered black disc, like the PDF)
  number?: number;
  icon?: PlaceIcon;
};

export const PLACES: Place[] = [
  { name: 'The Villa', grid: 'K14', number: 1 },
  { name: 'The Barn', grid: 'L19', number: 2 },
  { name: 'The Machinehall', grid: 'M19', number: 3 },
  { name: 'HQ (Clowns, Helm)', grid: 'K20', number: 4 },
  { name: 'Sanctuary', grid: 'K13', icon: 'sanctuary' },
  { name: 'Threshold (gate)', grid: 'L4', icon: 'gate' },
  { name: 'Infopoint WTF', grid: 'M20', icon: 'info' },
  { name: 'Water', grid: 'L21', icon: 'water' },
  { name: 'Toilet G7', grid: 'G7', icon: 'toilet' },
  { name: 'Toilet M6', grid: 'M6', icon: 'toilet' },
  { name: 'Toilet P8', grid: 'P8', icon: 'toilet' },
  { name: 'Toilet M14', grid: 'M14', icon: 'toilet' },
  { name: 'Toilet O19', grid: 'O19', icon: 'toilet' },
  { name: 'Toilet N21', grid: 'N21', icon: 'toilet' },
  { name: 'Toilet R21', grid: 'R21', icon: 'toilet' },
  { name: 'Trash containers', grid: 'L15', icon: 'trash' },
];

export const MAP_META = {
  note: 'Each square is 50×50 m. The map is rotated 11° anti-clockwise. Some happenings float free of the grid.',
  consentDropboxes: 'Consent dropboxes & report forms at: Sanctuary, HQ, Penta Plaza, and the bridge between Downtown & Bison North.',
};

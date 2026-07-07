// Distilled from the official JOMO GUIDE 2026 PDF (pages 1–13).
// Static content for the Info tab. Keep copy verbatim-ish but compact.

export type InfoSection = {
  id: string;
  title: string;
  emoji: string; // section accent, rendered as decorative
  blocks: { heading?: string; body: string }[];
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
    id: 'principles',
    title: 'Principles & philosophy',
    emoji: '✦',
    blocks: [
      { body: 'The Borderland runs on Burning Man\'s 10 Principles plus an essential 11th: consent.' },
      { heading: 'Do-ocracy', body: 'Leadership through action. See a need? Don\'t complain — do it!' },
      { heading: 'Participation', body: 'No spectators, only collaborators. Membership is not a ticket — you\'re co-creating, not attending.' },
      { heading: 'Gifting', body: 'No money or bartering. Give freely — no strings attached.' },
      { heading: 'Decentralization', body: 'No central production team. Community-driven roles ("realities") keep the Borderland running.' },
    ],
  },
  {
    id: 'lingo',
    title: 'Lingo',
    emoji: '💬',
    blocks: [
      { heading: 'Dreams', body: 'Workshops, art and events created by participants.' },
      { heading: 'Main Stage', body: 'HA got you! There isn\'t one — this isn\'t a festival.' },
      { heading: 'BYOC', body: 'Bring your own cup, so people can gift you delicious drinks!' },
      { heading: 'Virgin', body: 'First-timer at a burn.' },
      { heading: 'Sparkle pony', body: 'Shows up, shines, disappears without contributing. Don\'t be that pony.' },
      { heading: 'Build / Strike', body: 'Pre-event setup and post-event teardown. Yes, everything. Please help!' },
      { heading: 'MOOP', body: 'Matter Out of Place — trash, glitter, cigarette butts, rogue tent pegs. If you drop it, pick it up. If you see it, grab it.' },
      { heading: 'LNT / LBT', body: 'Leave No Trace — no one should tell we were there. Leave a Better Trace — it\'s our own land now, leave it better than we found it.' },
    ],
  },
  {
    id: 'consent',
    title: 'Consent culture',
    emoji: '🖤',
    blocks: [
      { body: 'Borderland is a consent culture. Check in before you touch — every time, every body. Consent is real only when it\'s enthusiastic and sober enough to mean it.' },
      { heading: 'FRIES', body: 'Freely given · Reversible · Informed · Enthusiastic · Specific.' },
      { heading: 'It covers more than touch', body: 'Sex (revocable once given) · kink (consent for one thing isn\'t consent for another) · gifts & food (disclose ingredients — allergies!) · photos & video (ask before recording, ask again to share).' },
      { heading: 'Need support?', body: 'Clown Police (first stop) · Sanctuary (medical/psychological) · BCT drop boxes across the site: Sanctuary, HQ, Penta Plaza, and the bridge between Downtown & Bison North.' },
      { body: 'If a consent angel declines your entry to a playspace or asks you to leave — please go. No negotiation, no explanations.' },
    ],
  },
  {
    id: 'safety',
    title: 'Safety & ticks',
    emoji: '🕷',
    blocks: [
      { body: 'Come prepared to be responsible for your own survival, including knowing your limits with intoxicants. Stay home if sick. Prioritize sleep, eat and drink enough — basic needs matter more than we think.' },
      { heading: 'Ticks', body: 'Alversjö has LOTS of ticks (Borrelia/Lyme, rarely TBE). Remove any tick within 24 hours. Check daily, even if careful.' },
      { heading: 'Dance floor etiquette', body: 'The dance floor is a sanctuary. Before you tap a shoulder or dance close: read the room. Eyes closed, turned inward? Leave them there. Let them have it.' },
    ],
  },
  {
    id: 'gate',
    title: 'Gate & vehicles',
    emoji: '🚐',
    blocks: [
      { heading: 'Threshold hours', body: 'Vehicle gate open 09–22 daily, one entry only — no grocery runs. Locked 22–09. All gates open for exodus Sunday 26 July at 06:00.' },
      { heading: 'On site', body: 'Never stop or park on a fire road. Speed limit 10 km/h. Don\'t drive intoxicated or too tired. All vehicles display a Borderland Car Identity Card.' },
      { heading: 'Wristbands', body: 'Wear yours at all times — members-only event by Swedish law. Alert Clown Police about trespassers.' },
    ],
  },
  {
    id: 'nature',
    title: 'Nature, lakes & cows',
    emoji: '🐄',
    blocks: [
      { heading: 'Swimming', body: 'Yes, you can swim! No soap/shampoo/lotion in the water — not even eco-friendly. Rinse off sunscreen first. Don\'t dive — rocks and pointy sticks lurk below.' },
      { heading: 'The cows', body: 'After we leave, cows return — a single piece of tin can kill one. So: NO glitter (even biodegradable), NO feathers, NO sequins, NO rhinestones, NO loose tinsel. If it sparkles and it\'s loose — leave it at home.' },
      { heading: 'Pets', body: 'Dogs on a leash at all times, including in the lakes. Pet-free 24/7: dancefloors, play spaces, effigy burn. Lost pet? Bring it to HQ; pet in distress → Clown Police.' },
      { heading: 'Nature reserve', body: 'Camps and structures only on our land — not in the reserve.' },
    ],
  },
  {
    id: 'trash',
    title: 'Trash / LNT station',
    emoji: '♻️',
    blocks: [
      { body: 'Set up an LNT trash station in your camp. Transparent bags only, don\'t mix waste. Sort: paper/cardboard · plastic · wood (clean vs treated) · metal · glass (clear/coloured) · bio (compostable paper bags) · residual.' },
      { heading: 'Container station hours', body: 'Mon–Sat 13:00–17:00 · Strike Sunday 12:00–16:00. Bring waste during the week, not all on Sunday.' },
      { heading: 'Not welcome', body: 'Camp structures, toxic waste (electronics, batteries), pant (deposit cans/bottles) — take those home.' },
    ],
  },
  {
    id: 'synchronicity',
    title: 'Synchronicity',
    emoji: '🌀',
    blocks: [
      { body: 'STOP CHASING WORKSHOPS in the JOMO guide and instead unlock the synchronicities that lead you to the exact moments you\'re meant to have. Wherever you are is exactly where you\'re meant to be. Your present moment will always be the most important event to attend.' },
      { body: 'Pick your favourites, but be prepared for synchronicity to take over — don\'t follow your plans too hard. Happy missing out! 🙌' },
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

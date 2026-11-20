// Central tuning + content. Everything gameplay-related that you may want to tweak lives here.

export const LANES = [-3, 0, 3];
export const TILE = 36;                 // road tile length (m)
export const VIEW_AHEAD = 250;          // how far ahead scenery is streamed
export const DISTRICT_LENGTH = 1500;    // metres per district
export const TRAFFIC_SPEED = 9;         // m/s of ordinary traffic

export const SPEED = { start: 18, max: 46, accel: 0.2 };

export const DISTRICTS = [
  {
    id: 'old', name: 'Burns Road', urdu: 'برنس روڈ', tag: 'Saddar Food Street',
    ground: 0x9a7b55, walk: 0xc9b08a,
    walls: [0xd8b48a, 0xc98f5a, 0xe3cfa8, 0xa8653f, 0xe8d6b5, 0xb7845c, 0xcf7f4f],
    wood: [0x2e6b8a, 0x3b7d3a, 0x8a2f2f, 0x6b4a2b, 0x2f4f8f],
    fog: 0.0,
  },
  {
    id: 'sea', name: 'Sea View', urdu: 'سی ویو', tag: 'Clifton Beach',
    ground: 0xd9c08a, walk: 0xc9c2b4,
    walls: [0xf4f0e6, 0xbfe3e8, 0xf6d6c2, 0xd7ecd2, 0xfbe7a8, 0xe3d4f0],
    wood: [0x1fa2d6, 0xe84a8a, 0xf2b705],
    fog: 0.0,
  },
  {
    id: 'port', name: 'Kemari Harbour', urdu: 'کیماڑی', tag: 'Karachi Port',
    ground: 0x8c8f93, walk: 0xa9a59c,
    walls: [0x9aa5ad, 0xb8b0a0, 0x7f8a8f, 0xc9c3b5, 0x6f7f74],
    wood: [0xd62828, 0x1565c0, 0x0b8f3a, 0xff8f00, 0x00838f, 0x6a1b9a],
    fog: 0.0,
  },
  {
    id: 'neon', name: 'Shahrah-e-Faisal', urdu: 'شاہراہِ فیصل', tag: 'Karachi by Night',
    ground: 0x4a4e56, walk: 0x9a9ca4,
    walls: [0x5b6a7d, 0x37465a, 0x7b8796, 0x2c3440, 0x8fa3b8, 0x48506a],
    wood: [0x222831],
    neon: [0xff2e88, 0x00e5ff, 0xffd60a, 0x9d4dff, 0x2bff88, 0xff7a1a],
    fog: 0.0,
  },
  {
    id: 'mazar', name: 'Mazar-e-Quaid', urdu: 'مزارِ قائد', tag: 'Numaish Gardens',
    ground: 0x4f9a3c, walk: 0xd8d2c4,
    walls: [0xf5f5f0],
    wood: [0x0b6e3a, 0xffffff],
    fog: 0.0,
  },
];
// Where the route starts (player-chosen start district). Gates stay aligned because it's a whole district.
export const route = { offset: 0 };
export const districtIndexAt = s => {
  const n = DISTRICTS.length;
  return (((Math.floor(Math.max(0, s) / DISTRICT_LENGTH) + route.offset) % n) + n) % n;
};

export const LETTERS = ['K', 'A', 'R', 'A', 'C', 'H', 'I'];
export const BOOSTS = [
  { id: 'headstart', name: 'Headstart', icon: '⏩', desc: 'Rocket through the first 600 m, invincible', cost: 400, key: 'B' },
  { id: 'shieldStart', name: 'Shield Start', icon: '🛡️', desc: 'Begin the run with a 20 s shield', cost: 250, key: 'V' },
];
export const RIVAL = { name: 'Chotu Ustad', every: [900, 1500], reward: 200 };

export const UPGRADES = [
  { id: 'nitro', name: 'Nitro Tank', icon: '⚡', desc: 'Nitro burst lasts longer', max: 5, base: 250 },
  { id: 'magnet', name: 'Chumbak', icon: '🧲', desc: 'Magnet lasts longer', max: 5, base: 200 },
  { id: 'shield', name: 'Kawach Shield', icon: '🛡️', desc: 'Shield lasts longer', max: 5, base: 200 },
  { id: 'double', name: 'Double Daulat', icon: '✖2', desc: 'Double-coins lasts longer', max: 5, base: 200 },
  { id: 'coinValue', name: 'Golden Meter', icon: '💰', desc: '+1 rupee for every coin', max: 4, base: 600 },
  { id: 'armor', name: 'Steel Bumper', icon: '❤️', desc: 'Start every run with an extra heart', max: 2, base: 2000 },
];
export const upgradeCost = (u, lvl) => Math.round((u.base * Math.pow(1.9, lvl)) / 10) * 10;

export const SKINS = [
  { id: 'classic', name: 'Classic Sabz', cost: 0, body: 0x1b7f3b, canopy: 0x1a1a1a, trim: 0xffd60a, stripe: [0xd62828, 0xffd60a, 0x1565c0, 0xffffff] },
  { id: 'lal', name: 'Lal Toofan', cost: 750, body: 0xc81d25, canopy: 0x262626, trim: 0xf5f5f5, stripe: [0xffd60a, 0xff7f11, 0xffffff] },
  { id: 'neela', name: 'Shahi Neela', cost: 1500, body: 0x1a3c8f, canopy: 0xf2e6c9, trim: 0xffc93c, stripe: [0xffc93c, 0xffffff, 0xe91e63] },
  { id: 'aam', name: 'Aam Peela', cost: 2500, body: 0xf2b705, canopy: 0x135e2f, trim: 0x135e2f, stripe: [0x135e2f, 0xd62828, 0xffffff] },
  { id: 'gulabi', name: 'Gulabi Rani', cost: 4000, body: 0xe84a8a, canopy: 0x3a1030, trim: 0xffffff, stripe: [0xffffff, 0x3ad1c4, 0xffd60a] },
  { id: 'raat', name: 'Raat ka Raja', cost: 6000, body: 0x1b1430, canopy: 0x0d0d14, trim: 0xff2e88, stripe: [0x00e5ff, 0xff2e88, 0x9d4dff], glow: 0x00e5ff },
  { id: 'sona', name: 'Sona Special', cost: 10000, body: 0xc9971c, canopy: 0x5a0f0f, trim: 0xfff3b0, stripe: [0x5a0f0f, 0xfff3b0, 0x0b6e4f], glow: 0xffc93c },
];

export const HORNS = [
  { id: 'pom', name: 'Pom Pom' },
  { id: 'tune', name: 'Dhun Wala' },
  { id: 'truck', name: 'Truck Air Horn' },
  { id: 'bell', name: 'Tring Tring' },
];

export const POWERUPS = {
  magnet: { label: 'Magnet', base: 8, per: 2, color: 0xff4d4d, icon: 0 },
  shield: { label: 'Shield', base: 10, per: 2.5, color: 0x4fc3f7, icon: 1 },
  double: { label: '2x Coins', base: 10, per: 2.5, color: 0xffd60a, icon: 2 },
  nitro: { label: 'Nitro', color: 0x00e5ff, icon: 3 },
  paan: { label: 'Meetha Paan', color: 0x2f9e44, icon: 4 },
};

// All dialogue in Karachi ki zubaan (Roman Urdu). Original lines.
export const LINES = {
  request: [
    'Abey bhai, {d}m aage chhorna hai — {t} second mein, scene on hai!',
    'Bawa jaldi kar, {t} second hain sirf! {d} meter, chal na!',
    'Ustaad, meter-shetar chhoro — {d}m, {t}s, pakka?',
    'Jani, shaadi ka khaana thanda ho raha hai! {d}m, {t} second!',
    'Abey sun, {d} meter pe utaar de — {t} second, warna lafda ho jaye ga!',
    'Boss, {t} second mein {d}m pohncha do, tip pakki!',
  ],
  chatter: [
    'Abey yaar, teri gaari to jahaz hai jahaz!',
    'Kya scene hai bawa, gaana-shaana laga na!',
    'Tension nai lene ka, apun ko jaldi nai hai... jhoot bola, hai!',
    'Burns Road ki nihari — bas naam hi kaafi hai, bawa.',
    'Sea View pe bhutta aur chuski — Karachi ka asal maza!',
    'Abey dekh ke! Woh bus waala to pagal hai!',
    'Garmi itni hai ke bheja fry ho gaya, AC nai hai isme?',
    'Patli gali se nikal le jani, shortcut hai!',
    'Kya baat hai, horn bhi ekdum faadu hai!',
    'Bun kabab khayega? Nai? Chal theek hai, faltu mein pucha.',
    'Yahan ka traffic dekh ke to tension ho jaati hai, bawa.',
    'Apun ka cousin bhi rikshaw chalata hai, par tu to pilot nikla!',
    'Chill maar, chill maar... par jaldi bhi kar!',
    'Karachi wale kabhi late nai hote — bas traffic late karta hai!',
    'Bawa ek meetha paan rok ke le lein? Chaar second lagenge!',
    'Abey khidki se peek mat maarna, pichli dafa mera kurta laal ho gaya tha!',
    'Paan khaye bina Karachi ka safar adhoora hai jani.',
    'Woh dekho, paan waala chacha — wahan ka gulkand faadu hai!',
  ],
  success: [
    'Ekdum zabardast bawa! Le kiraya, aur tip bhi rakh!',
    'Abey wah, time se pehle! Tu to ustaadon ka ustaad hai!',
    'Scene set kar diya jani! Shukriya, phir milenge!',
    'Kya baat hai boss, rocket rikshaw! Chal, Allah hafiz!',
  ],
  fail: [
    'Abey ghanta pohnchaya! Chal, main paidal hi jaata hun.',
    'Lafda ho gaya, late ho gaya... ab ammi bheja fry karegi.',
    'Bawa tu ne to topi kara di! Bas, yahin utaar.',
  ],
  hit: ['Abey dekh ke chala na!', 'Meri chai gir gayi bawa!', 'Ye bumper cars nai hain jani!', 'Abey abey abey! Bach gaye!', 'Kya kar raha hai yaar, lafda karwayega!'],
  hornCow: ['Gaaye ko horn se kya, woh to apni marzi ki maalik hai bawa.', 'Abey gaaye hai, signal nai — ruk ja!'],
  rivalStart: [
    'Abey o rikshaw waale! Race lagaye ga? Chotu Ustad se jeet ke dikha!',
    'Chotu Ustad: "Bawa, apun se aage nikal ke dikha, phir baat karna!"',
  ],
  rivalWin: ['Chotu Ustad: "Abey yaar, tu to faadu nikla!"', 'Chotu Ustad: "Chal theek hai, is dafa tu jeeta..."'],
  rivalLose: ['Chotu Ustad: "Bye bye bawa! Phir koshish kar!"', 'Chotu nikal gaya — topi ho gayi!'],
  gameOver: [
    'Abey yaar, lafda ho gaya! Chal phir se.',
    'Tension nai lene ka bawa, agli dafa pakka!',
    'Bheja fry ho gaya? Ek chai pee aur wapas aa!',
    'Rikshaw ka scene off ho gaya... mechanic bula!',
    'Koi baat nai jani, Karachi wale haar nai maante!',
  ],
};

// Short shouty HUD popups in Karachi style
export const SHOUTS = {
  near: ['BAAL BAAL BACHA!', 'FAADU!', 'EKDUM SCENE!', 'ABEY WAH!', 'JANI KYA BAAT!'],
  horn: ['ABEY HAT NA! ✋', 'SIDE DE BAWA!', 'RASTA DE JANI!'],
  ouch: ['ABEY!', 'LAFDA!', 'OYE!'],
  trick: ['JAHAZ!', 'PILOT HAI TU!', 'HAWA MEIN!'],
  smash: ['DHAMAKA!', 'TOD DIYA!', 'BAWA KAMAAL!'],
};

export const TIPS = [
  'Horn baja bawa — aage waali gaari side de deti hai!',
  'Ramp se uchhal ke hawa mein Jump dobara daba: 360° trick!',
  'Near-miss se combo barhta hai — x6 pe FEVER on ho jaata hai!',
  'Nitro full ho to Shift / N daba — sab kuch tod de!',
  'Kinare waali lane mein sawari utha, time pe pohncha — tip pakki!',
  'K-A-R-A-C-H-I ke letters jama kar, jackpot tera!',
  'Chotu Ustad race lagaye to nitro bacha ke rakh!',
  'Burns Road, Sea View, Kemari, Shahrah-e-Faisal, Mazar — poora Karachi ghoom!',
  'Tension nai lene ka — roz ka Lucky Spin free hai!',
  'Meetha Paan khao — coins khud kheench ke aate hain, aur thodi si hifazat bhi!',
];

// Wall posters & chalking (original designs): [headline, sub, bg, fg]
export const POSTERS = [
  ['TENSION NAI LENE KA', 'Karachi ka formula', '#ffd60a', '#1b1024'],
  ['CHAI PEE LE BAWA', 'Doodh patti • 24 ghante', '#d62828', '#fff6dc'],
  ['BUN KABAB', 'Ekdum garam • sirf 80 Rs', '#ff7a1a', '#1b1024'],
  ['DIL SE KARACHIITE', 'Shehr-e-Quaid', '#0b6e3a', '#ffffff'],
  ['CHILL MAAR!', 'Sea View pe milte hain', '#00acc1', '#ffffff'],
  ['SCENE ON HAI', 'Raat ki biryani party', '#6a1b9a', '#ffd60a'],
  ['LAFDA MAT KAR', 'Line mein chal bawa', '#1565c0', '#ffffff'],
  ['RIKSHAW KING', 'Mechanic: Chacha Bashir', '#e91e63', '#fff6dc'],
  ['KARACHI KI JAAN', 'Roshniyon ka shehr', '#1b1024', '#ffd60a'],
  ['FAADU PARATHA', 'Desi ghee wala', '#f2b705', '#7a1f1f'],
  ['TUITION CENTRE', 'Maths • Physics • Sir Kamran', '#ffffff', '#1565c0'],
  ['CRICKET MATCH', 'Sunday • Gali No. 7', '#2e7d32', '#ffffff'],
];

// Animated trails that follow the rickshaw (Garage → Trails)
export const TRAILS = [
  { id: 'none', name: 'Koi Nahi', cost: 0, colors: [] },
  { id: 'sparks', name: 'Chingariyan', cost: 500, colors: [0xffd60a, 0xff7a1a, 0xffffff] },
  { id: 'rainbow', name: 'Dhanak', cost: 1500, colors: [0xff2e2e, 0xff9f1a, 0xffe14d, 0x2bff88, 0x2bb6ff, 0x9d4dff] },
  { id: 'neon', name: 'Neon Dhuan', cost: 2500, colors: [0x00e5ff, 0xff2e88] },
  { id: 'hara', name: 'Sabz Hilal', cost: 3500, colors: [0x0b8f3a, 0xffffff] },
  { id: 'gold', name: 'Sone ki Dhool', cost: 5000, colors: [0xffd60a, 0xfff3b0, 0xd4af37] },
];

// Lucky Spin segments (weight = chance)
export const SPIN = [
  { label: 'Rs 100', type: 'coins', amount: 100, color: '#ffd60a', weight: 26 },
  { label: '⏩ Headstart', type: 'item', item: 'headstart', amount: 1, color: '#00acc1', weight: 12 },
  { label: 'Rs 250', type: 'coins', amount: 250, color: '#0b8f3a', weight: 20 },
  { label: '🛡️ Shield', type: 'item', item: 'shieldStart', amount: 1, color: '#1565c0', weight: 14 },
  { label: 'Rs 500', type: 'coins', amount: 500, color: '#e91e63', weight: 12 },
  { label: '⏩ x2', type: 'item', item: 'headstart', amount: 2, color: '#6a1b9a', weight: 6 },
  { label: 'Rs 1000', type: 'coins', amount: 1000, color: '#ff7a1a', weight: 7 },
  { label: '💰 JACKPOT', type: 'coins', amount: 3000, color: '#d62828', weight: 3 },
];
export const SPIN_COST = 300;

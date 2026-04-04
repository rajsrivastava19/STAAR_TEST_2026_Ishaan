/**
 * Home Scene Layout Profiles
 *
 * Single source of truth for the home screen composition.
 * All coordinates are in STAGE pixels (1440 × 1080 canvas, 4:3 aspect ratio).
 *
 * WHY 4:3?  The jungle_bg.png is 1024×1024 (1:1 square).
 * Using object-fit:cover on a 4:3 stage crops only ~128px from top/bottom,
 * matching the original display.  A 16:9 stage over-stretches the image
 * making trees/elements appear too wide.
 *
 * The HomeScene component scales the entire stage uniformly
 * to fit any viewport — so these values never change per screen size.
 */

export const SCENE_W = 1440;
export const SCENE_H = 1080;

/* ── Mountain / Level positions ───────────────────────────── */

export interface LevelLayout {
  /** Center-X in stage px */
  x: number;
  /** Center-Y in stage px */
  y: number;
  /** Mountain image width */
  mountainW: number;
  /** Mountain image height */
  mountainH: number;
  /** Dino offset-X from mountain center */
  dinoOffX: number;
  /** Dino offset-Y from mountain top */
  dinoOffY: number;
  /** Dino image height */
  dinoH: number;
  /** CSS hue-rotate value for mountain tint */
  hue: string;
}

/**
 * 7 levels arranged in a clockwise oval around the lake.
 * Coordinates mapped to 1440×1080 stage (4:3).
 * Mountains sit on the outer rim of the background's natural oval shape.
 */
export const LEVELS: LevelLayout[] = [
  // L1 — Top center
  { x: 690,  y: 300, mountainW: 200, mountainH: 170, dinoOffX: 50,  dinoOffY: -30, dinoH: 250, hue: '-50deg'  },
  // L2 — Upper right
  { x: 1010, y: 380, mountainW: 200, mountainH: 170, dinoOffX: 50,  dinoOffY: -30, dinoH: 250, hue: '60deg'   },
  // L3 — Right
  { x: 1070, y: 580, mountainW: 200, mountainH: 170, dinoOffX: 50,  dinoOffY: -30, dinoH: 250, hue: '230deg'  },
  // L4 — Lower right
  { x: 880,  y: 700, mountainW: 200, mountainH: 170, dinoOffX: -60, dinoOffY: -10, dinoH: 250, hue: '30deg'   },
  // L5 — Lower left
  { x: 530,  y: 700, mountainW: 200, mountainH: 170, dinoOffX: -15, dinoOffY: -10, dinoH: 250, hue: '0deg'    },
  // L6 — Left
  { x: 360,  y: 580, mountainW: 200, mountainH: 170, dinoOffX: 50,  dinoOffY: 0, dinoH: 250, hue: '-70deg'  },
  // L7 — Upper left
  { x: 410,  y: 380, mountainW: 200, mountainH: 170, dinoOffX: 50,  dinoOffY: 0, dinoH: 250, hue: '0deg'    },
];

/* ── Lake ─────────────────────────────────────────────────── */

export const LAKE = {
  cx: 720,
  cy: 570,
  rx: 280,
  ry: 140,
};

/* ── Hero box ─────────────────────────────────────────────── */

export const HERO_BOX = {
  x: 290,
  y: 75,
  w: 860,
  h: 175,
};

/* ── Ambient dinos ────────────────────────────────────────── */

export const AMBIENT = {
  leftDino:  { x: 20,   y: 760, w: 260, h: 260 },
  rightDino: { x: 1200, y: 770, w: 240, h: 240 },
};

/* ── Pterodactyl ──────────────────────────────────────────── */

export const PTERODACTYL = {
  x: 600,
  y: 200,
  w: 180,
  h: 110,
};

/* ── Fireflies ────────────────────────────────────────────── */

export const FIREFLIES = [
  { x: 120,  y: 300, scale: 1.0, delay: 0    },
  { x: 300,  y: 150, scale: 0.8, delay: 1.2  },
  { x: 530,  y: 250, scale: 1.2, delay: 2.4  },
  { x: 1120, y: 300, scale: 1.0, delay: 3.1  },
  { x: 1310, y: 200, scale: 0.7, delay: 1.5  },
  { x: 230,  y: 600, scale: 1.0, delay: 4.0  },
  { x: 1200, y: 500, scale: 0.8, delay: 2.0  },
  { x: 150,  y: 800, scale: 1.1, delay: 0.5  },
  { x: 830,  y: 180, scale: 0.6, delay: 3.5  },
  { x: 640,  y: 950, scale: 0.9, delay: 1.8  },
  { x: 1050, y: 850, scale: 1.0, delay: 2.8  },
  { x: 380,  y: 400, scale: 0.7, delay: 4.5  },
  { x: 980,  y: 150, scale: 0.8, delay: 0.8  },
  { x: 720,  y: 100, scale: 0.5, delay: 3.8  },
  { x: 1280, y: 700, scale: 1.0, delay: 1.0  },
];

/* ── Dino → image mapping ─────────────────────────────────── */

export const DINO_IMAGES: Record<number, string> = {
  2018: 'dino_main_trans.png',
  2019: 'dino1_trans.png',
  2021: 'dino2_trans.png',
  2022: 'dino7_trans.png',
  2023: 'dino5_trans.png',
  2024: 'dino6_trans.png',
  2025: 'dino4_trans.png',
};

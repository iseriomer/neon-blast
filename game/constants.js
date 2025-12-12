// constants.js - Game Constants
// constants.js dosyasının EN ÜSTÜNE ekle:

const BASE_SCREEN_WIDTH = 1920; // Referans PC ekran genişliği
// Ekran genişliğine göre bir oran belirle (Mobilde çok küçülmemesi için en az 0.6 ile sınırla)
let GAME_SCALE = Math.max(window.innerWidth / BASE_SCREEN_WIDTH, 0.6);
// ...
const CANVAS = document.getElementById('gameCanvas');
const CTX = CANVAS.getContext('2d');

CANVAS.width = window.innerWidth;
CANVAS.height = window.innerHeight;

// Object Pool Sizes
const POOL_SIZES = {
    PROJECTILE: 500,
    ENEMY: 200,
    PARTICLE: 1000
};

// Enemy Types Configuration
const ENEMY_TYPES = {
    BASIC: {
        radius: 22,
        color: 'hsl(0, 70%, 50%)',
        speed: 1,
        hp: 1,
        score: 50,
        name: 'Basic'
    },
    SPEEDSTER: {
        radius: 16,
        color: 'hsl(60, 90%, 60%)',
        speed: 1.9,
        hp: 1,
        score: 100,
        name: 'Speedster'
    },
    TANK: {
        radius: 35,
        color: 'hsl(240, 70%, 50%)',
        speed: 0.6,
        hp: 5,
        score: 200,
        name: 'Tank'
    },
    DASHER: {
        radius: 15,
        color: 'hsl(300, 80%, 50%)',
        speed: 1.5,
        hp: 2,
        score: 150,
        name: 'Dasher'
    },
    SPLITTER: {
        radius: 25,
        color: 'hsl(120, 70%, 50%)',
        speed: 0.8,
        hp: 3,
        score: 180,
        name: 'Splitter'
    },
    MINI_SPLITTER: {
        radius: 10,
        color: 'hsl(120, 70%, 40%)',
        speed: 1.5,
        hp: 1,
        score: 30,
        name: 'MiniSplitter'
    },
    SPAWNER: {
        radius: 30,
        color: 'hsl(180, 70%, 50%)',
        speed: 0.4,
        hp: 4,
        score: 250,
        name: 'Spawner'
    },
    HEALER: {
        radius: 30,
        color: 'hsl(50, 90%, 60%)', // Gold/Yellow
        speed: 0.7,
        hp: 6,
        score: 500,
        name: 'Healer'
    }
};

// Physics Constants
const FRICTION = 0.97;

// Default Player Stats
const MAX_SHOT_COUNT = 5; // Double Shot perki için sınır

// Default Player Stats
const DEFAULT_PLAYER_STATS = {
    shotCount: 1,
    shotSpeed: 15,
    shotSize: 5,
    piercing: 1,
    fireRate: 400,
    spread: 0.1,
    explosionSize: 1,
    color: 'white',
    homing: 0,
    ricochet: 0,
    splitShotCount: 0, // splitShot boolean yerine sayısal değer
    backShot: false,
    sideCannons: false,
    knockback: 0,
    freeze: 0,
    execute: false,
    screenWrap: false,
    cluster: false,
    clusterCount: 0,
    orbitals: 0,
    orbitalSizeMultiplier: 1,
    chainLightning: 0,
    chainLightningDamage: 1,
    explosiveRadius: 0,
    shield: 0,
    maxShields: 2,
    laserBeam: 0,
    singularity: false,
    timeWarp: false,
    critChance: 0,
    critMultiplier: 2,
    poison: false,
    poisonDamage: 0.2, // HP per second (approx)
    burn: false,
    burnDamage: 0.5, // HP per second
    laserDamage: 0.05
};
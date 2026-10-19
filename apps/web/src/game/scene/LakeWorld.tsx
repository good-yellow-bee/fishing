import { createContext, memo, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { DROPOFF_PAD, OPEN_PAD, POINT_PAD, REEDS_PAD, SHOP_X, SHOP_Z, LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, moonLight, type LakeHour, type LakeSeason, type Sky as WeatherSky, type SpotId } from "@stillwater/shared";
import { ArticulatedFish } from "./ArticulatedFish";
import { ToonModel } from "./ToonModel";
import { applyToon, releaseSharedMaterials, shareMaterials, toonRamp } from "./toon";
import { batchPlaced, placement } from "./scatterBatch";
import { mergeParts } from "./mergeParts";
import {
  BANK_BOARDS,
  BANK_POST,
  BANK_POSTS,
  BANK_STAND_LIFT,
  BANK_STAND_PLANK,
  BANK_THICK,
  BANK_TOP,
  BANK_WALK_PLANK,
  type BankBoard,
} from "./bankWalk";
import { BRIDGE_SCALE, BRIDGE_SPANS, PIER_BOARDS, PIER_PLANK, PIER_THICK, PIER_TOP } from "./pierDeck";
import type { Hotspot } from "../hotspot";
import { BubblingHotspot } from "./BubblingHotspot";
import { LakeRain } from "./LakeRain";
import { HailShower } from "./HailShower";
import { hailOut } from "./hailBurst";
import { RainCurtain } from "./RainCurtain";
import { squallOut } from "./rainSquall";
import { LakeSnow } from "./LakeSnow";
import { MoonRoad } from "./MoonRoad";
import { DockRain } from "./DockRain";
import { dewGlintsOut } from "./dewGlints";
import { dockLeavesOut } from "./plankLeaves";
import { DewGrass } from "./DewGrass";
import { DockLeaves } from "./DockLeaves";
import { boatHeading } from "./boatSwing";
import { releaseSwayingMaterial, swayUniforms, swayingMaterial } from "./treeSway";
import { Tadpoles } from "./Tadpoles";
import { GrassSnake } from "./GrassSnake";
import { SunfishNests } from "./SunfishNests";
import { IceFloes } from "./IceFloes";
import { Crayfish } from "./Crayfish";
import { Waterweed } from "./Waterweed";
import { SunkenLeaves } from "./SunkenLeaves";
import { sunkenLeavesOut } from "./leafLitter";
import { Frogspawn } from "./Frogspawn";
import { spawnOut } from "./spawnClumps";
import { crayfishOut } from "./crayfishCrawl";
import { floesOut } from "./iceFloes";
import { nestsOut } from "./sunfishNests";
import { snakeOut } from "./snakeSwim";
import { tadpolesOut } from "./tadpoleSchools";
import { DockFrost } from "./DockFrost";
import { DockSnow } from "./DockSnow";
import { FROST_COLOR, dockFrost, walkwayPale } from "./dockFrost";
import { Icicles } from "./Icicles";
import { Thermos } from "./Thermos";
import { Moths } from "./Moths";
import { CapDrips } from "./CapDrips";
import { dripsOut } from "./brimDrips";
import { mothsOut } from "./mothOrbit";
import { iciclesOut } from "./icicleRow";
import { DewWeb } from "./DewWeb";
import { Deer } from "./Deer";
import { DUCKLING_COUNT, DUCKLING_PEEP_MIN, DUCKLING_PEEP_SPREAD, ducklingAt, ducklingsOut } from "./ducklingTrail";
import { Striders } from "./Striders";
import { Whirligigs } from "./Whirligigs";
import { whirligigsOut } from "./whirligigSpin";
import { ReedFluff } from "./ReedFluff";
import { Gusts } from "./Gusts";
import { Whitecaps } from "./Whitecaps";
import { whitecapCount } from "./whitecapLife";
import { PadFrog } from "./PadFrog";
import { FROG_PADS, frogsOnPads } from "./padFrogs";
import { gustsOut } from "./gustPatch";
import { fluffOut } from "./cattailTufts";
import { stridersOut } from "./striderSkate";
import { deerOut } from "./deerMotion";
import { Moose } from "./Moose";
import { mooseAntlers, mooseOut } from "./mooseWade";
import { dewWebOut } from "./orbWeb";
import { dockSnowy } from "./snowyDock";
import { Breath } from "./Breath";
import { breathOut } from "./breathPuff";
import { WET_SHADE, dockWet } from "./dockWet";
import { moonRoad, moonTexture } from "./moonDisc";
import { Fireflies, LakeMist, makeSoftSpotTexture } from "./Atmosphere";
import { firefliesOut } from "./fireflies";
import { Heron } from "./Heron";
import { Lanterns } from "./Lanterns";
import { Campfire } from "./Campfire";
import { Snowman } from "./Snowman";
import { BirdFeeder } from "./BirdFeeder";
import { Puddles } from "./Puddles";
import { puddlesOut } from "./rainPuddles";
import { Cat } from "./Cat";
import { Clothesline } from "./Clothesline";
import { washingOut } from "./washingLine";
import { Hare } from "./Hare";
import { hareCoat, hareOut } from "./hareRounds";
import { Wildflowers } from "./Wildflowers";
import { beesOut } from "./meadowFlowers";
import { Woodpile } from "./Woodpile";
import { WindowGlow } from "./WindowGlow";
import { Dinghy } from "./Dinghy";
import { sailingOut } from "./sailingTrip";
import { TireSwing } from "./TireSwing";
import { ShoreWash } from "./ShoreWash";
import { foamOpacity } from "./lappingWaves";
import { catPlace } from "./catNap";
import { chickadeesOut, feederUp } from "./feederVisits";
import { snowmanUp } from "./snowmanLook";
import { Toadstools } from "./Toadstools";
import { Squirrels } from "./Squirrels";
import { squirrelRuns, squirrelsOut } from "./squirrelRun";
import { toadstoolsOut } from "./toadstoolPatches";
import { campfireLit } from "./campfireSmoke";
import { LanternMinnows } from "./LanternMinnows";
import { minnowsOut } from "./minnowSwirl";
import { Loon } from "./Loon";
import { loonOut } from "./loonMotion";
import { Bats } from "./Bats";
import { batsOut } from "./batFlight";
import { Geese } from "./Geese";
import { geeseOut } from "./geeseSkein";
import { Swans } from "./Swans";
import { Cormorant } from "./Cormorant";
import { Grebes } from "./Grebes";
import { Feathers } from "./Feathers";
import { feathersOut } from "./featherDrift";
import { Terns } from "./Terns";
import { ternsOut } from "./ternHover";
import { grebesOut } from "./grebeRush";
import { CORMORANT_ROCK, cormorantOut } from "./cormorantPerch";
import { swansOut } from "./swanGlide";
import { Cygnets } from "./Cygnets";
import { cygnetsOut } from "./cygnetBrood";
import { Kingfisher } from "./Kingfisher";
import { kingfisherOut } from "./kingfisherFlight";
import { Swallows } from "./Swallows";
import { duckShape, ducklingShape } from "./duckShapes";
import { fastVertexNormals } from "./waterNormals";
import { fishBuild } from "./fishBuild";
import { swallowsOut } from "./swallowFlight";
import { BaskingLog, Turtle } from "./Turtle";
import { turtleOut } from "./turtleMotion";
import { Owl, OwlTree } from "./Owl";
import { Woodpecker } from "./Woodpecker";
import { woodpeckerOut } from "./woodpeckerDrum";
import { Canoeist } from "./Canoeist";
import { canoeOut } from "./canoeTrip";
import { Skier } from "./Skier";
import { skiingOut } from "./skiTour";
import { Kite } from "./Kite";
import { NightRower } from "./NightRower";
import { nightRowOut } from "./nightRow";
import { Hammock } from "./Hammock";
import { hammockOut, hammockTrees } from "./hammockSway";
import { ShedSnow } from "./ShedSnow";
import { snowShedOut } from "./snowShed";
import { HotAirBalloon } from "./HotAirBalloon";
import { balloonOut } from "./balloonDrift";
import { kiteOut } from "./kiteFlight";
import { Campers, Tent } from "./Tent";
import { CAMP_FIRE_AT, CAMP_LIGHTS, campersOut, tentPitched } from "./campTent";
import { Pumpkins } from "./Pumpkins";
import { pumpkinsOut } from "./pumpkinPatch";
import { Hummingbird } from "./Hummingbird";
import { hummingbirdOut } from "./hummingbirdVisits";
import { FogAngler } from "./FogAngler";
import { fogAnglerOut } from "./fogFishing";
import { DogWalker } from "./DogWalker";
import { FAR_HILLS, hillColor } from "./farHills";
import { dogWalkOut } from "./dogWalk";
import { Swimmer } from "./Swimmer";
import { swimmingOut } from "./swimLane";
import { Woodcutter } from "./Woodcutter";
import { choppingOut } from "./woodChopping";
import { BoatFill } from "./BoatFill";
import { fillKind, type FillKind } from "./boatBilge";
import { GooseFamily } from "./GooseFamily";
import { gooseFamilyOut } from "./gooseGraze";
import { LeafPile } from "./LeafPile";
import { LeafRaker } from "./LeafRaker";
import { leafJumpOut } from "./leafJump";
import { Painter } from "./Painter";
import { painterOut } from "./pleinAir";
import { DiscTossers } from "./DiscTossers";
import { discOut } from "./discToss";
import { BrollyFisher } from "./BrollyFisher";
import { brollyOut } from "./brollyFishing";
import { SnowballKids } from "./SnowballKids";
import { snowballOut } from "./snowballFight";
import { NightAngler } from "./NightAngler";
import { headlampOut } from "./headlampFishing";
import { StoneSkimmer } from "./StoneSkimmer";
import { skimOut } from "./skimStones";
import { Jogger } from "./Jogger";
import { joggerOut } from "./jogRun";
import { Crows } from "./Crows";
import { crowsOut } from "./crowFlush";
import { sleddersOut } from "./sledRun";
import { HayBales } from "./HayBales";
import { Farmstead } from "./Farmstead";
import { Cows } from "./Cows";
import { BarnOwl } from "./BarnOwl";
import { barnOwlOut } from "./owlQuarter";
import { ValleyMist } from "./ValleyMist";
import { valleyMistOut } from "./valleyMist";
import { cowsOut } from "./cowGraze";
import { balesOut } from "./hayField";
import { Sledders } from "./Sledders";
import { spindriftOut } from "./blowingSnow";
import { Spindrift } from "./Spindrift";
import { NightEyes } from "./NightEyes";
import { eyesOut } from "./eyeShine";
import { Birdwatcher } from "./Birdwatcher";
import { birderOut } from "./birdWatch";
import { PorchRocker } from "./PorchRocker";
import { porchOut } from "./porchRocking";
import { Sandpipers } from "./Sandpipers";
import { sandpipersOut } from "./sandpiperRun";
import { EaveLights } from "./EaveLights";
import { eaveLightsOn } from "./festiveBulbs";
import { Coots } from "./Coots";
import { cootsOut } from "./cootSquabble";
import { murmurationOut } from "./murmuration";
import { Starlings } from "./Starlings";
import { DockRobin } from "./DockRobin";
import { robinOut } from "./robinVisit";
import { DockSnail } from "./DockSnail";
import { snailOut } from "./snailCrawl";
import { gullsOut } from "./gullFloes";
import { WinterGulls } from "./WinterGulls";
import { LakeSmoke } from "./LakeSmoke";
import { lakeSmokeOut } from "./lakeSteam";
import { Sculler } from "./Sculler";
import { scullOut } from "./scullRow";
import { Paddleboarder } from "./Paddleboarder";
import { paddleOut } from "./paddleRoute";
import { MidgeCloud } from "./MidgeCloud";
import { midgesOut } from "./midgeDance";
import { Gossamer } from "./Gossamer";
import { gossamerOut } from "./silkDrift";
import { Cabin } from "./Cabin";
import { cabinWindowsLit, chimneySmoking } from "./cabinLook";
import { owlOut } from "./owlMotion";
import { JumpingFish } from "./JumpingFish";
import { FryBurst } from "./FryBurst";
import { fryOut } from "./fryScatter";
import { DiamondDust } from "./DiamondDust";
import { diamondDustOut } from "./iceGlitter";
import { jumpsOn } from "./fishJump";
import { Otter } from "./Otter";
import { Osprey } from "./Osprey";
import { Fox } from "./Fox";
import { foxOut } from "./foxTrot";
import { ospreyOut } from "./ospreyFlight";
import { Beaver } from "./Beaver";
import { Butterflies } from "./Butterflies";
import { butterfliesOut } from "./butterflyFlit";
import { beaverOut } from "./beaverSwim";
import { LILY_HEART, LILY_PETALS, easeLily, lilyBloom, lilyCup, lilyOpen, lilyPads, type Bloom } from "./lilyBloom";
import { sharedLilyPetals } from "./lilyPetals";
import { LILY_PADS_AT } from "../lilyCover";
import { FallingLeaves } from "./FallingLeaves";
import { LeafRaft } from "./LeafRaft";
import { leavesOut, petalsOut } from "./leafFall";
import { LeafWhirl } from "./LeafWhirl";
import { leafWhirlOut } from "./leafEddy";
import { otterOut } from "./otterMotion";
import { lanternLevel } from "./lanternLight";
import { heronOut } from "./heronMotion";
import { useReducedMotion } from "./reducedMotion";
import { reedStem, reedTilt } from "./reedSway";
import { sunCaustics } from "./sunCaustics";
import { BankMirror, type MirrorHill, type MirrorTree } from "./BankMirror";
import { LightShafts } from "./LightShafts";
import { SunBreak } from "./SunBreak";
import { sunBreakOut } from "./sunGap";
import { shaftStrength } from "./shaftLight";
import { PollenFilm } from "./PollenFilm";
import { FoamLanes } from "./FoamLanes";
import { foamLanesAmount } from "./foamLanesPlan";
import { DuckweedFilm } from "./DuckweedFilm";
import { ShoreIceFilm } from "./ShoreIceFilm";
import { SNOW_BAND } from "./shoreIce";
import { duckweedAmount } from "./duckweedBeds";
import { pollenAmount } from "./pollenDrift";
import { bankMirrorStrength, mirrorStale } from "./mirrorImage";
import { ROAD_RELAY, SUN_ROAD_FAR, SUN_ROAD_NEAR, roadBands, roadFrom } from "./glintRoad";
import { DRAGONFLY_COUNT, dragonfliesOut, dragonfly } from "./dragonflies";
import { duckFlush, duckReturn, lastSplash, stepDuck, type DuckState } from "./duckFlush";
import { DABBLE_TIP, dabble } from "./duckDabble";
import { mistAmount } from "./mist";
import { cloudBlobs, cloudScroll, cloudShadowStrength } from "./cloudShadow";
import { starOpacity } from "./starField";
import { Stars } from "./Stars";
import { seasonGroundColor, seasonWaterColor, shoreIce, tintPlant, type PlantKind } from "./seasonLook";
import { treeShape, type HillShape, type TreeShape } from "./cameraClear";
import { fx } from "../fx";
import { useSettings } from "../settings";
import { BOAT_DECK, boat, boatPathPoint } from "./boat";
import { CREEK_BANK, CREEK_HALF_WIDTH, CREEK_ROCKS, creekRibbon, nearCreek } from "./creek";
import { bedColor, bedHeight, causticStrength, glitterDirection, glitterOnWater, waterDepthColor, waterHeight, waterHeightWithShoreWeight, surfaceScroll, waterShoreWeight } from "./water";

type Vec3 = [number, number, number];

export const LAKE_HOUR_LOOK: Record<
  LakeHour,
  {
    fog: string;
    hemiSky: string;
    hemiGround: string;
    hemi: number;
    sun: string;
    sunInt: number;
    sunPos: Vec3;
    sky: [string, string, string];
    disc: string;
    glow: string;
    discPos: Vec3;
    clouds: string;
    water: string;
    waterDrop: string;
    glint: number;
    glitter: boolean;
    birds: boolean;
  }
> = {
  dawn: {
    fog: "#e0c4a8",
    hemiSky: "#f0c8b0",
    hemiGround: "#5a4a38",
    hemi: 0.95,
    sun: "#ffb078",
    sunInt: 1.7,
    sunPos: [20, 12, 14],
    sky: ["#f2d2b0", "#e8a888", "#7a9ab8"],
    disc: "#ffd4a0",
    glow: "#f4c9a0",
    discPos: [32, 14, -58],
    clouds: "#f6e4d0",
    water: "#3d7a88",
    waterDrop: "#2c5a6a",
    glint: 0.85,
    glitter: true,
    birds: true,
  },
  day: {
    fog: "#b6cbd2",
    hemiSky: "#d3e6ef",
    hemiGround: "#41564a",
    hemi: 1.05,
    sun: "#ffdf9e",
    sunInt: 2.5,
    sunPos: [16, 22, 10],
    sky: ["#e6ead8", "#b7d2dc", "#79a8c6"],
    disc: "#fff3cf",
    glow: "#f4e9c5",
    discPos: [38, 34, -62],
    clouds: "#f4f8f6",
    water: "#357795",
    waterDrop: "#2c6784",
    glint: 1,
    glitter: true,
    birds: true,
  },
  dusk: {
    fog: "#c49070",
    hemiSky: "#e8a070",
    hemiGround: "#3a2820",
    hemi: 0.85,
    sun: "#ff8a50",
    sunInt: 1.55,
    sunPos: [-14, 10, 10],
    sky: ["#e8a070", "#c45c48", "#4a3a68"],
    disc: "#ffb070",
    glow: "#e89060",
    discPos: [-32, 12, -52],
    clouds: "#f0c4a8",
    water: "#2a5a6a",
    waterDrop: "#1c4860",
    glint: 0.7,
    glitter: true,
    birds: true,
  },
  night: {
    fog: "#1c2a38",
    hemiSky: "#6a82a0",
    hemiGround: "#1e2a22",
    hemi: 0.5,
    sun: "#c5d0e0",
    sunInt: 0.85,
    sunPos: [-18, 24, 8],
    sky: ["#1a2838", "#24344a", "#0e1620"],
    disc: "#e8eef6",
    glow: "#c5d0e0",
    discPos: [-28, 30, -50],
    clouds: "#3d4a58",
    water: "#1a3a48",
    waterDrop: "#143040",
    glint: 0.18,
    glitter: false,
    birds: false,
  },
};

/** How far each sky grays the hour's palette, dims the sun, and pulls the fog in. Haze sinks the unfogged clouds into the fog bank. */
const WEATHER_TINT: Record<
  WeatherSky,
  { mute: number; shade: number; clouds: number; haze: number; sun: number; near: number; far: number }
> = {
  clear: { mute: 0, shade: 1, clouds: 1, haze: 0, sun: 1, near: 1, far: 1 },
  "partly-cloudy": { mute: 0.2, shade: 0.97, clouds: 0.95, haze: 0, sun: 0.85, near: 0.95, far: 0.95 },
  overcast: { mute: 0.6, shade: 0.86, clouds: 0.74, haze: 0, sun: 0.55, near: 0.85, far: 0.85 },
  rain: { mute: 0.72, shade: 0.5, clouds: 0.38, haze: 0, sun: 0.4, near: 0.6, far: 0.7 },
  fog: { mute: 0.8, shade: 1.1, clouds: 1, haze: 0.8, sun: 0.5, near: 0.42, far: 0.47 },
};

export type WeatherLook = {
  sky: [string, string, string];
  /** How bright the disc's glow is: the moon's light at night, full by day. */
  discGlow: number;
  fog: string;
  fogNear: number;
  fogFar: number;
  hemiSky: string;
  sunInt: number;
  sunOut: boolean;
  /** Shadow strength: soft under cloud, where only the sun disc used to change. */
  shadow: number;
  clouds: string;
  water: string;
  waterDrop: string;
  glint: number;
  rain: boolean;
  /** Sky light on the unlit rain, relative to day, so night rain does not glow. */
  rainLight: number;
};

function luminance(color: THREE.Color) {
  return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
}

/** Grays a color toward its own brightness rather than a fixed gray, so a rainy night stays a night. */
function mute(color: string, amount: number, shade: number) {
  const tinted = new THREE.Color(color);
  const gray = Math.min(1, luminance(tinted) * shade);
  return `#${tinted.lerp(new THREE.Color(gray, gray, gray), amount).getHexString()}`;
}

/** Sky light at this hour; muting keeps its brightness, so the weather does not change it. */
function ambient(hour: LakeHour) {
  const look = LAKE_HOUR_LOOK[hour];
  return look.hemi * luminance(new THREE.Color(look.hemiSky));
}

/** `moon` is the lit share of the moon, 0 new to 1 full; at night it sets how much light the moon gives. */
export function weatherLook(hour: LakeHour, sky: WeatherSky, moon = 1): WeatherLook {
  const look = LAKE_HOUR_LOOK[hour];
  const tint = WEATHER_TINT[sky];
  const night = hour === "night";
  const fog = mute(look.fog, tint.mute, tint.shade);
  const sunOut = tint.sun > 0.8;
  const clouds = new THREE.Color(mute(look.clouds, tint.mute, tint.clouds)).lerp(new THREE.Color(fog), tint.haze);
  return {
    sky: [mute(look.sky[0], tint.mute, tint.shade), mute(look.sky[1], tint.mute, tint.shade), mute(look.sky[2], tint.mute, tint.shade)],
    fog,
    fogNear: (night ? 28 : 40) * tint.near,
    fogFar: (night ? 90 : 110) * tint.far,
    hemiSky: mute(look.hemiSky, tint.mute, 1),
    sunInt: look.sunInt * tint.sun * (night ? 0.55 + 0.45 * moon : 1),
    discGlow: night ? 0.35 + 0.65 * moon : 1,
    sunOut,
    shadow: sunOut ? 1 : 0.3,
    clouds: `#${clouds.getHexString()}`,
    // Water keeps more of its color than the sky so the lake still reads as water under cloud.
    water: mute(look.water, tint.mute * 0.6, 1),
    waterDrop: mute(look.waterDrop, tint.mute * 0.6, 1),
    glint: look.glint * (sunOut ? 1 : 0.3),
    rain: sky === "rain",
    rainLight: ambient(hour) / ambient("day"),
  };
}

const MODELS = {
  pine: "/models/tree_detailed.glb",
  pineDark: "/models/tree_detailed_dark.glb",
  oak: "/models/tree_oak.glb",
  oakDark: "/models/tree_oak_dark.glb",
  fat: "/models/tree_fat.glb",
  bushDetailed: "/models/plant_bushDetailed.glb",
  bushLarge: "/models/plant_bushLarge.glb",
  grass: "/models/grass.glb",
  grassLarge: "/models/grass_large.glb",
  canoe: "/models/canoe.glb",
  rowboat: "/models/boat-row-large.glb",
  paddle: "/models/canoe_paddle.glb",
  bridge: "/models/bridge_wood.glb",
  platform: "/models/platform_beach.glb",
  path: "/models/path_wood.glb",
  log: "/models/log.glb",
  buoy: "/models/buoy.glb",
  lilyLarge: "/models/lily_large.glb",
  lilySmall: "/models/lily_small.glb",
  reed: "/models/grass_leafsLarge.glb",
  grassPlat: "/models/platform_grass.glb",
} as const;

type Scatter = { url: string; position: Vec3; scale: number; rot: number };

/** Plants read the season from here rather than through every scatter list. */
const SeasonContext = createContext<LakeSeason>("summer");

const PLANT_KIND: Record<string, PlantKind> = {
  // tree_detailed reads as a blocky broadleaf, so it turns with the oaks.
  [MODELS.pine]: "leafy",
  [MODELS.pineDark]: "leafy",
  [MODELS.oak]: "leafy",
  [MODELS.oakDark]: "leafy",
  [MODELS.fat]: "leafy",
  [MODELS.bushDetailed]: "leafy",
  [MODELS.bushLarge]: "leafy",
  [MODELS.grass]: "grass",
  [MODELS.grassLarge]: "grass",
  [MODELS.reed]: "grass",
};

/** A steady 0..1 per spot, so each oak keeps its own fall colour from visit to visit. */
function plantVariant(position: Vec3) {
  const s = Math.sin(position[0] * 12.9898 + position[2] * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
type Lily = { url: string; position: Vec3; scale: number };
type BoatProps = { url: string; position: Vec3; heading: number; delay: number; scale: number };
type FishProps = {
  points: Vec3[];
  speed: number;
  phase: number;
  size: number;
  color: string;
  accent: string;
  /** Which species it is, for its build and markings. */
  species: string;
};

// Deterministic pseudo-random in [0, 1) so the layout is stable across renders.
function jitter(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Ring of scenery around the lake, leaving the dock side (+z) open for the camera.
function scatterRing(count: number, urls: readonly string[], seed: number, spread: number, scaleMin: number, scaleMax: number): Scatter[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.PI * (0.72 + (1.56 * i) / (count - 1)) + (jitter(seed + i) - 0.5) * 0.14;
    const out = jitter(seed + i + 40) * spread;
    return {
      url: urls[Math.floor(jitter(seed + i + 80) * urls.length)]!,
      position: [Math.cos(angle) * (LAKE_RX + 2.6 + out), -0.08, Math.sin(angle) * (LAKE_RZ + 2.4 + out * 0.7) + LAKE_CENTER_Z] as Vec3,
      scale: scaleMin + jitter(seed + i + 120) * (scaleMax - scaleMin),
      rot: jitter(seed + i + 160) * Math.PI * 2,
    };
  });
}

const TREE_URLS = [MODELS.pine, MODELS.pineDark, MODELS.pine, MODELS.oak, MODELS.fat, MODELS.pineDark, MODELS.oakDark] as const;
/** Nothing grows in the creek. Trees keep a wider berth since their crowns spread. */
function offCreek(items: Scatter[], margin: number) {
  return items.filter((item) => !nearCreek(item.position[0], item.position[2], margin));
}

const TREES = offCreek(scatterRing(22, TREE_URLS, 3, 6, 3.4, 5.6), 1.6);
const BACK_TREES = offCreek(
  scatterRing(14, [MODELS.pineDark, MODELS.oakDark, MODELS.pine], 57, 6, 4.6, 6.4).map((tree) => ({
    ...tree,
    position: [tree.position[0] * 1.18, tree.position[1], tree.position[2] * 1.24 - 1.5] as Vec3,
  })),
  1.6,
);
const BUSHES = offCreek(scatterRing(10, [MODELS.bushDetailed, MODELS.bushLarge], 11, 2.2, 1.1, 2.1), 0.4);
const GRASS = offCreek(scatterRing(16, [MODELS.grass, MODELS.grassLarge], 23, 1.4, 1.2, 2.2), 0.2);

/** Pines and oaks lining the creek, back from the water and off the inlet walk. */
const CREEK_TREES: Scatter[] = [
  { url: MODELS.oak, position: [-31.8, -0.08, -9.4], scale: 4.1, rot: 2.1 },
  { url: MODELS.pine, position: [-24.6, -0.08, -13.6], scale: 4.8, rot: 1.4 },
  { url: MODELS.oakDark, position: [-29.4, -0.08, -14.6], scale: 4.6, rot: 3.3 },
  { url: MODELS.pineDark, position: [-35.2, -0.08, -16.8], scale: 5, rot: 0.3 },
];

/** Every shore tree, for the bank's mirror image on still water. */
const MIRROR_TREES: MirrorTree[] = [...TREES, ...BACK_TREES, ...CREEK_TREES].map((tree) => ({ position: tree.position, scale: tree.scale, variant: plantVariant(tree.position) }));

const HILLS = FAR_HILLS;

/** The two trees by the shack, placed about it. */
const SHACK_TREES: Scatter[] = [
  { url: MODELS.fat, position: [3.4 + SHOP_X, 0, 1.2 + SHOP_Z], scale: 3.8, rot: 0 },
  { url: MODELS.oak, position: [-3.2 + SHOP_X, 0, 1.6 + SHOP_Z], scale: 3.2, rot: 0 },
];

/** Where the squirrels run: between the two trees by the shack, and between two pairs of shore trees round the lake. */
/** The two trees across the lake the hammock hangs between. */
const HAMMOCK_TREES = hammockTrees(TREES);

const SQUIRREL_RUNS = [[SHACK_TREES[1]!, SHACK_TREES[0]!] as const, ...squirrelRuns(TREES, 2)];

/** The trees toadstools come up under in fall: the near shore and the two by the shack. */
const TOADSTOOL_TREES = [...TREES, ...SHACK_TREES];

/** What the camera must not sink into: the hills and every tree on the shore. */
export const CAMERA_HILLS: HillShape[] = HILLS.map((hill) => ({ center: hill.position, radii: hill.scale }));
export const CAMERA_TREES: TreeShape[] = [
  ...TREES,
  ...BACK_TREES,
  ...CREEK_TREES,
  ...SHACK_TREES,
].map((tree) => treeShape(tree.position, tree.scale));

const CREEK_GRASS: Scatter[] = [
  { url: MODELS.grassLarge, position: [-23.1, -0.02, -7.6], scale: 1.6, rot: 0.9 },
  { url: MODELS.grass, position: [-26.8, -0.02, -9.1], scale: 1.4, rot: 2.4 },
  { url: MODELS.bushDetailed, position: [-25.4, -0.02, -12.1], scale: 1.2, rot: 1.1 },
  { url: MODELS.grassLarge, position: [-30.6, -0.02, -11.0], scale: 1.5, rot: 3.6 },
];

const NEAR_GRASS: Scatter[] = [
  { url: MODELS.grassLarge, position: [-4.6, -0.02, 9.6], scale: 1.9, rot: 0.6 },
  { url: MODELS.grass, position: [-3.1, -0.02, 10.4], scale: 1.5, rot: 2.3 },
  { url: MODELS.grassLarge, position: [3.4, -0.02, 10.1], scale: 1.7, rot: 4.1 },
  { url: MODELS.grass, position: [5, -0.02, 9.3], scale: 1.4, rot: 1.2 },
  { url: MODELS.bushDetailed, position: [-6.4, -0.02, 9], scale: 1.4, rot: 0.9 },
  { url: MODELS.bushLarge, position: [7.1, -0.02, 9.8], scale: 1.3, rot: 2.8 },
  { url: MODELS.grassLarge, position: [3.8, -0.02, 14.2], scale: 1.8, rot: 0.4 },
  { url: MODELS.grass, position: [6.6, -0.02, 16.1], scale: 1.5, rot: 2.1 },
  { url: MODELS.bushDetailed, position: [8.2, -0.02, 14.8], scale: 1.5, rot: 1.4 },
  { url: MODELS.bushLarge, position: [2.1, -0.02, 16.6], scale: 1.35, rot: 3.2 },
];

// The pads' places are shared with the casts that land tight to them (lilyCover.ts).
const LILIES: Lily[] = LILY_PADS_AT.map((pad) => ({ url: pad.large ? MODELS.lilyLarge : MODELS.lilySmall, position: [pad.x, 0.04, pad.z], scale: pad.scale }));

const BOATS: BoatProps[] = [
  { url: MODELS.canoe, position: [-8.5, 0.08, -5], heading: 0.72, delay: 0.2, scale: 2.6 },
  { url: MODELS.rowboat, position: [10.5, 0.06, -9.8], heading: -0.82, delay: 1.4, scale: 0.66 },
];

const FISH: FishProps[] = [
  {
    points: [[-8, -0.36, 3], [-2, -0.24, 5], [5, -0.41, 2], [7, -0.31, -4], [1, -0.48, -7], [-7, -0.34, -5]],
    speed: 0.027,
    phase: 0,
    size: 1.05,
    color: "#b9673e",
    species: "smallmouth-bass",
    accent: "#e7bd72",
  },
  {
    points: [[3, -0.46, 4], [9, -0.26, 0], [6, -0.41, -7], [-1, -0.36, -9], [-5, -0.26, -3]],
    speed: 0.034,
    phase: 0.22,
    size: 0.85,
    color: "#779057",
    species: "largemouth-bass",
    accent: "#c6ce85",
  },
  {
    points: [[-12, -0.28, -1], [-8, -0.44, -8], [-1, -0.52, -11], [4, -0.34, -6], [0, -0.28, 0]],
    speed: 0.023,
    phase: 0.48,
    size: 1.12,
    color: "#566f78",
    species: "pike",
    accent: "#b7c7bd",
  },
  {
    points: [[-5, -0.32, 1], [0, -0.24, 3], [5, -0.36, -1], [2, -0.48, -5], [-4, -0.32, -4]],
    speed: 0.039,
    phase: 0.67,
    size: 0.8,
    color: "#c5893d",
    species: "perch",
    accent: "#f1cf77",
  },
  {
    points: [[8, -0.32, 2], [12, -0.44, -4], [7, -0.41, -10], [1, -0.28, -7], [2, -0.36, -1]],
    speed: 0.031,
    phase: 0.84,
    size: 0.95,
    color: "#8b5c4b",
    species: "catfish",
    accent: "#d4a071",
  },
];

const GLITTER_QUADS = 16;
const GLITTER_BANDS = 3;

// Streak of sparkle quads on the water from the eye toward the sun disc, wherever the hour puts it.
function glitterQuads(from: { x: number; z: number }, discPos: Vec3) {
  const dir = glitterDirection(discPos, from);
  return Array.from({ length: GLITTER_QUADS }, (_, i) => {
    const dist = SUN_ROAD_NEAR + (i / (GLITTER_QUADS - 1)) * (SUN_ROAD_FAR - SUN_ROAD_NEAR);
    const side = (jitter(i + 7) - 0.5) * (1 + dist * 0.16);
    return {
      x: from.x + dir.x * dist - dir.z * side,
      z: from.z + dir.z * dist + dir.x * side,
      scale: 0.3 + jitter(i + 31) * 0.45,
      band: i % GLITTER_BANDS,
    };
  }).filter((quad) => glitterOnWater(quad.x, quad.z));
}

const WING_GEOMETRY = new THREE.BufferGeometry();
WING_GEOMETRY.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.09, 0.7, 0.04, 0, 0, 0, -0.11], 3));
WING_GEOMETRY.computeVertexNormals();
const BIRD_MATERIAL = new THREE.MeshBasicMaterial({ color: "#2b3138", fog: false, side: THREE.DoubleSide });

type FlockProps = { y: number; z: number; speed: number; offset: number; dir: 1 | -1; birds: Vec3[] };

const FLOCKS: FlockProps[] = [
  { y: 18, z: -32, speed: 1.1, offset: 20, dir: 1, birds: [[0, 0, 0], [-1.3, 0.4, 0.9], [1.2, 0.25, -0.8], [-2.4, -0.1, -0.6]] },
  { y: 15.5, z: -18, speed: 0.85, offset: 68, dir: -1, birds: [[0, 0, 0], [1.4, 0.35, 0.7], [-1.2, 0.2, -0.9]] },
];

type DuckProps = { points: Vec3[]; speed: number; phase: number; body: string; head: string; brood?: boolean };

const DUCKS: DuckProps[] = [
  {
    points: [[-9, 0, 4], [-6.5, 0, 5], [-4.8, 0, 3.2], [-6.8, 0, 2], [-9.5, 0, 2.6]],
    speed: 0.02,
    phase: 0,
    body: "#8a6842",
    head: "#3f7d6d",
  },
  {
    points: [[7, 0, -6.5], [9.5, 0, -7], [9.6, 0, -8.4], [8, 0, -10], [6.2, 0, -8.5]],
    speed: 0.016,
    phase: 0.45,
    body: "#9c7a4f",
    head: "#45607a",
    // Leads her ducklings round the east shallows in spring, in view of the dock.
    brood: true,
  },
];



for (const url of Object.values(MODELS)) useGLTF.preload(url);

function pushDiscIndices(rings: number, segments: number, indices: number[]) {
  for (let s = 0; s < segments; s += 1) {
    indices.push(0, 1 + s, 1 + ((s + 1) % segments));
  }
  for (let r = 0; r < rings - 1; r += 1) {
    const inner = 1 + r * segments;
    const outer = inner + segments;
    for (let s = 0; s < segments; s += 1) {
      const next = (s + 1) % segments;
      const a = inner + s;
      const b = inner + next;
      const c = outer + s;
      const d = outer + next;
      indices.push(a, c, d);
      indices.push(a, d, b);
    }
  }
}

// Shelf near the bank, basin in the middle. Local +Z is world up after the mesh pitch.
function makeBedSurface(radiusX: number, radiusZ: number) {
  const rings = 18;
  const segments = 72;
  const count = 1 + rings * segments;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const indices: number[] = [];
  const setVert = (i: number, x: number, y: number) => {
    const worldZ = -y + LAKE_CENTER_Z;
    const tint = bedColor(x, worldZ);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = bedHeight(x, worldZ);
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  };
  setVert(0, 0, 0);
  for (let r = 1; r <= rings; r += 1) {
    const f = r / rings;
    for (let s = 0; s < segments; s += 1) {
      const angle = (s / segments) * Math.PI * 2;
      const edge = lakeEdge(angle);
      setVert(1 + (r - 1) * segments + s, Math.cos(angle) * radiusX * edge * f, Math.sin(angle) * radiusZ * edge * f);
    }
  }
  pushDiscIndices(rings, segments, indices);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * The bed again, a hair higher, carrying the caustic light. Vertex colour is
 * the shelf mask, so with additive blending the deep bed gets nothing.
 */
function makeCausticGeometry(bed: THREE.BufferGeometry) {
  const geometry = bed.clone();
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const mask = new Float32Array(position.count * 3);
  const uvs = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const worldZ = -position.getY(i) + LAKE_CENTER_Z;
    const k = causticStrength(x, worldZ);
    mask[i * 3] = k;
    mask[i * 3 + 1] = k;
    mask[i * 3 + 2] = k;
    uvs[i * 2] = x / 3.2;
    uvs[i * 2 + 1] = worldZ / 3.2;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(mask, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  return geometry;
}

// Bright cell walls, the net of light a rippled surface throws on sand. Tiles.
function makeCausticTexture() {
  const size = 128;
  const cells = Array.from({ length: 12 }, (_, i) => ({ x: jitter(i + 700) * size, y: jitter(i + 740) * size }));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let f1 = Infinity;
      let f2 = Infinity;
      for (const cell of cells) {
        let dx = Math.abs(px - cell.x);
        let dy = Math.abs(py - cell.y);
        dx = Math.min(dx, size - dx);
        dy = Math.min(dy, size - dy);
        const d = Math.hypot(dx, dy);
        if (d < f1) {
          f2 = f1;
          f1 = d;
        } else if (d < f2) {
          f2 = d;
        }
      }
      const wall = Math.max(0, 1 - (f2 - f1) / 5);
      const v = Math.round(255 * wall * wall);
      const at = (py * size + px) * 4;
      image.data[at] = v;
      image.data[at + 1] = v;
      image.data[at + 2] = Math.round(v * 0.9);
      image.data[at + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Sky caught on the water at a glancing angle: far water goes pale, water underfoot stays clear.
 * Measured against the lake's up rather than the chop's normals, which made near water glance too.
 */
const RIM_STRENGTH = 0.32;

const rimCacheKey = () => "lake-water-rim";

function addWaterRim(shader: { uniforms: Record<string, THREE.IUniform>; fragmentShader: string }, rimColor: THREE.IUniform<THREE.Color>) {
  shader.uniforms.rimColor = rimColor;
  shader.fragmentShader = shader.fragmentShader
    .replace("void main() {", "uniform vec3 rimColor;\nvoid main() {")
    .replace(
      "#include <opaque_fragment>",
      `vec3 lakeUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
float rim = pow(1.0 - clamp(dot(lakeUp, normalize(vViewPosition)), 0.0, 1.0), 6.0);
outgoingLight = mix(outgoingLight, rimColor, rim * ${RIM_STRENGTH.toFixed(2)});
#include <opaque_fragment>`,
    );
}

// Concentric rings so the surface can chop. Local +Z is world up after the mesh pitch.
function makeWaveSurface(radiusX: number, radiusZ: number) {
  const rings = 24;
  const segments = 84;
  const count = 1 + rings * segments;
  const positions = new Float32Array(count * 3);
  const base = new Float32Array(count * 2);
  const uvs = new Float32Array(count * 2);
  const indices: number[] = [];
  const spanX = radiusX * 2;
  const spanZ = radiusZ * 2;
  const setVert = (i: number, x: number, y: number) => {
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    base[i * 2] = x;
    base[i * 2 + 1] = y;
    uvs[i * 2] = x / spanX + 0.5;
    uvs[i * 2 + 1] = y / spanZ + 0.5;
  };
  setVert(0, 0, 0);
  for (let r = 1; r <= rings; r += 1) {
    const f = r / rings;
    for (let s = 0; s < segments; s += 1) {
      const angle = (s / segments) * Math.PI * 2;
      const edge = lakeEdge(angle);
      setVert(1 + (r - 1) * segments + s, Math.cos(angle) * radiusX * edge * f, Math.sin(angle) * radiusZ * edge * f);
    }
  }
  pushDiscIndices(rings, segments, indices);
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(positions, 3);
  position.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", position);
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.base = base;
  const shoreWeights = new Float32Array(position.count);
  const tints = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const x = base[i * 2]!;
    const worldZ = -base[i * 2 + 1]! + LAKE_CENTER_Z;
    shoreWeights[i] = waterShoreWeight(x, worldZ);
    const tint = waterDepthColor(x, worldZ);
    tints[i * 3] = tint.r;
    tints[i * 3 + 1] = tint.g;
    tints[i * 3 + 2] = tint.b;
  }
  geometry.userData.shoreWeights = shoreWeights;
  geometry.userData.tints = tints;
  return geometry;
}

function displaceWater(geometry: THREE.BufferGeometry, time: number) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const base = geometry.userData.base as Float32Array;
  const shoreWeights = geometry.userData.shoreWeights as Float32Array;
  const tints = geometry.userData.tints as Float32Array;
  let colors = geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
  if (!colors) {
    colors = new THREE.BufferAttribute(new Float32Array(position.count * 3), 3);
    geometry.setAttribute("color", colors);
  }
  for (let i = 0; i < position.count; i += 1) {
    const x = base[i * 2]!;
    const y = base[i * 2 + 1]!;
    const worldZ = -y + LAKE_CENTER_Z;
    const height = waterHeightWithShoreWeight(x, worldZ, time, shoreWeights[i]!);
    position.setZ(i, height);
    const crest = 1 + height * 0.55;
    colors.setXYZ(i, tints[i * 3]! * crest, tints[i * 3 + 1]! * crest, tints[i * 3 + 2]! * crest);
  }
  colors.needsUpdate = true;
  position.needsUpdate = true;
  fastVertexNormals(geometry);
}

function edgePoints(offset: number) {
  return Array.from({ length: 96 }, (_, i) => {
    const angle = (i / 96) * Math.PI * 2;
    const edge = lakeEdge(angle);
    return new THREE.Vector2(Math.cos(angle) * (LAKE_RX * edge + offset), Math.sin(angle) * (LAKE_RZ * edge + offset));
  });
}

function makeEdgeRingGeometry(outerOffset: number, innerOffset: number) {
  const shape = new THREE.Shape(edgePoints(outerOffset));
  shape.holes.push(new THREE.Path(edgePoints(innerOffset).reverse()));
  return new THREE.ShapeGeometry(shape);
}

// Terrain with a lake-shaped hole so the lakebed and fish stay visible under the water.
function makeGroundGeometry() {
  const shape = new THREE.Shape([
    new THREE.Vector2(-55, -39.5),
    new THREE.Vector2(55, -39.5),
    new THREE.Vector2(55, 45.5),
    new THREE.Vector2(-55, 45.5),
  ]);
  shape.holes.push(new THREE.Path(edgePoints(0.15).reverse()));
  return new THREE.ShapeGeometry(shape);
}

// Subtle wave streaks multiplied over the water color; offset scrolls each frame.
function makeWaterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f2f8f9";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i += 1) {
    const y = jitter(i + 1) * 256;
    const x = jitter(i + 50) * 256;
    const w = 24 + jitter(i + 100) * 56;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(255,255,255,0.32)" : "rgba(170,200,212,0.22)";
    ctx.lineWidth = 1 + jitter(i + 150) * 1.2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x, y + 4, x + w / 2, y);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 3);
  return texture;
}

// Soft cloud shadows: white blobs on clear, tinted dark by the material; each blob is drawn wrapped so the tile repeats seamlessly.
function makeCloudShadowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  for (const blob of cloudBlobs()) {
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        const x = (blob.x + dx) * size;
        const y = (blob.y + dy) * size;
        const r = blob.r * size;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, blob.squash);
        const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        fill.addColorStop(0, "rgba(255,255,255,1)");
        fill.addColorStop(0.55, "rgba(255,255,255,0.7)");
        fill.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.3, 1);
  return texture;
}

// Faint dappled layer scrolled opposite the wave streaks for extra surface life.
function makeWaterDetailTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  for (let i = 0; i < 30; i += 1) {
    const x = jitter(i + 400) * 128;
    const y = jitter(i + 440) * 128;
    const r = 6 + jitter(i + 480) * 14;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.16)" : "rgba(150,190,205,0.14)";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 4);
  return texture;
}

function makeSkyTexture(bottom: string, mid: string, top: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 256, 0, 0);
  gradient.addColorStop(0, bottom);
  gradient.addColorStop(0.42, mid);
  gradient.addColorStop(1, top);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Sky({ hour, weather, moon }: { hour: LakeHour; weather: WeatherLook; moon: number }) {
  const look = LAKE_HOUR_LOOK[hour];
  const texture = useMemo(() => makeSkyTexture(...weather.sky), [weather.sky]);
  useEffect(() => () => texture.dispose(), [texture]);
  // The bloom stand-in: a wide soft additive halo, drawn on full effects only.
  const full = useSettings().particles === "full";
  const halo = useMemo(() => makeSoftSpotTexture(0.12), []);
  useEffect(() => () => halo.dispose(), [halo]);
  const night = hour === "night";
  // The night disc shows the real moon's face; the phase barely moves in a visit, so it is drawn once.
  const face = useMemo(() => (night ? moonTexture(moon) : null), [night, moon]);
  useEffect(() => () => face?.dispose(), [face]);
  return (
    <>
      <mesh scale={90}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} />
      </mesh>
      {weather.sunOut && (
        <mesh position={look.discPos}>
          {face ? <planeGeometry args={[8.4, 8.4]} /> : <circleGeometry args={[5.5, 24]} />}
          <meshBasicMaterial color={look.disc} map={face} transparent={face !== null} depthWrite={face === null} fog={false} />
        </mesh>
      )}
      <mesh position={[look.discPos[0], look.discPos[1], look.discPos[2] + 0.2]}>
        <circleGeometry args={[hour === "night" ? 7 : 9, 24]} />
        <meshBasicMaterial
          color={look.glow}
          transparent
          opacity={(hour === "night" ? 0.22 : 0.35) * (weather.sunOut ? 1 : 0.5) * weather.discGlow}
          fog={false}
        />
      </mesh>
      {full && (
        <mesh position={[look.discPos[0], look.discPos[1], look.discPos[2] + 0.4]}>
          <circleGeometry args={[hour === "night" ? 13 : 19, 32]} />
          <meshBasicMaterial
            map={halo}
            color={look.glow}
            transparent
            opacity={(hour === "night" ? 0.3 : 0.55) * (weather.sunOut ? 1 : 0.35) * weather.discGlow}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      )}
    </>
  );
}

const CLOUDS: { y: number; z: number; scale: number; speed: number; offset: number }[] = [
  { y: 17, z: -38, scale: 1, speed: 0.32, offset: 0 },
  { y: 21, z: -28, scale: 1.5, offset: 30, speed: 0.24 },
  { y: 14.5, z: -47, scale: 0.8, offset: 55, speed: 0.42 },
  { y: 19, z: -34, scale: 1.2, offset: 72, speed: 0.28 },
];

function Cloud({ y, z, scale, speed, offset, color }: (typeof CLOUDS)[number] & { color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.x = ((state.clock.elapsedTime * speed + offset) % 110) - 55;
  });
  return (
    <group ref={ref} position={[0, y, z]} scale={scale}>
      <mesh position={[0, 0, 0]} scale={[2.6, 1.1, 1.6]}>
        <sphereGeometry args={[1, 10, 7]} />
        <meshBasicMaterial color={color} fog={false} />
      </mesh>
      <mesh position={[1.9, 0.35, 0.2]} scale={[1.5, 0.85, 1.2]}>
        <sphereGeometry args={[1, 9, 6]} />
        <meshBasicMaterial color={color} fog={false} />
      </mesh>
      <mesh position={[-1.8, 0.2, -0.3]} scale={[1.3, 0.7, 1]}>
        <sphereGeometry args={[1, 9, 6]} />
        <meshBasicMaterial color={color} fog={false} />
      </mesh>
    </group>
  );
}

function LakeSurface({
  spot,
  hour,
  sky,
  season,
  weather,
  wind,
}: {
  spot: SpotId;
  hour: LakeHour;
  sky: WeatherSky;
  season: LakeSeason;
  weather: WeatherLook;
  wind: { x: number; z: number };
}) {
  const material = useRef<THREE.MeshToonMaterial>(null);
  const glintA = useRef<THREE.MeshBasicMaterial>(null);
  const glintB = useRef<THREE.MeshBasicMaterial>(null);
  const geometry = useMemo(() => makeWaveSurface(LAKE_RX, LAKE_RZ), []);
  const bedGeometry = useMemo(() => makeBedSurface(LAKE_RX + 0.35, LAKE_RZ + 0.35), []);
  const waterMap = useMemo(() => makeWaterTexture(), []);
  const detailMap = useMemo(() => makeWaterDetailTexture(), []);
  const cloudMap = useMemo(() => makeCloudShadowTexture(), []);
  const causticGeometry = useMemo(() => makeCausticGeometry(bedGeometry), [bedGeometry]);
  const causticA = useMemo(() => makeCausticTexture(), []);
  const causticB = useMemo(() => {
    const texture = causticA.clone();
    texture.repeat.set(0.8, 0.8);
    texture.needsUpdate = true;
    return texture;
  }, [causticA]);
  const rimColor = useMemo(() => ({ value: new THREE.Color() }), []);
  rimColor.value.set(weather.sky[1]);
  const withRim = useMemo(() => (shader: { uniforms: Record<string, THREE.IUniform>; fragmentShader: string }) => addWaterRim(shader, rimColor), [rimColor]);
  const caustics = sunCaustics(weather, LAKE_HOUR_LOOK[hour].sun, season);
  // The bank's mirror image is a repaint and one more layer over the lake: full effects only.
  const mirror = useSettings().particles === "full" ? bankMirrorStrength(hour, sky, wind) : 0;
  const pollen = pollenAmount(season, sky);
  const duckweed = duckweedAmount(season);
  const mirrorHills = useMemo<MirrorHill[]>(
    () => HILLS.map((hill) => ({ position: hill.position, scale: hill.scale, color: hillColor(hill, hour, season, sky) })),
    [hour, season, sky],
  );
  const scroll = surfaceScroll(wind);
  const clouds = cloudScroll(wind);
  const cloudShade = cloudShadowStrength(hour, sky);

  useEffect(() => {
    return () => {
      geometry.dispose();
      bedGeometry.dispose();
      waterMap.dispose();
      detailMap.dispose();
      cloudMap.dispose();
      causticGeometry.dispose();
      causticA.dispose();
      causticB.dispose();
    };
  }, [geometry, bedGeometry, waterMap, detailMap, cloudMap, causticGeometry, causticA, causticB]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    displaceWater(geometry, t);
    // The streaks and dapple run downwind, faster on a windier day.
    waterMap.offset.x += delta * scroll.streak.x;
    waterMap.offset.y += delta * scroll.streak.y;
    detailMap.offset.x += delta * scroll.detail.x;
    detailMap.offset.y += delta * scroll.detail.y;
    cloudMap.offset.x += delta * clouds.x;
    cloudMap.offset.y += delta * clouds.y;
    // Two nets drifting across each other, so the light shifts instead of sliding.
    causticA.offset.x += delta * 0.045;
    causticA.offset.y += delta * 0.02;
    causticB.offset.x -= delta * 0.03;
    causticB.offset.y += delta * 0.038;
    if (material.current) material.current.opacity = 0.8 + Math.sin(t * 0.45) * 0.02;
    if (glintA.current) glintA.current.opacity = weather.glint * (0.14 + Math.sin(t * 0.65) * 0.05);
    if (glintB.current) glintB.current.opacity = weather.glint * (0.1 + Math.sin(t * 0.52 + 2) * 0.04);
  });

  return (
    <group position={[0, 0, LAKE_CENTER_Z]}>
      <mesh geometry={bedGeometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshToonMaterial color="#ffffff" vertexColors gradientMap={toonRamp()} />
      </mesh>
      {/* Drawn after the water, so the shallows' light isn't dimmed by the surface over it. */}
      {caustics.opacity > 0.05 &&
        [causticA, causticB].map((map, i) => (
          <mesh key={i} geometry={causticGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} renderOrder={2}>
            <meshBasicMaterial
              map={map}
              color={caustics.color}
              vertexColors
              transparent
              opacity={caustics.opacity}
              // Fog would tint the masked-off deep bed, and additive blending would add that tint as light.
              fog={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshToonMaterial
          ref={material}
          onBeforeCompile={withRim}
          customProgramCacheKey={rimCacheKey}
          color={seasonWaterColor(spot === "dropoff" ? weather.waterDrop : weather.water, season)}
          map={waterMap}
          vertexColors
          gradientMap={toonRamp()}
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <meshBasicMaterial map={detailMap} transparent opacity={0.07} depthWrite={false} />
      </mesh>
      {mirror > 0.02 && <BankMirror geometry={geometry} trees={MIRROR_TREES} hills={mirrorHills} season={season} hour={hour} strength={mirror} />}
      {duckweed > 0 && <DuckweedFilm geometry={geometry} wind={wind} hour={hour} amount={duckweed} />}
      {pollen > 0 && <PollenFilm geometry={geometry} wind={wind} hour={hour} amount={pollen} />}
      {foamLanesAmount(Math.hypot(wind.x, wind.z)) > 0 && <FoamLanes geometry={geometry} wind={wind} hour={hour} />}
      {shoreIce(season) && <ShoreIceFilm geometry={geometry} hour={hour} />}
      {cloudShade > 0 && (
        <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <meshBasicMaterial color="#0b1a22" alphaMap={cloudMap} transparent opacity={cloudShade} depthWrite={false} />
        </mesh>
      )}
      <ShoreWash wind={wind} opacity={foamOpacity(hour, season)} />
      <mesh position={[-5, 0.035, 1]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.8, 0.55, 1]}>
        <ringGeometry args={[2.4, 2.48, 64]} />
        <meshBasicMaterial ref={glintA} color="#e3f0ec" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      <mesh position={[7, 0.038, -4]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.5, 0.42, 1]}>
        <ringGeometry args={[3.2, 3.3, 64]} />
        <meshBasicMaterial ref={glintB} color="#d8eae6" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Hill({ position, scale, color }: { position: Vec3; scale: Vec3; color: string }) {
  return (
    <mesh position={position} scale={scale} castShadow={false}>
      <icosahedronGeometry args={[1, 2]} />
      <meshToonMaterial color={color} gradientMap={toonRamp()} />
    </mesh>
  );
}

type RockSpec = { position: Vec3; scale: Vec3; rotation?: number };

export function rockMatrix({ position, scale, rotation = 0 }: RockSpec) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, rotation, -0.08)),
    new THREE.Vector3(...scale),
  );
}

/** A cluster of grey rocks: all one shape, so the cluster is one instanced draw (and one shadow draw). */
function Rocks({ items }: { items: readonly RockSpec[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const rocks = mesh.current;
    if (!rocks) return;
    items.forEach((item, i) => rocks.setMatrixAt(i, rockMatrix(item)));
    rocks.instanceMatrix.needsUpdate = true;
    // Culling and shadow passes cache the first bounds three computes, which may predate these matrices.
    rocks.computeBoundingBox();
    rocks.computeBoundingSphere();
  }, [items]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshToonMaterial color="#75796f" gradientMap={toonRamp()} />
    </instancedMesh>
  );
}

const DROPOFF_ROCKS: RockSpec[] = [
  { position: [DROPOFF_PAD.x - 0.8, 0.4, DROPOFF_PAD.z + 0.6], scale: [1.3, 0.7, 1], rotation: 0.4 },
  { position: [DROPOFF_PAD.x + 0.9, 0.32, DROPOFF_PAD.z - 0.3], scale: [0.9, 0.5, 0.75], rotation: 1.6 },
];

const LAKE_ROCKS: RockSpec[] = [
  // In the shallows, off the shore line the inlet walk follows.
  { position: [-15.6, 0.3, 5.4], scale: [1.2, 0.6, 0.9], rotation: 0.3 },
  { position: [16.2, 0.5, 3.5], scale: [1.4, 0.85, 1.1], rotation: 1.1 },
  { position: [12.8, 0.3, -12.7], scale: [1.1, 0.55, 0.8], rotation: 0.7 },
  { position: [-14.8, 0.35, -10.9], scale: [1.2, 0.6, 0.9], rotation: 1.8 },
  { position: [19.6, 0.28, -6.4], scale: [0.9, 0.5, 0.7], rotation: 2.6 },
  // The cormorant's rock, just breaking the surface out in the far water.
  { position: [CORMORANT_ROCK.x, 0.02, CORMORANT_ROCK.z], scale: [0.75, 0.38, 0.6], rotation: 0.9 },
];

const CREEK_ROCK_SPECS: RockSpec[] = CREEK_ROCKS.map((rock) => ({ position: [rock.x, rock.scale[1] * 0.45, rock.z], scale: rock.scale, rotation: rock.rot }));

/** A lily flower (or, in spring, a bud) sitting on its pad, about the size of a fist. */
function LilyFlower({ bloom, color, open }: { bloom: Exclude<Bloom, null>; color: string; open: number }) {
  const cup = useRef<THREE.Group>(null);
  const still = useReducedMotion();
  const shown = useRef(open);
  useFrame((_, delta) => {
    const flower = cup.current;
    if (!flower) return;
    // The flower eases open and shut as the hour and the weather turn.
    shown.current = still ? open : easeLily(shown.current, open, delta);
    const shape = lilyCup(shown.current);
    flower.scale.set(shape.spread, shape.rise, shape.spread);
  });
  if (bloom === "bud") {
    return (
      <mesh position={[0, 0.07, 0]} scale={[0.045, 0.08, 0.045]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshToonMaterial color="#9fb86a" gradientMap={toonRamp()} />
      </mesh>
    );
  }
  return (
    <group position={[0, 0.03, 0]}>
      <group ref={cup}>
        <mesh geometry={sharedLilyPetals()}>
          <meshToonMaterial color={color} gradientMap={toonRamp()} />
        </mesh>
      </group>
      <mesh position={[0, 0.04, 0]} scale={[0.03, 0.022, 0.03]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshToonMaterial color={LILY_HEART} gradientMap={toonRamp()} />
      </mesh>
    </group>
  );
}

function FloatingLily({ url, position, scale, index, open }: Lily & { index: number; open: number }) {
  const ref = useRef<THREE.Group>(null);
  const season = useContext(SeasonContext);
  const bloom = lilyBloom(season);
  const pads = lilyPads(season);
  useFrame((state) => {
    const lily = ref.current;
    if (!lily) return;
    const t = state.clock.elapsedTime;
    const y = waterHeight(position[0], position[2], t);
    const sample = 0.5;
    lily.position.set(position[0], position[1] + y, position[2]);
    lily.rotation.x = THREE.MathUtils.clamp((waterHeight(position[0], position[2] + sample, t) - y) * 1.3, -0.28, 0.28);
    lily.rotation.z = THREE.MathUtils.clamp((y - waterHeight(position[0] + sample, position[2], t)) * 1.3, -0.28, 0.28);
  });
  if (!pads) return null;
  return (
    <group ref={ref} position={position}>
      <ToonModel url={url} scale={scale * pads.grow} shadows={false} plant={{ season, kind: "grass", variant: 0.5 }} />
      {bloom && (
        // Drawn a little large so the flowers read from the bank.
        <group position={[0.12 * scale, 0, 0.08 * scale]} scale={scale * 1.8}>
          <LilyFlower bloom={bloom} color={LILY_PETALS[index % LILY_PETALS.length]!} open={open} />
        </group>
      )}
    </group>
  );
}

function Boat({ url, position, heading, delay, scale, wind, fill }: BoatProps & { wind: { x: number; z: number }; fill: FillKind | null }) {
  const ref = useRef<THREE.Group>(null);
  const still = useReducedMotion();
  useFrame((state) => {
    const boat = ref.current;
    if (!boat) return;
    const t = state.clock.elapsedTime + delay;
    const y = waterHeight(position[0], position[2], t);
    const sample = 0.75;
    boat.position.y = position[1] + y;
    boat.rotation.x = THREE.MathUtils.clamp((waterHeight(position[0], position[2] + sample, t) - y) * 1.15, -0.2, 0.2);
    boat.rotation.z = THREE.MathUtils.clamp((y - waterHeight(position[0] + sample, position[2], t)) * 1.15, -0.2, 0.2);
    // Moored by the bow, it swings head to wind.
    boat.rotation.y = boatHeading(heading, wind, state.clock.elapsedTime, delay, still);
  });
  return (
    <group ref={ref} position={position} rotation={[0, heading, 0]}>
      <ToonModel url={url} scale={scale} shadows={false} />
      {fill && <BoatFill url={url} scale={scale} kind={fill} seed={delay * 10} across={url === MODELS.rowboat ? ROWBOAT_HULL : undefined} />}
    </group>
  );
}

function SwimmingFish({ points, speed, phase, size, color, accent, species }: FishProps) {
  const build = useMemo(() => fishBuild(species), [species]);
  const ref = useRef<THREE.Group>(null);
  const bank = useRef<THREE.Group>(null);
  const ripple = useRef<THREE.Group>(null);
  const rippleMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), true, "catmullrom", 0.35), [points]);
  const position = useMemo(() => new THREE.Vector3(), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const fish = ref.current;
    if (!fish) return;
    const time = state.clock.elapsedTime;
    const t = (time * speed + phase) % 1;
    curve.getPointAt(t, position);
    // Heading from a small look-ahead; getTangentAt allocates internally.
    curve.getPointAt((t + 0.01) % 1, tangent).sub(position);
    // Keep the whole fish body between the surface and the bed.
    const half = 0.34 * size;
    const surface = waterHeight(position.x, position.z, time);
    position.y = THREE.MathUtils.clamp(
      position.y + Math.sin(time * 0.9 + phase * 20) * 0.05,
      -1 + half,
      surface - 0.07 - half,
    );
    fish.position.copy(position);
    const target = Math.atan2(tangent.x, tangent.z);
    const turn = Math.atan2(Math.sin(target - fish.rotation.y), Math.cos(target - fish.rotation.y));
    fish.rotation.y += turn * (1 - Math.exp(-5 * delta));
    if (bank.current) {
      const targetBank = THREE.MathUtils.clamp(-turn * 0.7, -0.22, 0.22);
      bank.current.rotation.z = THREE.MathUtils.damp(bank.current.rotation.z, targetBank, 7, delta);
    }
    if (ripple.current && rippleMaterial.current) {
      // Ripple stays on the water surface above the fish; child y compensates group y and scale.
      ripple.current.position.y = (surface + 0.03 - position.y) / size;
      const pulse = (time * 0.55 + phase) % 1;
      ripple.current.scale.setScalar((0.7 + pulse * 1.9) / size);
      rippleMaterial.current.opacity = (1 - pulse) * 0.16;
    }
  });

  return (
    <group ref={ref} scale={size}>
      <group ref={bank}>
        <ArticulatedFish color={color} accent={accent} phase={phase * 10} speed={0.85 + speed * 8} build={build} />
      </group>
      <group ref={ripple}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.58, 24]} />
          <meshBasicMaterial ref={rippleMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function SunGlitter({ discPos }: { discPos: Vec3 }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 0.28), []);
  const materials = useMemo(
    () =>
      [0, 1, 2].map(
        () =>
          new THREE.MeshBasicMaterial({
            color: "#fdf3d3",
            transparent: true,
            opacity: 0.1,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
      ),
    [],
  );
  const [dx, , dz] = discPos;
  // Laid from the eye, so the glitter runs toward the sun from whichever bank you stand on.
  const road = useRef<{ eye: { x: number; y: number; z: number } | null; bands: ReturnType<typeof glitterQuads>[]; angle: number }>({ eye: null, bands: [], angle: 0 });
  useEffect(() => {
    road.current.eye = null;
  }, [dx, dz]);
  const helper = useMemo(() => new THREE.Object3D(), []);
  const meshes = useRef<Array<THREE.InstancedMesh | null>>([]);
  useEffect(() => {
    return () => {
      geometry.dispose();
      materials.forEach((material) => material.dispose());
    };
  }, [geometry, materials]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const eye = state.camera.position;
    if (mirrorStale(road.current.eye, eye, ROAD_RELAY)) {
      const from = roadFrom(eye);
      road.current = {
        eye: { x: eye.x, y: eye.y, z: eye.z },
        bands: roadBands(glitterQuads(from, [dx, 0, dz]), GLITTER_BANDS),
        angle: Math.atan2(-(dz - from.z), dx - from.x),
      };
    }
    helper.rotation.set(-Math.PI / 2, 0, road.current.angle);
    for (let i = 0; i < materials.length; i += 1) {
      materials[i]!.opacity = 0.04 + (Math.sin(t * (0.9 + i * 0.33) + i * 2.1) * 0.5 + 0.5) * 0.09;
      const mesh = meshes.current[i];
      const quads = road.current.bands[i];
      if (!mesh || !quads) continue;
      mesh.count = quads.length;
      quads.forEach((quad, j) => {
        helper.position.set(quad.x, waterHeight(quad.x, quad.z, t) + 0.07, quad.z);
        helper.scale.setScalar(quad.scale);
        helper.updateMatrix();
        mesh.setMatrixAt(j, helper.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  });
  return materials.map((material, i) => (
    <instancedMesh
      key={i}
      args={[geometry, material, Math.ceil(GLITTER_QUADS / GLITTER_BANDS)]}
      frustumCulled={false}
      ref={(mesh) => {
        meshes.current[i] = mesh;
      }}
    />
  ));
}

function Bird({ position, phase, flap }: { position: Vec3; phase: number; flap: number }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  useFrame((state) => {
    const f = Math.sin(state.clock.elapsedTime * flap + phase) * 0.55 + 0.15;
    if (left.current) left.current.rotation.z = f;
    if (right.current) right.current.rotation.z = -f;
  });
  return (
    <group position={position}>
      <group ref={left}>
        <mesh geometry={WING_GEOMETRY} material={BIRD_MATERIAL} />
      </group>
      <group ref={right} scale={[-1, 1, 1]}>
        <mesh geometry={WING_GEOMETRY} material={BIRD_MATERIAL} />
      </group>
    </group>
  );
}

function BirdFlock({ y, z, speed, offset, dir, birds }: FlockProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.x = dir * (((state.clock.elapsedTime * speed + offset) % 110) - 55);
  });
  return (
    <group ref={ref} position={[0, y, z]} rotation={[0, Math.PI / 2, 0]}>
      {birds.map((position, i) => (
        <Bird key={i} position={position} phase={i * 1.9} flap={6.5 + (i % 3) * 0.7} />
      ))}
    </group>
  );
}

function Duck({ points, speed, phase, body, head, brood = false }: DuckProps) {
  const ref = useRef<THREE.Group>(null);
  const season = useContext(SeasonContext);
  const showBrood = brood && ducklingsOut(season);
  const ducklings = useRef<Array<THREE.Group | null>>([]);
  const chick = useMemo(() => new THREE.Vector3(), []);
  const chickAhead = useMemo(() => new THREE.Vector3(), []);
  const nextPeep = useRef(DUCKLING_PEEP_MIN);
  const ripple = useRef<THREE.Group>(null);
  const rippleMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const leftWing = useRef<THREE.Group>(null);
  const rightWing = useRef<THREE.Group>(null);
  const flush = useRef<DuckState>({ mode: "paddling" });
  const still = useReducedMotion();
  const shapes = useMemo(
    () => ({
      duck: duckShape(body, head),
      duckling: ducklingShape(),
      wing: new THREE.BoxGeometry(1, 1, 1),
      painted: new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }),
      feathers: new THREE.MeshToonMaterial({ color: body, gradientMap: toonRamp() }),
    }),
    [body, head],
  );
  useEffect(
    () => () => {
      Object.values(shapes).forEach((thing) => thing.dispose());
    },
    [shapes],
  );
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), true, "catmullrom", 0.4), [points]);
  const position = useMemo(() => new THREE.Vector3(), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const duck = ref.current;
    if (!duck) return;
    const t = (state.clock.elapsedTime * speed + phase) % 1;
    curve.getPointAt(t, position);
    // Heading from a small look-ahead; getTangentAt allocates internally.
    curve.getPointAt((t + 0.01) % 1, tangent).sub(position);
    const time = state.clock.elapsedTime;
    const floatY = waterHeight(position.x, position.z, time) + 0.08;
    // A cast landing close sends the duck off; it keeps its place on the loop while away.
    const now = stepDuck(flush.current, time, position, lastSplash);
    flush.current = now;
    const flight =
      now.mode === "flushed" ? duckFlush(time - now.since, now.from, now.dir) : now.mode === "returning" ? duckReturn(time - now.since, position, now.dir) : null;
    duck.visible = now.mode !== "away";
    const flying = flight !== null;
    // The ducklings paddle in her wake, peeping now and then; when she is flushed they hide in the reeds until she is back.
    if (showBrood && now.mode === "paddling" && time >= nextPeep.current) {
      fx.peep();
      nextPeep.current = time + DUCKLING_PEEP_MIN + Math.random() * DUCKLING_PEEP_SPREAD;
    }
    ducklings.current.forEach((duckling, k) => {
      if (!duckling) return;
      duckling.visible = now.mode === "paddling";
      if (!duckling.visible) return;
      const { along, weave } = ducklingAt(t, k, time);
      curve.getPointAt(along, chick);
      curve.getPointAt((along + 0.01) % 1, chickAhead).sub(chick);
      const yaw = Math.atan2(chickAhead.x, chickAhead.z);
      duckling.position.set(chick.x + Math.cos(yaw) * weave, waterHeight(chick.x, chick.z, time) + 0.04 + Math.sin(time * 2.6 + k) * 0.01, chick.z - Math.sin(yaw) * weave);
      duckling.rotation.y = yaw;
    });
    if (leftWing.current) leftWing.current.visible = flying;
    if (rightWing.current) rightWing.current.visible = flying;
    if (ripple.current) ripple.current.visible = !flying;
    if (flight) {
      duck.position.set(flight.x, floatY + flight.y, flight.z);
      duck.rotation.y = flight.yaw;
      duck.rotation.x = 0;
      if (leftWing.current) leftWing.current.rotation.z = 0.2 + flight.flap * 0.7;
      if (rightWing.current) rightWing.current.rotation.z = -0.2 - flight.flap * 0.7;
      return;
    }
    // Up-ended to feed, it sinks its front and points its tail at the sky; the yaw comes first so the tip is about its own shoulders.
    const tip = dabble(time, phase, still);
    position.y = floatY + Math.sin(time * 1.3 + phase * 9) * 0.015 - tip * 0.1;
    duck.position.copy(position);
    const target = Math.atan2(tangent.x, tangent.z);
    const turn = Math.atan2(Math.sin(target - duck.rotation.y), Math.cos(target - duck.rotation.y));
    duck.rotation.order = "YXZ";
    duck.rotation.y += turn * (1 - Math.exp(-4 * delta));
    duck.rotation.x = tip * DABBLE_TIP;
    if (ripple.current && rippleMaterial.current) {
      const pulse = (state.clock.elapsedTime * 0.5 + phase) % 1;
      ripple.current.scale.setScalar(0.7 + pulse * 1.6);
      rippleMaterial.current.opacity = (1 - pulse) * 0.14;
    }
  });

  return (
    <>
      {showBrood &&
        Array.from({ length: DUCKLING_COUNT }, (_, k) => (
          <group
            key={k}
            ref={(duckling) => {
              ducklings.current[k] = duckling;
            }}
          >
            <mesh geometry={shapes.duckling} material={shapes.painted} castShadow={false} />
          </group>
        ))}
      <group ref={ref} name="duck">
        <mesh geometry={shapes.duck} material={shapes.painted} castShadow={false} />
        {/* Wings only show in flight, hinged at the shoulders. */}
        <group ref={leftWing} position={[0.12, 0.14, 0.02]} visible={false}>
          <mesh geometry={shapes.wing} material={shapes.feathers} position={[0.17, 0, 0]} scale={[0.34, 0.025, 0.16]} castShadow={false} />
        </group>
        <group ref={rightWing} position={[-0.12, 0.14, 0.02]} visible={false}>
          <mesh geometry={shapes.wing} material={shapes.feathers} position={[-0.17, 0, 0]} scale={[0.34, 0.025, 0.16]} castShadow={false} />
        </group>
        <group ref={ripple} position={[0, -0.02, -0.18]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.32, 0.38, 24]} />
            <meshBasicMaterial ref={rippleMaterial} color="#dcebe7" transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </group>
    </>
  );
}

/** One dragonfly hunting a reed bed: hovers, darts to the next spot; motion lives in dragonflies.ts. */
function Dragonfly({ index }: { index: number }) {
  const ref = useRef<THREE.Group>(null);
  const still = useReducedMotion();
  const wingMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#e6f1f2", transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }),
    [],
  );
  useEffect(() => () => wingMaterial.dispose(), [wingMaterial]);
  useFrame((state, delta) => {
    const group = ref.current;
    if (!group) return;
    const time = state.clock.elapsedTime;
    const pose = dragonfly(index, time, still);
    group.position.set(pose.x, pose.y, pose.z);
    // Turn fast but not instantly, so a dart starts with a visible snap of the body.
    const turn = Math.atan2(Math.sin(pose.yaw - group.rotation.y), Math.cos(pose.yaw - group.rotation.y));
    group.rotation.y += turn * (1 - Math.exp(-25 * delta));
    wingMaterial.opacity = 0.18 + (Math.sin(time * 34 + index) * 0.5 + 0.5) * 0.16;
  });
  return (
    <group ref={ref}>
      {/* Body along +z, the way the pose's yaw faces. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow={false}>
        <capsuleGeometry args={[0.02, 0.3, 3, 6]} />
        <meshToonMaterial color="#3d6f78" gradientMap={toonRamp()} />
      </mesh>
      <mesh material={wingMaterial} position={[0, 0.03, 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.42, 0.09]} />
      </mesh>
      <mesh material={wingMaterial} position={[0, 0.03, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.34, 0.08]} />
      </mesh>
    </group>
  );
}

type BankPlank = { board: BankBoard; index: number };

function bankPlankBatches() {
  const batches = new Map<string, BankPlank[]>();
  BANK_BOARDS.forEach((board, index) => {
    const colors = board.kind === "stand" ? BANK_STAND_PLANK : BANK_WALK_PLANK;
    const color = colors[index % 2];
    const batch = batches.get(color);
    const plank = { board, index };
    if (batch) batch.push(plank);
    else batches.set(color, [plank]);
  });
  return [...batches].map(([color, planks]) => ({ color, planks }));
}

export const BANK_PLANK_BATCHES = bankPlankBatches();

/** Matrix for one board; unit geometry keeps all planks in four draw calls. */
export function bankPlankMatrix(board: BankBoard, index: number) {
  const stand = board.kind === "stand";
  const y = BANK_TOP - BANK_THICK / 2 + (stand ? BANK_STAND_LIFT : 0) + (index % 2) * 0.001;
  return new THREE.Matrix4().compose(
    new THREE.Vector3(board.x, y, board.z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, board.yaw, 0)),
    new THREE.Vector3(board.halfX * 2, BANK_THICK, board.halfZ * 2),
  );
}

export function placeBankPlanks(mesh: THREE.InstancedMesh, planks: readonly BankPlank[]) {
  planks.forEach(({ board, index }, instance) => mesh.setMatrixAt(instance, bankPlankMatrix(board, index)));
  mesh.instanceMatrix.needsUpdate = true;
  // Culling and shadow passes cache the first bounds three computes, which may predate these matrices.
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
}

function BankPlanks({ color, planks }: { color: string; planks: readonly BankPlank[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (mesh.current) placeBankPlanks(mesh.current, planks);
  }, [planks]);

  // R3F disposes child geometry and material on unmount; an effect cleanup would also fire on StrictMode's dev replay.
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, planks.length]} castShadow receiveShadow>
      <boxGeometry />
      <meshToonMaterial color={color} gradientMap={toonRamp()} />
    </instancedMesh>
  );
}

/** The lantern posts at the three bank stands, baked into one shape: one draw and one shadow caster. */
export function bankPostShape() {
  return mergeParts(BANK_POSTS.map((post) => ({ geometry: new THREE.BoxGeometry(0.16, 1.04, 0.16), position: [post.x, 0.52, post.z] as const })));
}

function BankPosts() {
  const shape = useMemo(bankPostShape, []);
  useEffect(() => () => shape.dispose(), [shape]);
  return (
    <mesh geometry={shape} castShadow>
      <meshToonMaterial color={BANK_POST} gradientMap={toonRamp()} />
    </mesh>
  );
}

function BankWalks() {
  return (
    <group>
      {BANK_PLANK_BATCHES.map(({ color, planks }) => (
        <BankPlanks key={color} color={color} planks={planks} />
      ))}
      <BankPosts />
    </group>
  );
}

/** Matrix for one pier board; unit geometry keeps the deck in two draw calls, one per plank colour. */
export function pierPlankMatrix(index: number) {
  const board = PIER_BOARDS[index]!;
  return new THREE.Matrix4().compose(
    new THREE.Vector3(board.x, PIER_TOP - PIER_THICK / 2 + (index % 2) * 0.001, board.z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, board.yaw, 0)),
    new THREE.Vector3(board.halfX * 2, PIER_THICK, board.halfZ * 2),
  );
}

/** Board indices for each of the two plank colours, alternating as they always have. */
export const PIER_PLANK_BATCHES = [0, 1].map((parity) => PIER_BOARDS.map((_, i) => i).filter((i) => i % 2 === parity));

function PierPlanks({ color, boards }: { color: THREE.Color; boards: readonly number[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const deck = mesh.current;
    if (!deck) return;
    boards.forEach((index, instance) => deck.setMatrixAt(instance, pierPlankMatrix(index)));
    deck.instanceMatrix.needsUpdate = true;
    deck.computeBoundingBox();
    deck.computeBoundingSphere();
  }, [boards]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, boards.length]} castShadow receiveShadow>
      <boxGeometry />
      <meshToonMaterial color={color} gradientMap={toonRamp()} />
    </instancedMesh>
  );
}

function PierDeck({ shade, pale }: { shade: number; pale: number }) {
  return PIER_PLANK_BATCHES.map((boards, parity) => (
    <PierPlanks
      key={parity}
      boards={boards}
      color={new THREE.Color(PIER_PLANK[parity]).multiplyScalar(shade).lerp(new THREE.Color(FROST_COLOR), pale)}
    />
  ));
}

/** The pier and its planks; rain soaks the wood darker (`wet`), and frost or snow pales the walkway (`pale`). */
function Dock({ wet, pale }: { wet: boolean; pale: number }) {
  const shade = wet ? WET_SHADE : 1;
  return (
    <group>
      {BRIDGE_SPANS.map((z) => (
        <ToonModel key={z} url={MODELS.bridge} position={[0, 0, z]} rotation={[0, Math.PI / 2, 0]} scale={BRIDGE_SCALE} shade={shade} />
      ))}
      <PierDeck shade={shade} pale={pale} />
      <ToonModel url={MODELS.platform} position={[0, 0, 7.9]} scale={1.55} shade={shade} />
      <ToonModel url={MODELS.log} position={[1.35, 0.12, 7.2]} rotation={[0, 0.5, 0]} scale={1.1} shade={shade} />
      <ToonModel url={MODELS.paddle} position={[-1, 0.18, 7.05]} rotation={[0.15, 0.6, 1.15]} scale={1.25} shade={shade} />
    </group>
  );
}

function Shack() {
  return (
    <group position={[SHOP_X, 0, SHOP_Z]}>
      <ToonModel url={MODELS.grassPlat} position={[0, 0, 0]} scale={2.2} />
      <ToonModel url={MODELS.platform} position={[0, 0.02, -0.2]} scale={1.7} />
      <ToonModel url={MODELS.log} position={[-0.85, 0.22, 0.55]} rotation={[0, 1.2, 0]} scale={1.15} />
      <ToonModel url={MODELS.log} position={[0.9, 0.22, 0.45]} rotation={[0, -0.4, 0]} scale={1.05} />
      <ToonModel url={MODELS.log} position={[0.1, 0.38, -0.7]} rotation={[0, 0.2, 0]} scale={1.3} />
      <ToonModel url={MODELS.paddle} position={[-1.15, 0.7, 0.1]} rotation={[0.2, 0.4, 1.2]} scale={1.4} />
      <ToonModel url={MODELS.bushDetailed} position={[1.8, 0, -1.1]} scale={1.4} shadows={false} sitOnGround />
    </group>
  );
}

function ShorePath() {
  return (
    <group>
      <ToonModel url={MODELS.path} position={[-6.2, 0.02, 11.2]} rotation={[0, 1.2, 0]} scale={1.55} />
      <ToonModel url={MODELS.path} position={[-9.8, 0.02, 10.4]} rotation={[0, 0.9, 0]} scale={1.5} />
      <ToonModel url={MODELS.path} position={[8.4, 0.02, 11]} rotation={[0, -1.05, 0]} scale={1.5} />
      <ToonModel url={MODELS.path} position={[12.2, 0.02, 9.6]} rotation={[0, -0.85, 0]} scale={1.45} />
      <ToonModel url={MODELS.log} position={[REEDS_PAD.x + 1.1, 0.12, REEDS_PAD.z + 0.4]} rotation={[0, 0.8, 0]} scale={1.05} />
      <ToonModel url={MODELS.log} position={[POINT_PAD.x + 1.15, 0.12, POINT_PAD.z + 0.35]} rotation={[0, -0.4, 0]} scale={1.05} />
      <Rocks items={DROPOFF_ROCKS} />
    </group>
  );
}

// Lengthwise streaks; V runs along the creek so scrolling it reads as flow.
function makeCreekTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f2f8f9";
  ctx.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 14; i += 1) {
    const x = 6 + jitter(i + 600) * 52;
    const y = jitter(i + 640) * 128;
    const len = 18 + jitter(i + 680) * 30;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(255,255,255,0.9)" : "rgba(180,210,214,0.75)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (jitter(i + 720) - 0.5) * 4, y + len);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function ribbonGeometry(halfWidth: number) {
  const { positions, uvs, indices } = creekRibbon(halfWidth);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** The creek that feeds the inlet: a muddy bed, running water, rocks on the banks. */
function Creek({ hour, weather, wind }: { hour: LakeHour; weather: WeatherLook; wind: { x: number; z: number } }) {
  const bank = useMemo(() => ribbonGeometry(CREEK_HALF_WIDTH + CREEK_BANK), []);
  const water = useMemo(() => ribbonGeometry(CREEK_HALF_WIDTH), []);
  const flow = useMemo(() => makeCreekTexture(), []);
  const season = useContext(SeasonContext);
  useEffect(() => {
    return () => {
      bank.dispose();
      water.dispose();
      flow.dispose();
    };
  }, [bank, water, flow]);
  useFrame((_, delta) => {
    // Points run mouth first, so falling V carries the streaks down into the lake.
    flow.offset.y += delta * 0.18;
  });
  return (
    <group>
      <mesh geometry={bank} position={[0, -0.03, 0]} receiveShadow>
        <meshToonMaterial color={hour === "night" ? "#5a4c38" : "#86704f"} gradientMap={toonRamp()} />
      </mesh>
      <mesh geometry={water} position={[0, -0.012, 0]} receiveShadow>
        <meshToonMaterial color={seasonWaterColor(weather.water, season)} map={flow} gradientMap={toonRamp()} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <Rocks items={CREEK_ROCK_SPECS} />
      <Reeds count={6} origin={[-23.2, 0.03, -11.0]} wind={wind} />
      <ScatterModels items={CREEK_TREES} sway />
      <ScatterModels items={CREEK_GRASS} />
    </group>
  );
}

/** The angler's own rowboat. Moored by the pier until level 7 unties it; follows the row out and back, rocking on the chop. */
function PlayerBoat({ fill }: { fill: FillKind | null }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const hull = ref.current;
    if (!hull) return;
    const t = state.clock.elapsedTime;
    const at = boatPathPoint(boat.u);
    const y = waterHeight(at.x, at.z, t);
    const sample = 0.75;
    hull.position.set(at.x, y + BOAT_DECK - 0.14, at.z);
    hull.rotation.order = "YXZ";
    hull.rotation.y = boat.yaw + boat.swing;
    hull.rotation.x = THREE.MathUtils.clamp((waterHeight(at.x, at.z + sample, t) - y) * 1.15, -0.2, 0.2);
    hull.rotation.z = THREE.MathUtils.clamp((y - waterHeight(at.x + sample, at.z, t)) * 1.15, -0.2, 0.2);
  });
  return (
    <group ref={ref}>
      <ToonModel url={MODELS.rowboat} scale={0.66} shadows={false} />
      {fill && <BoatFill url={MODELS.rowboat} scale={0.66} kind={fill} seed={3} across={ROWBOAT_HULL} shown={mooredNow} />}
    </group>
  );
}

/** The rowboat model's box takes in its oars, so its hull is only this share of the box's width either side of the middle. */
const ROWBOAT_HULL = 0.22;

/** Whether the angler's boat is tied up, so nobody is sitting in what lies in its bottom. */
function mooredNow() {
  return boat.mode === "moored";
}

/** Marks the deep hole the boat anchors over. Bobs a little off to one side so it never sits in the cast. */
function AnchorBuoy() {
  const ref = useRef<THREE.Group>(null);
  const at = { x: OPEN_PAD.x + 1.6, z: OPEN_PAD.z - 1.1 };
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = waterHeight(at.x, at.z, t) - 0.05;
    ref.current.rotation.z = Math.sin(t * 1.3) * 0.08;
  });
  return (
    <group ref={ref} position={[at.x, 0, at.z]}>
      <ToonModel url={MODELS.buoy} scale={0.28} shadows={false} />
    </group>
  );
}

const NO_WIND = { x: 0, z: 0 };

/**
 * A clump of reeds, each leaning and nodding with the wind on its own beat (reedSway.ts). The stems
 * share one instanced mesh per part of the reed model, so a clump is one draw however many it holds.
 */
function Reeds({ count, origin, wind = NO_WIND }: { count: number; origin: Vec3; wind?: { x: number; z: number } }) {
  const season = useContext(SeasonContext);
  const still = useReducedMotion();
  const { scene } = useGLTF(MODELS.reed);
  // The clump is rebuilt only when where it stands changes, not on every render's fresh origin array.
  const [ox, oy, oz] = origin;
  const clump = useMemo(() => {
    // Prepared as ToonModel prepares a single copy.
    const root = scene.clone(true);
    applyToon(root, false);
    tintPlant(root, season, "grass", 0);
    shareMaterials(root);
    root.updateMatrixWorld(true);
    const parts: { mesh: THREE.InstancedMesh; local: THREE.Matrix4 }[] = [];
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
      const mesh = new THREE.InstancedMesh(obj.geometry, obj.material, count);
      mesh.name = obj.name;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      parts.push({ mesh, local: obj.matrixWorld.clone() });
    });
    const stems = Array.from({ length: count }, (_, i) => reedStem([ox, oy, oz], i));
    return { root, parts, stems };
  }, [scene, season, count, ox, oy, oz]);
  useEffect(
    () => () => {
      releaseSharedMaterials(clump.root);
      clump.parts.forEach(({ mesh }) => mesh.dispose());
    },
    [clump],
  );
  const pose = useMemo(() => ({ base: new THREE.Matrix4(), turn: new THREE.Matrix4(), at: new THREE.Matrix4(), tilt: new THREE.Euler(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);
  useFrame(({ clock }) => {
    clump.stems.forEach((stem, i) => {
      const tilt = reedTilt(wind, clock.elapsedTime, stem.phase, still);
      // Tipped about its foot, then turned and sized about its own axis, as the stem's group and model nest.
      pose.base.compose(pose.p.set(stem.x, stem.y, stem.z), pose.q.setFromEuler(pose.tilt.set(tilt.x, 0, tilt.z)), pose.s.set(1, 1, 1));
      pose.turn.compose(pose.p.set(0, 0, 0), pose.q.setFromEuler(pose.tilt.set(0, stem.yaw, 0)), pose.s.setScalar(stem.scale));
      pose.base.multiply(pose.turn);
      clump.parts.forEach(({ mesh, local }) => mesh.setMatrixAt(i, pose.at.multiplyMatrices(pose.base, local)));
    });
    clump.parts.forEach(({ mesh }) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (!mesh.boundingSphere) mesh.computeBoundingSphere();
    });
  });
  return clump.parts.map(({ mesh }) => <primitive key={mesh.uuid} object={mesh} />);
}

/**
 * A scatter list drawn as instanced meshes: one draw per model part, however many copies stand around the lake.
 * With `sway`, each copy bends in the wind (treeSway.ts).
 */
function ScatterModels({ items, shadows = false, sway = false }: { items: Scatter[]; shadows?: boolean; sway?: boolean }) {
  const season = useContext(SeasonContext);
  const urls = useMemo(() => [...new Set(items.map((item) => item.url))], [items]);
  const models = useGLTF(urls);
  const batches = useMemo(() => {
    const byUrl = new Map(urls.map((url, i) => [url, models[i]!.scene]));
    const placed = items.map((item) => {
      // Prepared exactly as ToonModel prepares a single copy.
      const root = byUrl.get(item.url)!.clone(true);
      applyToon(root, shadows);
      const kind = PLANT_KIND[item.url];
      if (kind) tintPlant(root, season, kind, plantVariant(item.position));
      const box = new THREE.Box3().setFromObject(root);
      root.position.y -= box.min.y;
      shareMaterials(root);
      return { root, matrix: placement(item.position, item.rot, item.scale) };
    });
    const meshes = batchPlaced(placed);
    // Swapped on the batch only: the copies keep the still originals, which they release below.
    const swayed = sway ? meshes.filter((mesh) => !Array.isArray(mesh.material)) : [];
    const stillMaterials = swayed.map((mesh) => mesh.material as THREE.Material);
    swayed.forEach((mesh, i) => (mesh.material = swayingMaterial(stillMaterials[i]!)));
    return { placed, meshes, stillMaterials };
  }, [items, urls, models, shadows, season, sway]);
  useEffect(
    () => () => {
      batches.stillMaterials.forEach(releaseSwayingMaterial);
      batches.placed.forEach(({ root }) => releaseSharedMaterials(root));
      batches.meshes.forEach((mesh) => mesh.dispose());
    },
    [batches],
  );
  return batches.meshes.map((mesh) => <primitive key={mesh.uuid} object={mesh} />);
}

const CALM = { x: 0, z: 0 };

/** Feeds the swaying shore trees the day's wind and the clock; reduced motion holds them at their lean. */
function TreeSwayClock({ wind }: { wind: { x: number; z: number } }) {
  const still = useReducedMotion();
  useFrame(({ clock }) => {
    swayUniforms.uSwayTime.value = still ? 0 : clock.elapsedTime;
    swayUniforms.uSwayWind.value.set(wind.x, wind.z);
  });
  return null;
}

export const LakeWorld = memo(function LakeWorld({
  spot,
  hour,
  sky,
  season = "summer",
  hotspot,
  moon = 0.5,
  wind = CALM,
}: {
  spot: SpotId;
  hour: LakeHour;
  sky: WeatherSky;
  season?: LakeSeason;
  hotspot: Hotspot | null;
  /** The real moon's phase, 0 new to 0.5 full to 1 new again. */
  moon?: number;
  /** The day's wind, meters a second toward world x and z. */
  wind?: { x: number; z: number };
}) {
  const look = LAKE_HOUR_LOOK[hour];
  const weather = useMemo(() => weatherLook(hour, sky, moonLight(moon)), [hour, sky, moon]);
  const mist = mistAmount(hour, sky);
  const stars = starOpacity(hour === "night", weather.sunOut, moonLight(moon));
  const road = moonRoad(hour === "night", weather.sunOut, moonLight(moon));
  const frost = dockFrost(hour, season, sky);
  const shafts =useSettings().particles === "full" ? shaftStrength(hour, sky) : 0;
  // Mist is the fog's own colour, lifted toward white so it reads against the water.
  const mistColor = useMemo(() => `#${new THREE.Color(weather.fog).lerp(new THREE.Color("#ffffff"), 0.35).getHexString()}`, [weather.fog]);
  const shore = useMemo(() => makeEdgeRingGeometry(1.8, 0.15), []);
  // The snowy band of the shore ice, from under the bank out over the water; the ragged rest is ShoreIceFilm.
  const ice = useMemo(() => (shoreIce(season) ? makeEdgeRingGeometry(0.4, -SNOW_BAND) : null), [season]);
  useEffect(() => () => ice?.dispose(), [ice]);
  const ground = (color: string) => seasonGroundColor(color, season);
  const groundGeo = useMemo(() => makeGroundGeometry(), []);
  useEffect(() => {
    return () => {
      shore.dispose();
      groundGeo.dispose();
    };
  }, [shore, groundGeo]);
  return (
    <SeasonContext.Provider value={season}>
      <fog attach="fog" args={[weather.fog, weather.fogNear, weather.fogFar]} />
      <hemisphereLight args={[weather.hemiSky, look.hemiGround, look.hemi]} />
      <directionalLight
        castShadow
        position={look.sunPos}
        intensity={weather.sunInt}
        color={look.sun}
        shadow-intensity={weather.shadow}
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={22}
        shadow-camera-bottom={-20}
      />
      <Sky hour={hour} weather={weather} moon={moon} />
      {stars > 0 && <Stars opacity={stars} />}
      {CLOUDS.map((cloud, i) => (
        <Cloud key={i} {...cloud} color={weather.clouds} />
      ))}
      <mesh geometry={groundGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, LAKE_CENTER_Z]} receiveShadow>
        <meshToonMaterial color={ground(hour === "night" ? "#3a5240" : "#4d6c48")} gradientMap={toonRamp()} />
      </mesh>
      <mesh geometry={shore} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, LAKE_CENTER_Z]} receiveShadow>
        <meshToonMaterial color={hour === "night" ? "#6a5a42" : "#9a815b"} gradientMap={toonRamp()} />
      </mesh>
      {ice && (
        // Above the shoreline chop, which dies out toward the bank.
        <mesh geometry={ice} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, LAKE_CENTER_Z]} receiveShadow>
          <meshToonMaterial color="#dbe7ec" gradientMap={toonRamp()} transparent opacity={0.88} depthWrite={false} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4, -0.48, -5]} scale={[1.7, 1, 1]}>
        <circleGeometry args={[4.2, 48]} />
        <meshBasicMaterial color="#1c3d4c" transparent opacity={spot === "dropoff" ? 0.62 : 0.38} />
      </mesh>
      <LakeSurface spot={spot} hour={hour} sky={sky} season={season} weather={weather} wind={wind} />

      {HILLS.map((hill) => (
        <Hill key={hill.position.join()} position={hill.position} scale={hill.scale} color={hillColor(hill, hour, season, sky)} />
      ))}
      {balesOut(season) && <HayBales season={season} hour={hour} />}
      <Farmstead season={season} hour={hour} wind={wind} />
      {cowsOut(hour, sky, season) && <Cows />}
      {barnOwlOut(hour, sky, season) && <BarnOwl />}
      <TreeSwayClock wind={wind} />
      <ScatterModels items={BACK_TREES} sway />
      <ScatterModels items={TREES} sway />
      <ScatterModels items={SHACK_TREES} shadows sway />
      <ScatterModels items={BUSHES} />
      <ScatterModels items={GRASS} />
      <ScatterModels items={NEAR_GRASS} />
      <Rocks items={LAKE_ROCKS} />
      <Dock wet={dockWet(weather.rain, season)} pale={walkwayPale(season, frost)} />
      {frost > 0 && <DockFrost amount={frost} />}
      {dockWet(weather.rain, season) && <DockRain light={weather.rainLight} />}
      {puddlesOut(weather.rain, season) && <Puddles light={weather.rainLight} />}
      {dockSnowy(season) && <DockSnow />}
      {dockSnowy(season) && <DockFrost amount={1} snow />}
      {iciclesOut(season) && <Icicles />}
      {dockLeavesOut(season) && <DockLeaves wind={wind} />}
      {dewWebOut(hour, season) && <DewWeb />}
      {dewGlintsOut(hour, season) && <DewGrass />}
      {deerOut(hour, sky) && <Deer />}
      {mooseOut(hour, sky, season) && <Moose antlers={mooseAntlers(season)} />}
      {stridersOut(hour, sky, season, Math.hypot(wind.x, wind.z)) && <Striders />}
      {whirligigsOut(hour, sky, season, Math.hypot(wind.x, wind.z)) && <Whirligigs />}
      <Shack />
      <Campfire lit={campfireLit(hour, sky)} hour={hour} wind={wind} />
      <Woodpile season={season} />
      {pumpkinsOut(season) && <Pumpkins hour={hour} />}
      {snowmanUp(season) && <Snowman />}
      {feederUp(season) && <BirdFeeder birds={chickadeesOut(hour, sky)} />}
      <Clothesline washing={washingOut(hour, sky, season)} wind={wind} />
      <TireSwing season={season} wind={wind} />
      {catPlace(hour, sky) && <Cat place={catPlace(hour, sky)!} />}
      {hareOut(hour, sky) && <Hare coat={hareCoat(season)} />}
      {season !== "winter" && <Wildflowers season={season} bees={beesOut(hour, sky, season)} />}
      {hummingbirdOut(hour, sky, season) && <Hummingbird season={season} />}
      {toadstoolsOut(season) && <Toadstools trees={TOADSTOOL_TREES} />}
      {squirrelsOut(hour, sky, season) && <Squirrels runs={SQUIRREL_RUNS} />}
      <ShorePath />
      <BankWalks />
      <Creek hour={hour} weather={weather} wind={wind} />
      <PlayerBoat fill={fillKind(season, sky)} />
      <AnchorBuoy />
      <Reeds count={14} origin={[-13.2, 0.03, 1.8]} wind={wind} />
      <Reeds count={6} origin={[11.4, 0.03, -9.7]} wind={wind} />
      {LILIES.map((lily, i) => (
        <FloatingLily key={`${lily.url}-${i}`} {...lily} index={i} open={lilyOpen(hour, sky)} />
      ))}
      {frogsOnPads(hour, season) && FROG_PADS.map((_, i) => <PadFrog key={i} index={i} />)}
      {nestsOut(season) && <SunfishNests />}
      {floesOut(season) && <IceFloes wind={wind} />}
      {crayfishOut(season) && <Crayfish />}
      <Waterweed season={season} />
      {sunkenLeavesOut(season) && <SunkenLeaves />}
      {spawnOut(season) && <Frogspawn />}
      {tadpolesOut(season, hour) && <Tadpoles />}
      {snakeOut(season, hour, sky) && <GrassSnake />}
      {BOATS.map((boat, i) => (
        <Boat key={`${boat.url}-${i}`} {...boat} wind={wind} fill={fillKind(season, sky)} />
      ))}
      {FISH.map((fish, i) => (
        <SwimmingFish key={i} {...fish} />
      ))}
      {look.glitter && weather.sunOut && <SunGlitter discPos={look.discPos} />}
      {road > 0 && <MoonRoad discPos={look.discPos} strength={road} />}
      {breathOut(hour, season) && <Breath light={weather.rainLight} />}
      <Thermos steaming={breathOut(hour, season)} light={weather.rainLight} />
      {mothsOut(hour, season) && <Moths />}
      {dripsOut(sky, season) && <CapDrips />}
      {look.birds &&
        FLOCKS.map((flock, i) => (
          <BirdFlock key={i} {...flock} />
        ))}
      {DUCKS.map((duck, i) => (
        <Duck key={i} {...duck} />
      ))}
      {dragonfliesOut(hour, sky, season) &&
        Array.from({ length: DRAGONFLY_COUNT }, (_, i) => <Dragonfly key={i} index={i} />)}
      {weather.rain &&
        (season === "winter" ? <LakeSnow light={weather.rainLight} wind={wind} /> : <LakeRain light={weather.rainLight} wind={wind} />)}
      {hailOut(weather.rain, season) && <HailShower light={weather.rainLight} />}
      {squallOut(weather.rain, season) && <RainCurtain light={weather.rainLight} />}
      {mist > 0 && <LakeMist amount={mist} color={mistColor} />}
      {valleyMistOut(hour, sky, season, wind) && <ValleyMist color={mistColor} />}
      {lakeSmokeOut(hour, sky, season) && <LakeSmoke wind={wind} color={mistColor} />}
      {diamondDustOut(hour, sky, season, wind) && <DiamondDust wind={wind} />}
      {shafts > 0 && <LightShafts discPos={look.discPos} color={look.sun} strength={shafts} />}
      {sunBreakOut(hour, sky) && <SunBreak discPos={look.discPos} wind={wind} />}
      {firefliesOut(hour, sky, season) && <Fireflies />}
      {eyesOut(hour, sky) && <NightEyes />}
      {midgesOut(hour, sky, season, wind) && <MidgeCloud wind={wind} />}
      {gossamerOut(hour, sky, season, wind) && <Gossamer />}
      {heronOut(hour, sky) && <Heron />}
      {loonOut(hour, season) && <Loon />}
      {otterOut(hour, season) && <Otter />}
      {beaverOut(hour, season) && <Beaver />}
      {butterfliesOut(hour, sky, season) && <Butterflies />}
      {ospreyOut(hour, sky, season) && <Osprey />}
      {foxOut(hour, sky) && <Fox />}
      {batsOut(hour, sky, season) && <Bats />}
      {geeseOut(hour, sky, season) && <Geese />}
      {swansOut(hour, sky, season) && <Swans />}
      {cygnetsOut(hour, sky, season) && <Cygnets />}
      {cormorantOut(hour, season) && <Cormorant />}
      {grebesOut(hour, sky, season) && <Grebes />}
      {kingfisherOut(hour, sky, season) && <Kingfisher />}
      <BaskingLog />
      {turtleOut(hour, sky, season) && <Turtle />}
      <OwlTree />
      {woodpeckerOut(hour) && <Woodpecker />}
      {canoeOut(hour, sky, season) && <Canoeist />}
      {skiingOut(hour, sky, season) && <Skier />}
      {sailingOut(hour, sky, season, wind) && <Dinghy wind={wind} />}
      {kiteOut(hour, sky, season, wind) && <Kite wind={wind} />}
      {HAMMOCK_TREES && hammockOut(hour, sky, season) && <Hammock trees={HAMMOCK_TREES} />}
      {balloonOut(hour, sky, season, wind) && <HotAirBalloon wind={wind} />}
      {fogAnglerOut(hour, sky) && <FogAngler />}
      {dogWalkOut(hour, season) && <DogWalker rain={sky === "rain"} />}
      {swimmingOut(hour, sky, season) && <Swimmer />}
      {choppingOut(hour, sky, season) && <Woodcutter />}
      {scullOut(hour, sky, season, wind) && <Sculler />}
      {nightRowOut(hour, sky, season, wind) && <NightRower />}
      {paddleOut(hour, sky, season, wind) && <Paddleboarder />}
      {gooseFamilyOut(hour, season) && <GooseFamily />}
      {leafJumpOut(hour, sky, season) && <LeafPile />}
      {leafJumpOut(hour, sky, season) && <LeafRaker />}
      {painterOut(hour, sky, season, wind) && <Painter />}
      {discOut(hour, sky, season, wind) && <DiscTossers />}
      {brollyOut(hour, sky) && <BrollyFisher wind={wind} />}
      {snowballOut(hour, sky, season) && <SnowballKids />}
      {headlampOut(hour, sky, season) && <NightAngler />}
      {skimOut(hour, sky, season, wind) && <StoneSkimmer />}
      {joggerOut(hour, sky, season) && <Jogger />}
      {crowsOut(hour, sky, season) && <Crows jogging={joggerOut(hour, sky, season)} />}
      {sleddersOut(hour, sky, season) && <Sledders />}
      {spindriftOut(hour, sky, season, wind) && <Spindrift wind={wind} />}
      {birderOut(hour, sky, season) && <Birdwatcher />}
      {porchOut(hour, sky, season) && <PorchRocker />}
      {sandpipersOut(hour, sky, season) && <Sandpipers />}
      {eaveLightsOn(hour, season) && <EaveLights />}
      {cootsOut(hour, season) && <Coots squabbling={season === "spring"} />}
      {murmurationOut(hour, sky, season) && <Starlings />}
      {robinOut(hour, sky) && <DockRobin snow={dockSnowy(season)} />}
      {snailOut(hour, sky, season) && <DockSnail />}
      {gullsOut(hour, sky, season) && <WinterGulls wind={wind} />}
      {snowShedOut(hour, sky, season) && <ShedSnow trees={TREES} wind={wind} />}
      <Cabin season={season} hour={hour} lit={cabinWindowsLit(hour)} smoking={chimneySmoking(hour, season)} wind={wind} />
      {tentPitched(season) && (
        <>
          <Tent hour={hour} />
          <Campfire at={CAMP_FIRE_AT} lit={campfireLit(hour, sky)} hour={hour} wind={wind} />
          {campersOut(hour, sky) && <Campers />}
          {campfireLit(hour, sky) && <WindowGlow lights={CAMP_LIGHTS} color="#ffa64d" strength={sky === "fog" ? 0.4 : 0.8} name="camp-glow" />}
        </>
      )}
      {cabinWindowsLit(hour) && <WindowGlow strength={sky === "rain" || sky === "fog" ? 0.4 : 1} />}
      {owlOut(hour, season) && <Owl />}
      {jumpsOn(season) && <JumpingFish hour={hour} />}
      {fryOut(hour, season) && <FryBurst light={weather.rainLight} />}
      {swallowsOut(hour, sky, season, Math.hypot(wind.x, wind.z)) && <Swallows />}
      {feathersOut(season) && <Feathers wind={wind} />}
      {leavesOut(season) && <FallingLeaves wind={wind} />}
      {petalsOut(season) && <FallingLeaves wind={wind} petals />}
      {leafWhirlOut(hour, sky, season) && <LeafWhirl />}
      {leavesOut(season) && <LeafRaft wind={wind} />}
      {fluffOut(season, sky) && <ReedFluff wind={wind} light={weather.rainLight} />}
      {gustsOut(Math.hypot(wind.x, wind.z)) && <Gusts wind={wind} />}
      {whitecapCount(Math.hypot(wind.x, wind.z)) > 0 && <Whitecaps wind={wind} light={weather.rainLight} />}
      {lanternLevel(hour) > 0 && <Lanterns level={lanternLevel(hour)} />}
      {minnowsOut(hour) && <LanternMinnows />}
      {hotspot && <BubblingHotspot hotspot={hotspot} weather={weather} />}
      {hotspot && ternsOut(hour, sky, season) && <Terns center={hotspot} />}
    </SeasonContext.Provider>
  );
});

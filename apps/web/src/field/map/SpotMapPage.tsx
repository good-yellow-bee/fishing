import { useEffect, useLayoutEffect, useState } from "react";
import { Link, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { CopyPlace } from "../CopyPlace";
import { MapAnchor } from "../MapAnchor";
import { WATER_LABELS, localDate, shiftDate, type Spot } from "@stillwater/shared";
import { bestLureAt } from "../waterLure";
import { getUnits, t, tn, useT } from "../../i18n";
import { fishCountLabel, formatDay, tripWhen } from "../format";
import { useLogbook } from "../LogbookState";
import {
  ALDERS,
  CEDARS,
  CEDAR_LAKE,
  GRID_LATS,
  GRID_LNGS,
  MAP_FRAME,
  MAP_HEIGHT,
  MAP_WIDTH,
  MILL_DAM,
  MILL_RACE,
  OXBOW,
  POND_CENTER,
  QUARRY,
  QUARRY_RIM,
  TRACK,
  WEED_EDGE,
  formatCoord,
  formatLat,
  formatLng,
  linePath,
  oval,
  placeFor,
  project,
  ringPath,
  type SamplePlace,
} from "./places";
import { LABEL_HEIGHT, OWN_HEIGHT, type Box, OWN_WIDTH, PHONE_LABEL_HEIGHT, fitFrame, gridLines, labelShifts, projectIn, scaleBar, scaleSpot } from "./ownSheet";
import { hasSampleWaters, isSampleSpot, nextRealTrips } from "../bookCopy";
import { PLAY_LAKE_ID } from "../playLake";
import { daysBetween, kmBetween, lastOutByWater, spotsByLastFish } from "../spotOrder";
import { NearestWater, canFindNearest, distanceText } from "../NearestWater";
import { datedName, downloadFile } from "../download";
import { gpxFor } from "../gpx";
import { countedBook, countedFish } from "../milestones";
import { focusPageHeading } from "../pageFocus";
import "./spot-map.css";

const POND = oval(POND_CENTER, 0.0052, 0.014);

function TreeMarks({ points }: { points: { lat: number; lng: number }[] }) {
  return points.map((point) => {
    const { x, y } = project(point);
    const key = `${point.lat}-${point.lng}`;
    return (
      <path
        key={key}
        d={`M${x.toFixed(1)} ${(y - 8).toFixed(1)} L${(x + 4.5).toFixed(1)} ${y.toFixed(1)} L${(x - 4.5).toFixed(1)} ${y.toFixed(1)} Z`}
        className="map-tree"
      />
    );
  });
}

function MapPlate() {
  const corner = 16;
  return (
    <svg
      className="spot-map-plate"
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="img"
      aria-label={t("Schematic of the sample waters, north up")}
    >
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="map-land" />
      <ellipse cx="430" cy="150" rx="150" ry="70" className="map-hill" />
      <ellipse cx="180" cy="200" rx="90" ry="48" className="map-hill" />
      <ellipse cx="760" cy="520" rx="80" ry="36" className="map-hill" />

      {GRID_LATS.map((lat) => {
        const y = project({ lat, lng: MAP_FRAME.west }).y;
        return (
          <g key={lat}>
            <line x1={corner} x2={MAP_WIDTH - corner} y1={y} y2={y} className="map-grid" />
            <text x={22} y={y - 4} className="map-tick">
              {formatLat(lat)}
            </text>
          </g>
        );
      })}
      {GRID_LNGS.map((lng) => {
        const x = project({ lat: MAP_FRAME.north, lng }).x;
        return (
          <g key={lng}>
            <line x1={x} x2={x} y1={corner} y2={MAP_HEIGHT - corner} className="map-grid" />
            <text x={x + 4} y={MAP_HEIGHT - 22} className="map-tick">
              {formatLng(lng)}
            </text>
          </g>
        );
      })}

      <path d={linePath(TRACK)} className="map-track" />
      <TreeMarks points={CEDARS} />
      <TreeMarks points={ALDERS} />
      <TreeMarks points={QUARRY_RIM} />

      <path d={ringPath(CEDAR_LAKE)} className="map-water" />
      <path d={linePath(WEED_EDGE)} className="map-weed" />
      <path d={linePath(MILL_RACE)} className="map-river" />
      <path d={linePath(MILL_DAM)} className="map-dam" />
      <path d={linePath(OXBOW)} className="map-creek" />
      <path d={ringPath(POND)} className="map-pond" />
      <path d={ringPath(QUARRY)} className="map-quarry" />

      <g className="map-compass" transform="translate(910 78)">
        <circle r="26" className="map-compass-ring" />
        <path d="M0 -16 L5 6 L0 2 L-5 6 Z" className="map-compass-north" />
        <path d="M0 16 L5 -4 L0 0 L-5 -4 Z" className="map-compass-south" />
        <text y="-30" textAnchor="middle" className="map-compass-n">
          {t("N")}
        </text>
      </g>

      <g className="map-scale" transform="translate(36 640)">
        <line x1="0" x2="191" y1="0" y2="0" />
        <line x1="0" x2="0" y1="-5" y2="5" />
        <line x1="191" x2="191" y1="-5" y2="5" />
        <text x="84" y="16" textAnchor="middle">
          {getUnits() === "metric" ? t("about 3 km") : t("about 2 miles")}
        </text>
      </g>

      <rect x="14" y="14" width={MAP_WIDTH - 28} height={MAP_HEIGHT - 28} className="map-frame" />
    </svg>
  );
}

/** What the dots' sizes say. */
function MapKey() {
  return <p className="meta map-key">{t("A bigger dot marks a water with more fish, a pale one a water with none yet.")}</p>;
}

/** How big a water's dot is drawn: pale with no fish yet, then larger at 5 and at 20 fish. */
function fishTier(fish: number) {
  return fish === 0 ? 0 : fish < 5 ? 1 : fish < 20 ? 2 : 3;
}

/** How big an own water's label can be drawn, as spot-map.css has it: at most min(180px, 35vw) wide, one line on a phone. */
function labelSizeOnScreen() {
  if (typeof window === "undefined") return {};
  const phone = window.matchMedia?.("(max-width: 640px)").matches ?? false;
  return { labelWidth: Math.min(180, window.innerWidth * 0.35), labelHeight: phone ? PHONE_LABEL_HEIGHT : LABEL_HEIGHT };
}

/**
 * The drawn sheet's width over its own units, as it scales with the page, and with `handLabels` the sample waters'
 * labels as drawn (their places are set in spot-map.css and move on a phone), in pixels from the sheet's corner.
 */
function useSheetScale(units: number, handLabels = false) {
  // A ref as state: a sheet drawn only once the book has loaded is measured then too.
  const [box, sheet] = useState<HTMLDivElement | null>(null);
  const [pxPerUnit, setPxPerUnit] = useState(0.9);
  const [labels, setLabels] = useState<readonly Box[]>([]);
  // After every render: a language switch or another book redraws the labels at new widths. Kept only when changed.
  useLayoutEffect(() => {
    if (!box || !handLabels) return;
    const corner = box.getBoundingClientRect();
    const drawn = [...box.querySelectorAll(".map-pin:not(.map-pin-own) .map-pin-label")].map((label) => {
      const at = label.getBoundingClientRect();
      return { x0: at.left - corner.left, y0: at.top - corner.top, x1: at.right - corner.left, y1: at.bottom - corner.top };
    });
    setLabels((was) => (JSON.stringify(was) === JSON.stringify(drawn) ? was : drawn));
  });
  useEffect(() => {
    if (!box || typeof ResizeObserver === "undefined") return;
    const measure = () => setPxPerUnit(box.getBoundingClientRect().width / units || 0.9);
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(box);
    return () => watch.disconnect();
  }, [box, units]);
  return { sheet, pxPerUnit, labels };
}

function SpotPin({
  spot,
  place,
  point = project(place),
  width = MAP_WIDTH,
  height = MAP_HEIGHT,
  shift = 0,
  fish = 0,
}: {
  spot: Spot;
  place: SamplePlace;
  fish?: number;
  point?: { x: number; y: number };
  width?: number;
  height?: number;
  /** labelShifts' place for this pin's label: 0 its own, 1 a line off, 2 a line the other way, 4 the other side, 3 none. */
  shift?: number;
}) {
  // The sample waters' labels are placed by hand at their sample places; a place the angler set takes the general placement.
  // A pin just beside an earlier one moves its label a line down (or up, near the foot of the sheet), off the other label;
  // a third takes the other way, and past that only the dot shows.
  const low = point.y > height * 0.7;
  const moved = shift === 0 || shift === 4 ? "" : shift === 3 ? " map-pin-bare" : (shift === 1) === low ? " map-pin-up" : " map-pin-down";
  // On the other side of its dot when both of its own lines were taken.
  const east = point.x > width * 0.5 !== (shift === 4);
  const own = spot.place ? ` map-pin-own${east ? " map-pin-east" : ""}${moved}` : "";
  return (
    <Link
      to={`/spots/${spot.id}`}
      className={`${own ? `map-pin${own}` : `map-pin map-pin-${spot.id}`} map-pin-tier-${fishTier(fish)}`}
      style={{
        left: `${(point.x / width) * 100}%`,
        top: `${(point.y / height) * 100}%`,
      }}
      // The list under the map names the same spots, so keyboards and screen readers go through each one once there.
      tabIndex={-1}
    >
      <span className="map-pin-dot" />
      <span className="map-pin-label">
        {spot.name}
        <small>{t(WATER_LABELS[spot.waterType])}</small>
      </span>
    </Link>
  );
}

/** Where a spot sits on the sheet: a sample water's own place, or the angler's place for a water inside the frame. */
function sheetPlace(spot: Spot, sampleSheet: boolean): SamplePlace | undefined {
  // A place the angler set wins over the sample's, even on a sample water.
  const place = spot.place;
  if (!place) return placeFor(spot.id);
  // With the sample waters gone, its made-up sheet is no place for a real water, even one inside its frame.
  if (!sampleSheet) return undefined;
  const inside = place.lat <= MAP_FRAME.north && place.lat >= MAP_FRAME.south && place.lng >= MAP_FRAME.west && place.lng <= MAP_FRAME.east;
  return inside ? { spotId: spot.id, lat: place.lat, lng: place.lng } : undefined;
}

/** The angler's own pins away from the sample sheet, on a plain sheet of their own: a grid fitted to them, north up. */
function OwnSheet({ pinned, fishOf }: { pinned: { spot: Spot; place: SamplePlace }[]; fishOf: (spotId: string) => number }) {
  const frame = fitFrame(pinned.map(({ place }) => place));
  const lats = gridLines(frame.south, frame.north);
  const lngs = gridLines(frame.west, frame.east);
  const corner = 16;
  // Room a grid label needs at the phone's larger tick size: its height, and the width of "179.5°W".
  const TICK_ROOM = 26;
  const TICK_WIDTH = 110;
  const points = pinned.map((pin) => ({ ...pin, point: projectIn(frame, pin.place) }));
  const scale = scaleBar(frame, getUnits() === "metric");
  // In a corner no pin lands in, and no label is placed over it.
  const bar = scaleSpot(points.map(({ point }) => point), scale.length);
  // The labels keep a size on screen while the sheet scales, so which ones meet depends on how wide it is drawn.
  const { sheet, pxPerUnit } = useSheetScale(OWN_WIDTH);
  const barBox = { x0: bar.box.x0 * pxPerUnit, y0: bar.box.y0 * pxPerUnit, x1: bar.box.x1 * pxPerUnit, y1: bar.box.y1 * pxPerUnit };
  const shifts = labelShifts(points.map(({ point }) => point), pxPerUnit, { ...labelSizeOnScreen(), labels: [barBox] });
  return (
    <div className="spot-map own-sheet" ref={sheet}>
      <svg className="spot-map-plate" viewBox={`0 0 ${OWN_WIDTH} ${OWN_HEIGHT}`} role="img" aria-label={t("Your own waters, north up")}>
        <rect width={OWN_WIDTH} height={OWN_HEIGHT} className="map-land" />
        {lats.values.map((lat) => {
          const y = projectIn(frame, { lat, lng: frame.west }).y;
          return (
            <g key={lat}>
              <line x1={corner} x2={OWN_WIDTH - corner} y1={y} y2={y} className="map-grid" />
              {/* A label by the top edge sits under its line, so the frame does not cut it. */}
              <text x={22} y={y - 4 < corner + TICK_ROOM ? y + 8 : y - 4} dominantBaseline={y - 4 < corner + TICK_ROOM ? "hanging" : undefined} className="map-tick">
                {formatLat(lat, lats.digits)}
              </text>
            </g>
          );
        })}
        {lngs.values.map((lng) => {
          const x = projectIn(frame, { lat: frame.north, lng }).x;
          return (
            <g key={lng}>
              <line x1={x} x2={x} y1={corner} y2={OWN_HEIGHT - corner} className="map-grid" />
              {/* A line by the right edge goes unlabelled rather than have its label run off the plate. */}
              {x <= OWN_WIDTH - corner - TICK_WIDTH ? (
                <text x={x + 4} y={OWN_HEIGHT - 22} className="map-tick">
                  {formatLng(lng, lngs.digits)}
                </text>
              ) : null}
            </g>
          );
        })}
        {/* Clear of the grid's labels on the left and foot, and of the pins. */}
        <g className="map-scale" transform={`translate(${bar.x} ${bar.y})`}>
          <line x1="0" x2={scale.length} y1="0" y2="0" />
          <line x1="0" x2="0" y1="-5" y2="5" />
          <line x1={scale.length} x2={scale.length} y1="-5" y2="5" />
          <text x={scale.length / 2} y="8" textAnchor="middle" dominantBaseline="hanging">
            {t("about {distance}", { distance: distanceText(scale.km, getUnits()) })}
          </text>
        </g>
        <rect x="14" y="14" width={OWN_WIDTH - 28} height={OWN_HEIGHT - 28} className="map-frame" />
      </svg>
      <div className="spot-map-pins" aria-hidden="true">
        {points.map(({ spot, place, point }, i) => (
          <SpotPin key={spot.id} spot={spot} place={place} fish={fishOf(spot.id)} point={point} width={OWN_WIDTH} height={OWN_HEIGHT} shift={shifts[i]} />
        ))}
      </div>
    </div>
  );
}

/** From the map straight to a new outing on that water, named for screen readers as each row's own. */
/** The water is added to the words shown, not put in their place, so a voice saying "Plan one" still finds it. */
/** The water whose "Plan one" was followed, for this visit: Back (or Cancel) from the form finds that link again. */
let plannedFrom: string | null = null;

function PlanHere({ spot }: { spot: Spot }) {
  return (
    <Link className="map-plan" to={`/trips/new?spot=${spot.id}`} onClick={() => (plannedFrom = spot.id)}>
      {t("Plan one")}
      <span className="sr-only">: {spot.name}</span>
    </Link>
  );
}

export function SpotMapPage() {
  const { book } = useLogbook();
  useT();
  // A first visit loads the page after the shell has moved focus, so it landed on the page itself; Back from a water's
  // form leaves it nowhere. Either way, on to the heading.
  const { hash } = useLocation();
  const navigation = useNavigationType();
  const navigate = useNavigate();
  useEffect(() => {
    // Back from the outing form opened by a row's "Plan one": that link, where the page was left.
    const from = plannedFrom;
    plannedFrom = null;
    const plan = from && navigation === "POP" ? document.getElementById(`water-${from}`)?.querySelector<HTMLElement>(".map-plan") : null;
    if (plan) {
      plan.focus({ preventScroll: true });
      return;
    }
    // Sent here for one water ("See it on the Map"): its row in the list, in view and focused.
    const row = hash.startsWith("#water-") ? document.getElementById(hash.slice(1)) : null;
    if (row) {
      row.scrollIntoView({ block: "center" });
      row.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
      return;
    }
    const active = document.activeElement;
    if (!active || active === document.body || active.matches(".field-main")) focusPageHeading({ preventScroll: true });
  }, [hash, navigation]);
  // The lists under each sheet go by the water fished most recently, as the Waters page does.
  // Not the game's lake: it has no place on a real map.
  // Ordered by the angler's own fish, as the Waters page is, so a sample week dated later doesn't put its waters on top.
  const ownRows = spotsByLastFish({ ...book, catches: countedFish(book.catches) });
  const ownOrder = new Map(ownRows.map((row, index) => [row.spot.id, index]));
  const rows = spotsByLastFish(book)
    .filter((row) => row.spot.id !== PLAY_LAKE_ID)
    .sort((a, b) => (ownOrder.get(a.spot.id) ?? 0) - (ownOrder.get(b.spot.id) ?? 0));
  const spots = rows.map((row) => row.spot);
  // Each water's fish and the day of its last one: where to go next, at a glance.
  // And the next outing planned there, as the Waters page says it.
  const today = localDate(new Date());
  const tomorrow = shiftDate(new Date(), 1);
  const upcoming = nextRealTrips(book, today);
  // A water the angler has fished or been out on counts their own, as its card on Waters and its page do: a sample
  // water they have fished too says their fish, not the sample week's beside them. A water with nothing of theirs keeps what it has.
  const counted = countedBook(book);
  const ownRow = new Map(ownRows.map((row) => [row.spot.id, row]));
  const ownHere = (id: string) => (ownRow.get(id)?.fishCount ?? 0) > 0 || counted.trips.some((trip) => trip.spotId === id);
  const ownLastOut = lastOutByWater(counted, today);
  const lastOut = new Map([...lastOutByWater(book, today)].map(([id, day]) => [id, ownLastOut.get(id) ?? day]));
  const rowOf = (spotId: string) => (ownHere(spotId) ? ownRow.get(spotId) : rows.find((each) => each.spot.id === spotId));
  const fishOf = (spotId: string) => rowOf(spotId)?.fishCount ?? 0;
  // From the fish the Waters page counts: the sample week's go with the angler's first own fish.
  const bestLure = (spotId: string) => bestLureAt(countedFish(book.catches), spotId);
  const fishLine = (spotId: string) => {
    const row = rowOf(spotId);
    const fish = fishCountLabel(row?.fishCount ?? 0);
    const dated = row?.lastFishDay ? t("{fish}, last {day}", { fish, day: formatDay(row.lastFishDay) }) : fish;
    // What to pack for there: the lure that took the most of its fish, when two or more did and none ties it.
    const best = bestLure(spotId);
    const line = best ? `${dated} · ${t("best on {lure}", { lure: t(best) })}` : dated;
    const next = upcoming.find((trip) => trip.spotId === spotId);
    // The plan itself, one tap away: its list is where the bag gets packed.
    if (next)
      return (
        <>
          {`${line} · `}
          <Link className="map-next" to={`/trips/${next.id}`}>{t("Next outing: {when}", { when: tripWhen(next.date, today, tomorrow) })}</Link>
        </>
      );
    // A water left alone a week or more, by its last outing or fish: one that has had a rest.
    const out = lastOut.get(spotId);
    const rested = out ? daysBetween(out, today) : 0;
    return rested >= 7 ? `${line} · ${tn(rested, "rested {n} day", "rested {n} days")}` : line;
  };
  const sampleSheet = hasSampleWaters(book);
  const { sheet: sampleSheetBox, pxPerUnit: samplePxPerUnit, labels: sampleLabels } = useSheetScale(MAP_WIDTH, true);
  const plotted = spots.flatMap((spot) => {
    const place = sheetPlace(spot, sampleSheet);
    return place ? [{ spot, place }] : [];
  });
  const unplotted = spots.filter((spot) => !sheetPlace(spot, sampleSheet));
  // Pinned off the sample sheet: drawn on a sheet of their own.
  const ownPinned = unplotted.flatMap((spot) => (spot.place ? [{ spot, place: { spotId: spot.id, lat: spot.place.lat, lng: spot.place.lng } }] : []));
  const unpinned = unplotted.filter((spot) => !spot.place);
  // The angler's own pins on the sample sheet keep their labels off each other and off the sample waters' dots.
  const ownOnSample = plotted.filter(({ spot }) => spot.place);
  const sampleShifts = labelShifts(
    ownOnSample.map(({ place }) => project(place)),
    samplePxPerUnit,
    { width: MAP_WIDTH, height: MAP_HEIGHT, ...labelSizeOnScreen(), taken: plotted.filter(({ spot }) => !spot.place).map(({ place }) => project(place)), labels: sampleLabels },
  );
  const sampleShift = new Map(ownOnSample.map(({ spot }, index) => [spot.id, sampleShifts[index]]));
  // The waters the angler noted a place for, wherever they are drawn: what "nearest" measures to and the GPS file holds.
  // The sample week's only while there are no others, as on Waters.
  const withPlace = spots.filter((spot) => spot.place);
  const ownPlaced = withPlace.some((spot) => !isSampleSpot(spot.id)) ? withPlace.filter((spot) => !isSampleSpot(spot.id)) : withPlace;

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{t("Waters")}</p>
          <h1>{t("Map")}</h1>
          <p className="lede">
            {sampleSheet
              ? t("Sample spots on a north-woods sheet. The ink is local — no tile service and no key.")
              : t("Waters you note a place for are drawn here. The ink is local, with no tile service and no key.")}
          </p>
          {/* Standing at a lake: which of the angler's waters this is, its row marked and focused below. */}
          {ownPlaced.length >= 2 && canFindNearest(book) ? (
            <p className="map-note">
              <NearestWater book={book} onPick={(spotId) => navigate({ hash: `water-${spotId}` }, { replace: true })} />
            </p>
          ) : null}
        </div>
      </header>

      {plotted.length === 0 && ownPinned.length === 0 ? (
        <p className="empty">
          {t("None of the waters in this book are drawn on the sheet.")}
          {/* No water of the angler's own yet: the game's lake alone is no reason to hide the way to add one. */}
          {spots.length === 0 ? (
            <>
              {" "}
              <Link to="/spots/new">{t("Add a spot")}</Link>
            </>
          ) : null}
        </p>
      ) : plotted.length === 0 ? null : (
        <div className="spot-map" ref={sampleSheetBox}>
          <MapPlate />
          <div className="spot-map-pins" aria-hidden="true">
            {plotted.map(({ spot, place }) => (
              <SpotPin key={spot.id} spot={spot} place={place} shift={sampleShift.get(spot.id)} fish={fishOf(spot.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Under the first sheet drawn. */}
      {plotted.length > 0 ? <MapKey /> : null}

      {plotted.length > 0 ? (
        <ul className="map-index">
          {plotted.map(({ spot, place }) => (
            // An own water inside the sample sheet's frame is drawn there: "See it on the Map" finds its row here.
            <li key={spot.id} id={`water-${spot.id}`} className={hash === `#water-${spot.id}` ? "map-row-picked" : undefined}>
              <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
              <span>{t(WATER_LABELS[spot.waterType])}</span>
              <span>{fishLine(spot.id)}</span>
              {/* The angler's own water opens on a real map, as on its own sheet; the sample's places are made up. */}
              <span>
                {spot.place ? (
                  <MapAnchor className="map-coord-link" lat={place.lat} lng={place.lng}>
                    {formatCoord(place.lat, place.lng)}
                  </MapAnchor>
                ) : (
                  formatCoord(place.lat, place.lng)
                )}
              </span>
              <PlanHere spot={spot} />
            </li>
          ))}
        </ul>
      ) : null}

      {ownPinned.length > 0 ? (
        <>
          <h2 className="subhead">{t("Your own waters")}</h2>
          <OwnSheet pinned={ownPinned} fishOf={fishOf} />
          {plotted.length === 0 ? <MapKey /> : null}
          <ul className="map-index">
            {ownPinned.map(({ spot, place }) => {
              // How far the nearest of the angler's other pinned waters is: which swims are a walk apart.
              const nearest = ownPinned
                .filter((other) => other.spot.id !== spot.id)
                .map((other) => ({ name: other.spot.name, km: kmBetween(place, other.place) }))
                .sort((a, b) => a.km - b.km)[0];
              return (
                <li key={spot.id} id={`water-${spot.id}`} className={hash === `#water-${spot.id}` ? "map-row-picked" : undefined}>
                  <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
                  <span>{t(WATER_LABELS[spot.waterType])}</span>
                  <span>{fishLine(spot.id)}</span>
                  <span>
                    <MapAnchor className="map-coord-link" lat={place.lat} lng={place.lng}>
                      {formatCoord(place.lat, place.lng)}
                    </MapAnchor>{" "}
                    {/* For the car's navigation or a sounder, without opening the water first. */}
                    <CopyPlace lat={place.lat} lng={place.lng} name={spot.name} />
                  </span>
                  {nearest ? <span className="map-nearest">{t("{distance} from {water}", { distance: distanceText(nearest.km, getUnits()), water: nearest.name })}</span> : null}
                  <PlanHere spot={spot} />
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {unpinned.length > 0 ? (
        <p className="map-note">
          {t("Not on a map yet, with no place noted:")}{" "}
          {unpinned.map((spot, index) => (
            <span key={spot.id}>
              {index > 0 ? ", " : null}
              <Link to={`/spots/${spot.id}/edit?then=map#place`}>{spot.name}</Link>
            </span>
          ))}
          . {t("Open one to note where it is.")}
        </p>
      ) : null}

      {/* Every water with a place in one file, for a GPS or sounder, as Waters offers it. */}
      {ownPlaced.length > 1 ? (
        <p className="map-note">
          <button type="button" className="text-button" onClick={() => downloadFile(gpxFor(ownPlaced), "application/gpx+xml", datedName("stillwater-waters.gpx"))}>
            {t("Save all waters for a GPS (.gpx)")}
          </button>
        </p>
      ) : null}
    </div>
  );
}

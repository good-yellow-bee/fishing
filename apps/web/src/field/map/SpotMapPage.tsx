import { Link } from "react-router-dom";
import { WATER_LABELS, type Spot } from "@stillwater/shared";
import { getUnits, t, useT } from "../../i18n";
import { fishCountLabel } from "../format";
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
import { OWN_HEIGHT, OWN_WIDTH, fitFrame, gridLines, projectIn } from "./ownSheet";
import { osmLink } from "../osmLink";
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

function SpotPin({
  spot,
  place,
  point = project(place),
  width = MAP_WIDTH,
  height = MAP_HEIGHT,
  crowded = false,
}: {
  spot: Spot;
  place: SamplePlace;
  point?: { x: number; y: number };
  width?: number;
  height?: number;
  crowded?: boolean;
}) {
  // The sample waters' labels are placed by hand at their sample places; a place the angler set takes the general placement.
  // A pin just beside an earlier one moves its label a line down (or up, near the foot of the sheet), off the other label.
  const shift = crowded ? (point.y > height * 0.7 ? " map-pin-up" : " map-pin-down") : "";
  const own = spot.place ? ` map-pin-own${point.x > width * 0.6 ? " map-pin-east" : ""}${shift}` : "";
  return (
    <Link
      to={`/spots/${spot.id}`}
      className={own ? `map-pin${own}` : `map-pin map-pin-${spot.id}`}
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
function sheetPlace(spot: Spot): SamplePlace | undefined {
  // A place the angler set wins over the sample's, even on a sample water.
  const place = spot.place;
  if (!place) return placeFor(spot.id);
  const inside = place.lat <= MAP_FRAME.north && place.lat >= MAP_FRAME.south && place.lng >= MAP_FRAME.west && place.lng <= MAP_FRAME.east;
  return inside ? { spotId: spot.id, lat: place.lat, lng: place.lng } : undefined;
}

/** Sheet units within which two pins' labels would sit on each other. */
const CROWDED = 80;

/** The angler's own pins away from the sample sheet, on a plain sheet of their own: a grid fitted to them, north up. */
function OwnSheet({ pinned }: { pinned: { spot: Spot; place: SamplePlace }[] }) {
  const frame = fitFrame(pinned.map(({ place }) => place));
  const lats = gridLines(frame.south, frame.north);
  const lngs = gridLines(frame.west, frame.east);
  const corner = 16;
  const points = pinned.map((pin) => ({ ...pin, point: projectIn(frame, pin.place) }));
  return (
    <div className="spot-map own-sheet">
      <svg className="spot-map-plate" viewBox={`0 0 ${OWN_WIDTH} ${OWN_HEIGHT}`} role="img" aria-label={t("Your own waters, north up")}>
        <rect width={OWN_WIDTH} height={OWN_HEIGHT} className="map-land" />
        {lats.values.map((lat) => {
          const y = projectIn(frame, { lat, lng: frame.west }).y;
          return (
            <g key={lat}>
              <line x1={corner} x2={OWN_WIDTH - corner} y1={y} y2={y} className="map-grid" />
              <text x={22} y={y - 4} className="map-tick">
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
              <text x={x + 4} y={OWN_HEIGHT - 22} className="map-tick">
                {formatLng(lng, lngs.digits)}
              </text>
            </g>
          );
        })}
        <rect x="14" y="14" width={OWN_WIDTH - 28} height={OWN_HEIGHT - 28} className="map-frame" />
      </svg>
      <div className="spot-map-pins" aria-hidden="true">
        {points.map(({ spot, place, point }, i) => (
          <SpotPin key={spot.id} spot={spot} place={place} point={point} width={OWN_WIDTH} height={OWN_HEIGHT} crowded={points.slice(0, i).some((other) => Math.hypot(other.point.x - point.x, other.point.y - point.y) < CROWDED)} />
        ))}
      </div>
    </div>
  );
}

export function SpotMapPage() {
  const { book } = useLogbook();
  useT();
  const plotted = book.spots.flatMap((spot) => {
    const place = sheetPlace(spot);
    return place ? [{ spot, place }] : [];
  });
  const unplotted = book.spots.filter((spot) => !sheetPlace(spot));
  // Pinned off the sample sheet: drawn on a sheet of their own.
  const ownPinned = unplotted.flatMap((spot) => (spot.place ? [{ spot, place: { spotId: spot.id, lat: spot.place.lat, lng: spot.place.lng } }] : []));
  const unpinned = unplotted.filter((spot) => !spot.place);

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">{t("Waters")}</p>
          <h1>{t("Map")}</h1>
          <p className="lede">
            {plotted.length > 0
              ? t("Sample spots on a north-woods sheet. The ink is local — no tile service and no key.")
              : t("Waters you note a place for are drawn here. The ink is local, with no tile service and no key.")}
          </p>
        </div>
      </header>

      {plotted.length === 0 && ownPinned.length === 0 ? (
        <p className="empty">
          {t("None of the waters in this book are drawn on the sheet.")}
          {book.spots.length === 0 ? (
            <>
              {" "}
              <Link to="/spots/new">{t("Add a spot")}</Link>
            </>
          ) : null}
        </p>
      ) : plotted.length === 0 ? null : (
        <div className="spot-map">
          <MapPlate />
          <div className="spot-map-pins" aria-hidden="true">
            {plotted.map(({ spot, place }) => (
              <SpotPin key={spot.id} spot={spot} place={place} />
            ))}
          </div>
        </div>
      )}

      {plotted.length > 0 ? (
        <ul className="map-index">
          {plotted.map(({ spot, place }) => (
            <li key={spot.id}>
              <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
              <span>{t(WATER_LABELS[spot.waterType])}</span>
              <span>{fishCountLabel(book.catches.filter((entry) => entry.spotId === spot.id).length)}</span>
              <span>{formatCoord(place.lat, place.lng)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {ownPinned.length > 0 ? (
        <>
          <h2 className="subhead">{t("Your own waters")}</h2>
          <OwnSheet pinned={ownPinned} />
          <ul className="map-index">
            {ownPinned.map(({ spot, place }) => (
              <li key={spot.id}>
                <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
                <span>{t(WATER_LABELS[spot.waterType])}</span>
                <span>{fishCountLabel(book.catches.filter((entry) => entry.spotId === spot.id).length)}</span>
                <span>
                  <a className="map-coord-link" href={osmLink(place.lat, place.lng)} target="_blank" rel="noreferrer">
                    {formatCoord(place.lat, place.lng)}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {unpinned.length > 0 ? (
        <p className="map-note">
          {t("Not on a map yet, with no place noted:")}{" "}
          {unpinned.map((spot, index) => (
            <span key={spot.id}>
              {index > 0 ? ", " : null}
              <Link to={`/spots/${spot.id}/edit#place`}>{spot.name}</Link>
            </span>
          ))}
          . {t("Open one to note where it is.")}
        </p>
      ) : null}
    </div>
  );
}

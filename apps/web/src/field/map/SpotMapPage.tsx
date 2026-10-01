import { Link } from "react-router-dom";
import { WATER_LABELS, type Spot } from "@stillwater/shared";
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
      aria-label="Schematic of the sample waters, north up"
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
          N
        </text>
      </g>

      <g className="map-scale" transform="translate(36 640)">
        <line x1="0" x2="191" y1="0" y2="0" />
        <line x1="0" x2="0" y1="-5" y2="5" />
        <line x1="191" x2="191" y1="-5" y2="5" />
        <text x="84" y="16" textAnchor="middle">
          about 2 miles
        </text>
      </g>

      <rect x="14" y="14" width={MAP_WIDTH - 28} height={MAP_HEIGHT - 28} className="map-frame" />
    </svg>
  );
}

function SpotPin({ spot, place }: { spot: Spot; place: SamplePlace }) {
  const point = project(place);
  return (
    <Link
      to={`/spots/${spot.id}`}
      className={`map-pin map-pin-${place.labelSide}`}
      style={{
        left: `${(point.x / MAP_WIDTH) * 100}%`,
        top: `${(point.y / MAP_HEIGHT) * 100}%`,
      }}
      aria-label={`${spot.name}, ${formatCoord(place.lat, place.lng)}. Open spot.`}
    >
      <span className="map-pin-dot" />
      <span className="map-pin-label">
        {spot.name}
        <small>{WATER_LABELS[spot.waterType]}</small>
      </span>
    </Link>
  );
}

export function SpotMapPage() {
  const { book } = useLogbook();
  const plotted = book.spots.flatMap((spot) => {
    const place = placeFor(spot.id);
    return place ? [{ spot, place }] : [];
  });
  const unplotted = book.spots.filter((spot) => !placeFor(spot.id));

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">Waters</p>
          <h1>Map</h1>
          <p className="lede">
            Sample spots on a north-woods sheet. The ink is local — no tile service and no key.
          </p>
        </div>
      </header>

      {plotted.length === 0 ? (
        <p className="empty">None of the waters in this book are drawn on the sheet.</p>
      ) : (
        <div className="spot-map">
          <MapPlate />
          <div className="spot-map-pins">
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
              <span>{WATER_LABELS[spot.waterType]}</span>
              <span>{formatCoord(place.lat, place.lng)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {unplotted.length > 0 ? (
        <p className="map-note">
          Not on this sheet:{" "}
          {unplotted.map((spot, index) => (
            <span key={spot.id}>
              {index > 0 ? ", " : null}
              <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
            </span>
          ))}
          .
        </p>
      ) : null}
    </div>
  );
}

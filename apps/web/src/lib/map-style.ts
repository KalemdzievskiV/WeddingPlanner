import type { StyleSpecification } from "maplibre-gl";

/**
 * MapTiler vector style when NEXT_PUBLIC_MAPTILER_KEY is set (production),
 * otherwise OpenStreetMap raster tiles (fine for development; OSM limits heavy use).
 */
export function mapStyle(): string | StyleSpecification {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (key) return `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`;
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
        maxzoom: 19,
      },
    },
    layers: [{ id: "osm", type: "raster", source: "osm" }],
  };
}

/** Centre of North Macedonia, for maps with no pin yet. */
export const MK_CENTER: [number, number] = [21.7, 41.6];

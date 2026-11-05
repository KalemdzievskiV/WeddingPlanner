"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { MK_CENTER, mapStyle } from "@/lib/map-style";
import { cn } from "@/lib/utils";

type Point = { lat: number; lng: number };

/**
 * OpenStreetMap map with one pin. Editable: click to place, drag to move, and onChange reports the point.
 * Read-only when onChange is omitted.
 */
export function MapView({
  value,
  onChange,
  className,
  label,
}: {
  value: Point | null;
  onChange?: (point: Point) => void;
  className?: string;
  label: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const initial = useRef(value);
  const editable = !!onChange;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !container.current) return;
      // Served from public/ (see scripts/copy-maplibre-worker.mjs).
      maplibre.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      const start = initial.current;
      const m = new maplibre.Map({
        container: container.current,
        style: mapStyle(),
        center: start ? [start.lng, start.lat] : MK_CENTER,
        zoom: start ? 15 : 7,
        attributionControl: { compact: true },
      });
      m.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.current = m;

      const place = (p: Point) => {
        if (!marker.current) {
          marker.current = new maplibre.Marker({ color: "#7a1f33", draggable: editable })
            .setLngLat([p.lng, p.lat])
            .addTo(m);
          marker.current.on("dragend", () => {
            const ll = marker.current!.getLngLat();
            onChangeRef.current?.({ lat: ll.lat, lng: ll.lng });
          });
        } else marker.current.setLngLat([p.lng, p.lat]);
      };
      if (start) place(start);
      if (editable) {
        m.on("click", (e) => {
          const p = { lat: e.lngLat.lat, lng: e.lngLat.lng };
          place(p);
          onChangeRef.current?.(p);
        });
      }
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is created once; later props flow through refs
  }, []);

  // Remove the pin when the value is cleared from outside.
  useEffect(() => {
    if (!value && marker.current) {
      marker.current.remove();
      marker.current = null;
    }
  }, [value]);

  return <div ref={container} role="region" aria-label={label} className={cn("overflow-hidden rounded-xl border border-line", className)} />;
}

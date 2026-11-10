"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";
import { MK_CENTER, mapStyle } from "@/lib/map-style";

export type MapPoint = { id: string; slug: string; name: string; lat: number; lng: number; price: string | null; cover: string | null };

/** All results on one map; a pin opens a small card that links to the vendor (decision 32). */
export function ResultsMap({ points, label }: { points: MapPoint[]; label: string }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const locale = useLocale();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !container.current) return;
      maplibre.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      const m = new maplibre.Map({
        container: container.current,
        style: mapStyle(),
        center: MK_CENTER,
        zoom: 7,
        attributionControl: { compact: true },
      });
      m.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.current = m;

      const bounds = new maplibre.LngLatBounds();
      for (const p of points) {
        // Built with DOM nodes (not HTML strings) so vendor names can't inject markup.
        const card = document.createElement("a");
        card.href = `/${locale}/v/${p.slug}`;
        card.className = "block w-48 no-underline text-ink";
        if (p.cover) {
          const img = document.createElement("img");
          img.src = p.cover;
          img.alt = "";
          img.className = "mb-2 aspect-[4/3] w-full rounded-md object-cover";
          card.appendChild(img);
        }
        const name = document.createElement("span");
        name.textContent = p.name;
        name.className = "block font-medium";
        card.appendChild(name);
        if (p.price) {
          const price = document.createElement("span");
          price.textContent = p.price;
          price.className = "block text-sm text-stone tabular-nums";
          card.appendChild(price);
        }
        const popup = new maplibre.Popup({ offset: 28, closeButton: false, maxWidth: "220px", focusAfterOpen: false }).setDOMContent(card);
        new maplibre.Marker({ color: "#8a4f7d" }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(m);
        bounds.extend([p.lng, p.lat]);
      }
      if (points.length === 1) m.jumpTo({ center: [points[0]!.lng, points[0]!.lat], zoom: 13 });
      else if (points.length > 1) m.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [points, locale]);

  return (
    <div
      ref={container}
      role="region"
      aria-label={label}
      className="h-[60vh] min-h-[420px] overflow-hidden rounded-[var(--radius-card)] border border-line"
    />
  );
}

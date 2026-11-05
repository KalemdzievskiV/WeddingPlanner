"use client";

import { MapView } from "@/components/map-view";

export function LocationMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  return <MapView value={{ lat, lng }} label={label} className="h-56" />;
}

import { useEffect, useRef, useState } from "react";
import type { DayRouteVariant } from "../types/dailyMaps";

function safeMapCleanup(mapInstance: any) {
  if (!mapInstance) return;
  try {
    if (typeof mapInstance.off === "function") mapInstance.off();
    if (typeof mapInstance.eachLayer === "function") {
      mapInstance.eachLayer((layer: any) => {
        try {
          if (typeof layer.off === "function") layer.off();
          if (typeof layer.remove === "function") layer.remove();
        } catch {}
      });
    }
    if (typeof mapInstance.remove === "function") mapInstance.remove();
  } catch {}
}

function injectMiniMapStyles() {
  if (document.getElementById("day-route-minimap-styles")) return;
  const style = document.createElement("style");
  style.id = "day-route-minimap-styles";
  style.textContent = `
    .day-route-numbered-marker {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #E67E22, #D35400);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      border: 2.5px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .day-route-numbered-marker.visited {
      background: linear-gradient(135deg, #4ade80, #16a34a);
    }
  `;
  document.head.appendChild(style);
}

interface DayRouteMiniMapProps {
  variant: DayRouteVariant;
  polylinePoints: [number, number][] | null;
  height?: number;
}

export function DayRouteMiniMap({ variant, polylinePoints, height = 180 }: DayRouteMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if ((window as any).L) {
      setLeafletReady(true);
      return;
    }
    const checkInterval = setInterval(() => {
      if ((window as any).L) {
        if (mountedRef.current) setLeafletReady(true);
        clearInterval(checkInterval);
      }
    }, 200);
    return () => clearInterval(checkInterval);
  }, []);

  useEffect(() => {
    if (!leafletReady || !containerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    injectMiniMapStyles();
    safeMapCleanup(mapRef.current);
    mapRef.current = null;

    if (!mountedRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    // Clear any stale Leaflet state on the container element
    (container as any)._leaflet_id = undefined;

    const navigable = variant.stops.filter((s) => s.isNavigable && !s.isDropped);
    if (navigable.length === 0) return;

    const center: [number, number] = [navigable[0].lat!, navigable[0].lng!];
    let map: any;
    try {
      map = L.map(container, {
        center,
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
      });
    } catch {
      return;
    }
    if (!mountedRef.current) {
      safeMapCleanup(map);
      return;
    }
    mapRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
    }).addTo(map);

    let navIndex = 0;
    navigable.forEach((stop) => {
      navIndex++;
      const icon = L.divIcon({
        className: "leaflet-div-icon",
        html: `<div class="day-route-numbered-marker ${stop.isVisited ? "visited" : ""}">${navIndex}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([stop.lat!, stop.lng!], { icon }).addTo(map);
    });

    if (polylinePoints && polylinePoints.length > 1) {
      L.polyline(polylinePoints, {
        color: "#E67E22",
        weight: 3,
        opacity: 0.8,
        dashArray: undefined,
      }).addTo(map);
    } else if (navigable.length > 1) {
      const fallbackLine = navigable.map((s) => [s.lat!, s.lng!] as [number, number]);
      L.polyline(fallbackLine, {
        color: "#E67E22",
        weight: 2,
        opacity: 0.5,
        dashArray: "6, 8",
      }).addTo(map);
    }

    if (navigable.length > 1) {
      const bounds = L.latLngBounds(navigable.map((s: any) => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [25, 25] });
    } else {
      map.setView(center, 14);
    }

    return () => {
      safeMapCleanup(mapRef.current);
      mapRef.current = null;
    };
  }, [leafletReady, variant, polylinePoints]);

  return (
    <div style={{ isolation: "isolate", borderRadius: 12, overflow: "hidden" }}>
      <div
        ref={containerRef}
        style={{ height, borderRadius: 12, overflow: "hidden" }}
        data-testid="day-route-mini-map"
      />
    </div>
  );
}

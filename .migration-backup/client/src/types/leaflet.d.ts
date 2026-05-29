declare const L: typeof import('leaflet');

declare module 'leaflet' {
  interface MapOptions {
    center?: LatLngExpression;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    zoomControl?: boolean;
    attributionControl?: boolean;
    scrollWheelZoom?: boolean | string;
    dragging?: boolean;
  }
  
  interface TileLayerOptions {
    attribution?: string;
    maxZoom?: number;
    minZoom?: number;
  }
  
  interface MarkerOptions {
    icon?: Icon | DivIcon;
    title?: string;
    alt?: string;
    zIndexOffset?: number;
    opacity?: number;
    riseOnHover?: boolean;
    riseOffset?: number;
  }
  
  interface DivIconOptions {
    html?: string;
    bgPos?: PointExpression;
    iconSize?: PointExpression;
    iconAnchor?: PointExpression;
    popupAnchor?: PointExpression;
    className?: string;
  }
  
  interface IconOptions {
    iconUrl: string;
    iconSize?: PointExpression;
    iconAnchor?: PointExpression;
    popupAnchor?: PointExpression;
    shadowUrl?: string;
    shadowSize?: PointExpression;
    shadowAnchor?: PointExpression;
    className?: string;
  }
  
  interface PopupOptions {
    maxWidth?: number;
    minWidth?: number;
    maxHeight?: number;
    autoPan?: boolean;
    autoPanPaddingTopLeft?: PointExpression;
    autoPanPaddingBottomRight?: PointExpression;
    autoPanPadding?: PointExpression;
    keepInView?: boolean;
    closeButton?: boolean;
    autoClose?: boolean;
    closeOnEscapeKey?: boolean;
    closeOnClick?: boolean;
    className?: string;
  }
  
  type LatLngExpression = LatLng | LatLngLiteral | LatLngTuple;
  type LatLngTuple = [number, number];
  type PointExpression = Point | PointTuple;
  type PointTuple = [number, number];
  
  interface LatLng {
    lat: number;
    lng: number;
    alt?: number;
  }
  
  interface LatLngLiteral {
    lat: number;
    lng: number;
    alt?: number;
  }
  
  interface Point {
    x: number;
    y: number;
  }
  
  interface LatLngBounds {
    getSouthWest(): LatLng;
    getNorthEast(): LatLng;
    getNorth(): number;
    getSouth(): number;
    getEast(): number;
    getWest(): number;
    getCenter(): LatLng;
    contains(latlng: LatLngExpression | LatLngBounds): boolean;
    extend(latlng: LatLngExpression | LatLngBounds): this;
    pad(bufferRatio: number): LatLngBounds;
    isValid(): boolean;
  }
  
  class Map {
    constructor(element: string | HTMLElement, options?: MapOptions);
    setView(center: LatLngExpression, zoom?: number, options?: any): this;
    setZoom(zoom: number, options?: any): this;
    getZoom(): number;
    getCenter(): LatLng;
    getBounds(): LatLngBounds;
    getSize(): Point;
    fitBounds(bounds: LatLngBounds, options?: any): this;
    panTo(latlng: LatLngExpression, options?: any): this;
    flyTo(latlng: LatLngExpression, zoom?: number, options?: any): this;
    flyToBounds(bounds: LatLngBounds, options?: any): this;
    invalidateSize(options?: any): this;
    remove(): this;
    on(type: string, fn: (e: any) => void, context?: any): this;
    off(type: string, fn?: (e: any) => void, context?: any): this;
    whenReady(fn: () => void, context?: any): this;
    addLayer(layer: any): this;
    removeLayer(layer: any): this;
    eachLayer(fn: (layer: any) => void, context?: any): this;
  }
  
  class TileLayer {
    constructor(urlTemplate: string, options?: TileLayerOptions);
    addTo(map: Map): this;
    remove(): this;
    setUrl(url: string, noRedraw?: boolean): this;
    bringToFront(): this;
    bringToBack(): this;
  }
  
  class Marker {
    constructor(latlng: LatLngExpression, options?: MarkerOptions);
    addTo(map: Map): this;
    remove(): this;
    setLatLng(latlng: LatLngExpression): this;
    getLatLng(): LatLng;
    setIcon(icon: Icon | DivIcon): this;
    bindPopup(content: string | HTMLElement, options?: PopupOptions): this;
    openPopup(latlng?: LatLngExpression): this;
    closePopup(): this;
    unbindPopup(): this;
    on(type: string, fn: (e: any) => void, context?: any): this;
    off(type: string, fn?: (e: any) => void, context?: any): this;
  }
  
  class Icon {
    constructor(options: IconOptions);
  }
  
  class DivIcon {
    constructor(options: DivIconOptions);
  }
  
  class Popup {
    constructor(options?: PopupOptions, source?: any);
    setLatLng(latlng: LatLngExpression): this;
    getLatLng(): LatLng | undefined;
    setContent(content: string | HTMLElement): this;
    getContent(): string | HTMLElement | undefined;
    openOn(map: Map): this;
    close(): this;
    isOpen(): boolean;
  }
  
  function map(element: string | HTMLElement, options?: MapOptions): Map;
  function tileLayer(urlTemplate: string, options?: TileLayerOptions): TileLayer;
  function marker(latlng: LatLngExpression, options?: MarkerOptions): Marker;
  function icon(options: IconOptions): Icon;
  function divIcon(options: DivIconOptions): DivIcon;
  function popup(options?: PopupOptions, source?: any): Popup;
  function latLng(lat: number, lng: number, alt?: number): LatLng;
  function latLngBounds(corner1: LatLngExpression, corner2: LatLngExpression): LatLngBounds;
  function point(x: number, y: number, round?: boolean): Point;
}

interface Window {
  L: typeof L;
}

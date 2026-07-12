export {};

declare global {
  interface Window {
    naver?: {
      maps?: {
        LatLng: new (latitude: number, longitude: number) => unknown;
        Map: new (
          element: HTMLElement,
          options: {
            center: unknown;
            zoom: number;
            zoomControl?: boolean;
            zoomControlOptions?: {
              position: unknown;
            };
          },
        ) => unknown;
        Marker: new (options: { position: unknown; map: unknown; title?: string }) => unknown;
        InfoWindow: new (options: { content: string; maxWidth?: number }) => {
          open: (map: unknown, marker: unknown) => void;
          close: () => void;
          getMap: () => unknown;
        };
        Event: {
          addListener: (target: unknown, eventName: string, listener: () => void) => void;
        };
        Position: {
          TOP_RIGHT: unknown;
        };
      };
    };
  }
}

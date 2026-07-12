"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { siteConfig } from "@/config/site";

type MapStatus = "missing-config" | "loading" | "ready" | "error";

type OfficeMapProps = {
  compact?: boolean;
};

function hasValidCoordinate(value: number | null) {
  return typeof value === "number" && Number.isFinite(value);
}

function fallbackReason() {
  if (!process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID) return "Naver 지도 Client ID가 아직 설정되지 않았습니다.";
  if (!hasValidCoordinate(siteConfig.location.latitude) || !hasValidCoordinate(siteConfig.location.longitude)) {
    return "사무소 좌표가 아직 설정되지 않았습니다.";
  }
  return "지도를 불러올 수 없습니다.";
}

export function OfficeMap({ compact = false }: OfficeMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [status, setStatus] = useState<MapStatus>("missing-config");
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;
  const latitude = siteConfig.location.latitude;
  const longitude = siteConfig.location.longitude;
  const canLoadMap = Boolean(clientId && hasValidCoordinate(latitude) && hasValidCoordinate(longitude));
  const scriptSrc = useMemo(
    () => (clientId ? `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}` : ""),
    [clientId],
  );

  useEffect(() => {
    if (!canLoadMap) {
      setStatus("missing-config");
      return;
    }

    if (!window.naver?.maps || !mapRef.current || initializedRef.current) return;

    try {
      const position = new window.naver.maps.LatLng(latitude as number, longitude as number);
      const map = new window.naver.maps.Map(mapRef.current, {
        center: position,
        zoom: 16,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
        },
      });
      const marker = new window.naver.maps.Marker({
        position,
        map,
        title: siteConfig.name,
      });
      const infoWindow = new window.naver.maps.InfoWindow({
        content: `<div class="naver-map-info"><strong>${siteConfig.name}</strong><span>${siteConfig.location.address}</span><span>${siteConfig.phone}</span></div>`,
        maxWidth: 260,
      });

      window.naver.maps.Event.addListener(marker, "click", () => {
        if (infoWindow.getMap()) infoWindow.close();
        else infoWindow.open(map, marker);
      });

      infoWindow.open(map, marker);
      initializedRef.current = true;
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [canLoadMap, latitude, longitude]);

  return (
    <div className={compact ? "office-map compact" : "office-map"} aria-label="법률사무소 제우 위치 지도">
      {canLoadMap ? (
        <Script
          id="naver-maps-sdk"
          src={scriptSrc}
          strategy="afterInteractive"
          onLoad={() => {
            initializedRef.current = false;
            setStatus("loading");
          }}
          onError={() => setStatus("error")}
        />
      ) : null}

      <div ref={mapRef} className="office-map-canvas" aria-hidden={status !== "ready"} />

      {status !== "ready" ? (
        <div className="office-map-fallback" aria-live="polite">
          <strong>{status === "loading" ? "지도를 불러오고 있습니다." : "지도를 불러오지 못했습니다."}</strong>
          <p>{status === "loading" ? "잠시만 기다려주세요." : fallbackReason()}</p>
          <p>{siteConfig.location.address}</p>
          <div className="location-action-row">
            <a className="btn btn-secondary" href={siteConfig.location.naverMapUrl} target="_blank" rel="noopener noreferrer">
              Naver 지도에서 위치 확인
            </a>
            <a className="btn btn-primary" href={siteConfig.phoneHref}>
              전화상담
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

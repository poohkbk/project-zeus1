"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { siteConfig } from "@/config/site";

type MapStatus = "missing-config" | "loading" | "ready" | "auth-error" | "error";

type OfficeMapProps = {
  compact?: boolean;
};

const defaultNaverMapsClientId = "0bxkgbpdjy";

function hasValidCoordinate(value: number | null) {
  return typeof value === "number" && Number.isFinite(value);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character] as string;
  });
}

function getStatusTitle(status: MapStatus) {
  if (status === "loading") return "네이버 지도를 불러오고 있습니다.";
  if (status === "auth-error") return "네이버 지도 인증을 확인해 주세요.";
  return "지도를 불러오지 못했습니다.";
}

function getStatusDescription(status: MapStatus) {
  if (status === "loading") return "잠시만 기다려 주세요.";
  if (status === "auth-error") {
    return "네이버 클라우드 Maps의 Web 서비스 URL과 Client ID 설정을 확인해 주세요.";
  }
  if (!hasValidCoordinate(siteConfig.location.latitude) || !hasValidCoordinate(siteConfig.location.longitude)) {
    return "사무소 좌표가 아직 설정되지 않았습니다.";
  }
  return "브라우저 또는 지도 API 설정 문제로 지도를 불러오지 못했습니다.";
}

export function OfficeMap({ compact = false }: OfficeMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [scriptReady, setScriptReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID || defaultNaverMapsClientId;
  const latitude = siteConfig.location.latitude;
  const longitude = siteConfig.location.longitude;
  const canLoadMap = Boolean(clientId && hasValidCoordinate(latitude) && hasValidCoordinate(longitude));
  const scriptSrc = useMemo(
    () => (clientId ? `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}` : ""),
    [clientId],
  );

  useEffect(() => {
    window.navermap_authFailure = () => {
      initializedRef.current = false;
      setStatus("auth-error");
    };

    if (window.naver?.maps) setScriptReady(true);

    return () => {
      if (window.navermap_authFailure) delete window.navermap_authFailure;
    };
  }, []);

  useEffect(() => {
    if (!canLoadMap) {
      setStatus("missing-config");
      return;
    }

    if (scriptReady && !window.naver?.maps) {
      const timer = window.setTimeout(() => {
        if (!window.naver?.maps) {
          setStatus((current) => (current === "auth-error" ? current : "error"));
        }
      }, 4000);

      return () => window.clearTimeout(timer);
    }

    if (!scriptReady || !window.naver?.maps || !mapRef.current || initializedRef.current) return;

    try {
      mapRef.current.innerHTML = "";

      const position = new window.naver.maps.LatLng(latitude as number, longitude as number);
      const map = new window.naver.maps.Map(mapRef.current, {
        center: position,
        zoom: compact ? 15 : 16,
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
        content: `<div class="naver-map-info"><strong>${escapeHtml(siteConfig.name)}</strong><span>${escapeHtml(siteConfig.location.address)}</span><span>${escapeHtml(siteConfig.phone)}</span></div>`,
        maxWidth: 260,
      });

      window.naver.maps.Event.addListener(marker, "click", () => {
        if (infoWindow.getMap()) infoWindow.close();
        else infoWindow.open(map, marker);
      });

      infoWindow.open(map, marker);
      initializedRef.current = true;
      setStatus("ready");

      const refreshTimers = [250, 800, 1600].map((delay) =>
        window.setTimeout(() => {
          map.refresh();
          map.setCenter(position);
        }, delay),
      );

      return () => refreshTimers.forEach((timer) => window.clearTimeout(timer));
    } catch {
      setStatus("error");
    }
  }, [canLoadMap, compact, latitude, longitude, scriptReady]);

  return (
    <div className={compact ? "office-map compact" : "office-map"} aria-label="법률사무소 제우 위치 지도">
      {canLoadMap ? (
        <Script
          id="naver-maps-sdk"
          src={scriptSrc}
          strategy="afterInteractive"
          onLoad={() => {
            initializedRef.current = false;
            setScriptReady(true);
            setStatus((current) => (current === "auth-error" ? current : "loading"));
          }}
          onError={() => setStatus("error")}
        />
      ) : null}

      <div ref={mapRef} className="office-map-canvas" aria-hidden={status !== "ready"} />

      {status !== "ready" ? (
        <div className="office-map-fallback" aria-live="polite">
          <strong>{getStatusTitle(status)}</strong>
          <p>{getStatusDescription(status)}</p>
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

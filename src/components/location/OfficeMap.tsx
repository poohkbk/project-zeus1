"use client";

import { siteConfig } from "@/config/site";

type OfficeMapProps = {
  compact?: boolean;
};

export function OfficeMap({ compact = false }: OfficeMapProps) {
  const title = `${siteConfig.name} 네이버 지도`;

  return (
    <div className={compact ? "office-map compact" : "office-map"} aria-label="법률사무소 제우 위치 지도">
      <iframe
        className="office-map-frame"
        src={siteConfig.location.naverMapUrl}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="office-map-open">
        <a className="btn btn-primary" href={siteConfig.location.naverMapUrl} target="_blank" rel="noopener noreferrer">
          Naver 지도에서 크게 보기
        </a>
      </div>
    </div>
  );
}

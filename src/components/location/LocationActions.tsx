"use client";

import { useState } from "react";
import { siteConfig } from "@/config/site";

export function LocationActions() {
  const [copyMessage, setCopyMessage] = useState("");

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(siteConfig.location.address);
      setCopyMessage("주소가 복사되었습니다.");
    } catch {
      setCopyMessage(siteConfig.location.address);
    }
  }

  return (
    <div className="location-actions">
      <button className="btn btn-secondary" type="button" onClick={copyAddress}>
        주소 복사
      </button>
      <a className="btn btn-accent" href={siteConfig.location.naverMapUrl} target="_blank" rel="noopener noreferrer">
        Naver 지도에서 길찾기
      </a>
      <a className="btn btn-primary" href={siteConfig.phoneHref}>
        전화상담
      </a>
      <p aria-live="polite">{copyMessage}</p>
    </div>
  );
}

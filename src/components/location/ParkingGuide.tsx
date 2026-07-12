import { siteConfig } from "@/config/site";

export function ParkingGuide() {
  return (
    <section className="location-guide-card" aria-labelledby="parking-title">
      <span className="section-kicker">Parking</span>
      <h2 id="parking-title">주차 안내</h2>
      <p>{siteConfig.location.parkingDescription}</p>
      <p className="location-note">무료 주차 시간은 운영자가 확인한 경우에만 별도로 안내합니다.</p>
    </section>
  );
}

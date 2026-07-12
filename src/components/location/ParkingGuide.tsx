import { siteConfig } from "@/config/site";

export function ParkingGuide() {
  return (
    <section className="location-guide-card" aria-labelledby="parking-title">
      <span className="section-kicker">Parking</span>
      <h2 id="parking-title">주차 안내</h2>
      <p>{siteConfig.location.parkingDescription}</p>
      <p className="location-note">방문 시 건물 주차장 이용 여부를 함께 확인해 주세요.</p>
    </section>
  );
}

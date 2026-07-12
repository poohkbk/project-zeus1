import { LocationActions } from "@/components/location/LocationActions";
import { siteConfig } from "@/config/site";

export function OfficeInformation() {
  return (
    <aside className="location-info-card" aria-labelledby="office-info-title">
      <span className="section-kicker">Office</span>
      <h2 id="office-info-title">사무소 정보</h2>
      <dl className="location-info-list">
        <div>
          <dt>주소</dt>
          <dd>
            {siteConfig.location.address}
            <small>{siteConfig.location.building}</small>
          </dd>
        </div>
        <div>
          <dt>전화</dt>
          <dd>
            <a href={siteConfig.phoneHref}>{siteConfig.phone}</a>
          </dd>
        </div>
        <div>
          <dt>팩스</dt>
          <dd>{siteConfig.fax}</dd>
        </div>
        <div>
          <dt>이메일</dt>
          <dd>
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
          </dd>
        </div>
        <div>
          <dt>운영시간</dt>
          <dd>{siteConfig.businessHours}</dd>
        </div>
      </dl>
      <p className="location-note">재판, 외부 일정으로 상담 가능 시간이 달라질 수 있으므로 방문 전 예약을 권장합니다.</p>
      <LocationActions />
    </aside>
  );
}

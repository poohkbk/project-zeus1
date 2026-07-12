import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { LocationActions } from "@/components/location/LocationActions";
import { OfficeMap } from "@/components/location/OfficeMap";
import { siteConfig } from "@/config/site";

export function HomeLocationSection() {
  return (
    <section className="home-location-section" aria-labelledby="home-location-title">
      <div className="site-shell">
        <Reveal>
          <span className="section-kicker invert">Location</span>
          <h2 id="home-location-title">오시는 길</h2>
        </Reveal>
        <div className="home-location-grid">
          <Reveal>
            <OfficeMap compact />
          </Reveal>
          <Reveal className="home-location-info" delay={100}>
            <strong>{siteConfig.name}</strong>
            <dl className="home-location-list">
              <div>
                <dt>주소</dt>
                <dd>{siteConfig.location.address}</dd>
              </div>
              <div>
                <dt>연락처</dt>
                <dd>
                  <a href={siteConfig.phoneHref}>{siteConfig.phone}</a>
                </dd>
              </div>
              <div>
                <dt>운영시간</dt>
                <dd>{siteConfig.businessHours}</dd>
              </div>
              <div>
                <dt>주차</dt>
                <dd>{siteConfig.location.parkingDescription}</dd>
              </div>
            </dl>
            <LocationActions />
            <Link className="btn btn-light" href={siteConfig.links.location}>
              상세 오시는 길 보기
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

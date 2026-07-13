export const siteConfig = {
  name: "법률사무소 제우",
  englishName: "LAW OFFICE ZEU",
  description: "청주 민사, 형사, 이혼, 상속 사건을 상담하는 법률사무소 제우입니다.",
  phone: "043-296-3901",
  phoneHref: "tel:0432963901",
  mobile: "010-3096-1629",
  fax: "043-296-3900",
  email: "tglaw-kbk@nate.com",
  address: "충청북도 청주시 서원구 산남로70번길 34, 201호",
  businessHours: "평일 오전 9:00 ~ 오후 6:00",
  location: {
    address: "충청북도 청주시 서원구 산남로70번길 34, 201호",
    building: "산성미소시티블루1",
    latitude: process.env.NEXT_PUBLIC_OFFICE_LATITUDE
      ? Number(process.env.NEXT_PUBLIC_OFFICE_LATITUDE)
      : 36.61269,
    longitude: process.env.NEXT_PUBLIC_OFFICE_LONGITUDE
      ? Number(process.env.NEXT_PUBLIC_OFFICE_LONGITUDE)
      : 127.466455,
    naverMapUrl:
      process.env.NEXT_PUBLIC_NAVER_MAP_URL ||
      "https://map.naver.com/p/entry/place/36364453?c=15.00,0,0,0,dh&isCorrectAnswer=true&placePath=%2Fhome%3Ffrom%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202607122310%26locale%3Dko%26svcName%3Dmap_pcv5",
    parkingDescription: "본건물 지하주차장을 이용하실 수 있으며, 무료 주차 시간은 2시간입니다.",
  },
  links: {
    consultation: "/consultation",
    cases: "/cases",
    legalGuide: "/legal-guide",
    lawyer: "/about/lawyer",
    location: "/about/location",
    aiGuide: "/tools/ai-guide",
  },
};

export const legacyCaseSlugs = new Set([
  "military-pension-property-division",
  "contract-dispute",
  "de-facto-marriage-property-division",
  "debt-claim-evidence",
  "inheritance-division-written-confirmation",
  "criminal-sentencing-mitigation",
  "lease-eviction-deposit",
  "damages-claim-proof",
  "visitation-modification",
  "affair-damages",
  "reserved-share-claim",
  "limited-acceptance-inheritance-debt",
  "fraud-police-investigation",
]);

export function isLegacyCaseSlug(slug: string) {
  return legacyCaseSlugs.has(slug);
}

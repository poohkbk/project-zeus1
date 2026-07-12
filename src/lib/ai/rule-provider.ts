import type { AiLegalGuideProvider } from "@/types/ai-provider";

export const ruleBasedLegalGuideProvider: AiLegalGuideProvider = {
  name: "rule",
  async classify(_inputRedacted, ruleClassification) {
    return { data: ruleClassification };
  },
  async composeResult(ruleResult) {
    return {
      data: {
        situationSummary: ruleResult.situationSummary,
        missingInformation: ruleResult.missingInformation,
        safetyNotice: ruleResult.safetyNotice,
      },
    };
  },
};

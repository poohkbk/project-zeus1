"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import {
  formatKoreanMobilePhone,
  submitConsultation,
  trimAndNormalizeSpaces,
  validateConsultationCategory,
  validateConsultationForm,
  validateConsultationMessage,
  validateConsultationName,
  validateConsultationPhone,
  validatePrivacyAgreement,
} from "@/lib/consultation-validation";
import type { ConsultationFormErrors, ConsultationFormValues } from "@/types/consultation";
import { SimpleIcon } from "@/components/icons/SimpleIcon";
import { CaseCategorySelector } from "./CaseCategorySelector";
import { ConsultationField } from "./ConsultationField";
import { ConsultationSuccess } from "./ConsultationSuccess";
import { PrivacyConsent } from "./PrivacyConsent";

const initialValues: ConsultationFormValues = {
  name: "",
  phone: "",
  category: "",
  message: "",
  privacyAgreed: false,
  source: "direct",
};

const fieldOrder: Array<keyof ConsultationFormErrors> = [
  "name",
  "phone",
  "category",
  "message",
  "privacyAgreed",
];

interface ConsultationFormProps {
  aiTransferToken?: string;
}

const aiCategoryToConsultationCategory = {
  civil: "civil",
  criminal: "criminal",
  divorce: "divorce",
  inheritance: "inheritance",
  administrative: "administrative",
} as const;

function formatAiSummaryMessage(summary: NonNullable<ConsultationFormValues["aiSummary"]>) {
  const lines = [
    "[AI 법률안내 상담요약]",
    `분야: ${summary.categoryLabel}${summary.subcategoryLabel ? ` / ${summary.subcategoryLabel}` : ""}`,
    `긴급도: ${summary.urgencyLevel}`,
    "",
    "상황 요약",
    summary.situationSummary,
    "",
    "확인된 내용",
    ...(summary.confirmedFacts.length > 0 ? summary.confirmedFacts : ["아직 확인된 내용이 부족합니다."]),
    "",
    "보유 증거",
    ...(summary.availableEvidence.length > 0 ? summary.availableEvidence : ["추가 확인이 필요합니다."]),
    "",
    "추가 확인 필요",
    ...(summary.missingInformation.length > 0 ? summary.missingInformation : ["상담 시 구체적으로 확인하겠습니다."]),
    "",
    "주요 쟁점",
    ...(summary.keyIssues.length > 0 ? summary.keyIssues : ["사안 확인 후 정리하겠습니다."]),
  ];

  return lines.join("\n").slice(0, 3000);
}

export function ConsultationForm({ aiTransferToken }: ConsultationFormProps) {
  const [values, setValues] = useState<ConsultationFormValues>(initialValues);
  const [errors, setErrors] = useState<ConsultationFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receptionNumber, setReceptionNumber] = useState("");
  const [submitFailed, setSubmitFailed] = useState(false);
  const [aiTransferNotice, setAiTransferNotice] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const messageLength = useMemo(() => values.message.length, [values.message]);
  const hasErrors = Object.keys(errors).some((key) => Boolean(errors[key as keyof ConsultationFormErrors]));

  useEffect(() => {
    if (!aiTransferToken) return;

    let ignore = false;
    const token = aiTransferToken;
    async function loadAiSummary() {
      try {
        const response = await fetch(`/api/ai-guide/transfer?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("AI summary not found");
        const data = (await response.json()) as {
          summary?: ConsultationFormValues["aiSummary"] & {
            category?: keyof typeof aiCategoryToConsultationCategory | "unclear";
          };
        };
        const summary = data.summary;
        if (ignore || !summary) return;

        const category =
          summary.category && summary.category !== "unclear"
            ? aiCategoryToConsultationCategory[summary.category]
            : "";
        setValues((current) => ({
          ...current,
          category: current.category || category,
          message: current.message || formatAiSummaryMessage(summary),
          source: "ai-guide",
          aiTransferToken: token,
          aiSummary: summary,
        }));
        setAiTransferNotice("AI 법률안내 요약을 상담신청서에 불러왔습니다. 내용은 제출 전에 직접 수정할 수 있습니다.");
      } catch {
        if (!ignore) setAiTransferNotice("AI 요약을 불러오지 못했습니다. 일반 상담신청으로 계속 작성할 수 있습니다.");
      }
    }

    loadAiSummary();
    return () => {
      ignore = true;
    };
  }, [aiTransferToken]);

  function updateErrors(nextValues: ConsultationFormValues) {
    const nextErrors = validateConsultationForm(nextValues);
    setErrors(nextErrors);
    return nextErrors;
  }

  function validateField(name: keyof ConsultationFormErrors, nextValues = values) {
    setTouched((current) => ({ ...current, [name]: true }));

    const nextErrors = { ...errors };
    const error =
      name === "name"
        ? validateConsultationName(nextValues.name)
        : name === "phone"
          ? validateConsultationPhone(nextValues.phone)
          : name === "category"
            ? validateConsultationCategory(nextValues.category)
            : name === "message"
              ? validateConsultationMessage(nextValues.message)
              : validatePrivacyAgreement(nextValues.privacyAgreed);

    if (error) {
      nextErrors[name] = error;
    } else {
      delete nextErrors[name];
    }

    setErrors(nextErrors);
  }

  function focusFirstError(nextErrors: ConsultationFormErrors) {
    const firstError = fieldOrder.find((fieldName) => nextErrors[fieldName]);
    if (!firstError || !formRef.current) return;

    const target = formRef.current.querySelector<HTMLElement>(
      `[name="${firstError}"], #${firstError}`,
    );
    target?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedValues: ConsultationFormValues = {
      ...values,
      name: trimAndNormalizeSpaces(values.name),
      phone: formatKoreanMobilePhone(values.phone),
      message: trimAndNormalizeSpaces(values.message),
    };
    setValues(normalizedValues);
    setTouched({
      name: true,
      phone: true,
      category: true,
      message: true,
      privacyAgreed: true,
    });

    const nextErrors = updateErrors(normalizedValues);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitFailed(false);
    const result = await submitConsultation(normalizedValues);
    setIsSubmitting(false);

    if (!result.success || !result.receptionNumber) {
      setSubmitFailed(true);
      setErrors({
        submit:
          result.errorMessage ||
          "상담신청이 접수되지 못했습니다. 잠시 후 다시 시도하거나 대표전화로 문의해 주세요.",
      });
      return;
    }

    setReceptionNumber(result.receptionNumber);
  }

  function handleReset() {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitFailed(false);
    setReceptionNumber("");
    window.requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLInputElement>("#name")?.focus();
    });
  }

  if (receptionNumber) {
    return <ConsultationSuccess receptionNumber={receptionNumber} onReset={handleReset} />;
  }

  return (
    <section className="consultation-form-section" aria-labelledby="consultation-form-title">
      <div className="consultation-section-heading">
        <span className="section-kicker">Request</span>
        <h2 id="consultation-form-title">상담 신청서</h2>
        <p>필수 항목을 입력하면 담당자가 확인 후 연락드립니다.</p>
      </div>

      {hasErrors ? (
        <div className="consultation-error-summary" role="alert" aria-live="assertive">
          <strong>입력 내용을 확인해 주세요.</strong>
          <ul>
            {fieldOrder
              .filter((fieldName) => errors[fieldName])
              .map((fieldName) => (
                <li key={fieldName}>{errors[fieldName]}</li>
              ))}
          </ul>
        </div>
      ) : null}

      {submitFailed ? (
        <div className="consultation-submit-failure" role="alert">
          <p>
            상담신청이 접수되지 못했습니다. 잠시 후 다시 시도하거나 대표전화로 문의해 주세요.
          </p>
          <div>
            <button type="button" onClick={() => setSubmitFailed(false)}>
              다시 시도
            </button>
            <a href={siteConfig.phoneHref}>전화상담</a>
          </div>
        </div>
      ) : null}

      {aiTransferNotice ? (
        <div className="consultation-ai-transfer-notice" role="status">
          {aiTransferNotice}
        </div>
      ) : null}

      <form ref={formRef} className="consultation-form" onSubmit={handleSubmit} noValidate>
        <div className="consultation-form-grid">
          <ConsultationField
            id="name"
            name="name"
            label="이름"
            placeholder="성함을 입력해 주세요"
            autoComplete="name"
            required
            value={values.name}
            error={touched.name ? errors.name : undefined}
            onChange={(event) => {
              const nextValues = { ...values, name: event.target.value };
              setValues(nextValues);
              if (touched.name) validateField("name", nextValues);
            }}
            onBlur={() => validateField("name")}
          />

          <ConsultationField
            id="phone"
            name="phone"
            label="연락처"
            placeholder="010-0000-0000"
            inputMode="tel"
            autoComplete="tel"
            required
            value={values.phone}
            error={touched.phone ? errors.phone : undefined}
            onChange={(event) => {
              const nextValues = {
                ...values,
                phone: formatKoreanMobilePhone(event.target.value),
              };
              setValues(nextValues);
              if (touched.phone) validateField("phone", nextValues);
            }}
            onBlur={() => validateField("phone")}
          />
        </div>

        <CaseCategorySelector
          value={values.category}
          error={touched.category ? errors.category : undefined}
          onChange={(category) => {
            const nextValues = { ...values, category };
            setValues(nextValues);
            if (touched.category) validateField("category", nextValues);
          }}
          onBlur={() => validateField("category")}
        />

        <ConsultationField
          id="message"
          name="message"
          kind="textarea"
          label="상담 내용"
          placeholder="현재 상황, 상대방과의 관계, 진행 중인 절차, 궁금한 점을 가능한 범위에서 작성해 주세요."
          required
          minLength={20}
          maxLength={3000}
          value={values.message}
          count={messageLength}
          maxCount={3000}
          error={touched.message ? errors.message : undefined}
          hint="주민등록번호, 계좌 비밀번호 등 불필요한 민감정보는 입력하지 마세요."
          onChange={(event) => {
            const nextValues = { ...values, message: event.target.value.slice(0, 3000) };
            setValues(nextValues);
            if (touched.message) validateField("message", nextValues);
          }}
          onBlur={() => validateField("message")}
        />

        <PrivacyConsent
          checked={values.privacyAgreed}
          error={touched.privacyAgreed ? errors.privacyAgreed : undefined}
          onChange={(privacyAgreed) => {
            const nextValues = { ...values, privacyAgreed };
            setValues(nextValues);
            if (touched.privacyAgreed) validateField("privacyAgreed", nextValues);
          }}
          onBlur={() => validateField("privacyAgreed")}
        />

        <div className="consultation-form-actions">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting} aria-busy={isSubmitting}>
            <SimpleIcon name="calendar" />
            {isSubmitting ? "접수 중..." : "상담신청 접수"}
          </button>
          <a href={siteConfig.phoneHref} className="btn btn-outline">
            <SimpleIcon name="phone" />
            전화상담
          </a>
        </div>
      </form>
    </section>
  );
}

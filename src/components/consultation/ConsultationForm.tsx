"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
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
};

const fieldOrder: Array<keyof ConsultationFormErrors> = [
  "name",
  "phone",
  "category",
  "message",
  "privacyAgreed",
];

export function ConsultationForm() {
  const [values, setValues] = useState<ConsultationFormValues>(initialValues);
  const [errors, setErrors] = useState<ConsultationFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receptionNumber, setReceptionNumber] = useState("");
  const [submitFailed, setSubmitFailed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const messageLength = useMemo(() => values.message.length, [values.message]);
  const hasErrors = Object.keys(errors).some((key) => Boolean(errors[key as keyof ConsultationFormErrors]));

  function updateErrors(nextValues: ConsultationFormValues) {
    const nextErrors = validateConsultationForm(nextValues);
    setErrors(nextErrors);
    return nextErrors;
  }

  function validateField(name: keyof ConsultationFormValues, nextValues = values) {
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

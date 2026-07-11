"use client";

import { consultationCategories } from "@/data/consultation";
import type { ConsultationCategory } from "@/types/consultation";
import { SimpleIcon } from "@/components/icons/SimpleIcon";

type CaseCategorySelectorProps = {
  value: ConsultationCategory | "";
  error?: string;
  onChange: (value: ConsultationCategory) => void;
  onBlur: () => void;
};

export function CaseCategorySelector({
  value,
  error,
  onChange,
  onBlur,
}: CaseCategorySelectorProps) {
  return (
    <fieldset
      className="consultation-category-field"
      aria-invalid={error ? "true" : "false"}
      aria-describedby={error ? "category-error" : undefined}
    >
      <legend>
        사건 분야 <span aria-hidden="true">*</span>
      </legend>
      <div className="consultation-category-grid">
        {consultationCategories.map((category) => (
          <label
            key={category.value}
            className="consultation-category-card"
            data-accent={category.accent}
            data-selected={value === category.value ? "true" : "false"}
          >
            <input
              type="radio"
              name="category"
              value={category.value}
              checked={value === category.value}
              onChange={() => onChange(category.value)}
              onBlur={onBlur}
            />
            <span className="consultation-category-icon">
              <SimpleIcon name={category.icon} />
            </span>
            <strong>
              {category.label}
              {value === category.value ? <span>선택됨</span> : null}
            </strong>
            <small>{category.description}</small>
          </label>
        ))}
      </div>
      {error ? (
        <p id="category-error" className="consultation-error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

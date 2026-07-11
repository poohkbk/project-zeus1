import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type BaseProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
};

type InputFieldProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    kind?: "input";
  };

type TextareaFieldProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    kind: "textarea";
    count?: number;
    maxCount?: number;
  };

type ConsultationFieldProps = InputFieldProps | TextareaFieldProps;

export function ConsultationField(props: ConsultationFieldProps) {
  const { id, label, required = false, error, hint } = props;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ");

  return (
    <div className="consultation-field">
      <label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true">*</span> : null}
      </label>

      {props.kind === "textarea" ? (
        <>
          {(() => {
            const {
              id: fieldId,
              label: fieldLabel,
              required: fieldRequired,
              error: fieldError,
              hint: fieldHint,
              kind,
              count,
              maxCount,
              ...textareaProps
            } = props;

            void fieldId;
            void fieldLabel;
            void fieldRequired;
            void fieldError;
            void fieldHint;
            void kind;
            void count;
            void maxCount;

            return (
              <textarea
                {...textareaProps}
                id={id}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={describedBy || undefined}
              />
            );
          })()}
          <div className="consultation-field-row">
            {hint ? <p id={hintId}>{hint}</p> : <span />}
            <span aria-live="polite">
              {props.count?.toLocaleString()} / {props.maxCount?.toLocaleString()}자
            </span>
          </div>
        </>
      ) : (
        <>
          {(() => {
            const {
              id: fieldId,
              label: fieldLabel,
              required: fieldRequired,
              error: fieldError,
              hint: fieldHint,
              kind,
              ...inputProps
            } = props;

            void fieldId;
            void fieldLabel;
            void fieldRequired;
            void fieldError;
            void fieldHint;
            void kind;

            return (
              <input
                {...inputProps}
                id={id}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={describedBy || undefined}
              />
            );
          })()}
          {hint ? <p id={hintId}>{hint}</p> : null}
        </>
      )}

      {error ? (
        <p id={errorId} className="consultation-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

import { TextareaHTMLAttributes, forwardRef } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, hint, className = "", id, required, ...props },
  ref
) {
  const inputId = id ?? props.name;

  return (
    <div className={`fld ${className}`}>
      <label htmlFor={inputId} className="lbl">
        {label}
        {required ? <span className="req">*</span> : null}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        required={required}
        className="in !h-auto min-h-[96px] resize-none !py-[11px] leading-relaxed"
        {...props}
      />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
});

import { InputHTMLAttributes, forwardRef, type ReactNode } from "react";
import { FieldInfo } from "@/components/ui/FieldInfo";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  info?: ReactNode;
  /** Right side of the label row (e.g. a "Forgot?" link). */
  aside?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, info, aside, className = "", id, ...props },
  ref
) {
  const inputId = id ?? props.name;

  return (
    <div className={`fld ${className}`}>
      <div className="lbl-row">
        <label htmlFor={inputId} className="lbl inline-flex items-center">
          {label}
          {info ? <FieldInfo>{info}</FieldInfo> : null}
        </label>
        {aside}
      </div>
      <input ref={ref} id={inputId} className="in" {...props} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
});

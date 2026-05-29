import type { ReactNode } from "react";

interface UtilityChipProps {
  icon?: ReactNode;
  label: string;
  className?: string;
}

export default function UtilityChip({ icon, label, className = "" }: UtilityChipProps) {
  return (
    <span className={`flex items-center gap-1 text-[11px] text-slate-500 ${className}`}>
      {icon}
      {label}
    </span>
  );
}

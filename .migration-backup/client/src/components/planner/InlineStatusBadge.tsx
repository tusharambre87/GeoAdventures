interface InlineStatusBadgeProps {
  label: string;
  className?: string;
  testId?: string;
}

export default function InlineStatusBadge({ label, className = "", testId }: InlineStatusBadgeProps) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${className}`}
      data-testid={testId}
    >
      {label}
    </span>
  );
}

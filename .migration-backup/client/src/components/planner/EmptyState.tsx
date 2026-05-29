interface EmptyStateProps {
  emoji?: string;
  message: string;
}

export default function EmptyState({ emoji = "📍", message }: EmptyStateProps) {
  return (
    <div className="text-center py-16" data-testid="empty-state">
      <div className="text-5xl mb-3">{emoji}</div>
      <p className="text-slate-500 font-medium">{message}</p>
    </div>
  );
}

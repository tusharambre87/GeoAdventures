interface DayChipProps {
  day: number;
  isSelected: boolean;
  onClick: () => void;
}

export default function DayChip({ day, isSelected, onClick }: DayChipProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
        isSelected
          ? "bg-orange-500 text-white shadow-md"
          : "bg-orange-50 text-orange-600 hover:bg-orange-100"
      }`}
      data-testid={`chip-day-${day}`}
    >
      Day {day}
    </button>
  );
}

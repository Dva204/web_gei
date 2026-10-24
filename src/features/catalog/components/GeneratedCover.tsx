export function GeneratedCover({
  title,
  index = 0,
}: {
  title: string;
  index?: number;
}) {
  index = Number.isFinite(index) ? index : Array.from(title).reduce((sum, char) => (sum + char.charCodeAt(0)) % 97, 0);
  return (
    <div
      className="relative flex aspect-[2/3] items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-[var(--mint-large)] p-4 text-center text-[var(--mint-ink)]"
      aria-label={`Bìa truyện ${title}`}
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-20"
        viewBox="0 0 100 150"
        aria-hidden
      >
        <circle
          cx={((index * 17) % 90) + 5}
          cy="25"
          r="18"
          fill="none"
          stroke="currentColor"
        />
        <path
          d="M0 120 Q50 80 100 120 M15 0 Q45 60 80 150"
          fill="none"
          stroke="currentColor"
        />
      </svg>
      <strong
        className="relative text-base leading-snug"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {title}
      </strong>
    </div>
  );
}

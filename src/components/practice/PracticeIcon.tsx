import type { PracticeArea } from "@/types/practice";

type PracticeIconProps = {
  name: PracticeArea["icon"];
};

const paths: Record<PracticeArea["icon"], string> = {
  scale: "M12 3v18 M5 7h14 M7 7l-3 6h6z M17 7l-3 6h6z",
  shield: "M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6z",
  family:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M17 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z M3 20c.5-4 2.8-6 6-6s5.5 2 6 6 M14 14c2.8.2 4.6 2.2 5 6",
  landmark: "M4 21h16 M6 18h12 M7 10v8 M12 10v8 M17 10v8 M3 8l9-5 9 5z",
};

export function PracticeIcon({ name }: PracticeIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

import type { QuickIssue } from "@/types/content";

type SimpleIconProps = {
  name: QuickIssue["icon"] | "arrow" | "phone" | "calendar" | "check";
};

export function SimpleIcon({ name }: SimpleIconProps) {
  if (name === "arrow") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.6 3.8 9 3l3 5-1.8 2c1 2 2.7 3.7 4.8 4.8l2-1.8 5 3-.8 2.4c-.4 1.2-1.5 2-2.8 1.8C10.4 19.3 4.7 13.6 3.8 5.6c-.2-1.3.6-2.4 1.8-2.8Z" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  const paths: Record<QuickIssue["icon"], string> = {
    money: "M4 7h16v10H4z M8 11h.01 M16 13h.01 M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    contract: "M7 3h8l4 4v14H7z M15 3v5h4 M10 12h6 M10 16h6",
    home: "M4 11 12 4l8 7 M6 10v10h12V10 M10 20v-6h4v6",
    shield: "M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6z",
    family: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M17 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z M3 20c.5-4 2.8-6 6-6s5.5 2 6 6 M14 14c2.8.2 4.6 2.2 5 6",
    scale: "M12 3v18 M5 7h14 M7 7l-3 6h6z M17 7l-3 6h6z",
    tree: "M12 20v-7 M8 13a4 4 0 1 1 4-6 4 4 0 1 1 4 6z",
    help: "M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-.9.9-1.9 1.4-1.9 3.1 M12 18h.01 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

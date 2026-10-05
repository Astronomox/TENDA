import React from "react";
import Image from "next/image";

/**
 * TENDA brand: the rising-arrow mark, optionally followed by the wordmark.
 * Images live in /public/brand (generated from the master logo).
 */

const MARK = { src: "/brand/tenda-mark.png", white: "/brand/tenda-mark-white.png", width: 512, height: 331 };

type Tone = "brand" | "dark" | "light";

const TEXT_COLOR: Record<Tone, string> = {
  brand: "text-[#F28334]",
  dark: "text-[#1A1A1A]",
  light: "text-white",
};

/** Just the arrow. `className` sets the height, e.g. "h-6". */
export function LogoMark({ className = "h-6", white = false, priority = false }: {
  className?: string;
  white?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src={white ? MARK.white : MARK.src}
      width={MARK.width}
      height={MARK.height}
      alt=""
      aria-hidden
      priority={priority}
      className={`${className} w-auto select-none`}
      draggable={false}
    />
  );
}

/** Arrow + "TENDA". `size` scales both together. */
export default function Logo({
  size = "md",
  tone = "dark",
  className = "",
  priority = false,
}: {
  size?: "sm" | "md" | "lg";
  tone?: Tone;
  className?: string;
  priority?: boolean;
}) {
  const s = {
    sm: { mark: "h-5", text: "text-[20px]", gap: "gap-2" },
    md: { mark: "h-6", text: "text-2xl", gap: "gap-2.5" },
    lg: { mark: "h-9", text: "text-4xl", gap: "gap-3" },
  }[size];
  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <LogoMark className={s.mark} white={tone === "light"} priority={priority} />
      <span className={`font-display font-extrabold tracking-[-0.03em] leading-none ${s.text} ${TEXT_COLOR[tone]}`}>
        TENDA
      </span>
    </span>
  );
}

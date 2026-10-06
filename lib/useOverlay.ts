"use client";

import { useEffect, useRef } from "react";

// How many overlays are open; the page scrolls again only when the last one closes.
let openOverlays = 0;
let savedOverflow = "";

/**
 * For dialogs and sheets: stops the page behind from scrolling while open and
 * calls `onClose` when Escape is pressed.
 */
export function useOverlay(onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (openOverlays++ === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (--openOverlays === 0) document.body.style.overflow = savedOverflow;
    };
  }, []);
}

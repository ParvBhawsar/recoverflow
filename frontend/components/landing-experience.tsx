"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function LandingExperience() {
  const pathname = usePathname();
  const progressRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname !== "/") return;

    const body = document.body;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine) and (hover: hover)").matches;
    const darkBand = document.querySelector<HTMLElement>("main > section:nth-of-type(2)");
    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main > section:not(.hero-glow) > div, main > footer > div"
      )
    );
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>(
        "#platform .group, #insights .grid > div, figure.group"
      )
    );

    body.classList.add("rf-landing-active");
    darkBand?.classList.add("rf-dark-band");

    let observer: IntersectionObserver | null = null;

    if (reducedMotion) {
      revealTargets.forEach((element) => element.classList.add("rf-visible"));
      revealItems.forEach((element) => element.classList.add("rf-visible"));
    } else {
      revealTargets.forEach((element) => element.classList.add("rf-reveal-content"));
      revealItems.forEach((element, index) => {
        element.classList.add("rf-reveal-item");
        element.style.setProperty("--rf-delay", `${Math.min(index * 35, 140)}ms`);
      });

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            (entry.target as HTMLElement).classList.add("rf-visible");
            observer?.unobserve(entry.target);
          });
        },
        { threshold: 0.06, rootMargin: "0px 0px -2% 0px" }
      );

      revealTargets.forEach((element) => observer?.observe(element));
      revealItems.forEach((element) => observer?.observe(element));
    }

    let scrollFrame = 0;
    let scrollTicking = false;

    const updateScrollState = () => {
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
      body.classList.toggle("rf-scrolled", window.scrollY > 22);
      scrollTicking = false;
    };

    const requestScrollUpdate = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      scrollFrame = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    window.addEventListener("resize", requestScrollUpdate, { passive: true });

    let cursorFrame = 0;
    let cursorTicking = false;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;

    const paintCursor = () => {
      const transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
      if (dotRef.current) dotRef.current.style.transform = transform;
      if (haloRef.current) haloRef.current.style.transform = transform;
      cursorTicking = false;
    };

    const requestCursorPaint = () => {
      if (cursorTicking) return;
      cursorTicking = true;
      cursorFrame = window.requestAnimationFrame(paintCursor);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer || event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      body.classList.add("rf-cursor-ready");
      requestCursorPaint();
    };

    const onPointerOver = (event: PointerEvent) => {
      if (!finePointer) return;
      const target = event.target as Element | null;
      if (target?.closest("a, button, [role='button'], input, select")) {
        body.classList.add("rf-cursor-engaged");
      }
    };

    const onPointerOut = (event: PointerEvent) => {
      if (!finePointer) return;
      const from = event.target as Element | null;
      const to = event.relatedTarget as Element | null;
      if (
        from?.closest("a, button, [role='button'], input, select") &&
        !to?.closest?.("a, button, [role='button'], input, select")
      ) {
        body.classList.remove("rf-cursor-engaged");
      }
    };

    const onPointerDown = () => finePointer && body.classList.add("rf-cursor-pressed");
    const onPointerUp = () => body.classList.remove("rf-cursor-pressed");
    const onWindowBlur = () => body.classList.remove("rf-cursor-ready", "rf-cursor-engaged", "rf-cursor-pressed");

    if (finePointer && !reducedMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("pointerover", onPointerOver, { passive: true });
      document.addEventListener("pointerout", onPointerOut, { passive: true });
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      window.addEventListener("pointerup", onPointerUp, { passive: true });
      window.addEventListener("blur", onWindowBlur);
    }

    return () => {
      window.removeEventListener("scroll", requestScrollUpdate);
      window.removeEventListener("resize", requestScrollUpdate);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("blur", onWindowBlur);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      if (cursorFrame) window.cancelAnimationFrame(cursorFrame);
      observer?.disconnect();
      body.classList.remove(
        "rf-landing-active",
        "rf-scrolled",
        "rf-cursor-ready",
        "rf-cursor-engaged",
        "rf-cursor-pressed"
      );
      darkBand?.classList.remove("rf-dark-band");
      revealTargets.forEach((element) => element.classList.remove("rf-reveal-content", "rf-visible"));
      revealItems.forEach((element) => {
        element.classList.remove("rf-reveal-item", "rf-visible");
        element.style.removeProperty("--rf-delay");
      });
    };
  }, [pathname]);

  if (pathname !== "/") return null;

  return (
    <>
      <div ref={progressRef} className="rf-scroll-progress" aria-hidden="true" />
      <div ref={haloRef} className="rf-cursor-halo" aria-hidden="true" />
      <div ref={dotRef} className="rf-cursor-dot" aria-hidden="true" />
    </>
  );
}

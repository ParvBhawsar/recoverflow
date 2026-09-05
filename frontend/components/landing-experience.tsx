"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function LandingExperience() {
  const pathname = usePathname();
  const haloRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname !== "/") return;

    const body = document.body;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine) and (hover: hover)").matches;
    const hero = document.querySelector<HTMLElement>(".hero-glow");
    const preview = hero?.querySelector<HTMLElement>(".animate-float-soft");
    const darkBand = document.querySelector<HTMLElement>("main > section:nth-of-type(2)");
    const cleanupFns: Array<() => void> = [];

    body.classList.add("rf-landing-active");
    darkBand?.classList.add("rf-dark-band");

    if (preview) {
      preview.classList.remove("animate-float-soft");
      preview.classList.add("rf-preview-tilt");
    }

    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>("main > section:not(.hero-glow) > div, main > footer > div")
    );
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>("#platform .group")
    );

    if (reducedMotion) {
      revealTargets.forEach((element) => element.classList.add("rf-visible"));
      revealItems.forEach((element) => element.classList.add("rf-visible"));
    } else {
      revealTargets.forEach((element) => element.classList.add("rf-reveal-content"));
      revealItems.forEach((element, index) => {
        element.classList.add("rf-reveal-item");
        element.style.setProperty("--rf-delay", `${Math.min(index * 70, 280)}ms`);
      });

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).classList.add("rf-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
      );

      revealTargets.forEach((element) => observer.observe(element));
      revealItems.forEach((element) => observer.observe(element));
      cleanupFns.push(() => observer.disconnect());
    }

    const updateScrollState = () => {
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }
      body.classList.toggle("rf-scrolled", window.scrollY > 22);
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState, { passive: true });
    cleanupFns.push(() => window.removeEventListener("scroll", updateScrollState));
    cleanupFns.push(() => window.removeEventListener("resize", updateScrollState));

    if (finePointer && !reducedMotion && haloRef.current && dotRef.current) {
      const halo = haloRef.current;
      const dot = dotRef.current;
      let targetX = window.innerWidth / 2;
      let targetY = window.innerHeight / 2;
      let currentX = targetX;
      let currentY = targetY;
      let frame = 0;

      const animateCursor = () => {
        currentX += (targetX - currentX) * 0.16;
        currentY += (targetY - currentY) * 0.16;
        halo.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
        dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
        frame = window.requestAnimationFrame(animateCursor);
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        targetX = event.clientX;
        targetY = event.clientY;
        body.classList.add("rf-cursor-ready");

        if (hero) {
          const rect = hero.getBoundingClientRect();
          const px = Math.min(Math.max((event.clientX - rect.left) / Math.max(rect.width, 1), 0), 1);
          const py = Math.min(Math.max((event.clientY - rect.top) / Math.max(rect.height, 1), 0), 1);
          hero.style.setProperty("--rf-pointer-x", `${px * 100}%`);
          hero.style.setProperty("--rf-pointer-y", `${py * 100}%`);

          if (preview && event.clientY >= rect.top && event.clientY <= rect.bottom) {
            preview.style.setProperty("--rf-tilt-x", `${(0.5 - py) * 3.2}deg`);
            preview.style.setProperty("--rf-tilt-y", `${(px - 0.5) * 5.4}deg`);
            preview.style.setProperty("--rf-shift-x", `${(px - 0.5) * 7}px`);
            preview.style.setProperty("--rf-shift-y", `${(py - 0.5) * 5}px`);
          }
        }
      };

      const resetPreview = () => {
        preview?.style.setProperty("--rf-tilt-x", "0deg");
        preview?.style.setProperty("--rf-tilt-y", "0deg");
        preview?.style.setProperty("--rf-shift-x", "0px");
        preview?.style.setProperty("--rf-shift-y", "0px");
      };

      const interactiveTargets = Array.from(
        document.querySelectorAll<HTMLElement>("main a, main button, #platform .group")
      );
      const magneticTargets = Array.from(
        document.querySelectorAll<HTMLElement>(".hero-glow a, main > header a")
      );

      interactiveTargets.forEach((element) => {
        const onEnter = () => body.classList.add("rf-cursor-engaged");
        const onLeave = () => body.classList.remove("rf-cursor-engaged");
        element.addEventListener("pointerenter", onEnter);
        element.addEventListener("pointerleave", onLeave);
        cleanupFns.push(() => element.removeEventListener("pointerenter", onEnter));
        cleanupFns.push(() => element.removeEventListener("pointerleave", onLeave));
      });

      magneticTargets.forEach((element) => {
        element.classList.add("rf-magnetic");
        const onMove = (event: PointerEvent) => {
          const rect = element.getBoundingClientRect();
          const dx = event.clientX - (rect.left + rect.width / 2);
          const dy = event.clientY - (rect.top + rect.height / 2);
          element.style.setProperty("--rf-mx", `${dx * 0.1}px`);
          element.style.setProperty("--rf-my", `${dy * 0.12}px`);
        };
        const onLeave = () => {
          element.style.setProperty("--rf-mx", "0px");
          element.style.setProperty("--rf-my", "0px");
        };
        element.addEventListener("pointermove", onMove);
        element.addEventListener("pointerleave", onLeave);
        cleanupFns.push(() => element.removeEventListener("pointermove", onMove));
        cleanupFns.push(() => element.removeEventListener("pointerleave", onLeave));
      });

      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      hero?.addEventListener("pointerleave", resetPreview);
      frame = window.requestAnimationFrame(animateCursor);

      cleanupFns.push(() => window.removeEventListener("pointermove", handlePointerMove));
      cleanupFns.push(() => hero?.removeEventListener("pointerleave", resetPreview));
      cleanupFns.push(() => window.cancelAnimationFrame(frame));
    }

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
      body.classList.remove("rf-landing-active", "rf-scrolled", "rf-cursor-ready", "rf-cursor-engaged");
      darkBand?.classList.remove("rf-dark-band");
      revealTargets.forEach((element) => element.classList.remove("rf-reveal-content", "rf-visible"));
      revealItems.forEach((element) => {
        element.classList.remove("rf-reveal-item", "rf-visible");
        element.style.removeProperty("--rf-delay");
      });
      if (preview) {
        preview.classList.remove("rf-preview-tilt");
        preview.classList.add("animate-float-soft");
        preview.style.removeProperty("--rf-tilt-x");
        preview.style.removeProperty("--rf-tilt-y");
        preview.style.removeProperty("--rf-shift-x");
        preview.style.removeProperty("--rf-shift-y");
      }
      hero?.style.removeProperty("--rf-pointer-x");
      hero?.style.removeProperty("--rf-pointer-y");
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

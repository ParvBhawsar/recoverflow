"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function LandingExperience() {
  const pathname = usePathname();
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname !== "/") return;

    const body = document.body;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const darkBand = document.querySelector<HTMLElement>("main > section:nth-of-type(2)");
    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>("main > section:not(.hero-glow) > div, main > footer > div")
    );
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>("#platform .group")
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
        element.style.setProperty("--rf-delay", `${Math.min(index * 45, 180)}ms`);
      });

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).classList.add("rf-visible");
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -3% 0px" }
      );

      revealTargets.forEach((element) => observer?.observe(element));
      revealItems.forEach((element) => observer?.observe(element));
    }

    let frame = 0;
    let ticking = false;

    const updateScrollState = () => {
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
      body.classList.toggle("rf-scrolled", window.scrollY > 22);
      ticking = false;
    };

    const requestScrollUpdate = () => {
      if (ticking) return;
      ticking = true;
      frame = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    window.addEventListener("resize", requestScrollUpdate, { passive: true });

    return () => {
      window.removeEventListener("scroll", requestScrollUpdate);
      window.removeEventListener("resize", requestScrollUpdate);
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      body.classList.remove("rf-landing-active", "rf-scrolled");
      darkBand?.classList.remove("rf-dark-band");
      revealTargets.forEach((element) => element.classList.remove("rf-reveal-content", "rf-visible"));
      revealItems.forEach((element) => {
        element.classList.remove("rf-reveal-item", "rf-visible");
        element.style.removeProperty("--rf-delay");
      });
    };
  }, [pathname]);

  if (pathname !== "/") return null;
  return <div ref={progressRef} className="rf-scroll-progress" aria-hidden="true" />;
}

"use client";

// ==============================================================================
// RELAY CRM — GOOGLE ANTIGRAVITY ORBITAL PARTICLE VORTEX
// Recreated from https://antigravity.google/
// Concentric orbital rings of oriented particle dashes, Keplerian differential
// rotation, gravitational lens cursor warping, and chromatic emerald spectrum.
// ==============================================================================

import * as React from "react";
import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleFieldProps {
  pointerPos: React.MutableRefObject<{
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    active: boolean;
  }>;
  prefersReducedMotion: boolean;
}

// Generate an anti-aliased capsule/dash texture (recreating Antigravity dashes)
function createDashTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 24;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 64, 24);
  const r = 10;
  const w = 64;
  const h = 24;

  // Draw rounded pill with subtle gradient feathering
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();

  const gradient = ctx.createRadialGradient(32, 12, 4, 32, 12, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.95)");
  gradient.addColorStop(0.95, "rgba(255, 255, 255, 0.3)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function AntigravityOrbitalField({
  pointerPos,
  prefersReducedMotion,
}: ParticleFieldProps) {
  const { viewport } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Responsive instance count: 720 on desktop, 320 on mobile
  const count = useMemo(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return 320;
    }
    return 720;
  }, []);

  // Chromatic Palette inspired by Antigravity & Relay CRM luxury theme:
  // Deep Pine -> Rich Forest -> Vibrant Emerald -> Luminous Mint -> Jade Cyan -> Amber Spark
  const palette = useMemo(() => [
    new THREE.Color("#1E3A2F"), // Primary Forest Green
    new THREE.Color("#14532D"), // Deep Pine
    new THREE.Color("#059669"), // Rich Jade
    new THREE.Color("#10B981"), // Vibrant Emerald
    new THREE.Color("#34D399"), // Luminous Mint
    new THREE.Color("#06B6D4"), // Electric Cyan-Jade
    new THREE.Color("#F59E0B"), // Champagne Gold Accent
  ], []);

  // Precompute orbital rings and initial polar coordinates
  const particles = useMemo(() => {
    const list = [];
    const numRings = typeof window !== "undefined" && window.innerWidth < 768 ? 14 : 22;
    const minRadius = 1.35; // Clears the central headline area
    const maxRadius = Math.max(viewport.width * 0.72, 5.8);
    const radiusStep = (maxRadius - minRadius) / numRings;

    let particleIdx = 0;
    for (let ring = 0; ring < numRings; ring++) {
      const ringRadius = minRadius + ring * radiusStep;
      // Particles per ring scales proportionally with circumference
      const countInRing = Math.max(14, Math.floor((ringRadius / maxRadius) * (count / (numRings * 0.55))));
      const ringSpeed = (0.035 / Math.sqrt(ringRadius + 0.5)) * (ring % 2 === 0 ? 1 : -0.75);

      for (let j = 0; j < countInRing; j++) {
        if (particleIdx >= count) break;
        const angleOffset = (j / countInRing) * Math.PI * 2 + (ring * 0.42);
        const radialJitter = (Math.random() - 0.5) * radiusStep * 0.65;
        const baseRadius = ringRadius + radialJitter;

        // Choose color based on ring position with subtle variation
        const colorProgression = ring / numRings;
        let colorIdx = Math.floor(colorProgression * (palette.length - 1));
        // Random golden or emerald highlights on outer/inner filaments
        if (Math.random() < 0.08) {
          colorIdx = palette.length - 1; // Gold accent
        } else if (Math.random() < 0.15) {
          colorIdx = 3; // Emerald highlight
        }
        const baseColor = palette[Math.min(colorIdx, palette.length - 1)].clone();

        list.push({
          ring,
          baseRadius,
          baseAngle: angleOffset,
          currentAngle: angleOffset,
          orbitalSpeed: ringSpeed * (0.85 + Math.random() * 0.3),
          phase: Math.random() * Math.PI * 2,
          radialFreq: 0.4 + Math.random() * 0.6,
          baseScaleX: 0.048 + (ring / numRings) * 0.025, // Outer dashes are slightly longer
          baseScaleY: 0.016,
          baseColor,
          currentColor: baseColor.clone(),
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
        });

        particleIdx++;
      }
    }

    // Fill remaining particles if any
    while (list.length < count) {
      const r = minRadius + Math.random() * (maxRadius - minRadius);
      const a = Math.random() * Math.PI * 2;
      list.push({
        ring: 0,
        baseRadius: r,
        baseAngle: a,
        currentAngle: a,
        orbitalSpeed: 0.02,
        phase: Math.random() * Math.PI * 2,
        radialFreq: 0.5,
        baseScaleX: 0.05,
        baseScaleY: 0.016,
        baseColor: palette[0].clone(),
        currentColor: palette[0].clone(),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      });
    }

    return list;
  }, [count, viewport.width, palette]);

  const texture = useMemo(() => createDashTexture(), []);

  useEffect(() => {
    return () => {
      if (texture) texture.dispose();
    };
  }, [texture]);

  // Smooth inertial center following cursor
  const vortexCenter = useRef(new THREE.Vector2(0, 0));

  // Antigravity Simulation Loop
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.04);

    // Smooth inertia for vortex focal center
    const targetCenterX = (pointerPos.current.x * viewport.width) * 0.22;
    const targetCenterY = (pointerPos.current.y * viewport.height) * 0.22;
    const active = pointerPos.current.active;

    if (active) {
      vortexCenter.current.x += (targetCenterX - vortexCenter.current.x) * 0.045;
      vortexCenter.current.y += (targetCenterY - vortexCenter.current.y) * 0.045;
    } else {
      vortexCenter.current.x += (0 - vortexCenter.current.x) * 0.02;
      vortexCenter.current.y += (0 - vortexCenter.current.y) * 0.02;
    }

    const mouseWorldX = (pointerPos.current.x * viewport.width) / 2;
    const mouseWorldY = (pointerPos.current.y * viewport.height) / 2;
    const warpRadius = 2.4;

    for (let i = 0; i < count; i++) {
      const p = particles[i];

      if (!prefersReducedMotion) {
        // Keplerian orbital progression: slow, premium, celestial rotation
        p.currentAngle += p.orbitalSpeed * dt * 0.65;
      }

      // Harmonic radial breathing waves (Google Antigravity sine displacement)
      const breathing = Math.sin(time * p.radialFreq + p.phase) * 0.08
        + Math.cos(time * 0.5 + p.baseRadius * 1.5) * 0.05;
      const currentRadius = p.baseRadius + (prefersReducedMotion ? 0 : breathing);

      // Base orbital position relative to the floating vortex center
      let px = vortexCenter.current.x + Math.cos(p.currentAngle) * currentRadius;
      let py = vortexCenter.current.y + Math.sin(p.currentAngle) * currentRadius * 0.88; // Subtle isometric aspect

      // Tangent angle for dash orientation (streaming along orbital trajectory)
      let tangentAngle = p.currentAngle + Math.PI / 2;

      let highlightFactor = 0;

      // Gravitational lens deflection when cursor is active
      if (active) {
        const dx = mouseWorldX - px;
        const dy = mouseWorldY - py;
        const distSq = dx * dx + dy * dy;

        if (distSq < warpRadius * warpRadius && distSq > 0.001) {
          const dist = Math.sqrt(distSq);
          highlightFactor = Math.pow(1 - dist / warpRadius, 2.0);

          // Gravitational lensing displacement away from cursor
          const warpForce = highlightFactor * 0.42;
          px -= (dx / dist) * warpForce;
          py -= (dy / dist) * warpForce;

          // Flow perturbation: dashes tilt towards the interactive force vector
          const cursorAngle = Math.atan2(dy, dx);
          tangentAngle = THREE.MathUtils.lerp(tangentAngle, cursorAngle + Math.PI / 2, highlightFactor * 0.6);
        }
      }

      p.x = px;
      p.y = py;

      // Update transform matrix for dash instance
      dummy.position.set(px, py, 0);
      dummy.rotation.z = tangentAngle;

      // Scale pulse on proximity
      const scaleMult = 1 + highlightFactor * 0.45;
      dummy.scale.set(p.baseScaleX * scaleMult, p.baseScaleY * scaleMult, 1);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Flashy color transition: illuminate to glowing emerald/mint on proximity
      const baseCol = p.baseColor;
      const r = THREE.MathUtils.lerp(baseCol.r, 0.06, highlightFactor);
      const g = THREE.MathUtils.lerp(baseCol.g, 0.85, highlightFactor);
      const b = THREE.MathUtils.lerp(baseCol.b, 0.55, highlightFactor);
      p.currentColor.setRGB(r, g, b);

      meshRef.current.setColorAt(i, p.currentColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture || undefined}
        transparent
        opacity={0.82}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </instancedMesh>
  );
}

// ==============================================================================
// PUBLIC EXPORT: InteractiveParticleField
// ==============================================================================

export function InteractiveParticleField({
  containerRef,
}: {
  containerRef?: React.RefObject<HTMLElement | null>;
}) {
  const [mounted, setMounted] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const pointerPos = useRef({
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    active: false,
  });

  useEffect(() => {
    setMounted(true);

    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setHasWebGL(Boolean(gl));
    } catch {
      setHasWebGL(false);
    }

    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  // Passive pointer tracking relative to the hero section container
  useEffect(() => {
    const targetElement =
      containerRef?.current || (typeof window !== "undefined" ? document.body : null);
    if (!targetElement) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = targetElement.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

      if (rect.width > 0 && rect.height > 0) {
        const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);

        pointerPos.current.x = Math.max(-1.15, Math.min(1.15, nx));
        pointerPos.current.y = Math.max(-1.15, Math.min(1.15, ny));
        pointerPos.current.active = true;
      }
    };

    const handlePointerLeave = () => {
      pointerPos.current.active = false;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("mouseleave", handlePointerLeave, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("touchend", handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseleave", handlePointerLeave);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerLeave);
    };
  }, [containerRef]);

  // SSR or WebGL disabled fallback
  if (!mounted || !hasWebGL) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ pointerEvents: "none", width: "100%", height: "100%" }}
      >
        <AntigravityOrbitalField
          pointerPos={pointerPos}
          prefersReducedMotion={prefersReducedMotion}
        />
      </Canvas>
    </div>
  );
}

export default InteractiveParticleField;

"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
};

function IconWrapper({
  children,
  className = "h-5 w-5",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </IconWrapper>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </IconWrapper>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </IconWrapper>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M3 3 21 21" />
      <path d="M10.6 10.7A3 3 0 0 0 13.3 13.4" />
      <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6 0 9.5 7 9.5 7a18.2 18.2 0 0 1-4 4.8" />
      <path d="M6.3 6.3A18.3 18.3 0 0 0 2.5 12S6 19 12 19a10.8 10.8 0 0 0 2.1-.2" />
    </IconWrapper>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <IconWrapper className={className}>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </IconWrapper>
  );
}

function useResolvedTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const updateTheme = () => {
      if (typeof document === "undefined") return;
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

function ParticleField({ theme }: { theme: "light" | "dark" }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let particles: Particle[] = [];

    const palette =
      theme === "dark"
        ? {
            red: "rgba(248, 113, 113, 0.95)",
            blue: "rgba(96, 165, 250, 0.95)",
            redLine: "rgba(248, 113, 113, 0.18)",
            blueLine: "rgba(96, 165, 250, 0.18)",
          }
        : {
            red: "rgba(220, 38, 38, 0.9)",
            blue: "rgba(37, 99, 235, 0.9)",
            redLine: "rgba(220, 38, 38, 0.12)",
            blueLine: "rgba(37, 99, 235, 0.12)",
          };

    const resize = () => {
      const { innerWidth, innerHeight, devicePixelRatio } = window;
      const ratio = devicePixelRatio || 1;

      canvas.width = innerWidth * ratio;
      canvas.height = innerHeight * ratio;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = Math.max(26, Math.min(72, Math.floor(innerWidth / 22)));
      particles = Array.from({ length: count }, (_, index) => {
        const isRed = index % 2 === 0;
        return {
          x: Math.random() * innerWidth,
          y: Math.random() * innerHeight,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: 1.2 + Math.random() * 2.2,
          color: isRed ? palette.red : palette.blue,
        };
      });
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x <= 0 || particle.x >= width) particle.vx *= -1;
        if (particle.y <= 0 || particle.y >= height) particle.vy *= -1;
      }

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 150) continue;

          const opacity = 1 - distance / 150;
          const stroke =
            i % 2 === 0
              ? palette.redLine.replace(/[\d.]+\)$/u, `${opacity * 0.9})`)
              : palette.blueLine.replace(/[\d.]+\)$/u, `${opacity * 0.9})`);

          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.strokeStyle = stroke;
          context.lineWidth = 1;
          context.stroke();
        }
      }

      for (const particle of particles) {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = particle.color;
        context.shadowBlur = 14;
        context.shadowColor = particle.color;
        context.fill();
      }

      context.shadowBlur = 0;
      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full opacity-90"
    />
  );
}

function LoginShell({
  children,
  embedded,
}: {
  children: React.ReactNode;
  embedded: boolean;
}) {
  const theme = useResolvedTheme();

  if (embedded) {
    return <div className="w-full">{children}</div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-50">
      <ParticleField theme={theme} />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.2),_transparent_26%),linear-gradient(135deg,_rgba(255,255,255,0.84),_rgba(241,245,249,0.68))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.28),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.24),_transparent_26%),linear-gradient(135deg,_rgba(2,6,23,0.88),_rgba(15,23,42,0.74))]" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex items-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex items-center gap-4 rounded-full border border-white/50 bg-white/55 px-4 py-3 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
              <div className="relative h-11 w-11 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                <Image src="/logo.png" alt="ClearValue logo" fill className="object-contain p-2" priority />
              </div>
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.38em] text-slate-500 dark:text-slate-400">
                  ClearValue
                </p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Secure admin access
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <p className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">
                Nanotech login surface
              </p>
              <h1 className="max-w-lg font-sans text-5xl font-semibold leading-none tracking-[-0.05em] text-balance sm:text-6xl">
                A sharper login page for the control layer.
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                Live particle links, polished motion, and a focused sign-in flow built for both light and dark theme without the old boxed card feel.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center px-6 pb-12 sm:px-10 lg:px-12 lg:py-12 xl:px-16">
          <div className="w-full">{children}</div>
        </section>
      </div>
    </div>
  );
}

export default function LoginFormV2({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/reports";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Login failed");
      }
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell embedded={embedded}>
      <form
        onSubmit={onSubmit}
        className="ml-auto w-full max-w-xl rounded-[2rem] border border-white/50 bg-white/72 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition-colors dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_30px_120px_rgba(2,6,23,0.55)] sm:p-8"
      >
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Admin portal
          </p>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">
              Sign in to manage reports, approvals, and operations.
            </h2>
            <p className="max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Built for speed and clarity, with a cleaner visual hierarchy and motion-led background that still keeps the login action front and center.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email address</span>
            <span className="relative block">
              <MailIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                placeholder="admin@clearvalue.com"
                className="h-14 w-full rounded-2xl border border-slate-200/80 bg-white/90 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-400/10"
              />
            </span>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
            <span className="relative block">
              <LockIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                placeholder="Enter your password"
                className="h-14 w-full rounded-2xl border border-slate-200/80 bg-white/90 pl-12 pr-14 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-700 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </span>
          </label>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Protected access only for verified internal administrators.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:scale-[1.01] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <span>{loading ? "Signing in..." : "Enter dashboard"}</span>
            <ArrowRightIcon className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
          </button>
        </div>
      </form>
    </LoginShell>
  );
}

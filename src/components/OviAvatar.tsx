import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import oviImage from "@/assets/ovi-mascot.png";

export type OviMood = "idle" | "greeting" | "thinking" | "celebrating" | "encouraging" | "explaining";

interface OviAvatarProps {
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  animate?: boolean;
  mood?: OviMood;
  message?: string;
  className?: string;
  showGlow?: boolean;
}

const sizeMap = { sm: 40, md: 64, lg: 96, xl: 140, hero: 200 };

const moodAnimations: Record<OviMood, any> = {
  idle: { animate: { y: [0, -6, 0] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  greeting: { animate: { y: [0, -12, 0], rotate: [0, -5, 5, -3, 0], scale: [1, 1.08, 1] }, transition: { duration: 1.2, repeat: 0, ease: "easeOut" } },
  thinking: { animate: { y: [0, -3, 0], rotate: [0, 2, -2, 0] }, transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } },
  celebrating: { animate: { y: [0, -20, 0, -10, 0], scale: [1, 1.15, 1, 1.08, 1], rotate: [0, -8, 8, -4, 0] }, transition: { duration: 1.5, repeat: 0, ease: "easeOut" } },
  encouraging: { animate: { y: [0, -8, 0], scale: [1, 1.05, 1] }, transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
  explaining: { animate: { y: [0, -4, 0], rotate: [0, 1, -1, 0] }, transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } },
};

const glowColors: Record<OviMood, string> = {
  idle: "hsl(var(--primary) / 0.15)",
  greeting: "hsl(var(--primary) / 0.30)",
  thinking: "hsl(var(--warning) / 0.20)",
  celebrating: "hsl(var(--success) / 0.30)",
  encouraging: "hsl(var(--accent) / 0.25)",
  explaining: "hsl(var(--info) / 0.20)",
};

const OviAvatar = ({
  size = "md",
  animate = true,
  mood = "idle",
  message,
  className = "",
  showGlow = false,
}: OviAvatarProps) => {
  const px = sizeMap[size];
  const moodAnim = moodAnimations[mood];
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (message) {
      setShowMessage(true);
      const timer = setTimeout(() => setShowMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const isLarge = size === "lg" || size === "xl" || size === "hero";

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <AnimatePresence>
        {message && showMessage && isLarge && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -5, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute top-0 left-full ml-3 z-10 w-max max-w-[220px]"
          >
            <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs text-foreground relative">
              {message}
              <div className="absolute top-3 -left-1.5">
                <div className="w-3 h-3 bg-card border-l border-b border-border rotate-45" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="relative inline-flex items-center justify-center"
        style={{ width: px, height: px }}
        animate={animate ? moodAnim.animate : undefined}
        transition={animate ? moodAnim.transition : undefined}
      >
        {(showGlow || isLarge) && (
          <motion.div
            className="absolute -inset-2 rounded-full"
            style={{ background: `radial-gradient(circle, ${glowColors[mood]}, transparent 70%)` }}
            animate={animate ? { scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] } : undefined}
            transition={animate ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : undefined}
          />
        )}

        {mood === "thinking" && (
          <motion.div
            className="absolute -inset-1 rounded-full border-2 border-warning/40"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Mascot — transparent PNG, no clip mask so the silhouette is preserved */}
        <img
          src={oviImage}
          alt="OVI — your study companion"
          className="relative z-10 w-full h-full object-contain"
          draggable={false}
        />
      </motion.div>
    </div>
  );
};

export default OviAvatar;

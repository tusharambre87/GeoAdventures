import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanner } from "@/lib/plannerContext";
import { getCityImage } from "@/lib/cityImages";
import { toast } from "sonner";

const STEPS = [
  { text: "Finding family-friendly stops...", icon: "📍" },
  { text: "Balancing energy levels...", icon: "⚖️" },
  { text: "Adding food breaks...", icon: "🍽️" },
  { text: "Optimising your route...", icon: "🗺️" },
  { text: "Adding the finishing touches...", icon: "✨" },
];

const STOP_DOTS = [
  { x: "18%", y: "68%" },
  { x: "42%", y: "32%" },
  { x: "65%", y: "54%" },
  { x: "82%", y: "22%" },
];

export default function GenerationScreen() {
  const [, navigate] = useLocation();
  const { plannerInput, generatePlan } = usePlanner();
  const [currentStep, setCurrentStep] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % STEPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!plannerInput.destination) {
      navigate("/");
      return;
    }

    generatePlan(plannerInput)
      .then(() => {
        navigate("/plan");
      })
      .catch((err: any) => {
        const msg = err?.message || "";
        if (msg.toLowerCase().includes("unauthorized")) {
          toast.error("Session expired — please sign in again");
          navigate("~/?login=true");
        } else {
          toast.error("Couldn't build your plan. Please try again.");
          navigate("/");
        }
      });
  }, []);

  const destination = (plannerInput.destination || "your destination").split(",")[0];
  const cityImg = getCityImage(destination, "");

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 flex flex-col px-4">
      <div className="h-[26vh] shrink-0" />

      {/* City image with route dots */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-lg shrink-0" style={{ height: "220px" }}>
        <img src={cityImg} alt={destination} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/25 rounded-2xl" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: "visible" }}>
          {STOP_DOTS.slice(0, -1).map((dot, i) => {
            const x1 = parseFloat(dot.x);
            const y1 = parseFloat(dot.y);
            const x2 = parseFloat(STOP_DOTS[i + 1].x);
            const y2 = parseFloat(STOP_DOTS[i + 1].y);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="white" strokeWidth="1.2" strokeDasharray="3 2"
                strokeLinecap="round" opacity="0.9" />
            );
          })}
        </svg>
        {STOP_DOTS.map((dot, i) => (
          <div key={i} className="absolute flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold shadow-lg border-2 border-white"
            style={{ left: dot.x, top: dot.y, transform: "translate(-50%, -50%)", width: "24px", height: "24px" }}>
            {i + 1}
          </div>
        ))}
        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1">
          <p className="text-white text-xs font-semibold">{destination}</p>
        </div>
      </div>

      <div className="h-[6vh] shrink-0" />

      {/* Building text */}
      <div className="flex flex-col items-center px-2">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Building your plan</h2>
        <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
          AI is crafting a personalised itinerary for{" "}
          <span className="font-semibold text-orange-600">{destination}</span>
        </p>

        <div className="w-full max-w-xs">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex items-center gap-3"
            >
              <span className="text-xl shrink-0">{STEPS[currentStep].icon}</span>
              <span className="flex-1 text-sm font-medium text-slate-700">{STEPS[currentStep].text}</span>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full bg-orange-400 flex-shrink-0"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          Building your plan… almost there
        </p>
      </div>
    </div>
  );
}

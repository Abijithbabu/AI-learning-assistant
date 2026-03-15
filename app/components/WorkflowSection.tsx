"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { useRef } from "react";
import { FileUp, Brain, ListTree, Sparkles } from "lucide-react";

const steps = [
  {
    title: "Upload Materials",
    description:
      "Upload your PDFs, documents, or raw notes. Our system supports various formats to get you started.",
    icon: FileUp,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "AI Analysis",
    description:
      "Our advanced AI models analyze your content, extracting key concepts and identifying logical structures.",
    icon: Brain,
    color: "from-purple-500 to-blue-500",
  },
  {
    title: "Course Generation",
    description:
      "The AI organizes your materials into a structured course with modules, lessons, and clear summaries.",
    icon: ListTree,
    color: "from-indigo-500 to-purple-500",
  },
  {
    title: "Interactive Mastery",
    description:
      "Learn through interactive chat with your AI tutor and validate knowledge with generated mock tests.",
    icon: Sparkles,
    color: "from-pink-500 to-rose-500",
  },
];

export default function WorkflowSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <section
      ref={containerRef}
      className="py-16 md:py-24 relative overflow-hidden"
    >
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16 md:mb-20 space-y-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-bold"
          >
            How it{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-500">
              Works
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-gray-400 text-base md:text-lg"
          >
            Step-by-step process of turning your resources into mastery.
          </motion.p>
        </div>

        <div className="relative">
          {/* Central Line - Slightly visible on mobile too */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-gray-800 md:-translate-x-1/2" />
          <motion.div
            className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-linear-to-b from-purple-500 via-blue-500 to-pink-500 md:-translate-x-1/2 origin-top"
            style={{ scaleY }}
          />

          <div className="space-y-16 md:space-y-24">
            {steps.map((step, index) => (
              <WorkflowStep key={index} step={step} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowStep({ step, index }: { step: any; index: number }) {
  const isEven = index % 2 === 0;

  return (
    <div
      className={`relative flex items-center justify-between md:flex-row ${isEven ? "md:flex-row-reverse" : ""} flex-col gap-6 md:gap-8`}
    >
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? 20 : -20, y: 20 }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="flex-1 w-full md:w-1/2 pl-12 md:pl-0"
      >
        <div
          className={`p-6 md:p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-white/20 transition-colors group relative`}
        >
          <div
            className={`absolute -inset-0.5 bg-linear-to-r ${step.color} rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500`}
          />
          <div className="relative">
            <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">
              {step.title}
            </h3>
            <p className="text-gray-400 leading-relaxed text-sm md:text-lg">
              {step.description}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Node Icon */}
      <div className="absolute left-6 md:relative md:left-0 md:z-10 flex items-center justify-center -translate-x-1/2 md:translate-x-0">
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={`w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-linear-to-br ${step.color} flex items-center justify-center shadow-lg shadow-white/5 z-20`}
        >
          <step.icon className="w-5 h-5 md:w-7 md:h-7 text-white" />
        </motion.div>

        {/* Glow behind icon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-20 md:h-20 bg-white/5 rounded-full blur-xl md:blur-2xl -z-10" />
      </div>

      {/* Spacer for MD screens */}
      <div className="flex-1 md:w-1/2 hidden md:block" />
    </div>
  );
}

"use client";

import React from "react";

interface ScrollToButtonProps {
  targetId: string;
  children: React.ReactNode;
  className?: string;
}

export default function ScrollToButton({
  targetId,
  children,
  className,
}: ScrollToButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
}

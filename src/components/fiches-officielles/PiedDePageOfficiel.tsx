"use client";

import React from "react";

interface Props {
  className?: string;
  email?: string;
}

export default function PiedDePageOfficiel({
  className = "",
  email = "ascqbenin@gmail.com",
}: Props) {
  return (
    <footer className={`w-full text-center pt-3 pb-1 mt-auto border-t border-slate-200 print:border-slate-300 ${className}`}>
      <span className="text-[10px] sm:text-[11px] text-slate-700 font-semibold tracking-wide lowercase">
        {email}
      </span>
    </footer>
  );
}

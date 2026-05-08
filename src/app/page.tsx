"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase"; 

export default function HomePage() {
  const router = useRouter();
  const [weddingDate, setWeddingDate] = useState("2026-06-20T00:00:00");
  const [isMounted, setIsMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    setIsMounted(true);
    async function fetchSettings() {
      const { data } = await supabase.from("Settings").select("wedding_date").maybeSingle();
      if (data?.wedding_date) {
        setWeddingDate(data.wedding_date);
      }
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const interval = setInterval(() => {
      const target = new Date(weddingDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [weddingDate, isMounted]);

  return (
    /* RIPRISTINATO IL GRADIENTE ORIGINALE VIOLA/ROSA */
    <main className="min-h-screen bg-gradient-to-br from-[#8000ff] via-[#b300ff] to-[#ff0080] flex flex-col items-center justify-center p-6 text-white text-center">
      <h1 className="text-5xl md:text-7xl font-black uppercase italic mb-2 tracking-tighter drop-shadow-lg">ADDIO AL CELIBATO</h1>
      <h2 className="text-3xl md:text-5xl font-black text-yellow-400 mb-12 italic uppercase drop-shadow-md">SIMONE</h2>

      {/* BOX COUNTDOWN - STILE SEMITRASPARENTE PER GRADIENTE */}
      <div className="grid grid-cols-4 gap-3 mb-12 max-w-sm w-full min-h-[80px]">
        {isMounted ? (
          <>
            {[
              { label: "Giorni", val: timeLeft.days },
              { label: "Ore", val: timeLeft.hours },
              { label: "Min", val: timeLeft.minutes },
              { label: "Sec", val: timeLeft.seconds }
            ].map(item => (
              <div key={item.label} className="bg-black/20 border border-white/20 p-3 rounded-2xl backdrop-blur-md shadow-xl">
                <p className="text-2xl md:text-3xl font-black text-white">{item.val}</p>
                <p className="text-[8px] font-bold uppercase text-yellow-300 tracking-widest">{item.label}</p>
              </div>
            ))}
          </>
        ) : (
          <div className="col-span-4 text-xs font-bold uppercase opacity-40 animate-pulse text-center">Inizializzazione...</div>
        )}
      </div>

      <p className="text-white/90 uppercase text-[10px] font-bold tracking-[0.3em] mb-6 drop-shadow-sm">Benvenuti nella Centrale Operativa delle Sfide</p>

      <button 
        onClick={() => router.push("/challenges")}
        className="px-12 py-6 bg-white text-[#8000ff] rounded-full font-black text-xl uppercase hover:scale-105 transition-all shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
      >
        ENTRA NELLE SFIDE 🚀
      </button>

      <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 bg-black/20 border border-white/10 rounded-full backdrop-blur-sm">
         <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
         <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Database Connesso</span>
      </div>
    </main>
  );
}

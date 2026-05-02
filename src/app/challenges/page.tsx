"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; 
import Link from 'next/link';

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [targetPoints, setTargetPoints] = useState(1000); 
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [isBonusSelected, setIsBonusSelected] = useState(false);
  const [filter, setFilter] = useState("all"); 
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showHeroModal, setShowHeroModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: challengesData } = await supabase.from("Challenges").select("*").order('id', { ascending: true });
    const { data: settingsData } = await supabase.from("Settings").select("*").maybeSingle();

    if (challengesData) setChallenges(challengesData);
    if (settingsData) {
      setTargetPoints(settingsData.target_points);
      setSettingsId(settingsData.id);
    }
    setLoading(false);
  }

  async function updateTargetPoints(newVal: number) {
    setTargetPoints(newVal);
    if (settingsId) {
      await supabase.from("Settings").update({ target_points: newVal }).eq('id', settingsId);
    }
  }

  const currentPoints = challenges
    .filter(c => c.is_completed)
    .reduce((sum, c) => {
        const base = c.points || 0;
        const extra = (c.bonus_achieved && c.bonus_points) ? c.bonus_points : 0;
        return sum + base + extra;
    }, 0);

  const realPercentage = targetPoints > 0 ? (currentPoints / targetPoints) * 100 : 0;
  const barWidth = Math.min(realPercentage, 100);
  
  useEffect(() => {
    if (loading || challenges.length === 0) return;
    const allDone = challenges.every(c => c.is_completed);
    if (allDone) {
      setShowHeroModal(true);
      setShowTargetModal(false);
    } else if (realPercentage >= 100) {
      setShowTargetModal(true);
    }
  }, [currentPoints, challenges, realPercentage, loading]);

  async function handleUpload(e: any, challengeId: number) {
    const file = e.target.files[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${challengeId}-${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('media').upload(fileName, file);
    if (uploadError) return;
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

    await supabase.from("Challenges").update({ 
        media_url: publicUrl, is_completed: true, caption: caption, bonus_achieved: isBonusSelected 
    }).eq('id', challengeId);

    setCaption(""); setIsBonusSelected(false); setSelectedChallenge(null); fetchData();
  }

  async function handleDelete(challengeId: number, mediaUrl: string) {
    if (!confirm("Vuoi eliminare questa prova?")) return;
    const fileName = mediaUrl.split('/').pop();
    if (fileName) await supabase.storage.from('media').remove([fileName]);
    await supabase.from("Challenges").update({ 
        media_url: null, is_completed: false, caption: null, bonus_achieved: false 
    }).eq('id', challengeId);
    setSelectedChallenge(null); fetchData();
  }

  const filteredChallenges = challenges.filter(c => {
    if (filter === "pending") return !c.is_completed;
    if (filter === "completed") return c.is_completed;
    return true;
  });

  if (loading) return <div className="min-h-screen bg-[#0f0214] flex items-center justify-center text-white font-black uppercase tracking-widest italic animate-pulse">Sync in corso...</div>;

  return (
    <main className="min-h-screen bg-[#0f0214] text-white p-4 md:p-8 pb-20 relative">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER & PROGRESS */}
        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/20 mb-8 sticky top-4 z-30 backdrop-blur-3xl shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-fuchsia-400 mb-1">Punteggio Simone</p>
              <div className="flex items-baseline gap-2">
                <p className="text-6xl font-black text-yellow-400 italic leading-none">{currentPoints}</p>
                <p className="text-xl font-bold text-white/30">/ {targetPoints}</p>
              </div>
            </div>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="bg-white/10 p-3 rounded-2xl border border-white/10 text-xl">⚙️</button>
          </div>

          {isSettingsOpen && (
            <div className="mb-6 p-6 bg-black/90 rounded-[1.5rem] border border-fuchsia-500/50 animate-in slide-in-from-top-4">
                <p className="text-[10px] font-black uppercase text-fuchsia-400 mb-4 tracking-widest text-center">Modifica Traguardo (Max 1500)</p>
                <div className="flex items-center gap-4">
                    <input type="range" min="100" max="1500" step="50" value={targetPoints} onChange={(e) => updateTargetPoints(parseInt(e.target.value))} className="flex-1 accent-fuchsia-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                    <span className="text-2xl font-black text-white w-16 text-right">{targetPoints}</span>
                </div>
            </div>
          )}
          
          <div className="w-full bg-black/50 h-6 rounded-full overflow-hidden p-1 border border-white/10">
            <div className={`h-full rounded-full transition-all duration-1000 ${realPercentage >= 100 ? 'bg-gradient-to-r from-yellow-400 via-green-400 to-yellow-400' : 'bg-gradient-to-r from-fuchsia-600 via-purple-500 to-yellow-400'}`} style={{ width: `${barWidth}%` }}></div>
          </div>
          <div className="flex justify-between items-center mt-4">
             <p className={`text-[12px] font-black uppercase tracking-[0.2em] ${realPercentage >= 100 ? 'text-green-400' : 'text-fuchsia-400'}`}>
                {realPercentage >= 100 ? "👑 LIVELLO SPOSO" : "🔥 ROAD TO WEDDING"}
             </p>
             <p className="text-2xl font-black text-white italic">{Math.round(realPercentage)}%</p>
          </div>
        </div>

        {/* FILTRI */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2 no-scrollbar">
          {['all', 'pending', 'completed'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
              {f === 'all' ? 'Tutte' : f === 'pending' ? 'Da fare' : 'Fatte'}
            </button>
          ))}
        </div>

        {/* GRID SFIDE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filteredChallenges.map((challenge) => (
            <div key={challenge.id} onClick={() => { setSelectedChallenge(challenge); setIsBonusSelected(challenge.bonus_achieved); }} className={`p-8 rounded-[2.5rem] border-2 transition-all hover:scale-[1.02] cursor-pointer ${challenge.is_completed ? 'bg-green-500/5 border-green-500/30 opacity-60' : 'bg-white/5 border-white/10'}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="text-yellow-400 text-xl font-black italic">+{challenge.points} PT</div>
                {challenge.is_completed && <div className="text-green-400 text-[10px] font-black uppercase border border-green-400/30 px-3 py-1 rounded-full">OK</div>}
              </div>
              <h3 className="text-2xl font-bold uppercase leading-tight text-white mb-2">{challenge.title}</h3>
            </div>
          ))}
        </div>

        {/* MODALE DETTAGLIO */}
        {selectedChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedChallenge(null)}></div>
            <div className="bg-[#1a0521] border border-white/20 w-full max-w-lg rounded-[3.5rem] p-8 relative z-10 shadow-2xl animate-in zoom-in duration-200">
              <button onClick={() => setSelectedChallenge(null)} className="absolute top-8 right-10 text-white/30 text-3xl">✕</button>
              <h2 className="text-4xl font-black uppercase italic leading-none mb-4 text-yellow-400">{selectedChallenge.title}</h2>
              <p className="text-xl text-white/80 mb-8">{selectedChallenge.descriptions}</p>

              {selectedChallenge.bonus_description && (
                <div className={`p-6 rounded-[2rem] border-2 mb-8 transition-all ${isBonusSelected ? 'bg-fuchsia-600/30 border-fuchsia-400 shadow-[0_0_20px_rgba(192,38,211,0.2)]' : 'bg-black/40 border-white/10'}`}>
                   <div className="flex items-start gap-4">
                      <input type="checkbox" id="bonus" checked={isBonusSelected} onChange={(e) => setIsBonusSelected(e.target.checked)} className="w-8 h-8 rounded-xl mt-1 accent-fuchsia-500 cursor-pointer" disabled={selectedChallenge.is_completed} />
                      <label htmlFor="bonus" className="cursor-pointer">
                        <p className="text-[11px] font-black uppercase text-fuchsia-300 mb-1 tracking-widest italic">🎯 Extra (+{selectedChallenge.bonus_points} PT)</p>
                        <p className="text-md font-bold text-white leading-tight">{selectedChallenge.bonus_description}</p>
                      </label>
                   </div>
                </div>
              )}

              {selectedChallenge.is_completed ? (
                <div className="space-y-6">
                  <div className="rounded-[2.5rem] overflow-hidden border border-white/10"><img src={selectedChallenge.media_url} className="w-full aspect-video object-cover" /></div>
                  <div className="flex gap-4">
                    <button onClick={() => handleDelete(selectedChallenge.id, selectedChallenge.media_url)} className="flex-1 bg-red-600/10 text-red-500 py-4 rounded-[1.5rem] font-black uppercase text-[10px] border border-red-500/20">Elimina Prova</button>
                    <button onClick={() => setSelectedChallenge(null)} className="flex-1 bg-white text-black py-4 rounded-[1.5rem] font-black uppercase text-[10px]">Chiudi</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <input type="text" placeholder="Scrivi un commento..." className="w-full bg-white/5 border-2 border-white/10 p-6 rounded-[1.5rem] text-white outline-none focus:border-fuchsia-500 text-lg" onChange={(e) => setCaption(e.target.value)} value={caption} />
                  <label className="block w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-center py-7 rounded-[2rem] font-black uppercase tracking-[0.3em] cursor-pointer shadow-2xl active:scale-95 transition-all text-sm"> 📸 Carica Prova <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, selectedChallenge.id)} /> </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- POPUP 1: TARGET RAGGIUNTO (MARRIAGE VERSION) --- */}
        {showTargetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowTargetModal(false)}></div>
            <div className="bg-white text-black w-full max-w-md rounded-[3rem] p-12 relative z-10 text-center shadow-2xl animate-in zoom-in duration-300">
               <div className="text-6xl mb-6">💍</div>
               <h2 className="text-4xl font-black uppercase italic leading-[0.9] mb-6 tracking-tighter">MISSIONE COMPIUTA</h2>
               <p className="text-xl font-bold opacity-80 mb-10 leading-tight italic text-fuchsia-600">
                 "adesso sei pronto per sposarti (forse)"
               </p>
               <button onClick={() => setShowTargetModal(false)} className="w-full bg-black text-white py-6 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl">CONTINUA LA SFIDA</button>
            </div>
          </div>
        )}

        {/* --- POPUP 2: HERO MODAL (TUTTE LE SFIDE) --- */}
        {showHeroModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-yellow-500/95 backdrop-blur-2xl" onClick={() => setShowHeroModal(false)}></div>
            <div className="bg-black text-white w-full max-w-md rounded-[4rem] p-12 relative z-10 text-center shadow-2xl animate-in zoom-in duration-300 border-4 border-white/20">
               <div className="text-7xl mb-6 animate-bounce text-white">🏆</div>
               <h2 className="text-6xl font-black uppercase italic leading-[0.85] mb-8 tracking-tighter text-yellow-400">YOU ARE A HERO</h2>
               <div className="bg-white/10 p-8 rounded-3xl mb-10 border border-white/20">
                  <p className="text-2xl font-bold italic leading-tight text-white">"In occasione dell'ultimo pranzo, non pagherai nulla"</p>
               </div>
               <button onClick={() => setShowHeroModal(false)} className="w-full bg-yellow-400 text-black py-6 rounded-full font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">GODITI IL PREMIO</button>
            </div>
          </div>
        )}

        {/* TASTO HOME */}
        <div className="mt-32 text-center">
           <Link href="/" className="inline-block bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 px-12 py-5 rounded-full text-[10px] tracking-[0.5em] font-black uppercase transition-all shadow-2xl"> ← Home Page </Link>
        </div>

      </div>
    </main>
  );
}

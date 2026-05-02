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
    const value = Math.max(0, Math.min(1500, newVal)); 
    setTargetPoints(value);
    if (settingsId) {
      await supabase.from("Settings").update({ target_points: value }).eq('id', settingsId);
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
  
  // LOGICA CELEBRAZIONI: "Muta" durante l'editing del target
  useEffect(() => {
    if (loading || challenges.length === 0 || isSettingsOpen) return;
    
    const allDone = challenges.every(c => c.is_completed);
    
    if (allDone) {
      setShowHeroModal(true);
      setShowTargetModal(false);
    } else if (realPercentage >= 100) {
      setShowTargetModal(true);
    }
  }, [currentPoints, challenges, realPercentage, loading, isSettingsOpen]);

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
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="bg-white/10 p-3 rounded-2xl border border-white/10 text-xl hover:bg-white/20 transition-all">⚙️</button>
          </div>

          {isSettingsOpen && (
            <div className="mb-6 p-6 bg-black/90 rounded-[1.5rem] border border-fuchsia-500/50 animate-in slide-in-from-top-4">
                <p className="text-[10px] font-black uppercase text-fuchsia-400 mb-4 tracking-widest text-center">Configura il Traguardo (Max 1500)</p>
                <div className="flex items-center gap-4">
                    <input 
                        type="range" min="100" max="1500" step="5" 
                        value={targetPoints} 
                        onChange={(e) => updateTargetPoints(parseInt(e.target.value))} 
                        className="flex-1 accent-fuchsia-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer" 
                    />
                    <input 
                        type="number" 
                        value={targetPoints} 
                        onChange={(e) => updateTargetPoints(parseInt(e.target.value) || 0)}
                        className="w-20 bg-white/10 border border-white/20 text-center p-2 rounded-lg font-black text-yellow-400 outline-none focus:border-fuchsia-500"
                    />
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
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedChallenge

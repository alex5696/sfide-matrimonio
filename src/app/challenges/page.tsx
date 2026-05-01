"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; 
import Link from 'next/link';

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [targetPoints, setTargetPoints] = useState(1000); 
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [isBonusSelected, setIsBonusSelected] = useState(false);
  const [filter, setFilter] = useState("all"); 
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: challengesData } = await supabase
      .from("Challenges")
      .select("*")
      .order('id', { ascending: true });

    const { data: settingsData } = await supabase
      .from("Settings")
      .select("target_points")
      .maybeSingle();

    if (challengesData) setChallenges(challengesData);
    if (settingsData?.target_points) setTargetPoints(settingsData.target_points);
    setLoading(false);
  }

  // Funzione per i colori della difficoltà (mancava nel messaggio precedente!)
  const getDiffColor = (diff: string) => {
    switch(diff?.toLowerCase()) {
      case 'facile': return 'bg-green-500';
      case 'medio': return 'bg-yellow-500';
      case 'difficile': return 'bg-orange-600';
      case 'bonus': return 'bg-red-600 animate-pulse';
      case 'leggendario': return 'bg-gradient-to-r from-yellow-400 via-white to-yellow-400 text-black';
      default: return 'bg-white/20';
    }
  };

  const downloadPhoto = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${filename.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Tieni premuto sulla foto per salvarla manualmente.");
    }
  };

  async function handleUpload(e: any, challengeId: number) {
    const file = e.target.files[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${challengeId}-${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('media').upload(fileName, file);
    if (uploadError) { alert("Errore: " + uploadError.message); return; }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

    await supabase
      .from("Challenges")
      .update({ 
        media_url: publicUrl, 
        is_completed: true, 
        caption: caption,
        bonus_achieved: isBonusSelected 
      })
      .eq('id', challengeId);

    setCaption(""); 
    setIsBonusSelected(false);
    setSelectedChallenge(null); 
    fetchData();
  }

  async function handleDelete(challengeId: number, mediaUrl: string) {
    if (!confirm("Vuoi davvero eliminare questa prova?")) return;
    const fileName = mediaUrl.split('/').pop();
    if (fileName) { await supabase.storage.from('media').remove([fileName]); }
    await supabase.from("Challenges").update({ 
        media_url: null, 
        is_completed: false, 
        caption: null,
        bonus_achieved: false 
    }).eq('id', challengeId);
    setSelectedChallenge(null); fetchData();
  }

  const currentPoints = challenges
    .filter(c => c.is_completed)
    .reduce((sum, c) => {
        const base = c.points || 0;
        const extra = (c.bonus_achieved && c.bonus_points) ? c.bonus_points : 0;
        return sum + base + extra;
    }, 0);

  const progressPercentage = targetPoints > 0 ? Math.min((currentPoints / targetPoints) * 100, 100) : 0;
  const filteredChallenges = challenges.filter(c => {
    if (filter === "pending") return !c.is_completed;
    if (filter === "completed") return c.is_completed;
    return true;
  });

  if (loading) return <div className="min-h-screen bg-purple-950 flex items-center justify-center text-white font-black uppercase tracking-tighter">Caricamento...</div>;

  return (
    <main className="min-h-screen bg-[#0f0214] text-white p-4 md:p-8 pb-20 print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER & PROGRESS BAR */}
        <div className="bg-gradient-to-b from-white/10 to-transparent p-6 rounded-[2.5rem] border border-white/10 mb-8 sticky top-4 z-20 backdrop-blur-2xl shadow-2xl print:hidden">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-400 mb-1">Punteggio Simone</p>
              <p className="text-5xl font-black text-yellow-400 italic">
                {currentPoints}<span className="text-lg opacity-30 not-italic ml-2">/ {targetPoints}</span>
              </p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black uppercase opacity-40">Avanzamento</p>
                <p className="text-xl font-black text-white">{Math.round(progressPercentage)}%</p>
            </div>
          </div>
          <div className="w-full bg-black/50 h-4 rounded-full overflow-hidden p-1 border border-white/5">
            <div className="bg-gradient-to-r from-fuchsia-600 via-purple-500 to-yellow-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(192,38,211,0.5)]" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>

        {/* CONTROLLI */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar print:hidden">
          {['all', 'pending', 'completed'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filter === f ? 'bg-yellow-400 text-black scale-105' : 'bg-white/5 border border-white/10 text-white/50'}`}>
              {f === 'all' ? 'Tutte' : f === 'pending' ? 'Da fare' : 'Fatte'}
            </button>
          ))}
          <button onClick={() => window.print()} className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase bg-white text-black ml-auto">Report PDF</button>
        </div>

        {/* GRID SFIDE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
          {filteredChallenges.map((challenge) => (
            <div 
              key={challenge.id} 
              onClick={() => { setSelectedChallenge(challenge); setIsBonusSelected(challenge.bonus_achieved); }}
              className={`p-6 rounded-[2rem] border transition-all hover:border-fuchsia-500/50 cursor-pointer ${
                challenge.is_completed ? 'bg-green-500/10 border-green-500/30 opacity-70' : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${getDiffColor(challenge.difficulty)}`}>
                  {challenge.difficulty || 'Facile'}
                </span>
                <div className="text-yellow-400 text-sm font-black">+{challenge.points} PT</div>
              </div>
              <h3 className="text-xl font-bold uppercase leading-tight tracking-tighter mb-2">{challenge.title}</h3>
              {challenge.bonus_description && !challenge.is_completed && (
                <p className="text-[9px] text-fuchsia-400 font-bold uppercase tracking-widest">⚡ Bonus Disponibile</p>
              )}
              {challenge.bonus_achieved && (
                <p className="text-[9px] text-green-400 font-bold uppercase tracking-widest">✅ Bonus Sbloccato (+{challenge.bonus_points})</p>
              )}
            </div>
          ))}
        </div>

        {/* MODALE */}
        {selectedChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedChallenge(null)}></div>
            <div className="bg-[#1a0521] border border-white/10 w-full max-w-lg rounded-[3rem] p-8 relative z-10 shadow-2xl animate-in zoom-in duration-200">
              <button onClick={() => setSelectedChallenge(null)} className="absolute top-6 right-8 text-white/20 hover:text-white text-3xl">✕</button>
              
              <h2 className="text-3xl font-black uppercase italic leading-none mb-4 text-yellow-400">{selectedChallenge.title}</h2>
              <p className="text-lg text-white/70 mb-8 leading-snug">{selectedChallenge.descriptions}</p>

              {selectedChallenge.bonus_description && (
                <div className={`p-5 rounded-2xl border-2 mb-8 transition-all ${isBonusSelected ? 'bg-fuchsia-600/20 border-fuchsia-500' : 'bg-black/40 border-white/5'}`}>
                   <div className="flex items-start gap-4">
                      <input 
                        type="checkbox" 
                        id="bonus"
                        checked={isBonusSelected}
                        onChange={(e) => setIsBonusSelected(e.target.checked)}
                        className="w-6 h-6 rounded-lg mt-1 accent-fuchsia-500"
                        disabled={selectedChallenge.is_completed}
                      />
                      <label htmlFor="bonus" className="cursor-pointer">
                        <p className="text-[10px] font-black uppercase text-fuchsia-400 mb-1">Obiettivo Bonus (+{selectedChallenge.bonus_points} PT)</p>
                        <p className="text-sm font-bold text-white/90 leading-tight">{selectedChallenge.bonus_description}</p>
                      </label>
                   </div>
                </div>
              )}

              {selectedChallenge.is_completed ? (
                <div className="space-y-6">
                  <img src={selectedChallenge.media_url} className="w-full aspect-video object-cover rounded-[2rem]" alt="Prova" />
                  <div className="flex gap-3">
                    <button onClick={() => downloadPhoto(selectedChallenge.media_url, selectedChallenge.title)} className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase text-xs">Salva</button>
                    <button onClick={() => handleDelete(selectedChallenge.id, selectedChallenge.media_url)} className="px-6 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase text-[10px]">Elimina</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input type="text" placeholder="Commento..." className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-fuchsia-500" onChange={(e) => setCaption(e.target.value)} value={caption} />
                  <label className="block w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-center py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] cursor-pointer shadow-xl">
                    📸 Carica Prova
                    <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, selectedChallenge.id)} />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GALLERIA REPORT */}
        <div className="mt-20 print:mt-0">
            <h2 className="text-center font-black uppercase tracking-[0.4em] opacity-20 mb-10 print:hidden">Galleria dei Ricordi</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-1">
                {challenges.filter(c => c.is_completed).map(c => (
                    <div key={`gallery-${c.id}`} className="aspect-square rounded-[2rem] overflow-hidden relative group bg-white/5 print:aspect-auto print:mb-12">
                        <img src={c.media_url} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-all print:opacity-100 print:rounded-3xl print:max-h-[500px]" />
                        <div className="absolute inset-0 p-4 flex flex-col justify-end bg-gradient-to-t from-black/80 print:relative print:text-black print:bg-none">
                            <p className="text-[10px] font-black uppercase text-yellow-400 print:text-2xl print:text-purple-700">{c.title}</p>
                            {c.bonus_achieved && <p className="text-[8px] font-black uppercase text-fuchsia-400 print:text-lg">Bonus Sbloccato!</p>}
                            {c.caption && <p className="text-[10px] italic opacity-70 print:text-xl print:text-gray-500">"{c.caption}"</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </main>
  );
}

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Stato per il menu impostazioni

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

  // Funzione per aggiornare il traguardo su Supabase
  async function updateTargetPoints(newVal: number) {
    setTargetPoints(newVal);
    await supabase.from("Settings").update({ target_points: newVal }).eq('id', 1); // Assumendo che l'ID sia 1
  }

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

  const realPercentage = targetPoints > 0 ? (currentPoints / targetPoints) * 100 : 0;
  const barWidth = Math.min(realPercentage, 100);

  const filteredChallenges = challenges.filter(c => {
    if (filter === "pending") return !c.is_completed;
    if (filter === "completed") return c.is_completed;
    return true;
  });

  if (loading) return <div className="min-h-screen bg-[#0f0214] flex items-center justify-center text-white font-black uppercase tracking-widest italic">Sync in corso...</div>;

  return (
    <main className="min-h-screen bg-[#0f0214] text-white p-4 md:p-8 pb-20 print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER & SETTINGS */}
        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/20 mb-8 sticky top-4 z-30 backdrop-blur-3xl shadow-2xl print:hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-fuchsia-300 mb-1">Punteggio Simone</p>
              <div className="flex items-baseline gap-2">
                <p className="text-6xl font-black text-yellow-400 italic leading-none">{currentPoints}</p>
                <p className="text-xl font-bold text-white/50">/ {targetPoints}</p>
              </div>
            </div>
            
            {/* TASTO SETTINGS */}
            <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="bg-white/10 p-3 rounded-2xl hover:bg-white/20 transition-all border border-white/10"
            >
                ⚙️
            </button>
          </div>

          {/* PANEL SETTINGS (COMPARSA) */}
          {isSettingsOpen && (
            <div className="mb-6 p-6 bg-black/60 rounded-[1.5rem] border border-fuchsia-500/30 animate-in fade-in slide-in-from-top-4">
                <p className="text-[10px] font-black uppercase text-fuchsia-400 mb-4 tracking-widest text-center">Regola il Traguardo (Max 1500)</p>
                <div className="flex items-center gap-4">
                    <input 
                        type="range" 
                        min="100" 
                        max="1500" 
                        step="50"
                        value={targetPoints}
                        onChange={(e) => updateTargetPoints(parseInt(e.target.value))}
                        className="flex-1 accent-fuchsia-500"
                    />
                    <span className="text-xl font-black text-white w-16 text-right">{targetPoints}</span>
                </div>
            </div>
          )}
          
          <div className="w-full bg-black/50 h-5 rounded-full overflow-hidden p-1 border border-white/20">
            <div 
                className={`h-full rounded-full transition-all duration-1000 ${realPercentage >= 100 ? 'bg-gradient-to-r from-yellow-400 via-green-400 to-yellow-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]' : 'bg-gradient-to-r from-fuchsia-600 via-purple-500 to-yellow-400 shadow-[0_0_20px_rgba(192,38,211,0.5)]'}`} 
                style={{ width: `${barWidth}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between mt-3 px-1">
             <p className="text-[10px] font-black uppercase text-fuchsia-300 tracking-[0.2em]">
                {realPercentage >= 100 ? "👑 Leggendario" : "🔥 Sulla buona strada"}
             </p>
             <p className="text-[14px] font-black text-white tracking-widest">{Math.round(realPercentage)}%</p>
          </div>
        </div>

        {/* CONTROLLI FILTRI */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2 no-scrollbar print:hidden">
          {['all', 'pending', 'completed'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${filter === f ? 'bg-white text-black scale-105 shadow-2xl' : 'bg-white/10 border border-white/10 text-white hover:bg-white/20'}`}>
              {f === 'all' ? 'Tutte' : f === 'pending' ? 'Da fare' : 'Completate'}
            </button>
          ))}
          <button onClick={() => window.print()} className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase bg-fuchsia-600 text-white ml-auto shadow-lg hover:bg-fuchsia-500 transition-all">Report PDF</button>
        </div>

        {/* LISTA DELLE SFIDE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:hidden">
          {filteredChallenges.map((challenge) => (
            <div 
              key={challenge.id} 
              onClick={() => { setSelectedChallenge(challenge); setIsBonusSelected(challenge.bonus_achieved); }}
              className={`p-8 rounded-[2.5rem] border-2 transition-all hover:border-fuchsia-500/50 cursor-pointer ${
                challenge.is_completed 
                ? 'bg-green-500/5 border-green-500/20 opacity-70' 
                : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <div className="text-yellow-400 text-xl font-black italic tracking-tighter">+{challenge.points} PT</div>
                {challenge.is_completed && <div className="text-green-400 text-xs font-black uppercase tracking-widest border border-green-400/30 px-3 py-1 rounded-full">OK</div>}
              </div>
              <h3 className="text-2xl font-bold uppercase leading-[1.1] text-white mb-3 tracking-tighter">{challenge.title}</h3>
              {challenge.bonus_description && !challenge.is_completed && (
                <div className="text-[9px] font-black text-fuchsia-400 uppercase tracking-widest flex items-center gap-2">
                   <span className="animate-pulse">⚡</span> Bonus Disponibile
                </div>
              )}
            </div>
          ))}
        </div>

        {/* MODALE DETTAGLIO */}
        {selectedChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedChallenge(null)}></div>
            <div className="bg-[#1a0521] border border-white/20 w-full max-w-lg rounded-[3.5rem] p-8 relative z-10 shadow-2xl animate-in zoom-in duration-200">
              <button onClick={() => setSelectedChallenge(null)} className="absolute top-8 right-10 text-white/40 hover:text-white text-3xl font-light">✕</button>
              
              <h2 className="text-4xl font-black uppercase italic leading-none mb-4 text-yellow-400">{selectedChallenge.title}</h2>
              <p className="text-xl text-white/80 mb-10 leading-snug">{selectedChallenge.descriptions}</p>

              {/* BONUS SECTION */}
              {selectedChallenge.bonus_description && (
                <div className={`p-6 rounded-[2rem] border-2 mb-10 transition-all ${isBonusSelected ? 'bg-fuchsia-600/30 border-fuchsia-400' : 'bg-black/40 border-white/10'}`}>
                   <div className="flex items-start gap-4">
                      <input 
                        type="checkbox" 
                        id="bonus"
                        checked={isBonusSelected}
                        onChange={(e) => setIsBonusSelected(e.target.checked)}
                        className="w-8 h-8 rounded-xl mt-1 accent-fuchsia-500 cursor-pointer"
                        disabled={selectedChallenge.is_completed}
                      />
                      <label htmlFor="bonus" className="cursor-pointer">
                        <p className="text-[11px] font-black uppercase text-fuchsia-300 mb-1 tracking-widest italic">🎯 Obiettivo Extra (+{selectedChallenge.bonus_points} PT)</p>
                        <p className="text-md font-bold text-white leading-tight">{selectedChallenge.bonus_description}</p>
                      </label>
                   </div>
                </div>
              )}

              {selectedChallenge.is_completed ? (
                <div className="space-y-6">
                  <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
                    <img src={selectedChallenge.media_url} className="w-full aspect-video object-cover" alt="Prova" />
                  </div>
                  {selectedChallenge.caption && <p className="text-center italic text-fuchsia-100 text-lg opacity-80 font-serif">"{selectedChallenge.caption}"</p>}
                  <div className="flex gap-4">
                    <button onClick={() => downloadPhoto(selectedChallenge.media_url, selectedChallenge.title)} className="flex-1 bg-white text-black py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl">Salva</button>
                    <button onClick={() => handleDelete(selectedChallenge.id, selectedChallenge.media_url)} className="px-8 bg-red-600/10 text-red-500 rounded-[1.5rem] font-black uppercase text-[10px] border border-red-500/20">Elimina</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <input type="text" placeholder="Scrivi una dedica o un commento..." className="w-full bg-white/5 border-2 border-white/10 p-6 rounded-[1.5rem] text-white outline-none focus:border-fuchsia-500 transition-all text-lg placeholder:text-white/20" onChange={(e) => setCaption(e.target.value)} value={caption} />
                  <label className="block w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-center py-7 rounded-[2rem] font-black uppercase tracking-[0.3em] cursor-pointer shadow-2xl active:scale-95 transition-all text-sm">
                    📸 Scatta o Carica
                    <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, selectedChallenge.id)} />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GALLERIA DEI RICORDI */}
        <div className="mt-32 print:mt-0">
            <h2 className="text-center font-black uppercase tracking-[0.5em] text-white mb-16 print:hidden italic text-2xl drop-shadow-2xl">The Hall of Fame</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 print:grid-cols-1">
                {challenges.filter(c => c.is_completed).map(c => (
                    <div key={`gallery-${c.id}`} className="aspect-square rounded-[2.5rem] overflow-hidden relative group bg-white/5 border border-white/10 print:aspect-auto print:mb-16">
                        <img src={c.media_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all print:opacity-100 print:rounded-[3rem] print:max-h-[550px]" />
                        <div className="absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-black via-black/30 to-transparent print:relative print:text-black print:bg-none">
                            <p className="text-[11px] font-black uppercase text-yellow-400 print:text-3xl print:text-purple-700 leading-tight mb-1 italic tracking-tighter">{c.title}</p>
                            {c.bonus_achieved && <p className="text-[10px] font-black uppercase text-fuchsia-400 print:text-xl mb-1">Bonus Sbloccato!</p>}
                            {c.caption && <p className="text-[12px] italic text-white/80 mt-2 print:text-2xl print:text-gray-500 leading-snug">"{c.caption}"</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* TASTO HOME */}
        <div className="mt-32 text-center print:hidden">
           <Link href="/" className="inline-block bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 px-12 py-5 rounded-full text-[10px] tracking-[0.5em] font-black uppercase transition-all shadow-2xl">
             ← Home Page
           </Link>
        </div>

      </div>
    </main>
  );
}

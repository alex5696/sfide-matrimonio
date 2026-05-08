"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; 
import Link from 'next/link';

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [targetPoints, setTargetPoints] = useState(1000); 
  const [weddingDate, setWeddingDate] = useState(""); // Stato per la data
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [isBonusSelected, setIsBonusSelected] = useState(false);
  const [filter, setFilter] = useState("all"); 
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    // ORDINAMENTO PER PUNTI CRESCENTE
    const { data: challengesData } = await supabase
      .from("Challenges")
      .select("*")
      .order('points', { ascending: true });

    const { data: settingsData } = await supabase
      .from("Settings")
      .select("target_points, wedding_date")
      .maybeSingle();

    if (challengesData) setChallenges(challengesData);
    if (settingsData) {
      setTargetPoints(settingsData.target_points);
      setWeddingDate(settingsData.wedding_date || "2026-06-20T00:00:00");
    }
    setLoading(false);
  }

  // AGGIORNA TRAGUARDO PUNTI
  async function updateTargetPoints(newVal: number) {
    const value = isNaN(newVal) ? 0 : newVal;
    setTargetPoints(value);
    await supabase.from("Settings").update({ target_points: value }).eq('id', 1);
  }

  // AGGIORNA DATA MATRIMONIO
  async function updateWeddingDate(newDate: string) {
    setWeddingDate(newDate);
    await supabase.from("Settings").update({ wedding_date: newDate }).eq('id', 1);
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
    } catch (err) { alert("Errore nel download."); }
  };

  async function handleUpload(e: any, challengeId: number) {
    const file = e.target.files[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${challengeId}-${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('media').upload(fileName, file);
    if (uploadError) { alert("Errore: " + uploadError.message); return; }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

    await supabase.from("Challenges").update({ 
        media_url: publicUrl, 
        is_completed: true, 
        caption: caption,
        bonus_achieved: isBonusSelected 
    }).eq('id', challengeId);

    setCaption(""); setIsBonusSelected(false); setSelectedChallenge(null); fetchData();
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
    .reduce((sum, c) => sum + (c.points || 0) + ((c.bonus_achieved && c.bonus_points) ? c.bonus_points : 0), 0);

  const realPercentage = targetPoints > 0 ? (currentPoints / targetPoints) * 100 : 0;
  const barWidth = Math.min(realPercentage, 100);
  const allCompleted = challenges.length > 0 && challenges.every(c => c.is_completed);
  const targetReached = realPercentage >= 100;

  const filteredChallenges = challenges.filter(c => {
    if (filter === "pending") return !c.is_completed;
    if (filter === "completed") return c.is_completed;
    return true;
  });

  if (loading) return <div className="min-h-screen bg-[#0f0214] flex items-center justify-center text-white font-black italic">SYNC MISSIONI...</div>;

  return (
    <main className="min-h-screen bg-[#0f0214] text-white p-4 md:p-8 pb-20">
      <div className="max-w-4xl mx-auto">
        
        {/* PROGRESS BAR & SETTINGS */}
        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/20 mb-8 sticky top-4 z-30 backdrop-blur-3xl shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-fuchsia-300 mb-1">Status Simone</p>
              <div className="flex items-baseline gap-2">
                <p className="text-6xl font-black text-yellow-400 italic leading-none">{currentPoints}</p>
                <p className="text-xl font-bold text-white/50">/ {targetPoints}</p>
              </div>
            </div>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-3 rounded-2xl border transition-all ${isSettingsOpen ? 'bg-fuchsia-600 border-white' : 'bg-white/10 border-white/10'}`}>⚙️</button>
          </div>

          {isSettingsOpen && (
            <div className="mb-6 p-6 bg-black/60 rounded-[1.5rem] border border-fuchsia-500/30 space-y-6">
                {/* EDIT PUNTI */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-fuchsia-400 tracking-widest text-center">Traguardo Punti</p>
                  <input type="range" min="100" max="2000" step="5" value={targetPoints} onChange={(e) => updateTargetPoints(parseInt(e.target.value))} className="w-full accent-fuchsia-500" />
                  <input type="number" value={targetPoints} onChange={(e) => updateTargetPoints(parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 text-center font-black text-yellow-400 outline-none" />
                </div>

                {/* EDIT DATA MATRIMONIO */}
                <div className="space-y-2 border-t border-white/10 pt-4">
                  <p className="text-[10px] font-black uppercase text-fuchsia-400 tracking-widest text-center">Data Matrimonio</p>
                  <input 
                    type="datetime-local" 
                    value={weddingDate.substring(0, 16)} 
                    onChange={(e) => updateWeddingDate(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 text-center font-bold text-white outline-none focus:border-fuchsia-500"
                  />
                  <p className="text-[9px] text-white/40 text-center italic">Il countdown si aggiornerà automaticamente nella Home.</p>
                </div>
            </div>
          )}
          
          <div className="w-full bg-black/50 h-5 rounded-full overflow-hidden p-1 border border-white/20">
            <div className={`h-full rounded-full transition-all duration-1000 ${targetReached ? 'bg-gradient-to-r from-yellow-400 to-green-400' : 'bg-fuchsia-600'}`} style={{ width: `${barWidth}%` }}></div>
          </div>
        </div>

        {/* MESSAGGI VITTORIA */}
        {!isSettingsOpen && (
          <div className="space-y-4 mb-8">
            {allCompleted ? (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black p-8 rounded-[2.5rem] text-center border-4 border-white animate-bounce">
                <h2 className="text-4xl font-black uppercase italic">🏆 YOU ARE A HERO</h2>
              </div>
            ) : targetReached ? (
              <div className="bg-fuchsia-600 text-white p-8 rounded-[2.5rem] text-center border-4 border-white">
                <h2 className="text-3xl font-black uppercase italic">🔥 MISSIONE COMPIUTA</h2>
              </div>
            ) : null}
          </div>
        )}

        {/* FILTRI */}
        <div className="flex flex-wrap gap-2 mb-10">
          {['all', 'pending', 'completed'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-black scale-105' : 'bg-white/10 border border-white/10'}`}>
              {f === 'all' ? 'Tutte' : f === 'pending' ? 'Da fare' : 'Fatte'}
            </button>
          ))}
          <button onClick={() => window.print()} className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase bg-green-600 text-white ml-auto shadow-lg">📄 Report PDF</button>
        </div>

        {/* GRID SFIDE (Ordinate per punti cresc.) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filteredChallenges.map((challenge) => (
            <div 
              key={challenge.id} 
              onClick={() => { setSelectedChallenge(challenge); setIsBonusSelected(challenge.bonus_achieved); }}
              className={`p-6 rounded-[2rem] border-2 transition-all hover:border-fuchsia-500/50 cursor-pointer ${challenge.is_completed ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-yellow-400 font-black">+{challenge.points} PT</span>
                {challenge.is_completed && <span className="text-green-400 font-bold text-xs uppercase tracking-widest">✅ Fatta</span>}
              </div>
              <h2 className="text-xl font-bold uppercase truncate">{challenge.title}</h2>
            </div>
          ))}
        </div>

        {/* POP-UP DETTAGLI */}
        {selectedChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedChallenge(null)}></div>
            <div className="bg-[#1a0521] border border-white/20 w-full max-w-lg rounded-[2.5rem] p-8 relative z-10 shadow-2xl">
              <button onClick={() => setSelectedChallenge(null)} className="absolute top-6 right-6 text-2xl">✕</button>
              <h2 className="text-2xl font-black text-yellow-400 uppercase mb-4">{selectedChallenge.title}</h2>
              <p className="text-sm opacity-70 mb-8">{selectedChallenge.descriptions}</p>

              {selectedChallenge.is_completed ? (
                <div className="space-y-4">
                  <img src={selectedChallenge.media_url} className="w-full aspect-video object-cover rounded-2xl" alt="Prova" />
                  <div className="flex gap-2">
                    <button onClick={() => downloadPhoto(selectedChallenge.media_url, selectedChallenge.title)} className="flex-1 bg-blue-600 py-4 rounded-2xl font-black text-[10px] uppercase">💾 Salva</button>
                    <button onClick={() => handleDelete(selectedChallenge.id, selectedChallenge.media_url)} className="flex-1 bg-red-600/20 text-red-400 py-4 rounded-2xl border border-red-600/30 font-black text-[10px] uppercase">🗑️ Elimina</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <input type="text" placeholder="Didascalia..." className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none" onChange={(e) => setCaption(e.target.value)} value={caption} />
                  {selectedChallenge.bonus_points > 0 && (
                    <div onClick={() => setIsBonusSelected(!isBonusSelected)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${isBonusSelected ? 'bg-yellow-400 text-black border-white' : 'bg-white/5 border-white/10'}`}>
                      <p className="text-[10px] font-black uppercase">🔥 Bonus (+{selectedChallenge.bonus_points} PT)</p>
                      <p className="text-xs">{selectedChallenge.bonus_description}</p>
                    </div>
                  )}
                  <label className="block w-full bg-white text-black text-center py-5 rounded-2xl font-black cursor-pointer uppercase">
                    📸 Carica Prova
                    <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, selectedChallenge.id)} />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-20 text-center">
           <Link href="/" className="text-white/20 hover:text-white underline text-xs uppercase tracking-widest">← Torna alla Home</Link>
        </div>
      </div>
    </main>
  );
}

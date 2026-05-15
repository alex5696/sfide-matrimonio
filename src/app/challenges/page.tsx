"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from 'next/link';

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [targetPoints, setTargetPoints] = useState(1000);
  const [weddingDate, setWeddingDate] = useState("2026-06-20T00:00:00"); 
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [isBonusSelected, setIsBonusSelected] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // NUOVO: Stato per la foto di gruppo del diploma
  const [diplomaPhoto, setDiplomaPhoto] = useState<string | null>(null);

  // Funzione per rilevare video (inclusi formati Apple .mov)
  const isVideo = (url: string) => {
    return url?.match(/\.(mp4|webm|ogg|mov|quicktime)$/i);
  };

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: challengesData } = await supabase
      .from("Challenges")
      .select("*")
      .order('points', { ascending: true });

    const { data: settingsData } = await supabase
      .from("Settings")
      .select("target_points, wedding_date, diploma_photo_url")
      .eq('id', 1)
      .maybeSingle();

    if (challengesData) setChallenges(challengesData);
    if (settingsData) {
        if (settingsData.target_points) setTargetPoints(settingsData.target_points);
        if (settingsData.wedding_date) setWeddingDate(settingsData.wedding_date);
        if (settingsData.diploma_photo_url) setDiplomaPhoto(settingsData.diploma_photo_url);
    }
    setLoading(false);
  }

  async function updateTargetPoints(newVal: number) {
    const value = isNaN(newVal) ? 0 : newVal;
    setTargetPoints(value);
    await supabase.from("Settings").upsert({ id: 1, target_points: value });
  }

  async function updateWeddingDate(newDate: string) {
    setWeddingDate(newDate);
    await supabase.from("Settings").upsert({ id: 1, wedding_date: newDate }); 
  }

  // NUOVA FUNZIONE: Caricamento foto di gruppo
  async function handleDiplomaPhotoUpload(e: any) {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `diploma-group-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('media').upload(fileName, file);
    if (uploadError) { alert("Errore caricamento"); return; }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

    setDiplomaPhoto(publicUrl);
    await supabase.from("Settings").update({ diploma_photo_url: publicUrl }).eq('id', 1);
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
      alert("Tieni premuto sul file per salvarlo manualmente.");
    }
  };

  async function handleUpload(e: any, challengeId: number) {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${challengeId}-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('media').upload(fileName, file);
    if (uploadError) { alert("Errore caricamento"); return; }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

    await supabase.from("Challenges").update({
        media_url: publicUrl,
        is_completed: true,
        caption: caption,
        bonus_achieved: isBonusSelected
      }).eq('id', challengeId);

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
  const allCompleted = challenges.length > 0 && challenges.every(c => c.is_completed);
  const targetReached = realPercentage >= 100;

  const filteredChallenges = challenges.filter(c => {
    if (filter === "pending") return !c.is_completed;
    if (filter === "completed") return c.is_completed;
    return true;
  });

  if (loading) return <div className="min-h-screen bg-[#0f0214] flex items-center justify-center text-white font-black uppercase italic tracking-widest">Sincronizzazione...</div>;

  return (
    <main className="min-h-screen bg-[#0f0214] text-white p-4 md:p-8 pb-20 print:bg-white print:text-black print:p-0">
      
      {/* GOOGLE FONTS PER IL DIPLOMA */}
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Montserrat:wght@900&display=swap" rel="stylesheet" />

      {/* CSS PER LA STAMPA */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .printable-diploma, .printable-diploma * { visibility: visible; }
          .printable-diploma { 
            position: absolute; left: 0; top: 0; width: 100%; height: 100vh; 
            display: flex !important; flex-direction: column; justify-content: center; 
            align-items: center; border: 15px double #a855f7; padding: 40px; background: white;
          }
          @page { margin: 0; size: auto; }
        }
      `}</style>

      {/* SEZIONE DIPLOMA MIGLIORATA */}
      <div className={`printable-diploma hidden ${targetReached ? 'print:flex' : ''} flex-col items-center justify-center text-center bg-white text-black`}>
        <h1 className="text-5xl font-black uppercase mb-2 text-purple-900" style={{ fontFamily: 'Montserrat' }}>Diploma di Idoneità</h1>
        <p className="text-xl font-bold uppercase tracking-[0.3em] mb-8 border-b-2 border-purple-100 pb-2">Al Matrimonio</p>
        <p className="text-lg mb-2 text-gray-500 italic">Si certifica solennemente che</p>
        
        {/* NOME ELEGANTE */}
        <h2 className="text-8xl text-purple-600 mb-8" style={{ fontFamily: "'Dancing Script', cursive" }}>Simone</h2>
        
        <p className="max-w-2xl text-lg leading-relaxed mb-8 px-10">
          Ha superato con successo le prove fisiche, psicologiche ed alcoliche stabilite dalla Centrale Operativa, totalizzando <span className="font-black text-2xl">{currentPoints} Punti</span>.
        </p>

        {/* FOTO DI GRUPPO NEL DIPLOMA */}
        {diplomaPhoto && (
            <img src={diplomaPhoto} className="w-full max-w-md h-64 object-cover rounded-2xl border-4 border-purple-50 shadow-xl mb-8" alt="Foto Gruppo" />
        )}

        <div className="flex justify-between w-full max-w-2xl mt-8 border-t-2 border-purple-100 pt-8">
            <div className="text-left">
                <p className="font-bold uppercase text-xs text-purple-400">Data della Gloria</p>
                <p className="font-mono">{new Date().toLocaleDateString('it-IT')}</p>
            </div>
            <div className="text-right">
                <p className="font-bold uppercase text-xs text-purple-400">La Commissione</p>
                <p className="text-3xl text-purple-900" style={{ fontFamily: "'Dancing Script', cursive" }}>Gli Amici di Sempre</p>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto print:hidden">
        
        {/* BARRA PUNTEGGIO E IMPOSTAZIONI */}
        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/20 mb-8 sticky top-4 z-30 backdrop-blur-3xl shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-fuchsia-300 mb-1">Punteggio Simone</p>
              <div className="flex items-baseline gap-2">
                <p className="text-6xl font-black text-yellow-400 italic leading-none">{currentPoints}</p>
                <p className="text-xl font-bold text-white/50">/ {targetPoints}</p>
              </div>
            </div>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-3 rounded-2xl border transition-all ${isSettingsOpen ? 'bg-fuchsia-600 border-white' : 'bg-white/10 border-white/10'}`}>⚙️</button>
          </div>

          {isSettingsOpen && (
            <div className="mb-6 p-6 bg-black/60 rounded-[1.5rem] border border-fuchsia-500/30 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-fuchsia-400 mb-2">Traguardo Punti</p>
                        <input type="range" min="100" max="2000" step="50" value={targetPoints} onChange={(e) => updateTargetPoints(parseInt(e.target.value))} className="w-full accent-fuchsia-500 mb-2" />
                        <p className="font-bold text-yellow-400">{targetPoints} PT</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-fuchsia-400 mb-2">Data Matrimonio</p>
                        <input type="datetime-local" value={weddingDate.substring(0, 16)} onChange={(e) => updateWeddingDate(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 font-bold text-white focus:outline-none" />
                    </div>
                </div>
                {/* CARICAMENTO FOTO GRUPPO */}
                <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] font-black uppercase text-center text-yellow-400 mb-4 tracking-widest">Foto di Gruppo per il Diploma</p>
                    <label className="block w-full bg-purple-600 text-white text-center py-4 rounded-2xl font-black cursor-pointer uppercase text-xs hover:bg-fuchsia-600 transition-all">
                        {diplomaPhoto ? "📸 Cambia Foto di Gruppo" : "📸 Carica Foto di Gruppo"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleDiplomaPhotoUpload} />
                    </label>
                </div>
            </div>
          )}
          
          <div className="w-full bg-black/50 h-5 rounded-full overflow-hidden p-1 border border-white/20">
            <div className={`h-full rounded-full transition-all duration-1000 ${targetReached ? 'bg-gradient-to-r from-yellow-400 to-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'bg-fuchsia-600'}`} style={{ width: `${barWidth}%` }}></div>
          </div>
        </div>

        {/* MESSAGGI DI VITTORIA (RIPRISTINATI) */}
        {!isSettingsOpen && (
          <div className="space-y-4 mb-8">
            {allCompleted ? (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black p-8 rounded-[2.5rem] text-center border-4 border-white animate-bounce shadow-2xl">
                <h2 className="text-4xl font-black uppercase italic">🏆 SEI UN MITO</h2>
                <p className="font-bold mt-2 text-lg">Preparati, la cena è offerta! 🍻</p>
              </div>
            ) : targetReached ? (
              <div className="bg-fuchsia-600 text-white p-8 rounded-[2.5rem] text-center border-4 border-white shadow-[0_0_30px_rgba(192,38,211,0.5)]">
                <h2 className="text-3xl font-black uppercase">🔥 TRAGUARDO RAGGIUNTO</h2>
                <p className="font-bold mt-2">Simone è ufficialmente pronto per l'altare!</p>
              </div>
            ) : null}
          </div>
        )}

        {/* FILTRI E AZIONE PDF */}
        <div className="flex flex-wrap gap-2 mb-10">
          {['all', 'pending', 'completed'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-black scale-105 shadow-lg' : 'bg-white/10 border border-white/10'}`}>
              {f === 'all' ? 'Tutte' : f === 'pending' ? 'Da fare' : 'Fatte'}
            </button>
          ))}
          <button 
            onClick={() => window.print()} 
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase ml-auto shadow-lg transition-all active:scale-95 ${targetReached ? 'bg-yellow-400 text-black animate-pulse' : 'bg-green-600 text-white'}`}
          >
            {targetReached ? '🎓 SCARICA DIPLOMA' : '📄 REPORT PROVE'}
          </button>
        </div>

        {/* LISTA DELLE SFIDE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filteredChallenges.map((challenge) => (
            <div key={challenge.id} onClick={() => { setSelectedChallenge(challenge); setIsBonusSelected(challenge.bonus_achieved); }} className={`p-6 rounded-[2rem] border-2 transition-all hover:border-fuchsia-500/50 cursor-pointer ${challenge.is_completed ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-yellow-400 font-black">+{challenge.points} PT</span>
                {challenge.is_completed && <span className="text-green-400 font-bold italic text-xs tracking-tighter">SUCCESS ✅</span>}
              </div>
              <h2 className="text-xl font-bold uppercase truncate">{challenge.title}</h2>
              <p className="text-[10px] opacity-40 mt-2 font-black tracking-widest text-right">DETTAGLI →</p>
            </div>
          ))}
        </div>

        {/* MODALE DETTAGLI (FIX VIDEO E IPHONE) */}
        {selectedChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedChallenge(null)}></div>
            <div className="bg-[#1a0521] border border-white/20 w-full max-w-lg rounded-[2.5rem] p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh]">
              <button onClick={() => setSelectedChallenge(null)} className="absolute top-6 right-6 text-2xl p-2">✕</button>
              <h2 className="text-2xl font-black text-yellow-400 uppercase mb-4 pr-10">{selectedChallenge.title}</h2>
              <p className="text-sm opacity-70 mb-8 leading-relaxed">{selectedChallenge.descriptions}</p>
              
              {selectedChallenge.is_completed ? (
                <div className="space-y-4">
                  {isVideo(selectedChallenge.media_url) ? (
                    <video 
                      src={selectedChallenge.media_url} 
                      controls 
                      playsInline 
                      webkit-playsinline="true"
                      className="w-full rounded-2xl border border-white/10"
                    />
                  ) : (
                    <img 
                      src={selectedChallenge.media_url} 
                      className="w-full rounded-2xl border border-white/10" 
                      alt="Prova" 
                    />
                  )}
                  {selectedChallenge.caption && <p className="italic text-center text-fuchsia-200 opacity-80">"{selectedChallenge.caption}"</p>}
                  <div className="flex gap-2">
                    <button onClick={() => downloadPhoto(selectedChallenge.media_url, selectedChallenge.title)} className="flex-1 bg-blue-600/30 text-blue-300 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">💾 Salva</button>
                    <button onClick={() => handleDelete(selectedChallenge.id, selectedChallenge.media_url)} className="flex-1 bg-red-600/20 text-red-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">🗑️ Elimina</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <input type="text" placeholder="Didascalia..." className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none text-white focus:border-fuchsia-500" onChange={(e) => setCaption(e.target.value)} value={caption} />
                  {selectedChallenge.bonus_points > 0 && (
                    <div onClick={() => setIsBonusSelected(!isBonusSelected)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${isBonusSelected ? 'bg-yellow-400 text-black border-white shadow-lg' : 'bg-white/5 border-white/10'}`}>
                      <p className="text-[10px] font-black uppercase">🔥 Bonus (+{selectedChallenge.bonus_points} PT)</p>
                      <p className="text-xs">{selectedChallenge.bonus_description}</p>
                    </div>
                  )}
                  <label className="block w-full bg-white text-black text-center py-5 rounded-2xl font-black cursor-pointer uppercase hover:bg-yellow-400 transition-all active:scale-95 shadow-xl">
                    📸 Carica Prova
                    <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, selectedChallenge.id)} />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GALLERIA RICORDI */}
        <div className="mt-20">
          <h2 className="text-3xl font-black uppercase italic text-center mb-8 text-yellow-400">📸 Galleria Ricordi</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {challenges.filter(c => c.is_completed).map((completed) => (
              <div key={`gallery-${completed.id}`} className="group relative rounded-2xl overflow-hidden aspect-square bg-black border border-white/5 shadow-lg">
                {isVideo(completed.media_url) ? (
                  <video src={completed.media_url} className="w-full h-full object-cover opacity-80" muted loop playsInline onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                ) : (
                  <img src={completed.media_url} className="w-full h-full object-cover opacity-80" alt="Ricordo" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex flex-col justify-end p-3">
                   <p className="text-[10px] font-black uppercase text-white truncate">{completed.title}</p>
                   {completed.caption && <p className="text-[8px] text-fuchsia-300 font-bold truncate">"{completed.caption}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-20 text-center">
            <Link href="/" className="text-white/20 hover:text-white underline text-xs uppercase tracking-widest transition-colors">← Torna alla Home</Link>
        </div>
      </div>
    </main>
  );
}

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  async function updateTargetPoints(newVal: number) {
    setTargetPoints(newVal);
    await supabase.from("Settings").update({ target_points: newVal }).eq('id', 1);
  }

  // FUNZIONE DOWNLOAD FOTO
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

  if (loading) return <div className="min-h-screen bg-[#0f0214] flex items-center justify-center text-white font-black uppercase italic tracking-widest">Sync in corso...</div>;

  return (
    <main className="min-h-screen bg-[#0f0214] text-white p-4 md:p-8 pb-20 print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto">
        
        {/* PROGRESS BAR & SETTINGS (Nasconde in stampa) */}
        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/20 mb-8 sticky top-4 z-30 backdrop-blur-3xl shadow-2xl print:hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-fuchsia-300 mb-1">Punteggio Simone</p>
              <div className="flex items-baseline gap-2">
                <p className="text-6xl font-black text-yellow-400 italic leading-none">{currentPoints}</p>
                <p className="text-xl font-bold text-white/50">/ {targetPoints}</p>
              </div>
            </div>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="bg-white/10 p-3 rounded-2xl border border-white/10">⚙️</button>
          </div>

          {isSettingsOpen && (
            <div className="mb-6 p-6 bg-black/60 rounded-[1.5rem] border border-fuchsia-500/30">
                <p className="text-[10px] font-black uppercase text-fuchsia-400 mb-4 tracking-widest text-center">Regola il Traguardo</p>
                <div className="flex items-center gap-4">
                    <input type="range" min="100" max="2000" step="50" value={targetPoints} onChange={(e) => updateTargetPoints(parseInt(e.target.value))} className="flex-1 accent-fuchsia-500" />
                    <span className="text-xl font-black text-white w-16 text-right">{targetPoints}</span>
                </div>
            </div>
          )}
          
          <div className="w-full bg-black/50 h-5 rounded-full overflow-hidden p-1 border border-white/20">
            <div className={`h-full rounded-full transition-all duration-1000 ${realPercentage >= 100 ? 'bg-green-400' : 'bg-fuchsia-600'}`} style={{ width: `${barWidth}%` }}></div>
          </div>
        </div>

        {/* FILTRI E TASTO REPORT (Nasconde in stampa) */}
        <div className="flex flex-wrap gap-2 mb-10 print:hidden">
          {['all', 'pending', 'completed'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest ${filter === f ? 'bg-white text-black' : 'bg-white/10'}`}>
              {f === 'all' ? 'Tutte' : f === 'pending' ? 'Da fare' : 'Fatte'}
            </button>
          ))}
          <button onClick={() => window.print()} className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase bg-green-600 text-white ml-auto shadow-lg">📄 Report PDF</button>
        </div>

        {/* INTESTAZIONE SOLO PER STAMPA */}
        <div className="hidden print:block text-center mb-10 border-b-2 border-black pb-4 text-black">
          <h1 className="text-4xl font-black uppercase">Report Sfide Matrimonio</h1>
          <p className="text-xl">Simone ha totalizzato {currentPoints} punti!</p>
        </div>

        {/* GRID DELLE SFIDE (Nasconde in stampa) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:hidden">
          {filteredChallenges.map((challenge) => (
            <div 
              key={challenge.id} 
              onClick={() => { setSelectedChallenge(challenge); setIsBonusSelected(challenge.bonus_achieved); }}
              className={`p-6 rounded-[2rem] border-2 transition-all ${challenge.is_completed ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-yellow-400 font-black">+{challenge.points} PT</span>
                {challenge.is_completed && <span className="text-green-400 font-bold">COMPLETATA ✅</span>}
              </div>
              <h2 className="text-xl font-bold uppercase truncate">{challenge.title}</h2>
              <p className="text-[10px] opacity-40 mt-2">CLICCA PER DETTAGLI →</p>
            </div>
          ))}
        </div>

        {/* POP-UP DETTAGLI (Nasconde in stampa) */}
        {selectedChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedChallenge(null)}></div>
            <div className="bg-[#1a0521] border border-white/20 w-full max-w-lg rounded-[2.5rem] p-8 relative z-10 shadow-2xl">
              <button onClick={() => setSelectedChallenge(null)} className="absolute top-6 right-6 text-2xl">✕</button>
              <h2 className="text-2xl font-black text-yellow-400 uppercase mb-4">{selectedChallenge.title}</h2>
              <p className="text-sm opacity-70 mb-8">{selectedChallenge.descriptions}</p>

              {selectedChallenge.is_completed ? (
                <div className="space-y-4">
                  <img src={selectedChallenge.media_url} className="w-full aspect-video object-cover rounded-2xl" alt="Prova" />
                  {selectedChallenge.caption && <p className="italic text-center text-fuchsia-200">"{selectedChallenge.caption}"</p>}
                  <div className="flex gap-2">
                    <button onClick={() => downloadPhoto(selectedChallenge.media_url, selectedChallenge.title)} className="flex-1 bg-blue-600 py-4 rounded-2xl font-black text-[10px] uppercase">💾 Scarica</button>
                    <button onClick={() => handleDelete(selectedChallenge.id, selectedChallenge.media_url)} className="flex-1 bg-red-600/20 text-red-400 py-4 rounded-2xl border border-red-600/30 font-black text-[10px] uppercase">🗑️ Elimina</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <input type="text" placeholder="Didascalia..." className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none" onChange={(e) => setCaption(e.target.value)} value={caption} />
                  {selectedChallenge.bonus_points > 0 && (
                    <div onClick={() => setIsBonusSelected(!isBonusSelected)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${isBonusSelected ? 'bg-yellow-400 text-black border-white' : 'bg-white/5 border-white/10'}`}>
                      <p className="text-[10px] font-black uppercase">🔥 Bonus Extra (+{selectedChallenge.bonus_points} PT)</p>
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

        {/* GALLERIA / REPORT (In stampa diventa la lista dei risultati) */}
        <div className="mt-20 print:mt-0">
          <h2 className="text-3xl font-black uppercase italic text-center mb-8 text-yellow-400 print:hidden">📸 Galleria Ricordi</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-1 print:gap-12">
            {challenges.filter(c => c.is_completed).map((completed) => (
              <div key={`gallery-${completed.id}`} className="group relative rounded-2xl overflow-hidden aspect-square bg-black print:aspect-auto print:bg-white">
                <img src={completed.media_url} className="w-full h-full object-cover opacity-80 print:opacity-100 print:max-h-[500px] print:object-contain print:rounded-3xl" alt="Ricordo" />
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black text-[10px] uppercase font-bold print:relative print:text-black print:bg-none print:text-center print:text-xl print:mt-4">
                   <p className="print:text-2xl print:font-black">{completed.title}</p>
                   {completed.caption && <p className="italic opacity-70 print:mt-2">"{completed.caption}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-20 text-center print:hidden">
           <Link href="/" className="text-white/20 hover:text-white underline text-xs uppercase tracking-widest">← Torna alla Home</Link>
        </div>
      </div>
    </main>
  );
}

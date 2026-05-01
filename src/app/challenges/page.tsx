"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; 
import Link from 'next/link';

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [targetPoints, setTargetPoints] = useState(1000); 
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
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

  // Funzione per scaricare una singola foto
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
      alert("Errore nel download. Prova a tenere premuto sulla foto e seleziona 'Salva immagine'.");
    }
  };

  async function handleUpload(e: any, challengeId: number) {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${challengeId}-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, file);

    if (uploadError) {
      alert("Errore caricamento: " + uploadError.message);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

    await supabase
      .from("Challenges")
      .update({ 
        media_url: publicUrl, 
        is_completed: true,
        caption: caption 
      })
      .eq('id', challengeId);

    setCaption("");
    setSelectedChallenge(null); 
    fetchData();
  }

  async function handleDelete(challengeId: number, mediaUrl: string) {
    if (!confirm("Vuoi davvero eliminare questa prova?")) return;

    const fileName = mediaUrl.split('/').pop();
    if (fileName) {
      await supabase.storage.from('media').remove([fileName]);
    }

    await supabase
      .from("Challenges")
      .update({ media_url: null, is_completed: false, caption: null })
      .eq('id', challengeId);

    setSelectedChallenge(null);
    fetchData();
  }

  const currentPoints = challenges
    .filter(c => c.is_completed)
    .reduce((sum, c) => sum + (c.points || 0), 0);

  const progressPercentage = targetPoints > 0 
    ? Math.min((currentPoints / targetPoints) * 100, 100) 
    : 0;

  const filteredChallenges = challenges.filter(c => {
    if (filter === "pending") return !c.is_completed;
    if (filter === "completed") return c.is_completed;
    return true;
  });

  if (loading) return (
    <div className="min-h-screen bg-purple-900 flex items-center justify-center text-white font-bold uppercase animate-pulse">
      Sincronizzazione...
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-fuchsia-800 to-pink-700 text-white p-4 md:p-8 pb-20 print:bg-white print:text-black print:p-0">
      <div className="max-w-4xl mx-auto">
        
        {/* PROGRESS BAR (Nascosta in stampa) */}
        <div className="bg-white/10 p-6 rounded-3xl border border-white/20 mb-8 sticky top-4 z-20 backdrop-blur-md shadow-2xl print:hidden">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            <div className="text-center md:text-left">
              <p className="text-sm uppercase font-bold opacity-70 tracking-widest text-pink-200">Progresso Matrimonio</p>
              <p className="text-3xl font-black text-yellow-400">
                {currentPoints} <span className="text-xl text-white/50">/ {targetPoints} PT</span>
              </p>
            </div>
            <p className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full mt-2 md:mt-0">{Math.round(progressPercentage)}% Completato</p>
          </div>
          <div className="w-full bg-black/30 h-4 rounded-full overflow-hidden border border-white/10">
            <div 
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-1000"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* FILTRI E TASTO REPORT (Nascosti in stampa) */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 print:hidden">
          {['all', 'pending', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                filter === f ? 'bg-yellow-400 text-purple-900 scale-110 shadow-lg' : 'bg-white/10 text-white border border-white/20'
              }`}
            >
              {f === 'all' ? 'Tutte' : f === 'pending' ? 'Da fare' : 'Fatte'}
            </button>
          ))}
          
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest bg-green-500 text-white shadow-lg hover:bg-green-400 transition-all ml-2"
          >
            📄 Scarica Report PDF
          </button>
        </div>

        {/* INTESTAZIONE SOLO PER STAMPA */}
        <div className="hidden print:block text-center mb-10 border-b-2 border-black pb-4 text-black">
          <h1 className="text-4xl font-black uppercase">Report Sfide Matrimonio</h1>
          <p className="text-xl">Simone ha totalizzato {currentPoints} punti!</p>
        </div>

        {/* GRID DELLE SFIDE (Nascosta in stampa) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
          {filteredChallenges.map((challenge) => (
            <div 
              key={challenge.id} 
              onClick={() => setSelectedChallenge(challenge)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all hover:translate-y-[-2px] active:scale-95 shadow-xl flex flex-col justify-between h-32 ${
                challenge.is_completed 
                ? 'bg-green-600/20 border-green-400/30 opacity-80' 
                : 'bg-white/10 border-white/20 hover:border-yellow-400/50'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-yellow-400 text-purple-900 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                    {challenge.points} PT
                  </span>
                  {challenge.is_completed && <span className="text-green-400 text-sm">✅</span>}
                </div>
                <h2 className="text-lg font-bold uppercase leading-tight tracking-tight truncate">
                  {challenge.title}
                </h2>
              </div>
              <p className="text-[10px] opacity-40 font-bold text-right uppercase tracking-widest">Dettagli →</p>
            </div>
          ))}
        </div>

        {/* POP-UP (Nascosto in stampa) */}
        {selectedChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedChallenge(null)}></div>
            <div className="bg-purple-950 border-2 border-white/20 w-full max-w-lg rounded-3xl p-6 relative z-10 shadow-2xl">
              <button onClick={() => setSelectedChallenge(null)} className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl">✕</button>
              
              <h2 className="text-2xl font-black text-yellow-400 uppercase mb-2">{selectedChallenge.title}</h2>
              <p className="text-sm opacity-80 mb-6">{selectedChallenge.descriptions}</p>

              {selectedChallenge.is_completed ? (
                <div className="space-y-4">
                  <img src={selectedChallenge.media_url} className="w-full aspect-video object-cover rounded-2xl shadow-lg" alt="Prova" />
                  {selectedChallenge.caption && <p className="italic text-center text-pink-200">"{selectedChallenge.caption}"</p>}
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => downloadPhoto(selectedChallenge.media_url, selectedChallenge.title)}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold uppercase text-[10px]"
                    >💾 Scarica Foto</button>
                    <button 
                      onClick={() => handleDelete(selectedChallenge.id, selectedChallenge.media_url)} 
                      className="flex-1 bg-red-600/20 text-red-400 py-3 rounded-xl border border-red-600/30 font-bold uppercase text-[10px]"
                    >🗑️ Elimina</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Scrivi una didascalia..." 
                    className="w-full bg-black/40 border border-white/20 p-4 rounded-2xl text-white outline-none focus:border-yellow-400"
                    onChange={(e) => setCaption(e.target.value)}
                    value={caption}
                  />
                  <label className="block w-full bg-yellow-400 text-purple-900 text-center py-5 rounded-2xl font-black cursor-pointer uppercase tracking-widest active:scale-95 transition-transform">
                    📸 Carica Prova
                    <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, selectedChallenge.id)} />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GALLERIA DEI RICORDI (Si trasforma in Report in stampa) */}
        <div className="mt-20 print:mt-0">
          <h2 className="text-3xl font-black uppercase italic text-center mb-8 text-yellow-400 print:hidden">📸 Galleria Ricordi</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-1 print:gap-10">
            {challenges.filter(c => c.is_completed).map((completed) => (
              <div 
                key={`gallery-${completed.id}`} 
                className="group relative rounded-xl overflow-hidden border border-white/10 aspect-square bg-black cursor-pointer print:aspect-auto print:border-none print:bg-white print:text-black"
              >
                <img 
                  src={completed.media_url} 
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity print:opacity-100 print:rounded-2xl print:max-h-[400px] print:object-contain" 
                  alt="Ricordo" 
                />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black text-[8px] uppercase font-bold truncate print:relative print:bg-none print:text-lg print:from-transparent print:mt-4 print:text-center print:whitespace-normal">
                   <span className="print:block print:text-2xl print:font-black">{completed.title}</span>
                   {completed.caption && <p className="italic opacity-70 print:mt-2">"{completed.caption}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-16 text-center print:hidden">
           <Link href="/" className="text-white/30 hover:text-white underline text-xs tracking-widest uppercase">
             ← Torna alla Home
           </Link>
        </div>
      </div>
    </main>
  );
}

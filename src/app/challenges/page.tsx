"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from 'next/link';

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [targetPoints, setTargetPoints] = useState(1000); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    // 1. Carica le Sfide
    const { data: challengesData } = await supabase
      .from("Challenges")
      .select("*")
      .order('id', { ascending: true });

    // 2. Carica il Target dalla tabella Settings
    const { data: settingsData } = await supabase
      .from("Settings")
      .select("target_points")
      .maybeSingle();

    if (challengesData) setChallenges(challengesData);
    if (settingsData?.target_points) setTargetPoints(settingsData.target_points);
    
    setLoading(false);
  }

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
      .update({ media_url: publicUrl, is_completed: true })
      .eq('id', challengeId);

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
      .update({ media_url: null, is_completed: false })
      .eq('id', challengeId);

    fetchData();
  }

  const currentPoints = challenges
    .filter(c => c.is_completed)
    .reduce((sum, c) => sum + (c.points || 0), 0);

  const progressPercentage = targetPoints > 0 
    ? Math.min((currentPoints / targetPoints) * 100, 100) 
    : 0;

  if (loading) return (
    <div className="min-h-screen bg-purple-900 flex items-center justify-center text-white font-bold">
      Sincronizzazione in corso...
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-fuchsia-800 to-pink-700 text-white p-4 md:p-8 pb-20">
      <div className="max-w-4xl mx-auto">
        
        {/* PROGRESS BAR */}
        <div className="bg-white/10 p-6 rounded-3xl border border-white/20 mb-8 sticky top-4 z-20 backdrop-blur-md shadow-2xl">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm uppercase font-bold opacity-70 tracking-widest text-pink-200">Obiettivo Simone</p>
              <p className="text-3xl font-black text-yellow-400">
                {currentPoints} <span className="text-xl text-white/50">/ {targetPoints} PT</span>
              </p>
            </div>
            <p className="text-xs font-bold bg-white/20 px-2 py-1 rounded">{Math.round(progressPercentage)}%</p>
          </div>
          <div className="w-full bg-black/30 h-4 rounded-full overflow-hidden border border-white/10">
            <div 
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-1000"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="grid gap-6">
          
          {/* MESSAGGIO DI VITTORIA */}
          {progressPercentage === 100 && (
            <div className="bg-yellow-400 text-purple-900 p-8 rounded-3xl mb-4 text-center border-4 border-white animate-bounce shadow-2xl">
              <h2 className="text-4xl font-black uppercase italic">🏆 SEI UN GRANDE!</h2>
              <p className="font-bold text-xl mt-2">Simone ha vinto tutto! Ora sei pronto per il matrimonio! (forse) 🍾</p>
            </div>
          )}

          {challenges.map((challenge) => {
            // Verifica se il file caricato è un video
            const isVideo = challenge.media_url?.toLowerCase().match(/\.(mp4|mov|webm|quicktime)$/);

            return (
              <div 
                key={challenge.id} 
                className={`p-6 rounded-2xl border transition-all duration-500 ${
                  challenge.is_completed 
                  ? 'bg-green-600/30 border-green-400/50 scale-[0.98]' 
                  : 'bg-white/10 border-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h2 className={`text-2xl font-bold uppercase leading-tight ${challenge.is_completed ? 'text-green-300' : 'text-yellow-300'}`}>
                      {challenge.title}
                    </h2>
                    <p className="opacity-90 mt-1 text-sm">{challenge.descriptions}</p>
                  </div>
                  <span className="ml-4 bg-yellow-400 text-purple-900 px-3 py-1 rounded-full font-black text-xs shadow-lg">
                    {challenge.points} PT
                  </span>
                </div>

                {challenge.is_completed ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl overflow-hidden border-2 border-green-400/30 bg-black/40 shadow-lg">
                       {isVideo ? (
                         <video src={challenge.media_url} controls className="w-full h-56 object-cover" />
                       ) : (
                         <img src={challenge.media_url} alt="Prova" className="w-full h-56 object-cover" />
                       )}
                    </div>
                    <button 
                      onClick={() => handleDelete(challenge.id, challenge.media_url)}
                      className="w-full bg-red-500/10 hover:bg-red-500/30 text-red-200 text-[10px] py-2 rounded-lg border border-red-500/30 transition-all uppercase font-bold tracking-tighter"
                    >
                      🗑️ Errore? Elimina e rifai la sfida
                    </button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <label className="block w-full bg-white text-purple-900 text-center py-4 rounded-xl font-black cursor-pointer hover:bg-yellow-400 active:scale-95 transition-all shadow-xl uppercase tracking-widest">
                      📸 Carica Prova
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        capture="environment" 
                        className="hidden" 
                        onChange={(e) => handleUpload(e, challenge.id)} 
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-16 text-center">
           <Link href="/" className="text-white/30 hover:text-white underline text-xs transition-opacity tracking-widest uppercase">
             ← Torna alla Home
           </Link>
        </div>
      </div>
    </main>
  );
}

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-fuchsia-800 to-pink-700 flex flex-col items-center justify-center text-white p-4 text-center">
      <div className="space-y-8">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter drop-shadow-lg">
          ADDIO AL CELIBATO <br/> 
          <span className="text-yellow-400 italic">SIMONE</span>
        </h1>
        
        <p className="text-xl opacity-90 font-medium">Benvenuti nella Centrale Operativa delle Sfide</p>
        
        {/* Usiamo Link con lo stile del bottone direttamente */}
        <Link 
          href="/challenges" 
          className="inline-block bg-white text-purple-900 px-10 py-5 rounded-full text-2xl font-black hover:scale-110 transition-transform shadow-2xl mt-8 cursor-pointer"
        >
          ENTRA NELLE SFIDE 🕺
        </Link>

        <div className="pt-10">
          <span className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full border border-green-500/50 text-sm font-bold animate-pulse">
            ● DATABASE CONNESSO
          </span>
        </div>
      </div>
    </main>
  );
}

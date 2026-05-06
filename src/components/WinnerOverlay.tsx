import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Gift } from 'lucide-react';

interface Winner {
  id: string;
  subject: string;
  bill_no: string;
  gift_name: string;
}

export default function WinnerOverlay() {
  const { userId } = useParams<{ userId: string }>();
  const [winners, setWinners] = useState<Winner[]>([]);

  useEffect(() => {
    async function fetchWinners() {
      try {
        console.log("Fetching winners for:", userId || "all users");
        let query = supabase
          .from('winners')
          .select('*')
          .eq('is_visible', true)
          .order('created_at', { ascending: false });
        
        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        console.log("Winners fetched:", data?.length);
        setWinners(data || []);
      } catch (err) {
        console.error("Winner Overlay Error:", err);
      }
    }

    fetchWinners();

    const channel = supabase
      .channel('winners_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'winners' },
        () => fetchWinners()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (winners.length === 0) {
    return <div className="w-screen h-screen bg-transparent" />;
  }

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden p-12 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-4xl space-y-6">
        <AnimatePresence>
          {winners.map((winner, index) => (
            <motion.div
              key={winner.id}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
              className="bg-slate-950/90 backdrop-blur-xl border-l-[8px] border-amber-500 p-8 shadow-2xl flex items-center gap-8 relative overflow-hidden group"
            >
              {/* Decorative background trophy icon */}
              <Trophy className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
              
              <div className="p-4 bg-amber-500/10 rounded-full shrink-0">
                <Trophy className="w-12 h-12 text-amber-500" />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] bg-amber-500/10 px-3 py-1 rounded-full">
                    {winner.subject}
                  </span>
                </div>
                <h2 className="text-white text-4xl font-black tracking-tight leading-none uppercase italic">
                   <span className="text-amber-400 not-italic uppercase tracking-normal">Bill No: {winner.bill_no}</span>
                </h2>
                <div className="flex items-center gap-4 text-white/60">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-500/50" />
                    <span className="text-xl font-medium tracking-wide uppercase">Gift: {winner.gift_name}</span>
                  </div>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <p className="text-white/20 text-6xl font-black italic select-none">#{(winners.length - index).toString().padStart(2, '0')}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface TickerItem {
  id: string;
  top_message: string;
  bottom_message: string;
  branch_name: string;
}

export default function BranchTickerOverlay() {
  const { userId } = useParams<{ userId: string }>();
  const [items, setItems] = useState<TickerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    async function fetchItems() {
      let query = supabase
        .from('branch_ticker')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data } = await query;
      setItems(data || []);
    }

    fetchItems();

    const channel = supabase
      .channel('branch_ticker_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branch_ticker' },
        () => fetchItems()
      )
      .subscribe();

    const timer = setInterval(() => setTime(new Date()), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [userId]);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 10000); // Rotate every 10 seconds
    return () => clearInterval(interval);
  }, [items]);

  const currentItem = items[currentIndex];

  if (!currentItem) {
    return <div className="w-screen h-screen bg-transparent" />;
  }

  return (
    <div className="w-screen h-screen bg-transparent font-sans overflow-hidden relative flex flex-col justify-end">
      {/* Ticker Container */}
      <div className="w-full flex flex-col shadow-2xl">
        
        {/* Top Ticker Line (Green) */}
        <div className="h-12 bg-[#00a651] flex items-center overflow-hidden border-b border-white/10">
          <div className="w-40 bg-[#004a99] h-full flex items-center justify-center shrink-0 border-r border-[#00a651] z-20">
             <span className="text-white font-black text-xl tracking-tighter italic">নোটিশ</span>
          </div>
          <div className="flex-1 px-6 overflow-hidden relative h-full flex items-center">
             <AnimatePresence mode="wait">
                <motion.div
                  key={`top-${currentItem.id}`}
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="whitespace-nowrap text-white font-black text-2xl tracking-tight"
                >
                  {currentItem.top_message}
                </motion.div>
             </AnimatePresence>
          </div>
        </div>

        {/* Bottom Ticker Line (Blue) */}
        <div className="h-12 bg-[#004a99] flex items-center overflow-hidden">
          <div className="w-40 bg-[#00a651] h-full flex items-center justify-center shrink-0 border-r border-[#004a99] z-20">
             <span className="text-white font-bold text-sm tracking-tight text-center px-1 break-words leading-tight">
                {currentItem.branch_name}
             </span>
          </div>
          
          <div className="flex-1 px-6 overflow-hidden relative h-full flex items-center">
             <AnimatePresence mode="wait">
                <motion.div
                  key={`bottom-${currentItem.id}`}
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="whitespace-nowrap text-white font-medium text-lg tracking-tight"
                >
                  {currentItem.bottom_message}
                </motion.div>
             </AnimatePresence>
          </div>

          {/* Clock Section */}
          <div className="w-32 bg-[#ffc107] h-full flex items-center justify-center shrink-0 z-20">
            <span className="text-slate-900 font-black text-xl">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

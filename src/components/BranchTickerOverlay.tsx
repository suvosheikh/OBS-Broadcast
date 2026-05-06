import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface TickerItem {
  id: string;
  type: 'notice' | 'branch';
  top_message: string;
  bottom_message: string;
  branch_name: string;
}

export default function BranchTickerOverlay() {
  const { userId } = useParams<{ userId: string }>();
  const [notices, setNotices] = useState<TickerItem[]>([]);
  const [branches, setBranches] = useState<TickerItem[]>([]);
  const [noticeIndex, setNoticeIndex] = useState(0);
  const [branchIndex, setBranchIndex] = useState(0);
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
      const allItems = (data || []) as TickerItem[];
      setNotices(allItems.filter(i => i.type === 'notice'));
      setBranches(allItems.filter(i => i.type === 'branch' || !i.type));
    }

    fetchItems();

    const channel = supabase
      .channel('branch_ticker_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branch_ticker' },
        (payload) => {
          console.log("Realtime update received:", payload);
          fetchItems();
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    const timer = setInterval(() => setTime(new Date()), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [userId]);

  useEffect(() => {
    if (notices.length <= 1) return;
    const interval = setInterval(() => {
      setNoticeIndex((prev) => (prev + 1) % notices.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [notices]);

  useEffect(() => {
    if (branches.length <= 1) return;
    const interval = setInterval(() => {
      setBranchIndex((prev) => (prev + 1) % branches.length);
    }, 12000); // Slightly different timing for visual interest
    return () => clearInterval(interval);
  }, [branches]);

  const currentNotice = notices[noticeIndex];
  const currentBranch = branches[branchIndex];

  if (!currentNotice && !currentBranch) {
    return <div className="w-screen h-screen bg-transparent" />;
  }

  return (
    <div className="w-screen h-screen bg-transparent font-sans overflow-hidden relative flex flex-col justify-end">
      {/* Ticker Container */}
      <div className="w-full flex flex-col shadow-2xl">
        
        {/* Top Ticker Line (Green) - Notice */}
        <AnimatePresence mode="wait">
          {currentNotice && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 48, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#00a651] flex items-center overflow-hidden border-b border-white/10"
            >
              <div className="w-40 bg-[#004a99] h-full flex items-center justify-center shrink-0 border-r border-[#00a651] z-20">
                 <span className="text-white font-black text-xl tracking-tighter italic">নোটিশ</span>
              </div>
              <div className="flex-1 px-6 overflow-hidden relative h-full flex items-center">
                 <AnimatePresence mode="wait">
                    <motion.div
                      key={`notice-${currentNotice.id}`}
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '-100%' }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className="whitespace-nowrap text-white font-black text-2xl tracking-tight"
                    >
                      {currentNotice.top_message}
                    </motion.div>
                 </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Ticker Line (Blue) - Branch */}
        <AnimatePresence mode="wait">
          {currentBranch && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 48, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#004a99] flex items-center overflow-hidden"
            >
              <div className="w-40 bg-[#00a651] h-full flex items-center justify-center shrink-0 border-r border-[#004a99] z-20">
                 <span className="text-white font-bold text-sm tracking-tight text-center px-1 break-words leading-tight">
                    {currentBranch.branch_name}
                 </span>
              </div>
              
              <div className="flex-1 px-6 overflow-hidden relative h-full flex items-center">
                 <AnimatePresence mode="wait">
                    <motion.div
                      key={`branch-${currentBranch.id}`}
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '-100%' }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className="whitespace-nowrap text-white font-medium text-lg tracking-tight"
                    >
                      {currentBranch.bottom_message}
                    </motion.div>
                 </AnimatePresence>
              </div>

              {/* Clock Section */}
              <div className="w-32 bg-[#ffc107] h-full flex items-center justify-center shrink-0 z-20">
                <span className="text-slate-900 font-black text-xl">
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

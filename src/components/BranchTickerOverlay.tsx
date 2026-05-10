import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface TickerItem {
  id: string;
  type: 'notice' | 'branch' | 'branch_address' | string;
  top_message: string;
  bottom_message: string;
  branch_name: string;
  phone_number?: string;
  sort_order?: number;
}

const TypewritingText = ({ text, speed = 30 }: { text: string; speed?: number }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <>{displayedText}</>;
};

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
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching branch ticker items:", error);
        return;
      }
      const allItems = (data || []) as TickerItem[];
      console.log("Fetched items:", allItems);
      setNotices(allItems.filter(i => i.type === 'notice'));
      setBranches(allItems.filter(i => i.type === 'branch' || i.type === 'branch_address' || !i.type));
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
    <div className="w-full h-screen bg-transparent font-sans overflow-hidden relative flex flex-col justify-end">
      {/* Ticker Container */}
      <div className="w-full flex flex-col shadow-2xl">
        
        {/* Top Ticker Line (Green) - Notice */}
        <AnimatePresence mode="wait">
          {currentNotice && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'max(90px, 8vh)', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#00a651] flex items-center overflow-hidden border-b border-white/10"
            >
              <div className="w-[12%] bg-[#004a99] h-full flex items-center justify-center shrink-0 border-r border-[#00a651] z-20">
                 <span className="text-white font-black text-[max(2.5vw,24px)] tracking-tighter italic font-bangla">নোটিশ</span>
              </div>
              <div className="flex-1 px-10 overflow-hidden relative h-full flex items-center">
                 <AnimatePresence mode="wait">
                    <motion.div
                      key={`notice-${currentNotice.id}`}
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '-100%' }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className="whitespace-nowrap text-white font-black text-[max(3vw,32px)] tracking-tight font-bangla"
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
              animate={{ height: 'max(90px, 8vh)', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#004a99] flex items-center overflow-hidden"
            >
              <div className="w-[12%] bg-[#00a651] h-full flex items-center justify-center shrink-0 border-r border-[#004a99] z-20 relative overflow-hidden">
                 <AnimatePresence mode="wait">
                   <motion.span 
                     key={`branch-name-${currentBranch.id}`}
                     initial={{ y: '100%' }}
                     animate={{ y: 0 }}
                     exit={{ y: '-100%' }}
                     transition={{ duration: 0.5, ease: "easeOut" }}
                     className="absolute text-white font-bold text-[max(1.2vw,14px)] tracking-tight text-center px-4 break-words leading-tight font-bangla"
                   >
                      {currentBranch.branch_name}
                   </motion.span>
                 </AnimatePresence>
              </div>
              
              <div className="flex-1 px-10 overflow-hidden relative h-full flex items-center">
                 <AnimatePresence mode="wait">
                    <motion.div
                      key={`branch-${currentBranch.id}`}
                      initial={{ opacity: 1, x: 0 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ x: '-100%', opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className="flex items-center gap-6 whitespace-nowrap text-white"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-[max(2.2vw,24px)] tracking-tight font-bangla">
                          <TypewritingText 
                            text={(() => {
                              const addr = currentBranch.bottom_message;
                              const phone = currentBranch.phone_number;
                              const combined = `${addr}${phone ? ` - ${phone}` : ''}`;
                              return combined.length > 80 ? combined.substring(0, 80) + '...' : combined;
                            })()} 
                          />
                        </span>
                      </div>
                    </motion.div>
                 </AnimatePresence>
              </div>

              {/* Clock Section with Scrolling Animation */}
              <div className="bg-[#ffc107] h-full flex items-center justify-center shrink-0 z-20 px-4 overflow-hidden min-w-[12%]">
                <div className="flex items-center text-slate-900 font-black text-[max(1.8vw,16px)] tracking-tighter whitespace-nowrap">
                   {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).split('').map((char, i) => (
                     <div key={i} className="relative h-[max(2.5vw,24px)] w-[0.75em] flex justify-center overflow-hidden">
                        <AnimatePresence mode="popLayout">
                           <motion.span
                             key={`${char}-${i}`}
                             initial={{ y: '100%' }}
                             animate={{ y: 0 }}
                             exit={{ y: '-100%' }}
                             transition={{ 
                               duration: 0.4, 
                               ease: [0.23, 1, 0.32, 1] 
                             }}
                             className="absolute"
                           >
                             {char}
                           </motion.span>
                        </AnimatePresence>
                     </div>
                   ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

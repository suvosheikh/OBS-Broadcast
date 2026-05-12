import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Square } from 'lucide-react';

interface TickerItem {
  id: string;
  type: 'notice' | 'branch' | 'branch_address' | string;
  top_message: string;
  bottom_message: string;
  branch_name: string;
  phone_number?: string;
  sort_order?: number;
  display_duration?: number;
}

const TypewritingText = ({ text, speed = 30, delay = 0, onComplete }: { text: string; speed?: number; delay?: number; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let timeout: any;
    let interval: any;
    
    setDisplayedText('');
    timeout = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          if (onComplete) onComplete();
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, speed, delay, onComplete]);

  return <>{displayedText}</>;
};

const Marquee = ({ children, isVisible, textLength, branchId }: { children: React.ReactNode; isVisible: boolean; textLength: number; branchId: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    // Reset state on branch change
    setShouldScroll(false);
    setScrollWidth(0);

    const delay = (textLength * 30) + 1500; 
    
    const timer = setTimeout(() => {
      if (containerRef.current && contentRef.current && isVisible) {
        const containerWidth = containerRef.current.offsetWidth;
        const contentWidth = contentRef.current.scrollWidth;
        
        // Trigger scrolling only if text overflows container
        if (contentWidth > containerWidth - 20) {
          setShouldScroll(true);
          setScrollWidth(Math.max(contentWidth - containerWidth + 80, 100)); 
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [branchId, isVisible, textLength]);

  return (
    <div ref={containerRef} className="flex-1 h-full overflow-hidden flex items-center px-10 relative">
      <motion.div
        key={branchId}
        ref={contentRef}
        animate={shouldScroll ? { x: [0, -scrollWidth] } : { x: 0 }}
        transition={shouldScroll ? {
          duration: Math.max(8, scrollWidth / 40),
          repeat: Infinity,
          repeatType: "mirror", // Goes back and forth smoothly
          repeatDelay: 3,
          ease: "easeInOut"
        } : { duration: 0 }}
        className="flex items-center gap-4 whitespace-nowrap min-w-full"
      >
        {children}
      </motion.div>
    </div>
  );
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
    const duration = (notices[noticeIndex]?.display_duration || 10) * 1000;
    const timer = setTimeout(() => {
      setNoticeIndex((prev) => (prev + 1) % notices.length);
    }, duration);
    return () => clearTimeout(timer);
  }, [notices, noticeIndex]);

  useEffect(() => {
    if (branches.length <= 1) return;
    const duration = (branches[branchIndex]?.display_duration || 12) * 1000;
    const timer = setTimeout(() => {
      setBranchIndex((prev) => (prev + 1) % branches.length);
    }, duration);
    return () => clearTimeout(timer);
  }, [branches, branchIndex]);

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
              animate={{ height: 'max(60px, 6vh)', opacity: 1 }}
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
              animate={{ height: 'max(60px, 6vh)', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#004a99] flex items-center overflow-hidden"
            >
              <div className="w-[12%] bg-[#00a651] h-full flex items-center justify-center shrink-0 border-r border-[#004a99] z-20 relative overflow-hidden">
                 <AnimatePresence mode="wait">
                   <motion.div 
                     key={`branch-name-${currentBranch.id}`}
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.8, opacity: 0 }}
                     transition={{ duration: 0.5, ease: "easeOut" }}
                     className="absolute text-white font-bold tracking-tight text-center px-1 leading-[1.1] font-bangla w-full h-full flex items-center justify-center break-words"
                     style={{ 
                       fontSize: currentBranch.branch_name.length > 30
                         ? 'clamp(12px, 1.0vw, 16px)'
                         : currentBranch.branch_name.length > 22
                           ? 'clamp(14px, 1.4vw, 22px)'
                           : currentBranch.branch_name.length > 15
                             ? 'clamp(15px, 1.8vw, 26px)'
                             : 'clamp(16px, 2.2vw, 30px)' 
                      }}
                   >
                      {currentBranch.branch_name}
                   </motion.div>
                 </AnimatePresence>
              </div>
              
              <Marquee 
                isVisible={!!currentBranch} 
                branchId={currentBranch.id}
                textLength={currentBranch.bottom_message.length + (currentBranch.phone_number?.length || 0)}
              >
                 <div 
                  className="font-medium tracking-tight font-bangla flex items-center gap-4 text-white"
                  style={{ 
                    fontSize: 'clamp(16px, 2.2vw, 30px)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <TypewritingText text={currentBranch.bottom_message} />
                  {currentBranch.phone_number && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (currentBranch.bottom_message.length * 30 / 1000) + 0.2 }}
                      >
                        <Square className="w-[0.4em] h-[0.4em] fill-white text-white" />
                      </motion.div>
                      <TypewritingText 
                        text={currentBranch.phone_number}
                        delay={(currentBranch.bottom_message.length * 30) + 200}
                      />
                    </>
                  )}
                </div>
              </Marquee>

              {/* Clock Section with Scrolling Animation */}
              <div className="bg-[#ffc107] h-full flex items-center justify-center shrink-0 z-20 px-2 overflow-hidden min-w-[10%]">
                <div className="flex items-center text-slate-900 font-black text-[max(1.8vw,16px)] tracking-tighter whitespace-nowrap">
                   {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).split('').map((char, i) => (
                     <div key={i} className={`relative h-[max(2.5vw,24px)] flex justify-center overflow-hidden ${char === ' ' || char === '\u00A0' ? 'w-[0.3em]' : 'w-[0.75em]'}`}>
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

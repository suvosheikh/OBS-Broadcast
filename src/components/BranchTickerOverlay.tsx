import React, { useEffect, useState, useRef } from 'react';
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

const Marquee = ({ children, isVisible, textLength, id }: { children: React.ReactNode; isVisible: boolean; textLength: number; id: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    // Reset state on content change
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
  }, [id, isVisible, textLength]);

  return (
    <div ref={containerRef} className="flex-1 h-full overflow-hidden flex items-center px-4 relative">
      <motion.div
        key={id}
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
  const [globalSettings, setGlobalSettings] = useState({
    notice_section_enabled: true,
    branch_section_enabled: true
  });

  useEffect(() => {
    async function fetchSettings() {
      if (!userId) return;
      
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setGlobalSettings({
          notice_section_enabled: data.notice_section_enabled,
          branch_section_enabled: data.branch_section_enabled
        });
      }
    }

    async function fetchItems() {
      if (!userId) return;
      
      const { data, error } = await supabase
        .from('branch_ticker')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching branch ticker items:", error);
        return;
      }
      
      const allItems = (data || []) as TickerItem[];
      const activeNotices = allItems.filter(i => i.type === 'notice' && i.is_active);
      const activeBranches = allItems.filter(i => (i.type === 'branch' || i.type === 'branch_address' || !i.type) && i.is_active);
      
      setNotices(activeNotices);
      setBranches(activeBranches);
    }

    fetchSettings();
    fetchItems();

    const tickerChannel = supabase
      .channel(`ticker_changes_${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'branch_ticker',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel(`settings_changes_${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'settings',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log("Settings changed:", payload);
          if (payload.new) {
            const newSettings = payload.new as any;
            setGlobalSettings({
              notice_section_enabled: newSettings.notice_section_enabled,
              branch_section_enabled: newSettings.branch_section_enabled
            });
            // Force re-fetch items to ensure indices are correct if something was disabled
            fetchItems();
          }
        }
      )
      .subscribe();

    const timer = setInterval(() => setTime(new Date()), 1000);

    return () => {
      supabase.removeChannel(tickerChannel);
      supabase.removeChannel(settingsChannel);
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

  // Only show if at least one section is enabled AND there's content for it
  const showNoticeLine = globalSettings.notice_section_enabled && (notices.length > 0);
  const showBranchLine = globalSettings.branch_section_enabled && (branches.length > 0);

  const currentNotice = notices.length > 0 ? notices[noticeIndex % notices.length] : null;
  const currentBranch = branches.length > 0 ? branches[branchIndex % branches.length] : null;

  if (!showNoticeLine && !showBranchLine) {
    return <div className="w-screen h-screen bg-transparent" />;
  }

  return (
    <div className="w-full h-screen bg-transparent font-sans overflow-hidden relative flex flex-col justify-end">
      {/* Ticker Container */}
      <div className="w-full flex flex-col shadow-2xl">
        
        {/* Top Ticker Line (Green) - Notice */}
        <AnimatePresence>
          {showNoticeLine && (
            <motion.div 
              key="notice-row-container"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'max(60px, 6vh)', opacity: 1 }}
              exit={{ height: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-[#00a651] flex items-center overflow-hidden border-b border-white/10"
            >
              <div className="w-[12%] bg-[#004a99] h-full flex items-center justify-center shrink-0 border-r border-[#00a651] z-20 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key="notice-header-text"
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '-100%', opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute text-white font-bold tracking-tight text-center px-1 leading-[1.2] font-bangla w-full h-full flex items-center justify-center break-words"
                    style={{ 
                      fontSize: 'clamp(22px, 2.6vw, 34px)'
                    }}
                  >
                    নোটিশ
                  </motion.div>
                </AnimatePresence>
              </div>
              <Marquee 
                isVisible={!!currentNotice} 
                id={currentNotice?.id || 'no-notice'}
                textLength={currentNotice?.top_message.length || 0}
              >
                <div 
                  className="font-medium tracking-tight font-bangla flex items-center gap-4 text-white"
                  style={{ 
                    fontSize: 'clamp(16px, 2.2vw, 30px)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <TypewritingText text={currentNotice?.top_message || ''} />
                </div>
              </Marquee>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Ticker Line (Blue) - Branch */}
        <AnimatePresence>
          {showBranchLine && (
            <motion.div 
              key="branch-row-container"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'max(60px, 6vh)', opacity: 1 }}
              exit={{ height: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-[#004a99] flex items-center overflow-hidden"
            >
              <div className="w-[12%] bg-[#00a651] h-full flex items-center justify-center shrink-0 border-r border-[#004a99] z-20 relative overflow-hidden">
                 <AnimatePresence mode="popLayout">
                   <motion.div 
                     key={currentBranch.id}
                     initial={{ x: '-100%', opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     exit={{ x: '100%', opacity: 0 }}
                     transition={{ duration: 0.5, ease: "easeInOut" }}
                     className="absolute text-white font-bold tracking-tight text-center px-1 leading-[1.1] font-bangla w-full h-full flex items-center justify-center break-words"
                      style={{ 
                        fontSize: 'clamp(22px, 2.6vw, 34px)'
                      }}
                    >
                      {currentBranch.branch_name}
                   </motion.div>
                 </AnimatePresence>
              </div>
              
              <Marquee 
                isVisible={!!currentBranch} 
                id={currentBranch?.id || 'no-branch'}
                textLength={(currentBranch?.bottom_message?.length || 0) + (currentBranch?.phone_number?.length || 0)}
              >
                 <div 
                  className="font-medium tracking-tight font-bangla flex items-center gap-4 text-white"
                  style={{ 
                    fontSize: 'clamp(16px, 2.2vw, 30px)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <TypewritingText text={currentBranch.bottom_message} delay={600} />
                  {currentBranch.phone_number && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (currentBranch.bottom_message.length * 30 / 1000) + 0.8 }}
                      >
                        <Square className="w-[0.4em] h-[0.4em] fill-white text-white" />
                      </motion.div>
                      <TypewritingText 
                        text={currentBranch.phone_number}
                        delay={(currentBranch.bottom_message.length * 30) + 800}
                      />
                    </>
                  )}
                </div>
              </Marquee>

              {/* Clock Section with Scrolling Animation */}
              <div className="bg-[#ffc107] h-full flex items-center justify-center shrink-0 z-20 px-3 overflow-hidden min-w-fit">
                <div className="flex items-center text-slate-900 font-black text-[max(1.8vw,16px)] tracking-tighter whitespace-nowrap">
                   {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase().split('').map((char, i) => (
                     <div key={i} className={`relative h-[max(2.5vw,24px)] flex justify-center overflow-hidden ${char === ' ' || char === '\u00A0' ? 'w-[0.2em]' : (char === ':' ? 'w-[0.3em]' : (char === 'M' || char === 'W' ? 'w-[0.85em]' : 'w-[0.65em]'))}`}>
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

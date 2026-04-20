import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  product_name: string;
  sku: string;
  price: string;
  discount: string;
  product_short_description: string;
  branch_name: string;
  branch_location: string;
}

export default function Overlay() {
  const { userId } = useParams<{ userId: string }>();
  const [activeToast, setActiveToast] = useState<Product | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Listen to real-time broadcast events
    const channel = supabase
      .channel('obs_alerts')
      .on(
        'broadcast',
        { event: 'new_toast' },
        (payload) => {
          // Only show if it belongs to this overlay's user
          if (payload.payload.user_id === userId) {
            triggerToast(payload.payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  function triggerToast(data: Product) {
    setActiveToast(data);
    // Auto-hide after 10 seconds (standard for product display)
    setTimeout(() => {
      setActiveToast(null);
    }, 10000);
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent pointer-events-none relative flex flex-col justify-end p-24 items-start">
      <AnimatePresence>
        {activeToast && (
          <motion.div
            key="active-toast"
            initial={{ opacity: 0, x: -100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.9, transition: { duration: 0.8 } }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="relative"
          >
            {/* Visual Container */}
            <div className="flex flex-col group">
              <div className="bg-slate-950/95 border-l-[6px] border-blue-600 px-10 py-7 shadow-[0_25px_80px_rgba(0,0,0,0.6)] min-w-[300px] max-w-[90vw] md:min-w-[550px] relative overflow-hidden backdrop-blur-md">
                {/* Subtle Background Accent */}
                <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                  <div className="w-32 h-32 border-4 border-white rotate-45" />
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-stretch gap-10">
                  <div className="flex-1 min-w-0">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h2 className="text-white font-serif italic text-4xl md:text-5xl leading-tight mb-2 tracking-tight">
                        {activeToast.product_name}
                      </h2>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-3 mb-6"
                    >
                      <span className="text-white text-[9px] uppercase tracking-[0.4em] font-black bg-white/10 px-2 py-0.5 rounded">SKU</span>
                      <span className="text-white text-[10px] font-mono tracking-widest">{activeToast.sku}</span>
                    </motion.div>

                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: 60 }}
                      transition={{ delay: 0.6, duration: 0.8 }}
                      className="h-[2px] bg-blue-600 mb-6" 
                    />

                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 0.8, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="text-white text-[11px] md:text-xs uppercase tracking-[0.15em] max-w-[350px] leading-relaxed font-medium"
                    >
                      {activeToast.product_short_description || "System Transmission Operational"}
                    </motion.p>
                  </div>

                  <div className="text-right flex flex-col justify-between items-end gap-6 self-stretch border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-10">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 }}
                    >
                      {activeToast.discount && (
                        <p className="text-red-500/80 line-through text-xs font-bold font-mono tracking-tighter mb-1">
                          {activeToast.price} BDT
                        </p>
                      )}
                      <p className="text-white text-3xl md:text-5xl font-light tracking-tighter flex items-end justify-end">
                        <span className="text-blue-500 font-black text-lg md:text-2xl mr-2">৳</span>
                        {activeToast.discount ? (parseFloat(activeToast.price) - (parseFloat(activeToast.discount) || 0)).toFixed(2) : activeToast.price}
                      </p>
                      <p className="text-[10px] text-white/30 font-bold tracking-[0.3em] mt-1">CURRENCY: BDT</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      transition={{ delay: 1.1 }}
                      className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-white font-bold text-right"
                    >
                      <span className="text-blue-500 mr-2">●</span> {activeToast.branch_name} <br/>
                      <span className="opacity-60">{activeToast.branch_location}</span>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Progress/Timer Bar */}
              <div className="relative h-1.5 w-full bg-white/5 mt-1 overflow-hidden">
                <motion.div 
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 10, ease: "linear" }}
                  className="absolute inset-0 bg-blue-600 origin-left shadow-[0_0_20px_rgba(37,99,235,0.6)]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

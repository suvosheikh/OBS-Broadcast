import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Users } from 'lucide-react';

interface OverlaySettings {
  image_url: string;
  location_name: string;
  footer_heading: string;
  footer_description: string;
  is_active: boolean;
}

export default function ImageOverlay() {
  const { userId } = useParams<{ userId: string }>();
  const [settings, setSettings] = useState<OverlaySettings | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Clock update
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchSettings() {
      const query = supabase
        .from('image_overlays')
        .select('*')
        .eq('is_active', true);
      
      if (userId) {
        query.eq('user_id', userId);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        setSettings(data);
      }
    }

    fetchSettings();

    // Realtime subscription for updates
    const channel = supabase
      .channel('image_overlay_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'image_overlays' },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    const d = date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${d} | ${day}`;
  };

  if (!settings) {
    return <div className="w-screen h-screen bg-transparent" />;
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative font-sans">
      {/* Background Image */}
      {settings.image_url && (
        <img 
          src={settings.image_url} 
          alt="Overlay Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          referrerPolicy="no-referrer"
        />
      )}

      {/* Top Header Section */}
      <div className="relative z-10 flex flex-col p-12 space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 px-4 py-2 flex items-center gap-2 rounded-lg">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="text-white font-black tracking-widest text-xl uppercase">LIVE</span>
          </div>
          <h1 className="text-white text-4xl font-bold tracking-tight drop-shadow-lg">
            {settings.location_name} (Live)
          </h1>
        </div>

        {/* Clock & Date Area */}
        <div className="bg-slate-900/80 backdrop-blur-md p-8 rounded-xl border border-white/10 w-fit">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-white/10 rounded-full">
              <Clock className="w-12 h-12 text-white" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-white text-7xl font-black tracking-tighter">
                  {formatTime(currentTime).split(' ')[0]}
                </span>
                <span className="text-white text-3xl font-bold uppercase opacity-80">
                   {formatTime(currentTime).split(' ')[1]}
                </span>
              </div>
              <p className="text-white/80 text-xl font-medium mt-1 tracking-wide">
                {formatDate(currentTime)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950/80 backdrop-blur-xl border-t border-white/10 py-10 px-16 flex items-center gap-12">
          <div className="p-6 bg-blue-600/20 rounded-full border border-blue-500/30 flex items-center justify-center">
            <Users className="w-16 h-16 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-white text-5xl font-black tracking-tight mb-3">
              {settings.footer_heading}
            </h2>
            <p className="text-white/70 text-2xl font-medium tracking-wide">
              {settings.footer_description}
            </p>
          </div>

          {/* Brand/Logo Placeholder if needed, the user's image has RYANS */}
          <div className="hidden lg:block ml-auto">
             <span className="text-white/20 text-4xl font-black tracking-tighter italic">RYANS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

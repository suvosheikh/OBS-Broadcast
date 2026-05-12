import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Power, Bell, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GlobalSettings {
  notice_section_enabled: boolean;
  branch_section_enabled: boolean;
}

export function SettingsWizard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<GlobalSettings>({
    notice_section_enabled: true,
    branch_section_enabled: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();
      
      if (data) {
        setSettings({
          notice_section_enabled: data.notice_section_enabled,
          branch_section_enabled: data.branch_section_enabled
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: keyof GlobalSettings) => {
    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));

    try {
      await supabase
        .from('settings')
        .update({ [key]: newValue })
        .eq('id', 1);
    } catch (err) {
      console.error('Error updating setting:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="bg-[#004a99] p-2 rounded-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Control Panel</h3>
                <p className="text-xs text-slate-500 font-medium tracking-wide flex items-center gap-1 uppercase">
                  Global Configuration
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#004a99]"></div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {/* Notice Toggle */}
                  <div className={`p-4 rounded-xl border transition-all duration-300 ${settings.notice_section_enabled ? 'bg-green-50/50 border-green-100 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.notice_section_enabled ? 'bg-green-600' : 'bg-slate-400'}`}>
                          <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">Notice Section</p>
                          <p className="text-sm text-slate-500">Master News Ticker</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('notice_section_enabled')}
                        className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${settings.notice_section_enabled ? 'bg-green-600' : 'bg-slate-300'}`}
                      >
                        <motion.div
                          animate={{ x: settings.notice_section_enabled ? 28 : 2 }}
                          className="absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-lg"
                        />
                      </button>
                    </div>
                  </div>

                  {/* Branch Toggle */}
                  <div className={`p-4 rounded-xl border transition-all duration-300 ${settings.branch_section_enabled ? 'bg-blue-50/50 border-blue-100 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.branch_section_enabled ? 'bg-[#004a99]' : 'bg-slate-400'}`}>
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">Branch Section</p>
                          <p className="text-sm text-slate-500">Info & Contact Ticker</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('branch_section_enabled')}
                        className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${settings.branch_section_enabled ? 'bg-[#004a99]' : 'bg-slate-300'}`}
                      >
                        <motion.div
                          animate={{ x: settings.branch_section_enabled ? 28 : 2 }}
                          className="absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-lg"
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex gap-3">
                    <Power className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Global toggles override individual item status. Use these to quickly hide entire sections from the live display.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors shadow-lg active:scale-95"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

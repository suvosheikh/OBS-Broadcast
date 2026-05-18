import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Power, Bell, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GlobalSettings {
  notice_section_enabled: boolean;
  branch_section_enabled: boolean;
}

export function SettingsWizard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<GlobalSettings & { id?: number }>({
    notice_section_enabled: true,
    branch_section_enabled: true
  });
  const [activeCounts, setActiveCounts] = useState({ notices: 0, branches: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      initSettings();
    }
  }, [isOpen]);

  const initSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch current settings (shared row)
      let { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('settings')
          .insert([{ notice_section_enabled: true, branch_section_enabled: true }])
          .select()
          .single();
        if (insertError) throw insertError;
        data = newData;
      }

      // 2. Fetch active counts for ALL items (shared)
      const { data: items } = await supabase
        .from('branch_ticker')
        .select('type, is_active')
        .eq('is_active', true);

      const counts = {
        notices: items?.filter(i => i.type === 'notice').length || 0,
        branches: items?.filter(i => i.type !== 'notice').length || 0
      };
      
      setActiveCounts(counts);

      // 3. Auto-sync logic: If 0 items, master MUST be false in DB
      let updatedNotice = data.notice_section_enabled;
      let updatedBranch = data.branch_section_enabled;

      if (counts.notices === 0 && data.notice_section_enabled) updatedNotice = false;
      if (counts.branches === 0 && data.branch_section_enabled) updatedBranch = false;

      if (updatedNotice !== data.notice_section_enabled || updatedBranch !== data.branch_section_enabled) {
        await supabase
          .from('settings')
          .update({ 
            notice_section_enabled: updatedNotice, 
            branch_section_enabled: updatedBranch 
          })
          .eq('id', data.id);
      }

      setSettings({
        id: data.id,
        notice_section_enabled: updatedNotice,
        branch_section_enabled: updatedBranch
      });
    } catch (err) {
      console.error('Error in initSettings:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: keyof GlobalSettings) => {
    // Prevent enabling if there's no active content
    if (!settings[key] && ((key === 'notice_section_enabled' && activeCounts.notices === 0) || 
        (key === 'branch_section_enabled' && activeCounts.branches === 0))) {
      return; 
    }

    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));

    try {
      await supabase
        .from('settings')
        .update({ [key]: newValue })
        .eq('id', settings.id);
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
                          <p className="text-sm text-slate-500">
                            {activeCounts.notices > 0 
                              ? `${activeCounts.notices} Active Item${activeCounts.notices > 1 ? 's' : ''}` 
                              : 'No Active Notices'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('notice_section_enabled')}
                        className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${settings.notice_section_enabled ? 'bg-green-600' : 'bg-slate-300'} ${activeCounts.notices === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                          <p className="text-sm text-slate-500">
                            {activeCounts.branches > 0 
                              ? `${activeCounts.branches} Active Item${activeCounts.branches > 1 ? 's' : ''}` 
                              : 'No Active Branches'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSetting('branch_section_enabled')}
                        className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${settings.branch_section_enabled ? 'bg-[#004a99]' : 'bg-slate-300'} ${activeCounts.branches === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
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

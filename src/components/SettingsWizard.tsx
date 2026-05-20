import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, X, Power, Bell, MapPin, Palette, Check, RefreshCcw, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface GlobalSettings {
  id?: number;
  notice_section_enabled: boolean;
  branch_section_enabled: boolean;
  
  // Notice Label Part
  notice_label_font: string;
  notice_label_size: number;
  notice_label_color: string;
  notice_label_bg: string;
  
  // Notice Content Part
  notice_content_font: string;
  notice_content_size: number;
  notice_content_color: string;
  notice_content_bg: string;
  
  // Branch Label Part
  branch_label_font: string;
  branch_label_size: number;
  branch_label_color: string;
  branch_label_bg: string;
  
  // Branch Content Part
  branch_content_font: string;
  branch_content_size: number;
  branch_content_color: string;
  branch_content_bg: string;

  // Time Part
  time_font?: string;
  time_size?: number;
  time_color?: string;
  time_bg?: string;
}

const FONTS = [
  { id: 'font-noto-sans-bengali', name: 'Noto Sans Bengali' },
  { id: 'font-noto-serif-bengali', name: 'Noto Serif Bengali' },
  { id: 'font-baloo-da-2', name: 'Baloo Da 2' },
  { id: 'font-galada', name: 'Galada' },
  { id: 'font-alkatra', name: 'Alkatra' },
  { id: 'font-tiro-bangla', name: 'Tiro Bangla' },
  { id: 'font-google-sans', name: 'Google Sans' },
  { id: 'font-google-sans-flex', name: 'Google Sans Flex' },
  { id: 'font-roboto', name: 'Roboto' },
  { id: 'font-open-sans', name: 'Open Sans' },
  { id: 'font-montserrat', name: 'Montserrat' },
  { id: 'font-montserrat-bold', name: 'Montserrat Bold' },
  { id: 'font-oswald', name: 'Oswald' },
  { id: 'font-raleway', name: 'Raleway' },
  { id: 'font-lora', name: 'Lora' }
];

export function SettingsWizard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'toggles' | 'styling'>('toggles');
  const [settings, setSettings] = useState<GlobalSettings>({
    notice_section_enabled: true,
    branch_section_enabled: true,
    notice_label_font: 'font-noto-sans-bengali',
    notice_label_size: 28,
    notice_label_color: '#ffffff',
    notice_label_bg: '#004a99',
    notice_content_font: 'font-noto-sans-bengali',
    notice_content_size: 22,
    notice_content_color: '#ffffff',
    notice_content_bg: '#00a651',
    branch_label_font: 'font-noto-sans-bengali',
    branch_label_size: 28,
    branch_label_color: '#ffffff',
    branch_label_bg: '#00a651',
    branch_content_font: 'font-noto-sans-bengali',
    branch_content_size: 22,
    branch_content_color: '#ffffff',
    branch_content_bg: '#004a99',
    time_font: 'font-noto-sans-bengali',
    time_size: 28,
    time_color: '#0f172a',
    time_bg: '#ffc107'
  });
  const [activeCounts, setActiveCounts] = useState({ notices: 0, branches: 0 });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
          .insert([{ 
            notice_section_enabled: true, 
            branch_section_enabled: true,
            notice_label_font: 'font-noto-sans-bengali',
            notice_label_size: 28,
            notice_label_color: '#ffffff',
            notice_label_bg: '#004a99',
            notice_content_font: 'font-noto-sans-bengali',
            notice_content_size: 22,
            notice_content_color: '#ffffff',
            notice_content_bg: '#00a651',
            branch_label_font: 'font-noto-sans-bengali',
            branch_label_size: 28,
            branch_label_color: '#ffffff',
            branch_label_bg: '#00a651',
            branch_content_font: 'font-noto-sans-bengali',
            branch_content_size: 22,
            branch_content_color: '#ffffff',
            branch_content_bg: '#004a99',
            time_font: 'font-noto-sans-bengali',
            time_size: 28,
            time_color: '#0f172a',
            time_bg: '#ffc107'
          }])
          .select()
          .single();
        if (insertError) throw insertError;
        data = newData;
      }

      // 2. Fetch active counts for ALL items (shared)
      const { data: items } = await supabase
        .from('branch_ticker')
        .select('type, is_active, start_at, end_at')
        .eq('is_active', true)
        .limit(2000);

      const now = new Date();
      const counts = {
        notices: items?.filter(i => {
          if (i.type !== 'notice') return false;
          if (i.start_at && new Date(i.start_at) > now) return false;
          if (i.end_at && new Date(i.end_at) < now) return false;
          return true;
        }).length || 0,
        branches: items?.filter(i => {
          if (i.type === 'notice') return false;
          if (i.start_at && new Date(i.start_at) > now) return false;
          if (i.end_at && new Date(i.end_at) < now) return false;
          return true;
        }).length || 0
      };
      
      setActiveCounts(counts);

      // Auto-sync logic for enabled master toggles
      let updatedNotice = data.notice_section_enabled;
      let updatedBranch = data.branch_section_enabled;

      if (counts.notices === 0 && data.notice_section_enabled) updatedNotice = false;
      if (counts.notices > 0 && !data.notice_section_enabled) updatedNotice = true;
      
      if (counts.branches === 0 && data.branch_section_enabled) updatedBranch = false;
      if (counts.branches > 0 && !data.branch_section_enabled) updatedBranch = true;

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
        branch_section_enabled: updatedBranch,
        notice_label_font: data.notice_label_font || 'font-noto-sans-bengali',
        notice_label_size: data.notice_label_size || 28,
        notice_label_color: data.notice_label_color || '#ffffff',
        notice_label_bg: data.notice_label_bg || '#004a99',
        notice_content_font: data.notice_content_font || 'font-noto-sans-bengali',
        notice_content_size: data.notice_content_size || 22,
        notice_content_color: data.notice_content_color || '#ffffff',
        notice_content_bg: data.notice_content_bg || '#00a651',
        branch_label_font: data.branch_label_font || 'font-noto-sans-bengali',
        branch_label_size: data.branch_label_size || 28,
        branch_label_color: data.branch_label_color || '#ffffff',
        branch_label_bg: data.branch_label_bg || '#00a651',
        branch_content_font: data.branch_content_font || 'font-noto-sans-bengali',
        branch_content_size: data.branch_content_size || 22,
        branch_content_color: data.branch_content_color || '#ffffff',
        branch_content_bg: data.branch_content_bg || '#004a99',
        time_font: data.time_font || 'font-noto-sans-bengali',
        time_size: data.time_size || 28,
        time_color: data.time_color || '#0f172a',
        time_bg: data.time_bg || '#ffc107'
      });
    } catch (err) {
      console.error('Error in initSettings:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: 'notice_section_enabled' | 'branch_section_enabled') => {
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

  const handleSaveStyles = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          notice_label_font: settings.notice_label_font,
          notice_label_size: Number(settings.notice_label_size),
          notice_label_color: settings.notice_label_color,
          notice_label_bg: settings.notice_label_bg,
          
          notice_content_font: settings.notice_content_font,
          notice_content_size: Number(settings.notice_content_size),
          notice_content_color: settings.notice_content_color,
          notice_content_bg: settings.notice_content_bg,
          
          branch_label_font: settings.branch_label_font,
          branch_label_size: Number(settings.branch_label_size),
          branch_label_color: settings.branch_label_color,
          branch_label_bg: settings.branch_label_bg,
          
          branch_content_font: settings.branch_content_font,
          branch_content_size: Number(settings.branch_content_size),
          branch_content_color: settings.branch_content_color,
          branch_content_bg: settings.branch_content_bg,

          time_font: settings.time_font,
          time_size: Number(settings.time_size),
          time_color: settings.time_color,
          time_bg: settings.time_bg
        })
        .eq('id', settings.id);

      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving style specifications:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 my-8 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-[#004a99] p-2 rounded-lg">
                <SettingsIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Global Control Panel</h3>
                <p className="text-xs text-slate-500 font-medium tracking-wide flex items-center gap-1 uppercase">
                  Overlay Manager & Customizer
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

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('toggles')}
              className={cn(
                "px-4 py-3 font-bold text-xs uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
                activeTab === 'toggles' 
                  ? "border-[#004a99] text-[#004a99]" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <Power className="w-4 h-4" /> Section Toggles
            </button>
            <button
              onClick={() => setActiveTab('styling')}
              className={cn(
                "px-4 py-3 font-bold text-xs uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
                activeTab === 'styling' 
                  ? "border-[#004a99] text-[#004a99]" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <Palette className="w-4 h-4" /> Style Customizer
            </button>
          </div>

          {/* Content area - scrollable */}
          <div className="p-6 overflow-y-auto flex-1 bg-white">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#004a99]" />
              </div>
            ) : (
              <>
                {activeTab === 'toggles' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Notice Toggle */}
                      <div className={cn(
                        "p-5 rounded-2xl border transition-all duration-300",
                        settings.notice_section_enabled ? "bg-green-50/50 border-green-100 shadow-sm" : "bg-slate-50/50 border-slate-100"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2.5 rounded-xl", settings.notice_section_enabled ? "bg-green-600" : "bg-slate-400")}>
                              <Bell className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-sm">Notice Section Ticker</p>
                              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                {activeCounts.notices > 0 
                                  ? `${activeCounts.notices} active notices configured` 
                                  : 'No active notice elements'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleSetting('notice_section_enabled')}
                            className={cn(
                              "relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none",
                              settings.notice_section_enabled ? "bg-green-600" : "bg-slate-300",
                              activeCounts.notices === 0 && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <motion.div
                              animate={{ x: settings.notice_section_enabled ? 28 : 2 }}
                              className="absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-md"
                            />
                          </button>
                        </div>
                      </div>

                      {/* Branch Toggle */}
                      <div className={cn(
                        "p-5 rounded-2xl border transition-all duration-300",
                        settings.branch_section_enabled ? "bg-blue-50/50 border-blue-100 shadow-sm" : "bg-slate-50/50 border-slate-100"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2.5 rounded-xl", settings.branch_section_enabled ? "bg-[#004a99]" : "bg-slate-400")}>
                              <MapPin className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-sm">Branch Address Ticker</p>
                              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                {activeCounts.branches > 0 
                                  ? `${activeCounts.branches} active branches configured` 
                                  : 'No active branch elements'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleSetting('branch_section_enabled')}
                            className={cn(
                              "relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none",
                              settings.branch_section_enabled ? "bg-[#004a99]" : "bg-slate-300",
                              activeCounts.branches === 0 && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <motion.div
                              animate={{ x: settings.branch_section_enabled ? 28 : 2 }}
                              className="absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-md"
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                      <div className="flex gap-3">
                        <Power className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">System Override Notice</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            These status toggles instantly activate or deactivate the respective banner rows on the live monitor. Individual active items are preserved.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Style Forms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Notice Label Card */}
                      <div className="bg-slate-50/50 border border-slate-150 p-6 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Bell className="w-4 h-4 text-blue-600" />
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Notice Label Segment</h4>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Style</label>
                            <select
                              value={settings.notice_label_font}
                              onChange={(e) => setSettings({ ...settings, notice_label_font: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#004a99]"
                            >
                              {FONTS.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Size (px)</label>
                            <input
                              type="number"
                              min="12"
                              max="72"
                              value={settings.notice_label_size}
                              onChange={(e) => setSettings({ ...settings, notice_label_size: parseInt(e.target.value) || 28 })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#004a99]"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Color</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={settings.notice_label_color}
                                  onChange={(e) => setSettings({ ...settings, notice_label_color: e.target.value })}
                                  className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <input
                                  type="text"
                                  value={settings.notice_label_color}
                                  onChange={(e) => setSettings({ ...settings, notice_label_color: e.target.value })}
                                  className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Background</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={settings.notice_label_bg}
                                  onChange={(e) => setSettings({ ...settings, notice_label_bg: e.target.value })}
                                  className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <input
                                  type="text"
                                  value={settings.notice_label_bg}
                                  onChange={(e) => setSettings({ ...settings, notice_label_bg: e.target.value })}
                                  className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notice Content Card */}
                      <div className="bg-slate-50/50 border border-slate-150 p-6 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Palette className="w-4 h-4 text-green-600" />
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Notice Content Segment</h4>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Style</label>
                            <select
                              value={settings.notice_content_font}
                              onChange={(e) => setSettings({ ...settings, notice_content_font: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#004a99]"
                            >
                              {FONTS.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Size (px)</label>
                            <input
                              type="number"
                              min="12"
                              max="72"
                              value={settings.notice_content_size}
                              onChange={(e) => setSettings({ ...settings, notice_content_size: parseInt(e.target.value) || 22 })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#004a99]"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Color</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={settings.notice_content_color}
                                  onChange={(e) => setSettings({ ...settings, notice_content_color: e.target.value })}
                                  className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <input
                                  type="text"
                                  value={settings.notice_content_color}
                                  onChange={(e) => setSettings({ ...settings, notice_content_color: e.target.value })}
                                  className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Background</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={settings.notice_content_bg}
                                  onChange={(e) => setSettings({ ...settings, notice_content_bg: e.target.value })}
                                  className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <input
                                  type="text"
                                  value={settings.notice_content_bg}
                                  onChange={(e) => setSettings({ ...settings, notice_content_bg: e.target.value })}
                                  className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Branch Label Card */}
                      <div className="bg-slate-50/50 border border-slate-150 p-6 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          <MapPin className="w-4 h-4 text-[#00a651]" />
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Branch Label Segment</h4>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Style</label>
                            <select
                              value={settings.branch_label_font}
                              onChange={(e) => setSettings({ ...settings, branch_label_font: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#004a99]"
                            >
                              {FONTS.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Size (px)</label>
                            <input
                              type="number"
                              min="12"
                              max="72"
                              value={settings.branch_label_size}
                              onChange={(e) => setSettings({ ...settings, branch_label_size: parseInt(e.target.value) || 28 })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#004a99]"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Color</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={settings.branch_label_color}
                                  onChange={(e) => setSettings({ ...settings, branch_label_color: e.target.value })}
                                  className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <input
                                  type="text"
                                  value={settings.branch_label_color}
                                  onChange={(e) => setSettings({ ...settings, branch_label_color: e.target.value })}
                                  className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Background</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={settings.branch_label_bg}
                                  onChange={(e) => setSettings({ ...settings, branch_label_bg: e.target.value })}
                                  className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <input
                                  type="text"
                                  value={settings.branch_label_bg}
                                  onChange={(e) => setSettings({ ...settings, branch_label_bg: e.target.value })}
                                  className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Branch Content Card */}
                      <div className="bg-slate-50/50 border border-slate-150 p-6 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Palette className="w-4 h-4 text-[#004a99]" />
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Branch Content Segment</h4>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Style</label>
                            <select
                              value={settings.branch_content_font}
                              onChange={(e) => setSettings({ ...settings, branch_content_font: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#004a99]"
                            >
                              {FONTS.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Size (px)</label>
                            <input
                              type="number"
                              min="12"
                              max="72"
                              value={settings.branch_content_size}
                              onChange={(e) => setSettings({ ...settings, branch_content_size: parseInt(e.target.value) || 22 })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#004a99]"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Color</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={settings.branch_content_color}
                                  onChange={(e) => setSettings({ ...settings, branch_content_color: e.target.value })}
                                  className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <input
                                  type="text"
                                  value={settings.branch_content_color}
                                  onChange={(e) => setSettings({ ...settings, branch_content_color: e.target.value })}
                                  className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Background</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={settings.branch_content_bg}
                                  onChange={(e) => setSettings({ ...settings, branch_content_bg: e.target.value })}
                                  className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <input
                                  type="text"
                                  value={settings.branch_content_bg}
                                  onChange={(e) => setSettings({ ...settings, branch_content_bg: e.target.value })}
                                  className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Time (Clock) Style Card */}
                      <div className="bg-slate-50/50 border border-slate-150 p-6 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Clock className="w-4 h-4 text-[#ffc107]" />
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Time (Clock) Segment</h4>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Style</label>
                            <select
                              value={settings.time_font || 'font-noto-sans-bengali'}
                              onChange={(e) => setSettings({ ...settings, time_font: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#004a99]"
                            >
                              {FONTS.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Size (px)</label>
                            <input
                              type="number"
                              min="12"
                              max="72"
                              value={settings.time_size || 28}
                              onChange={(e) => setSettings({ ...settings, time_size: parseInt(e.target.value) || 28 })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#004a99]"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Color</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={settings.time_color || '#0f172a'}
                                  onChange={(e) => setSettings({ ...settings, time_color: e.target.value })}
                                  className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <input
                                  type="text"
                                  value={settings.time_color || '#0f172a'}
                                  onChange={(e) => setSettings({ ...settings, time_color: e.target.value })}
                                  className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 block"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Background</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={settings.time_bg || '#ffc107'}
                                  onChange={(e) => setSettings({ ...settings, time_bg: e.target.value })}
                                  className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0"
                                />
                                <input
                                  type="text"
                                  value={settings.time_bg || '#ffc107'}
                                  onChange={(e) => setSettings({ ...settings, time_bg: e.target.value })}
                                  className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 block"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        {saveSuccess && (
                          <span className="text-xs text-green-600 font-bold flex items-center gap-1.5">
                            <Check className="w-4 h-4 bg-green-500 text-white rounded-full p-0.5" />
                            Styles saved and applied in real-time!
                          </span>
                        )}
                        {!saveSuccess && (
                          <span className="text-xs text-slate-500">
                            Apply changes to instantly transform Notice & Branch style rows.
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleSaveStyles}
                        disabled={isSaving}
                        className="px-6 py-3 bg-[#004a99] hover:bg-opacity-95 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg active:scale-95 text-xs uppercase tracking-wider"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

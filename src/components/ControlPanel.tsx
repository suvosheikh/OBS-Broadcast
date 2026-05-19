import { useEffect, useState, FormEvent, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff,
  LogOut, 
  ExternalLink,
  Save,
  X,
  Edit2,
  Send,
  RefreshCcw,
  Search,
  Menu,
  LayoutDashboard,
  Zap,
  CheckCircle2,
  Copy,
  Clock,
  Package,
  Users,
  CircleUser as UserIcon,
  Trophy,
  Image as ImageIcon,
  MapPin,
  Settings as SettingsIcon,
  Lock,
  AlertCircle,
  Phone,
  Square,
  Sliders,
} from 'lucide-react';
import { cn, getAppUrl } from '../lib/utils';
import { SettingsWizard } from './SettingsWizard';

interface Product {
  id?: string;
  product_name: string;
  sku: string;
  price: string;
  discount: string;
  product_short_description: string;
  branch_name: string;
  branch_location: string;
}

interface ToastHistory {
  id: string;
  created_at: string;
  content: Product;
}

interface WinnerData {
  id?: string;
  subject: string;
  bill_no: string;
  gift_name: string;
  is_visible: boolean;
  created_at?: string;
}

interface TickerItem {
  id?: string;
  type: 'notice' | 'branch' | 'branch_address' | string;
  category?: 'notice' | 'announcement';
  top_message: string;
  bottom_message: string;
  branch_name: string;
  phone_number?: string;
  sort_order?: number;
  display_duration?: number;
  is_active: boolean;
  start_at?: string | null;
  end_at?: string | null;
}

export default function ControlPanel({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<'branch-address' | 'users' | 'profile'>('branch-address');
  const [stats, setStats] = useState({ today: 0, total: 0 });
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [usersBoard, setUsersBoard] = useState<any[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [noticeForm, setNoticeForm] = useState({
    content: '',
    category: 'notice' as 'notice' | 'announcement',
    is_active: true,
    display_duration: 10,
    start_at: '' as string | null,
    end_at: '' as string | null
  });
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    phone: '',
    sort_order: 0,
    is_active: true,
    display_duration: 12,
    start_at: '' as string | null,
    end_at: '' as string | null
  });
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [history, setHistory] = useState<ToastHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTickerId, setEditingTickerId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<'ticker' | 'winner' | 'product' | null>(null);

  const [currentBranchIndex, setCurrentBranchIndex] = useState(0);
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);

  useEffect(() => {
    const activeNoticesRaw = tickerItems.filter(i => i.type === 'notice' && i.is_active);
    const standard = activeNoticesRaw.filter(i => i.category !== 'announcement');
    const announcements = activeNoticesRaw.filter(i => i.category === 'announcement');
    const activeNotices: TickerItem[] = [];
    
    if (standard.length > 0 && announcements.length > 0) {
      const maxLen = Math.max(standard.length, announcements.length);
      for (let i = 0; i < maxLen; i++) {
        activeNotices.push(announcements[i % announcements.length]);
        activeNotices.push(standard[i % standard.length]);
      }
    } else {
      activeNotices.push(...activeNoticesRaw);
    }

    const activeBranches = tickerItems.filter(i => i.type === 'branch' && i.is_active);

    let noticeTimer: any;
    let branchTimer: any;

    if (activeNotices.length > 0) {
      const item = activeNotices[currentNoticeIndex % activeNotices.length];
      const duration = (item?.display_duration || 10) * 1000;
      noticeTimer = setTimeout(() => {
        setCurrentNoticeIndex((prev) => prev + 1);
      }, duration);
    }

    if (activeBranches.length > 0) {
      const item = activeBranches[currentBranchIndex % activeBranches.length];
      const duration = (item?.display_duration || 12) * 1000;
      branchTimer = setTimeout(() => {
        setCurrentBranchIndex((prev) => prev + 1);
      }, duration);
    }

    return () => {
      if (noticeTimer) clearTimeout(noticeTimer);
      if (branchTimer) clearTimeout(branchTimer);
    };
  }, [tickerItems.length, currentNoticeIndex, currentBranchIndex]); 
// Use length for stability

  const previewNotice = useMemo(() => {
    const raw = tickerItems.filter(i => i.type === 'notice' && i.is_active);
    const standard = raw.filter(i => i.category !== 'announcement');
    const announcements = raw.filter(i => i.category === 'announcement');
    const alternated = [];
    
    if (standard.length > 0 && announcements.length > 0) {
      const maxLen = Math.max(standard.length, announcements.length);
      for (let i = 0; i < maxLen; i++) {
        alternated.push(announcements[i % announcements.length]);
        alternated.push(standard[i % standard.length]);
      }
    } else {
      alternated.push(...raw);
    }
    return alternated[currentNoticeIndex % (alternated.length || 1)];
  }, [tickerItems, currentNoticeIndex]);

  const previewBranch = useMemo(() => {
    const raw = tickerItems.filter(i => i.type === 'branch' && i.is_active);
    return raw[currentBranchIndex % (raw.length || 1)];
  }, [tickerItems, currentBranchIndex]);

  useEffect(() => {
    fetchStats();
    fetchHistory();
    fetchBranches();
    fetchUserProfile();

    // Subscribe to real-time changes for the current user's profile
    const profileSubscription = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log("Profile updated in real-time:", payload.new);
          if (payload.new && payload.new.role) {
            setUserRole(payload.new.role as 'admin' | 'editor' | 'viewer');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [user.id]);

  async function fetchUserProfile() {
    try {
      console.log("Fetching profile for user ID:", user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Supabase error fetching profile:", error);
        return;
      }

      if (data) {
        console.log("Successfully fetched profile. Role is:", data.role);
        setUserRole(data.role as 'admin' | 'editor' | 'viewer');
      } else {
        // Fallback: If profile doesn't exist at all, try to create it as viewer
        console.log("Profile row not found in table. Attempting to create one...");
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id, email: user.email, role: 'viewer' });
        
        if (insertError) {
          console.error("Failed to auto-create profile:", insertError);
        } else {
          console.log("Created default viewer profile.");
          setUserRole('viewer');
        }
      }
    } catch (err) {
      console.error("Critical error in fetchUserProfile:", err);
    }
  }

  async function fetchAllUsers() {
    if (userRole !== 'admin') return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsersBoard(data || []);
  }

  useEffect(() => {
    if (activeTab === 'users' && userRole === 'admin') {
      fetchAllUsers();
    }
  }, [activeTab, userRole]);

  async function updateUserRole(targetUserId: string, newRole: string) {
    if (userRole !== 'admin') return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);
    
    if (!error) {
      alert("User role updated!");
      fetchAllUsers();
    }
  }

  async function fetchBranches() {
    const { data, error } = await supabase
      .from('branch_ticker')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(2000);
    
    if (error) {
      console.error("Error fetching branch ticker:", error);
    } else {
      console.log("Fetched branches:", data?.length);
      setTickerItems(data || []);
    }
  }

  async function saveNotice() {
    if (userRole === 'viewer') return;
    if (!noticeForm.content) return;
    
    let result;
    if (editingTickerId) {
      result = await supabase.from('branch_ticker').update({
        top_message: noticeForm.content,
        category: noticeForm.category,
        is_active: noticeForm.is_active,
        display_duration: noticeForm.display_duration,
        start_at: noticeForm.start_at ? new Date(noticeForm.start_at).toISOString() : null,
        end_at: noticeForm.end_at ? new Date(noticeForm.end_at).toISOString() : null
      }).eq('id', editingTickerId);
      setEditingTickerId(null);
    } else {
      result = await supabase
        .from('branch_ticker')
        .insert([{ 
          type: 'notice',
          category: noticeForm.category,
          top_message: noticeForm.content,
          branch_name: '',
          bottom_message: '',
          is_active: noticeForm.is_active,
          display_duration: noticeForm.display_duration,
          user_id: user.id,
          start_at: noticeForm.start_at ? new Date(noticeForm.start_at).toISOString() : null,
          end_at: noticeForm.end_at ? new Date(noticeForm.end_at).toISOString() : null
        }]);
    }

    if (result?.error) {
      alert(`SQL Error: ${result.error.message}`);
    } else {
      setNoticeForm({ 
        content: '', 
        category: 'notice',
        is_active: true, 
        display_duration: 10,
        start_at: '' as string | null,
        end_at: '' as string | null
      });
      setShowNoticeForm(false);
      await syncMasterSettings();
      fetchBranches();
    }
  }

  async function saveBranchAddress() {
    if (userRole === 'viewer') return;
    if (!branchForm.name || !branchForm.address) return;
    
    let result;
    if (editingTickerId) {
      result = await supabase.from('branch_ticker').update({
        branch_name: branchForm.name,
        bottom_message: branchForm.address,
        phone_number: branchForm.phone,
        sort_order: branchForm.sort_order,
        is_active: branchForm.is_active,
        display_duration: branchForm.display_duration,
        start_at: branchForm.start_at ? new Date(branchForm.start_at).toISOString() : null,
        end_at: branchForm.end_at ? new Date(branchForm.end_at).toISOString() : null
      }).eq('id', editingTickerId);
      setEditingTickerId(null);
    } else {
      result = await supabase
        .from('branch_ticker')
        .insert([{ 
          type: 'branch',
          branch_name: branchForm.name,
          bottom_message: branchForm.address,
          phone_number: branchForm.phone,
          sort_order: branchForm.sort_order,
          top_message: '',
          is_active: branchForm.is_active,
          display_duration: branchForm.display_duration,
          user_id: user.id,
          start_at: branchForm.start_at ? new Date(branchForm.start_at).toISOString() : null,
          end_at: branchForm.end_at ? new Date(branchForm.end_at).toISOString() : null
        }]);
    }
    
    if (result?.error) {
      alert(`SQL Error: ${result.error.message}`);
    } else {
      setBranchForm({ 
        name: '', 
        address: '', 
        phone: '', 
        sort_order: 0, 
        is_active: true, 
        display_duration: 12,
        start_at: '' as string | null,
        end_at: '' as string | null
      });
      setShowBranchForm(false);
      await syncMasterSettings();
      fetchBranches();
    }
  }

  const toLocalISO = (iso?: string | null) => {
    if (!iso) return '';
    const date = new Date(iso);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  function editTickerItem(item: TickerItem) {
    setEditingTickerId(item.id!);
    if (item.type === 'notice') {
      setNoticeForm({
        content: item.top_message,
        category: item.category || 'notice',
        is_active: item.is_active,
        display_duration: item.display_duration || 10,
        start_at: toLocalISO(item.start_at),
        end_at: toLocalISO(item.end_at)
      });
      setShowNoticeForm(true);
      setShowBranchForm(false);
    } else {
      setBranchForm({
        name: item.branch_name,
        address: item.bottom_message,
        phone: item.phone_number || '',
        sort_order: item.sort_order || 0,
        is_active: item.is_active,
        display_duration: item.display_duration || 12,
        start_at: toLocalISO(item.start_at),
        end_at: toLocalISO(item.end_at)
      });
      setShowBranchForm(true);
      setShowNoticeForm(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteBranch(id: string) {
    setDeleteConfirmId(id);
    setDeleteTarget('ticker');
  }

  async function syncMasterSettings() {
    const { data: items } = await supabase
      .from('branch_ticker')
      .select('type, is_active, start_at, end_at')
      .eq('is_active', true)
      .limit(2000);

    const now = new Date();
    const activeNotices = items?.filter(i => {
      if (i.type !== 'notice') return false;
      if (i.start_at && new Date(i.start_at) > now) return false;
      if (i.end_at && new Date(i.end_at) < now) return false;
      return true;
    }).length || 0;

    const activeBranches = items?.filter(i => {
      if (i.type === 'notice') return false;
      if (i.start_at && new Date(i.start_at) > now) return false;
      if (i.end_at && new Date(i.end_at) < now) return false;
      return true;
    }).length || 0;

    const { data: settings } = await supabase.from('settings').select('*').limit(1).maybeSingle();
    if (settings) {
      let updates: any = {};
      if (activeNotices === 0 && settings.notice_section_enabled) updates.notice_section_enabled = false;
      if (activeBranches === 0 && settings.branch_section_enabled) updates.branch_section_enabled = false;
      if (activeNotices > 0 && !settings.notice_section_enabled) updates.notice_section_enabled = true;
      if (activeBranches > 0 && !settings.branch_section_enabled) updates.branch_section_enabled = true;
      
      if (Object.keys(updates).length > 0) {
        await supabase.from('settings').update(updates).eq('id', settings.id);
      }
    }
  }

  async function executeDelete() {
    if (!deleteConfirmId || !deleteTarget) return;

    let error;
    if (deleteTarget === 'ticker') {
      const result = await supabase.from('branch_ticker').delete().eq('id', deleteConfirmId);
      error = result.error;
      if (!error) fetchBranches();
    }

    if (error) {
      alert(`Error deleting item: ${error.message}`);
    }

    setDeleteConfirmId(null);
    setDeleteTarget(null);
  }

  async function toggleTickerItemStatus(id: string, current: boolean, type: string) {
    // 1. Update the item
    await supabase.from('branch_ticker').update({ is_active: !current }).eq('id', id);
    
    // 2. Sync master settings
    await syncMasterSettings();

    fetchBranches();
  }

  async function fetchStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: totalCount } = await supabase
      .from('toast_history')
      .select('*', { count: 'exact', head: true });

    const { count: todayCount } = await supabase
      .from('toast_history')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    setStats({
      total: totalCount || 0,
      today: todayCount || 0
    });
  }

  async function fetchHistory() {
    const { data } = await supabase
      .from('toast_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    setHistory(data || []);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const NavItem = ({ tab, icon: Icon, label }: { tab: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setIsSidebarOpen(false);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group",
        activeTab === tab 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon className={cn("w-5 h-5", activeTab === tab ? "text-white" : "text-slate-400 group-hover:text-slate-600")} /> 
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-100 flex flex-col z-50 transition-transform duration-300 transform lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">Broadcast Flow</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest text-[10px]">Cloud Master v2</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem tab="branch-address" icon={MapPin} label="Branch Address" />
          <NavItem tab="profile" icon={Lock} label="Account Security" />
          {userRole === 'admin' && (
            <NavItem tab="users" icon={Users} label="User Roles" />
          )}
        </nav>

        <div className="p-6 border-t border-slate-50 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4">
                 <div className="flex items-center justify-between mb-1">
                   <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest truncate">Current Operator</p>
                   <button 
                    onClick={fetchUserProfile}
                    className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                    title="Refresh Role"
                   >
                     <RefreshCcw className="w-2.5 h-2.5 text-slate-400" />
                   </button>
                 </div>
                 <div className="flex items-center justify-between">
                   <p className="text-xs font-bold text-slate-700 truncate">{user.email}</p>
                   <span className={cn(
                     "text-[8px] px-1.5 py-0.5 rounded font-black uppercase border",
                     userRole === 'admin' ? "bg-red-50 text-red-600 border-red-100" :
                     userRole === 'editor' ? "bg-blue-50 text-blue-600 border-blue-100" :
                     "bg-slate-100 text-slate-500 border-slate-200"
                   )}>
                     {userRole}
                   </span>
                 </div>
              </div>
          <button 
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Top Navigation / Toolbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 lg:px-12 py-5 flex items-center justify-between">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 lg:hidden text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-100">
              <CheckCircle2 className="w-3 h-3" /> System Live
            </div>
            <button 
              onClick={() => window.open(`${getAppUrl()}/overlay`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Live Preview
            </button>
          </div>
        </header>

        {activeTab === 'branch-address' ? (
          <div className="p-8 lg:p-12 max-w-6xl mx-auto flex flex-col gap-12">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ticker Segments</h2>
                <p className="text-slate-500 mt-2">Independently manage Notice and Branch address segments for your live ticker.</p>
              </div>
              {userRole === 'admin' && (
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-red-600 text-red-600 font-bold uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all text-[10px] shadow-sm self-start md:self-auto"
                >
                  <Sliders className="w-4 h-4" /> Global Control Panel
                </button>
              )}
            </div>

            <div className="space-y-16">
              {/* NOTICE SEGMENT */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#00a651] rounded-full animate-pulse" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Notice Management</h3>
                  </div>
                  <button 
                    onClick={() => {
                      if (userRole === 'viewer') return;
                      setEditingTickerId(null);
                      setNoticeForm({ content: '', is_active: true, display_duration: 10 });
                      setShowNoticeForm(true);
                      setShowBranchForm(false);
                    }}
                    disabled={userRole === 'viewer'}
                    className="flex items-center gap-2 px-6 py-3 bg-[#00a651] text-white font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all text-[10px] shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" /> Add New Notice
                  </button>
                </div>

                {showNoticeForm && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{editingTickerId ? 'Edit' : 'New'} Notice Content</p>
                      <button onClick={() => setShowNoticeForm(false)} className="text-slate-400 hover:text-slate-900"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Category</label>
                        <select 
                          value={noticeForm.category}
                          onChange={e => setNoticeForm({...noticeForm, category: e.target.value as any})}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                        >
                          <option value="notice">নোটিশ (Notice)</option>
                          <option value="announcement">ঘোষণা (Announcement)</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <FormInput 
                          label="Notice Content" 
                          placeholder="e.g. বিশেষ ছাড় অফার চলছে..."
                          value={noticeForm.content} 
                          onChange={v => setNoticeForm({...noticeForm, content: v})} 
                        />
                      </div>
                      <FormInput 
                        label="Duration (Sec)" 
                        type="number"
                        value={noticeForm.display_duration.toString()} 
                        onChange={v => setNoticeForm({...noticeForm, display_duration: parseInt(v) || 10})} 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput 
                        label="Start Date & Time (Optional)" 
                        type="datetime-local"
                        value={noticeForm.start_at || ''} 
                        onChange={v => setNoticeForm({...noticeForm, start_at: v})} 
                      />
                      <FormInput 
                        label="End Date & Time (Optional)" 
                        type="datetime-local"
                        value={noticeForm.end_at || ''} 
                        onChange={v => setNoticeForm({...noticeForm, end_at: v})} 
                      />
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={saveNotice}
                        disabled={!noticeForm.content}
                        className="flex-1 py-4 bg-[#00a651] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-green-100 disabled:opacity-30"
                      >
                        {editingTickerId ? 'Update Notice' : 'Save Notice'}
                      </button>
                    </div>
                  </motion.div>
                )}
                
                <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                          <tr className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                             <th className="pb-4 pt-2 font-bold">Category</th>
                             <th className="pb-4 pt-2 font-bold">Notice Content</th>
                             <th className="pb-4 pt-2 font-bold text-center">Status</th>
                             <th className="pb-4 pt-2 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {tickerItems.filter(i => i.type === 'notice').map(item => (
                            <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-4">
                                <span className={cn(
                                  "text-[8px] font-black uppercase px-2 py-1 rounded-md border tracking-tighter",
                                  item.category === 'announcement' 
                                    ? "bg-amber-50 text-amber-600 border-amber-100" 
                                    : "bg-green-50 text-green-600 border-green-100"
                                )}>
                                  {item.category === 'announcement' ? 'ঘোষণা' : 'নোটিশ'}
                                </span>
                              </td>
                              <td className="py-4 font-medium text-xs text-slate-800">
                                <div>{item.top_message}</div>
                                {(item.start_at || item.end_at) && (
                                  <div className="flex items-center gap-2 mt-1 text-[9px] font-bold text-slate-400 border border-slate-100 w-fit px-1.5 py-0.5 rounded-md bg-slate-50 uppercase tracking-tighter">
                                    <Clock className="w-2.5 h-2.5" />
                                    {item.start_at ? new Date(item.start_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '∞'} 
                                    <span>→</span>
                                    {item.end_at ? new Date(item.end_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '∞'}
                                  </div>
                                )}
                              </td>
                              <td className="py-4 text-center">
                                {(() => {
                                  const isExpired = item.end_at && new Date(item.end_at) < currentTime;
                                  const isUpcoming = item.start_at && new Date(item.start_at) > currentTime;
                                  const effectivelyActive = item.is_active && !isExpired && !isUpcoming;

                                  return (
                                    <div className="flex flex-col items-center gap-1">
                                      <button 
                                        onClick={() => toggleTickerItemStatus(item.id!, item.is_active, 'notice')}
                                        className={cn(
                                          "p-2 rounded-lg border transition-all", 
                                          effectivelyActive ? "bg-green-50 text-green-600 border-green-100" : 
                                          isExpired ? "bg-red-50 text-red-400 border-red-100 opacity-50" :
                                          isUpcoming ? "bg-blue-50 text-blue-600 border-blue-100" :
                                          "bg-slate-50 text-slate-400 border-slate-100"
                                        )}
                                      >
                                        {item.is_active && !isExpired ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                      </button>
                                      {isExpired && <span className="text-[7px] font-black text-red-500 uppercase tracking-tighter">Expired</span>}
                                      {isUpcoming && <span className="text-[7px] font-black text-blue-500 uppercase tracking-tighter">Upcoming</span>}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={() => editTickerItem(item)}
                                    className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                                   title="Edit">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => deleteBranch(item.id!)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="w-full bg-slate-50 border border-slate-200 p-8 rounded-3xl shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-12">
                  <div className="w-full md:w-96 space-y-3">
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Overlay Source URL</p>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 bg-white p-3 rounded-xl border border-slate-100 text-xs font-mono text-slate-600 truncate">{getAppUrl()}/branchaddress/{user.id}</code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${getAppUrl()}/branchaddress/${user.id}`);
                          alert("Link copied!");
                        }}
                        className="bg-white p-3 rounded-xl border border-slate-100 text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 w-full bg-slate-900 rounded-3xl overflow-hidden border border-white/5 p-1 min-h-[80px] flex items-center justify-center">
                    <div className="w-full h-[60px] bg-slate-800 flex flex-col pointer-events-none origin-center">
                       <div className="h-1/2 bg-[#00a651] flex items-center border-b border-white/5">
                          <div className="w-[80px] h-full bg-[#004a99] flex items-center justify-center">
                             <span className="text-white font-black text-xs italic font-bangla">
                               {(previewNotice?.category === 'announcement' || noticeForm.category === 'announcement') ? 'ঘোষণা' : 'নোটিশ'}
                             </span>
                          </div>
                          <div className="flex-1 px-4 text-white text-xs font-bold truncate font-bangla">
                             {previewNotice?.top_message || noticeForm.content || '...'}
                          </div>
                       </div>
                       <div className="h-1/2 bg-[#004a99] flex items-center">
                          <div className="w-[80px] bg-[#00a651] h-full flex items-center justify-center text-center">
                             <span className="text-white font-bold text-[10px] px-2 whitespace-nowrap overflow-hidden font-bangla">
                               {previewBranch?.branch_name || branchForm.name || 'BRANCH'}
                             </span>
                          </div>
                          <div className="flex-1 px-4 text-white flex items-center overflow-hidden">
                             <div className="text-[10px] font-medium truncate font-bangla flex items-center gap-1">
                                {(() => {
                                   const addr = previewBranch?.bottom_message || branchForm.address || 'Address Area';
                                   const phone = previewBranch?.phone_number || branchForm.phone;
                                   return (
                                     <>
                                       <span className="truncate">{addr}</span>
                                       {phone && (
                                         <>
                                           <Square className="w-1.5 h-1.5 fill-white text-white shrink-0" />
                                           <span className="shrink-0">{phone}</span>
                                         </>
                                       )}
                                     </>
                                   );
                                })()}
                             </div>
                          </div>
                          <div className="w-[60px] bg-[#ffc107] h-full flex items-center justify-center">
                             <span className="text-slate-900 font-bold text-[10px]">
                               {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                             </span>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BRANCH SEGMENT */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#004a99] rounded-full" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Branch Management</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        if (userRole === 'viewer') return;
                        setEditingTickerId(null);
                        setBranchForm({ name: '', address: '', phone: '', sort_order: 0, is_active: true, display_duration: 12 });
                        setShowBranchForm(true);
                        setShowNoticeForm(false);
                      }}
                      disabled={userRole === 'viewer'}
                      className="flex items-center gap-2 px-6 py-3 bg-[#004a99] text-white font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all text-[10px] shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" /> Add New Branch
                    </button>
                  </div>
                </div>

                {showBranchForm && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{editingTickerId ? 'Edit' : 'New'} Branch Details</p>
                      <button onClick={() => setShowBranchForm(false)} className="text-slate-400 hover:text-slate-900"><X className="w-4 h-4" /></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="lg:col-span-2">
                        <FormInput 
                          label="Branch Name" 
                          placeholder="e.g. Multiplan Center"
                          value={branchForm.name} 
                          onChange={v => setBranchForm({...branchForm, name: v})} 
                        />
                      </div>
                      <FormInput 
                        label="Phone Number" 
                        placeholder="e.g. 017XXXXXXX"
                        value={branchForm.phone} 
                        onChange={v => setBranchForm({...branchForm, phone: v})} 
                      />
                      <FormInput 
                        label="Display Time (Seconds)" 
                        type="number"
                        placeholder="e.g. 12"
                        value={branchForm.display_duration.toString()} 
                        onChange={v => setBranchForm({...branchForm, display_duration: parseInt(v) || 12})} 
                      />
                      <div className="lg:col-span-3">
                        <FormInput 
                          label="Address" 
                          placeholder="e.g. Shop 431, Level 4..."
                          value={branchForm.address} 
                          onChange={v => setBranchForm({...branchForm, address: v})} 
                        />
                      </div>
                      <FormInput 
                        label="Sort Order" 
                        type="number"
                        value={branchForm.sort_order.toString()} 
                        onChange={v => setBranchForm({...branchForm, sort_order: parseInt(v) || 0})} 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput 
                        label="Start Date & Time (Optional)" 
                        type="datetime-local"
                        value={branchForm.start_at || ''} 
                        onChange={v => setBranchForm({...branchForm, start_at: v})} 
                      />
                      <FormInput 
                        label="End Date & Time (Optional)" 
                        type="datetime-local"
                        value={branchForm.end_at || ''} 
                        onChange={v => setBranchForm({...branchForm, end_at: v})} 
                      />
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={saveBranchAddress}
                        disabled={!branchForm.name || !branchForm.address}
                        className="flex-1 py-4 bg-[#004a99] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-blue-100 disabled:opacity-30"
                      >
                        {editingTickerId ? 'Update Branch' : 'Save Branch'}
                      </button>
                    </div>
                  </motion.div>
                )}
                
                <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                          <tr className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                             <th className="pb-4 pt-2 font-bold text-center">Order</th>
                             <th className="pb-4 pt-2 font-bold w-1/4">Branch Name</th>
                             <th className="pb-4 pt-2 font-bold w-1/6">Phone Number</th>
                             <th className="pb-4 pt-2 font-bold">Address</th>
                             <th className="pb-4 pt-2 font-bold text-center">Status</th>
                             <th className="pb-4 pt-2 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {tickerItems.filter(i => i.type === 'branch').map(item => (
                            <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-5 text-center font-mono text-[10px] bg-slate-50/30 rounded-lg">{item.sort_order || 0}</td>
                              <td className="py-5 pl-4 text-xs text-slate-900">
                                <div className="font-bold">{item.branch_name}</div>
                                {(item.start_at || item.end_at) && (
                                  <div className="flex items-center gap-1 mt-1 text-[8px] font-black text-slate-400 uppercase tracking-tighter opacity-60">
                                    <Clock className="w-2 h-2" />
                                    {item.start_at ? new Date(item.start_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '∞'} 
                                    <span>→</span>
                                    {item.end_at ? new Date(item.end_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '∞'}
                                  </div>
                                )}
                              </td>
                              <td className="py-5 text-xs text-slate-500 font-medium">
                                {item.phone_number || '---'}
                              </td>
                              <td className="py-5 text-xs text-slate-400 truncate max-w-sm">
                                {item.bottom_message}
                              </td>
                              <td className="py-5 text-center">
                                <div className="flex items-center justify-center gap-3">
                                  {(() => {
                                    const isExpired = item.end_at && new Date(item.end_at) < currentTime;
                                    const isUpcoming = item.start_at && new Date(item.start_at) > currentTime;
                                    const effectivelyActive = item.is_active && !isExpired && !isUpcoming;

                                    return (
                                      <div className="flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-3">
                                          <span className={cn(
                                            "text-[10px] font-bold uppercase tracking-tighter w-12 text-right",
                                            effectivelyActive ? "text-green-600" : 
                                            isExpired ? "text-red-500" :
                                            isUpcoming ? "text-blue-500" :
                                            "text-slate-400"
                                          )}>
                                            {effectivelyActive ? 'Active' : isExpired ? 'Closed' : isUpcoming ? 'Wait' : 'Off'}
                                          </span>
                                          <button 
                                            onClick={() => userRole !== 'viewer' && toggleTickerItemStatus(item.id!, item.is_active, 'branch')}
                                            disabled={userRole === 'viewer'}
                                            className={cn(
                                              "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                              item.is_active && !isExpired ? "bg-[#00a651]" : isExpired ? "bg-red-200" : "bg-slate-200",
                                              userRole === 'viewer' && "opacity-50 cursor-not-allowed"
                                            )}
                                          >
                                            <span
                                              className={cn(
                                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                item.is_active && !isExpired ? "translate-x-5" : "translate-x-0"
                                              )}
                                            />
                                          </button>
                                        </div>
                                        {isExpired && <span className="text-[7px] font-black text-red-500 uppercase tracking-tighter">Schedule Ended</span>}
                                        {isUpcoming && <span className="text-[7px] font-black text-blue-500 uppercase tracking-tighter">Starting Soon</span>}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="py-5 text-right text-actions-cell">
                                <div className="flex justify-end gap-2">
                                  {userRole !== 'viewer' && (
                                    <button 
                                      onClick={() => editTickerItem(item)}
                                      className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  {userRole !== 'viewer' && (
                                    <button 
                                      onClick={() => deleteBranch(item.id!)}
                                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {tickerItems.filter(i => i.type === 'branch').length === 0 && (
                        <div className="py-16 text-center text-slate-300 italic text-xs">No branches configured</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'profile' ? (
            <div className="p-8 lg:p-12 max-w-2xl mx-auto space-y-8">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Account Security</h2>
                <p className="text-slate-500 mt-2">Manage your login credentials and password.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                      <UserIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email Address</p>
                      <p className="text-sm font-bold text-slate-700">{user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">New Password</label>
                    <input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Confirm New Password</label>
                    <input 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    if (newPassword.length < 6) {
                      alert("Password must be at least 6 characters.");
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      alert("Passwords do not match!");
                      return;
                    }
                    
                    setIsUpdatingPassword(true);
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    setIsUpdatingPassword(false);
                    
                    if (error) {
                      alert("Error: " + error.message);
                    } else {
                      alert("Password updated successfully!");
                      setNewPassword('');
                      setConfirmPassword('');
                    }
                  }}
                  disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                  className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-slate-800 transition-all disabled:opacity-30 text-[10px] flex items-center justify-center gap-3 shadow-xl"
                >
                  {isUpdatingPassword ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Update Password
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4">
                 <div className="p-2 bg-amber-100 rounded-lg">
                   <AlertCircle className="w-5 h-5 text-amber-600" />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-amber-900">Security Recommendation</h4>
                    <p className="text-xs text-amber-700 mt-1">Use a strong password with at least 8 characters, including symbols and numbers. Never shared your credentials with anyone.</p>
                 </div>
              </div>
            </div>
          ) : activeTab === 'users' && userRole === 'admin' ? (
            <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-8">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">User Management</h2>
                <p className="text-slate-500 mt-2">Manage access levels for your broadcast station staff.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">User Email</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Role</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {usersBoard.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                              {u.email?.[0]}
                            </div>
                            <span className="text-sm font-medium text-slate-700">{u.email}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className={cn(
                            "text-[10px] px-2 py-1 rounded-full font-black uppercase border",
                            u.role === 'admin' ? "bg-red-50 text-red-600 border-red-100" :
                            u.role === 'editor' ? "bg-blue-50 text-blue-600 border-blue-100" :
                            "bg-slate-100 text-slate-500 border-slate-200"
                          )}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <select 
                            value={u.role}
                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer"
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
                 <div className="p-2 bg-blue-100 rounded-lg">
                   <SettingsIcon className="w-5 h-5 text-blue-600" />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-blue-900">Permissions Logic</h4>
                    <ul className="mt-2 space-y-1">
                      <li className="text-xs text-blue-700">• <strong>Admin:</strong> Full access to all data, settings, and user roles.</li>
                      <li className="text-xs text-blue-700">• <strong>Editor:</strong> Can add and edit data, but cannot change global settings or roles.</li>
                      <li className="text-xs text-blue-700">• <strong>Viewer:</strong> Read-only access to dashboards and lists.</li>
                    </ul>
                 </div>
              </div>
            </div>
          ) : null}


        <SettingsWizard 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </main>

      {/* Delete Confirmation Wizard */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-slate-100 overflow-hidden relative"
            >
              {/* Decoration */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-red-500" />
              
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-inner">
                  <Trash2 className="w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Confirm Deletion</h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed px-4">
                    Are you sure you want to permanently remove this item from the station? This action cannot be undone.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={() => {
                      setDeleteConfirmId(null);
                      setDeleteTarget(null);
                    }}
                    className="py-4 bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    No, Keep it
                  </button>
                  <button 
                    onClick={executeDelete}
                    className="py-4 bg-red-500 text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, type = 'text' }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, type?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
      />
    </div>
  );
}

import { useEffect, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff,
  Settings, 
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
  Trophy,
  Image as ImageIcon,
  MapPin,
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

interface ImageOverlaySettings {
  image_url: string;
  location_name: string;
  footer_heading: string;
  footer_description: string;
  is_active: boolean;
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
  top_message: string;
  bottom_message: string;
  branch_name: string;
  phone_number?: string;
  sort_order?: number;
  display_duration?: number;
  is_active: boolean;
}

export default function ControlPanel({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'overlay-input' | 'overlay-image' | 'overlay-winner' | 'branch-address' | 'users'>('dashboard');
  const [stats, setStats] = useState({ today: 0, total: 0 });
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [usersBoard, setUsersBoard] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [winners, setWinners] = useState<WinnerData[]>([]);
  const [winnerForm, setWinnerForm] = useState<WinnerData>({
    subject: '',
    bill_no: '',
    gift_name: '',
    is_visible: true
  });
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [noticeForm, setNoticeForm] = useState({
    content: '',
    is_active: true,
    display_duration: 10
  });
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    phone: '',
    sort_order: 0,
    is_active: true,
    display_duration: 12
  });
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [product, setProduct] = useState<Product>({
    product_name: '',
    sku: '',
    price: '',
    discount: '',
    product_short_description: '',
    branch_name: '',
    branch_location: '',
  });
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [history, setHistory] = useState<ToastHistory[]>([]);
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTickerId, setEditingTickerId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<'ticker' | 'winner' | 'product' | null>(null);

  const [currentBranchIndex, setCurrentBranchIndex] = useState(0);
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);
  const [imageOverlay, setImageOverlay] = useState({
    image_url: '',
    is_active: false,
    width: '300px',
    position: 'bottom-right',
    opacity: 100
  });

  useEffect(() => {
    const activeNotices = tickerItems.filter(i => i.type === 'notice' && i.is_active);
    const activeBranches = tickerItems.filter(i => i.type === 'branch' && i.is_active);

    const timer = setInterval(() => {
      if (activeNotices.length > 0) {
        setCurrentNoticeIndex(prev => (prev + 1) % activeNotices.length);
      }
      if (activeBranches.length > 0) {
        setCurrentBranchIndex(prev => (prev + 1) % activeBranches.length);
      }
    }, 6000);

    return () => clearInterval(timer);
  }, [tickerItems]);

  const previewNotice = tickerItems.filter(i => i.type === 'notice' && i.is_active)[currentNoticeIndex];
  const previewBranch = tickerItems.filter(i => i.type === 'branch' && i.is_active)[currentBranchIndex];

  useEffect(() => {
    fetchStats();
    fetchHistory();
    fetchProducts();
    fetchImageOverlay();
    fetchWinners();
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
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Error fetching branch ticker:", error);
    } else {
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
        is_active: noticeForm.is_active,
        display_duration: noticeForm.display_duration
      }).eq('id', editingTickerId);
      setEditingTickerId(null);
    } else {
      result = await supabase
        .from('branch_ticker')
        .insert([{ 
          type: 'notice',
          top_message: noticeForm.content,
          branch_name: '',
          bottom_message: '',
          is_active: noticeForm.is_active,
          display_duration: noticeForm.display_duration,
          user_id: user.id 
        }]);
    }

    if (result?.error) {
      alert(`SQL Error: ${result.error.message}`);
    } else {
      setNoticeForm({ content: '', is_active: true, display_duration: 10 });
      setShowNoticeForm(false);
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
        display_duration: branchForm.display_duration
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
          user_id: user.id 
        }]);
    }
    
    if (result?.error) {
      alert(`SQL Error: ${result.error.message}`);
    } else {
      setBranchForm({ name: '', address: '', phone: '', sort_order: 0, is_active: true, display_duration: 12 });
      setShowBranchForm(false);
      fetchBranches();
    }
  }

  function editTickerItem(item: TickerItem) {
    setEditingTickerId(item.id!);
    if (item.type === 'notice') {
      setNoticeForm({
        content: item.top_message,
        is_active: item.is_active,
        display_duration: item.display_duration || 10
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
        display_duration: item.display_duration || 12
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

  async function executeDelete() {
    if (!deleteConfirmId || !deleteTarget) return;

    let error;
    if (deleteTarget === 'ticker') {
      const result = await supabase.from('branch_ticker').delete().eq('id', deleteConfirmId);
      error = result.error;
      if (!error) fetchBranches();
    } else if (deleteTarget === 'winner') {
      const result = await supabase.from('winners').delete().eq('id', deleteConfirmId);
      error = result.error;
      if (!error) fetchWinners();
    } else if (deleteTarget === 'product') {
      const result = await supabase.from('products').delete().eq('id', deleteConfirmId);
      error = result.error;
      if (!error) fetchProducts();
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
    
    // 2. Fetch fresh active counts
    const { data: items } = await supabase
      .from('branch_ticker')
      .select('type, is_active')
      .eq('is_active', true);

    const activeNotices = items?.filter(i => i.type === 'notice').length || 0;
    const activeBranches = items?.filter(i => i.type !== 'notice').length || 0;

    // 3. Sync master settings
    const { data: settings } = await supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle();
    if (settings) {
      let updates: any = {};
      if (activeNotices === 0 && settings.notice_section_enabled) updates.notice_section_enabled = false;
      if (activeBranches === 0 && settings.branch_section_enabled) updates.branch_section_enabled = false;
      
      if (Object.keys(updates).length > 0) {
        await supabase.from('settings').update(updates).eq('id', settings.id);
      }
    }

    fetchBranches();
  }

  async function fetchWinners() {
    const { data, error } = await supabase
      .from('winners')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching winners:", error);
    } else {
      setWinners(data || []);
    }
  }

  async function saveWinner() {
    if (userRole === 'viewer') return;
    if (!winnerForm.subject || !winnerForm.bill_no || !winnerForm.gift_name) {
      alert("Please fill all fields: Subject, Bill No, and Gift Name.");
      return;
    }
    
    const { error } = await supabase
      .from('winners')
      .insert([{ 
        subject: winnerForm.subject,
        bill_no: winnerForm.bill_no,
        gift_name: winnerForm.gift_name,
        is_visible: winnerForm.is_visible,
        user_id: user.id 
      }]);
    
    if (!error) {
      alert("Winner added successfully!");
      setWinnerForm({ subject: '', bill_no: '', gift_name: '', is_visible: true });
      fetchWinners();
    } else {
      console.error("Supabase Error (Winners):", error);
      alert(`Error saving winner: ${error.message}\n\nHint: Ensure the 'winners' table is created in your Supabase SQL editor.`);
    }
  }

  async function deleteWinner(id: string) {
    setDeleteConfirmId(id);
    setDeleteTarget('winner');
  }

  async function toggleWinnerVisibility(id: string, current: boolean) {
    const { error } = await supabase.from('winners').update({ is_visible: !current }).eq('id', id);
    if (error) {
      console.error("Toggle Error:", error);
      alert(`Failed to update visibility: ${error.message}`);
    } else {
      fetchWinners();
    }
  }

  async function fetchImageOverlay() {
    const { data } = await supabase
      .from('image_overlays')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setImageOverlay(data);
    }
  }

  async function saveImageOverlay() {
    if (userRole !== 'admin') {
      alert("Only admins can change global overlay images.");
      return;
    }
    const { error } = await supabase
      .from('image_overlays')
      .upsert({
        user_id: user.id,
        ...imageOverlay,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    
    if (!error) {
      alert("Overlay Image Settings Saved!");
    } else {
      console.error(error);
      alert("Failed to save settings.");
    }
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

  async function fetchProducts() {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    setSavedProducts(data || []);
    setLoading(false);
  }

  async function saveProduct() {
    if (!product.product_name) return;

    if (isEditing && product.id) {
      const { error } = await supabase
        .from('products')
        .update({
          product_name: product.product_name,
          sku: product.sku,
          price: product.price,
          discount: product.discount,
          product_short_description: product.product_short_description,
          branch_name: product.branch_name,
          branch_location: product.branch_location,
        })
        .eq('id', product.id);
      
      if (error) alert(error.message);
    } else {
      const { error } = await supabase
        .from('products')
        .insert([{ ...product, user_id: user.id }]);
      
      if (error) {
        alert(error.message);
      } else {
        alert("Product added successfully!");
      }
    }

    resetForm();
    fetchProducts();
  }

  async function deleteProduct(id: string) {
    setDeleteConfirmId(id);
    setDeleteTarget('product');
  }

  function editProduct(item: Product) {
    setProduct(item);
    setIsEditing(true);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setProduct({
      product_name: '',
      sku: '',
      price: '',
      discount: '',
      product_short_description: '',
      branch_name: '',
      branch_location: '',
    });
    setIsEditing(false);
  }

  async function sendToOBS(data?: Product) {
    const targetProduct = data || product;
    if (!targetProduct.product_name) return;

    await supabase
      .from('toast_history')
      .insert([{ user_id: user.id, content: targetProduct }]);

    await supabase.channel('obs_alerts').send({
      type: 'broadcast',
      event: 'new_toast',
      payload: { ...targetProduct, user_id: user.id },
    });

    fetchStats();
    fetchHistory();
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
          <NavItem tab="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem tab="overlay-input" icon={Eye} label="Overlay Engine" />
          <NavItem tab="overlay-image" icon={ImageIcon} label="Overlay Image" />
          <NavItem tab="overlay-winner" icon={Trophy} label="Overlay Winner" />
          <NavItem tab="branch-address" icon={MapPin} label="Branch Address" />
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

        {activeTab === 'dashboard' ? (
          <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-12">
            {/* Dashboard Content ... */}
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Performance</h2>
              <p className="text-slate-500 mt-2">Real-time telemetry and data metrics from your broadcast station.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Events Dispatched Today</p>
                  <p className="text-5xl font-extrabold text-slate-900">{stats.today.toString().padStart(2, '0')}</p>
                </div>
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-7 h-7" />
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-slate-300 transition-colors">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Lifetime Transmissions</p>
                  <p className="text-5xl font-extrabold text-slate-900">{stats.total.toString().padStart(2, '0')}</p>
                </div>
                <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-7 h-7" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Recent Transmissions</h3>
                <Clock className="w-4 h-4 text-slate-300" />
              </div>
              <div className="divide-y divide-slate-50">
                {history.length === 0 ? (
                  <div className="p-16 text-center text-slate-300 italic text-sm">No transmissions detected yet</div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="px-8 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                          <Send className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.content.product_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.content.sku} • {item.content.price} BDT</p>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 bg-slate-50 px-3 py-1 rounded-lg self-start sm:self-center">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'overlay-image' ? (
          <div className="p-8 lg:p-12 max-w-7xl mx-auto flex flex-col gap-12">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Overlay Image</h2>
              <p className="text-slate-500 mt-2">Manage your 16:9 cinematic overlay with custom text fields.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
               {/* Config Form */}
               <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-8">
                  <div className="space-y-6">
                    <FormInput 
                      label="Background Image URL (16:9)" 
                      placeholder="https://images.unsplash.com/photo-..."
                      value={imageOverlay.image_url} 
                      onChange={v => setImageOverlay({...imageOverlay, image_url: v})} 
                    />
                    <FormInput 
                      label="Location Name" 
                      value={imageOverlay.location_name} 
                      onChange={v => setImageOverlay({...imageOverlay, location_name: v})} 
                    />
                    <FormInput 
                      label="Footer Heading" 
                      value={imageOverlay.footer_heading} 
                      onChange={v => setImageOverlay({...imageOverlay, footer_heading: v})} 
                    />
                    <FormInput 
                      label="Footer Description" 
                      value={imageOverlay.footer_description} 
                      onChange={v => setImageOverlay({...imageOverlay, footer_description: v})} 
                    />
                    
                    <div className="flex items-center gap-3 pt-2">
                       <input 
                         type="checkbox" 
                         id="overlay-active" 
                         checked={imageOverlay.is_active}
                         onChange={e => setImageOverlay({...imageOverlay, is_active: e.target.checked})}
                         className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                       />
                       <label htmlFor="overlay-active" className="text-xs font-bold text-slate-600 uppercase tracking-widest">Active on Stream</label>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex gap-4">
                    <button 
                      onClick={saveImageOverlay}
                      className="flex-1 bg-blue-600 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-blue-700 transition-all text-[10px] flex items-center justify-center gap-3 shadow-lg shadow-blue-100"
                    >
                      <Save className="w-4 h-4" /> Save Configuration
                    </button>
                    <button 
                      onClick={() => window.open(`${getAppUrl()}/imgoverlay`, '_blank')}
                      className="px-6 bg-slate-900 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-slate-800 transition-all text-[10px] flex items-center justify-center gap-3"
                    >
                      <ExternalLink className="w-4 h-4" /> Live
                    </button>
                  </div>
               </div>

               {/* Visual Preview */}
               <div className="space-y-6">
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Cinematic Preview</p>
                  <div className="aspect-video bg-slate-950 rounded-2xl relative overflow-hidden shadow-2xl border border-slate-800">
                     {imageOverlay.image_url ? (
                       <img src={imageOverlay.image_url} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Preview" referrerPolicy="no-referrer" />
                     ) : (
                       <div className="absolute inset-0 flex items-center justify-center text-slate-700 font-bold uppercase tracking-widest text-[10px]">No Background Loaded</div>
                     )}
                     
                     <div className="absolute top-4 left-4 scale-[0.4] origin-top-left space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="bg-red-600 px-4 py-2 flex items-center gap-2 rounded-lg">
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                            <span className="text-white font-black tracking-widest text-xl uppercase">LIVE</span>
                          </div>
                          <h1 className="text-white text-4xl font-bold tracking-tight">{imageOverlay.location_name} (Live)</h1>
                        </div>
                        <div className="bg-slate-900/90 border border-white/10 p-6 rounded-xl w-fit">
                           <div className="flex items-center gap-4">
                              <Clock className="w-10 h-10 text-white" />
                              <div className="text-white text-5xl font-black tabular-nums tracking-tighter">04:04 <span className="text-2xl opacity-60 font-medium">PM</span></div>
                           </div>
                        </div>
                     </div>

                     <div className="absolute bottom-0 left-0 right-0 p-4 scale-[0.4] origin-bottom-left w-[250%]">
                        <div className="bg-slate-950/90 border-t border-white/10 p-10 flex items-center gap-8">
                           <div className="w-16 h-16 bg-blue-600/20 rounded-full border border-blue-500/30 flex items-center justify-center">
                             <Users className="w-10 h-10 text-white" />
                           </div>
                           <div>
                              <h2 className="text-white text-4xl font-black mb-1">{imageOverlay.footer_heading}</h2>
                              <p className="text-white/60 text-xl font-medium">{imageOverlay.footer_description}</p>
                           </div>
                        </div>
                     </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                     <p className="text-[10px] uppercase font-bold tracking-widest text-blue-600 mb-2">Station Authority</p>
                     <div className="flex items-center gap-3">
                        <code className="flex-1 bg-white p-3 rounded-lg border border-blue-100 text-[10px] font-mono text-blue-800">{getAppUrl()}/imgoverlay</code>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${getAppUrl()}/imgoverlay`);
                            alert("Link Copied!");
                          }}
                          className="bg-white p-3 rounded-lg border border-blue-100 text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        ) : activeTab === 'overlay-winner' ? (
          <div className="p-8 lg:p-12 max-w-7xl mx-auto flex flex-col gap-12">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Winner Management</h2>
              <p className="text-slate-500 mt-2">Manage the list of winners for the live broadcast overlay.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
              {/* Form and List */}
              <div className="space-y-8">
                {/* Entry Form */}
                <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-black text-xs">NEW</div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Add New Winner</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Subject / Event</label>
                       <input 
                         id="winner-subject"
                         placeholder="e.g. Weekly Raffle"
                         value={winnerForm.subject}
                         onChange={e => setWinnerForm({...winnerForm, subject: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Winner Bill No</label>
                       <input 
                         id="winner-bill"
                         placeholder="e.g. 123456"
                         value={winnerForm.bill_no}
                         onChange={e => setWinnerForm({...winnerForm, bill_no: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                       />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Gift Name</label>
                     <input 
                       id="winner-gift"
                       placeholder="e.g. Smartphone"
                       value={winnerForm.gift_name}
                       onChange={e => setWinnerForm({...winnerForm, gift_name: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                     />
                  </div>

                  <button 
                    id="add-winner-btn"
                    onClick={saveWinner}
                    disabled={userRole === 'viewer' || !winnerForm.subject || !winnerForm.bill_no || !winnerForm.gift_name}
                    className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-slate-800 transition-all disabled:opacity-30 text-[10px] flex items-center justify-center gap-3 shadow-xl"
                  >
                    <Plus className="w-4 h-4" /> Add to List
                  </button>
                </div>

                {/* Active Winners Table */}
                <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                  <div className="px-8 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Current Winners</h3>
                    <Trophy className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="divide-y divide-slate-50">
                    {winners.length === 0 ? (
                      <div className="p-12 text-center text-slate-300 italic text-sm">No winners recorded</div>
                    ) : (
                      winners.map((w) => (
                        <div key={w.id} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                              w.is_visible ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"
                            )}>
                              <Trophy className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{w.bill_no}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{w.gift_name} • {w.subject}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <button 
                               onClick={() => toggleWinnerVisibility(w.id!, w.is_active)}
                               disabled={userRole === 'viewer'}
                               className={cn(
                                 "p-2 rounded-lg border transition-all",
                                 w.is_visible ? "bg-green-50 border-green-200 text-green-600" : "bg-slate-50 border-slate-200 text-slate-400",
                                 userRole === 'viewer' && "opacity-50 cursor-not-allowed"
                               )}
                               title={w.is_visible ? "Hide for Overlay" : "Show for Overlay"}
                             >
                               <Eye className="w-4 h-4" />
                             </button>
                             {userRole !== 'viewer' && (
                               <button 
                                 onClick={() => deleteWinner(w.id!)}
                                 className="p-2 bg-red-50 border border-red-100 rounded-lg text-red-400 hover:text-red-600 transition-all"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Area */}
              <div className="space-y-6">
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Live Overlay Preview</p>
                <div className="aspect-video bg-slate-950 rounded-3xl relative overflow-hidden shadow-2xl border border-white/5 flex flex-col items-center justify-center p-12">
                   {/* Background pattern */}
                   <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                   
                   <div className="z-10 w-full max-w-sm space-y-4">
                      <AnimatePresence mode="popLayout">
                        {winners.filter(w => w.is_visible).slice(0, 3).map((w, i) => (
                           <motion.div
                             key={w.id}
                             initial={{ opacity: 0, x: -20 }}
                             animate={{ opacity: 1, x: 0 }}
                             exit={{ opacity: 0, x: 20 }}
                             className="bg-slate-900/90 border-l-4 border-amber-500 p-4 shadow-xl flex items-center gap-4"
                           >
                             <div className="p-2 bg-amber-500/10 rounded-full">
                               <Trophy className="w-5 h-5 text-amber-500" />
                             </div>
                             <div>
                               <p className="text-[8px] text-amber-500 font-black uppercase tracking-widest">{w.subject}</p>
                               <h4 className="text-white text-lg font-black italic">Bill: {w.bill_no}</h4>
                               <p className="text-white/40 text-[10px] font-medium uppercase tracking-tight">Gift: {w.gift_name}</p>
                             </div>
                           </motion.div>
                        ))}
                      </AnimatePresence>
                   </div>
                   
                   {winners.filter(w => w.is_visible).length === 0 && (
                     <div className="text-white/10 flex flex-col items-center gap-4">
                        <Trophy className="w-16 h-16" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Broadcast Station Standby</p>
                     </div>
                   )}
                </div>

                <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
                   <p className="text-[10px] uppercase font-bold tracking-widest text-amber-600 mb-2">Overlay Authority</p>
                   <div className="flex items-center gap-3">
                      <code className="flex-1 bg-white p-3 rounded-lg border border-amber-100 text-[10px] font-mono text-amber-800">{getAppUrl()}/winner/{user.id}</code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${getAppUrl()}/winner/${user.id}`);
                          alert("Link Copied!");
                        }}
                        className="bg-white p-3 rounded-lg border border-amber-100 text-amber-600 hover:bg-amber-50 transition-all shadow-sm"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'branch-address' ? (
          <div className="p-8 lg:p-12 max-w-[1600px] mx-auto flex flex-col gap-12">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ticker Segments</h2>
              <p className="text-slate-500 mt-2">Independently manage Notice and Branch address segments for your live ticker.</p>
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
                      <div className="md:col-span-3">
                        <FormInput 
                          label="Notice Text" 
                          placeholder="e.g. বিশেষ ছাড় অফার চলছে..."
                          value={noticeForm.content} 
                          onChange={v => setNoticeForm({...noticeForm, content: v})} 
                        />
                      </div>
                      <FormInput 
                        label="Display Time (Seconds)" 
                        type="number"
                        value={noticeForm.display_duration.toString()} 
                        onChange={v => setNoticeForm({...noticeForm, display_duration: parseInt(v) || 10})} 
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
                             <th className="pb-4 pt-2 font-bold">Notice Content</th>
                             <th className="pb-4 pt-2 font-bold text-center">Status</th>
                             <th className="pb-4 pt-2 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {tickerItems.filter(i => i.type === 'notice').map(item => (
                            <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 font-medium text-xs text-slate-800">{item.top_message}</td>
                              <td className="py-4 text-center">
                                <button 
                                  onClick={() => toggleTickerItemStatus(item.id!, item.is_active, 'notice')}
                                  className={cn("p-2 rounded-lg border transition-all", item.is_active ? "bg-green-50 text-green-600 border-green-100" : "bg-slate-50 text-slate-400 border-slate-100")}
                                >
                                  {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
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
                          <div className="w-[80px] bg-[#004a99] h-full flex items-center justify-center">
                             <span className="text-white font-black text-xs italic font-bangla">নোটিশ</span>
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
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 border-2 border-red-600 text-red-600 font-bold uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all text-[10px] shadow-sm"
                      >
                        <Sliders className="w-4 h-4" /> Control Panel
                      </button>
                    )}
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
                              <td className="py-5 pl-4 font-bold text-xs text-slate-900">{item.branch_name}</td>
                              <td className="py-5 text-xs text-slate-500 font-medium">
                                {item.phone_number || '---'}
                              </td>
                              <td className="py-5 text-xs text-slate-400 truncate max-w-sm">
                                {item.bottom_message}
                              </td>
                              <td className="py-5 text-center">
                                <div className="flex items-center justify-center gap-3">
                                  <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-tighter w-12 text-right",
                                    item.is_active ? "text-green-600" : "text-slate-400"
                                  )}>
                                    {item.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                  <button 
                                    onClick={() => userRole !== 'viewer' && toggleTickerItemStatus(item.id!, item.is_active, 'branch')}
                                    disabled={userRole === 'viewer'}
                                    className={cn(
                                      "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                      item.is_active ? "bg-[#00a651]" : "bg-slate-200",
                                      userRole === 'viewer' && "opacity-50 cursor-not-allowed"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                        item.is_active ? "translate-x-5" : "translate-x-0"
                                      )}
                                    />
                                  </button>
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
                   <Settings className="w-5 h-5 text-blue-600" />
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
          ) : (
          <div className="p-8 lg:p-12 max-w-7xl mx-auto flex flex-col gap-12">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Overlay Engine</h2>
                <p className="text-slate-500 mt-2">Configure and broadcast graphics directly to OBS browser sources.</p>
              </div>
              <button onClick={fetchProducts} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors self-start">
                <RefreshCcw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh Database
              </button>
            </div>
            
            <div className="flex flex-col gap-10">
              {/* Asset Inventory */}
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-sm">
                       <Package className="w-5 h-5 text-slate-400" />
                     </div>
                     <div>
                       <h3 className="text-sm font-bold text-slate-900">Asset Inventory</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Database</p>
                     </div>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input placeholder="Filter Stack..." className="bg-white border border-slate-100 rounded-xl px-10 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/10 w-full sm:w-80 transition-all shadow-sm" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-50 bg-slate-50/50 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        <th className="px-8 py-4">Item Code</th>
                        <th className="px-8 py-4">Product Specs</th>
                        <th className="px-8 py-4">Valuation</th>
                        <th className="px-8 py-4">Station Details</th>
                        <th className="px-8 py-4 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-slate-600">
                      {savedProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-24 text-center text-slate-300 italic font-medium">No asset records discovered in database</td>
                        </tr>
                      ) : (
                        savedProducts.map((item) => (
                          <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5 font-mono text-slate-400 text-[11px]">{item.sku}</td>
                            <td className="px-8 py-5">
                              <span className="block text-slate-900 font-bold">{item.product_name}</span>
                              <span className="block text-[10px] text-slate-400 truncate max-w-[200px] uppercase tracking-wide mt-0.5">{item.product_short_description || '---'}</span>
                            </td>
                            <td className="px-8 py-5">
                              <span className="block text-slate-900 font-bold">{item.price} BDT</span>
                              {parseFloat(item.discount || '0') > 0 && <span className="block text-[10px] text-red-500 font-bold tracking-tight">▲ -{item.discount}</span>}
                            </td>
                            <td className="px-8 py-5">
                              <span className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider">{item.branch_name}</span>
                              <span className="block text-slate-300 text-[9px] uppercase tracking-widest mt-0.5 font-bold">{item.branch_location}</span>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex justify-end gap-2">
                                 <button 
                                   onClick={() => sendToOBS(item)}
                                   className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                                   title="Go Live"
                                 >
                                   <Send className="w-4 h-4" />
                                 </button>
                                 <button 
                                   onClick={() => editProduct(item)}
                                   className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 hover:border-slate-400 transition-all shadow-sm"
                                   title="Edit"
                                 >
                                   <Edit2 className="w-4 h-4" />
                                 </button>
                                 <button 
                                   onClick={() => deleteProduct(item.id!)}
                                   className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
                                   title="Delete"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Asset Configuration */}
              <div className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-black text-xs">01</div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Asset Configuration</p>
                  </div>
                  {isEditing && (
                    <button onClick={resetForm} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:underline flex items-center gap-2">
                       <X className="w-3 h-3" /> Cancel Update
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <FormInput 
                    label="Product Name" 
                    value={product.product_name} 
                    onChange={v => setProduct({...product, product_name: v})} 
                  />
                  <FormInput 
                    label="SKU Code" 
                    value={product.sku} 
                    onChange={v => setProduct({...product, sku: v})} 
                  />
                  <FormInput 
                    label="Price (BDT)" 
                    placeholder="0.00"
                    value={product.price} 
                    onChange={v => setProduct({...product, price: v})} 
                  />
                  <FormInput 
                    label="Discount" 
                    placeholder="0.00"
                    value={product.discount} 
                    onChange={v => setProduct({...product, discount: v})} 
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <FormInput 
                      label="Specs Summary" 
                      value={product.product_short_description} 
                      onChange={v => setProduct({...product, product_short_description: v})} 
                    />
                  </div>
                  <FormInput 
                    label="Branch" 
                    value={product.branch_name} 
                    onChange={v => setProduct({...product, branch_name: v})} 
                  />
                  <FormInput 
                    label="Location" 
                    value={product.branch_location} 
                    onChange={v => setProduct({...product, branch_location: v})} 
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-50">
                  <button 
                    onClick={saveProduct}
                    disabled={!product.product_name}
                    className="flex-1 bg-blue-600 text-white font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-30 text-[10px] flex items-center justify-center gap-3 shadow-lg shadow-blue-50 active:scale-[0.98]"
                  >
                    <Save className="w-4 h-4" /> {isEditing ? 'Sync Changes' : 'Save as Draft'}
                  </button>
                  <button 
                    onClick={() => sendToOBS()}
                    disabled={!product.product_name}
                    className="flex-1 bg-slate-900 text-white font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-slate-800 transition-all disabled:opacity-30 text-[10px] flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                  >
                    <Send className="w-4 h-4" /> Go Live Now
                  </button>
                </div>
              </div>

              {/* Real-time Preview Area */}
              <div className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm space-y-6 mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-black text-xs">02</div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Broadcast Visualization</p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-8">
                  <div className="aspect-video bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden flex flex-col justify-end p-8 shadow-inner group">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}></div>
                    
                    {product.product_name ? (
                      <div className="z-10 animate-in fade-in slide-in-from-left-8 duration-700">
                        <div className="bg-slate-950 border-l-[6px] border-blue-600 px-8 py-5 max-w-[450px] shadow-2xl">
                          <h2 className="text-white font-serif italic text-3xl truncate leading-tight">{product.product_name}</h2>
                          <div className="h-[1px] bg-white/10 my-3" />
                          <div className="flex justify-between items-end gap-4">
                             <div className="space-y-1 overflow-hidden">
                               <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono truncate">{product.sku}</p>
                               <p className="text-[10px] text-slate-300 max-w-[220px] truncate uppercase tracking-wider">{product.product_short_description || 'ACTIVE SIGNAL'}</p>
                             </div>
                             <div className="text-right shrink-0">
                               {product.discount && <p className="text-[10px] text-red-500 line-through mb-1 font-mono">{product.price} BDT</p>}
                               <p className="text-2xl text-white font-light tracking-tighter">{product.discount ? (parseFloat(product.price) - (parseFloat(product.discount) || 0)).toFixed(2) : product.price} <span className="text-[11px] opacity-30 font-bold ml-1">BDT</span></p>
                             </div>
                          </div>
                        </div>
                        <div className="h-1 bg-blue-600/40 mt-1" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center opacity-10">
                        <Zap className="w-12 h-12 mb-4" />
                        <p className="text-xs font-bold uppercase tracking-[0.3em]">Ready for Transmission</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col justify-center space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Stream Authority</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${getAppUrl()}/overlay`);
                          alert("Station Link Copied!");
                        }}
                        className="text-[11px] font-bold text-blue-600 flex items-center gap-2 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-100"
                      >
                        <Copy className="w-3 h-3" /> Copy URL
                      </button>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-50 overflow-hidden">
                      <code className="text-[10px] font-mono text-slate-500 break-all leading-relaxed">{getAppUrl()}/overlay</code>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-relaxed italic border-t border-slate-50 pt-4">
                      Connect this source to OBS Studio or vMix using standard 1920x1080 resolution. This static link will display all broadcast events.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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

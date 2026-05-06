import { useEffect, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { 
  Plus, 
  Trash2, 
  Eye, 
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
} from 'lucide-react';
import { cn, getAppUrl } from '../lib/utils';

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

interface Branch {
  id?: string;
  top_message: string;
  bottom_message: string;
  branch_name: string;
  is_active: boolean;
}

export default function ControlPanel({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'overlay-input' | 'overlay-image' | 'overlay-winner' | 'branch-address'>('dashboard');
  const [stats, setStats] = useState({ today: 0, total: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [winners, setWinners] = useState<WinnerData[]>([]);
  const [winnerForm, setWinnerForm] = useState<WinnerData>({
    subject: '',
    bill_no: '',
    gift_name: '',
    is_visible: true
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchForm, setBranchForm] = useState<Branch>({
    top_message: '',
    bottom_message: '',
    branch_name: '',
    is_active: true
  });
  const [imageOverlay, setImageOverlay] = useState<ImageOverlaySettings>({
    image_url: '',
    location_name: 'Ryans Operations Office',
    footer_heading: 'Our team is actively working to serve you better.',
    footer_description: 'Ensuring faster support & service for customers across Bangladesh.',
    is_active: true
  });
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

  useEffect(() => {
    fetchStats();
    fetchHistory();
    fetchProducts();
    fetchImageOverlay();
    fetchWinners();
    fetchBranches();
  }, [user.id]);

  async function fetchBranches() {
    const { data } = await supabase
      .from('branch_ticker')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setBranches(data || []);
  }

  async function saveBranch() {
    if (!branchForm.top_message || !branchForm.bottom_message || !branchForm.branch_name) {
      alert("Please fill all fields.");
      return;
    }
    const { error } = await supabase
      .from('branch_ticker')
      .insert([{ ...branchForm, user_id: user.id }]);
    
    if (!error) {
      alert("Branch added successfully!");
      setBranchForm({ top_message: '', bottom_message: '', branch_name: '', is_active: true });
      fetchBranches();
    } else {
      alert(error.message);
    }
  }

  async function deleteBranch(id: string) {
    if (!confirm('Are you sure?')) return;
    await supabase.from('branch_ticker').delete().eq('id', id);
    fetchBranches();
  }

  async function toggleBranchStatus(id: string, current: boolean) {
    await supabase.from('branch_ticker').update({ is_active: !current }).eq('id', id);
    fetchBranches();
  }

  async function fetchWinners() {
    const { data, error } = await supabase
      .from('winners')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching winners:", error);
      // Only alert if it's a real error, not just an empty result
      if (error.code !== 'PGRST116') { // PGRST116 is often 'no rows' but sometimes table missing
         // alert(`Database Error: ${error.message}. Please ensure the 'winners' table exists.`);
      }
    } else {
      setWinners(data || []);
    }
  }

  async function saveWinner() {
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
    if (!confirm('Are you sure?')) return;
    await supabase.from('winners').delete().eq('id', id);
    fetchWinners();
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
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setImageOverlay(data);
    }
  }

  async function saveImageOverlay() {
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
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: todayCount } = await supabase
      .from('toast_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    setHistory(data || []);
  }

  async function fetchProducts() {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
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
    if (!confirm('Are you sure?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert(error.message);
    fetchProducts();
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
        </nav>

        <div className="p-6 border-t border-slate-50 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4">
             <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1 truncate">Current Operator</p>
             <p className="text-xs font-bold text-slate-700 truncate">{user.email}</p>
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
                    disabled={!winnerForm.subject || !winnerForm.bill_no || !winnerForm.gift_name}
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
                               onClick={() => toggleWinnerVisibility(w.id!, w.is_visible)}
                               className={cn(
                                 "p-2 rounded-lg border transition-all",
                                 w.is_visible ? "bg-green-50 border-green-200 text-green-600" : "bg-slate-50 border-slate-200 text-slate-400"
                               )}
                               title={w.is_visible ? "Hide for Overlay" : "Show for Overlay"}
                             >
                               <Eye className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => deleteWinner(w.id!)}
                               className="p-2 bg-red-50 border border-red-100 rounded-lg text-red-400 hover:text-red-600 transition-all"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
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
          <div className="p-8 lg:p-12 max-w-7xl mx-auto flex flex-col gap-12">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Branch Address Ticker</h2>
              <p className="text-slate-500 mt-2">Manage your branch ticker messages for the live broadcast ticker overlay.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
              <div className="space-y-8">
                {/* Branch Entry Form */}
                <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center font-black text-xs">NEW</div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Add New Ticker Item</p>
                  </div>
                  
                  <div className="space-y-4">
                    <FormInput 
                      label="Branch Name" 
                      placeholder="e.g. Multiplan Center"
                      value={branchForm.branch_name} 
                      onChange={v => setBranchForm({...branchForm, branch_name: v})} 
                    />
                    <FormInput 
                      label="Top Message (Green Line)" 
                      placeholder="e.g. Continuous power, everywhere"
                      value={branchForm.top_message} 
                      onChange={v => setBranchForm({...branchForm, top_message: v})} 
                    />
                    <FormInput 
                      label="Bottom Message (Blue Line)" 
                      placeholder="e.g. Buy a microwave and win a scratch card!"
                      value={branchForm.bottom_message} 
                      onChange={v => setBranchForm({...branchForm, bottom_message: v})} 
                    />
                  </div>

                  <button 
                    onClick={saveBranch}
                    className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-slate-800 transition-all text-[10px] flex items-center justify-center gap-3 shadow-xl"
                  >
                    <Plus className="w-4 h-4" /> Add to Ticker
                  </button>
                </div>

                {/* Ticker List */}
                <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                  <div className="px-8 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Ticker Items</h3>
                    <MapPin className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="divide-y divide-slate-50">
                    {branches.length === 0 ? (
                      <div className="p-12 text-center text-slate-300 italic text-sm">No ticker items found</div>
                    ) : (
                      branches.map((b) => (
                        <div key={b.id} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                              b.is_active ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                            )}>
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{b.branch_name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-xs">{b.bottom_message}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <button 
                               onClick={() => toggleBranchStatus(b.id!, b.is_active)}
                               className={cn(
                                 "p-2 rounded-lg border transition-all",
                                 b.is_active ? "bg-green-50 border-green-200 text-green-600" : "bg-slate-50 border-slate-200 text-slate-400"
                               )}
                             >
                               <Eye className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => deleteBranch(b.id!)}
                               className="p-2 bg-red-50 border border-red-100 rounded-lg text-red-400 hover:text-red-600 transition-all"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Area */}
              <div className="space-y-6">
                 <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Ticker Live Preview</p>
                 <div className="aspect-video bg-slate-900 rounded-3xl relative overflow-hidden shadow-2xl border border-white/5 flex flex-col justify-end p-0">
                    <div className="w-full h-[60px] bg-slate-800 flex flex-col pointer-events-none">
                       {/* Top Line */}
                       <div className="h-1/2 bg-[#00a651] flex items-center border-b border-white/5">
                          <div className="w-[80px] bg-[#004a99] h-full flex items-center justify-center">
                             <span className="text-white font-black text-[10px] italic">নোটিশ</span>
                          </div>
                          <div className="flex-1 px-4 text-white text-[10px] font-bold truncate">
                             {branchForm.top_message || 'Ticker Message Top'}
                          </div>
                       </div>
                       {/* Bottom Line */}
                       <div className="h-1/2 bg-[#004a99] flex items-center">
                          <div className="w-[80px] bg-[#00a651] h-full flex items-center justify-center text-center">
                             <span className="text-white font-bold text-[8px] px-1 whitespace-nowrap overflow-hidden">{branchForm.branch_name || 'Branch'}</span>
                          </div>
                          <div className="flex-1 px-4 text-white text-[8px] font-medium truncate">
                             {branchForm.bottom_message || 'Ticker Message Bottom'}
                          </div>
                          <div className="w-[60px] bg-[#ffc107] h-full flex items-center justify-center">
                             <span className="text-slate-900 font-bold text-[10px]">
                               {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                             </span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-green-50 border border-green-100 p-6 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-green-600 mb-2">Overlay Link</p>
                    <div className="flex items-center gap-3">
                       <code className="flex-1 bg-white p-3 rounded-lg border border-green-100 text-[10px] font-mono text-green-800">{getAppUrl()}/branchaddress/{user.id}</code>
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText(`${getAppUrl()}/branchaddress/${user.id}`);
                           alert("Link copied!");
                         }}
                         className="bg-white p-3 rounded-lg border border-green-100 text-green-600 hover:bg-green-50 transition-all shadow-sm"
                       >
                         <Copy className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
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
      </main>
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
      />
    </div>
  );
}

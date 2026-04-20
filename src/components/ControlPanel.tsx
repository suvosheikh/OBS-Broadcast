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
  Package
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

export default function ControlPanel({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'overlay-input'>('dashboard');
  const [stats, setStats] = useState({ today: 0, total: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [product, setProduct] = useState<Product>({
    product_name: '',
    sku: '',
    price: '',
    discount: '',
    product_short_description: '',
    branch_name: '',
    branch_location: '',
  });
  
  const [history, setHistory] = useState<ToastHistory[]>([]);
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchHistory();
    fetchProducts();
  }, [user.id]);

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
      
      if (error) alert(error.message);
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

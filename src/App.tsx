import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import ControlPanel from './components/ControlPanel';
import Overlay from './components/Overlay';
import ImageOverlay from './components/ImageOverlay';
import Login from './components/Login';
import { User } from '@supabase/supabase-js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900 text-white font-sans">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-neutral-800 rounded-full mb-4"></div>
          <p className="text-sm uppercase tracking-widest opacity-50">Loading Session...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Overlay Routes */}
        <Route path="/overlay/:userId" element={<Overlay />} />
        <Route path="/overlay" element={<Overlay />} />
        <Route path="/imgoverlay/:userId" element={<ImageOverlay />} />
        <Route path="/imgoverlay" element={<ImageOverlay />} />
        
        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={user ? <ControlPanel user={user} /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/admin" />} 
        />
        
        {/* Default redirect to admin */}
        <Route path="/" element={<Navigate to="/admin" />} />
      </Routes>
    </Router>
  );
}

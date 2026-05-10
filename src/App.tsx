import React, { useState, useEffect } from 'react';
import { onSnapshot, doc, collection, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './lib/firebase.ts';
import { AppConfig, MainSlot, ContentItem, ViewMode, Channel } from './types.ts';
import { handleFirestoreError, OperationType } from './lib/firestore-errors.ts';
import AdminPortal from './components/AdminPortal.tsx';
import MentorPortal from './components/MentorPortal.tsx';
import UserPortal from './components/UserPortal.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Flame, BookOpen, Megaphone, X, Info } from 'lucide-react';
import { cn } from './lib/utils.ts';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.USER);
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [mainSlots, setMainSlots] = useState<MainSlot[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMentor, setIsMentor] = useState(false);
  const [mentorInput, setMentorInput] = useState('');
  const [showMentorAuth, setShowMentorAuth] = useState(false);
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null);

  useEffect(() => {
    let configLoaded = false;
    let slotsLoaded = false;
    let itemsLoaded = false;
    let channelsLoaded = false;

    const checkLoading = () => {
      if (configLoaded && slotsLoaded && itemsLoaded && channelsLoaded) {
        setLoading(false);
      }
    };

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'app'), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as AppConfig);
      }
      configLoaded = true;
      checkLoading();
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'config/app');
      configLoaded = true;
      checkLoading();
    });

    const unsubSlots = onSnapshot(collection(db, 'mainSlots'), (snap) => {
      const slots = snap.docs.map(d => ({ id: d.id, ...d.data() } as MainSlot));
      setMainSlots(slots.sort((a, b) => (a.order || 0) - (b.order || 0)));
      slotsLoaded = true;
      checkLoading();
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'mainSlots');
      slotsLoaded = true;
      checkLoading();
    });

    const unsubItems = onSnapshot(collection(db, 'contentItems'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem));
      // Sort by creation time (ascending - oldest first as requested "add below")
      setContentItems(items.sort((a, b) => {
        const timeA = a.createdAt ? (typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime()) : 0;
        const timeB = b.createdAt ? (typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime()) : 0;
        return timeA - timeB;
      }));
      itemsLoaded = true;
      checkLoading();
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'contentItems');
      itemsLoaded = true;
      checkLoading();
    });

    const unsubChannels = onSnapshot(collection(db, 'channels'), (snap) => {
      const chs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Channel));
      setChannels(chs.sort((a, b) => {
        const timeA = a.createdAt ? (typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime()) : 0;
        const timeB = b.createdAt ? (typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime()) : 0;
        return timeA - timeB;
      }));
      channelsLoaded = true;
      checkLoading();
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'channels');
      channelsLoaded = true;
      checkLoading();
    });

    return () => {
      unsubAuth();
      unsubConfig();
      unsubSlots();
      unsubItems();
      unsubChannels();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const isAdmin = user?.email === (config?.adminEmail || 'kazih6684@gmail.com');

  const handleMentorLogin = () => {
    if (mentorInput === config?.mentorPassword && config?.mentorPassword) {
      setIsMentor(true);
      setShowMentorAuth(false);
      setViewMode(ViewMode.MENTOR);
    } else {
      alert('Incorrect Mentor Password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-brand-primary/30 relative overflow-hidden">
      {/* Animated Background Mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-brand-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-accent/10 rounded-full blur-[150px] delay-1000 animate-pulse" />
        <div className="absolute top-[40%] right-[-10%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[100px] delay-700 animate-pulse" />
      </div>

      {/* Dynamic View Selector */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-2">
        <button
          onClick={() => setViewMode(ViewMode.USER)}
          className={cn(
            "p-3 rounded-2xl transition-all duration-300 shadow-xl",
            viewMode === ViewMode.USER ? "glass-emerald text-brand-primary" : "bg-slate-900/50 text-slate-500 hover:text-white"
          )}
          title="User View"
        >
          <UserIcon size={20} />
        </button>
        
        <button
          onClick={() => setViewMode(ViewMode.ADMIN)}
          className={cn(
            "p-3 rounded-2xl transition-all duration-300 shadow-xl",
            viewMode === ViewMode.ADMIN ? "bg-brand-primary text-slate-950" : "bg-slate-900/50 text-slate-500 hover:text-white"
          )}
          title="Admin Control"
        >
          <Flame size={20} className="group-hover:animate-pulse" />
        </button>

        <button
          onClick={() => {
            if (isMentor || isAdmin) {
              setViewMode(ViewMode.MENTOR);
            } else {
              setShowMentorAuth(true);
            }
          }}
          className={cn(
            "p-3 rounded-2xl transition-all duration-300 shadow-xl",
            viewMode === ViewMode.MENTOR ? "bg-brand-accent text-slate-950" : "bg-slate-900/50 text-slate-500 hover:text-white"
          )}
          title="Mentor Dashboard"
        >
          <BookOpen size={20} />
        </button>
      </div>

      <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {viewMode === ViewMode.ADMIN ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <AdminPortal 
                user={user} 
                config={config} 
                mainSlots={mainSlots} 
                contentItems={contentItems} 
                channels={channels}
                isAdmin={isAdmin}
              />
            </motion.div>
          ) : viewMode === ViewMode.MENTOR ? (
            <motion.div
              key="mentor"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <MentorPortal 
                user={user} 
                config={config} 
                mainSlots={mainSlots} 
                contentItems={contentItems} 
                isMentor={isMentor || isAdmin}
              />
            </motion.div>
          ) : (
            <motion.div
              key="user"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <UserPortal 
                config={config} 
                mainSlots={mainSlots} 
                contentItems={contentItems} 
                channels={channels}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mentor Auth Modal */}
      <AnimatePresence>
        {showMentorAuth && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMentorAuth(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative glass p-8 rounded-[2.5rem] w-full max-w-md border-brand-accent/20 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent mx-auto mb-6">
                <BookOpen size={32} />
              </div>
              <h2 className="text-2xl font-bold text-center mb-2">Mentor Access</h2>
              <p className="text-slate-400 text-center text-sm mb-8">Enter the secure portal password assigned by the primary administrator.</p>
              
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="password" 
                    value={mentorInput}
                    onChange={e => setMentorInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleMentorLogin()}
                    placeholder="Mentor Password" 
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 focus:border-brand-accent outline-none font-mono text-center"
                    autoFocus
                  />
                </div>
                <button 
                  onClick={handleMentorLogin}
                  className="w-full py-4 bg-brand-accent text-slate-950 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-brand-accent/80 transition-all flex items-center justify-center gap-2"
                >
                  Unlock Dashboard
                </button>
                <button 
                  onClick={() => setShowMentorAuth(false)}
                  className="w-full text-slate-500 text-[10px] font-black uppercase tracking-widest pt-2 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Branding Footer */}
      <footer className="py-12 border-t border-slate-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-slate-950 font-bold text-xl">U</div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Unity Earning</h3>
              <p className="text-slate-500 text-sm italic">E-learning Platform</p>
            </div>
          </div>
          <div className="text-slate-600 text-sm font-mono">
            © 2026 Unity System • Premium Education
          </div>
        </div>
      </footer>
    </div>
  );
}

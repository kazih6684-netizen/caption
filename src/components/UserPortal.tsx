import React, { useState } from 'react';
import { AppConfig, MainSlot, ContentItem } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ChevronRight, Download, Box, Sparkles, Copy, Check, Megaphone, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils.ts';

interface UserPortalProps {
  config: AppConfig | null;
  mainSlots: MainSlot[];
  contentItems: ContentItem[];
}

export default function UserPortal({ config, mainSlots, contentItems }: UserPortalProps) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [parentStack, setParentStack] = useState<MainSlot[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const currentParentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (config?.isActivated === false) {
      setError('System is currently deactivated. Please contact support.');
      return;
    }
    if (password === config?.userPassword) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect access code. Please check with administrator.');
    }
  };

  const currentSlots = mainSlots.filter(s => (s.parentId || null) === (currentParentId || null));
  const currentItems = contentItems.filter(i => (i.slotId || null) === (currentParentId || null));

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `unity-earning-image-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-10 rounded-[2.5rem] max-w-md w-full shadow-2xl relative overflow-hidden text-center"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className={cn(
            "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3",
            (config?.isActivated === false) ? "bg-red-500 shadow-red-500/20" : "bg-brand-primary shadow-brand-primary/20"
          )}>
            <Lock size={36} className="text-slate-950" />
          </div>
          <h2 className="text-4xl font-bold mb-2 tracking-tight">Unity Earning</h2>
          <p className={cn(
            "text-sm mb-8 font-black uppercase tracking-widest",
            (config?.isActivated === false) ? "text-red-500" : "text-slate-400"
          )}>
            {(config?.isActivated === false) ? '● Status: Restricted' : '● Status: Active'}
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Access Password"
              className={cn(
                "w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 outline-none transition-all text-center font-mono tracking-widest focus:border-brand-primary",
                error && "border-red-500 animate-shake"
              )}
            />
            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
            <button className="w-full bg-brand-primary text-slate-950 font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-brand-primary/25 uppercase tracking-widest text-sm">
              Initialize Access
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="glass p-6 md:p-8 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl border-brand-primary/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl -z-10" />
        <div className="flex items-center gap-5">
          <button 
            onClick={() => setParentStack([])}
            className="w-14 h-14 bg-brand-primary rounded-2xl flex items-center justify-center text-slate-950 shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Sparkles size={28} />
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {parentStack.length > 0 ? parentStack[parentStack.length - 1].title : 'Unity Earning'}
            </h1>
            <div className="flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full", (config?.isActivated ?? true) ? "bg-brand-primary" : "bg-red-500")} />
              <p className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em]",
                (config?.isActivated ?? true) ? "text-brand-primary/80" : "text-red-500/80"
              )}>
                {(config?.isActivated ?? true) ? 'Access Active' : 'Access Restricted'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => setParentStack([])}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
              parentStack.length === 0 ? "bg-brand-primary text-slate-950 shadow-lg shadow-brand-primary/20" : "bg-slate-900 text-slate-500 hover:text-white"
            )}
          >
            Home
          </button>
          
          <a 
            href="https://whatsapp.com/channel/0029Vb8MfN14tRrjb3LjUS3D"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 hover:bg-[#25D366] hover:text-white"
          >
            <Megaphone size={14} />
            Channel
          </a>

          {parentStack.map((p, idx) => (
            <React.Fragment key={p.id}>
              <ChevronRight size={14} className="text-slate-600 shrink-0" />
              <button 
                onClick={() => setParentStack(prev => prev.slice(0, idx + 1))}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  idx === parentStack.length - 1 ? "bg-brand-primary text-slate-950 shadow-lg shadow-brand-primary/20" : "bg-slate-900 text-slate-500 hover:text-white"
                )}
              >
                {p.title}
              </button>
            </React.Fragment>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {currentSlots.map((slot, idx) => (
            <motion.div
              layout
              key={slot.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setParentStack(prev => [...prev, slot])}
              className="group cursor-pointer relative"
            >
              <div className="glass p-6 rounded-2xl h-full border-slate-800/50 hover:border-brand-primary/30 hover:bg-slate-900/80 transition-all duration-500 flex flex-col items-center justify-center text-center gap-4 shadow-xl">
                 <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center text-brand-primary group-hover:scale-110 group-hover:bg-brand-primary group-hover:text-slate-950 transition-all duration-500 shadow-inner">
                    <Box size={20} />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-white transition-colors leading-tight">{slot.title}</h3>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 gap-10 mt-10">
        <AnimatePresence mode="popLayout">
          {currentItems.map((item, index) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative"
            >
              <div className="glass rounded-[2rem] overflow-hidden border-slate-800/50 shadow-2xl transition-all duration-500 hover:border-brand-primary/20">
                <div className="p-6 md:p-8 space-y-8">
                   <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                     <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-brand-primary" />
                          <span className="text-[10px] font-black tracking-widest text-brand-primary uppercase">Content Data</span>
                        </div>
                        <div className="relative group/copy">
                          <p className="text-slate-200 text-sm md:text-base leading-relaxed font-semibold select-text selection:bg-brand-primary/40 whitespace-pre-wrap">
                            {item.description}
                          </p>
                          <button 
                            onClick={() => handleCopy(item.description, item.id)}
                            className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-950 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-slate-900 transition-all border border-slate-800"
                          >
                            {copiedId === item.id ? <Check size={12} className="text-brand-primary" /> : <Copy size={12} />}
                            {copiedId === item.id ? 'Copied' : 'Copy Content'}
                          </button>
                        </div>
                     </div>
                   </div>

                   {item.imageUrls && item.imageUrls.filter(url => url && url.trim() !== "").length > 0 && (
                     <div className="space-y-8 pt-8 border-t border-slate-800/50">
                       <div className="grid grid-cols-1 gap-12">
                         {item.imageUrls.filter(url => url && url.trim() !== "").map((url, i) => (
                           <div key={i} className="space-y-4">
                             <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner flex items-center justify-center min-h-[250px] group/img group">
                               <img 
                                 src={url} 
                                 className="w-full h-auto object-contain max-h-[1000px] transition-transform duration-700 group-hover:scale-105" 
                                 alt="" 
                                 referrerPolicy="no-referrer"
                                 onError={(e) => (e.currentTarget.style.display = 'none')}
                               />
                             </div>
                             <button 
                               onClick={() => handleDownload(url, i)}
                               className="w-full py-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center gap-3 text-slate-500 hover:text-slate-950 hover:bg-brand-primary hover:border-brand-primary transition-all duration-300 font-black uppercase tracking-widest text-[9px] shadow-lg"
                             >
                               <Download size={16} />
                               Download Image
                             </button>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {currentSlots.length === 0 && currentItems.length === 0 && (
        <div className="py-24 text-center space-y-6">
          <Sparkles size={48} className="text-slate-800 mx-auto opacity-10" />
          <p className="text-slate-600 font-black uppercase tracking-widest text-[10px]">No Content Found</p>
        </div>
      )}
    </div>
  );
}

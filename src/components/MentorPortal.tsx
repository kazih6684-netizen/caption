import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { db, logout, storage } from '../lib/firebase.ts';
import { AppConfig, MainSlot, ContentItem } from '../types.ts';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors.ts';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plus, Trash2, ChevronRight, Image as ImageIcon, Layout, Type, Box, Sparkles, BookOpen, Upload, Loader2, X, ExternalLink, AlertCircle, Save, Flame, Send, Lock, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils.ts';

interface MentorPortalProps {
  user: User | null;
  config: AppConfig | null;
  mainSlots: MainSlot[];
  contentItems: ContentItem[];
  isMentor: boolean;
  onExit?: () => void;
}

export default function MentorPortal({ config, mainSlots, contentItems, isMentor, onExit }: MentorPortalProps) {
  // Navigation State
  const [parentStack, setParentStack] = useState<MainSlot[]>([]);
  const currentParentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : null;

  // Confirmation State
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form States
  const [newSlotTitle, setNewSlotTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemImages, setNewItemImages] = useState('');
  const [authorName, setAuthorName] = useState('');
  
  // Error States
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Upload States
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    setUploading(true);
    setErrorMessage(null);
    setUploadProgress(10);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        setUploadingFileName(file.name);
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `content/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        urls.push(downloadURL);
        setUploadProgress(((i + 1) / files.length) * 100);
      }
    } catch (error: any) {
      console.error('Storage upload error:', error);
      let msg = error.message || 'Unknown storage error';
      setErrorMessage(`Upload Failed: ${msg}`);
      throw error;
    }
    return urls;
  };

  const currentSlots = mainSlots.filter(s => (s.parentId || null) === (currentParentId || null));
  const currentItems = contentItems.filter(i => (i.slotId || null) === (currentParentId || null));

  const handleAddSlot = async () => {
    if (!newSlotTitle) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await addDoc(collection(db, 'mainSlots'), {
        title: newSlotTitle,
        parentId: currentParentId,
        order: currentSlots.length,
        createdAt: serverTimestamp(),
      });
      setNewSlotTitle('');
    } catch (err: any) {
      setErrorMessage(`Failed to add module: ${err.message}`);
      handleFirestoreError(err, OperationType.WRITE, 'mainSlots');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemDesc) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      let finalImageUrls: string[] = [];
      
      if (selectedFiles.length > 0) {
        finalImageUrls = await uploadFiles(selectedFiles);
      } else {
        finalImageUrls = newItemImages.split(',').map(url => url.trim()).filter(url => url !== "");
      }
      
      await addDoc(collection(db, 'contentItems'), {
        slotId: currentParentId || null,
        description: newItemDesc,
        authorName: authorName.trim() || 'Anonymous',
        imageUrls: finalImageUrls,
        createdAt: serverTimestamp(),
      });
      
      setNewItemDesc('');
      setAuthorName('');
      setNewItemImages('');
      setSelectedFiles([]);
      setUploadProgress(0);
      setUploadingFileName(null);
    } catch (err: any) {
      setErrorMessage(`Failed to save caption: ${err.message}`);
      handleFirestoreError(err, OperationType.WRITE, 'contentItems');
    } finally {
      setIsProcessing(false);
      setUploading(false);
    }
  };

  const handleDeleteItem = async (id: string, type: 'slot' | 'item' = 'item') => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      if (type === 'slot') {
        await deleteDoc(doc(db, 'mainSlots', id));
      } else {
        await deleteDoc(doc(db, 'contentItems', id));
      }
      setConfirmingDeleteId(null);
    } catch (err: any) {
      setErrorMessage(`Delete Failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isMentor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass p-12 rounded-[3rem] border-brand-accent/20"
        >
          <div className="w-20 h-20 bg-brand-accent/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-brand-accent animate-pulse">
            <Lock size={40} />
          </div>
          <h2 className="text-3xl font-black mb-4">Mentor Protocol</h2>
          <p className="text-slate-500 max-w-xs">Access restricted to verified creators only.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
       <header className="glass p-8 rounded-[3rem] flex flex-col md:flex-row md:items-center justify-between gap-6 border-brand-accent/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-32 h-32 bg-brand-accent/5 rounded-full blur-3xl -z-10" />
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-brand-accent rounded-[1.5rem] flex items-center justify-center text-slate-950 shadow-xl shadow-brand-accent/20">
            <Flame size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tight">Mentor Panel</h1>
            <div className="flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full", (config?.isActivated ?? true) ? "bg-brand-accent" : "bg-red-500")} />
              <p className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em]",
                (config?.isActivated ?? true) ? "text-brand-accent" : "text-red-500"
              )}>
                {(config?.isActivated ?? true) ? 'Access Active' : 'Access Restricted'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <button 
              onClick={() => setParentStack([])}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                parentStack.length === 0 ? "bg-brand-accent text-slate-950 shadow-lg" : "bg-slate-900/50 text-slate-400"
              )}
            >
              Root
            </button>
            {parentStack.map((p, idx) => (
              <React.Fragment key={p.id}>
                <ChevronRight size={14} className="text-slate-600 shrink-0" />
                <button 
                  onClick={() => setParentStack(prev => prev.slice(0, idx + 1))}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    idx === parentStack.length - 1 ? "bg-brand-accent text-slate-950 shadow-lg" : "bg-slate-900/50 text-slate-400"
                  )}
                >
                  {p.title}
                </button>
              </React.Fragment>
            ))}
          </div>
          <div className="w-px h-8 bg-slate-800 mx-2 hidden md:block" />
          <button 
            onClick={() => {
              logout();
              if (onExit) onExit();
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <LogOut size={14} />
            Exit
          </button>
        </div>
      </header>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <section className="glass p-8 rounded-[2.5rem] border-brand-accent/10 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-accent/10 rounded-lg text-brand-accent"><Layout size={20} /></div>
              <h2 className="text-xl font-black text-white">Modules</h2>
            </div>
            
            <div className="space-y-4">
              <div className="relative group">
                <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent group-focus-within:scale-125 transition-transform" size={18} />
                <input 
                  type="text" 
                  value={newSlotTitle} 
                  onChange={(e) => setNewSlotTitle(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSlot()}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 focus:border-brand-accent outline-none transition-all text-sm font-bold" 
                  placeholder="New Module Title..."
                />
              </div>
              <button 
                onClick={handleAddSlot}
                disabled={!newSlotTitle || isProcessing}
                className="w-full bg-brand-accent text-slate-950 font-black py-4 rounded-2xl disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-accent/20 uppercase tracking-widest text-[10px]"
              >
                {isProcessing ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Add Module"}
              </button>
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-800/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Current Directory</p>
              {currentSlots.length === 0 && <p className="text-[10px] text-slate-600 italic">No sub-modules found here.</p>}
              {currentSlots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between group bg-slate-900/30 p-4 rounded-2xl border border-slate-800 hover:border-brand-accent/20 hover:bg-slate-900/50 transition-all shadow-sm">
                  <div onClick={() => setParentStack(prev => [...prev, slot])} className="flex-1 flex items-center gap-3 cursor-pointer group">
                    <span className="text-sm font-bold text-slate-300 group-hover:text-brand-accent transition-colors truncate">{slot.title}</span>
                    {contentItems.filter(i => i.slotId === slot.id).length > 0 && (
                      <span className="bg-brand-accent/10 text-brand-accent text-[10px] font-black px-2 py-0.5 rounded-lg border border-brand-accent/20">
                        {contentItems.filter(i => i.slotId === slot.id).length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingDeleteId(slot.id);
                      }}
                      className="p-2.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      title="Delete Module"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button 
                      onClick={() => setParentStack(prev => [...prev, slot])} 
                      className="p-2.5 hover:bg-brand-accent hover:text-slate-950 rounded-xl transition-all text-brand-accent/40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <section className="glass p-8 rounded-[2.5rem] border-brand-accent/10 shadow-2xl space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-accent/10 rounded-lg text-brand-accent"><Type size={20} /></div>
                <h2 className="text-xl font-black text-white">Add Caption</h2>
              </div>
              <div className="px-3 py-1 bg-slate-950 rounded-full border border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {currentParentId ? 'Internal' : 'Main'}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-accent/40 group-focus-within:text-brand-accent transition-colors">
                    <Sparkles size={18} />
                  </div>
                  <input 
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Writter Name (e.g. Mentor Jibon)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-16 pr-6 py-4 focus:border-brand-accent outline-none transition-all text-sm font-bold placeholder:text-slate-700" 
                  />
                </div>
                <textarea 
                  value={newItemDesc} 
                  onChange={(e) => setNewItemDesc(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 focus:border-brand-accent outline-none transition-all min-h-[140px] text-sm font-medium" 
                  placeholder="Type or paste your caption here..."
                />
              </div>

              <AnimatePresence>
                {selectedFiles.length > 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4"
                  >
                    <div className="p-4 bg-brand-accent/10 rounded-2xl border border-brand-accent/20 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-brand-accent">
                        <ImageIcon size={14} />
                        {selectedFiles.length} Images Selected
                      </div>
                      <button onClick={() => setSelectedFiles([])} className="text-slate-500 hover:text-white"><X size={14} /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" />
                  <button className="w-full py-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase text-slate-400 hover:border-brand-accent/30 hover:bg-slate-800 transition-all">
                    <ImageIcon size={16} />
                    Attach Images
                  </button>
                </div>
                
                <button 
                  onClick={handleAddItem}
                  disabled={isProcessing || uploading || !newItemDesc}
                  className="flex-[2] bg-brand-accent text-slate-950 font-black py-4 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-30 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-brand-accent/20 uppercase tracking-widest text-xs"
                >
                  {uploading ? <Loader2 className="animate-spin" size={20} /> : (isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />)}
                  Save Caption
                </button>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-brand-accent">
                    <span>Uploading: {uploadingFileName}</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-brand-accent" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {errorMessage && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold">
                  <AlertCircle size={18} />
                  {errorMessage}
                  <button onClick={() => setErrorMessage(null)} className="ml-auto"><X size={14} /></button>
                </motion.div>
              )}
            </div>
          </section>

          <section className="space-y-6">
             <div className="flex items-center gap-3 px-4">
                <div className="p-2 bg-slate-900 rounded-lg text-slate-500"><BookOpen size={16} /></div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Saved Captions</h3>
             </div>
             
             {currentItems.length === 0 && (
               <div className="glass p-12 text-center rounded-[2.5rem] border-dashed border-slate-800">
                 <p className="text-xs font-bold text-slate-600">No captions here yet.</p>
               </div>
             )}

             <div className="space-y-4">
               {currentItems.map(item => (
                 <div key={item.id} className="glass p-5 rounded-3xl border-slate-800/50 hover:bg-slate-900/60 transition-all">
                   <div className="flex gap-6">
                     <div className="flex-1 space-y-4">
                        {item.authorName && (
                          <div className="flex items-center gap-3">
                            <div className="bg-brand-accent/10 border border-brand-accent/20 px-3 py-1.5 rounded-lg">
                              <p className="text-[9px] font-black text-brand-accent uppercase tracking-[0.1em]">
                                WRITTER: <span className="text-white ml-1">{item.authorName}</span>
                              </p>
                            </div>
                            <div className="h-px flex-1 bg-slate-800/50" />
                          </div>
                        )}
                        <p className="text-sm text-slate-200 font-medium whitespace-pre-wrap select-text">{item.description}</p>
                        {item.imageUrls && item.imageUrls.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {item.imageUrls.map((url, i) => (
                              <img key={i} src={url} className="w-16 h-16 rounded-xl object-cover border border-slate-800" alt="" referrerPolicy="no-referrer" />
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Created: {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Now'}</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(item.description);
                                alert('Caption Copied!');
                              }}
                              className="text-[10px] font-black text-brand-accent uppercase tracking-widest hover:underline"
                            >
                              Copy Text
                            </button>
                          </div>
                          <button 
                            onClick={() => setConfirmingDeleteId(item.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {confirmingDeleteId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-slate-950/60">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass p-10 rounded-[3rem] border-red-500/20 max-w-sm w-full text-center space-y-8"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto text-red-500">
                <Trash2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">Delete Item?</h3>
                <p className="text-slate-500 font-medium">This content will be permanently deleted.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDeleteItem(confirmingDeleteId, currentSlots.some(s => s.id === confirmingDeleteId) ? 'slot' : 'item')}
                  disabled={isProcessing}
                  className="w-full bg-red-500 text-white font-black py-4 rounded-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                >
                  {isProcessing && <Loader2 className="animate-spin" size={18} />} Delete
                </button>
                <button 
                  onClick={() => setConfirmingDeleteId(null)}
                  className="w-full bg-slate-900 text-slate-400 font-black py-4 rounded-2xl hover:text-white transition-all uppercase tracking-widest text-xs"
                >
                  Return to Workspace
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, logout, storage, loginWithGoogle } from '../lib/firebase.ts';
import { AppConfig, MainSlot, ContentItem } from '../types.ts';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors.ts';
import { setDoc, doc, addDoc, collection, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plus, Trash2, LogOut, ChevronRight, Image as ImageIcon, Layout, Type, ShieldCheck, Box, Sparkles, BookOpen, Upload, Loader2, X, ExternalLink, AlertCircle, Key, User as UserIcon, ShieldAlert, Save, Flame, Bell, ToggleRight, MessageSquare, ListTree, Settings, Shield, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils.ts';

interface AdminPortalProps {
  user: User | null;
  config: AppConfig | null;
  mainSlots: MainSlot[];
  contentItems: ContentItem[];
  isAdmin: boolean;
}

export default function AdminPortal({ user, config, mainSlots, contentItems, isAdmin }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'slots' | 'settings'>('slots');
  const [userPassword, setUserPassword] = useState(config?.userPassword || '');
  const [mentorPassword, setMentorPassword] = useState(config?.mentorPassword || '');
  const [adminPassword, setAdminPassword] = useState(config?.adminPassword || '');
  const [isActivated, setIsActivated] = useState(config?.isActivated ?? true);
  
  useEffect(() => {
    if (config) {
      setUserPassword(config.userPassword || '');
      setMentorPassword(config.mentorPassword || '');
      setAdminPassword(config.adminPassword || '');
      setIsActivated(config.isActivated ?? true);
    }
  }, [config]);

  // Navigation State
  const [parentStack, setParentStack] = useState<MainSlot[]>([]);
  const currentParentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : null;

  // Confirmation State
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form States
  const [newSlotTitle, setNewSlotTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemImages, setNewItemImages] = useState('');
  
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
    try {
      await addDoc(collection(db, 'mainSlots'), {
        title: newSlotTitle,
        parentId: currentParentId,
        order: currentSlots.length,
        createdAt: serverTimestamp(),
      });
      setNewSlotTitle('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'mainSlots');
    }
  };

  const handleAddItem = async () => {
    if (!newItemDesc) return;
    
    setIsDeleting(true);
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
        imageUrls: finalImageUrls,
        createdAt: serverTimestamp(),
      });
      
      setNewItemDesc('');
      setNewItemImages('');
      setSelectedFiles([]);
      setUploadProgress(0);
      setUploadingFileName(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'contentItems');
    } finally {
      setIsDeleting(false);
      setUploading(false);
    }
  };

  const handleDeleteItem = async (id: string, type: 'slot' | 'item' = 'item') => {
    setIsDeleting(true);
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
      setIsDeleting(false);
    }
  };

  const handleUpdateConfig = async () => {
    try {
      await setDoc(doc(db, 'config', 'app'), { 
        userPassword,
        mentorPassword,
        adminPassword,
        isActivated,
        adminEmail: user?.email || 'kazih6684@gmail.com'
      }, { merge: true });
      alert('System Configuration Updated Successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/app');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass p-10 rounded-[3rem] border-red-500/20 max-w-sm w-full"
        >
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500 border border-red-500/20">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-2xl font-black mb-3 text-white">Admin Access</h2>
          <p className="text-slate-500 text-sm mb-8">
            {user ? `Connected as ${user.email}. This account is not authorized as an administrator.` : 'Administrator authentication is required to access these systems.'}
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={() => loginWithGoogle()}
              className="w-full bg-brand-primary text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-brand-primary/20"
            >
              <LogIn size={16} /> Login with Google
            </button>
            
            {user && (
              <button 
                onClick={() => logout()}
                className="w-full bg-slate-900 border border-slate-800 text-slate-400 font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/10 hover:text-red-500 transition-all uppercase tracking-widest text-[10px]"
              >
                <LogOut size={16} /> Sign Out
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (confirmingDeleteId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass p-10 rounded-[3rem] border-red-500/20 max-w-sm w-full space-y-6"
        >
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
            <Trash2 size={40} />
          </div>
          <div className="space-y-2">
             <h3 className="text-xl font-black text-white">Delete Item?</h3>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">This action will permanently remove this data from the network.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handleDeleteItem(confirmingDeleteId, currentSlots.some(s => s.id === confirmingDeleteId) ? 'slot' : 'item')}
              disabled={isDeleting}
              className="w-full bg-red-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20"
            >
              {isDeleting ? <Loader2 className="animate-spin" size={14} /> : 'Confirm Deletion'}
            </button>
            <button 
              onClick={() => setConfirmingDeleteId(null)}
              className="w-full bg-slate-900 text-slate-500 font-black py-4 rounded-xl hover:text-white transition-all uppercase tracking-widest text-[10px] border border-slate-800"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <header className="glass p-8 rounded-[3rem] flex flex-col md:flex-row md:items-center justify-between gap-6 border-brand-primary/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-[100px] -z-10" />
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-brand-primary rounded-[1.5rem] flex items-center justify-center text-slate-950 shadow-xl shadow-brand-primary/20">
            <Shield size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tight">Unity Admin</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">Full Administrator Access</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/50 p-2 rounded-2xl border border-slate-800/50">
          <button 
            onClick={() => setActiveTab('slots')}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'slots' ? "bg-brand-primary text-slate-950 shadow-lg" : "text-slate-500 hover:text-white"
            )}
          >
            <ListTree size={16} /> Modules
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'settings' ? "bg-brand-primary text-slate-950 shadow-lg" : "text-slate-500 hover:text-white"
            )}
          >
            <Settings size={16} /> Config
          </button>
          <div className="w-px h-8 bg-slate-800 mx-2" />
          <button 
            onClick={() => logout()}
            className="flex items-center gap-3 px-5 py-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-inner text-xs font-black uppercase tracking-widest"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </header>


      <AnimatePresence mode="wait">
        {activeTab === 'slots' ? (
          <motion.div 
            key="slots"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            <div className="lg:col-span-4 space-y-8">
              <section className="glass p-8 rounded-[2.5rem] border-brand-primary/10 shadow-xl space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl -z-10" />
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary"><Layout size={20} /></div>
                  <h2 className="text-xl font-black text-white">Dashboard</h2>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
                  <button onClick={() => setParentStack([])} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-500">Main</button>
                  {parentStack.map((p, idx) => (
                    <React.Fragment key={p.id}>
                      <ChevronRight size={12} className="text-slate-700" />
                      <button 
                        onClick={() => setParentStack(prev => prev.slice(0, idx + 1))}
                        className="px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-[10px] font-black uppercase text-brand-primary"
                      >
                        {p.title}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <div className="relative group">
                    <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary opacity-50 group-focus-within:opacity-100 transition-opacity" size={18} />
                    <input 
                      type="text" 
                      value={newSlotTitle} 
                      onChange={(e) => setNewSlotTitle(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSlot()}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 focus:border-brand-primary outline-none transition-all text-sm font-bold shadow-inner" 
                      placeholder="Module Name..."
                    />
                  </div>
                  <button 
                    onClick={handleAddSlot}
                    disabled={!newSlotTitle}
                    className="w-full bg-brand-primary text-slate-950 font-black py-4 rounded-2xl disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-primary/20 uppercase tracking-[0.2em] text-[10px]"
                  >
                    Add Module
                  </button>
                </div>

                <div className="space-y-2 pt-6 border-t border-slate-800/50 max-h-[400px] overflow-y-auto scrollbar-hide">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-4 px-2">Sub Modules</p>
                  {currentSlots.length === 0 && <p className="text-[10px] text-slate-700 italic px-2">Empty</p>}
                   <AnimatePresence mode="popLayout">
                     {currentSlots.map(slot => (
                       <motion.div 
                         layout
                         key={slot.id} 
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, scale: 0.95 }}
                         className="flex items-center justify-between group bg-slate-950/40 p-4 rounded-xl border border-slate-800 hover:border-brand-primary/30 transition-all"
                       >
                         <span onClick={() => setParentStack(prev => [...prev, slot])} className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-brand-primary cursor-pointer transition-colors flex-1 pr-2 truncate">{slot.title}</span>
                         <div className="flex items-center gap-1.5">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingDeleteId(slot.id);
                              }} 
                              className="p-2 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                            <button 
                              onClick={() => setParentStack(prev => [...prev, slot])} 
                              className="p-2 text-brand-primary/20 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all"
                            >
                              <ChevronRight size={14} />
                            </button>
                         </div>
                       </motion.div>
                     ))}
                   </AnimatePresence>
                </div>
              </section>
            </div>

            <div className="lg:col-span-8 space-y-10">
              <section className="glass p-10 rounded-[3rem] border-brand-primary/10 shadow-2xl space-y-10">
                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary"><Type size={24} /></div>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-white">Add Caption</h2>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Post new update</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-slate-950 rounded-full border border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {currentParentId ? 'Internal' : 'Main'}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <textarea 
                      value={newItemDesc} 
                      onChange={(e) => setNewItemDesc(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-[2rem] p-8 focus:border-brand-primary outline-none transition-all min-h-[160px] text-base font-semibold shadow-inner" 
                      placeholder="Type or paste your caption content here..."
                    />
                  </div>

                  <AnimatePresence>
                    {selectedFiles.length > 0 && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="p-6 bg-brand-primary/10 rounded-2xl border border-brand-primary/20 flex items-center justify-between"
                      >
                         <div className="flex items-center gap-3 text-xs font-black uppercase text-brand-primary">
                            <ImageIcon size={18} />
                            {selectedFiles.length} Assets Staged
                         </div>
                         <button onClick={() => setSelectedFiles([])} className="text-slate-500 hover:text-white transition-colors"><X size={16} /></button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                <div className="flex flex-col md:flex-row gap-6">
                  <div className="relative flex-1">
                     <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" />
                     <div className="h-4/5 md:h-full border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center gap-3 py-5 bg-slate-900/30 hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all">
                        <ImageIcon size={20} className="text-slate-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Attach Images</span>
                     </div>
                  </div>
                  
                  <button 
                    onClick={handleAddItem}
                    disabled={isDeleting || uploading || !newItemDesc}
                    className="flex-[2] bg-brand-primary text-slate-950 font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 disabled:opacity-30 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-2xl shadow-brand-primary/20 uppercase tracking-[0.3em] text-sm"
                  >
                    {uploading ? <Loader2 className="animate-spin" size={24} /> : (isDeleting ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />)}
                    Save Caption
                  </button>
                </div>

                  {uploading && (
                    <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4 shadow-inner">
                      <div className="flex justify-between text-[11px] font-black uppercase text-brand-primary">
                        <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Uploading: {uploadingFileName}</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-brand-primary" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-sm font-black text-red-500 uppercase tracking-widest">
                      <AlertCircle size={20} />
                      <span className="flex-1">{errorMessage}</span>
                      <button onClick={() => setErrorMessage(null)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"><X size={16} /></button>
                    </motion.div>
                  )}
                </div>
              </section>

              <section className="space-y-6">
                 <div className="flex items-center gap-3 px-6">
                    <div className="p-2 bg-slate-900 rounded-lg text-slate-500"><BookOpen size={18} /></div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Saved Captions</h3>
                 </div>
                 
                 <div className="space-y-4 px-2">
                   {currentItems.length === 0 && (
                     <div className="glass p-12 text-center rounded-[2.5rem] border-dashed border-slate-800/50">
                       <p className="text-xs font-semibold text-slate-600">No captions recorded yet.</p>
                     </div>
                   )}
                   <AnimatePresence mode="popLayout">
                     {currentItems.map(item => (
                       <motion.div 
                         layout
                         key={item.id} 
                         initial={{ opacity: 0, scale: 0.98 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.98 }}
                         className="glass p-6 rounded-[2rem] border-slate-800/50 hover:bg-slate-900/60 transition-all"
                       >
                          <div className="space-y-4">
                             <p className="text-sm md:text-base text-slate-200 font-medium select-text whitespace-pre-wrap">{item.description}</p>
                             
                             {item.imageUrls && item.imageUrls.length > 0 && (
                               <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                 {item.imageUrls.map((url, i) => (
                                   <div key={i} className="w-20 h-20 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex-shrink-0 shadow-inner">
                                     <img src={url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                   </div>
                                 ))}
                               </div>
                             )}

                             <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                               <div className="flex flex-col gap-1">
                                 <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                   {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Syncing...'}
                                 </span>
                                 <button 
                                   onClick={() => {
                                     navigator.clipboard.writeText(item.description);
                                     alert('Copied Successfully!');
                                   }}
                                   className="text-[9px] font-black text-brand-primary uppercase tracking-widest hover:text-white transition-colors text-left"
                                 >
                                   Copy Content
                                 </button>
                               </div>
                               <button 
                                 onClick={() => setConfirmingDeleteId(item.id)}
                                 className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                               >
                                 <Trash2 size={12} />
                                 Delete
                               </button>
                             </div>
                          </div>
                       </motion.div>
                     ))}
                   </AnimatePresence>
                 </div>
              </section>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-4xl mx-auto"
          >
            <div className="glass p-12 rounded-[3.5rem] border-brand-primary/10 shadow-2xl relative overflow-hidden space-y-12">
               <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-[100px] -z-10" />
               
               <div className="space-y-4 text-center">
                  <div className="p-5 bg-brand-primary/10 rounded-[2rem] text-brand-primary inline-flex shadow-xl border border-brand-primary/20 mb-4"><ShieldCheck size={48} strokeWidth={2.5} /></div>
                  <h2 className="text-4xl font-black text-white tracking-tighter">System Settings</h2>
                  <p className="text-slate-500 font-medium max-w-sm mx-auto">Update system passwords and access keys.</p>
               </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="p-8 bg-slate-900/40 rounded-[2.5rem] border border-slate-800/80 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary shadow-inner"><UserIcon size={20} /></div>
                    <h3 className="font-black text-slate-200 uppercase tracking-widest text-[10px]">User Portal Password</h3>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                    <input 
                      type="text" 
                      value={userPassword} 
                      onChange={(e) => setUserPassword(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-14 pr-6 py-5 focus:border-brand-primary outline-none transition-all font-mono tracking-widest text-sm shadow-inner" 
                      placeholder="User Password..."
                    />
                  </div>
                </div>

                <div className="p-8 bg-slate-900/40 rounded-[2.5rem] border border-slate-800/80 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-accent/10 rounded-xl text-brand-accent shadow-inner"><Flame size={20} /></div>
                    <h3 className="font-black text-slate-200 uppercase tracking-widest text-[10px]">Mentor Password</h3>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                    <input 
                      type="text" 
                      value={mentorPassword} 
                      onChange={(e) => setMentorPassword(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-14 pr-6 py-5 focus:border-brand-accent outline-none transition-all font-mono tracking-widest text-sm shadow-inner" 
                      placeholder="Mentor Password..."
                    />
                  </div>
                </div>

                <div className="p-8 bg-red-500/5 rounded-[2.5rem] border border-red-500/10 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-xl text-red-500 shadow-inner"><ShieldAlert size={20} /></div>
                    <h3 className="font-black text-white uppercase tracking-widest text-[10px]">Main Admin Password</h3>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                    <input 
                      type="text" 
                      value={adminPassword} 
                      onChange={(e) => setAdminPassword(e.target.value)} 
                      className="w-full bg-slate-950 border border-red-500/10 rounded-2xl pl-14 pr-6 py-5 focus:border-red-500 outline-none transition-all font-mono tracking-widest text-sm shadow-inner text-red-500" 
                      placeholder="Admin Password..."
                    />
                  </div>
                </div>

                <div className="p-8 bg-brand-primary/5 rounded-[2.5rem] border border-brand-primary/10 space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary shadow-inner">
                        <ToggleRight size={20} />
                      </div>
                      <h3 className="font-black text-white uppercase tracking-widest text-[10px]">System Access Status</h3>
                    </div>
                    <button 
                      onClick={() => setIsActivated(!isActivated)}
                      className={cn(
                        "w-14 h-8 rounded-full transition-all relative flex items-center px-1",
                        isActivated ? "bg-brand-primary" : "bg-slate-800"
                      )}
                    >
                      <motion.div 
                        animate={{ x: isActivated ? 24 : 0 }}
                        className="w-6 h-6 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full animate-pulse", isActivated ? "bg-brand-primary" : "bg-red-500")} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {isActivated ? "Status: Access Active" : "Status: Access Restricted"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex flex-col md:flex-row gap-4">
                <button 
                  onClick={handleUpdateConfig}
                  className="flex-[2] bg-brand-primary text-slate-950 font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-2xl shadow-brand-primary/20 uppercase tracking-[0.3em] text-sm"
                >
                  <Save size={24} /> Save Configuration
                </button>
                <button 
                  onClick={() => logout()}
                  className="flex-1 bg-slate-950 border border-red-500/30 text-red-500 font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 hover:bg-red-500 hover:text-white transition-all uppercase tracking-[0.3em] text-sm"
                >
                  <LogOut size={24} /> Log Out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmingDeleteId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-950/60">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass p-12 rounded-[3.5rem] border-red-500/10 max-w-sm w-full text-center space-y-8 shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
            >
              <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto text-red-500 border border-red-500/20 shadow-inner">
                <Trash2 size={40} />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black text-white">Decommission?</h3>
                <p className="text-slate-500 font-semibold leading-relaxed">Permanent decommissioning of this resource is irreversible.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDeleteItem(confirmingDeleteId, currentSlots.some(s => s.id === confirmingDeleteId) ? 'slot' : 'item')}
                  disabled={isDeleting}
                  className="w-full bg-red-500 text-white font-black py-5 rounded-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                >
                  {isDeleting && <Loader2 className="animate-spin" size={20} />} Terminate Resource
                </button>
                <button 
                  onClick={() => setConfirmingDeleteId(null)}
                  className="w-full bg-slate-900 text-slate-500 font-black py-5 rounded-2xl hover:text-white transition-all uppercase tracking-widest text-xs border border-slate-800"
                >
                  Abort Protocol
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

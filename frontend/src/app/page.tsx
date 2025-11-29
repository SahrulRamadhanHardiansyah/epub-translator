"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import axios from "axios";
import { Upload, FileText, Settings, Download, LogOut, Type, Key, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Clock, BookOpen } from "lucide-react";

interface Job {
  id: string;
  filename: string;
  status: "pending" | "processing" | "completed" | "failed";
  download_url?: string;
  created_at: string;
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState(0);

  const [file, setFile] = useState<File | null>(null);
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [useOwnKey, setUseOwnKey] = useState(false);
  const [style, setStyle] = useState("Novel Fantasy, Immersive, Dramatic");

  const [status, setStatus] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const initSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        fetchQuota(session.user.id);
        fetchJobs(session.user.id);
      }
    };
    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchQuota(session.user.id);
        fetchJobs(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (session) {
      interval = setInterval(() => {
        fetchJobs(session.user.id);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [session]);

  const fetchQuota = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("quota_used").eq("id", userId).single();
    if (data) setQuota(data.quota_used);
  };

  const fetchJobs = async (userId: string) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/jobs/${userId}`);
      setJobs(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setQuota(0);
    setJobs([]);
    setSession(null);
  };

  const handleTranslate = async () => {
    if (!file) return alert("Mohon upload file EPUB terlebih dahulu.");
    if (!session) return alert("Silakan login untuk melanjutkan.");
    if (!useOwnKey && quota >= 3) return alert("Kuota server habis. Gunakan API Key Anda sendiri.");

    setLoading(true);
    setStatus("Memulai proses...");

    const formData = new FormData();
    formData.append("file", file);
    if (fontFile) formData.append("font", fontFile);
    formData.append("target_lang", "Indonesian");
    formData.append("style", style);
    formData.append("user_id", session.user.id);
    if (useOwnKey && apiKey) formData.append("api_key", apiKey);

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/translate`, formData);
      setStatus("Berhasil masuk antrian!");
      fetchJobs(session.user.id);
      if (!useOwnKey) setQuota((prev) => prev + 1);
    } catch (error: any) {
      alert("Gagal: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar Glassmorphism */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2 rounded-lg text-white">
              <BookOpen size={20} />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Epub<span className="font-light">Translate</span>
            </h1>
          </div>

          <div>
            {!session ? (
              <button onClick={handleLogin} className="group relative px-6 py-2.5 bg-slate-900 text-white rounded-full text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  Login Google <Sparkles size={14} />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            ) : (
              <div className="flex items-center gap-3 sm:gap-6">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kuota Server</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${quota >= 3 ? "bg-red-500" : "bg-green-500"}`} />
                    <span className={`text-sm font-bold ${quota >= 3 ? "text-red-600" : "text-slate-700"}`}>{quota}/3</span>
                  </div>
                </div>

                <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border border-white shadow-sm flex items-center justify-center text-indigo-700 font-bold text-sm">
                    {session.user.email?.charAt(0).toUpperCase()}
                  </div>
                  <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Keluar">
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto pt-24 p-6 pb-20">
        {/* Header Section */}
        <div className="text-center mb-32 mt-24 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">
            Terjemahkan Buku <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Dalam Hitungan Detik</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">Gunakan kekuatan AI Gemini untuk menerjemahkan EPUB favoritmu ke Bahasa Indonesia dengan gaya bahasa yang natural, dramatis, dan nyaman dibaca.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Upload & File Config */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-1 shadow-xl shadow-indigo-100/50 border border-white">
              <div className="bg-slate-50/50 rounded-[20px] p-6 border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm">1</span>
                    Upload Buku
                  </h3>
                  {file && <span className="text-xs font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">File Siap</span>}
                </div>

                <div
                  className={`
                  group relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300
                  ${file ? "border-indigo-400 bg-indigo-50/30" : "border-slate-300 hover:border-indigo-400 hover:bg-white"}
                `}
                >
                  <input type="file" accept=".epub" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />

                  <div className="relative z-10 flex flex-col items-center transition-transform duration-300 group-hover:-translate-y-1">
                    <div
                      className={`
                      p-4 rounded-full mb-4 shadow-sm transition-colors duration-300
                      ${file ? "bg-white text-indigo-600" : "bg-white text-slate-400 group-hover:text-indigo-500"}
                    `}
                    >
                      {file ? <CheckCircle2 size={32} /> : <Upload size={32} />}
                    </div>

                    <h4 className="text-base font-semibold text-slate-700 mb-1">{file ? file.name : "Klik atau Drag file EPUB ke sini"}</h4>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto">{file ? <span className="text-indigo-600 cursor-pointer hover:underline">Klik untuk ganti file</span> : "Mendukung format .epub standar. Maksimal 50MB."}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settings & Action */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-32">
            <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-slate-100 overflow-hidden">
              <div className="p-6 bg-white border-b border-slate-50">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                  <Settings size={20} className="text-slate-400" /> Konfigurasi
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Style Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">Gaya Bahasa</label>
                  <div className="relative">
                    <select
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none transition-all cursor-pointer hover:bg-slate-100"
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                    >
                      <option value="Formal but natural">Formal & Natural</option>
                      <option value="Novel Fantasy, Immersive, Dramatic">Novel Fantasi (Dramatis)</option>
                      <option value="Casual and easy to read">Santai & Ringan</option>
                      <option value="Literature, Poetic">Sastra & Puitis</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Sparkles size={16} />
                    </div>
                  </div>
                </div>

                {/* API Key Toggle */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Key size={16} className="text-slate-400" />
                      API Key Gemini
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={useOwnKey} onChange={(e) => setUseOwnKey(e.target.checked)} />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {useOwnKey ? (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <input
                        type="text"
                        placeholder="Paste AI Studio Key..."
                        className="w-full px-4 py-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                      <p className="text-[10px] text-slate-400 mt-2">Key Anda aman & tidak disimpan permanen.</p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-100">
                      <AlertCircle size={14} className="mt-0.5 text-orange-400 shrink-0" />
                      <p>Menggunakan kuota server ({quota}/3). Proses mungkin antri jika server sibuk.</p>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={handleTranslate}
                  disabled={loading || !session}
                  className={`
                    w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-indigo-200 transition-all duration-300 transform active:scale-[0.98]
                    ${loading ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-indigo-300 hover:-translate-y-1"}
                  `}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin" size={20} /> Memproses...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Mulai Terjemahkan <Sparkles size={18} />
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="mt-12 bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Riwayat Terjemahan</h3>
              <p className="text-sm text-slate-400">File Anda akan otomatis terhapus dari server setelah selesai.</p>
            </div>
            <button onClick={() => session && fetchJobs(session.user.id)} className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full text-sm font-medium transition-colors">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <FileText size={48} className="mb-4 text-slate-200" />
                <p>Belum ada riwayat terjemahan.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-8 py-4">Judul Buku</th>
                    <th className="px-8 py-4">Waktu</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {jobs.map((job) => (
                    <tr key={job.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-8 py-4 font-medium text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                            <BookOpen size={16} />
                          </div>
                          <span className="truncate max-w-[200px] sm:max-w-xs" title={job.filename}>
                            {job.filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-slate-500">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          {new Date(job.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          <span className="text-slate-300">|</span>
                          {new Date(job.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span
                          className={`
                          inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border
                          ${
                            job.status === "completed"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : job.status === "processing"
                              ? "bg-blue-50 text-blue-600 border-blue-100 animate-pulse"
                              : job.status === "failed"
                              ? "bg-red-50 text-red-600 border-red-100"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }
                        `}
                        >
                          {job.status === "completed" && <CheckCircle2 size={12} />}
                          {job.status === "processing" && <RefreshCw size={12} className="animate-spin" />}
                          {job.status}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        {job.status === "completed" && job.download_url ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL}${job.download_url}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-95"
                          >
                            <Download size={14} /> Download
                          </a>
                        ) : job.status === "failed" ? (
                          <span className="text-xs font-medium text-red-400 bg-red-50 px-3 py-1 rounded-lg">Gagal</span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 italic">Menunggu...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

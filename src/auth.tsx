import React, { useState } from "react";
import { X, UserPlus, LogIn } from "lucide-react";
import { register, login } from "./api";
import { useT } from "./i18n";

interface AuthModalProps {
  onClose: () => void;
  onAuth: (username: string) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuth }) => {
  const { t } = useT();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const fn = mode === "login" ? login : register;
      const data = await fn(username, password);
      onAuth(data.user.username);
    } catch (err: any) {
      setError(err.message || t("auth.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-3xl font-fantasy text-center mb-2 text-slate-100">
          {t(mode === "login" ? "menu.welcome" : "menu.newAdventurer")}
        </h2>
        <p className="text-center text-slate-500 text-sm mb-8">
          {t(mode === "login" ? "menu.signInDesc" : "menu.registerDesc")}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder={t("menu.username")}
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none transition-colors"
            minLength={2}
            maxLength={20}
            required
          />
          <input
            type="password"
            placeholder={t("menu.password")}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none transition-colors"
            minLength={4}
            required
          />

          {error && (
            <div className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="mt-2 px-6 py-3 bg-red-900 hover:bg-red-800 disabled:bg-slate-800 disabled:text-slate-600 border border-red-700 disabled:border-slate-700 rounded font-fantasy tracking-widest transition-all text-red-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">...</span>
            ) : mode === "login" ? (
              <><LogIn size={18} /> {t("auth.signIn")}</>
            ) : (
              <><UserPlus size={18} /> {t("auth.register")}</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            {t(mode === "login" ? "menu.noAccount" : "menu.hasAccount")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

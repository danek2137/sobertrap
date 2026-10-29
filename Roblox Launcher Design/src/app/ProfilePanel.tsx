import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Plus,
  Trash2,
  Save,
  Play,
  Gamepad2,
  Check,
  X,
  AlertCircle,
  Clock,
  RefreshCw,
  Edit,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const SECTION_HEADER = "flex items-center gap-2 text-xs font-mono text-foreground/50 tracking-widest uppercase mb-3 pb-2 border-b border-primary/20";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ProfilePanel({
  currentFflags,
  onApplyProfile,
  onLog,
}: {
  currentFflags: Record<string, unknown>;
  onApplyProfile: (fflags: Record<string, unknown>) => void;
  onLog: (level: "info" | "warn" | "success" | "error", message: string) => void;
}) {
  const [profiles, setProfiles] = useState<GameProfile[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGameName, setNewGameName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const persistProfiles = async (updated: GameProfile[]) => {
    setProfiles(updated);
    await window.api.saveTunerConfig({ profiles: updated });
  };

  const loadProfiles = async () => {
    setLoading(true);
    const res = await window.api.loadTunerConfig();
    if (res.success && res.config) {
      setProfiles((res.config as { profiles: GameProfile[] }).profiles || []);
    } else {
      onLog("error", "Failed to load profiles");
    }
    setLoading(false);
  };

  const createEmpty = async () => {
    const name = "New Profile";
    const profile: GameProfile = {
      id: crypto.randomUUID(),
      name,
      fflags: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await persistProfiles([...profiles, profile]);
    onLog("success", `Empty profile "${name}" created`);
  };

  const createFromCurrent = async () => {
    if (!newName.trim()) return;
    const profile: GameProfile = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      gameName: newGameName.trim() || undefined,
      fflags: { ...currentFflags },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await persistProfiles([...profiles, profile]);
    onLog("success", `Profile "${profile.name}" created`);
    setNewName("");
    setNewGameName("");
    setShowCreate(false);
  };

  const deleteProfile = async (id: string) => {
    const profile = profiles.find((p) => p.id === id);
    await persistProfiles(profiles.filter((p) => p.id !== id));
    onLog("info", `Profile "${profile?.name}" deleted`);
  };

  const applyProfile = async (profile: GameProfile) => {
    const updated = profiles.map((p) =>
      p.id === profile.id ? { ...p, updatedAt: Date.now() } : p
    );
    await persistProfiles(updated);
    onApplyProfile(profile.fflags);
    onLog("success", `Profile "${profile.name}" applied`);
  };

  const saveAsUpdate = async (profile: GameProfile) => {
    const updated = profiles.map((p) =>
      p.id === profile.id
        ? { ...p, fflags: { ...currentFflags }, updatedAt: Date.now() }
        : p
    );
    await persistProfiles(updated);
    onLog("success", `Profile "${profile.name}" updated with current flags`);
  };

  const startEdit = (profile: GameProfile) => {
    setEditingId(profile.id);
    setEditName(profile.name);
  };

  const commitEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const updated = profiles.map((p) =>
      p.id === editingId ? { ...p, name: editName.trim(), updatedAt: Date.now() } : p
    );
    await persistProfiles(updated);
    setEditingId(null);
    onLog("success", `Profile renamed to "${editName.trim()}"`);
  };

  const flagCount = (fflags: Record<string, unknown>) => Object.keys(fflags).length;

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="flex flex-col gap-5 h-full">
      <motion.div variants={fadeUp} className={SECTION_HEADER}>
        <Users size={12} />
        Game Profiles
      </motion.div>

      <motion.div variants={fadeUp} className="flex items-center gap-3 flex-wrap">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={createEmpty}
          className="flex items-center gap-2 px-4 py-2 bg-card text-foreground/70 text-xs font-mono rounded-lg border border-border hover:border-primary/30 hover:text-foreground transition-colors"
        >
          <Plus size={13} />
          NEW EMPTY
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black text-xs font-mono font-medium rounded-lg border border-primary/40 shadow-lg shadow-primary/20"
        >
          <Plus size={13} />
          FROM CURRENT
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={loadProfiles}
          className="flex items-center gap-2 px-4 py-2 bg-card text-foreground/70 text-xs font-mono rounded-lg border border-border hover:border-primary/30 transition-colors"
        >
          <RefreshCw size={13} />
          REFRESH
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-card border border-primary/40 rounded-xl">
              <input
                placeholder="Profile name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createFromCurrent()}
                className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-foreground/50 outline-none focus:border-primary/60"
                autoFocus
              />
              <input
                placeholder="Game name (optional)"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                className="w-44 bg-muted border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-foreground/50 outline-none focus:border-primary/60"
              />
              <button
                onClick={createFromCurrent}
                className="px-3 py-1.5 bg-primary text-black text-xs font-mono rounded-lg hover:bg-primary/90 transition-colors"
              >
                SAVE
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 bg-muted text-foreground/50 text-xs font-mono rounded-lg hover:text-foreground transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={fadeUp} className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs font-mono text-foreground/50">
            Loading profiles...
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Gamepad2 size={32} className="text-foreground/20" />
            <div className="text-xs font-mono text-foreground/50 text-center">
              No profiles yet. Create one from your current flags.
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {profiles.map((profile) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.18 }}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {editingId === profile.id ? (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="bg-muted border border-primary/60 rounded px-2 py-1 text-sm font-mono text-foreground outline-none flex-1"
                          autoFocus
                        />
                        <button onClick={commitEdit} className="text-primary hover:text-primary/80 text-xs font-mono">
                          <Check size={13} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-foreground/50 hover:text-foreground text-xs font-mono">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-foreground font-medium truncate">{profile.name}</span>
                        <button
                          onClick={() => startEdit(profile)}
                          className="text-foreground/30 hover:text-foreground/70 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Edit size={11} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] font-mono text-foreground/50">
                      {profile.gameName && (
                        <span className="flex items-center gap-1">
                          <Gamepad2 size={10} />
                          {profile.gameName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <AlertCircle size={10} />
                        {flagCount(profile.fflags)} flags
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(profile.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => applyProfile(profile)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-black text-xs font-mono font-medium rounded-lg border border-primary/40 hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Play size={11} className="fill-black" />
                      APPLY
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => saveAsUpdate(profile)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-card text-foreground/70 text-xs font-mono rounded-lg border border-border hover:border-primary/30 hover:text-foreground transition-colors"
                      title="Overwrite this profile with current flags"
                    >
                      <Save size={11} />
                      UPDATE
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteProfile(profile.id)}
                      className="p-1.5 text-foreground/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>
    </motion.div>
  );
}

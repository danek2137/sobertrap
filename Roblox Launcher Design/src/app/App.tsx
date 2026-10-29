import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import LiveBackground from "./components/LiveBackground";
import FFLAG_DESCRIPTIONS from "./fflagDescriptions";
import ExtrasPanel from "./ExtrasPanel";
import ProfilePanel from "./ProfilePanel";
import {
  Home,
  Settings,
  Zap,
  Puzzle,
  Info,
  Play,
  Circle,
  ChevronDown,
  Terminal,
  Globe,
  Monitor,
  Cpu,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Plus,
  Search,
  ExternalLink,
  Crosshair,
  Users,
} from "lucide-react";

type NavItem = "home" | "settings" | "fastflags" | "integrations" | "about" | "extras" | "profiles";

interface LogEntry {
  id: number;
  time: string;
  level: "info" | "warn" | "success" | "error";
  message: string;
}

interface FlagEntry {
  id: string;
  name: string;
  value: string;
  type: "bool" | "int" | "string";
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as number[] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const itemFade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 border ${
        enabled ? "bg-primary border-primary/50" : "bg-muted border-border"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm ${
          enabled ? "bg-black left-5" : "bg-muted-foreground left-0.5"
        }`}
      />
    </button>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border text-foreground text-xs font-mono rounded-lg hover:border-primary/50 transition-colors min-w-[140px] justify-between"
      >
        <span>{value}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={12} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.9 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ transformOrigin: "top" }}
            className="absolute top-full left-0 mt-1 w-full bg-popover border border-border rounded-lg z-50 overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-muted transition-colors ${
                  opt === value ? "text-primary" : "text-foreground/70"
                }`}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function toFlagEntries(fflags: Record<string, unknown>): FlagEntry[] {
  return Object.entries(fflags || {}).map(([name, value], i) => ({
    id: String(i),
    name,
    value: String(value),
    type: typeof value === "boolean" ? "bool" : typeof value === "number" ? "int" : "string",
  }));
}

function SidebarItem({ icon: Icon, active, onClick, tooltip }: {
  icon: React.ComponentType<{ size?: number }>;
  active: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      className={`p-3 transition-all duration-200 relative group no-drag rounded-xl w-14 h-14 flex items-center justify-center ${
        active
          ? 'text-primary bg-primary/10 shadow-lg shadow-primary/10'
          : 'text-primary/60 hover:text-primary hover:bg-primary/10'
      }`}
    >
      <Icon size={22} />
      {active && (
        <motion.div
          layoutId="active-glow"
          className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
          initial={false}
          transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.8 }}
        />
      )}
      <div className="absolute left-16 px-3 py-1.5 bg-black text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-primary/20 text-primary">
        {tooltip}
      </div>
    </button>
  );
}

function HomePanel({
  logs,
  launching,
  onLaunch,
  fflagCount,
}: {
  logs: LogEntry[];
  launching: boolean;
  onLaunch: () => void;
  fflagCount: number;
}) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const levelColor: Record<LogEntry["level"], string> = {
    info: "text-foreground/60",
    warn: "text-yellow-400",
    success: "text-primary",
    error: "text-red-400",
  };
  const levelIcon: Record<LogEntry["level"], React.ReactNode> = {
    info: <Circle size={6} className="fill-current mt-1.5" />,
    warn: <AlertCircle size={10} className="mt-1" />,
    success: <CheckCircle2 size={10} className="mt-1" />,
    error: <AlertCircle size={10} className="mt-1" />,
  };

  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-4 h-full"
    >
      <motion.div variants={itemFade} className="flex items-center gap-3">
        <div className="flex-1 grid grid-cols-3 gap-3">
          {[
            { label: "Status", value: "Ready", accent: "text-primary", icon: <Circle size={8} className="fill-primary" /> },
            { label: "Sober", value: "v1.7.0", accent: "text-foreground", icon: <Monitor size={14} /> },
            { label: "Active Flags", value: `${fflagCount}`, accent: "text-primary", icon: <Cpu size={14} /> },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                {s.icon}
              </div>
              <div>
                <div className="text-[10px] font-mono text-foreground/50 tracking-widest uppercase">{s.label}</div>
                <div className={`text-sm font-mono font-medium ${s.accent}`}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemFade} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-foreground/50 tracking-widest uppercase mb-1">Quick Launch</div>
            <div className="text-sm font-mono text-foreground/70">Launch Roblox with your current flag configuration</div>
          </div>
          <Play size={20} className="text-primary/30" />
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={onLaunch}
            disabled={launching}
            whileHover={launching ? {} : { scale: 1.02 }}
            whileTap={launching ? {} : { scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`group flex items-center gap-3 px-6 py-3 rounded-xl font-mono font-semibold text-sm tracking-wider border ${
              launching
                ? "bg-primary/20 text-foreground/60 cursor-not-allowed border-primary/30"
                : "bg-primary text-black border-primary/40 hover:bg-primary/90 shadow-lg shadow-primary/20"
            }`}
          >
            {launching ? (
              <>
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <RefreshCw size={16} />
                </motion.span>
                LAUNCHING...
              </>
            ) : (
              <>
                <Play size={16} className="fill-black" />
                LAUNCH ROBLOX
              </>
            )}
          </motion.button>
          <div className="flex gap-2">
            {[
              { icon: <Globe size={12} />, label: "Roblox.com" },
              { icon: <ExternalLink size={12} />, label: "Config" },
            ].map((a) => (
              <motion.button
                key={a.label}
                whileHover={{ scale: 1.03 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono text-foreground/50 border border-border hover:text-foreground hover:border-primary/30 transition-colors bg-muted"
              >
                {a.icon}
                {a.label}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemFade} className="flex-1 min-h-0 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Terminal size={12} className="text-foreground/50" />
            <span className="text-xs font-mono text-foreground/50 tracking-widest uppercase">Activity Log</span>
          </div>
          <span className="text-xs font-mono text-foreground/50">{logs.length}</span>
        </div>
        <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-1">
          <AnimatePresence initial={false}>
            {logs.length === 0 ? (
              <div className="text-xs font-mono text-foreground/30 text-center py-8">No activity yet</div>
            ) : (
              logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start gap-2 text-xs font-mono ${levelColor[log.level]}`}
                >
                  <span className="text-foreground/30 flex-shrink-0 mt-0.5 w-14 text-right">{log.time}</span>
                  <span className="flex-shrink-0">{levelIcon[log.level]}</span>
                  <span className="truncate">{log.message}</span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SettingsPanel({
  config,
  onConfigChange,
}: {
  config: Record<string, unknown>;
  onConfigChange: (c: Record<string, unknown>) => void;
}) {
  const fflags = (config.fflags as Record<string, unknown>) || {};

  const getFlag = (key: string, def: unknown) => key in fflags ? fflags[key] : def;
  const setFlag = (key: string, value: unknown) => {
    onConfigChange({
      ...config,
      fflags: { ...fflags, [key]: value },
    });
  };

  const renderer = getFlag("FFlagDebugGraphicsPreferVulkan", false) ? "Vulkan" : "OpenGL";
  const fps = String(getFlag("DFIntTaskSchedulerTargetFps", 60));
  const channel = String(getFlag("FFlagDebugReleaseChannelOverride", "LIVE") || "LIVE");

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="flex flex-col gap-5">
      <section>
        <motion.div variants={itemFade} className="flex items-center gap-2 text-xs font-mono text-foreground/50 tracking-widest uppercase mb-3 pb-2 border-b border-primary/20">
          <Monitor size={12} />
          Graphics
        </motion.div>
        <div className="space-y-1.5">
          {[
            {
              label: "Renderer",
              desc: "Graphics API used by Roblox",
              node: (
                <Select
                  value={renderer}
                  options={["OpenGL", "Vulkan"]}
                  onChange={(v) => setFlag("FFlagDebugGraphicsPreferVulkan", v === "Vulkan")}
                />
              ),
            },
            {
              label: "FPS Cap",
              desc: "Target framerate (0 = unlimited)",
              node: (
                <Select
                  value={fps}
                  options={["30", "60", "75", "120", "144", "165", "240", "0"]}
                  onChange={(v) => setFlag("DFIntTaskSchedulerTargetFps", parseInt(v))}
                />
              ),
            },
            {
              label: "Release Channel",
              desc: "LIVE is stable",
              node: (
                <Select
                  value={channel}
                  options={["LIVE", "ZINTEGRATION", "ZCANARY", "ZWINCANARY"]}
                  onChange={(v) => setFlag("FFlagDebugReleaseChannelOverride", v)}
                />
              ),
            },
          ].map((row) => (
            <motion.div
              key={row.label}
              variants={itemFade}
              className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors"
            >
              <div>
                <div className="text-sm font-mono text-foreground">{row.label}</div>
                <div className="text-xs font-mono text-foreground/50 mt-0.5">{row.desc}</div>
              </div>
              {row.node}
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <motion.div variants={itemFade} className="flex items-center gap-2 text-xs font-mono text-foreground/50 tracking-widest uppercase mb-3 pb-2 border-b border-primary/20">
          <Zap size={12} />
          Tweaks
        </motion.div>
        <div className="space-y-1.5">
          {[
            { key: "FFlagDisablePostFx", label: "Disable PostFX", desc: "Disable post-processing effects" },
            { key: "FFlagDisableBloom", label: "Disable Bloom", desc: "Remove bloom effect" },
            { key: "FFlagDisableDepthOfField", label: "Disable Depth of Field", desc: "Remove depth-of-field blur" },
            { key: "FFlagDisableGlobalShadows", label: "Disable Shadows", desc: "Turn off all shadows" },
            { key: "FFlagDebugDisplayFPS", label: "Show FPS Counter", desc: "Display FPS in-game" },
            { key: "DFFlagDebugPauseVoxelizer", label: "Pause Voxelizer", desc: "Freeze CSG voxelization" },
            { key: "FFlagEnableReducedLatency", label: "Reduced Latency", desc: "Lower input lag" },
          ].map((t) => {
            const enabled = getFlag(t.key, false) === true;
            return (
              <motion.div
                key={t.key}
                variants={itemFade}
                className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group"
              >
                <div>
                  <div className="text-sm font-mono text-foreground">{t.label}</div>
                  <div className="text-xs font-mono text-foreground/50 mt-0.5">{t.desc}</div>
                </div>
                <ToggleSwitch enabled={enabled} onToggle={() => setFlag(t.key, !enabled)} />
              </motion.div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}

function FastFlagsPanel({
  fflags,
  onFflagsChange,
}: {
  fflags: Record<string, unknown>;
  onFflagsChange: (f: Record<string, unknown>) => void;
}) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newFlag, setNewFlag] = useState({ name: "", value: "", type: "bool" as FlagEntry["type"] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const entries = toFlagEntries(fflags);
  const filtered = entries.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const removeFlag = (id: string) => {
    const name = entries.find((e) => e.id === id)?.name;
    if (!name) return;
    const copy = { ...fflags };
    delete copy[name];
    onFflagsChange(copy);
  };

  const addFlag = () => {
    if (!newFlag.name.trim()) return;
    const val = newFlag.type === "bool" ? newFlag.value === "true"
      : newFlag.type === "int" ? Number(newFlag.value)
      : newFlag.value;
    onFflagsChange({ ...fflags, [newFlag.name]: val });
    setNewFlag({ name: "", value: "", type: "bool" });
    setShowAdd(false);
  };

  const toggleFlag = (name: string) => {
    const val = fflags[name];
    if (typeof val === "boolean") onFflagsChange({ ...fflags, [name]: !val });
    else if (typeof val === "number") onFflagsChange({ ...fflags, [name]: val > 0 ? 0 : 1 });
    else if (val === "True") onFflagsChange({ ...fflags, [name]: "False" });
    else if (val === "False") onFflagsChange({ ...fflags, [name]: "True" });
    else onFflagsChange({ ...fflags, [name]: true });
  };

  const startEdit = (id: string, currentValue: string) => {
    setEditingId(id);
    setEditValue(currentValue);
  };

  const commitEdit = (id: string) => {
    const flag = entries.find((e) => e.id === id);
    if (!flag) return;
    let val: unknown = editValue;
    if (flag.type === "int") val = Number(editValue);
    else if (flag.type === "bool") val = editValue === "true";
    const copy = { ...fflags, [flag.name]: val };
    onFflagsChange(copy);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const typeColor: Record<FlagEntry["type"], string> = {
    bool: "text-primary",
    int: "text-yellow-400",
    string: "text-green-400",
  };

  const formatValue = (flag: FlagEntry): string => {
    if (flag.type === "bool") return "";
    return flag.value;
  };

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="flex flex-col gap-4 h-full">
      <motion.div variants={itemFade} className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
          <Search size={13} className="text-foreground/50 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search flags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs font-mono text-foreground placeholder:text-foreground/50 outline-none"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-black text-xs font-mono font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <motion.span animate={{ rotate: showAdd ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus size={13} />
          </motion.span>
          ADD FLAG
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-card border border-primary/40 rounded-lg">
              <input
                placeholder="FlagName"
                value={newFlag.name}
                onChange={(e) => setNewFlag((n) => ({ ...n, name: e.target.value }))}
                className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-foreground/50 outline-none focus:border-primary/60"
              />
              <input
                placeholder="Value"
                value={newFlag.value}
                onChange={(e) => setNewFlag((n) => ({ ...n, value: e.target.value }))}
                className="w-28 bg-muted border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-foreground/50 outline-none focus:border-primary/60"
              />
              <Select
                value={newFlag.type}
                options={["bool", "int", "string"]}
                onChange={(v) => setNewFlag((n) => ({ ...n, type: v as FlagEntry["type"] }))}
              />
              <button
                onClick={addFlag}
                className="px-3 py-1.5 bg-primary text-black text-xs font-mono rounded-lg hover:bg-primary/90 transition-colors"
              >
                SAVE
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 bg-muted text-foreground/50 text-xs font-mono rounded-lg hover:text-foreground transition-colors"
              >
                CANCEL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemFade} className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="grid grid-cols-[1fr_auto_auto_auto] flex-1 text-xs font-mono text-foreground/50 tracking-widest uppercase">
            <div className="px-2">Flag Name</div>
            <div className="px-2">Type</div>
            <div className="px-2">Value</div>
            <div className="w-8"></div>
          </div>
        </div>
        <div className="divide-y divide-border overflow-y-auto flex-1 min-h-0">
          <AnimatePresence initial={false}>
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-8 text-xs font-mono text-foreground/50 text-center"
              >
                No flags found
              </motion.div>
            ) : (
              filtered.map((flag) => (
                <motion.div
                  key={flag.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center hover:bg-muted/50 transition-colors group"
                >
                  <div className="px-4 py-2.5 text-xs font-mono text-foreground group/tip relative flex items-center gap-1.5 min-w-0" title={FFLAG_DESCRIPTIONS[flag.name] || flag.name}>
                    <span className="truncate">{flag.name}</span>
                    {FFLAG_DESCRIPTIONS[flag.name] && (
                      <span className="text-[10px] text-foreground/30 font-mono flex-shrink-0">&#9432;</span>
                    )}
                  </div>
                  <div className={`px-4 py-2.5 text-xs font-mono ${typeColor[flag.type]}`}>{flag.type}</div>
                  <div className="px-4 py-2.5 text-xs font-mono text-primary">
                    {flag.type === "bool" ? (
                      <ToggleSwitch
                        enabled={fflags[flag.name] === true || fflags[flag.name] === "True"}
                        onToggle={() => toggleFlag(flag.name)}
                      />
                    ) : editingId === flag.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type={flag.type === "int" ? "number" : "text"}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(flag.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                          className="w-28 bg-muted border border-primary/60 rounded px-2 py-1 text-xs font-mono text-foreground outline-none"
                        />
                        <button onClick={() => commitEdit(flag.id)} className="text-primary hover:text-primary/80 text-xs font-mono">OK</button>
                      </div>
                    ) : (
                      <span
                        onClick={() => startEdit(flag.id, flag.value)}
                        className="cursor-pointer hover:text-primary/70 border-b border-dotted border-primary/30"
                      >
                        {flag.value}
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); removeFlag(flag.id); }}
                      className="text-foreground/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </motion.button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.div variants={itemFade} className="flex items-center justify-between text-xs font-mono">
        <span className="text-foreground/50">{entries.length} flag{entries.length !== 1 ? "s" : ""} active</span>
        <span className="text-foreground/30">changes apply on next launch</span>
      </motion.div>
    </motion.div>
  );
}

function IntegrationsPanel() {
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            name: "Discord Rich Presence",
            desc: "Show what you're playing on Discord. Handled by Sober directly.",
            status: "Available",
            active: true,
          },
          {
            name: "Roblox Cloud",
            desc: "Sync your flag configurations across devices.",
            status: "Coming Soon",
            active: false,
          },
        ].map((int) => (
          <motion.div
            key={int.name}
            variants={itemFade}
            className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <Puzzle size={18} className="text-primary" />
              <span className={`text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full border ${
                int.active ? "text-primary border-primary/30 bg-primary/5" : "text-foreground/30 border-border"
              }`}>
                {int.status}
              </span>
            </div>
            <div>
              <div className="text-sm font-mono text-foreground">{int.name}</div>
              <div className="text-xs font-mono text-foreground/50 mt-1">{int.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function AboutPanel() {
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="flex flex-col gap-5">
      <motion.div variants={itemFade} className="px-6 py-8 bg-card border border-border rounded-xl flex items-center gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-center flex-shrink-0 relative">
          <span className="text-2xl">🌸</span>
        </div>
        <div className="relative">
          <div className="text-xl font-mono font-bold text-foreground tracking-tight">SoberTuner</div>
          <div className="text-xs font-mono text-foreground/50 mt-1">Version 1.0.0 — Built for Sober on Linux</div>
          <div className="text-xs font-mono text-primary mt-1 flex items-center gap-1.5">
            <CheckCircle2 size={11} />
            Running on Linux — CachyOS
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemFade} className="grid grid-cols-2 gap-3">
        {[
          { label: "Runtime", value: `Electron ${navigator.userAgent.match(/Electron\/(\S+)/)?.[1] || "38"}` },
          { label: "Platform", value: "Linux x64" },
          { label: "Sober Config", value: "~/.var/app/org.vinegarhq.Sober/config/sober/config.json" },
          { label: "Theme", value: "🌸 Sakura Cherry Blossom" },
        ].map((item) => (
          <div key={item.label} className="px-4 py-3 bg-card border border-border rounded-xl">
            <div className="text-xs font-mono text-foreground/50 tracking-widest uppercase">{item.label}</div>
            <div className="text-xs font-mono text-foreground mt-1">{item.value}</div>
          </div>
        ))}
      </motion.div>

      <motion.div variants={itemFade} className="text-xs font-mono text-foreground/50 text-center pb-2">
        SoberTuner is not affiliated with or endorsed by Roblox Corporation.
      </motion.div>
    </motion.div>
  );
}

const NAV_ITEMS: { id: NavItem; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "fastflags", label: "Fast Flags", icon: Zap },
  { id: "profiles", label: "Profiles", icon: Users },
  { id: "extras", label: "Extras", icon: Crosshair },
  { id: "integrations", label: "Integrations", icon: Puzzle },
  { id: "about", label: "About", icon: Info },
];

function IdleScreen({ onDismiss }: { onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") onDismiss(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDismiss]);

  return (
    <div
      ref={ref}
      tabIndex={0}
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer select-none outline-none"
    >
      <div className="absolute top-0 left-0 right-0 h-9 z-10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      <div className="flex flex-col items-center gap-2">
        <div className="text-[8rem] font-mono font-bold text-primary leading-none tracking-tight">
          {time}
        </div>
        <div className="text-sm font-mono text-foreground/50 tracking-wide">
          {date}
        </div>
      </div>
      <div className="absolute bottom-12 text-xs font-mono text-foreground/30 tracking-widest uppercase animate-pulse">
        Tap anywhere to start
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState<NavItem>("home");
  const [showIdle, setShowIdle] = useState(false);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [launching, setLaunching] = useState(false);

  const addLog = (level: LogEntry["level"], message: string) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    setLogs((prev) => [...prev, { id: Date.now(), time, level, message }]);
  };

  useEffect(() => {
    (async () => {
      addLog("info", "SoberTuner initialized");
      addLog("info", "Loading configuration...");
      const res = await window.api.loadConfig();
      if (res.success) {
        setConfig(res.config);
        const fflags = res.config.fflags || {};
        const count = Object.keys(fflags).length;
        addLog("success", `Configuration loaded — ${count} fast flag overrides`);
      } else {
        addLog("error", `Failed to load config: ${res.error}`);
      }
    })();
  }, []);

  const handleSave = async (newConfig: Record<string, unknown>) => {
    setConfig(newConfig);
    addLog("info", "Saving configuration...");
    const res = await window.api.saveConfig(newConfig);
    if (res.success) {
      addLog("success", "Configuration saved");
    } else {
      addLog("error", `Save failed: ${res.error}`);
    }
  };

  const handleFflagsChange = (fflags: Record<string, unknown>) => {
    if (!config) return;
    handleSave({ ...config, fflags });
  };

  const handleApplyProfile = (fflags: Record<string, unknown>) => {
    if (!config) return;
    handleSave({ ...config, fflags });
  };

  const handleLaunch = async () => {
    setLaunching(true);
    addLog("info", "Starting Roblox via Sober...");
    addLog("info", "Applying fast flag overrides...");
    const fflags = (config?.fflags as Record<string, unknown>) || {};
    addLog("success", `${Object.keys(fflags).length} overrides applied`);
    addLog("info", "Launching flatpak run org.vinegarhq.Sober...");
    const res = await window.api.launchSober();
    if (res.success) {
      addLog("success", "Roblox launched successfully");
    } else {
      addLog("error", `Launch failed: ${res.error}`);
    }
    setLaunching(false);
  };

  const fflags = (config?.fflags as Record<string, unknown>) || {};
  const fflagCount = Object.keys(fflags).length;

  return (
    <div className="w-full h-screen bg-background flex overflow-hidden relative">
      <LiveBackground />
      <AnimatePresence>
        {showIdle && <IdleScreen onDismiss={() => setShowIdle(false)} />}
      </AnimatePresence>
      <div className="relative z-10 flex w-full h-full">
        <aside className="w-20 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-6 gap-2" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <div className="mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-pink-800 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-lg">🌸</span>
            </div>
          </div>
          <nav className="flex flex-col items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                active={active === item.id}
                onClick={() => setActive(item.id)}
                tooltip={item.label}
              />
            ))}
          </nav>
          <div className="mt-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-mono text-foreground/50">OK</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="h-8 flex-shrink-0 flex items-center justify-between">
            <div className="flex-1 h-full" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
            <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <button
                onClick={() => window.api.minimizeWindow()}
                className="h-full px-3.5 flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-primary/10 transition-colors text-xs"
              >&#x2013;</button>
              <button
                onClick={() => window.api.closeWindow()}
                className="h-full px-3.5 flex items-center justify-center text-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs"
              >&#x2715;</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 relative" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <AnimatePresence mode="wait">
              <motion.div key={active} {...fadeUp} className="h-full">
                {active === "home" && (
                  <HomePanel
                    logs={logs}
                    launching={launching}
                    onLaunch={handleLaunch}
                    fflagCount={fflagCount}
                  />
                )}
                {active === "settings" && (
                  <SettingsPanel
                    config={config || {}}
                    onConfigChange={handleSave}
                  />
                )}
                {active === "fastflags" && (
                  <FastFlagsPanel
                    fflags={fflags}
                    onFflagsChange={handleFflagsChange}
                  />
                )}
                {active === "profiles" && (
                  <ProfilePanel
                    currentFflags={fflags}
                    onApplyProfile={handleApplyProfile}
                    onLog={addLog}
                  />
                )}
                {active === "extras" && <ExtrasPanel onLog={addLog} />}
                {active === "integrations" && <IntegrationsPanel />}
                {active === "about" && <AboutPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

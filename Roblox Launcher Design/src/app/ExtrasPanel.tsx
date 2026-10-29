import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Crosshair,
  Eye,
  EyeOff,
  Palette,
  Sun,
  Moon,
  Cloud,
  Stars,
  Sunset,
  Copy,
  Check,
  Upload,
  Image,
} from "lucide-react";

const itemFade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const SECTION_HEADER = "flex items-center gap-2 text-xs font-mono text-foreground/50 tracking-widest uppercase mb-3 pb-2 border-b border-primary/20";

const CROSSHAIR_PRESETS: { id: CrosshairOptions["type"]; label: string }[] = [
  { id: "dot", label: "Dot" },
  { id: "cross", label: "Cross" },
  { id: "circle", label: "Circle" },
  { id: "crosshair", label: "Crosshair" },
  { id: "plus", label: "Plus" },
];

const SKYBOX_PRESETS = [
  { id: "day", label: "Day", icon: Sun, assetId: "159649026" },
  { id: "night", label: "Night", icon: Moon, assetId: "159649030" },
  { id: "sunset", label: "Sunset", icon: Sunset, assetId: "159649031" },
  { id: "cloudy", label: "Cloudy", icon: Cloud, assetId: "159649028" },
  { id: "space", label: "Space", icon: Stars, assetId: "159649027" },
];

export default function ExtrasPanel({
  onLog,
}: {
  onLog: (level: "info" | "warn" | "success" | "error", message: string) => void;
}) {
  const [active, setActive] = useState<"crosshair" | "skybox">("crosshair");

  const [xhairVisible, setXhairVisible] = useState(false);
  const [xhairType, setXhairType] = useState<CrosshairOptions["type"]>("cross");
  const [xhairColor, setXhairColor] = useState("#00ff00");
  const [xhairSize, setXhairSize] = useState(5);
  const [xhairOpacity, setXhairOpacity] = useState(0.8);

  const [skyboxAssetId, setSkyboxAssetId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await window.api.loadTunerConfig();
      if (res.success && res.config) {
        const c = res.config;
        if (c.crosshair) {
          const ch = c.crosshair as CrosshairOptions;
          setXhairType(ch.type || "cross");
          setXhairColor(ch.color || "#00ff00");
          setXhairSize(ch.size ?? 5);
          setXhairOpacity(ch.opacity ?? 0.8);
        }
        if (c.skyboxAssetId) {
          setSkyboxAssetId(String(c.skyboxAssetId));
        }
      }
    })();
  }, []);

  const saveTunerConfig = async (partial: Record<string, unknown>) => {
    const res = await window.api.loadTunerConfig();
    const current = (res.success ? res.config : {}) as Record<string, unknown>;
    const merged = { ...current, ...partial };
    await window.api.saveTunerConfig(merged);
  };

  const sendCrosshair = () => {
    const opts: CrosshairOptions = { type: xhairType, color: xhairColor, size: xhairSize, opacity: xhairOpacity };
    window.api.updateCrosshair(opts);
  };

  const toggleOverlay = () => {
    if (xhairVisible) {
      window.api.hideCrosshair();
      setXhairVisible(false);
      onLog("info", "Crosshair overlay hidden");
    } else {
      const opts: CrosshairOptions = { type: xhairType, color: xhairColor, size: xhairSize, opacity: xhairOpacity };
      window.api.showCrosshair(opts);
      setXhairVisible(true);
      saveTunerConfig({ crosshair: opts });
      onLog("success", "Crosshair overlay shown");
    }
  };

  const updateAndSave = (partial: Partial<CrosshairOptions>) => {
    const next = { type: xhairType, color: xhairColor, size: xhairSize, opacity: xhairOpacity, ...partial };
    setXhairType(next.type);
    setXhairColor(next.color);
    setXhairSize(next.size);
    setXhairOpacity(next.opacity);
    if (xhairVisible) window.api.updateCrosshair(next);
    saveTunerConfig({ crosshair: next });
  };

  const pickSkybox = (assetId: string) => {
    setSkyboxAssetId(assetId);
    saveTunerConfig({ skyboxAssetId: assetId });
    onLog("info", `Skybox set to asset ID ${assetId}`);
  };

  const copyAssetId = async () => {
    if (!skyboxAssetId) return;
    try {
      await navigator.clipboard.writeText(skyboxAssetId);
      setCopied(true);
      onLog("success", "Skybox asset ID copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onLog("error", "Failed to copy to clipboard");
    }
  };

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="flex flex-col gap-5">
      <div className="flex gap-2 mb-1">
        {([
          { id: "crosshair" as const, label: "Crosshair Overlay", icon: Crosshair },
          { id: "skybox" as const, label: "Skybox", icon: Image },
        ]).map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActive(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all border ${
              active === tab.id
                ? "bg-primary text-black border-primary/40 shadow-lg shadow-primary/20"
                : "bg-card text-foreground/60 border-border hover:text-foreground hover:border-primary/30"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </motion.button>
        ))}
      </div>

      {active === "crosshair" && (
        <section>
          <motion.div variants={itemFade} className={SECTION_HEADER}>
            <Crosshair size={12} />
            Crosshair Customization
          </motion.div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <div>
              <div className="text-xs font-mono text-foreground/50 mb-2">Style</div>
              <div className="flex flex-wrap gap-2">
                {CROSSHAIR_PRESETS.map((p) => (
                  <motion.button
                    key={p.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => updateAndSave({ type: p.id })}
                    className={`px-4 py-2 rounded-xl text-xs font-mono border transition-all ${
                      xhairType === p.id
                        ? "bg-primary text-black border-primary/40 shadow-lg shadow-primary/20"
                        : "bg-muted text-foreground/60 border-border hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs font-mono text-foreground/50 mb-2 flex items-center gap-2">
                  <Palette size={11} /> Color
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={xhairColor}
                    onChange={(e) => updateAndSave({ color: e.target.value })}
                    className="w-10 h-10 rounded-lg bg-transparent border border-border cursor-pointer"
                  />
                  <span className="text-xs font-mono text-foreground/70">{xhairColor}</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-foreground/50 mb-2">Size: {xhairSize}</div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={xhairSize}
                  onChange={(e) => updateAndSave({ size: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="text-xs font-mono text-foreground/50 mb-2">Opacity: {Math.round(xhairOpacity * 100)}%</div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={xhairOpacity}
                  onChange={(e) => updateAndSave({ opacity: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={toggleOverlay}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl font-mono font-semibold text-sm tracking-wider border w-fit transition-all ${
                xhairVisible
                  ? "bg-muted text-foreground border-border hover:bg-muted/80"
                  : "bg-primary text-black border-primary/40 shadow-lg shadow-primary/20 hover:bg-primary/90"
              }`}
            >
              {xhairVisible ? (
                <><EyeOff size={16} /> HIDE OVERLAY</>
              ) : (
                <><Eye size={16} /> SHOW OVERLAY</>
              )}
            </motion.button>
          </div>

          <motion.div variants={itemFade} className="text-xs font-mono text-foreground/30 mt-2">
            The overlay is a transparent click-through window. It stays on top of Roblox.
          </motion.div>
        </section>
      )}

      {active === "skybox" && (
        <section>
          <motion.div variants={itemFade} className={SECTION_HEADER}>
            <Image size={12} />
            Skybox Presets
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            {SKYBOX_PRESETS.map((p) => (
              <motion.button
                key={p.id}
                variants={itemFade}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => pickSkybox(p.assetId)}
                className={`bg-card border rounded-xl p-4 flex flex-col items-center gap-3 transition-all ${
                  skyboxAssetId === p.assetId
                    ? "border-primary/40 shadow-lg shadow-primary/10"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <p.icon size={22} className={skyboxAssetId === p.assetId ? "text-primary" : "text-foreground/60"} />
                </div>
                <div>
                  <div className="text-xs font-mono text-foreground">{p.label}</div>
                  <div className="text-[10px] font-mono text-foreground/50 mt-0.5">{p.assetId}</div>
                </div>
              </motion.button>
            ))}
          </div>

          <motion.div variants={itemFade} className={SECTION_HEADER}>
            <Upload size={12} />
            Custom Skybox
          </motion.div>

          <motion.div variants={itemFade} className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <div className="text-xs font-mono text-foreground/50 mb-1">Asset ID</div>
              <input
                type="text"
                value={skyboxAssetId}
                onChange={(e) => {
                  setSkyboxAssetId(e.target.value);
                  saveTunerConfig({ skyboxAssetId: e.target.value });
                }}
                placeholder="Enter Roblox skybox asset ID..."
                className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-xs font-mono text-foreground placeholder:text-foreground/30 outline-none focus:border-primary/60"
              />
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={copyAssetId}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-black text-xs font-mono font-medium rounded-xl border border-primary/40 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "COPIED" : "COPY ASSET ID"}
              </motion.button>
            </div>
          </motion.div>

          <motion.div variants={itemFade} className="bg-muted/50 border border-border rounded-xl p-4">
            <div className="text-xs font-mono text-foreground/70 leading-relaxed">
              To use a custom skybox in Roblox, paste the asset ID into a <span className="text-primary">Skybox</span> or <span className="text-primary">ImageLabel</span> property in Studio, or use a skybox changer script in-game.
            </div>
            <div className="text-xs font-mono text-foreground/50 mt-2">
              Note: Skybox may not apply in all games depending on their lighting settings.
            </div>
          </motion.div>
        </section>
      )}
    </motion.div>
  );
}

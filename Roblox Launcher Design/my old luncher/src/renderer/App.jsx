import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Minus } from 'lucide-react';

// KEY SYSTEM DISABLED (kept as comments for later re-enable)
// const DEFAULT_KEY_SERVER_URL = 'http://localhost:3030';
// function normalizeKeyServerUrl(rawUrl) {
//   const trimmed = String(rawUrl || '').trim();
//   if (!trimmed) return DEFAULT_KEY_SERVER_URL;
//   const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
//   return withProtocol.replace(/\/+$/, '');
// }
// function KeyLogin({ onLogin, keyServerUrl }) { ... }
import BootScreen from './BootScreen';
import {
  Home, User, Settings, Play, Bell, Shield, Terminal,
  Gamepad2, Download, Wifi, Clock, ChevronRight, Star, Zap,
  Monitor, Users, Award, Syringe, ExternalLink, Image, Info, AlertCircle, CheckCircle, Server,
  RefreshCw, LogOut, FolderOpen, Package, Trash2, Upload, Plus
} from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

// Fixed Typing Animation Component
const Typewriter = ({ text, speed = 50, delay = 0, className = '', onComplete }) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    indexRef.current = 0;

    const startTimeout = setTimeout(() => {
      const type = () => {
        if (indexRef.current < text.length) {
          setDisplayText(text.substring(0, indexRef.current + 1));
          indexRef.current += 1;
          timeoutRef.current = setTimeout(type, speed);
        } else {
          setIsComplete(true);
          if (onComplete) onComplete();
        }
      };
      type();
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, speed, delay]);

  return (
    <span className={className}>
      {displayText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          className="inline-block w-0.5 h-5 bg-green-400 ml-0.5 align-middle"
        />
      )}
    </span>
  );
};

// Sidebar Components
const SidebarItem = ({ icon: Icon, active, onClick, tooltip }) => (
  <button
    onClick={onClick}
    className={`p-3 transition-all duration-200 relative group no-drag rounded-xl w-14 h-14 flex items-center justify-center ${
      active
        ? 'text-green-400 bg-green-500/10 shadow-lg shadow-green-500/10'
        : 'text-green-500/60 hover:text-green-400 hover:bg-green-500/10'
    }`}
  >
    <Icon size={22} />
    {active && (
      <motion.div
        layoutId="active-glow"
        className="absolute inset-0 bg-green-500/10 rounded-xl border border-green-500/20"
        initial={false}
        transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.8 }}
      />
    )}
    <div className="absolute left-16 px-3 py-1.5 bg-green-950 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-green-500/15">
      {tooltip}
    </div>
  </button>
);

const formatHours = (hours) => {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${m}m`;
};

const PlayerProfile = ({ username, hoursPlayed }) => {
  const [playerData, setPlayerData] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [discordUser, setDiscordUser] = useState(null);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!username || username === 'Player') {
        setPlayerData(null);
        return;
      }

      try {
        const uuidResponse = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
        if (uuidResponse.ok) {
          const uuidData = await uuidResponse.json();
          setPlayerData({
            uuid: uuidData.id,
            name: uuidData.name,
            avatarUrl: `https://mc-heads.net/avatar/${uuidData.id}/100`,
            bodyUrl: `https://mc-heads.net/body/${uuidData.id}/200`,
            headUrl: `https://mc-heads.net/head/${uuidData.id}/100`,
            nameMcUrl: `https://namemc.com/profile/${uuidData.id}`
          });
        } else {
          setPlayerData({
            uuid: null,
            name: username,
            avatarUrl: `https://mc-heads.net/avatar/${username}/100`,
            bodyUrl: `https://mc-heads.net/body/${username}/200`,
            headUrl: `https://mc-heads.net/head/${username}/100`,
            nameMcUrl: `https://namemc.com/profile/${username}`
          });
        }
      } catch (error) {
        console.error('Failed to fetch player data:', error);
        setPlayerData({
          uuid: null,
          name: username,
          avatarUrl: `https://mc-heads.net/avatar/${username}/100`,
          bodyUrl: `https://mc-heads.net/body/${username}/200`,
          headUrl: `https://mc-heads.net/head/${username}/100`,
          nameMcUrl: `https://namemc.com/profile/${username}`
        });
      }
    };

    fetchPlayerData();
  }, [username]);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.electron.getDiscordUser();
        if (result.success) {
          setDiscordUser(result.user);
        }
      } catch (_) {}
    })();
  }, []);

  return (
    <div className="relative">
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          className="w-12 h-12 mx-auto rounded-xl overflow-hidden border-2 border-green-500/20 hover:border-green-500/50 cursor-pointer bg-green-950"
          whileHover={{
            x: [0, -3, 3, -2, 2, 0],
            rotate: [0, -2, 2, -1, 1, 0],
          }}
          transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {playerData?.avatarUrl ? (
            <img
              src={playerData.avatarUrl}
              alt={username}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-950 to-green-950">
              <User size={24} className="text-green-500/60" />
            </div>
          )}
        </motion.div>

        <p className="text-[10px] text-green-500/60 text-center mt-1 truncate w-16 mx-auto font-medium">
          {username}
        </p>

        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-full top-0 ml-2 w-72 bg-green-950/90 border border-green-500/20 rounded-2xl p-4 shadow-2xl z-[9999] overflow-visible backdrop-blur-sm"
            >
              {/* Minecraft Body */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-32 rounded-xl overflow-hidden bg-green-950 flex-shrink-0">
                  {playerData?.bodyUrl ? (
                    <img
                      src={playerData.bodyUrl}
                      alt={username}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.src = `https://mc-heads.net/body/MHF_Steve/200`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image size={32} className="text-green-500/40" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-green-200 font-bold truncate">{username}</h3>
                  <p className="text-xs text-green-500/50 mt-1">
                    {playerData?.uuid ? 'Premium Account' : 'Offline Account'}
                  </p>
                  <p className="text-[10px] text-green-500/40 mt-1 flex items-center gap-1">
                    <Clock size={10} />
                    Play time: {formatHours(hoursPlayed)}
                  </p>
                </div>
              </div>

              {/* Discord */}
              <div className="mt-3 pt-3 border-t border-green-500/15">
                <p className="text-[10px] text-green-500/50 mb-2 flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-indigo-400" fill="currentColor"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 00-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 00-4.8 0c-.14-.34-.35-.76-.54-1.09a.09.09 0 00-.07-.03c-1.5.26-2.93.71-4.27 1.33a.09.09 0 00-.04.12c.31.55.65 1.09 1 1.63a15.85 15.85 0 003.92-.59c.34-.08.77-.12 1.19-.12s.85.04 1.19.12a15.87 15.87 0 003.92.59c.35-.54.69-1.08 1-1.63a.09.09 0 00-.04-.12zM8.68 14.81a12.16 12.16 0 01-1.09.54c-.73.24-1.47.47-2.14.79a.08.08 0 00-.04.1l.28 1.05a.09.09 0 00.09.07c.47-.05.94-.12 1.4-.18a.09.09 0 00.07-.05c.24-.38.49-.75.71-1.14a.08.08 0 00-.04-.12zm6.64 0a.08.08 0 00-.12.04c-.22.39-.47.76-.71 1.14a.09.09 0 00-.07.05c-.46.06-.93.13-1.4.18a.09.09 0 00.09.07l.28-1.05a.08.08 0 00-.04-.1c-.67-.32-1.41-.55-2.14-.79a12.16 12.16 0 01-1.09-.54.08.08 0 00-.12.04c-.32.48-.64.96-.95 1.44a.08.08 0 00.06.12c.41-.06.82-.13 1.22-.21a.08.08 0 00.06-.08c.03-.27.05-.54.07-.81a.09.09 0 00-.09-.09h-.96a.09.09 0 00-.09.08 10.31 10.31 0 00-.02 1.24c.01.07.07.12.13.14a5.2 5.2 0 001.86.37c.56 0 1.1-.06 1.62-.18a.09.09 0 00.05-.12c-.2-.36-.43-.71-.68-1.05a.08.08 0 00-.12-.04zm-9.05 1.88a.08.08 0 00.06.07c.56.12 1.11.28 1.63.46a.09.09 0 00.11-.05c.2-.36.38-.74.54-1.13a.08.08 0 00-.04-.11 12.6 12.6 0 00-2.17-.91.08.08 0 00-.1.05c-.14.24-.28.49-.4.75a.08.08 0 00.04.1zm10.18-1.18a12.6 12.6 0 00-2.17.91.08.08 0 00-.04.1c.12.26.26.51.4.75a.08.08 0 00.1.05 11.7 11.7 0 001.63-.46.09.09 0 00.05-.11zm.26-1.34a10.36 10.36 0 00-1.62-.18.09.09 0 00-.13.14c.24.35.48.7.68 1.05a.09.09 0 00.12.04c.41.12.82.2 1.22.27a.08.08 0 00.09-.08 10.5 10.5 0 00.02-1.24h-1.04a.09.09 0 00-.09.08c-.02.28.02.55.07.81z"/></svg>
                  Discord
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {discordUser?.avatar ? (
                      <img src={discordUser.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-white">{username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-green-200 font-medium truncate">{discordUser?.username || username}</p>
                    <p className="text-[10px] text-green-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                      Online
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-green-500/15">
                <div className="text-center p-2 rounded-lg bg-green-500/[0.04]">
                  <p className="text-[10px] text-green-500/50">Account</p>
                  <p className={`text-xs font-medium ${playerData?.uuid ? 'text-green-400' : 'text-yellow-400'}`}>
                    {playerData?.uuid ? 'Premium' : 'Offline'}
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg bg-green-500/[0.04]">
                  <p className="text-[10px] text-green-500/50">Play Time</p>
                  <p className="text-xs text-green-400 font-medium">{formatHours(hoursPlayed)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Sidebar = ({ activeTab, setActiveTab, username, hoursPlayed }) => {
  return (
    <div className="w-20 bg-black flex flex-col items-center py-6 border-r border-green-500/15 drag-region gap-2">
      <div className="mb-6">
       <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
           <span className="text-green-200 font-bold text-lg font-dynapuff">X</span>
       </div>
      </div>
      <LayoutGroup>
        <SidebarItem icon={Home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} tooltip="Dashboard" />
        <SidebarItem icon={Syringe} active={activeTab === 'Inject'} onClick={() => setActiveTab('Inject')} tooltip="Inject" />
        <SidebarItem icon={Gamepad2} active={activeTab === 'Gameversion'} onClick={() => setActiveTab('Gameversion')} tooltip="Game Version & Mods" />
        <SidebarItem icon={User} active={activeTab === 'account'} onClick={() => setActiveTab('account')} tooltip="Account" />
        <SidebarItem icon={Terminal} active={activeTab === 'console'} onClick={() => setActiveTab('console')} tooltip="Console" />
        <SidebarItem icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} tooltip="Settings" />
      </LayoutGroup>
      <div className="mt-auto flex flex-col items-center">
        <PlayerProfile username={username} hoursPlayed={hoursPlayed} />
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => {
  const colors = {
    blue: 'from-green-500/20 to-green-600/20 border-green-500/20 text-green-400',
    green: 'from-green-500/20 to-green-600/20 border-green-500/20 text-green-400',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/20 text-purple-400',
    amber: 'from-amber-500/20 to-amber-600/20 border-amber-500/20 text-amber-400',
  };

  return (
    <motion.div
      className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4 backdrop-blur-sm`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-3">
        <Icon size={18} />
        <span className="text-xs font-medium uppercase tracking-wider text-green-400/80">{label}</span>
      </div>
      <p className="text-2xl font-bold text-green-200">{value}</p>
    </motion.div>
  );
};

const NewsCard = ({ title, time, icon: Icon }) => (
  <motion.div
    whileHover={{ x: 4 }}
    className="flex items-start gap-4 p-4 rounded-xl bg-green-500/[0.04] border border-green-500/15 hover:border-green-500/20 transition-all duration-200 cursor-pointer group"
  >
    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
      <Icon size={18} className="text-green-400" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-medium text-green-200 mb-1 truncate">{title}</h4>
      <div className="flex items-center gap-2 text-xs text-green-500/50">
        <Clock size={12} />
        <span>{time}</span>
      </div>
    </div>
    <ChevronRight size={16} className="text-green-500/40 group-hover:text-green-400 transition-colors flex-shrink-0 mt-1" />
  </motion.div>
);

const Popup = ({ type, title, message, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const startTimeRef = useRef(Date.now());
  const remainingRef = useRef(duration);
  const timerRef = useRef(null);

  const dismiss = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const startTimer = (ms) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, ms);
  };

  useEffect(() => {
    if (duration > 0) {
      startTimer(duration);
    }
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleMouseEnter = () => {
    if (duration <= 0) return;
    clearTimeout(timerRef.current);
    remainingRef.current -= Date.now() - startTimeRef.current;
    setPaused(true);
  };

  const handleMouseLeave = () => {
    if (duration <= 0) return;
    startTimeRef.current = Date.now();
    startTimer(remainingRef.current);
    setPaused(false);
  };

  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: AlertCircle,
  };

  const colors = {
    info: 'border-green-500/20 bg-green-500/5',
    success: 'border-green-500/20 bg-green-500/5',
    warning: 'border-yellow-500/20 bg-yellow-500/5',
    error: 'border-red-500/20 bg-red-500/5',
  };

  const iconColors = {
    info: 'text-green-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
  };

  const timerBarColors = {
    info: 'bg-green-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  const Icon = icons[type] || icons.info;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`flex flex-col rounded-xl border backdrop-blur-sm ${colors[type]} shadow-lg overflow-hidden`}
        >
          <div className="flex items-start gap-3 p-4">
            <Icon size={18} className={`${iconColors[type]} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-green-200">{title}</h4>
              <p className="text-xs text-green-500/60 mt-1">{message}</p>
            </div>
            <button
              onClick={dismiss}
              className="p-1 hover:bg-green-500/10 rounded-lg transition-colors flex-shrink-0"
            >
              <X size={14} className="text-green-500/50" />
            </button>
          </div>
          {duration > 0 && (
            <div className="h-0.5 w-full bg-green-500/10">
              <motion.div
                className={`h-full ${timerBarColors[type]} opacity-60`}
                initial={{ width: '100%' }}
                animate={{ width: paused ? undefined : '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PopupContainer = ({ popups, removePopup }) => {
  return (
    <div className="absolute bottom-24 left-4 right-4 z-50 space-y-2 pointer-events-none">
      <div className="max-w-sm ml-auto space-y-2">
        <AnimatePresence>
          {popups.map((popup) => (
            <div key={popup.id} className="pointer-events-auto">
              <Popup
                type={popup.type}
                title={popup.title}
                message={popup.message}
                duration={popup.duration || 5000}
                onClose={() => removePopup(popup.id)}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Mod Manager Component
const ModManager = ({ installedMods, onInstall, onUninstall, onToggle, isInstalling, onOpenFolder, onRefresh }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  const filteredMods = React.useMemo(() => {
    let mods = installedMods || [];
    if (search) mods = mods.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'enabled') mods = mods.filter(m => m.enabled);
    if (filter === 'disabled') mods = mods.filter(m => !m.enabled);
    return mods;
  }, [installedMods, search, filter]);
  
  return (
    <div className="mt-8 pt-6 border-t border-green-500/20">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-green-400" />
          <h3 className="text-lg font-bold text-green-200">Mod Manager</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/15 text-xs text-green-400/80 transition flex items-center gap-1"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <button
            onClick={onOpenFolder}
            className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/15 text-xs text-green-400/80 transition flex items-center gap-1"
          >
            <FolderOpen size={12} />
            Open Folder
          </button>
          <button
            onClick={onInstall}
            disabled={isInstalling}
            className={`px-4 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium transition flex items-center gap-1 ${isInstalling ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-500/30'}`}
          >
            {isInstalling ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                  <RefreshCw size={12} />
                </motion.div>
                Installing...
              </>
            ) : (
              <>
                <Plus size={12} />
                Install Mod (.jar)
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          ['all', 'All Mods'],
          ['enabled', 'Enabled'],
          ['disabled', 'Disabled']
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1 text-xs rounded-full transition ${
              filter === value 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-green-500/10 text-green-500/60 border border-green-500/15 hover:bg-green-500/15'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search mods..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-black border border-green-500/20 rounded-xl px-4 py-2 text-sm text-green-200 placeholder-green-500/50 focus:outline-none focus:border-green-500/50"
        />
      </div>
      
      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {filteredMods.length === 0 ? (
          <div className="text-center py-10 text-green-500/50 text-sm">
            No mods installed. Click 'Install Mod' to add .jar files.
          </div>
        ) : (
          filteredMods.map(mod => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/[0.04] border border-green-500/15 rounded-xl p-3 flex items-center justify-between group hover:border-green-500/20 transition"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  mod.enabled ? 'bg-green-500/10 text-green-400' : 'bg-green-950 text-green-500/50'
                }`}>
                  <Package size={18} />
                </div>
                <div>
                  <p className="text-green-200 font-medium text-sm">{mod.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-green-500/50 mt-0.5">
                    <span>v{mod.version || '1.0'}</span>
                    <span>•</span>
                    <span>{new Date(mod.installedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggle(mod.id, !mod.enabled)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    mod.enabled 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-green-950 text-green-400/80 border border-green-500/15 hover:bg-green-900'
                  }`}
                >
                  {mod.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button
                  onClick={() => onUninstall(mod.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-green-500/50 hover:text-red-400 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

function InjectTab() {
  const [processes, setProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [dllPath, setDllPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [injectStatus, setInjectStatus] = useState(null);
  const [isWindows, setIsWindows] = useState(false);

  useEffect(() => {
    setIsWindows(navigator.platform?.toLowerCase().includes('win') || false);
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    setIsLoading(true);
    try {
      const result = await window.electron.listProcesses();
      if (result.success) {
        setProcesses(result.processes);
      }
    } catch (_) {}
    setIsLoading(false);
  };

  const handleBrowse = async () => {
    try {
      const result = await window.electron.browseDll();
      if (result.success) {
        setDllPath(result.path);
      }
    } catch (_) {}
  };

  const handleInject = async () => {
    if (!selectedProcess || !dllPath) return;
    setInjecting(true);
    setInjectStatus(null);
    try {
      const result = await window.electron.injectDll({
        processName: selectedProcess,
        dllPath: dllPath,
      });
      if (result.success) {
        setInjectStatus({ type: 'success', message: 'DLL injected successfully!' });
      } else {
        setInjectStatus({ type: 'error', message: result.error || 'Injection failed' });
      }
    } catch (error) {
      setInjectStatus({ type: 'error', message: error.message });
    }
    setInjecting(false);
  };

  if (!isWindows) {
    return (
      <motion.div
        key="inject"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="p-8 max-w-xl"
      >
        <h2 className="text-2xl font-bold text-green-200 mb-6">DLL Injector</h2>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
          <Syringe size={40} className="text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-yellow-400 mb-2">Windows Only</h3>
          <p className="text-sm text-green-500/60">
            DLL injection is only supported on Windows. This feature is available in the Windows build.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="inject"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="p-8 max-w-xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-green-200">DLL Injector</h2>
        <button
          onClick={loadProcesses}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/15 text-xs text-green-400/80 transition flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="bg-green-500/[0.04] border border-green-500/15 rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-xs font-bold uppercase text-green-500/50 mb-2 block tracking-wider">
            Target Process
          </label>
          <div className="relative">
            <select
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
              className="w-full bg-black border border-green-500/20 rounded-xl p-3.5 text-green-200 text-sm appearance-none cursor-pointer focus:outline-none focus:border-green-500/50 transition pr-10"
            >
              <option value="">Select a process...</option>
              {processes
                .filter((p, i, arr) => arr.findIndex((x) => x.name === p.name) === i)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => (
                  <option key={`${p.pid}-${p.name}`} value={p.name}>
                    {p.name} (PID: {p.pid})
                  </option>
                ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-green-500/50">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </div>
          </div>
          {isLoading && (
            <p className="text-xs text-green-500/50 mt-1.5">Loading processes...</p>
          )}
          {!isLoading && processes.length === 0 && (
            <p className="text-xs text-green-500/50 mt-1.5">No processes found. Click Refresh.</p>
          )}
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-green-500/50 mb-2 block tracking-wider">
            DLL Path
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={dllPath}
              onChange={(e) => setDllPath(e.target.value)}
              placeholder="C:\path\to\your.dll"
              className="flex-1 bg-black border border-green-500/20 rounded-xl p-3.5 text-green-200 text-sm focus:outline-none focus:border-green-500/50 transition placeholder-green-500/40"
            />
            <button
              onClick={handleBrowse}
              className="px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 text-green-400/80 text-sm transition flex items-center gap-2"
            >
              <FolderOpen size={16} />
              Browse
            </button>
          </div>
        </div>

        {injectStatus && (
          <div className={`rounded-xl p-3 flex items-start gap-3 ${
            injectStatus.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            {injectStatus.type === 'success'
              ? <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
              : <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            }
            <p className={`text-sm ${
              injectStatus.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {injectStatus.message}
            </p>
          </div>
        )}

        <button
          onClick={handleInject}
          disabled={!selectedProcess || !dllPath || injecting}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-950 disabled:to-green-950 disabled:text-green-500/50 text-black font-bold p-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider flex items-center justify-center gap-3 border border-green-500/30 disabled:border-green-500/15"
        >
          {injecting ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Syringe size={18} />
              </motion.div>
              Injecting...
            </>
          ) : (
            <>
              <Syringe size={18} />
              INJECT DLL
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

const GITHUB_REPO_API = 'https://api.github.com/repos/danek123321/oxevy-assets/contents/';
const GITHUB_RAW = 'https://raw.githubusercontent.com/danek123321/oxevy-assets/main/';
const IGNORED = ['README.md', 'watermark.png', '.gitignore'];

function CapeSelector() {
  const [capes, setCapes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('NONE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [customCapeUrl, setCustomCapeUrl] = useState(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    loadCapeConfig();
    fetchCapes();
  }, []);

  async function loadCapeConfig() {
    try {
      const result = await window.electron.getCapeConfig();
      if (result.success && result.config) {
        setMode(result.config.mode || 'NONE');
        if (result.config.url) {
          setSelected(result.config.url);
        }
      }
    } catch (_) {}
    try {
      const img = await window.electron.getCapeImage();
      if (img.success) {
        setCustomCapeUrl(img.dataUrl);
      }
    } catch (_) {}
  }

  async function fetchCapes() {
    try {
      const res = await fetch(GITHUB_REPO_API);
      if (!res.ok) throw new Error('Failed to fetch ' + res.status);
      const data = await res.json();
      const items = data
        .filter(f => !IGNORED.includes(f.name) && /^Cape\d*\.(png|jpg|jpeg)$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name));
      setCapes(items.map(f => ({ name: f.name.replace(/\.(png|jpg|jpeg)$/i, ''), url: GITHUB_RAW + f.name })));
      setLoading(false);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function handleSelect(url, name) {
    setSaving(true);
    try {
      await window.electron.setCapeConfig({
        mode: 'UNLOCKED',
        url,
        name,
        index: 0,
      });
      setSelected(url);
      setMode('UNLOCKED');
    } catch (_) {}
    setSaving(false);
  }

  async function handleClear() {
    setSaving(true);
    try {
      await window.electron.setCapeConfig({ mode: 'NONE' });
      setSelected(null);
      setMode('NONE');
    } catch (_) {}
    setSaving(false);
  }

  async function handleCustomSelect() {
    if (!customCapeUrl) return;
    setSaving(true);
    try {
      await window.electron.setCapeConfig({
        mode: 'CUSTOM',
        url: customCapeUrl,
        name: 'Custom Cape',
        index: -1,
      });
      setSelected(customCapeUrl);
      setMode('CUSTOM');
    } catch (_) {}
    setSaving(false);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/png') && !file.name.endsWith('.png')) {
      alert('Please drop a PNG image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setSaving(true);
      try {
        const result = await window.electron.saveCapeImage({ dataUrl });
        if (result.success) {
          setCustomCapeUrl(dataUrl);
          await window.electron.setCapeConfig({
            mode: 'CUSTOM',
            url: dataUrl,
            name: file.name.replace(/\.png$/i, ''),
            index: -1,
          });
          setSelected(dataUrl);
          setMode('CUSTOM');
        } else {
          alert('Failed to save cape: ' + result.error);
        }
      } catch (err) {
        alert('Failed to save cape: ' + err.message);
      }
      setSaving(false);
    };
    reader.readAsDataURL(file);
  }

  function handleClickUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.png';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        setSaving(true);
        try {
          const result = await window.electron.saveCapeImage({ dataUrl });
          if (result.success) {
            setCustomCapeUrl(dataUrl);
            await window.electron.setCapeConfig({
              mode: 'CUSTOM',
              url: dataUrl,
              name: file.name.replace(/\.png$/i, ''),
              index: -1,
            });
            setSelected(dataUrl);
            setMode('CUSTOM');
          } else {
            alert('Failed to save cape: ' + result.error);
          }
        } catch (err) {
          alert('Failed to save cape: ' + err.message);
        }
        setSaving(false);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleClear}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 text-green-400/80 text-sm transition flex items-center gap-2"
        >
          <X size={14} />
          Disable Cape
        </button>
        <button
          onClick={() => { setLoading(true); setError(null); fetchCapes(); }}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 text-green-400/80 text-sm transition flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
        <span className="text-xs text-green-500/50">
          {mode === 'NONE' ? 'No cape selected' : mode === 'UNLOCKED' ? 'Cape active' : 'Custom cape'}
        </span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClickUpload}
        className={`mb-6 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-green-400 bg-green-500/10'
            : 'border-green-500/20 hover:border-green-500/50 bg-green-500/[0.04]'
        } ${saving ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {customCapeUrl ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-40 h-20 rounded-lg overflow-hidden bg-green-950">
              <img src={customCapeUrl} alt="Custom cape" className="w-full h-full object-cover" />
            </div>
            <p className="text-sm text-green-500/60">
              {mode === 'CUSTOM' ? 'Custom cape active — drag or click to replace' : 'Click or drag to upload'}
            </p>
            {mode !== 'CUSTOM' && customCapeUrl && (
              <button
                onClick={(e) => { e.stopPropagation(); handleCustomSelect(); }}
                className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-black text-sm font-medium transition"
              >
                Use this cape
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={28} className="text-green-500/50" />
            <p className="text-sm text-green-500/60">
              <span className="text-green-400 font-medium">Click to upload</span> or drag a PNG here
            </p>
            <p className="text-xs text-green-500/40">Your cape image will be saved locally</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <RefreshCw size={24} className="text-green-400" />
          </motion.div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">Failed to load capes: {error}</p>
        </div>
      )}

      {!loading && !error && capes.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
          <Image size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-green-200 font-medium mb-1">No capes available</p>
          <p className="text-xs text-green-500/60">Add capes to the oxevy-assets repo on GitHub</p>
        </div>
      )}

      {!loading && capes.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
          {capes.map(c => {
            const isActive = selected === c.url;
            return (
              <motion.button
                key={c.name}
                onClick={() => handleSelect(c.url, c.name)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={saving}
                className={`rounded-xl overflow-hidden border-2 transition-all text-left ${
                  isActive
                    ? 'border-green-500 shadow-lg shadow-green-500/20'
                    : 'border-green-500/15 hover:border-green-500/30'
                } ${saving ? 'opacity-50' : ''}`}
              >
                <div className="aspect-[2/1] bg-green-950">
                  <img
                    src={c.url}
                    alt={c.name}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
                <div className="px-2 py-1.5 bg-green-950">
                  <p className="text-[11px] text-green-400/80 truncate font-medium">{c.name}</p>
                  {isActive && <p className="text-[9px] text-green-400 font-semibold">Active</p>}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const prevTabRef = useRef('home');
  const soundPlayingRef = useRef(false);
  const [oxevyInstalled, setOxevyInstalled] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modUpdateAvailable, setModUpdateAvailable] = useState(false);
  const [installedModTag, setInstalledModTag] = useState(null);
  const [latestModTag, setLatestModTag] = useState(null);
  
  // Mod Manager State
  const [installedMods, setInstalledMods] = useState([]);
  const [isInstallingMod, setIsInstallingMod] = useState(false);

  const checkModUpdates = useCallback(async () => {
    try {
      const response = await fetch('https://api.github.com/repos/danek123321/oxevy-2.0/releases/latest');
      if (!response.ok) return;
      const data = await response.json();
      const tag = data?.tag_name || null;
      setLatestModTag(tag);

      if (!tag) return;
      if (!oxevyInstalled) {
        setModUpdateAvailable(false);
        return;
      }

      if (!installedModTag) {
        setModUpdateAvailable(true);
        return;
      }

      setModUpdateAvailable(tag !== installedModTag);
    } catch (_) {}
  }, [oxevyInstalled, installedModTag]);

   // Load mods from filesystem
  const loadMods = useCallback(async () => {
    try {
      const result = await window.electron.listMods();
      if (result.success && result.mods) {
        // Convert filesystem format to internal mod format
        const mods = result.mods.map((mod, index) => ({
          id: mod.baseFile.replace(/\.[^/.]+$/, '') + '_' + index, // Generate ID from filename
          name: mod.baseFile.replace(/\.[^/.]+$/, ''), // Remove extension for display name
          version: '1.0.0', // Default version since not stored in filesystem
          enabled: mod.enabled,
          installedAt: new Date().toISOString(), // Default to now since we don't track install time
          fileName: mod.file
        }));
        setInstalledMods(mods);
      }
    } catch (error) {
      console.error('Failed to load mods from filesystem:', error);
      
      // Fallback to config-based loading
      try {
        const config = await window.electron.getUserConfig();
        if (config.installedMods) {
          setInstalledMods(config.installedMods);
        }
      } catch (configError) {
        console.error('Failed to load mods from config:', configError);
      }
    }
  }, []);

  // Ensure directory exists
  const ensureDir = useCallback(async (dirPath) => {
    try {
      await window.electron.invoke('ensure-dir', { dirPath });
    } catch (error) {
      console.error('Failed to ensure directory:', error);
    }
  }, []);

  // Get game root directory
  const getGameRootDir = useCallback(async () => {
    try {
      const result = await window.electron.invoke('get-game-root-dir');
      if (result.success) {
        return result.path;
      }
      throw new Error(result.error || 'Failed to get game root directory');
    } catch (error) {
      console.error('Failed to get game root directory:', error);
      throw error;
    }
  }, []);

  // Save mods to filesystem
  const saveModsToFilesystem = useCallback(async (mods) => {
    try {
      // Create mods directory if it doesn't exist
      const modsDir = await getGameRootDir();
      await ensureDir(modsDir);
      
      // Process each mod
      for (const mod of mods) {
        // For now, we're just ensuring the mods directory exists and tracking enabled state
        // Actual file management would happen when users manually place .jar files
        const isEnabled = mod.enabled;
        await window.electron.invoke('set-mod-enabled', {
          file: mod.fileName,
          enabled: isEnabled
        });
      }
    } catch (error) {
      console.error('Failed to save mods to filesystem:', error);
    }
   }, [ensureDir, getGameRootDir]);

  // Startup: check installation + load saved mod tag + load mods
  useEffect(() => {
    const startup = async () => {
      try {
        const result = await window.electron.checkOxevyInstalled();
        setOxevyInstalled(result.installed);
      } catch (_) {}

      try {
        const config = await window.electron.getUserConfig();
        setInstalledModTag(config?.oxevyMod?.tag || null);
        if (config.installedMods) {
          setInstalledMods(config.installedMods);
        }
      } catch (_) {}

      setStartupWorkDone(true);
    };
    startup();
  }, []);

  const [bootAnimDone, setBootAnimDone] = useState(false);
  const [startupWorkDone, setStartupWorkDone] = useState(false);
  const handleBootComplete = useCallback(() => setBootAnimDone(true), []);

  // Transition to main UI when both boot animation and startup work are done
  useEffect(() => {
    if (bootAnimDone && startupWorkDone) {
      const timer = setTimeout(() => setIsLoading(false), 200);
      return () => clearTimeout(timer);
    }
  }, [bootAnimDone, startupWorkDone]);

  // Safety timeout: force main UI after 15s regardless
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 15000);
    return () => clearTimeout(timer);
  }, []);

  // Re-check mod updates when install/tag changes
  useEffect(() => {
    checkModUpdates();
  }, [checkModUpdates]);

  // Save mods when they change
  useEffect(() => {
    if (!isLoading) {
      saveModsToFilesystem(installedMods);
    }
  }, [installedMods, isLoading]);

  // Download Oxevy mod
  const handleDownloadOxevy = async () => {
    setIsDownloading(true);
    addPopup('info', 'Downloading Oxevy', 'Fetching Oxevy mod from GitHub...', 0);
    try {
      const result = await window.electron.downloadOxevy();
      if (result.success) {
        setOxevyInstalled(true);
        if (result.tag) setInstalledModTag(result.tag);
        if (latestModTag && result.tag && latestModTag === result.tag) {
          setModUpdateAvailable(false);
        }
        setIsDownloading(false);
        addPopup('success', 'Oxevy Installed!', 'The Oxevy mod has been installed successfully.', 5000);
      } else {
        setIsDownloading(false);
        addPopup('error', 'Download Failed', result.error || 'Failed to download Oxevy mod.', 5000);
      }
    } catch (error) {
      setIsDownloading(false);
      addPopup('error', 'Download Failed', error.message, 5000);
    }
  };

  // Mod Management Functions
  const handleInstallMod = async () => {
    // Open the mods folder and show instructions
    addPopup('info', 'Install Mod', 'Place your .jar mod file in the mods directory and then click Refresh to see it.', 5000);
    await handleOpenModFolder();
  };
  
  const handleUninstallMod = async (modId) => {
    const mod = installedMods.find(m => m.id === modId);
    if (!mod) return;
    
    try {
      const updated = installedMods.filter(m => m.id !== modId);
      setInstalledMods(updated);
      addPopup('info', 'Mod Uninstalled', `${mod.name} has been removed.`, 3000);
    } catch (error) {
      addPopup('error', 'Uninstall Failed', error.message, 4000);
    }
  };
  
  const handleToggleMod = async (modId, enabled) => {
    const mod = installedMods.find(m => m.id === modId);
    if (!mod) return;
    
    try {
      const updated = installedMods.map(m => m.id === modId ? { ...m, enabled } : m);
      setInstalledMods(updated);
      addPopup('success', enabled ? 'Mod Enabled' : 'Mod Disabled', `${mod.name} ${enabled ? 'activated' : 'deactivated'}.`, 2500);
    } catch (error) {
      addPopup('error', 'Toggle Failed', error.message, 4000);
    }
  };
  
  const handleOpenModFolder = async () => {
    try {
      await window.electron.openGameFolder();
      addPopup('success', 'Mods Folder', 'Opening mods directory...', 2000);
    } catch (error) {
      addPopup('error', 'Open Failed', 'Could not open mods folder.', 3000);
    }
  };
  
  const handleRefreshMods = async () => {
    addPopup('info', 'Refreshing', 'Loading installed mods...', 1500);
    await loadMods();
    addPopup('success', 'Refreshed', `Loaded ${installedMods.length} mods.`, 2000);
  };

  // Synthesized whoosh sound at 1% volume, prevents stacking
  const playWhoosh = useCallback(() => {
    if (soundPlayingRef.current) return;
    soundPlayingRef.current = true;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const duration = 0.6;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(150, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.5);
      filter.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      gain.gain.linearRampToValueAtTime(0.009, ctx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(ctx.currentTime);
      source.stop(ctx.currentTime + duration);
    } catch (_) {}

    setTimeout(() => { soundPlayingRef.current = false; }, 700);
  }, []);

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      playWhoosh();
      prevTabRef.current = activeTab;
    }
  }, [activeTab, playWhoosh]);

  const [username, setUsername] = useState('Player');
  const [authType, setAuthType] = useState('offline');
  const [microsoftProfile, setMicrosoftProfile] = useState(null);
  const [msaLoginState, setMsaLoginState] = useState('idle');
  const [msaUserCode, setMsaUserCode] = useState('');
  const [msaVerificationUri, setMsaVerificationUri] = useState('');
  const [msaErrorDetails, setMsaErrorDetails] = useState('');
  const [keyLoggedIn, setKeyLoggedIn] = useState(true);
  const [currentKey, setCurrentKey] = useState(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Ready to play');
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [hoursPlayed, setHoursPlayed] = useState(0);
  const [ping, setPing] = useState(null);
  const [popups, setPopups] = useState([]);
  const [welcomeComplete, setWelcomeComplete] = useState(false);
  const [subtitleComplete, setSubtitleComplete] = useState(false);
  const [showHomeContent, setShowHomeContent] = useState(false);
  const [memory, setMemory] = useState('4G');
  const [ramSlider, setRamSlider] = useState(4);
  const [selectedVersion, setSelectedVersion] = useState('1.21.11');
  const [settings, setSettings] = useState({
    autoLogin: true,
    closeOnLaunch: false,
    hardwareAcceleration: true,
    showFps: true,
    discordRichPresence: false
  });
  const [selectedCapeUrl, setSelectedCapeUrl] = useState(null);
  const [capeUrlName, setCapeUrlName] = useState('');
  const [capeMode, setCapeMode] = useState('NONE');

  async function loadCapeConfig() {
    try {
      const result = await window.electron.getCapeConfig();
      if (result.success && result.config) {
        setCapeMode(result.config.mode || 'NONE');
        if (result.config.url) {
          setSelectedCapeUrl(result.config.url);
          setCapeUrlName(result.config.name || 'Custom Cape');
        }
      }
    } catch (_) {}
  }

  // Load saved config on startup
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await window.electron.getUserConfig();
        if (config) {
          setUsername(config.username || 'Player');
          setAuthType(config.authType || 'offline');
          if (config.authType === 'microsoft' && config.microsoft?.profile) {
            setMicrosoftProfile(config.microsoft.profile);
            if (config.microsoft.profile.name) setUsername(config.microsoft.profile.name);
          } else {
            setMicrosoftProfile(null);
          }
          setMemory(config.memory || '4G');
          setRamSlider(config.ramSlider || 4);
          if (config.settings) {
            setSettings(config.settings);
          }
          if (config.selectedVersion) {
            setSelectedVersion(config.selectedVersion);
          }
          if (config.hoursPlayed != null) {
            setHoursPlayed(config.hoursPlayed);
          }
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    loadConfig();
    loadCapeConfig();
  }, []);

  useEffect(() => {
    return window.electron.onMicrosoftLogin((data) => {
      if (data?.state === 'code') {
        setMsaLoginState('code');
        setMsaUserCode(data.userCode || '');
        setMsaVerificationUri(data.verificationUri || '');
        setMsaErrorDetails('');
        addPopup('info', 'Microsoft Login', `Code: ${data.userCode}. Open: ${data.verificationUri}`, 12000);
        return;
      }
      if (data?.state === 'success') {
        setMsaLoginState('success');
        setMsaErrorDetails('');
        const profile = data.profile || null;
        setAuthType('microsoft');
        setMicrosoftProfile(profile);
        if (profile?.name) setUsername(profile.name);
        addPopup('success', 'Signed In', `Logged in as ${profile?.name || 'Microsoft account'}.`, 6000);
        return;
      }
      if (data?.state === 'error') {
        setMsaLoginState('error');
        setMsaErrorDetails(data.details || data.message || 'Login failed.');
        addPopup('error', 'Microsoft Login Failed', data.message || 'Login failed.', 8000);
      }
    });
  }, []);

  const saveConfig = async (extra = {}) => {
    try {
      await window.electron.saveUserConfig({
        username,
        authType,
        memory,
        ramSlider,
        selectedVersion,
        settings,
        keyLoggedIn,
        installedMods,
        hoursPlayed: hoursPlayedRef.current,
        ...extra
      });
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const toggleSetting = (key) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: !prev[key] };
      return newSettings;
    });
    setTimeout(() => saveConfig(), 100);
  };

  const handleRamChange = (value) => {
    setRamSlider(value);
    setMemory(`${value}G`);
    setTimeout(() => saveConfig(), 100);
  };

  const addPopup = (type, title, message, duration = 1000) => {
    const id = Date.now() + Math.random();
    setPopups(prev => [...prev, { id, type, title, message, duration }]);
    return id;
  };

  const removePopup = (id) => {
    setPopups(prev => prev.filter(popup => popup.id !== id));
  };

  useEffect(() => {
    window.electron.onProgress((data) => {
      setProgress(data.percent || 0);
      setStatus(data.type || 'Downloading...');
      setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${data.type || 'Download'}: ${data.percent || 0}%`]);
    });

    window.electron.onLaunchState((data) => {
      if (data.state === 'running') {
        setIsLaunching(false);
        setIsGameRunning(true);
        setStatus('Running');
      } else if (data.state === 'closed') {
        setIsLaunching(false);
        setIsGameRunning(false);
        setStatus('Ready');
        addPopup('info', 'Game Closed', 'Minecraft has been closed.', 3000);
      } else if (data.state === 'error') {
        setIsLaunching(false);
        setIsGameRunning(false);
        setStatus('Error');
        addPopup('error', 'Launch Error', data.message || 'Unknown error occurred.', 3000);
      }
    });
  }, []);

  useEffect(() => {
    if (ping && ping !== 'N/A') {
      if (ping > 200) {
        addPopup('warning', 'High Latency Detected', `Your ping is ${ping}ms. You may experience lag.`, 4000);
      }
    }
  }, [ping]);

  useEffect(() => {
    if (activeTab === 'home') {
      setWelcomeComplete(false);
      setSubtitleComplete(false);
      setShowHomeContent(false);
    }
    if (activeTab === 'account' || activeTab === 'capes') {
      loadCapeConfig();
    }
  }, [activeTab]);

  const hoursPlayedRef = useRef(hoursPlayed);
  hoursPlayedRef.current = hoursPlayed;
  const saveConfigRef = useRef(saveConfig);
  saveConfigRef.current = saveConfig;

  useEffect(() => {
    const interval = setInterval(() => {
      setHoursPlayed(prev => prev + 0.000278);
    }, 1000);
    const handleBeforeUnload = () => {
      saveConfigRef.current({ hoursPlayed: hoursPlayedRef.current });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const measurePing = async () => {
      const startTime = performance.now();
      try {
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
          mode: 'no-cors',
        });
        const endTime = performance.now();
        setPing(Math.round(endTime - startTime));
      } catch (error) {
        const imgStartTime = performance.now();
        const img = new Image();
        img.onload = () => {
          const imgEndTime = performance.now();
          setPing(Math.round(imgEndTime - imgStartTime));
        };
        img.onerror = () => {
          fetch('https://www.google.com', { mode: 'no-cors', cache: 'no-cache' })
            .then(() => {
              const fallbackEnd = performance.now();
              setPing(Math.round(fallbackEnd - imgStartTime));
            })
            .catch(() => setPing('N/A'));
        };
        img.src = 'https://www.google.com/favicon.ico?' + Date.now();
      }
    };
    measurePing();
    const interval = setInterval(measurePing, 10000);
    return () => clearInterval(interval);
  }, []);

  const getPingColor = (pingValue) => {
    if (pingValue === null || pingValue === 'N/A') return 'text-green-500/60';
    if (pingValue < 50) return 'text-green-400';
    if (pingValue < 100) return 'text-green-400';
    if (pingValue < 150) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPingBackground = (pingValue) => {
    if (pingValue === null || pingValue === 'N/A') return 'bg-green-500/10 border-green-500/20';
    if (pingValue < 50) return 'bg-green-500/10 border-green-500/20';
    if (pingValue < 100) return 'bg-green-500/10 border-green-500/20';
    if (pingValue < 150) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const handleLaunch = async () => {
    await saveConfig();
    setIsLaunching(true);
    setStatus('Initializing...');
    addPopup('info', 'Launching Minecraft', 'Preparing to start the game...', 3000);

    try {
      await window.electron.launch({ username, memory: `${ramSlider}G`, version: selectedVersion, authType });
      if (settings.closeOnLaunch) {
        window.electron.closeLauncher();
      }
      addPopup('success', 'Game Launched', 'Minecraft is starting up!', 4000);
    } catch (err) {
      console.error(err);
      setIsLaunching(false);
      setStatus('Launch failed');
      addPopup('error', 'Launch Failed', 'Failed to start Minecraft. Please try again.', 5000);
    }
  };

  const handleStop = async () => {
    try {
      await window.electron.forceStop();
      setIsGameRunning(false);
      setStatus('Ready');
      addPopup('info', 'Game Stopped', 'Minecraft has been stopped.', 3000);
    } catch (err) {
      console.error(err);
      addPopup('error', 'Stop Failed', 'Failed to stop Minecraft.', 3000);
    }
  };

  const handleSaveChanges = async () => {
    await saveConfig();
    addPopup('success', 'Changes Saved', 'Your settings have been saved.', 3000);
  };

  const handleMicrosoftLogin = async () => {
    setMsaLoginState('waiting');
    setMsaUserCode('');
    setMsaVerificationUri('');
    setMsaErrorDetails('');
    addPopup('info', 'Microsoft Login', 'Starting Microsoft sign-in...', 4000);
    const result = await window.electron.beginMicrosoftLogin({ force: true });
    if (!result?.success) {
      setMsaLoginState('error');
      setMsaErrorDetails(result?.error || 'Could not start login.');
      addPopup('error', 'Microsoft Login Failed', result?.error || 'Could not start login.', 8000);
    }
  };

  const handleMicrosoftLogout = async () => {
    const result = await window.electron.logoutMicrosoft();
    if (result?.success) {
      setAuthType('offline');
      setMicrosoftProfile(null);
      setMsaLoginState('idle');
      setMsaUserCode('');
      setMsaVerificationUri('');
      setMsaErrorDetails('');
      addPopup('info', 'Signed Out', 'Microsoft account removed from this launcher.', 5000);
    } else {
      addPopup('error', 'Sign Out Failed', result?.error || 'Could not sign out.', 6000);
    }
  };

  const handleOpenGameFolder = async () => {
    const result = await window.electron.openGameFolder();
    if (!result?.success) {
      addPopup('error', 'Open Folder Failed', result?.error || 'Could not open game folder.', 5000);
    } else {
      addPopup('success', 'Opened Folder', result?.path || 'Game folder opened.', 2500);
    }
  };

  const handleCopyMsaCode = async () => {
    if (!msaUserCode) return;
    try {
      await navigator.clipboard.writeText(msaUserCode);
      addPopup('success', 'Copied', 'Device code copied to clipboard.', 2500);
    } catch (_) {
      addPopup('error', 'Copy Failed', 'Could not copy to clipboard.', 3000);
    }
  };

  const handleOpenMsaPage = async () => {
    const url = msaVerificationUri || 'https://www.microsoft.com/link';
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (_) {}
  };

  const handleVersionSelect = (version) => {
    setSelectedVersion(version);
    addPopup('success', 'Version Changed', `Switched to Minecraft ${version}`, 3000);
    setTimeout(() => saveConfig(), 100);
  };

  const handleCheckUpdates = async () => {
    addPopup('info', 'Checking for Updates', 'Checking Oxevy mod releases...', 3000);
    await checkModUpdates();

    if (!oxevyInstalled) {
      addPopup('info', 'Not Installed', 'Oxevy is not installed yet. Use "Download Oxevy" to install it.', 5000);
      return;
    }

    if (latestModTag && installedModTag && latestModTag === installedModTag) {
      addPopup('success', 'Up to Date', `Oxevy mod is up to date (${installedModTag}).`, 4500);
      return;
    }

    if (latestModTag) {
      addPopup('info', 'Update Available', `Oxevy mod update available: ${latestModTag}`, 5500);
    } else {
      addPopup('error', 'Check Failed', 'Could not read latest release info.', 4500);
    }
  };

  const handleOpenConsole = () => {
    setShowLogs(!showLogs);
    if (!showLogs) {
      addPopup('info', 'Console Opened', 'Debug console is now visible.', 2000);
    }
  };

  const handleLogout = async () => {
    setCurrentKey(null);
    await saveConfig({ keyLoggedIn: true });
    setKeyLoggedIn(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

   return (
      <div className="flex h-screen bg-black text-green-400/80 overflow-hidden rounded-xl border border-green-500/20 shadow-2xl relative">
        {/* Boot Screen */}
        {isLoading && (
          <BootScreen onBootComplete={handleBootComplete} />
        )}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} username={username} hoursPlayed={hoursPlayed} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Update Banner */}
        {modUpdateAvailable && latestModTag && (
          <div className="relative z-[99999] bg-yellow-500/10 border-b border-yellow-500/30 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-3 px-4 py-2 text-sm">
              <Info size={16} className="text-yellow-400" />
              <span className="text-yellow-300 font-medium">
                Oxevy mod update {latestModTag} available!
              </span>
              <button
                onClick={handleDownloadOxevy}
                disabled={isDownloading}
                className="text-xs bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-black px-3 py-1 rounded-lg transition-colors font-medium"
              >
                {isDownloading ? 'Updating...' : 'Update Now'}
              </button>
            </div>
          </div>
        )}

        {/* Top Bar */}
        <div className="h-14 flex items-center justify-between px-6 drag-region border-b border-green-500/15">
          <div className="flex items-center gap-4 no-drag">
            <span className="text-xs font-bold tracking-[0.2em] text-green-500/50 uppercase font-dynapuff">
              Oxevy Launcher
            </span>
            <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-medium text-green-400">
              v2.0.0
            </span>
          </div>
          <div className="flex items-center gap-1 no-drag">
            <button
              onClick={() => window.electron.minimize()}
              className="p-2 hover:bg-green-500/10 rounded-lg transition-colors"
            >
              <Minus size={16} className="text-green-500/60" />
            </button>
            <button
              onClick={() => window.electron.close()}
              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
            >
              <X size={16} className="text-green-500/60 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-drag">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="p-8 space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold text-green-200 mb-2 font-dynapuff">
                      {getGreeting()},{' '}
                      <Typewriter
                        text={username}
                        speed={100}
                        delay={300}
                        className="text-green-400"
                        onComplete={() => setWelcomeComplete(true)}
                      />
                      <span className="text-2xl ml-1"></span>
                    </h1>
                    <div className="text-sm text-green-500/50">
                      {welcomeComplete && (
                        <Typewriter
                          text="Ready for your next adventure?"
                          speed={50}
                          delay={200}
                          onComplete={() => {
                            setSubtitleComplete(true);
                            setTimeout(() => setShowHomeContent(true), 300);
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <motion.div
                    className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all duration-300 ${getPingBackground(ping)}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 2, duration: 0.5 }}
                  >
                    <Wifi size={14} className={getPingColor(ping)} />
                    <span className={`text-xs font-medium ${getPingColor(ping)}`}>
                      {ping !== null ? `${ping}ms` : 'Measuring...'}
                    </span>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: showHomeContent ? 1 : 0, y: showHomeContent ? 0 : 20 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  {oxevyInstalled === false && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3"
                    >
                      <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-yellow-400 mb-1">Oxevy Mod Not Installed</h3>
                        <p className="text-xs text-green-500/60 mb-3">
                          The Oxevy mod is required to use this launcher. Click below to download it from GitHub.
                        </p>
                        <button
                          onClick={handleDownloadOxevy}
                          disabled={isDownloading}
                          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors text-xs uppercase tracking-wider disabled:opacity-50"
                        >
                          {isDownloading ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="inline-block mr-2"
                              >
                                <RefreshCw size={14} />
                              </motion.div>
                              Downloading...
                            </>
                          ) : (
                            'Download Oxevy Mod'
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <StatCard icon={Users} label="Online Players" value="-1" color="blue" />
                    <StatCard
                      icon={Clock}
                      label="Hours Played"
                      value={formatHours(hoursPlayed)}
                      color="amber"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-green-200 flex items-center gap-2 font-dynapuff">
                        <Bell size={18} className="text-green-400" />
                        Latest Updates
                      </h2>
                    </div>
                    <div className="space-y-2">
                      <NewsCard icon={Star} title="New GUI System Released" time="--:--" />
                      <NewsCard icon={Shield} title="LoL Better Rendering in place" time="--:--" />
                      <NewsCard icon={Gamepad2} title="2 Clickgui Mode" time="--:--" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCheckUpdates}
                      className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 text-left hover:border-green-500/30 transition-all group"
                    >
                      <Download size={24} className="text-green-400 mb-3" />
                      <h3 className="font-bold text-green-200 mb-1">Check for Updates</h3>
                      <p className="text-sm text-green-500/50">Download the latest client version</p>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleOpenConsole}
                      className="p-6 rounded-xl bg-green-500/[0.04] border border-green-500/15 text-left hover:border-green-500/30 transition-all group"
                    >
                      <Terminal size={24} className="text-green-500/60 group-hover:text-green-400 transition-colors mb-3" />
                      <h3 className="font-bold text-green-200 mb-1">Open Console</h3>
                      <p className="text-sm text-green-500/50">View debug information and logs</p>
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'Inject' && (
              <InjectTab />
            )}

            {activeTab === 'Gameversion' && (
              <motion.div
                key="gameversion"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-8 max-w-3xl"
              >
                <h2 className="text-2xl font-bold text-green-200 mb-6">Game Version & Mods</h2>
                <div className="bg-green-500/[0.04] border border-green-500/15 rounded-2xl p-6 space-y-6">
                  {/* Version Selection */}
                  <div>
                    <h3 className="text-green-200 font-bold mb-3">Minecraft Version</h3>
                    <div className="flex gap-3 flex-wrap">
                      {[
                        { version: '1.21.11', label: 'Latest Release', recommended: true },
                        { version: '1.21.8', label: 'Stable Build' },
                        { version: '1.21.4', label: 'Legacy Support' },
                      ].map((item) => {
                        const isSelected = selectedVersion === item.version;
                        return (
                          <motion.button
                            key={item.version}
                            onClick={() => handleVersionSelect(item.version)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                              isSelected
                                ? 'bg-green-500 text-black shadow-lg shadow-green-500/20'
                                : 'bg-green-500/10 border border-green-500/20 text-green-400/80 hover:bg-green-500/15'
                            }`}
                          >
                            {item.version} {item.recommended && '✓'}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Version Info */}
                  <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3">
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Active Version: Minecraft {selectedVersion}
                    </p>
                  </div>

                  {/* Mod Manager Integration */}
                  <ModManager
                    installedMods={installedMods}
                    onInstall={handleInstallMod}
                    onUninstall={handleUninstallMod}
                    onToggle={handleToggleMod}
                    isInstalling={isInstallingMod}
                    onOpenFolder={handleOpenModFolder}
                    onRefresh={handleRefreshMods}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-8 max-w-xl"
              >
                <h2 className="text-2xl font-bold text-green-200 mb-6">Account Manager</h2>
                <div className="bg-green-500/[0.04] border border-green-500/15 rounded-2xl p-8 space-y-6">
                  <div className="flex items-center gap-6 pb-6 border-b border-green-500/15">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-green-500/20 hover:border-green-500/50 transition-all duration-200 bg-green-950 shadow-lg">
                        <img
                          src={`https://mc-heads.net/avatar/${username || 'MHF_Steve'}/150`}
                          alt={`${username}'s Minecraft avatar`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://mc-heads.net/avatar/MHF_Steve/150';
                          }}
                        />
                      </div>
                      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 -bottom-2 left-1/2 -translate-x-1/2 translate-y-full pointer-events-none z-50">
                        <div className="bg-green-950 border border-green-500/20 rounded-xl p-2 shadow-2xl">
                          <img
                            src={`https://mc-heads.net/player/${username || 'MHF_Steve'}/100`}
                            alt={`${username}'s full body`}
                            className="w-32 h-48 object-contain"
                            onError={(e) => {
                              e.target.src = 'https://mc-heads.net/player/MHF_Steve/100';
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-green-200 flex items-center gap-2">
                        {username}
                        <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-medium text-green-400">
                          {username !== 'Player' ? 'Custom' : 'Default'}
                        </span>
                      </h3>
                      <p className="text-sm text-green-500/50 mt-1">
                        {authType === 'microsoft' ? 'Microsoft Account (Premium)' : 'Offline Account'}
                      </p>
                      <p className="text-[10px] text-green-500/40 mt-2">
                        Avatars by <a href="https://mc-heads.net" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">MC-Heads</a>
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-green-500/50 mb-3 block tracking-wider">
                      Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={authType === 'microsoft'}
                        className={`w-full bg-black border border-green-500/15 rounded-xl p-4 text-green-200 outline-none transition-all placeholder-green-500/40 pr-12 ${
                          authType === 'microsoft'
                            ? 'opacity-60 cursor-not-allowed'
                            : 'focus:border-green-500/50'
                        }`}
                        placeholder={authType === 'microsoft' ? 'Managed by Microsoft login' : 'Enter your username...'}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg overflow-hidden bg-green-950 border border-green-500/15">
                        <img
                          src={`https://mc-heads.net/avatar/${username || 'Player'}/40`}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://mc-heads.net/avatar/MHF_Steve/40';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      onClick={handleSaveChanges}
                      disabled={authType === 'microsoft'}
                      className="w-full bg-green-500 hover:bg-green-600 text-black font-bold p-4 rounded-xl transition-all hover:shadow-lg hover:shadow-green-500/20 uppercase text-sm tracking-wider"
                    >
                      Save Changes
                    </button>
                    {authType === 'microsoft' ? (
                      <button
                        onClick={handleMicrosoftLogout}
                        className="w-full bg-green-500/10 hover:bg-green-500/15 text-green-200 font-medium p-4 rounded-xl transition-all uppercase text-sm tracking-wider"
                      >
                        Sign Out Microsoft Account
                      </button>
                    ) : (
                      <button
                        onClick={handleMicrosoftLogin}
                        className="w-full bg-green-500/10 hover:bg-green-500/15 text-green-200 font-medium p-4 rounded-xl transition-all uppercase text-sm tracking-wider"
                      >
                        Sign In with Microsoft
                      </button>
                    )}

                    {authType !== 'microsoft' && msaLoginState !== 'idle' && (
                      <div className="bg-green-500/[0.04] border border-green-500/15 rounded-xl p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-green-500/50">Microsoft Sign-In</p>
                        {msaLoginState === 'waiting' && (
                          <p className="text-sm text-green-400/80 mt-2">Waiting for device code…</p>
                        )}
                        {msaLoginState === 'code' && (
                          <div className="mt-2 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs text-green-500/50">Enter this code:</p>
                                <p className="text-lg font-bold text-green-200 tracking-widest font-mono">{msaUserCode || '—'}</p>
                              </div>
                              <button
                                onClick={handleCopyMsaCode}
                                className="shrink-0 px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/15 text-green-200 text-xs font-medium transition-all"
                              >
                                Copy Code
                              </button>
                            </div>
                            <button
                              onClick={handleOpenMsaPage}
                              className="w-full px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/15 text-green-200 text-xs font-medium transition-all"
                            >
                              Open Microsoft Login Page
                            </button>
                            <p className="text-[10px] text-green-500/40">
                              If the browser is already open, just paste the code there.
                            </p>
                          </div>
                        )}
                        {msaLoginState === 'error' && (
                          <div className="mt-2 space-y-2">
                            <p className="text-sm text-red-300">Login failed. Try again.</p>
                            {msaErrorDetails && (
                              <pre className="text-[10px] text-green-500/60 bg-black border border-green-500/15 rounded-lg p-3 whitespace-pre-wrap break-words max-h-32 overflow-auto">
                                {msaErrorDetails}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cape Section */}
                  <div className="pt-6 border-t border-green-500/15">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Image size={16} className="text-green-400" />
                        <h3 className="text-green-200 font-bold text-sm">Active Cape</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('capes')}
                        className="text-xs text-green-400 hover:text-green-300 transition flex items-center gap-1"
                      >
                        Browse Capes
                        <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className="bg-green-500/[0.04] border border-green-500/15 rounded-xl p-4 flex items-center gap-4">
                      <div className="w-16 h-8 rounded-lg overflow-hidden bg-green-950 flex-shrink-0">
                        {selectedCapeUrl ? (
                          <img src={selectedCapeUrl} alt="Cape" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image size={16} className="text-green-500/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                      <p className="text-sm text-green-200 font-medium truncate">{capeUrlName || 'No cape selected'}</p>
                      <p className="text-xs text-green-500/50 truncate">{capeMode === 'NONE' ? 'Cape is disabled' : 'Cape is active'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'console' && (
              <motion.div
                key="console"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-8 max-w-4xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-green-200">Console</h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setLogs([])}
                      className="px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/15 text-green-200 text-sm font-medium transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="bg-black border border-green-500/20 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-green-500/20 flex items-center gap-2 text-green-500/60">
                    <Terminal size={16} className="text-green-400" />
                    <p className="text-xs font-medium">Logs ({logs.length})</p>
                  </div>
                  <div className="p-4 h-[420px] overflow-y-auto font-mono text-xs">
                    {logs.length === 0 ? (
                      <p className="text-green-500/50">No logs yet. Launch the game to see output.</p>
                    ) : (
                      logs.map((log, i) => (
                        <div key={i} className="text-green-400/80 hover:text-green-400 transition-colors py-0.5">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'capes' && (
              <motion.div
                key="capes"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-8 max-w-4xl"
              >
                <h2 className="text-2xl font-bold text-green-200 mb-2">Cape Selection</h2>
                <p className="text-sm text-green-500/50 mb-6">Choose your in-game cape from the repository</p>
                <CapeSelector />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-8 max-w-xl"
              >
                <h2 className="text-2xl font-bold text-green-200 mb-6">Settings</h2>

                <button
                  onClick={handleOpenGameFolder}
                  className="w-full bg-green-500/[0.04] hover:bg-green-500/10 border border-green-500/15 rounded-2xl p-5 mb-4 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                      <FolderOpen size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-green-200 font-medium">Open Minecraft Folder</p>
                      <p className="text-xs text-green-500/50 mt-0.5">Opens the launcher game directory</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-green-500/40" />
                </button>

                <div className="bg-green-500/[0.04] border border-green-500/15 rounded-2xl p-5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Server size={16} className="text-green-400" />
                      <div>
                        <p className="text-green-200 font-medium">Memory Allocation</p>
                        <p className="text-xs text-green-500/50 mt-0.5">{ramSlider} GB allocated for Minecraft</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-green-400">{ramSlider}G</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="16"
                    step="1"
                    value={ramSlider}
                    onChange={(e) => handleRamChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-green-950 rounded-lg appearance-none cursor-pointer accent-green-500"
                  />
                  <div className="flex justify-between text-xs text-green-500/50 mt-2">
                    <span>2GB</span>
                    <span>8GB</span>
                    <span>16GB</span>
                  </div>
                </div>

                <div className="bg-green-500/[0.04] border border-green-500/15 rounded-2xl divide-y divide-green-500/15">
                  {[
                    { key: 'autoLogin', label: 'Auto-Login', desc: 'Automatically login on startup' },
                    { key: 'closeOnLaunch', label: 'Close on Launch', desc: 'Close launcher when game starts' },
                    { key: 'hardwareAcceleration', label: 'Hardware Acceleration', desc: 'Use GPU for rendering' },
                    { key: 'showFps', label: 'Show FPS Counter', desc: 'Display in-game FPS' },
                    { key: 'discordRichPresence', label: 'Discord Rich Presence', desc: 'Show game status in Discord' },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-5 hover:bg-green-500/[0.04] transition-colors">
                      <div>
                        <p className="text-green-200 font-medium">{setting.label}</p>
                        <p className="text-xs text-green-500/50 mt-0.5">
                          {settings[setting.key] ? setting.desc : 'Disabled'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          toggleSetting(setting.key);
                          addPopup('info', `${setting.label} ${settings[setting.key] ? 'Disabled' : 'Enabled'}`,
                            `${setting.label} has been ${settings[setting.key] ? 'disabled' : 'enabled'}.`, 2000);
                        }}
                        className={`w-12 h-6 rounded-full relative transition-colors ${
                          settings[setting.key] ? 'bg-green-500' : 'bg-green-950'
                        }`}
                      >
                        <motion.div
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                          animate={{ left: settings[setting.key] ? '28px' : '4px' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-green-500/15">
                  <button
                    onClick={handleLogout}
                    className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-bold transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <PopupContainer popups={popups} removePopup={removePopup} />

        <div className="border-t border-green-500/15 bg-black/70 backdrop-blur-sm no-drag relative">
          {isLaunching && (
            <motion.div
              className="h-0.5 bg-gradient-to-r from-green-500 to-green-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          )}

          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-950 to-black flex items-center justify-center border border-green-500/15">
                <Gamepad2 size={22} className="text-green-500/60" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-200">
                  {isLaunching ? 'Launching...' : isGameRunning ? 'Minecraft Running' : `Minecraft ${selectedVersion}`}
                </p>
                <p className="text-xs text-green-500/50 font-medium">{status}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isLaunching && logs.length > 0 && (
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="text-xs text-green-500/50 hover:text-green-400 transition-colors font-medium"
                >
                  {showLogs ? 'Hide Console' : `Console (${logs.length})`}
                </button>
              )}
            </div>

            <motion.button
              onClick={isGameRunning ? handleStop : handleLaunch}
              disabled={isLaunching}
              whileHover={!isLaunching ? { scale: 1.02 } : {}}
              whileTap={!isLaunching ? { scale: 0.98 } : {}}
              className={`px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center gap-3 transition-all ${
                isLaunching
                  ? 'bg-green-950 text-green-500/50 cursor-not-allowed border border-green-500/15'
                  : isGameRunning
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-black hover:shadow-lg hover:shadow-red-500/25'
                    : 'bg-gradient-to-r from-green-500 to-green-600 text-black hover:shadow-lg hover:shadow-green-500/25'
              }`}
            >
              {isLaunching ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Terminal size={18} />
                  </motion.div>
                  <span>Launching</span>
                </>
              ) : isGameRunning ? (
                <>
                  <X size={18} />
                  <span>Stop Game</span>
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  <span>Launch Game</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 200, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-green-500/15 bg-black backdrop-blur-sm"
            >
              <div className="p-4 h-full overflow-y-auto font-mono text-xs">
                {logs.slice(-200).map((log, i) => (
                  <div key={i} className="text-green-400/80 hover:text-green-400 transition-colors py-0.5">
                    {log}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
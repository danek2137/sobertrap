interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  config?: Record<string, unknown>;
  path?: string;
  backups?: string[];
}

interface CrosshairOptions {
  type: 'dot' | 'cross' | 'circle' | 'crosshair' | 'plus';
  color: string;
  size: number;
  opacity: number;
}

interface GameProfile {
  id: string;
  name: string;
  gameName?: string;
  gameId?: string;
  fflags: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

interface Window {
  api: {
    loadConfig: () => Promise<ApiResponse>;
    saveConfig: (config: Record<string, unknown>) => Promise<ApiResponse>;
    backupConfig: () => Promise<ApiResponse>;
    listBackups: () => Promise<ApiResponse>;
    restoreBackup: (filename: string) => Promise<ApiResponse>;
    launchSober: () => Promise<ApiResponse>;
    minimizeWindow: () => void;
    closeWindow: () => void;
    showCrosshair: (options: CrosshairOptions) => void;
    hideCrosshair: () => void;
    updateCrosshair: (options: Partial<CrosshairOptions>) => void;
    loadTunerConfig: () => Promise<ApiResponse>;
    saveTunerConfig: (config: Record<string, unknown>) => Promise<ApiResponse>;
  };
}

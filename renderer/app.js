const PRESETS = {
  performance: {
    "DFFlagDebugPauseVoxelizer": true,
    "DFFlagDebugPerfMode": true,
    "DFFlagDebugSkipMeshVoxelizer": true,
    "DFFlagTextureQualityOverrideEnabled": true,
    "DFIntAnimationLodFacsDistanceMax": 0,
    "DFIntAnimationLodFacsDistanceMin": 0,
    "DFIntAnimationLodFacsVisibilityDenominator": 0,
    "DFIntCSGLevelOfDetailSwitchingDistance": 0,
    "DFIntCSGLevelOfDetailSwitchingDistanceL12": 0,
    "DFIntCSGLevelOfDetailSwitchingDistanceL23": 0,
    "DFIntCSGLevelOfDetailSwitchingDistanceL34": 0,
    "DFIntDebugFRMQualityLevelOverride": 1,
    "DFIntMaxParticleCount": 50,
    "DFIntTextureQualityOverride": 0,
    "FFlagDebugDisableTelemetryEphemeralCounter": true,
    "FFlagDebugDisableTelemetryEphemeralStat": true,
    "FFlagDebugDisableTelemetryEventIngest": true,
    "FFlagDebugDisableTelemetryPoint": true,
    "FFlagDebugDisableTelemetryV2Counter": true,
    "FFlagDebugDisableTelemetryV2Event": true,
    "FFlagDebugDisableTelemetryV2Stat": true,
    "FFlagDebugDisplayFPS": true,
    "FFlagDebugGraphicsPreferVulkan": true,
    "FFlagDisableBloom": true,
    "FFlagDisableDepthOfField": true,
    "FFlagDisableGlobalShadows": true,
    "FFlagDisablePostFx": true,
    "FFlagEnableReducedLatency": true,
    "FFlagFastGPULightCulling3": true,
    "FFlagRenderEnableParallelBufferJobs": true,
    "FFlagRenderSkipForwardRender": true,
    "FFlagRenderVulkanFixMinimizeWindow": true,
    "FFlagRenderVulkanForceExclusiveFullscreen": true,
    "FIntDebugForceMSAASamples": 1,
    "FIntFRMMaxGrassDistance": 0,
    "FIntFRMMinGrassDistance": 0,
    "FIntRenderCharacterLodScale": 30,
    "FIntRenderShadowIntensity": 1,
    "FIntTerrainOTAMaxTextureSize": 128,
    "FIntTextureCompositorLowResFactor": 1,
  },
  balanced: {
    "DFFlagDebugPauseVoxelizer": false,
    "DFFlagTextureQualityOverrideEnabled": true,
    "DFIntDebugFRMQualityLevelOverride": 1,
    "DFIntTaskSchedulerTargetFps": 60,
    "DFIntTextureQualityOverride": 2,
    "FFlagDebugDisableTelemetryEphemeralCounter": true,
    "FFlagDebugDisableTelemetryEphemeralStat": true,
    "FFlagDebugDisableTelemetryEventIngest": true,
    "FFlagDebugDisableTelemetryPoint": true,
    "FFlagDebugDisableTelemetryV2Counter": true,
    "FFlagDebugDisableTelemetryV2Event": true,
    "FFlagDebugDisableTelemetryV2Stat": true,
    "FFlagDebugGraphicsPreferVulkan": true,
    "FFlagDisablePostFx": false,
    "FFlagFastGPULightCulling3": true,
    "FIntDebugForceMSAASamples": 1,
    "FIntTerrainOTAMaxTextureSize": 256,
    "FIntTextureCompositorLowResFactor": 1,
  },
};

const QUICK_FLAGS = [
  { key: 'FFlagDebugGraphicsPreferVulkan', label: 'Prefer Vulkan renderer', description: 'Use Vulkan as the preferred graphics renderer.', group: 'Graphics' },
  { key: 'FFlagDisablePostFx', label: 'Disable post effects', description: 'Turns off post-processing effects for a cleaner image.', group: 'Graphics' },
  { key: 'FFlagDisableBloom', label: 'Disable bloom', description: 'Removes the glow effect from bright objects.', group: 'Graphics' },
  { key: 'FFlagDisableDepthOfField', label: 'Disable depth of field', description: 'Keeps the scene sharp instead of applying camera blur.', group: 'Graphics' },
  { key: 'FFlagDisableGlobalShadows', label: 'Disable global shadows', description: 'Disables global shadow rendering to reduce GPU load.', group: 'Graphics' },
  { key: 'DFFlagTextureQualityOverrideEnabled', label: 'Override texture quality', description: 'Enables the texture quality value set in Fast Flags.', group: 'Graphics' },
  { key: 'FFlagDebugDisplayFPS', label: 'Show FPS counter', description: 'Displays the client’s frame rate while playing.', group: 'Diagnostics' },
  { key: 'DFFlagDebugPauseVoxelizer', label: 'Pause voxelizer', description: 'Pauses voxel lighting updates. This may affect how scenes look.', group: 'Advanced' },
  { key: 'FFlagDebugSkyGray', label: 'Use gray skybox', description: 'Replaces the skybox color with gray.', group: 'Visuals' },
];

let state = { config: null, fflags: {}, search: '' };

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function setStatus(text, type) {
  const b = $('#status-badge');
  b.textContent = text;
  b.className = 'status-pill ' + (type || '');
}

async function load() {
  setStatus('Loading...');
  const res = await window.api.loadConfig();
  if (!res.success) { setStatus('Error: ' + res.error, 'error'); return; }
  state.config = res.config;
  state.fflags = { ...(res.config.fflags || {}) };
  setStatus('Loaded', 'saved');
  renderAll();
  await Promise.all([loadShiftlock(), renderBackups()]);
}

async function save() {
  if (!state.config) return;
  state.config.fflags = { ...state.fflags };
  setStatus('Saving...');
  const res = await window.api.saveConfig(state.config);
  if (!res.success) { setStatus('Error: ' + res.error, 'error'); return; }
  setStatus('Saved!', 'saved');
  setTimeout(() => setStatus('Ready'), 1500);
}

function toggleFlag(key) {
  const current = state.fflags[key];
  if (typeof current === 'boolean') state.fflags[key] = !current;
  else if (current === 'True') state.fflags[key] = 'False';
  else if (current === 'False') state.fflags[key] = 'True';
  else if (typeof current === 'number') state.fflags[key] = current > 0 ? 0 : 1;
  else state.fflags[key] = true;
  setStatus('Unsaved changes');
  renderAll();
}

function renderQuickToggles() {
  const el = $('#quick-toggles');
  el.innerHTML = '';
  const groups = new Map();
  for (const flag of QUICK_FLAGS) {
    if (!groups.has(flag.group)) groups.set(flag.group, []);
    groups.get(flag.group).push(flag);
  }

  for (const [groupName, flags] of groups) {
    const group = document.createElement('section');
    group.className = 'setting-group';
    const heading = document.createElement('h3');
    heading.className = 'setting-group-title';
    heading.textContent = groupName;
    group.appendChild(heading);

    const list = document.createElement('div');
    list.className = 'setting-list';
    for (const flag of flags) {
      const value = state.fflags[flag.key];
      const isOn = value === true || value === 'True' || value === 1;
      const row = document.createElement('article');
      row.className = 'setting-row';

      const copy = document.createElement('div');
      copy.className = 'setting-copy';
      const title = document.createElement('h3');
      title.textContent = flag.label;
      const description = document.createElement('p');
      description.textContent = flag.description;
      copy.append(title, description);

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'setting-switch' + (isOn ? ' on' : '');
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-checked', String(isOn));
      toggle.setAttribute('aria-label', flag.label);
      toggle.title = flag.key;
      toggle.addEventListener('click', () => toggleFlag(flag.key));

      row.append(copy, toggle);
      list.appendChild(row);
    }
    group.appendChild(list);
    el.appendChild(group);
  }
}

function renderMeta() {
  const el = $('#meta-info');
  const count = Object.keys(state.fflags).length;
  const keys = Object.keys(state.fflags);
  const strings = keys.filter(k => typeof state.fflags[k] === 'string').length;
  const bools = keys.filter(k => typeof state.fflags[k] === 'boolean').length;
  const nums = keys.filter(k => typeof state.fflags[k] === 'number').length;
  el.innerHTML = `
    <div class="meta-stat"><span>Total FastFlags</span><strong>${count}</strong></div>
    <div class="meta-stat"><span>Boolean values</span><strong>${bools}</strong></div>
    <div class="meta-stat"><span>Number values</span><strong>${nums}</strong></div>
    <div class="meta-stat"><span>String values</span><strong>${strings}</strong></div>
  `;
  $('#flag-nav-count').textContent = count;
}

function renderFlags() {
  const el = $('#flag-list');
  const search = state.search.toLowerCase();
  const entries = Object.entries(state.fflags).filter(([k]) =>
    k.toLowerCase().includes(search)
  );
  $('#count-display').textContent = `${entries.length} / ${Object.keys(state.fflags).length} flags`;

  if (entries.length === 0) {
    el.innerHTML = `<div class="empty-state">${search ? 'No FastFlags match your search.' : 'No custom FastFlags in this config.'}</div>`;
    return;
  }

  el.innerHTML = '';
  for (const [key, val] of entries) {
    const on = val === true || val === 'True' || (typeof val === 'number' && val > 0);
    const row = document.createElement('div');
    row.className = 'flag-row' + (on ? ' on' : '');

    const switchEl = document.createElement('button');
    switchEl.type = 'button';
    switchEl.className = 'setting-switch small' + (on ? ' on' : '');
    switchEl.setAttribute('role', 'switch');
    switchEl.setAttribute('aria-checked', String(on));
    switchEl.setAttribute('aria-label', `Toggle ${key}`);
    switchEl.addEventListener('click', () => toggleFlag(key));

    const nameSpan = document.createElement('span');
    nameSpan.className = 'flag-name';
    nameSpan.textContent = key;

    const valSpan = document.createElement('span');
    valSpan.className = 'flag-val';
    valSpan.textContent = JSON.stringify(val);

    const delSpan = document.createElement('button');
    delSpan.type = 'button';
    delSpan.className = 'flag-del';
    delSpan.textContent = '×';
    delSpan.title = `Remove ${key}`;
    delSpan.setAttribute('aria-label', `Remove ${key}`);
    delSpan.addEventListener('click', () => {
      delete state.fflags[key];
      setStatus('Unsaved changes');
      renderAll();
    });

    row.appendChild(switchEl);
    row.appendChild(nameSpan);
    row.appendChild(valSpan);
    row.appendChild(delSpan);
    el.appendChild(row);
  }
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) {
    if (name === 'default') {
      if (!confirm('Clear all FFlags?')) return;
      state.fflags = {};
      setStatus('Unsaved changes');
      renderAll();
      return;
    }
    return;
  }
  const count = Object.keys(preset).length;
  if (!confirm(`Apply "${name}" preset (${count} flags)? This will replace all current flags.`)) return;
  state.fflags = { ...preset };
  setStatus('Unsaved changes');
  renderAll();
}

function renderAll() {
  renderQuickToggles();
  renderFlags();
  renderMeta();
}

async function loadShiftlock() {
  const res = await window.api.shiftlockStatus();
  const preview = $('#shiftlock-preview');
  const status = $('#shiftlock-status');
  const restoreBtn = $('#btn-shiftlock-restore');
  if (!res.success) { status.textContent = 'Error: ' + (res.error || ''); return; }
  preview.replaceChildren();
  if (res.exists) {
    const image = document.createElement('img');
    image.src = res.dataUrl;
    image.alt = 'Custom shift-lock cursor';
    preview.appendChild(image);
    status.textContent = `Installed · ${res.size.toLocaleString()} bytes`;
    preview.title = res.path;
  } else {
    const empty = document.createElement('span');
    empty.textContent = 'No custom cursor installed';
    preview.appendChild(empty);
    preview.removeAttribute('title');
    status.textContent = 'Using Roblox default';
  }
  restoreBtn.hidden = !res.hasBackup;
}

async function renderBackups() {
  const list = $('#backup-list');
  const res = await window.api.listBackups();
  list.replaceChildren();
  if (!res.success || !res.backups.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = res.success ? 'No backups yet. Create one before changing your settings.' : res.error;
    list.appendChild(empty);
    return;
  }

  for (const filename of res.backups) {
    const row = document.createElement('div');
    row.className = 'backup-row';
    const icon = document.createElement('span');
    icon.className = 'backup-icon';
    icon.textContent = '↶';
    icon.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'backup-name';
    name.textContent = filename;
    const restore = document.createElement('button');
    restore.className = 'btn';
    restore.type = 'button';
    restore.textContent = 'Restore';
    restore.addEventListener('click', async () => {
      if (!confirm(`Restore ${filename}? This replaces the current Sober config.`)) return;
      setStatus('Restoring...');
      const restored = await window.api.restoreBackup(filename);
      if (!restored.success) { setStatus('Error: ' + restored.error, 'error'); return; }
      state.config = restored.config;
      state.fflags = { ...(restored.config.fflags || {}) };
      renderAll();
      setStatus('Restored!', 'saved');
    });
    row.append(icon, name, restore);
    list.appendChild(row);
  }
}

// Settings navigation
function showPage(name) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.toggle('active', page.dataset.page === name);
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    const active = item.dataset.page === name;
    item.classList.toggle('active', active);
    item.setAttribute('aria-current', active ? 'page' : 'false');
  });
  $('#main-content').scrollTop = 0;
  if (name === 'backups') renderBackups();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => showPage(item.dataset.page));
});

$('#nav-search').addEventListener('input', (e) => {
  const query = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.nav-item').forEach(item => {
    item.hidden = !item.textContent.toLowerCase().includes(query);
  });
});

$('#search').addEventListener('input', (e) => {
  state.search = e.target.value;
  renderFlags();
});

$('#btn-save').addEventListener('click', save);

$('#btn-backup').addEventListener('click', async () => {
  setStatus('Backing up...');
  const res = await window.api.backupConfig();
  if (!res.success) { setStatus('Error: ' + res.error, 'error'); return; }
  setStatus('Backup created', 'saved');
  await renderBackups();
});

$('#btn-restore').addEventListener('click', async () => {
  const res = await window.api.listBackups();
  if (!res.success || !res.backups.length) {
    setStatus(res.success ? 'No backups found' : 'Error: ' + res.error, 'error');
    return;
  }
  const choice = prompt(
    `Available backups:\n${res.backups.map((f, i) => `${i}: ${f}`).join('\n')}\n\nEnter number to restore:`
  );
  if (choice === null) return;
  const idx = parseInt(choice, 10);
  if (isNaN(idx) || idx < 0 || idx >= res.backups.length) return;
  setStatus('Restoring...');
  const restored = await window.api.restoreBackup(res.backups[idx]);
  if (!restored.success) { setStatus('Error: ' + restored.error, 'error'); return; }
  state.config = restored.config;
  state.fflags = { ...(restored.config.fflags || {}) };
  renderAll();
  setStatus('Restored!', 'saved');
  await renderBackups();
});

document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
});

// Shift lock handlers
$('#btn-shiftlock-set').addEventListener('click', async () => {
  setStatus('Installing cursor...');
  const res = await window.api.shiftlockInstall();
  if (res.canceled) { setStatus('Ready'); return; }
  if (!res.success) { setStatus('Error: ' + res.error, 'error'); return; }
  setStatus('Cursor installed', 'saved');
  await loadShiftlock();
  setTimeout(() => setStatus('Ready'), 1500);
});
$('#btn-shiftlock-remove').addEventListener('click', async () => {
  if (!confirm('Remove custom shift lock cursor? Reverts to default.')) return;
  setStatus('Removing...');
  const res = await window.api.shiftlockRemove();
  if (!res.success) { setStatus('Error: ' + res.error, 'error'); return; }
  setStatus('Removed', 'saved');
  await loadShiftlock();
  setTimeout(() => setStatus('Ready'), 1500);
});
$('#btn-shiftlock-restore').addEventListener('click', async () => {
  setStatus('Restoring backup...');
  const res = await window.api.shiftlockRestoreBackup();
  if (!res.success) { setStatus('Error: ' + res.error, 'error'); return; }
  setStatus('Restored', 'saved');
  await loadShiftlock();
  setTimeout(() => setStatus('Ready'), 1500);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    save();
  } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    $('#nav-search').focus();
  }
});

// Init
showPage('quick');
load();

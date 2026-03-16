import { Router } from 'express'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { bumpVersion } from '../index.js'

const router = Router()

// ── Preferences (theme + layout, persisted to disk) ──

type ThemeMode = 'auto' | 'light' | 'dark'

interface Prefs {
  theme: ThemeMode
  layout: string
  calendarLabels: Record<string, string> // url → label
}

const PREFS_FILE = resolve(process.cwd(), 'admin-prefs.json')
const prefs: Prefs = { theme: 'auto', layout: 'zen', calendarLabels: {} }

async function loadPrefs() {
  try {
    const raw = await readFile(PREFS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (['auto', 'light', 'dark'].includes(parsed.theme)) prefs.theme = parsed.theme
    if (typeof parsed.layout === 'string') prefs.layout = parsed.layout
    if (parsed.calendarLabels && typeof parsed.calendarLabels === 'object')
      prefs.calendarLabels = parsed.calendarLabels
  } catch {
    // File doesn't exist yet — use defaults
  }
}

async function savePrefs() {
  await writeFile(PREFS_FILE, JSON.stringify(prefs, null, 2), 'utf-8')
}

loadPrefs()

// ── .env management ──

const ENV_PATH = resolve(process.cwd(), '.env')

const SETTING_GROUPS = [
  {
    label: 'Weather',
    fields: [
      { key: 'OPENWEATHER_API_KEY', label: 'API Key', type: 'password' as const },
      { key: 'WEATHER_LAT', label: 'Latitude', type: 'text' as const },
      { key: 'WEATHER_LON', label: 'Longitude', type: 'text' as const },
    ],
  },
  {
    label: 'Sobriety Counter',
    fields: [{ key: 'SOBRIETY_DATE', label: 'Sobriety Date', type: 'text' as const }],
  },
  {
    label: 'Plex',
    fields: [
      { key: 'PLEX_URL', label: 'Server URL', type: 'text' as const },
      { key: 'PLEX_TOKEN', label: 'Token', type: 'password' as const },
    ],
  },
  {
    label: 'Calendar',
    fields: [
      {
        key: 'ICAL_URLS',
        label: 'Calendar URLs',
        type: 'labeledlist' as const,
        labelPlaceholder: 'Name (e.g. Work)',
        valuePlaceholder: 'Calendar URL',
      },
    ],
  },
  {
    label: 'iCloud Photos',
    fields: [{ key: 'ICLOUD_ALBUM_URL', label: 'Shared Album URL', type: 'text' as const }],
  },
  {
    label: 'Pi-hole',
    fields: [
      { key: 'PIHOLE_URL', label: 'URL', type: 'text' as const },
      { key: 'PIHOLE_PASSWORD', label: 'Password', type: 'password' as const },
      {
        key: 'PIHOLE_CLIENT_ALIASES',
        label: 'Client Aliases',
        type: 'keyvalue' as const,
        keyLabel: 'IP Address',
        valueLabel: 'Name',
      },
    ],
  },
  {
    label: 'Sonarr / Radarr',
    fields: [
      { key: 'SONARR_URL', label: 'Sonarr URL', type: 'text' as const },
      { key: 'SONARR_API_KEY', label: 'Sonarr API Key', type: 'password' as const },
      { key: 'RADARR_URL', label: 'Radarr URL', type: 'text' as const },
      { key: 'RADARR_API_KEY', label: 'Radarr API Key', type: 'password' as const },
    ],
  },
  {
    label: 'Server Ports',
    fields: [
      { key: 'PORT', label: 'Frontend Port', type: 'text' as const },
      { key: 'BACKEND_PORT', label: 'Backend Port', type: 'text' as const },
    ],
  },
]

async function readEnvFile(): Promise<Map<string, string>> {
  const vars = new Map<string, string>()
  try {
    const content = await readFile(ENV_PATH, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx)
      let val = trimmed.slice(eqIdx + 1)
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      vars.set(key, val)
    }
  } catch {
    // Can't read .env
  }
  return vars
}

async function writeEnvFile(updates: Record<string, string>) {
  let content: string
  try {
    content = await readFile(ENV_PATH, 'utf-8')
  } catch {
    content = ''
  }

  const lines = content.split('\n')

  const newLines = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return line
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) return line
    const key = trimmed.slice(0, eqIdx)
    if (key in updates) {
      const val = updates[key]
      const needsQuotes = val.includes(' ') || val.includes(',') || val.includes('#')
      return `${key}=${needsQuotes ? `"${val}"` : val}`
    }
    return line
  })

  if ('SOBRIETY_DATE' in updates) {
    const viteLine = `VITE_SOBRIETY_DATE=${updates.SOBRIETY_DATE}`
    const viteIdx = newLines.findIndex((l) => l.trim().startsWith('VITE_SOBRIETY_DATE='))
    if (viteIdx >= 0) newLines[viteIdx] = viteLine
  }

  await writeFile(ENV_PATH, newLines.join('\n'), 'utf-8')
}

// ── API endpoints ──

router.get('/theme', (_req, res) => {
  res.json({ theme: prefs.theme, layout: prefs.layout })
})

router.put('/theme', async (req, res) => {
  const body = req.body as { theme?: string; layout?: string }
  if (body.theme && ['auto', 'light', 'dark'].includes(body.theme)) {
    prefs.theme = body.theme as ThemeMode
  }
  if (body.layout && typeof body.layout === 'string') {
    prefs.layout = body.layout
  }
  await savePrefs()
  res.json({ theme: prefs.theme, layout: prefs.layout })
})

router.post('/refresh', (_req, res) => {
  bumpVersion()
  res.json({ ok: true, message: 'Dashboard will reload momentarily.' })
})

router.get('/env', async (_req, res) => {
  const vars = await readEnvFile()
  const groups = SETTING_GROUPS.map((group) => ({
    ...group,
    fields: group.fields.map((field) => ({
      ...field,
      value: vars.get(field.key) ?? '',
      ...(field.type === 'labeledlist' ? { labels: prefs.calendarLabels } : {}),
    })),
  }))
  res.json({ groups })
})

router.put('/env', async (req, res) => {
  const { settings, calendarLabels } = req.body as {
    settings: Record<string, string>
    calendarLabels?: Record<string, string>
  }
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Missing settings object.' })
  }
  await writeEnvFile(settings)
  if (calendarLabels && typeof calendarLabels === 'object') {
    prefs.calendarLabels = calendarLabels
    await savePrefs()
  }
  res.json({
    ok: true,
    message: 'Settings saved. Restart containers for changes to take effect.',
  })
})

// ── Admin HTML ──

router.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.send(ADMIN_HTML)
})

const ADMIN_HTML = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>GBoard Admin</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%236b8afd'/><text x='16' y='23' font-family='system-ui,sans-serif' font-size='20' font-weight='700' fill='white' text-anchor='middle'>G</text></svg>">
<style>
  :root {
    --bg: #111113; --surface: #1a1a1e; --surface-2: #222228;
    --border: #333340; --text: #e8e8ec; --text-2: #a0a0a8;
    --text-3: #606068; --accent: #6b8afd; --accent-hover: #8aa4ff;
    --green: #6bcb77; --red: #f87171; --radius: 12px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: var(--bg); color: var(--text);
    padding: 16px; padding-bottom: 100px;
    -webkit-font-smoothing: antialiased;
  }
  h1 { font-size: 22px; font-weight: 600; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: var(--text-3); margin-bottom: 24px; }

  #toast {
    position: fixed; bottom: 80px; left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--surface-2); border: 1px solid var(--border);
    color: var(--text); padding: 10px 20px; border-radius: 10px;
    font-size: 13px; opacity: 0; transition: opacity .3s, transform .3s;
    pointer-events: none; z-index: 100; white-space: nowrap;
  }
  #toast.visible { opacity: 1; transform: translateX(-50%) translateY(0); }
  #toast.success { border-color: var(--green); }
  #toast.error { border-color: var(--red); }

  .actions-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--surface); border-top: 1px solid var(--border);
    padding: 12px 16px; display: flex; gap: 10px; z-index: 50;
  }
  .actions-bar button { flex: 1; }

  .section {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 16px; margin-bottom: 16px;
  }
  .section-title {
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: .08em; color: var(--text-3); margin-bottom: 14px;
  }

  /* Picker buttons (theme + layout) */
  .picker-group { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .picker-group.theme-picker { grid-template-columns: repeat(3, 1fr); }
  .picker-btn {
    padding: 12px 8px; background: var(--surface-2);
    border: 2px solid var(--border); border-radius: 10px;
    color: var(--text-2); font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all .2s; text-align: center;
  }
  .picker-btn .icon { font-size: 20px; display: block; margin-bottom: 4px; }
  .picker-btn .desc { font-size: 10px; color: var(--text-3); margin-top: 2px; }
  .picker-btn:hover { border-color: var(--text-3); }
  .picker-btn.active {
    border-color: var(--accent); color: var(--accent);
    background: rgba(107,138,253,.08);
  }

  /* Collapsible advanced section */
  .advanced-toggle {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px 16px; margin-bottom: 16px;
    cursor: pointer; color: var(--text-2); font-size: 13px; font-weight: 500;
    font-family: inherit; transition: all .2s;
  }
  .advanced-toggle:hover { border-color: var(--text-3); }
  .advanced-toggle .chevron {
    transition: transform .2s; font-size: 12px; color: var(--text-3);
  }
  .advanced-toggle.open .chevron { transform: rotate(180deg); }
  .advanced-body {
    max-height: 0; overflow: hidden; transition: max-height .3s ease;
  }
  .advanced-body.open { max-height: 5000px; }

  /* Form fields */
  .field { margin-bottom: 14px; }
  .field:last-child { margin-bottom: 0; }
  .field label {
    display: block; font-size: 12px; font-weight: 500;
    color: var(--text-2); margin-bottom: 5px;
  }
  .field input, .field textarea {
    width: 100%; background: var(--surface-2);
    border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 12px; color: var(--text); font-size: 14px;
    font-family: inherit; outline: none; transition: border-color .2s;
  }
  .field input:focus, .field textarea:focus { border-color: var(--accent); }
  .field textarea { resize: vertical; min-height: 60px; font-size: 12px; }
  .password-wrapper { position: relative; }
  .password-wrapper input { padding-right: 40px; }
  .toggle-vis {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--text-3);
    cursor: pointer; font-size: 14px; padding: 4px;
  }

  /* List editor */
  .list-editor { display: flex; flex-direction: column; gap: 6px; }
  .list-row { display: flex; gap: 6px; align-items: center; }
  .list-row input { flex: 1; font-size: 12px; padding: 8px 10px; }
  .list-row .remove-btn, .kv-row .remove-btn {
    flex-shrink: 0; width: 32px; height: 32px;
    background: none; border: 1px solid var(--border); border-radius: 8px;
    color: var(--red); cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    transition: background .2s;
  }
  .list-row .remove-btn:hover, .kv-row .remove-btn:hover { background: rgba(248,113,113,.1); }
  .add-btn {
    background: none; border: 1px dashed var(--border); border-radius: 8px;
    color: var(--text-3); cursor: pointer; padding: 8px;
    font-size: 12px; font-family: inherit; transition: all .2s;
  }
  .add-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* Key-value editor */
  .kv-row { display: flex; gap: 6px; align-items: center; }
  .kv-row input { flex: 1; font-size: 12px; padding: 8px 10px; }
  .kv-header { display: flex; gap: 6px; margin-bottom: 4px; }
  .kv-header span {
    flex: 1; font-size: 10px; font-weight: 600;
    color: var(--text-3); text-transform: uppercase; letter-spacing: .06em;
  }
  .kv-header span:last-child { width: 32px; flex: 0 0 32px; }

  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 6px; padding: 10px 18px; border-radius: 10px;
    font-size: 14px; font-weight: 500; font-family: inherit;
    cursor: pointer; border: 1px solid var(--border); transition: all .2s;
  }
  .btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
  .btn-primary:hover { background: var(--accent-hover); }
  .btn-secondary { background: var(--surface-2); color: var(--text); }
  .btn-secondary:hover { background: var(--border); }

  .status-dot {
    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    background: var(--green); margin-right: 6px; animation: pulse-dot 2s infinite;
  }
  @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: .3; } }

  @media (min-width: 600px) {
    body { max-width: 560px; margin: 0 auto; padding: 32px 16px 100px; }
    h1 { font-size: 26px; }
  }
</style>
</head>
<body>

<h1>GBoard Admin</h1>
<p class="subtitle"><span class="status-dot"></span>Dashboard is running</p>

<!-- Layout -->
<div class="section">
  <div class="section-title">Layout</div>
  <div class="picker-group" id="layout-group"></div>
</div>

<!-- Theme -->
<div class="section" id="theme-section">
  <div class="section-title">Color Mode</div>
  <div class="picker-group theme-picker">
    <button class="picker-btn" data-theme="light" onclick="setTheme('light')">
      <span class="icon">&#9788;</span>Light
    </button>
    <button class="picker-btn" data-theme="auto" onclick="setTheme('auto')">
      <span class="icon">&#9681;</span>Auto
    </button>
    <button class="picker-btn" data-theme="dark" onclick="setTheme('dark')">
      <span class="icon">&#9790;</span>Dark
    </button>
  </div>
</div>

<!-- Advanced Settings (collapsible) -->
<button class="advanced-toggle" id="advanced-toggle" onclick="toggleAdvanced()">
  Advanced Settings
  <span class="chevron">&#x25BC;</span>
</button>
<div class="advanced-body" id="advanced-body">
  <div id="settings"></div>
  <div class="section" id="save-section" style="display:none">
    <button class="btn btn-primary" style="width:100%" onclick="saveSettings()">
      Save Settings
    </button>
    <p style="font-size:11px;color:var(--text-3);margin-top:8px;text-align:center">
      Port &amp; URL changes require a container restart to take effect.
    </p>
  </div>
</div>

<div class="actions-bar">
  <button class="btn btn-secondary" onclick="refreshDashboard()">&#x21bb; Refresh Screen</button>
  <button class="btn btn-secondary" onclick="clearCaches()">&#x1f5d1; Clear Caches</button>
</div>

<div id="toast"></div>

<script>
const API = '/api/admin';
const LAYOUTS = [
  { name: 'zen', label: 'Zen', icon: '&#9752;', desc: 'Vertical, day/night theming' },
  { name: 'classic', label: 'Classic', icon: '&#9733;', desc: 'Three-column, glassmorphism' },
  { name: 'terminal', label: 'Terminal', icon: '&#62;&lowbar;', desc: 'Green-on-black retro CRT' },
  { name: 'newspaper', label: 'Newspaper', icon: '&#9998;', desc: 'Editorial broadsheet, serif type' },
];

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'visible ' + type;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = ''; }, 2500);
}

// ── Advanced toggle ──
function toggleAdvanced() {
  const toggle = document.getElementById('advanced-toggle');
  const body = document.getElementById('advanced-body');
  toggle.classList.toggle('open');
  body.classList.toggle('open');
}

// ── Layout ──
let currentLayout = 'zen';

function renderLayoutPicker() {
  const group = document.getElementById('layout-group');
  group.innerHTML = LAYOUTS.map(l =>
    '<button class="picker-btn' + (l.name === currentLayout ? ' active' : '') +
    '" data-layout="' + l.name + '" onclick="setLayout(\\'' + l.name + '\\')">' +
    '<span class="icon">' + l.icon + '</span>' + esc(l.label) +
    '<div class="desc">' + esc(l.desc) + '</div></button>'
  ).join('');
}

async function setLayout(name) {
  currentLayout = name;
  renderLayoutPicker();
  // Show/hide theme section based on layout
  document.getElementById('theme-section').style.display =
    (name === 'zen' || name === 'newspaper') ? '' : 'none';
  try {
    await fetch(API + '/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout: name }),
    });
    toast('Layout updated');
    setTimeout(() => refreshDashboard(), 500);
  } catch { toast('Failed to set layout', 'error'); }
}

// ── Theme ──
async function loadPrefs() {
  try {
    const res = await fetch(API + '/theme');
    const data = await res.json();
    highlightTheme(data.theme);
    currentLayout = data.layout || 'zen';
    renderLayoutPicker();
    document.getElementById('theme-section').style.display =
      (currentLayout === 'zen' || currentLayout === 'newspaper') ? '' : 'none';
  } catch {}
}

function highlightTheme(theme) {
  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

async function setTheme(theme) {
  highlightTheme(theme);
  try {
    await fetch(API + '/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme }),
    });
    toast('Theme updated');
    setTimeout(() => refreshDashboard(), 500);
  } catch { toast('Failed to set theme', 'error'); }
}

// ── Settings ──
async function loadSettings() {
  try {
    const res = await fetch(API + '/env');
    const { groups } = await res.json();
    renderSettings(groups);
  } catch { toast('Failed to load settings', 'error'); }
}

function renderSettings(groups) {
  const container = document.getElementById('settings');
  container.innerHTML = '';
  for (const group of groups) {
    const section = document.createElement('div');
    section.className = 'section';
    let html = '<div class="section-title">' + esc(group.label) + '</div>';
    for (const field of group.fields) {
      html += '<div class="field">';
      html += '<label>' + esc(field.label) + '</label>';
      if (field.type === 'labeledlist') {
        html += renderLabeledListEditor(field.key, field.value, field.labels || {}, field.labelPlaceholder || 'Label', field.valuePlaceholder || 'Value');
      } else if (field.type === 'list') {
        html += renderListEditor(field.key, field.value);
      } else if (field.type === 'keyvalue') {
        html += renderKVEditor(field.key, field.value, field.keyLabel || 'Key', field.valueLabel || 'Value');
      } else if (field.type === 'password') {
        html += '<div class="password-wrapper">'
          + '<input type="password" data-key="' + esc(field.key)
          + '" value="' + escAttr(field.value) + '">'
          + '<button type="button" class="toggle-vis" onclick="toggleVis(this)">&#x1f441;</button>'
          + '</div>';
      } else {
        html += '<input type="text" data-key="' + esc(field.key)
          + '" value="' + escAttr(field.value) + '">';
      }
      html += '</div>';
    }
    section.innerHTML = html;
    container.appendChild(section);
  }
  document.getElementById('save-section').style.display = '';
}

// ── List editor (comma-separated → individual rows) ──
function renderListEditor(key, csvValue) {
  const items = csvValue ? csvValue.split(',').map(s => s.trim()).filter(Boolean) : [''];
  let html = '<div class="list-editor" data-list-key="' + esc(key) + '">';
  items.forEach((item, i) => {
    html += '<div class="list-row">'
      + '<input type="text" class="list-item" value="' + escAttr(item) + '" placeholder="Enter URL...">'
      + '<button type="button" class="remove-btn" onclick="removeListRow(this)" title="Remove">&times;</button>'
      + '</div>';
  });
  html += '<button type="button" class="add-btn" onclick="addListRow(this.parentElement, \\'\\')">'
    + '+ Add URL</button>';
  html += '</div>';
  return html;
}

function addListRow(container, value) {
  const addBtn = container.querySelector('.add-btn');
  const row = document.createElement('div');
  row.className = 'list-row';
  row.innerHTML = '<input type="text" class="list-item" value="' + escAttr(value || '') + '" placeholder="Enter URL...">'
    + '<button type="button" class="remove-btn" onclick="removeListRow(this)" title="Remove">&times;</button>';
  container.insertBefore(row, addBtn);
  row.querySelector('input').focus();
}

function removeListRow(btn) {
  const row = btn.parentElement;
  const editor = row.closest('.list-editor');
  const rows = editor.querySelectorAll('.list-row, .kv-row');
  if (rows.length <= 1) {
    row.querySelectorAll('input').forEach(i => { i.value = ''; });
    return;
  }
  row.remove();
}

// ── Labeled list editor (label + value rows, labels stored separately) ──
function renderLabeledListEditor(key, csvValue, labels, labelPlaceholder, valuePlaceholder) {
  const items = csvValue ? csvValue.split(',').map(s => s.trim()).filter(Boolean) : [''];
  let html = '<div class="list-editor" data-labeled-key="' + esc(key) + '">';
  html += '<div class="kv-header"><span>' + esc(labelPlaceholder) + '</span><span>'
    + esc(valuePlaceholder) + '</span><span></span></div>';
  items.forEach(item => {
    const lbl = labels[item] || '';
    html += '<div class="kv-row">'
      + '<input type="text" class="labeled-label" value="' + escAttr(lbl) + '" placeholder="' + escAttr(labelPlaceholder) + '" style="flex:0.6">'
      + '<input type="text" class="labeled-value" value="' + escAttr(item) + '" placeholder="' + escAttr(valuePlaceholder) + '">'
      + '<button type="button" class="remove-btn" onclick="removeListRow(this)" title="Remove">&times;</button>'
      + '</div>';
  });
  html += '<button type="button" class="add-btn" onclick="addLabeledRow(this.parentElement, \\'' + escAttr(labelPlaceholder) + '\\', \\'' + escAttr(valuePlaceholder) + '\\')">'
    + '+ Add Calendar</button>';
  html += '</div>';
  return html;
}

function addLabeledRow(container, labelPH, valuePH) {
  const addBtn = container.querySelector('.add-btn');
  const row = document.createElement('div');
  row.className = 'kv-row';
  row.innerHTML = '<input type="text" class="labeled-label" value="" placeholder="' + escAttr(labelPH || 'Label') + '" style="flex:0.6">'
    + '<input type="text" class="labeled-value" value="" placeholder="' + escAttr(valuePH || 'URL') + '">'
    + '<button type="button" class="remove-btn" onclick="removeListRow(this)" title="Remove">&times;</button>';
  container.insertBefore(row, addBtn);
  row.querySelector('input').focus();
}

// ── Key-value editor (ip=name pairs → table rows) ──
function renderKVEditor(key, rawValue, keyLabel, valueLabel) {
  const pairs = rawValue
    ? rawValue.split(',').map(s => s.trim()).filter(Boolean).map(p => {
        const eq = p.indexOf('=');
        return eq >= 0 ? [p.slice(0, eq), p.slice(eq + 1)] : [p, ''];
      })
    : [['', '']];

  let html = '<div class="list-editor" data-kv-key="' + esc(key) + '">';
  html += '<div class="kv-header"><span>' + esc(keyLabel) + '</span><span>'
    + esc(valueLabel) + '</span><span></span></div>';
  pairs.forEach(([k, v]) => {
    html += '<div class="kv-row">'
      + '<input type="text" class="kv-k" value="' + escAttr(k) + '" placeholder="' + escAttr(keyLabel) + '">'
      + '<input type="text" class="kv-v" value="' + escAttr(v) + '" placeholder="' + escAttr(valueLabel) + '">'
      + '<button type="button" class="remove-btn" onclick="removeListRow(this)" title="Remove">&times;</button>'
      + '</div>';
  });
  html += '<button type="button" class="add-btn" onclick="addKVRow(this.parentElement)">'
    + '+ Add Entry</button>';
  html += '</div>';
  return html;
}

function addKVRow(container) {
  const addBtn = container.querySelector('.add-btn');
  const row = document.createElement('div');
  row.className = 'kv-row';
  row.innerHTML = '<input type="text" class="kv-k" value="" placeholder="IP Address">'
    + '<input type="text" class="kv-v" value="" placeholder="Name">'
    + '<button type="button" class="remove-btn" onclick="removeListRow(this)" title="Remove">&times;</button>';
  container.insertBefore(row, addBtn);
  row.querySelector('input').focus();
}

function toggleVis(btn) {
  const input = btn.previousElementSibling;
  input.type = input.type === 'password' ? 'text' : 'password';
}

async function saveSettings() {
  const settings = {};

  // Standard inputs
  document.querySelectorAll('[data-key]').forEach(el => {
    settings[el.dataset.key] = el.value;
  });

  // List editors → comma-separated
  document.querySelectorAll('[data-list-key]').forEach(editor => {
    const key = editor.dataset.listKey;
    const items = Array.from(editor.querySelectorAll('.list-item'))
      .map(i => i.value.trim()).filter(Boolean);
    settings[key] = items.join(',');
  });

  // Labeled list editors → comma-separated values, labels stored separately
  const calendarLabels = {};
  document.querySelectorAll('[data-labeled-key]').forEach(editor => {
    const key = editor.dataset.labeledKey;
    const rows = editor.querySelectorAll('.kv-row');
    const urls = [];
    rows.forEach(row => {
      const label = row.querySelector('.labeled-label').value.trim();
      const url = row.querySelector('.labeled-value').value.trim();
      if (url) {
        urls.push(url);
        if (label) calendarLabels[url] = label;
      }
    });
    settings[key] = urls.join(',');
  });

  // KV editors → key=value,key=value
  document.querySelectorAll('[data-kv-key]').forEach(editor => {
    const key = editor.dataset.kvKey;
    const rows = editor.querySelectorAll('.kv-row');
    const pairs = [];
    rows.forEach(row => {
      const k = row.querySelector('.kv-k').value.trim();
      const v = row.querySelector('.kv-v').value.trim();
      if (k) pairs.push(k + '=' + v);
    });
    settings[key] = pairs.join(',');
  });

  try {
    const res = await fetch(API + '/env', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, calendarLabels }),
    });
    const data = await res.json();
    toast(data.message || 'Saved');
  } catch { toast('Failed to save', 'error'); }
}

// ── Actions ──
async function refreshDashboard() {
  try {
    await fetch(API + '/refresh', { method: 'POST' });
    toast('Dashboard refreshing...');
  } catch { toast('Failed to refresh', 'error'); }
}

async function clearCaches() {
  try {
    await fetch(API + '/refresh', { method: 'POST' });
    toast('Caches cleared, dashboard refreshing...');
  } catch { toast('Failed to clear caches', 'error'); }
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function escAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

// ── Init ──
loadPrefs();
loadSettings();
</script>
</body>
</html>`

export default router

/*
 * Rams Home panel for Home Assistant.
 * A self contained web component: no build step, no external libraries.
 */

const RAMS_VERSION = "0.4.4";
// Heating: a target below COMFORT_MIN counts as frost protection, so the radiator shows as Off.
const COMFORT_MIN = 12;
// Target steps for the plus and minus buttons, whatever step the thermostat reports.
const TEMP_STEP = 0.5;
const LIVE_LIMIT = 5 * 60 * 1000; // live views started here pause after five minutes to spare the batteries
const SEND_DELAY = 1500;   // ms of quiet after the last tap before the target goes to the device
const CONFIRM_TIMEOUT = 30000;

const ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  lights: '<path d="M8 4h8l3.5 8h-15z"/><path d="M12 12v7"/><path d="M8 20h8"/>',
  heating: '<circle cx="12" cy="12" r="8.5"/><path d="M12 12l3.2-3.2"/><path d="M12 6v1.2"/><path d="M6 12h1.2"/><path d="M16.8 12H18"/>',
  security: '<path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.7-7 9-4.1-1.3-7-4.8-7-9V6z"/>',
  settings: '<path d="M5 7h9M18 7h1M5 17h3M12 17h7"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  power: '<path d="M12 4v8"/><path d="M7.05 7.05a7 7 0 1 0 9.9 0"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  chevron: '<path d="M9.5 6 15.5 12l-6 6"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M6 12h12M12 6v12"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  moon: '<path d="M20 14.2A8 8 0 1 1 9.8 4a6.5 6.5 0 0 0 10.2 10.2z"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.5 4.25 4.25 0 0 0 7 18z"/>',
  rain: '<path d="M7 14h10a3.5 3.5 0 0 0 .4-6.98A5.2 5.2 0 0 0 7.3 6.3 3.85 3.85 0 0 0 7 14z"/><path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3"/>',
  m_home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5"/><path d="M10 20v-4.5a2 2 0 0 1 4 0V20"/>',
  m_away: '<path d="M13 4H6.5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1H13"/><path d="M16 8.5 19.5 12 16 15.5"/><path d="M10 12h9.5"/>',
  m_sleep: '<path d="M20 14.2A8 8 0 1 1 9.8 4a6.5 6.5 0 0 0 10.2 10.2z"/><path d="M17 3.5v3M15.5 5h3"/>',
  m_holiday: '<path d="M3.5 11a8.5 8.5 0 0 1 17 0c-1.4-1-2.85-1-4.25 0-1.4-1-2.85-1-4.25 0-1.4-1-2.85-1-4.25 0-1.4-1-2.85-1-4.25 0z"/><path d="M12 11v9"/><path d="M7.5 20h9"/>',
  camera: '<rect x="3.5" y="7" width="12.5" height="10" rx="2"/><path d="M16 11l4.5-2.5v7L16 13"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3"/>',
  expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5"/>',
  sound: '<path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
  micoff: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5M4 4l16 16"/>',
  bolt: '<path d="M13 3 6 13.5h5L10 21l7-10.5h-5z" fill="currentColor" stroke="none"/>',
};

// Battery outline with four segments; stage is 0 to 4.
const battIcon = (stage, charging) => `<svg class="glyph" width="26" height="13" viewBox="0 0 26 13" aria-hidden="true">
  <rect x="0.75" y="0.75" width="21.5" height="11.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <rect x="23.25" y="4" width="2" height="5" rx="1" fill="currentColor"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="${2.75 + i * 4.75}" y="2.75" width="3.75" height="7.5" rx="1" fill="currentColor" opacity="${i < stage ? 1 : 0.2}"/>`).join("")}
  ${charging ? '<path d="M12.6 1.5 8.8 7h2.9l-1 4.5 3.9-5.6h-2.9z" fill="currentColor" stroke="var(--boltgap,#000)" stroke-width="1"/>' : ""}
</svg>`;

// Four rising bars; level is 0 to 4.
const signalIcon = (level) => `<svg class="glyph" width="17" height="13" viewBox="0 0 17 13" aria-hidden="true">
  ${[0, 1, 2, 3].map((i) => `<rect x="${i * 4.5}" y="${10 - i * 3}" width="3" height="${3 + i * 3}" rx="1" fill="currentColor" opacity="${i < level ? 1 : 0.25}"/>`).join("")}
</svg>`;

const MODES = [
  { id: "home", label: "Home", icon: "m_home" },
  { id: "away", label: "Away", icon: "m_away" },
  { id: "sleep", label: "Sleep", icon: "m_sleep" },
  { id: "holiday", label: "Holiday", icon: "m_holiday" },
];

const NAV = [
  { id: "home", label: "Home" },
  { id: "lights", label: "Lights" },
  { id: "heating", label: "Heating" },
  { id: "security", label: "Security" },
  { id: "settings", label: "Settings" },
];

const ACCENTS = ["#FF5100", "#D9A400", "#3E5C76", "#1C1C1A"];

const WX = {
  "clear-night": "sun", sunny: "sun",
  partlycloudy: "cloud", cloudy: "cloud", fog: "cloud", windy: "cloud", "windy-variant": "cloud", exceptional: "cloud",
  rainy: "rain", pouring: "rain", "lightning-rainy": "rain", lightning: "rain", snowy: "rain", "snowy-rainy": "rain", hail: "rain",
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const icon = (name, size = 24, extra = "") =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${ICONS[name] || ""}</svg>`;

const pad = (n) => String(n).padStart(2, "0");

const store = {
  get(k, d) {
    try { const v = localStorage.getItem("rams_home_" + k); return v === null ? d : v; } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem("rams_home_" + k, v); } catch (e) { /* ignore */ }
  },
};

class RamsHomePanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._ui = {
      view: "home",
      sheet: null, // area id, or "notifications"
      confirm: false,
      theme: store.get("theme", "auto"),
      accent: store.get("accent", ACCENTS[0]),
    };
    this._deps = new Set();
    this._prevStates = {};
    this._forecast = null;
    this._notifications = {};
    this._dragging = false;
    this._pend = {};   // climate entity -> { on, temp, timer, sent, guard }
    this._cam = {};    // camera entity -> { pending: "start"|"stop", since, error, wantSound, wantTalk }
    this._live = new Map(); // camera entity -> persistent ha-camera-stream element
    this._sound = null;     // { id, unsub, gain, next }
    this._talk = null;      // { id, unsub, stream, node, proc, pos, buf }
  }

  /* ---------- Home Assistant hooks ---------- */

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) {
      this._subscribe();
      this._loadTablet();
      this._schedule();
      return;
    }
    const dark = !!(hass.themes && hass.themes.darkMode);
    if (dark !== this._lastDark) { this._lastDark = dark; this._schedule(); return; }
    for (const id of this._deps) {
      if (hass.states[id] !== this._prevStates[id]) { this._schedule(); return; }
    }
  }

  set panel(panel) {
    // The app can keep an old copy of this file after an update. When the installed
    // version differs from the running one, reload once to fetch the new code.
    const want = panel && panel.config && panel.config.version;
    if (want && String(want) !== RAMS_VERSION) {
      let tried = null;
      try { tried = sessionStorage.getItem("rams_home_reloaded"); } catch (e) { /* ignore */ }
      if (tried !== String(want)) {
        try { sessionStorage.setItem("rams_home_reloaded", String(want)); } catch (e) { /* ignore */ }
        location.reload();
        return;
      }
    }
    const prev = this._hass ? this._weatherId() : null;
    this._panel = panel;
    if (this._hass && this._subs && this._weatherId() !== prev) {
      this._unsubscribe();
      this._forecast = null;
      this._subscribe();
    }
    this._schedule();
  }
  set narrow(narrow) { this._narrow = narrow; this._schedule(); }

  get _cfg() { return (this._panel && this._panel.config) || {}; }

  connectedCallback() {
    if (!document.getElementById("rams-home-font")) {
      const l = document.createElement("link");
      l.id = "rams-home-font";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&display=swap";
      document.head.appendChild(l);
    }
    if (!this._listening) {
      this._listening = true;
      this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
      this.shadowRoot.addEventListener("change", (e) => this._onChange(e));
      this.shadowRoot.addEventListener("pointerdown", (e) => { if (e.target.matches("input[type=range]")) this._dragging = true; });
    }
    window.addEventListener("pointerup", (this._up = () => { if (this._dragging) { this._dragging = false; this._schedule(); } }));
    this._clock = setInterval(() => this._tick(), 1000);
    window.addEventListener("keydown", (this._key = (e) => {
      if (e.key === "Escape" && this._ui.camFull) { this._closeCam(); this._schedule(); }
    }));
    if (this._hass) { this._subscribe(); this._schedule(); }
  }

  disconnectedCallback() {
    clearInterval(this._clock);
    window.removeEventListener("keydown", this._key);
    this._stopSound();
    this._stopTalk();
    this._pauseOwnStreams();
    window.removeEventListener("pointerup", this._up);
    this._unsubscribe();
  }

  /* ---------- Subscriptions ---------- */

  async _subscribe() {
    if (!this._hass || this._subs) return;
    this._subs = [];
    const conn = this._hass.connection;
    try {
      this._subs.push(await conn.subscribeMessage((msg) => {
        if (msg.type === "current") this._notifications = { ...msg.notifications };
        else if (msg.type === "added" || msg.type === "updated") this._notifications = { ...this._notifications, ...msg.notifications };
        else if (msg.type === "removed") {
          const n = { ...this._notifications };
          Object.keys(msg.notifications || {}).forEach((k) => delete n[k]);
          this._notifications = n;
        }
        this._schedule();
      }, { type: "persistent_notification/subscribe" }));
    } catch (e) { /* notifications are optional */ }
    const weather = this._weatherId();
    if (weather) {
      try {
        this._subs.push(await conn.subscribeMessage((msg) => {
          this._forecast = msg.forecast || [];
          this._schedule();
        }, { type: "weather/subscribe_forecast", forecast_type: "daily", entity_id: weather }));
      } catch (e) { this._forecast = []; }
    }
  }

  _unsubscribe() {
    (this._subs || []).forEach((u) => { try { u(); } catch (e) { /* ignore */ } });
    this._subs = null;
  }

  /* ---------- Data helpers ---------- */

  _st(id) { this._deps.add(id); return this._hass.states[id]; }

  _areaOf(id) {
    const ent = this._hass.entities && this._hass.entities[id];
    if (!ent) return null;
    if (ent.area_id) return ent.area_id;
    const dev = ent.device_id && this._hass.devices && this._hass.devices[ent.device_id];
    return (dev && dev.area_id) || null;
  }

  _visible(id) {
    const ent = this._hass.entities && this._hass.entities[id];
    return !ent || (!ent.hidden && !ent.entity_category);
  }

  _ids(domain) {
    return Object.keys(this._hass.states).filter((id) => id.startsWith(domain + ".") && this._visible(id));
  }

  _name(id) {
    const st = this._hass.states[id];
    return (st && st.attributes.friendly_name) || id;
  }

  _rooms() {
    const areas = this._hass.areas || {};
    const ids = (this._cfg.rooms && this._cfg.rooms.length) ? this._cfg.rooms : Object.keys(areas);
    return ids.filter((id) => areas[id]).map((id) => ({ id, name: areas[id].name }));
  }

  // A Hue room or zone, or a group whose lamps are listed on their own, is left out so
  // nothing is counted twice. A group helper that hides its lamps (Hallway, Cloakroom,
  // Bathroom Mirror) stands in for them and is shown as one light.
  _isGroup(id) {
    const st = this._hass.states[id];
    if (!st) return false;
    const a = st.attributes;
    if (a.is_hue_group === true) return true;
    if (!Array.isArray(a.entity_id) || !a.entity_id.length) return false;
    const ents = this._hass.entities || {};
    return !a.entity_id.some((m) => ents[m] && ents[m].hidden);
  }

  _lightsIn(area) { return this._ids("light").filter((id) => this._areaOf(id) === area && !this._isGroup(id)); }
  _climateIn(area) { return this._ids("climate").find((id) => this._areaOf(id) === area); }

  _weatherId() {
    if (!this._hass) return null;
    return this._cfg.weather || Object.keys(this._hass.states).find((id) => id.startsWith("weather."));
  }

  _alarmId() {
    return this._cfg.alarm || Object.keys(this._hass.states).find((id) => id.startsWith("alarm_control_panel."));
  }

  _modeId() {
    const ents = this._hass.entities || {};
    const hit = Object.values(ents).find((e) => e.platform === "rams_home" && e.entity_id.startsWith("select."));
    return hit && hit.entity_id;
  }

  _persons() {
    const ids = (this._cfg.persons && this._cfg.persons.length) ? this._cfg.persons : this._ids("person");
    return ids.map((id) => this._st(id)).filter(Boolean);
  }

  _dimmable(st) { return (st.attributes.supported_color_modes || []).some((m) => m !== "onoff"); }
  _pct(st) { return Math.max(1, Math.round((st.attributes.brightness || 0) / 2.55)); }
  _temp(v) { return (v === undefined || v === null || isNaN(v)) ? "–" : Number(v).toFixed(1) + "°"; }

  _isDark() {
    if (this._ui.theme === "dark") return true;
    if (this._ui.theme === "light") return false;
    return !!(this._hass && this._hass.themes && this._hass.themes.darkMode);
  }

  /* ---------- Actions ---------- */

  _call(domain, service, data) { return this._hass.callService(domain, service, data); }

  _navigate(path) {
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
  }

  _moreInfo(entityId) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }

  _onClick(e) {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const { act, id, val } = el.dataset;
    const ui = this._ui;
    switch (act) {
      case "nav":
        if (ui.view === "security" && id !== "security") this._pauseOwnStreams();
        ui.view = id; ui.sheet = null; window.scrollTo(0, 0); break;
      case "menu": this.dispatchEvent(new Event("hass-toggle-menu", { bubbles: true, composed: true })); return;
      case "theme": ui.theme = this._isDark() ? "light" : "dark"; store.set("theme", ui.theme); break;
      case "themeset": ui.theme = val; store.set("theme", val); break;
      case "accent": ui.accent = val; store.set("accent", val); break;
      case "mode": this._call("select", "select_option", { entity_id: this._modeId(), option: val }); return;
      case "ask-off": ui.confirm = true; break;
      case "cancel-off": ui.confirm = false; break;
      case "all-off": ui.confirm = false; this._call("rams_home", "all_off", {}); break;
      case "room": ui.sheet = id; ui.sheetBack = null; break;
      case "notifications": ui.sheet = "notifications"; break;
      case "close": ui.sheet = null; ui.sheetBack = null; break;
      case "light-open": ui.sheetBack = ui.sheet && !String(ui.sheet).startsWith("light:") ? ui.sheet : null; ui.sheet = "light:" + id; break;
      case "sheet-back": ui.sheet = ui.sheetBack; ui.sheetBack = null; break;
      case "toggle": this._call("light", "toggle", { entity_id: id }); return;
      case "all-lights": {
        const ids = this._roomLights().filter((l) => this._hass.states[l] && !["unavailable", "unknown"].includes(this._hass.states[l].state));
        if (!ids.length) return;
        const anyOn = ids.some((l) => this._hass.states[l].state === "on");
        this._call("light", anyOn ? "turn_off" : "turn_on", { entity_id: ids });
        return;
      }
      case "room-toggle": {
        const ids = this._lightsIn(id).filter((l) => this._hass.states[l] && this._hass.states[l].state !== "unavailable");
        if (!ids.length) return;
        const anyOn = ids.some((l) => this._hass.states[l].state === "on");
        this._call("light", anyOn ? "turn_off" : "turn_on", { entity_id: ids });
        return;
      }
      case "temp": {
        const st = this._hass.states[id];
        const v = this._view(id, st);
        if (!st || !v.on) return;
        this._queueTarget(id, this._clampTemp(st, this._roundStep(v.temp) + TEMP_STEP * Number(val)));
        break;
      }
      case "heat-on": {
        const st = this._hass.states[id];
        if (!st || this._view(id, st).on) return;
        this._queueTarget(id, this._startTarget(st));
        break;
      }
      case "heat-off": {
        this._dropPend(id);
        const p = this._pend[id] = { on: false, sent: true };
        this._call("climate", "set_hvac_mode", { entity_id: id, hvac_mode: "off" })
          .catch(() => { if (this._pend[id] === p) { this._dropPend(id); this._schedule(); } });
        p.guard = setTimeout(() => { if (this._pend[id] === p) { delete this._pend[id]; this._schedule(); } }, CONFIRM_TIMEOUT);
        break;
      }
      case "alarm": this._call("alarm_control_panel", val, { entity_id: id }); return;
      case "tablet-on": this._setTablet(true); return;
      case "tablet-off": this._setTablet(false); return;
      case "cam-play": this._camStart(id); break;
      case "cam-pause": this._camStop(id); break;
      case "cam-full": ui.camFull = id; break;
      case "cam-close": this._closeCam(); break;
      case "cam-sound": this._toggleSound(id); break;
      case "cam-talk": this._toggleTalk(id); break;
      case "more": this._moreInfo(id); return;
      case "dismiss": this._call("persistent_notification", "dismiss", { notification_id: id }); return;
      case "goto": this._navigate(val); return;
      default: return;
    }
    this._schedule();
  }

  _onChange(e) {
    const el = e.target;
    if (el.dataset.act === "bri") {
      this._dragging = false;
      this._call("light", "turn_on", { entity_id: el.dataset.id, brightness_pct: Number(el.value) });
    }
  }

  /* ---------- Rendering ---------- */

  _schedule() {
    if (this._raf || !this._hass || this._dragging) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this._render(); });
  }

  _render() {
    if (!this._hass) return;
    this._deps = new Set();
    const sheetEl = this.shadowRoot.querySelector(".sheet-body");
    const sheetScroll = sheetEl ? sheetEl.scrollTop : 0;
    const modeId = this._modeId();
    if (modeId) this._st(modeId);
    const dark = this._isDark();
    const view = this._ui.view;

    let main = "";
    if (view === "home") main = this._home();
    else if (view === "lights") main = this._lightsView();
    else if (view === "heating") main = this._heatingView();
    else if (view === "security") main = this._securityView();
    else main = this._settingsView();

    if (!this._root) {
      // Live players sit in their own layer and are laid over their slot after each
      // render. Moving them in the DOM would make Home Assistant restart the stream.
      this.shadowRoot.innerHTML = `<div class="root"></div><div class="layer"></div>`;
      this._root = this.shadowRoot.querySelector(".root");
      this._layer = this.shadowRoot.querySelector(".layer");
      window.addEventListener("scroll", () => this._placeLive(), { capture: true, passive: true });
      if (window.ResizeObserver) new ResizeObserver(() => this._placeLive()).observe(this);
    }
    this._root.innerHTML = `
      <style>${STYLES}</style>
      <div class="wrap ${dark ? "dark" : ""}" style="--accent:${esc(this._ui.accent)}">
        <div class="shell">
          ${this._header()}
          ${view === "home" ? this._roomStrip() : ""}
          ${this._rail()}
          <main class="main" aria-live="polite">${main}</main>
        </div>
        ${this._sheet()}
        ${this._camModal()}
      </div>`;
    this._syncLive();

    const newSheet = this.shadowRoot.querySelector(".sheet-body");
    if (newSheet) newSheet.scrollTop = sheetScroll;
    this._prevStates = {};
    this._deps.forEach((id) => { this._prevStates[id] = this._hass.states[id]; });
    this._tick();
  }

  _header() {
    const now = new Date();
    const hr = now.getHours();
    const greeting = hr < 5 ? "Good night" : hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    const date = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const home = this._persons().filter((p) => p.state === "home");
    const count = Object.keys(this._notifications).length;
    const dark = this._isDark();
    const avatars = home.map((p) => {
      const n = p.attributes.friendly_name || p.entity_id;
      const initials = n.replace(/([a-z])([A-Z])/g, "$1 $2").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      const pic = p.attributes.entity_picture;
      return `<span class="avatar" title="${esc(n)} is home" aria-label="${esc(n)} is home">${pic ? `<img src="${esc(pic)}" alt="">` : esc(initials)}</span>`;
    }).join("");
    const presence = home.length === 0 ? "Nobody home" : home.length === 1 ? "1 person at home" : `${home.length} people at home`;
    return `
      <header class="header">
        <div class="hello">
          ${this._narrow && !this._tablet ? `<button class="iconbtn flat menu" data-act="menu" aria-label="Open Home Assistant menu">${icon("menu", 22)}</button>` : ""}
          <div>
            <div class="caption">${esc(date)}</div>
            <h1>${greeting}</h1>
          </div>
        </div>
        <div class="tools">
          <button class="themeswitch ${dark ? "on" : ""}" data-act="theme" aria-pressed="${dark}" aria-label="${dark ? "Switch to light mode" : "Switch to dark mode"}">
            <span class="slot">${icon("sun", 18)}</span><span class="slot">${icon("moon", 18)}</span>
            <span class="knob">${dark ? icon("moon", 18) : icon("sun", 18, 'style="color:var(--accent)"')}</span>
          </button>
          <span class="presence">${presence}</span>
          <span class="avatars">${avatars}</span>
          <span class="divider"></span>
        </div>
        <button class="iconbtn bell" data-act="notifications" aria-label="Notifications, ${count} unread">
          ${icon("bell", 22)}${count ? `<span class="dot"></span>` : ""}
        </button>
      </header>`;
  }

  _rail() {
    return `
      <nav class="rail" aria-label="Main">
        ${NAV.map((n) => `
          <button class="navbtn ${this._ui.view === n.id ? "active" : ""} ${n.id === "settings" ? "last" : ""}" data-act="nav" data-id="${n.id}" aria-label="${n.label}" aria-current="${this._ui.view === n.id ? "page" : "false"}">
            <span class="navicon">${icon(n.id, 24)}</span><span class="navlabel">${n.label}</span>
          </button>`).join("")}
      </nav>`;
  }

  _roomStatus(area) {
    const lights = this._lightsIn(area).map((id) => this._st(id)).filter(Boolean);
    const on = lights.filter((s) => s.state === "on").length;
    const cl = this._climateIn(area);
    const cs = cl && this._st(cl);
    const parts = [];
    if (lights.length) parts.push(on ? `${on} of ${lights.length} lights on` : "Lights off");
    if (cs && cs.attributes.current_temperature !== undefined) parts.push(this._temp(cs.attributes.current_temperature));
    return { text: parts.join(" · ") || "No devices", on };
  }

  _roomStrip() {
    return `
      <nav class="rooms" aria-label="Rooms">
        ${this._rooms().map((r) => {
          const s = this._roomStatus(r.id);
          return `<button class="room ${this._ui.sheet === r.id ? "pressed" : ""}" data-act="room" data-id="${esc(r.id)}" aria-expanded="${this._ui.sheet === r.id}">
            <span class="roomtop"><span class="roomname">${esc(r.name)}</span><span class="led ${s.on ? "lit" : ""}"></span></span>
            <span class="roomstatus">${esc(s.text)}</span>
          </button>`;
        }).join("")}
      </nav>`;
  }

  /* Home view */

  _home() {
    return `
      <div class="home">
        <section class="card clockcard" aria-label="Clock">
          <div class="cardtop"><span class="eyebrow">${esc(this._hass.config.location_name || "Home")}</span><span id="digital" class="caption"></span></div>
          ${this._clockSvg()}
          <div class="caption tzname">${esc(this._tzName())}</div>
        </section>
        ${this._modeCard()}
        ${this._offCard()}
        ${this._weatherCard()}
      </div>`;
  }

  _clockSvg() {
    let ticks = "";
    for (let i = 0; i < 60; i++) {
      const a = (i * Math.PI) / 30, major = i % 5 === 0;
      const r1 = major ? 148 : 156, r2 = 167;
      ticks += `<line x1="${(200 + r1 * Math.sin(a)).toFixed(2)}" y1="${(200 - r1 * Math.cos(a)).toFixed(2)}" x2="${(200 + r2 * Math.sin(a)).toFixed(2)}" y2="${(200 - r2 * Math.cos(a)).toFixed(2)}" style="stroke-width:${major ? 6 : 3.5}px"/>`;
    }
    let small = "";
    for (let m = 5; m <= 60; m += 5) {
      const a = (m * Math.PI) / 30;
      small += `<text class="mnum" x="${(200 + 177 * Math.sin(a)).toFixed(2)}" y="${(200 - 177 * Math.cos(a)).toFixed(2)}">${m}</text>`;
    }
    const big = [12, 3, 6, 9].map((h) => {
      const a = (h * Math.PI) / 6;
      return `<text class="hnum" x="${(200 + 116 * Math.sin(a)).toFixed(2)}" y="${(200 - 116 * Math.cos(a)).toFixed(2)}">${h}</text>`;
    }).join("");
    return `
      <svg class="clock" viewBox="0 0 400 400" role="img" aria-label="Analogue clock">
        <circle cx="200" cy="200" r="198" class="c-bezel"/>
        <circle cx="200" cy="200" r="192" class="c-face"/>
        <circle cx="200" cy="200" r="186" class="c-ring"/>
        <path id="arc" class="c-arc" d=""/>
        <g class="c-ticks">${ticks}</g>
        ${small}${big}
        <text id="cdate" class="cdate" x="200" y="268"></text>
        <g id="hh"><line x1="200" y1="222" x2="200" y2="112" class="h-hour"/><line x1="200" y1="118" x2="200" y2="132" class="h-tip"/></g>
        <g id="mh"><line x1="200" y1="224" x2="200" y2="58" class="h-min"/><line x1="200" y1="63" x2="200" y2="80" class="h-tip"/></g>
        <circle cx="200" cy="200" r="19" class="c-hub"/>
        <circle cx="200" cy="200" r="13" class="c-hubring"/>
        <g id="sh"><line x1="200" y1="232" x2="200" y2="42" class="h-sec"/></g>
        <circle cx="200" cy="200" r="9" class="c-core"/>
      </svg>`;
  }

  _tick() {
    const r = this.shadowRoot;
    const hh = r.getElementById("hh");
    if (!hh) return;
    const now = new Date();
    const s = now.getSeconds(), m = now.getMinutes(), h = now.getHours();
    hh.setAttribute("transform", `rotate(${(h % 12) * 30 + m * 0.5} 200 200)`);
    r.getElementById("mh").setAttribute("transform", `rotate(${m * 6 + s * 0.1} 200 200)`);
    r.getElementById("sh").setAttribute("transform", `rotate(${s * 6} 200 200)`);
    const R = 140, a = (s * Math.PI) / 30;
    r.getElementById("arc").setAttribute("d", s === 0 ? "" :
      `M 200 ${200 - R} A ${R} ${R} 0 ${s > 30 ? 1 : 0} 1 ${(200 + R * Math.sin(a)).toFixed(2)} ${(200 - R * Math.cos(a)).toFixed(2)}`);
    const mon = now.toLocaleDateString("en-GB", { month: "short" });
    r.getElementById("cdate").textContent = `${pad(now.getDate())} ${mon}`;
    const dig = r.getElementById("digital");
    if (dig) dig.textContent = `${pad(h)}:${pad(m)}`;
  }

  _modeCard() {
    const id = this._modeId();
    const st = id && this._hass.states[id];
    const cur = st ? st.state : null;
    const mode = MODES.find((m) => m.id === cur);
    let since = "";
    const changed = st ? new Date(st.last_changed).getTime() : NaN;
    if (!isNaN(changed)) {
      const mins = Math.max(0, Math.round((Date.now() - changed) / 60000));
      const hrs = Math.round(mins / 60), days = Math.round(mins / 1440);
      since = mins < 1 ? "Changed just now"
        : mins < 60 ? `Changed ${mins} min ago`
        : mins < 1440 ? `Changed ${hrs} ${hrs === 1 ? "hour" : "hours"} ago`
        : `Changed ${days} ${days === 1 ? "day" : "days"} ago`;
    }
    return `
      <section class="card modecard" aria-label="House mode">
        <div class="stack">
          <span class="eyebrow">House mode</span>
          <span class="big">${mode ? mode.label : "Unavailable"}</span>
          <span class="caption">${st ? since : "The house mode entity is not available"}</span>
        </div>
        <div class="modes">
          ${MODES.map((m) => `
            <button class="key ${cur === m.id ? "pressed" : ""}" data-act="mode" data-val="${m.id}" aria-pressed="${cur === m.id}" ${id ? "" : "disabled"}>
              <span class="led ${cur === m.id ? "lit" : ""}"></span>
              ${icon(m.icon, 30, 'style="stroke-width:1.5"')}
              <span class="keylabel">${m.label}</span>
            </button>`).join("")}
        </div>
      </section>`;
  }

  _offCard() {
    const lights = this._ids("light").filter((id) => !this._isGroup(id));
    lights.forEach((id) => this._st(id));
    const on = lights.filter((id) => this._hass.states[id].state === "on");
    const rooms = new Set(on.map((id) => this._areaOf(id)).filter(Boolean)).size;
    let body;
    if (this._ui.confirm) {
      body = `
        <div class="offtext"><strong>Turn off all lights, heating and media?</strong><span class="caption">Security stays as it is.</span></div>
        <div class="row">
          <button class="btn solid" data-act="all-off">Turn off</button>
          <button class="btn" data-act="cancel-off">Cancel</button>
        </div>`;
    } else if (on.length) {
      body = `
        <button class="power" data-act="ask-off" aria-label="Turn everything off"><span class="powerface">${icon("power", 30, 'style="stroke-width:2"')}</span></button>
        <div class="offtext"><strong>Everything off</strong><span class="caption">${on.length} ${on.length === 1 ? "light" : "lights"} on${rooms ? ` in ${rooms} ${rooms === 1 ? "room" : "rooms"}` : ""}</span></div>`;
    } else {
      body = `
        <div class="power idle" aria-hidden="true"><span class="powerface">${icon("power", 30, 'style="stroke-width:2"')}</span></div>
        <div class="offtext"><strong>Everything is off</strong><span class="caption">Turn a light on in any room to resume</span></div>`;
    }
    return `<section class="card offcard ${this._ui.confirm ? "confirm" : ""}" aria-label="Everything off">${body}</section>`;
  }

  _weatherCard() {
    const id = this._weatherId();
    if (id) this._st(id);
    const fc = this._forecast;
    let days = "";
    if (!id) days = `<p class="caption">No weather entity found.</p>`;
    else if (fc === null) days = `<p class="caption">Loading forecast…</p>`;
    else if (!fc.length) days = `<p class="caption">This weather entity provides no daily forecast.</p>`;
    else {
      days = fc.slice(0, 7).map((d, i) => {
        const dt = new Date(d.datetime);
        const label = i === 0 ? "Today" : dt.toLocaleDateString("en-GB", { weekday: "short" });
        const kind = WX[d.condition] || "cloud";
        const prob = d.precipitation_probability;
        const hasProb = prob !== undefined && prob !== null;
        const rainText = hasProb ? (prob > 0 ? `${Math.round(prob)}%` : "Dry") : (d.precipitation ? `${d.precipitation} mm` : "Dry");
        const level = hasProb ? prob : Math.min(100, (d.precipitation || 0) * 10);
        return `
          <div class="day ${i === 0 ? "today" : ""}">
            <span class="dlabel">${esc(label)}</span>
            <span class="dicon ${kind}" aria-label="${esc(d.condition)}">${icon(kind, 28)}</span>
            <span class="dtemps"><span class="hi">${d.temperature !== undefined ? Math.round(d.temperature) + "°" : "–"}</span><span class="lo">${d.templow !== undefined ? Math.round(d.templow) + "°" : ""}</span></span>
            <span class="drain"><span class="bar"><span style="--p:${Math.round(level)}%"></span></span><span class="rtext ${level > 0 ? "wet" : ""}">${rainText}</span></span>
          </div>`;
      }).join("");
    }
    return `
      <section class="card wxcard" aria-label="Weather this week">
        <div class="cardtop">
          <span class="eyebrow">This week</span>
          <span class="legend"><span><i class="k-day"></i>Day</span><span><i class="k-night"></i>Night</span><span><i class="k-rain"></i>Rain</span></span>
        </div>
        <div class="days">${days}</div>
      </section>`;
  }

  /* Shared controls */

  _lightRow(id) {
    const st = this._st(id);
    if (!st) return "";
    const on = st.state === "on";
    const unavailable = st.state === "unavailable" || st.state === "unknown";
    const dim = this._dimmable(st);
    const name = esc(this._name(id));
    const status = unavailable ? "Unavailable" : on ? (dim ? this._pct(st) + "% brightness" : "On") : "Off";
    return `
      <div class="lightrow row">
        <button class="lr-hit" data-act="light-open" data-id="${esc(id)}" aria-label="${name}, ${status}. Open settings">
          <span class="stack tight"><span class="lname">${name}</span><span class="caption">${status}</span></span>
          ${icon("chevron", 18)}
        </button>
        <button class="switch ${on ? "on" : ""}" data-act="toggle" data-id="${esc(id)}" aria-pressed="${on}" aria-label="${on ? "Turn off" : "Turn on"} ${name}" ${unavailable ? "disabled" : ""}><span></span></button>
      </div>`;
  }

  // One light inside the light panel: switch plus brightness slider when it can dim.
  _lightControl(id, main) {
    const st = this._st(id);
    if (!st) return "";
    const on = st.state === "on";
    const unavailable = st.state === "unavailable" || st.state === "unknown";
    const dim = this._dimmable(st);
    const name = esc(this._name(id));
    const status = unavailable ? "Unavailable" : on ? (dim ? this._pct(st) + "% brightness" : "On") : "Off";
    return `
      <div class="lightrow ctl ${main ? "main" : ""}">
        <div class="lr-top">
          <div class="stack tight"><span class="${main ? "eyebrow" : "lname"}">${main ? (this._members(id).length ? "Whole group" : "Brightness") : name}</span><span class="caption">${status}</span></div>
          <button class="switch ${on ? "on" : ""}" data-act="toggle" data-id="${esc(id)}" aria-pressed="${on}" aria-label="${on ? "Turn off" : "Turn on"} ${name}" ${unavailable ? "disabled" : ""}><span></span></button>
        </div>
        ${dim && !unavailable ? `<input class="${on ? "" : "off"}" type="range" min="1" max="100" value="${on ? this._pct(st) : 1}" data-act="bri" data-id="${esc(id)}" aria-label="${name} brightness">` : ""}
      </div>`;
  }

  _members(id) {
    const st = this._hass.states[id];
    const list = st && Array.isArray(st.attributes.entity_id) ? st.attributes.entity_id : [];
    return list.filter((m) => m.startsWith("light.") && this._hass.states[m]);
  }

  _roomSwitch(areaId, name) {
    const lights = this._lightsIn(areaId).filter((l) => this._st(l) && !["unavailable", "unknown"].includes(this._hass.states[l].state));
    const on = lights.some((l) => this._hass.states[l].state === "on");
    return `<button class="switch ${on ? "on" : ""}" data-act="room-toggle" data-id="${esc(areaId)}" aria-pressed="${on}" aria-label="${on ? "Turn off" : "Turn on"} all lights in ${esc(name)}" ${lights.length ? "" : "disabled"}><span></span></button>`;
  }

  /* Heating helpers */
  _roundStep(t) { return Math.round(t / TEMP_STEP) * TEMP_STEP; }
  _clampTemp(st, t) {
    const a = st.attributes;
    return Math.min(a.max_temp ?? 30, Math.max(a.min_temp ?? 5, Math.round(t * 10) / 10));
  }
  // On means heating towards a real target: not off, not on a schedule, not held at frost protection.
  _heating(st) {
    const t = Number(st.attributes.temperature);
    return st.state === "heat" && !isNaN(t) && t >= COMFORT_MIN;
  }
  // Switching on starts from the room temperature right now, rounded up to the next half degree.
  _startTarget(st) {
    const now = Number(st.attributes.current_temperature);
    return this._clampTemp(st, isNaN(now) ? 20 : Math.ceil(now / TEMP_STEP - 1e-9) * TEMP_STEP);
  }

  /* Heating changes show on screen at once. The target only goes to the device after
     SEND_DELAY of quiet, and the screen keeps the chosen value until the device confirms it. */
  _queueTarget(id, temp) {
    const old = this._pend[id];
    if (old) { clearTimeout(old.timer); clearTimeout(old.guard); }
    const p = this._pend[id] = { on: true, temp, sent: false };
    p.timer = setTimeout(() => this._sendTarget(id, p), SEND_DELAY);
  }
  _sendTarget(id, p) {
    if (this._pend[id] !== p) return;
    p.timer = null;
    p.sent = true;
    this._schedule();
    this._call("climate", "set_temperature", { entity_id: id, temperature: p.temp, hvac_mode: "heat" })
      .catch(() => { if (this._pend[id] === p) { this._dropPend(id); this._schedule(); } });
    p.guard = setTimeout(() => { if (this._pend[id] === p) { delete this._pend[id]; this._schedule(); } }, CONFIRM_TIMEOUT);
  }
  _dropPend(id) {
    const p = this._pend[id];
    if (!p) return;
    clearTimeout(p.timer); clearTimeout(p.guard);
    delete this._pend[id];
  }
  // What the card shows: the pending choice if there is one, otherwise the device state.
  // A sent change is cleared as soon as the device reports it.
  _view(id, st) {
    const p = this._pend[id];
    if (p && p.sent && st) {
      const done = p.on
        ? st.state === "heat" && Math.abs(Number(st.attributes.temperature) - p.temp) < 0.05
        : !this._heating(st);
      if (done) this._dropPend(id);
    }
    const q = this._pend[id];
    if (q) return { on: q.on, temp: q.on ? q.temp : null, pending: true, sending: q.sent };
    return { on: !!st && this._heating(st), temp: st ? Number(st.attributes.temperature) : null, pending: false, sending: false };
  }

  // "Europe/Brussels" becomes "Central European Time"; falls back to the raw zone name.
  _tzName() {
    const tz = this._hass.config.time_zone || "";
    try {
      const part = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "longGeneric" })
        .formatToParts(new Date()).find((p) => p.type === "timeZoneName");
      return (part && part.value) || tz;
    } catch (e) { return tz; }
  }

  _climateBlock(id) {
    const st = this._st(id);
    if (!st) return "";
    if (st.state === "unavailable" || st.state === "unknown") {
      return `
      <div class="climate offline">
        <span class="lname">Not responding</span>
        <span class="caption">${esc(this._name(id))} is offline, so temperature and target cannot be shown or changed.</span>
      </div>`;
    }
    const a = st.attributes;
    const v = this._view(id, st);
    const on = v.on;
    const name = esc(this._name(id));
    return `
      <div class="climate">
        ${!v.pending && on && a.hvac_action === "heating" ? `<span class="heatdot" role="img" aria-label="Heating now" title="Heating now"></span>` : ""}
        <div class="cl-top">
          <div class="stack tight"><span class="caption">Now</span><span class="huge">${this._temp(a.current_temperature)}</span></div>
          ${a.current_humidity !== undefined ? `<span class="caption">Humidity ${Math.round(a.current_humidity)}%</span>` : ""}
        </div>
        <div class="seg" role="group" aria-label="Heating ${name}">
          <button class="segbtn ${on ? "" : "sel"}" data-act="heat-off" data-id="${esc(id)}" aria-pressed="${!on}">Off</button>
          <button class="segbtn ${on ? "sel" : ""}" data-act="heat-on" data-id="${esc(id)}" aria-pressed="${on}">On</button>
        </div>
        ${on ? `
        <div class="cl-row">
          <span class="stack tight"><span class="lname">Target</span>${v.sending ? `<span class="caption">Sending</span>` : ""}</span>
          <span class="stepper">
            <button class="sq" data-act="temp" data-id="${esc(id)}" data-val="-1" aria-label="Lower target to ${this._temp(this._clampTemp(st, this._roundStep(v.temp) - TEMP_STEP))}">${icon("minus", 20)}</button>
            <span class="target" aria-live="polite">${this._temp(v.temp)}</span>
            <button class="sq" data-act="temp" data-id="${esc(id)}" data-val="1" aria-label="Raise target to ${this._temp(this._clampTemp(st, this._roundStep(v.temp) + TEMP_STEP))}">${icon("plus", 20)}</button>
          </span>
        </div>` : ""}
      </div>`;
  }

  /* Other views */

  // Lights shown on the Lights page: those in the rooms, without lights outside any room.
  _roomLights() {
    return this._rooms().flatMap((r) => this._lightsIn(r.id));
  }

  _lightsView() {
    const cards = this._rooms().map((r) => {
      const ids = this._lightsIn(r.id);
      if (!ids.length) return "";
      return `<section class="card list"><div class="cardtop"><span class="eyebrow">${esc(r.name)}</span>${this._roomSwitch(r.id, r.name)}</div>${ids.map((i) => this._lightRow(i)).join("")}</section>`;
    }).join("");
    const usable = this._roomLights().filter((l) => this._st(l) && !["unavailable", "unknown"].includes(this._hass.states[l].state));
    const anyOn = usable.some((l) => this._hass.states[l].state === "on");
    const master = `<button class="switch ${anyOn ? "on" : ""}" data-act="all-lights" aria-pressed="${anyOn}" aria-label="${anyOn ? "Turn off" : "Turn on"} all lights" ${usable.length ? "" : "disabled"}><span></span></button>`;
    return `<div class="viewhead"><h2 class="viewtitle">Lights</h2>${master}</div><div class="grid">${cards}</div>`;
  }

  _heatingView() {
    const ids = this._ids("climate");
    const areas = this._hass.areas || {};
    return `<h2 class="viewtitle">Heating</h2><div class="grid">${ids.map((id) => {
      const area = this._areaOf(id);
      return `<section class="card list"><div class="cardtop"><span class="eyebrow">${esc((area && areas[area] && areas[area].name) || this._name(id))}</span></div>${this._climateBlock(id)}</section>`;
    }).join("") || `<p class="caption">No heating found.</p>`}</div>`;
  }

  _securityView() {
    const alarm = this._alarmId();
    const ast = alarm && this._st(alarm);
    const label = { disarmed: "Disarmed", armed_home: "Armed, home", armed_away: "Armed, away", armed_night: "Armed, night", armed_vacation: "Armed, holiday", triggered: "Triggered", arming: "Arming", pending: "Pending" };
    const alarmCard = ast ? `
      <section class="card">
        <div class="stack"><span class="eyebrow">Alarm system</span><span class="big">${esc(label[ast.state] || ast.state)}</span><span class="caption">${esc(this._name(alarm))}</span></div>
        <div class="chips wide">
          ${[["alarm_disarm", "Disarm", "disarmed"], ["alarm_arm_home", "Home", "armed_home"], ["alarm_arm_away", "Away", "armed_away"]].map(([svc, l, s]) =>
            `<button class="chip ${ast.state === s ? "pressed" : ""}" data-act="alarm" data-id="${esc(alarm)}" data-val="${svc}" aria-pressed="${ast.state === s}">${l}</button>`).join("")}
        </div>
      </section>` : "";
    const cams = this._ids("camera").map((id) => this._camCard(id)).join("");
    // Real contact sensors only. Tado reports a window as open when a radiator sees the
    // temperature drop; that is a guess, so it stays out of this list.
    const guessed = new Set(["tado"]);
    const contacts = this._ids("binary_sensor").filter((id) => {
      const ent = this._hass.entities && this._hass.entities[id];
      if (ent && guessed.has(ent.platform)) return false;
      return ["door", "window", "opening", "garage_door"].includes(this._hass.states[id].attributes.device_class);
    });
    const contactCard = contacts.length ? `<section class="card list"><div class="cardtop"><span class="eyebrow">Doors and windows</span></div>${contacts.map((id) => {
      const st = this._st(id);
      return `<div class="lr-top line"><span class="lname">${esc(this._name(id))}</span><span class="caption">${st.state === "on" ? "Open" : "Closed"}</span></div>`;
    }).join("")}</section>` : "";
    return `<h2 class="viewtitle">Security</h2><div class="grid">${alarmCard}${contactCard}</div>${cams ? `<div class="cams">${cams}</div>` : ""}`;
  }

  /* ---------- Cameras ---------- */

  _camName(id) {
    const area = this._areaOf(id);
    const areas = this._hass.areas || {};
    return (area && areas[area] && areas[area].name) || this._name(id);
  }

  _isEufy(id) {
    const ent = this._hass.entities && this._hass.entities[id];
    return !!ent && ent.platform === "eufy_security";
  }

  // Battery, signal and motion entities that belong to the same device as the camera.
  _camParts(id) {
    const ents = this._hass.entities || {};
    const dev = ents[id] && ents[id].device_id;
    const parts = {};
    if (!dev) return parts;
    for (const e of Object.values(ents)) {
      if (e.device_id !== dev) continue;
      const eid = e.entity_id;
      if (eid.startsWith("sensor.") && eid.endsWith("_battery_percentage")) parts.battery = eid;
      else if (eid.startsWith("sensor.") && eid.endsWith("_wifi_rssi")) parts.rssi = eid;
      else if (eid.startsWith("sensor.") && eid.endsWith("_wifi_signal_level")) parts.level = eid;
      else if (eid.startsWith("sensor.") && eid.endsWith("_charging_status")) parts.charging = eid;
      else if (eid.startsWith("binary_sensor.") && eid.endsWith("_motion_detected")) parts.motion = eid;
      else if (eid.startsWith("binary_sensor.") && eid.endsWith("_person_detected")) parts.person = eid;
    }
    if (!parts.battery) {
      const b = Object.values(ents).find((e) => e.device_id === dev && e.entity_id.startsWith("sensor.") && this._hass.states[e.entity_id] && this._hass.states[e.entity_id].attributes.device_class === "battery");
      if (b) parts.battery = b.entity_id;
    }
    return parts;
  }

  _camInfo(id) {
    const p = this._camParts(id);
    const num = (eid) => { const st = eid && this._st(eid); const v = st ? Number(st.state) : NaN; return isNaN(v) ? null : v; };
    const txt = (eid) => { const st = eid && this._st(eid); return st && !["unknown", "unavailable"].includes(st.state) ? st.state : null; };
    const battery = num(p.battery);
    const rssi = num(p.rssi);
    const chargeTxt = txt(p.charging);
    return {
      battery,
      battStage: battery === null ? null : battery > 75 ? 4 : battery > 50 ? 3 : battery > 25 ? 2 : battery > 10 ? 1 : 0,
      charging: !!chargeTxt && /charg/i.test(chargeTxt) && !/not/i.test(chargeTxt),
      chargeTxt,
      rssi,
      sigStage: rssi === null ? null : rssi >= -55 ? 4 : rssi >= -65 ? 3 : rssi >= -75 ? 2 : rssi >= -85 ? 1 : 0,
      levelTxt: txt(p.level),
      motion: p.motion && this._st(p.motion),
      person: p.person && this._st(p.person),
    };
  }

  _camLive(id) {
    const st = this._hass.states[id];
    if (!st) return false;
    return this._isEufy(id) ? st.state === "streaming" : !!(this._cam[id] && this._cam[id].on);
  }

  _camStatus(id) {
    const c = this._cam[id] || {};
    if (c.error) return c.error;
    if (c.pending === "start") return "Connecting";
    if (c.pending === "stop") return "Stopping";
    return this._camLive(id) ? "Live" : "Paused";
  }

  _statPill(info) {
    const parts = [];
    if (info.battStage !== null) {
      parts.push(`<span class="pillpart ${info.battery <= 15 && !info.charging ? "low" : ""}">${battIcon(info.battStage, info.charging)}<span>${Math.round(info.battery)}%</span></span>`);
    }
    if (info.sigStage !== null) parts.push(`<span class="pillpart">${signalIcon(info.sigStage)}</span>`);
    if (!parts.length) return "";
    const label = [
      info.battery !== null ? `Battery ${Math.round(info.battery)} percent${info.charging ? ", charging" : ""}` : "",
      info.levelTxt || info.rssi !== null ? `Wi-Fi ${info.levelTxt ? info.levelTxt.toLowerCase() : ""}${info.rssi !== null ? ` ${String(info.rssi).replace("-", "\u2212")} dBm` : ""}` : "",
    ].filter(Boolean).join(", ");
    return `<span class="statpill" role="img" aria-label="${esc(label)}">${parts.join("")}</span>`;
  }

  _still(st, cls = "") {
    const pic = st.attributes.entity_picture;
    return pic ? `<img class="still ${cls}" src="${esc(pic)}" alt="">` : `<span class="still camph">${icon("camera", 32)}</span>`;
  }

  _camCard(id) {
    const st = this._st(id);
    const name = this._camName(id);
    const live = this._camLive(id);
    const c = this._cam[id] || {};
    const busy = !!c.pending;
    const inModal = this._ui.camFull === id;
    const info = this._camInfo(id);
    const playAct = live || c.pending === "start" ? "cam-pause" : "cam-play";
    return `
      <section class="camcard">
        <div class="camview ${live ? "is-live" : ""}">
          ${this._still(st)}
          ${live && !inModal ? `<div class="camslot" data-camslot="${esc(id)}"></div>` : ""}
          ${live ? `<span class="livebadge"><span class="livedot"></span>Live</span>` : ""}
          ${this._statPill(info)}
          ${busy && c.pending === "start" ? `<span class="spin" aria-hidden="true"></span>` : ""}
          <button class="cambtn play" data-act="${playAct}" data-id="${esc(id)}" aria-label="${playAct === "cam-play" ? "Play" : "Pause"} ${esc(name)}" ${c.pending === "stop" ? "disabled" : ""}>${icon(playAct === "cam-play" ? "play" : "pause", 22)}</button>
          <button class="cambtn full" data-act="cam-full" data-id="${esc(id)}" aria-label="Open ${esc(name)} full screen">${icon("expand", 20)}</button>
        </div>
        <div class="camlabel"><span>${esc(name)}</span><span class="caption">${esc(this._camStatus(id))}</span></div>
      </section>`;
  }

  _camModal() {
    const id = this._ui.camFull;
    const st = id && this._st(id);
    if (!st) return "";
    const name = this._camName(id);
    const live = this._camLive(id);
    const c = this._cam[id] || {};
    const info = this._camInfo(id);
    const soundOn = !!(this._sound && this._sound.id === id) || (!!c.wantSound && c.pending === "start");
    const talkOn = !!(this._talk && this._talk.id === id) || (!!c.wantTalk && c.pending === "start");
    const playAct = live || c.pending === "start" ? "cam-pause" : "cam-play";
    const eufy = this._isEufy(id);
    const station = eufy && Object.keys(this._hass.states).find((e) => e.startsWith("binary_sensor.") && e.endsWith("_connected") && this._hass.entities && this._hass.entities[e] && this._hass.entities[e].platform === "eufy_security");
    const stationSt = station && this._st(station);
    const rows = [
      ["Status", this._camStatus(id)],
      info.battery !== null ? ["Battery", `${Math.round(info.battery)}%${info.chargeTxt ? `, ${info.chargeTxt.toLowerCase()}` : ""}`, battIcon(info.battStage, info.charging)] : null,
      info.rssi !== null || info.levelTxt ? ["Wi-Fi", [info.levelTxt, info.rssi !== null ? `${String(info.rssi).replace("-", "\u2212")} dBm` : ""].filter(Boolean).join(", "), info.sigStage !== null ? signalIcon(info.sigStage) : ""] : null,
      stationSt ? ["HomeBase", stationSt.state === "on" ? "Connected" : "Not connected"] : null,
      info.motion ? ["Last motion", this._ago(info.motion)] : null,
      info.person ? ["Last person", this._ago(info.person)] : null,
    ].filter(Boolean);
    const err = c.error ? `<p class="caption cf-err" role="alert">${esc(c.error)}</p>` : "";
    return `
      <div class="camfull" role="dialog" aria-modal="true" aria-label="${esc(name)} camera">
        <div class="cf-stage ${live ? "is-live" : ""}">
          ${this._still(st, "contain")}
          ${live ? `<div class="camslot" data-camslot="${esc(id)}"></div>` : ""}
          ${c.pending === "start" ? `<span class="spin" aria-hidden="true"></span>` : ""}
        </div>
        <div class="cf-panel">
          <div class="cf-head">
            <div class="stack tight"><span class="eyebrow">Camera</span><h2>${esc(name)}</h2></div>
            <button class="iconbtn" data-act="cam-close" aria-label="Close">${icon("close", 20)}</button>
          </div>
          <div class="cf-controls">
            <button class="cfbtn ${live ? "on" : ""}" data-act="${playAct}" data-id="${esc(id)}" aria-pressed="${live}" ${c.pending === "stop" ? "disabled" : ""}>
              <span class="cfface">${icon(playAct === "cam-play" ? "play" : "pause", 24)}</span><span>${playAct === "cam-play" ? "Play" : "Pause"}</span></button>
            <button class="cfbtn ${soundOn ? "on" : ""}" data-act="cam-sound" data-id="${esc(id)}" aria-pressed="${soundOn}" ${eufy ? "" : "disabled"}>
              <span class="cfface">${icon(soundOn ? "sound" : "mute", 24)}</span><span>${soundOn ? "Sound on" : "Sound off"}</span></button>
            <button class="cfbtn ${talkOn ? "on talk" : ""}" data-act="cam-talk" data-id="${esc(id)}" aria-pressed="${talkOn}" ${eufy ? "" : "disabled"}>
              <span class="cfface">${icon(talkOn ? "mic" : "micoff", 24)}</span><span>${talkOn ? "Talking" : "Talk"}</span></button>
          </div>
          ${err}
          <div class="cf-rows">${rows.map(([k, v, g]) => `<div class="cf-row"><span class="caption">${esc(k)}</span><span class="cf-val">${g || ""}${esc(v)}</span></div>`).join("")}</div>
          <p class="caption">${eufy ? "To spare the battery, the live view pauses after five minutes and when you leave this page." : ""}</p>
        </div>
      </div>`;
  }

  _ago(st) {
    const t = Date.parse(st.last_changed);
    if (isNaN(t)) return "Unknown";
    const min = Math.round((Date.now() - t) / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min} min ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
    const d = Math.round(h / 24);
    return `${d} ${d === 1 ? "day" : "days"} ago`;
  }

  async _camStart(id) {
    const c = this._cam[id] = { ...(this._cam[id] || {}), error: null };
    if (this._camLive(id)) return;
    if (!this._isEufy(id)) { c.on = true; this._schedule(); return; }
    c.pending = "start";
    c.since = Date.now();
    c.own = true;
    clearTimeout(c.timer);
    c.timer = setTimeout(() => {
      if (this._cam[id] === c && c.pending === "start") {
        c.pending = null; c.error = "The camera did not respond"; c.wantSound = c.wantTalk = false; this._schedule();
      }
    }, 30000);
    this._schedule();
    try {
      await this._call("eufy_security", "start_p2p_livestream", { entity_id: id });
    } catch (e) {
      // "Already running" is fine; anything else shows once the timeout passes.
    }
  }

  async _camStop(id) {
    if (this._sound && this._sound.id === id) this._stopSound();
    if (this._talk && this._talk.id === id) this._stopTalk();
    const c = this._cam[id] = { ...(this._cam[id] || {}), error: null, wantSound: false, wantTalk: false };
    clearTimeout(c.timer);
    if (!this._isEufy(id)) { c.on = false; c.pending = null; this._schedule(); return; }
    c.pending = this._camLive(id) ? "stop" : null;
    this._schedule();
    try { await this._call("eufy_security", "stop_p2p_livestream", { entity_id: id }); } catch (e) { /* state decides */ }
    c.timer = setTimeout(() => { if (c.pending === "stop") { c.pending = null; this._schedule(); } }, 15000);
  }

  // Streams this panel started are paused when you leave the Security page or the panel.
  _pauseOwnStreams() {
    for (const [id, c] of Object.entries(this._cam)) {
      if (c.own && (this._camLive(id) || c.pending === "start")) this._camStop(id);
    }
  }

  _closeCam() {
    const id = this._ui.camFull;
    this._ui.camFull = null;
    if (this._sound && this._sound.id === id) this._stopSound();
    if (this._talk && this._talk.id === id) this._stopTalk();
    if (id && this._cam[id]) { this._cam[id].wantSound = false; this._cam[id].wantTalk = false; }
  }

  // Runs after every render: keeps players, pending states and audio in line with the camera state.
  _syncLive() {
    let again = false;
    // Watch cameras with a player or a pending action on every view, so they are cleaned up anywhere.
    for (const id of [...this._live.keys(), ...Object.keys(this._cam)]) this._deps.add(id);
    for (const id of this._ids("camera")) {
      const live = this._camLive(id);
      const c = this._cam[id];
      if (c) {
        if (live && c.pending === "start") {
          c.pending = null; clearTimeout(c.timer); again = true;
          if (c.wantSound) { c.wantSound = false; this._startSound(id); }
          if (c.wantTalk) { c.wantTalk = false; this._startTalk(id); }
        }
        if (!live && c.pending === "stop") { c.pending = null; clearTimeout(c.timer); again = true; }
        if (live && c.own && !c.limit) c.limit = setTimeout(() => { c.limit = null; if (this._camLive(id)) this._camStop(id); }, LIVE_LIMIT);
        if (!live && c.limit) { clearTimeout(c.limit); c.limit = null; c.own = false; }
      }
      if (!live) {
        if (this._sound && this._sound.id === id) this._stopSound();
        if (this._talk && this._talk.id === id) this._stopTalk();
        const rec = this._live.get(id);
        if (rec) { rec.frame.remove(); this._live.delete(id); }
        continue;
      }
      let rec = this._live.get(id);
      if (!rec) {
        if (!customElements.get("ha-camera-stream")) { this._loadStreamEl(id); continue; }
        const frame = document.createElement("div");
        frame.className = "liveframe";
        const el = document.createElement("ha-camera-stream");
        el.muted = true;
        el.controls = false;
        frame.appendChild(el);
        this._layer.appendChild(frame);
        rec = { frame, el };
        this._live.set(id, rec);
      }
      rec.el.hass = this._hass;
      if (rec.el.stateObj !== this._hass.states[id]) rec.el.stateObj = this._hass.states[id];
      const fit = this._ui.camFull === id ? "contain" : "cover";
      if (rec.el.fitMode !== fit) rec.el.fitMode = fit;
    }
    this._placeLive();
    if (again) this._schedule();
  }

  _placeLive() {
    if (!this._root || !this._live.size) return;
    const host = this.getBoundingClientRect();
    this._live.forEach((rec, id) => {
      const slot = this._root.querySelector(`[data-camslot="${CSS.escape(id)}"]`);
      const f = rec.frame.style;
      if (!slot) { f.visibility = "hidden"; return; }
      const r = slot.getBoundingClientRect();
      const full = this._ui.camFull === id;
      f.visibility = "visible";
      f.top = `${r.top - host.top}px`;
      f.left = `${r.left - host.left}px`;
      f.width = `${r.width}px`;
      f.height = `${r.height}px`;
      f.zIndex = full ? "21" : "1";
      f.borderRadius = full ? "0" : "28px 28px 0 0";
      f.setProperty("--video-max-height", `${r.height}px`);
    });
  }

  // Home Assistant loads its camera player on demand; a picture card pulls it in.
  _loadStreamEl(id) {
    if (this._streamLoading) return;
    this._streamLoading = (async () => {
      try {
        const helpers = window.loadCardHelpers && (await window.loadCardHelpers());
        if (helpers) {
          const card = await helpers.createCardElement({ type: "picture-entity", entity: id, camera_view: "live", show_name: false, show_state: false });
          card.hass = this._hass;
        }
      } catch (e) { /* fall through to the wait */ }
      await Promise.race([customElements.whenDefined("ha-camera-stream"), new Promise((r) => setTimeout(r, 10000))]);
      if (!customElements.get("ha-camera-stream")) {
        for (const cid of Object.keys(this._cam)) this._cam[cid].error = "The video player could not be loaded";
        this._streamLoading = null;
      }
      this._schedule();
    })();
  }

  /* Camera sound: the integration relays the camera audio as 16 kHz PCM. */

  _ctx() {
    if (!this._audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this._audioCtx = new AC();
    }
    if (this._audioCtx.state === "suspended") this._audioCtx.resume();
    return this._audioCtx;
  }

  _toggleSound(id) {
    if (this._sound && this._sound.id === id) { this._stopSound(); return; }
    const c = this._cam[id] = { ...(this._cam[id] || {}), error: null };
    this._ctx(); // unlock audio inside the tap
    if (!this._camLive(id)) {
      // Not live yet: remember the wish and start the live view; it applies once live.
      if (c.pending === "start") { c.wantSound = !c.wantSound; this._schedule(); } else { c.wantSound = true; this._camStart(id); }
      return;
    }
    this._startSound(id);
  }

  async _startSound(id) {
    this._stopSound();
    const ctx = this._ctx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const s = { id, gain, next: 0, unsub: null, dead: false };
    this._sound = s;
    this._schedule();
    try {
      const unsub = await this._hass.connection.subscribeMessage((m) => this._playPcm(s, m), { type: "rams_home/camera/listen", entity_id: id });
      if (s.dead) unsub(); else s.unsub = unsub;
    } catch (e) {
      if (this._sound === s) this._sound = null;
      this._camError(id, `Sound could not start: ${(e && e.message) || "unknown error"}`);
    }
  }

  _playPcm(s, m) {
    if (s.dead || !m || !m.pcm) return;
    const ctx = this._audioCtx;
    const bin = atob(m.pcm);
    const n = bin.length >> 1;
    if (!n) return;
    const buf = ctx.createBuffer(1, n, m.rate || 16000);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
      if (v >= 32768) v -= 65536;
      ch[i] = v / 32768;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(s.gain);
    const now = ctx.currentTime;
    // A small buffer absorbs network jitter; restart it after a gap or a pile up.
    if (s.next < now + 0.04 || s.next > now + 1.2) s.next = now + 0.25;
    src.start(s.next);
    s.next += buf.duration;
  }

  _stopSound() {
    const s = this._sound;
    if (!s) return;
    s.dead = true;
    this._sound = null;
    try { if (s.unsub) s.unsub(); } catch (e) { /* ignore */ }
    try { s.gain.disconnect(); } catch (e) { /* ignore */ }
    this._schedule();
  }

  /* Talk: the microphone is resampled to 16 kHz PCM and encoded by the integration. */

  _toggleTalk(id) {
    if (this._talk && this._talk.id === id) { this._stopTalk(); return; }
    const c = this._cam[id] = { ...(this._cam[id] || {}), error: null };
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this._camError(id, "The microphone needs a secure connection. Open Home Assistant through its https address.");
      return;
    }
    this._ctx();
    if (!this._camLive(id)) {
      if (c.pending === "start") { c.wantTalk = !c.wantTalk; this._schedule(); } else { c.wantTalk = true; this._camStart(id); }
      return;
    }
    this._startTalk(id);
  }

  async _startTalk(id) {
    this._stopTalk();
    const t = { id, dead: false, pos: 0, out: [] };
    this._talk = t;
    this._schedule();
    try {
      t.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (t.dead) { t.stream.getTracks().forEach((k) => k.stop()); return; }
      t.unsub = await this._hass.connection.subscribeMessage(() => {}, { type: "rams_home/camera/talk", entity_id: id });
      if (t.dead) { t.unsub(); t.stream.getTracks().forEach((k) => k.stop()); return; }
      const ctx = this._ctx();
      t.node = ctx.createMediaStreamSource(t.stream);
      t.proc = ctx.createScriptProcessor(4096, 1, 1);
      t.silent = ctx.createGain();
      t.silent.gain.value = 0;
      const ratio = ctx.sampleRate / 16000;
      t.proc.onaudioprocess = (e) => {
        if (t.dead) return;
        const input = e.inputBuffer.getChannelData(0);
        let pos = t.pos;
        while (pos < input.length) {
          const a = Math.floor(pos);
          const b = Math.max(a + 1, Math.min(input.length, Math.floor(pos + ratio)));
          let sum = 0;
          for (let k = a; k < b; k++) sum += input[k];
          const v = Math.max(-1, Math.min(1, sum / (b - a)));
          t.out.push(v < 0 ? v * 32768 : v * 32767);
          pos += ratio;
        }
        t.pos = pos - input.length;
        if (t.out.length >= 1600) {
          const pcm = new Int16Array(t.out);
          t.out = [];
          const bytes = new Uint8Array(pcm.buffer);
          let bin = "";
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
          this._hass.connection.sendMessage({ type: "rams_home/camera/talk_audio", entity_id: id, pcm: btoa(bin) });
        }
      };
      t.node.connect(t.proc);
      t.proc.connect(t.silent);
      t.silent.connect(ctx.destination);
    } catch (e) {
      const denied = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
      this._stopTalk();
      this._camError(id, denied ? "Microphone access was not allowed" : `Talk could not start: ${(e && e.message) || "unknown error"}`);
    }
  }

  _stopTalk() {
    const t = this._talk;
    if (!t) return;
    t.dead = true;
    this._talk = null;
    try { if (t.unsub) t.unsub(); } catch (e) { /* ignore */ }
    try { if (t.proc) { t.proc.onaudioprocess = null; t.proc.disconnect(); } } catch (e) { /* ignore */ }
    try { if (t.node) t.node.disconnect(); } catch (e) { /* ignore */ }
    try { if (t.silent) t.silent.disconnect(); } catch (e) { /* ignore */ }
    if (t.stream) t.stream.getTracks().forEach((k) => k.stop());
    this._schedule();
  }

  _camError(id, msg) {
    this._cam[id] = { ...(this._cam[id] || {}), error: msg };
    this._schedule();
  }

  /* ---------- Wall tablet ----------
     Uses Home Assistant's own per user settings: the default page, the hidden sidebar
     items (both stored for the signed in account) and the sidebar state of this device. */

  async _loadTablet() {
    try {
      const r = await this._hass.callWS({ type: "frontend/get_user_data", key: "rams_home" });
      this._tablet = !!(r && r.value && r.value.tablet);
    } catch (e) { this._tablet = false; }
    this._schedule();
  }

  _tabletCard() {
    const user = this._hass.user || {};
    const on = !!this._tablet;
    const busy = !!this._tabletBusy;
    let body;
    if (on) {
      body = `<span class="caption">This account opens straight into Rams Home, and the Home Assistant sidebar is hidden on this device.</span>
        <div class="row"><button class="btn" data-act="tablet-off" ${busy ? "disabled" : ""}>Leave wall tablet mode</button></div>`;
    } else if (user.is_admin) {
      body = `<span class="caption">You are signed in as ${esc(user.name || "an administrator")}, an administrator. Sign in on the tablet with a separate account without administrator rights, then turn this on there.</span>`;
    } else {
      body = `<span class="caption">Opens Rams Home on start, hides every other page from the sidebar for ${esc(user.name || "this account")}, and hides the sidebar on this device.</span>
        <div class="row"><button class="btn solid" data-act="tablet-on" ${busy ? "disabled" : ""}>Use as wall tablet</button></div>`;
    }
    const err = this._tabletError ? `<span class="caption cf-err" role="alert">${esc(this._tabletError)}</span>` : "";
    return `<section class="card"><span class="eyebrow">Wall tablet</span>${body}${err}</section>`;
  }

  async _setTablet(on) {
    const ws = (m) => this._hass.callWS(m);
    const get = async (key) => { const r = await ws({ type: "frontend/get_user_data", key }); return (r && r.value) || {}; };
    const set = (key, value) => ws({ type: "frontend/set_user_data", key, value });
    const self = (this._panel && this._panel.url_path) || "rams";
    this._tabletBusy = true; this._tabletError = null; this._schedule();
    try {
      const core = await get("core");
      const side = await get("sidebar");
      const mine = await get("rams_home");
      if (on) {
        const hidden = Object.keys(this._hass.panels || {}).filter((p) => p !== self);
        await set("rams_home", { ...mine, tablet: true, prev: { default_panel: core.default_panel ?? null, hiddenPanels: side.hiddenPanels ?? null } });
        await set("core", { ...core, default_panel: self });
        await set("sidebar", { ...side, hiddenPanels: hidden });
      } else {
        const prev = mine.prev || {};
        const nextCore = { ...core };
        if (prev.default_panel) nextCore.default_panel = prev.default_panel; else delete nextCore.default_panel;
        await set("core", nextCore);
        await set("sidebar", { ...side, hiddenPanels: prev.hiddenPanels || [] });
        await set("rams_home", { ...mine, tablet: false, prev: null });
      }
      this.dispatchEvent(new CustomEvent("hass-dock-sidebar", { detail: { dock: on ? "always_hidden" : "docked" }, bubbles: true, composed: true }));
      this._tablet = on;
    } catch (e) {
      this._tabletError = `Could not save: ${(e && e.message) || "unknown error"}`;
    }
    this._tabletBusy = false;
    this._schedule();
  }

  _settingsView() {
    const t = this._ui.theme;
    return `
      <h2 class="viewtitle">Settings</h2>
      <div class="grid">
        <section class="card">
          <span class="eyebrow">Appearance</span>
          <div class="chips wide">${[["auto", "Follow system"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) => `<button class="chip ${t === v ? "pressed" : ""}" data-act="themeset" data-val="${v}" aria-pressed="${t === v}">${l}</button>`).join("")}</div>
          <span class="eyebrow">Accent</span>
          <div class="row">${ACCENTS.map((c) => `<button class="swatch ${this._ui.accent === c ? "sel" : ""}" style="background:${c}" data-act="accent" data-val="${c}" aria-label="Accent ${c}" aria-pressed="${this._ui.accent === c}"></button>`).join("")}</div>
          <span class="caption">Appearance is stored on this device only.</span>
        </section>
        <section class="card">
          <span class="eyebrow">Rooms, weather and people</span>
          <span class="caption">Choose which areas appear as rooms and which weather, people and alarm entities the panel uses.</span>
          <div class="row"><button class="btn" data-act="goto" data-val="/config/integrations/integration/rams_home">Open integration options</button></div>
          <span class="caption">Rams Home ${RAMS_VERSION}</span>
        </section>
        ${this._tabletCard()}
      </div>`;
  }

  /* Sheets */

  _sheet() {
    const id = this._ui.sheet;
    if (!id) return "";
    let title, eyebrow, body;
    if (id === "notifications") {
      eyebrow = "Inbox"; title = "Notifications";
      const list = Object.values(this._notifications);
      body = list.length ? list.map((n) => `
        <div class="lightrow">
          <div class="lr-top"><span class="lname">${esc(n.title || "Notification")}</span><button class="link" data-act="dismiss" data-id="${esc(n.notification_id)}">Dismiss</button></div>
          <span class="caption pre">${esc(n.message)}</span>
        </div>`).join("") : `<p class="caption">No notifications.</p>`;
    } else if (String(id).startsWith("light:")) {
      const lid = id.slice(6);
      if (!this._st(lid)) return "";
      const members = this._members(lid);
      eyebrow = members.length ? "Light group" : "Light"; title = this._name(lid);
      body = `
        ${this._lightControl(lid, true)}
        ${members.length ? `<div class="cardtop"><span class="eyebrow">Lamps in this group</span></div>${members.map((m) => this._lightControl(m, false)).join("")}` : ""}`;
    } else {
      const area = (this._hass.areas || {})[id];
      if (!area) return "";
      eyebrow = "Room"; title = area.name;
      const cl = this._climateIn(id);
      const lights = this._lightsIn(id);
      const on = lights.filter((l) => this._st(l) && this._hass.states[l].state === "on").length;
      body = `
        ${cl ? this._climateBlock(cl) : ""}
        <div class="cardtop"><div class="stack tight"><span class="eyebrow">Lights</span><span class="caption">${lights.length ? (on ? `${on} of ${lights.length} on` : "All off") : "No lights in this room"}</span></div>${lights.length ? this._roomSwitch(id, area.name) : ""}</div>
        ${lights.map((l) => this._lightRow(l)).join("")}`;
    }
    return `
      <button class="scrim" data-act="close" aria-label="Close"></button>
      <div class="sheet" role="dialog" aria-label="${esc(title)}">
        <span class="grabber" aria-hidden="true"></span>
        <div class="sheet-head">
          ${this._ui.sheetBack ? `<button class="iconbtn flat back" data-act="sheet-back" aria-label="Back">${icon("back", 20)}</button>` : ""}
          <div class="stack tight grow"><span class="eyebrow">${eyebrow}</span><h2>${esc(title)}</h2></div>
          <button class="iconbtn" data-act="close" aria-label="Close">${icon("close", 20)}</button>
        </div>
        <div class="sheet-body">${body}</div>
      </div>`;
  }
}

const STYLES = `
:host{display:block;position:relative;container-type:inline-size;container-name:rams;min-height:100vh}
*{box-sizing:border-box}
.wrap{--ground:#E9E7E2;--surface:#F4F3EF;--raised:#FBFAF7;--ink:#1C1C1A;--ink2:#5E5C57;--ink3:#6B6964;--navfg:#4A4844;--well:#E3E0DA;--pressed:#E6E4DE;--ledoff:#CFCBC3;--line:#D6D3CC;--track:#E1DED7;--night:#A9A59D;--rain:#3E5C76;--sunk:#EDEBE6;--line2:#E6E3DC;--muted:#8A8780;--hl:#FFFFFF;--sh:28,28,26;
  --raise:inset 0 1px 0 var(--hl),0 1px 2px rgba(var(--sh),.08),0 6px 16px rgba(var(--sh),.08);
  --press:inset 0 2px 5px rgba(var(--sh),.12);
  --card:inset 0 1px 0 var(--hl),0 1px 2px rgba(var(--sh),.05),0 12px 32px rgba(var(--sh),.06);
  min-height:100vh;background:var(--ground);color:var(--ink);font-family:'Archivo','Helvetica Neue',Helvetica,sans-serif;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;transition:background-color .35s,color .35s}
.wrap.dark{--ground:#141413;--surface:#1D1D1B;--raised:#272725;--ink:#ECEAE5;--ink2:#A6A39C;--ink3:#9D9A93;--navfg:#BCB9B2;--well:#101010;--pressed:#151514;--ledoff:#45443F;--line:#3A3935;--track:#33322F;--night:#6F6C66;--rain:#86A9C7;--sunk:#222220;--line2:#31302D;--muted:#6F6C66;--hl:rgba(255,255,255,.05);--sh:0,0,0}
button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0}
button:disabled{cursor:default;opacity:.5}
button:focus-visible,input:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
.ic{fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
h1,h2{margin:0;font-weight:500}
h1{font-size:32px;letter-spacing:-.01em}
.caption{font-size:14px;color:var(--ink2)}
.caption.pre{white-space:pre-line}
.eyebrow{font-size:13px;color:var(--ink2);text-transform:uppercase;letter-spacing:.08em}
.big{font-size:28px;font-weight:500}
.huge{font-size:48px;font-weight:400;letter-spacing:-.02em;line-height:1}
.stack{display:flex;flex-direction:column;gap:6px}
.stack.tight{gap:2px}
.row{display:flex;gap:10px;flex-wrap:wrap}
.card{background:var(--surface);border-radius:28px;box-shadow:var(--card);padding:28px;display:flex;flex-direction:column;gap:16px;min-width:0}
.cardtop{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.led{width:8px;height:8px;border-radius:4px;background:var(--ledoff);flex-shrink:0}
.led.lit{background:var(--accent)}

/* Shell */
.shell{display:grid;grid-template-columns:80px minmax(0,1fr);grid-template-areas:". header" "rail main" ". rooms";column-gap:32px;row-gap:28px;padding:40px 40px 40px 32px;max-width:1600px;margin:0 auto}
.header{grid-area:header;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.hello{display:flex;align-items:center;gap:12px}
.tools{display:flex;align-items:center;gap:12px;margin-left:auto}
.presence{font-size:15px;color:var(--ink2);margin-left:8px}
.avatars{display:flex;gap:8px}
.avatar{width:48px;height:48px;border-radius:24px;background:var(--raised);box-shadow:var(--raise);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:500;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover}
.divider{width:1px;height:32px;background:var(--line);margin:0 4px}
.iconbtn{position:relative;width:48px;height:48px;border-radius:24px;background:var(--surface);box-shadow:var(--raise);display:flex;align-items:center;justify-content:center}
.iconbtn.flat{background:none;box-shadow:none}
.iconbtn .dot{position:absolute;top:9px;right:10px;width:9px;height:9px;border-radius:5px;background:var(--accent);box-shadow:0 0 0 2px var(--surface)}
.themeswitch{position:relative;width:96px;height:48px;border-radius:24px;padding:4px;display:flex;align-items:center;background:var(--well);box-shadow:var(--press)}
.themeswitch .slot{position:absolute;top:0;width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:var(--ink3)}
.themeswitch .slot:first-child{left:0}.themeswitch .slot:nth-child(2){right:0}
.themeswitch .knob{position:relative;width:40px;height:40px;border-radius:20px;background:var(--raised);box-shadow:var(--raise);display:flex;align-items:center;justify-content:center;transition:transform .25s ease}
.themeswitch.on .knob{transform:translateX(48px)}

.rail{grid-area:rail;align-self:start;position:sticky;top:24px;background:var(--surface);border-radius:28px;box-shadow:var(--card);padding:12px;display:flex;flex-direction:column;align-items:center;gap:12px;min-height:560px}
.navbtn{width:56px;height:56px;border-radius:18px;display:flex;align-items:center;justify-content:center;color:var(--navfg)}
.navbtn.active{background:var(--raised);box-shadow:var(--raise);color:var(--accent)}
.navbtn.last{margin-top:auto}
.navlabel{display:none}
.main{grid-area:main;min-width:0}

.rooms{grid-area:rooms;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px}
.room{border-radius:24px;padding:18px 20px;min-height:96px;display:flex;flex-direction:column;justify-content:space-between;gap:10px;text-align:left;background:var(--surface);box-shadow:var(--raise)}
.room.pressed{background:var(--pressed);box-shadow:var(--press)}
.roomtop{display:flex;justify-content:space-between;align-items:center;gap:8px}
.roomname{font-size:17px;font-weight:500}
.roomstatus{font-size:14px;color:var(--ink2)}

/* Home */
.home{display:grid;grid-template-columns:minmax(300px,.9fr) minmax(0,1.4fr) minmax(240px,1fr);grid-template-areas:"clock mode off" "clock wx wx";gap:24px}
.clockcard{grid-area:clock;align-items:center;justify-content:space-between}
.clockcard .cardtop{align-self:stretch}
.modecard{grid-area:mode;justify-content:space-between}
.offcard{grid-area:off;align-items:center;justify-content:center;text-align:center}
.wxcard{grid-area:wx}
.clock{width:100%;max-width:400px;height:auto}
.c-bezel{fill:var(--well)}.c-face{fill:var(--raised)}.c-ring{fill:none;stroke:var(--line2);stroke-width:2px}
.c-arc{fill:none;stroke:var(--accent);stroke-width:7px}
.c-ticks line{stroke:var(--ink)}
.mnum{font-size:10px;font-weight:500;fill:var(--ink2);text-anchor:middle;dominant-baseline:central}
.hnum{font-size:32px;fill:var(--ink);text-anchor:middle;dominant-baseline:central}
.cdate{font-size:13px;font-weight:500;fill:var(--ink2);text-anchor:middle;dominant-baseline:central;letter-spacing:.04em}
.h-hour{stroke:var(--ink);stroke-width:11px;stroke-linecap:round}
.h-min{stroke:var(--ink);stroke-width:9px;stroke-linecap:round}
.h-tip{stroke:var(--accent);stroke-width:2.5px;stroke-linecap:round}
.h-sec{stroke:var(--accent);stroke-width:3px;stroke-linecap:round}
.c-hub{fill:var(--raised);stroke:var(--line2);stroke-width:2px}
.c-hubring{fill:none;stroke:var(--ink);stroke-width:3px}
.c-core{fill:var(--accent)}

.modes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.key{position:relative;height:108px;border-radius:18px;padding:16px 8px 14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:var(--raised);box-shadow:var(--raise)}
.key.pressed{background:var(--pressed);box-shadow:var(--press)}
.key .led{position:absolute;top:12px;right:12px}
.keylabel{font-size:15px;font-weight:500}

.offcard{flex-direction:column}
.offtext{display:flex;flex-direction:column;gap:4px}
.offtext strong{font-size:17px;font-weight:500}
.power{width:116px;height:116px;border-radius:58px;background:var(--well);box-shadow:var(--press);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.powerface{width:88px;height:88px;border-radius:44px;background:var(--raised);box-shadow:var(--raise);display:flex;align-items:center;justify-content:center;color:var(--accent)}
.power.idle .powerface{background:var(--sunk);box-shadow:var(--press);color:var(--muted)}
.btn{height:48px;padding:0 20px;border-radius:16px;background:var(--raised);box-shadow:var(--raise);font-size:15px;font-weight:500}
.btn.solid{background:var(--ink);color:var(--raised);box-shadow:none}
.btn.full{width:100%;height:52px;margin-top:8px}
.link{font-size:14px;font-weight:500;text-decoration:underline;text-underline-offset:3px;padding:8px 0;min-height:44px}

.legend{display:flex;gap:18px;font-size:14px;color:var(--ink2)}
.legend span{display:flex;align-items:center;gap:6px}
.legend i{width:10px;height:10px;border-radius:5px;display:inline-block}
.k-day{background:var(--ink)}.k-night{background:var(--night)}.k-rain{background:var(--rain)}
.days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
.day{display:flex;flex-direction:column;align-items:center;gap:12px;padding:14px 6px;border-radius:20px}
.day.today{background:var(--raised);box-shadow:inset 0 1px 0 var(--hl),0 1px 2px rgba(var(--sh),.06)}
.dlabel{font-size:15px;font-weight:500}
.dicon{display:flex}.dicon.sun{color:var(--accent)}
.dtemps{display:flex;flex-direction:column;align-items:center;gap:2px}
.hi{font-size:22px;font-weight:500}.lo{font-size:15px;color:var(--ink3)}
.drain{display:flex;align-items:flex-end;gap:8px;height:36px}
.bar{width:6px;height:36px;border-radius:3px;background:var(--track);display:flex;align-items:flex-end;overflow:hidden}
.bar span{display:block;width:100%;height:var(--p);background:var(--rain);border-radius:3px}
.rtext{font-size:13px;color:var(--ink3);min-width:34px}
.rtext.wet{color:var(--rain)}

/* Lists and controls */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px;align-items:start}
.viewtitle{font-size:24px;margin:0 0 20px}
.viewhead{display:flex;align-items:center;gap:20px;margin:0 0 20px}
.viewhead .viewtitle{margin:0}
.list{gap:12px}
.lightrow{background:var(--raised);border-radius:20px;display:flex;flex-direction:column;box-shadow:inset 0 1px 0 var(--hl),0 1px 2px rgba(var(--sh),.06);transition:box-shadow .2s}
.lightrow.row{flex-direction:row;align-items:center;padding-right:18px}
.lr-hit{display:flex;align-items:center;gap:12px;flex:1;min-width:0;min-height:64px;padding:14px 12px 14px 18px;text-align:left;border-radius:20px}
.lr-hit .stack{flex:1;min-width:0}
.lr-hit .ic{color:var(--ink3)}
.lr-hit:active{box-shadow:var(--press)}
.lr-hit:focus-visible{outline-offset:-2px}
.lightrow.ctl{padding:16px 18px;gap:12px}
.lightrow.ctl.main{padding:20px}
.lightrow input[type=range]{margin:0}
.lightrow input[type=range].off{opacity:.45}
.sheet-head .grow{flex:1}
.sheet-head .back{margin:-4px 8px 0 -8px}
.lr-top{display:flex;justify-content:space-between;align-items:center;gap:12px}
.lr-top.line{padding:10px 0;border-bottom:1px solid var(--line2)}
.lname{font-size:16px;font-weight:500}
.switch{width:56px;height:32px;border-radius:16px;padding:4px;display:flex;background:var(--line);flex-shrink:0;transition:background-color .2s}
.switch span{width:24px;height:24px;border-radius:12px;background:var(--raised);box-shadow:0 1px 3px rgba(var(--sh),.25);transition:transform .2s}
.switch.on{background:var(--accent)}
.switch.on span{transform:translateX(24px)}
input[type=range]{width:100%;margin:0;accent-color:var(--accent);height:28px}
.climate.offline{gap:6px}
.climate{position:relative;background:var(--raised);border-radius:24px;padding:20px;display:flex;flex-direction:column;gap:16px;box-shadow:inset 0 1px 0 var(--hl),0 1px 2px rgba(var(--sh),.06)}
.cl-top{display:flex;justify-content:space-between;align-items:flex-end}
.cl-row{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line2);padding-top:16px}
.stepper{display:flex;align-items:center;gap:14px}
.heatdot{position:absolute;top:16px;right:16px;width:10px;height:10px;border-radius:5px;background:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}
.seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:16px;background:var(--well);box-shadow:inset 0 2px 5px rgba(var(--sh),.10)}
.segbtn{height:44px;border-radius:12px;font-size:15px;font-weight:500;color:var(--ink2);transition:background-color .2s,box-shadow .2s,color .2s}
.segbtn.sel{background:var(--raised);color:var(--ink);box-shadow:inset 0 1px 0 var(--hl),0 1px 2px rgba(var(--sh),.12),0 4px 10px rgba(var(--sh),.10)}
.sq{width:48px;height:48px;border-radius:16px;background:var(--sunk);display:flex;align-items:center;justify-content:center}
.target{font-size:22px;font-weight:500;min-width:64px;text-align:center}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{min-height:44px;padding:0 16px;border-radius:14px;background:var(--surface);box-shadow:var(--raise);font-size:14px;font-weight:500}
.climate .chip{background:var(--sunk);box-shadow:none}
.chip.pressed,.climate .chip.pressed{background:var(--pressed);box-shadow:var(--press)}
.swatch{width:44px;height:44px;border-radius:22px;box-shadow:var(--raise)}
.swatch.sel{outline:2px solid var(--ink);outline-offset:3px}
.cams{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;margin-top:24px}
.camcard{border-radius:28px;overflow:hidden;background:var(--surface);box-shadow:var(--card);display:flex;flex-direction:column}
.camview{position:relative;aspect-ratio:16/9;background:#111110;overflow:hidden}
.still{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.still.contain{object-fit:contain}
.camph{display:flex;align-items:center;justify-content:center;background:var(--well);color:var(--ink3)}
.camslot{position:absolute;inset:0;z-index:1;background:#000;display:flex;align-items:center;justify-content:center}
.layer{position:absolute;top:0;left:0;width:0;height:0}
.liveframe{position:absolute;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center;pointer-events:none}
.liveframe ha-camera-stream{display:block;width:100%}
.livebadge,.statpill{position:absolute;top:14px;z-index:2;display:flex;align-items:center;gap:8px;height:28px;padding:0 11px;border-radius:14px;background:rgba(20,20,19,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fff;font-size:12px;font-weight:500;letter-spacing:.02em}
.livebadge{left:14px}
.livedot{width:8px;height:8px;border-radius:4px;background:#F0452B;box-shadow:0 0 0 3px rgba(240,69,43,.3)}
.statpill{right:14px;gap:12px;--boltgap:#2B2B29}
.pillpart{display:flex;align-items:center;gap:6px}
.pillpart.low{color:#FF7A66}
.glyph{display:block;flex-shrink:0}
.cambtn{position:absolute;bottom:14px;z-index:2;width:44px;height:44px;border-radius:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 2px rgba(0,0,0,.2),0 6px 16px rgba(0,0,0,.18)}
.cambtn.play{left:14px;background:rgba(251,250,247,.94);color:#1C1C1A}
.cambtn.full{right:14px;background:rgba(20,20,19,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fff}
.cambtn:focus-visible{outline:2px solid #fff;outline-offset:2px}
.spin{position:absolute;left:50%;top:50%;z-index:2;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:18px;border:3px solid rgba(255,255,255,.25);border-top-color:#fff;animation:rot .9s linear infinite}
@keyframes rot{to{transform:rotate(360deg)}}
.camlabel{padding:16px 20px;display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-weight:500}

/* Camera full screen */
.camfull{--surface:#1D1D1B;--raised:#272725;--ink:#ECEAE5;--ink2:#A6A39C;--ink3:#9D9A93;--well:#101010;--pressed:#151514;--line:#3A3935;--line2:#31302D;--hl:rgba(255,255,255,.05);--sh:0,0,0;
  position:fixed;inset:0;z-index:20;display:grid;grid-template-columns:minmax(0,1fr) 400px;background:#0B0B0A;color:var(--ink)}
.cf-stage{position:relative;min-height:0;background:#000;--video-max-height:100vh;--video-max-height:100dvh}
.cf-panel{background:var(--surface);padding:32px;display:flex;flex-direction:column;gap:28px;overflow-y:auto}
.cf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.cf-head h2{font-size:30px}
.cf-controls{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.cfbtn{display:flex;flex-direction:column;align-items:center;gap:10px;font-size:13px;font-weight:500;color:var(--ink2)}
.cfface{width:64px;height:64px;border-radius:32px;display:flex;align-items:center;justify-content:center;background:var(--raised);box-shadow:var(--raise);color:var(--ink);transition:background-color .2s,color .2s}
.cfbtn.on .cfface{background:var(--accent);color:#fff;box-shadow:var(--press)}
.cfbtn.on{color:var(--ink)}
.cfbtn.talk .cfface{animation:talk 1.6s ease-out infinite}
@keyframes talk{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 55%,transparent)}100%{box-shadow:0 0 0 16px transparent}}
.cf-err{color:#FF7A66}
.cf-rows{display:flex;flex-direction:column;border-top:1px solid var(--line2)}
.cf-row{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--line2)}
.cf-val{display:flex;align-items:center;gap:10px;font-weight:500;text-align:right}
@media (prefers-reduced-motion: reduce){.spin{animation-duration:2.4s}.cfbtn.talk .cfface{animation:none;box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 40%,transparent)}}

/* Sheet */
.scrim{position:fixed;inset:0;background:rgba(var(--sh),.28);z-index:10}
.sheet{position:fixed;top:24px;right:24px;bottom:24px;width:min(456px,calc(100% - 48px));background:var(--surface);border-radius:32px;box-shadow:0 2px 6px rgba(var(--sh),.1),0 24px 64px rgba(var(--sh),.2);display:flex;flex-direction:column;z-index:11}
.grabber{display:none}
.sheet-head{display:flex;justify-content:space-between;align-items:flex-start;padding:32px 32px 16px}
.sheet-head h2{font-size:30px}
.sheet-body{overflow-y:auto;padding:0 32px 32px;display:flex;flex-direction:column;gap:12px}
.sheet-body .climate{margin-bottom:12px}

/* Compact layout for phones and narrow windows */
@container rams (max-width: 1100px){
  .home{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"clock mode" "clock off" "wx wx"}
}
@container rams (max-width: 900px){
  .camfull{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);padding-top:env(safe-area-inset-top)}
  .cf-stage{aspect-ratio:16/9;--video-max-height:none}
  .cf-panel{padding:20px 20px calc(20px + env(safe-area-inset-bottom));gap:20px}
  .cf-head h2{font-size:24px}
}
@container rams (max-width: 760px){
  .shell{grid-template-columns:minmax(0,1fr);grid-template-areas:"header" "rooms" "main";padding:20px 16px 108px;row-gap:16px}
  h1{font-size:26px}
  .header{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"hello bell" "tools tools";align-items:start;row-gap:16px;column-gap:12px}
  .hello{grid-area:hello;min-width:0}
  .bell{grid-area:bell;width:44px;height:44px}
  .tools{grid-area:tools;width:100%;margin-left:0;justify-content:flex-start;gap:8px}
  .presence{order:2;margin:0 auto 0 4px;font-size:14px}
  .avatars{order:1}.avatar{width:40px;height:40px;font-size:14px}
  .themeswitch{order:3;width:84px;height:44px}.themeswitch .slot{width:42px;height:44px}.themeswitch .knob{width:36px;height:36px}.themeswitch.on .knob{transform:translateX(40px)}
  .divider{display:none}
  .rail{position:fixed;left:0;right:0;bottom:0;top:auto;min-height:0;flex-direction:row;border-radius:0;padding:6px 8px 22px;gap:0;z-index:5;box-shadow:inset 0 1px 0 var(--line2),0 -8px 24px rgba(var(--sh),.05)}
  .navbtn{flex:1;width:auto;height:56px;flex-direction:column;gap:4px;background:none !important;box-shadow:none !important;color:var(--ink3)}
  .navbtn.last{margin-top:0}
  .navicon{width:44px;height:30px;border-radius:15px;display:flex;align-items:center;justify-content:center}
  .navbtn.active{color:var(--ink)}
  .navbtn.active .navicon{background:var(--raised);box-shadow:var(--raise);color:var(--accent)}
  .navlabel{display:block;font-size:11px;font-weight:500}
  .rooms{display:flex;overflow-x:auto;margin:0 -16px;padding:2px 16px 10px;gap:10px;scrollbar-width:none;scroll-snap-type:x proximity;scroll-padding-inline:16px}
  .rooms::-webkit-scrollbar{display:none}
  .room{flex:0 0 168px;min-height:0;padding:14px 16px;border-radius:20px;scroll-snap-align:start;scroll-margin-inline-start:16px}
  .tzname{display:none}
  .roomname{font-size:15px}.roomstatus{font-size:12px;white-space:nowrap}
  .home{grid-template-columns:minmax(0,1fr);grid-template-areas:"clock" "mode" "off" "wx";gap:16px}
  .card{padding:20px;border-radius:24px}
  .clock{max-width:300px}
  .big{font-size:24px}
  .key{height:88px;padding:14px 4px 12px;gap:8px}.key .ic{width:26px;height:26px}.keylabel{font-size:13px}.key .led{top:10px;right:10px}
  .modes{gap:8px}
  .offcard{flex-direction:row;flex-wrap:wrap;text-align:left;justify-content:flex-start}
  .offcard .offtext{flex:1}
  .offcard.confirm .offtext,.offcard.confirm .row{flex-basis:100%}
  .power{width:84px;height:84px}.powerface{width:62px;height:62px}
  .legend{display:none}
  .days{grid-template-columns:minmax(0,1fr);gap:4px}
  .day{display:grid;grid-template-columns:56px 32px minmax(0,1fr) 100px;align-items:center;gap:10px;padding:8px 10px;border-radius:14px}
  .dtemps{flex-direction:row;align-items:baseline;gap:8px}.hi{font-size:17px}.lo{font-size:14px}
  .drain{height:auto;align-items:center;justify-content:flex-end}
  .bar{width:44px;height:6px;align-items:stretch}
  .bar span{height:100%;width:var(--p)}
  .rtext{text-align:right}
  .grid,.cams{grid-template-columns:minmax(0,1fr);gap:16px}
  .sheet{top:56px;left:0;right:0;bottom:0;width:auto;border-radius:28px 28px 0 0}
  .grabber{display:block;align-self:center;width:40px;height:5px;border-radius:3px;background:var(--line);margin-top:10px}
  .sheet-head{padding:12px 20px 12px}.sheet-head h2{font-size:26px}
  .sheet-body{padding:0 20px 28px}
  .huge{font-size:44px}
}
`;

customElements.get("rams-home-panel") || customElements.define("rams-home-panel", RamsHomePanel);

/*
 * Rams Home panel for Home Assistant.
 * A self contained web component: no build step, no external libraries.
 */

const RAMS_VERSION = "0.2.0";
// Heating: a target below COMFORT_MIN counts as frost protection, so the radiator shows as Off.
const COMFORT_MIN = 12;
// Target steps for the plus and minus buttons, whatever step the thermostat reports.
const TEMP_STEP = 0.5;

const ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  lights: '<path d="M8 4h8l3.5 8h-15z"/><path d="M12 12v7"/><path d="M8 20h8"/>',
  heating: '<circle cx="12" cy="12" r="8.5"/><path d="M12 12l3.2-3.2"/><path d="M12 6v1.2"/><path d="M6 12h1.2"/><path d="M16.8 12H18"/>',
  security: '<path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.7-7 9-4.1-1.3-7-4.8-7-9V6z"/>',
  settings: '<path d="M5 7h9M18 7h1M5 17h3M12 17h7"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  power: '<path d="M12 4v8"/><path d="M7.05 7.05a7 7 0 1 0 9.9 0"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
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
};

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
  }

  /* ---------- Home Assistant hooks ---------- */

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) {
      this._subscribe();
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
    if (this._hass) { this._subscribe(); this._schedule(); }
  }

  disconnectedCallback() {
    clearInterval(this._clock);
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

  // A light group (a Hue room or zone, or a light group helper) controls lamps that are
  // already listed on their own, so it is left out to avoid counting them twice.
  _isGroup(id) {
    const st = this._hass.states[id];
    if (!st) return false;
    const a = st.attributes;
    return a.is_hue_group === true || (Array.isArray(a.entity_id) && a.entity_id.length > 0);
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
      case "nav": ui.view = id; ui.sheet = null; window.scrollTo(0, 0); break;
      case "menu": this.dispatchEvent(new Event("hass-toggle-menu", { bubbles: true, composed: true })); return;
      case "theme": ui.theme = this._isDark() ? "light" : "dark"; store.set("theme", ui.theme); break;
      case "themeset": ui.theme = val; store.set("theme", val); break;
      case "accent": ui.accent = val; store.set("accent", val); break;
      case "mode": this._call("select", "select_option", { entity_id: this._modeId(), option: val }); return;
      case "ask-off": ui.confirm = true; break;
      case "cancel-off": ui.confirm = false; break;
      case "all-off": ui.confirm = false; this._call("rams_home", "all_off", {}); break;
      case "room": ui.sheet = id; break;
      case "notifications": ui.sheet = "notifications"; break;
      case "close": ui.sheet = null; break;
      case "toggle": this._call("light", "toggle", { entity_id: id }); return;
      case "room-off": this._call("light", "turn_off", { entity_id: this._lightsIn(id) }); return;
      case "temp": {
        const st = this._hass.states[id];
        if (!st || !this._heating(st)) return;
        const next = this._clampTemp(st, this._roundStep(Number(st.attributes.temperature)) + TEMP_STEP * Number(val));
        this._call("climate", "set_temperature", { entity_id: id, temperature: next, hvac_mode: "heat" });
        return;
      }
      case "heat-on": {
        const st = this._hass.states[id];
        if (!st) return;
        this._call("climate", "set_temperature", { entity_id: id, temperature: this._startTarget(st), hvac_mode: "heat" });
        return;
      }
      case "heat-off": this._call("climate", "set_hvac_mode", { entity_id: id, hvac_mode: "off" }); return;
      case "alarm": this._call("alarm_control_panel", val, { entity_id: id }); return;
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

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div class="wrap ${dark ? "dark" : ""}" style="--accent:${esc(this._ui.accent)}">
        <div class="shell">
          ${this._header()}
          ${view === "home" ? this._roomStrip() : ""}
          ${this._rail()}
          <main class="main" aria-live="polite">${main}</main>
        </div>
        ${this._sheet()}
      </div>`;

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
          ${this._narrow ? `<button class="iconbtn flat menu" data-act="menu" aria-label="Open Home Assistant menu">${icon("menu", 22)}</button>` : ""}
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
        <div class="offtext"><strong>Turn off all lights and media?</strong><span class="caption">Heating and security stay as they are.</span></div>
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
    const unavailable = st.state === "unavailable";
    const dim = this._dimmable(st);
    return `
      <div class="lightrow">
        <div class="lr-top">
          <div class="stack tight"><span class="lname">${esc(this._name(id))}</span><span class="caption">${unavailable ? "Unavailable" : on ? (dim ? this._pct(st) + "% brightness" : "On") : "Off"}</span></div>
          <button class="switch ${on ? "on" : ""}" data-act="toggle" data-id="${esc(id)}" aria-pressed="${on}" aria-label="${on ? "Turn off" : "Turn on"} ${esc(this._name(id))}" ${unavailable ? "disabled" : ""}><span></span></button>
        </div>
        ${on && dim ? `<input type="range" min="1" max="100" value="${this._pct(st)}" data-act="bri" data-id="${esc(id)}" aria-label="${esc(this._name(id))} brightness">` : ""}
      </div>`;
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
    const on = this._heating(st);
    const name = esc(this._name(id));
    return `
      <div class="climate">
        ${a.hvac_action === "heating" ? `<span class="heatdot" role="img" aria-label="Heating now" title="Heating now"></span>` : ""}
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
          <span class="lname">Target</span>
          <span class="stepper">
            <button class="sq" data-act="temp" data-id="${esc(id)}" data-val="-1" aria-label="Lower target to ${this._temp(this._clampTemp(st, this._roundStep(Number(a.temperature)) - TEMP_STEP))}">${icon("minus", 20)}</button>
            <span class="target" aria-live="polite">${this._temp(a.temperature)}</span>
            <button class="sq" data-act="temp" data-id="${esc(id)}" data-val="1" aria-label="Raise target to ${this._temp(this._clampTemp(st, this._roundStep(Number(a.temperature)) + TEMP_STEP))}">${icon("plus", 20)}</button>
          </span>
        </div>` : ""}
      </div>`;
  }

  /* Other views */

  _lightsView() {
    const rooms = this._rooms();
    const assigned = new Set();
    const cards = rooms.map((r) => {
      const ids = this._lightsIn(r.id);
      ids.forEach((i) => assigned.add(i));
      if (!ids.length) return "";
      return `<section class="card list"><div class="cardtop"><span class="eyebrow">${esc(r.name)}</span><button class="link" data-act="room-off" data-id="${esc(r.id)}">All off</button></div>${ids.map((i) => this._lightRow(i)).join("")}</section>`;
    }).join("");
    const other = this._ids("light").filter((i) => !assigned.has(i) && !this._areaOf(i) && !this._isGroup(i));
    const otherCard = other.length ? `<section class="card list"><div class="cardtop"><span class="eyebrow">Not assigned to a room</span></div>${other.map((i) => this._lightRow(i)).join("")}</section>` : "";
    return `<h2 class="viewtitle">Lights</h2><div class="grid">${cards}${otherCard}</div>`;
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
    const cams = this._ids("camera").map((id) => {
      const st = this._st(id);
      return `<button class="cam" data-act="more" data-id="${esc(id)}" aria-label="Open ${esc(this._name(id))}">
        ${st.attributes.entity_picture ? `<img src="${esc(st.attributes.entity_picture)}" alt="">` : `<span class="camph">${icon("camera", 32)}</span>`}
        <span class="camlabel">${esc(this._name(id))}<span class="caption">${esc(st.state)}</span></span>
      </button>`;
    }).join("");
    const contacts = this._ids("binary_sensor").filter((id) => ["door", "window", "opening", "garage_door"].includes(this._hass.states[id].attributes.device_class));
    const contactCard = contacts.length ? `<section class="card list"><div class="cardtop"><span class="eyebrow">Doors and windows</span></div>${contacts.map((id) => {
      const st = this._st(id);
      return `<div class="lr-top line"><span class="lname">${esc(this._name(id))}</span><span class="caption">${st.state === "on" ? "Open" : "Closed"}</span></div>`;
    }).join("")}</section>` : "";
    return `<h2 class="viewtitle">Security</h2><div class="grid">${alarmCard}${contactCard}</div>${cams ? `<div class="cams">${cams}</div>` : ""}`;
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
    } else {
      const area = (this._hass.areas || {})[id];
      if (!area) return "";
      eyebrow = "Room"; title = area.name;
      const cl = this._climateIn(id);
      const lights = this._lightsIn(id);
      const on = lights.filter((l) => this._st(l) && this._hass.states[l].state === "on").length;
      body = `
        ${cl ? this._climateBlock(cl) : ""}
        <div class="cardtop"><span class="eyebrow">Lights</span><span class="caption">${lights.length ? (on ? `${on} of ${lights.length} on` : "All off") : "No lights in this room"}</span></div>
        ${lights.map((l) => this._lightRow(l)).join("")}
        ${on ? `<button class="btn solid full" data-act="room-off" data-id="${esc(id)}">Turn off all lights in ${esc(area.name)}</button>` : ""}`;
    }
    return `
      <button class="scrim" data-act="close" aria-label="Close"></button>
      <div class="sheet" role="dialog" aria-label="${esc(title)}">
        <span class="grabber" aria-hidden="true"></span>
        <div class="sheet-head">
          <div class="stack tight"><span class="eyebrow">${eyebrow}</span><h2>${esc(title)}</h2></div>
          <button class="iconbtn" data-act="close" aria-label="Close">${icon("close", 20)}</button>
        </div>
        <div class="sheet-body">${body}</div>
      </div>`;
  }
}

const STYLES = `
:host{display:block;container-type:inline-size;container-name:rams;min-height:100vh}
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
.list{gap:12px}
.lightrow{background:var(--raised);border-radius:20px;padding:16px 18px;display:flex;flex-direction:column;gap:12px;box-shadow:inset 0 1px 0 var(--hl),0 1px 2px rgba(var(--sh),.06)}
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
.cam{border-radius:28px;overflow:hidden;background:var(--surface);box-shadow:var(--card);text-align:left;display:flex;flex-direction:column}
.cam img,.camph{width:100%;aspect-ratio:16/9;object-fit:cover;background:var(--well);display:flex;align-items:center;justify-content:center;color:var(--ink3)}
.camlabel{padding:16px 20px;display:flex;justify-content:space-between;font-weight:500}

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

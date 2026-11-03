// The firmware blocks as the dashboard draws blocks, plus an "Update firmware" button while an
// update is available. The button asks the dashboard to run the widget's action; while it runs
// (`busy`) it shows a spinner, after a successful start it says so until the device reports a
// new version. The dashboard shows the result dialog only when the action failed.

class DashShelly extends HTMLElement {
  get data() {
    return this._data ?? null;
  }
  set data(value) {
    this._data = value ?? null;
    // the update is done (or gone): the button may come back for a next one
    if (this._started != null && value && (!value.update?.available || value.update.version !== this._started)) this._started = null;
    this.render();
  }
  get error() {
    return this._error ?? null;
  }
  set error(value) {
    this._error = value ?? null;
    this.render();
  }
  get busy() {
    return this._busy === true;
  }
  set busy(value) {
    this._busy = value === true;
    this.render();
  }
  get actionResult() {
    return this._result ?? null;
  }
  set actionResult(value) {
    this._result = value ?? null;
    if (value?.status === 'ok') this._started = this._data?.update?.version ?? '';
    this.render();
  }
  connectedCallback() {
    // properties set before this class was defined are own properties that hide the setters
    for (const key of ['data', 'error', 'busy', 'actionResult']) {
      if (Object.hasOwn(this, key)) {
        const value = this[key];
        delete this[key];
        this[key] = value;
      }
    }
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' }).innerHTML = `<style>
        :host { display: block; }
        .blocks { display: flex; flex-wrap: wrap; }
        .block { flex: 1 1 0; min-width: 64px; margin: 4px; padding: 4px; border-radius: 4px;
          background: var(--dash-block, color-mix(in srgb, var(--dash-text) 10%, transparent));
          display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 44px; }
        .v { font-size: .875rem; line-height: 1.25rem; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; font-variant-numeric: tabular-nums; }
        .l { font-size: .75rem; line-height: 1rem; font-weight: 700; text-transform: uppercase; max-width: 100%;
          display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; hyphens: auto; overflow-wrap: break-word; }
        .warn .v { color: var(--dash-warn); }
        .sym { display: inline-block; margin-inline-end: 3px; font-size: .75em; vertical-align: .05em; }
        .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        .error { margin: 4px; font-size: .75rem; color: var(--dash-error); }
        .detail { margin-block-start: 2px; color: var(--dash-muted); overflow-wrap: anywhere; }
        button {
          box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          inline-size: calc(100% - 8px); min-block-size: 2.25rem; margin: 4px; padding-block: .5rem; padding-inline: 1rem;
          border: 1px solid color-mix(in srgb, var(--dash-text) 25%, transparent); border-radius: 6px;
          background: color-mix(in srgb, var(--dash-text) 8%, transparent); color: var(--dash-text);
          font: inherit; font-size: .9375rem; font-weight: 500; line-height: 1.25; text-align: center; cursor: pointer;
          transition: background-color .15s ease;
        }
        button:hover:not(:disabled) { background: color-mix(in srgb, var(--dash-text) 14%, transparent); }
        button:focus-visible { outline: 2px solid var(--dash-text); outline-offset: 2px; }
        button:disabled { cursor: progress; }
        button[hidden] { display: none; }
        button.started { cursor: default; color: var(--dash-ok); border-color: color-mix(in srgb, var(--dash-ok) 55%, transparent); }
        .spinner {
          inline-size: 1.125rem; block-size: 1.125rem; border-radius: 50%;
          border: 2px solid color-mix(in srgb, var(--dash-text) 25%, transparent); border-block-start-color: var(--dash-text);
          animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 50% { opacity: .35; } }
        @media (prefers-reduced-motion: reduce) {
          button { transition: none; }
          .spinner { animation: pulse 1.6s ease-in-out infinite; border-color: var(--dash-text); }
        }
        @media (prefers-contrast: more) { button { border-color: var(--dash-text); } }
      </style><div class="box"></div>`;
    }
    this.render();
  }
  block(b, t) {
    const el = document.createElement('div');
    el.className = `block${b.status ? ` ${b.status}` : ''}`;
    const value = b.value === null || b.value === undefined ? '–' : typeof b.value === 'string' ? t(b.value) : String(b.value);
    const label = t(b.label, b.vars);
    el.title = `${label}: ${value}`;
    const v = document.createElement('div');
    v.className = 'v';
    if (b.status === 'warn') {
      const sym = Object.assign(document.createElement('span'), { className: 'sym', textContent: '▲' });
      sym.setAttribute('aria-hidden', 'true');
      v.append(sym, Object.assign(document.createElement('span'), { className: 'sr-only', textContent: `${t('attention')}: ` }));
    }
    v.append(value);
    el.append(v, Object.assign(document.createElement('div'), { className: 'l', textContent: label }));
    return el;
  }
  render() {
    const root = this.shadowRoot;
    if (!root) return;
    const t = this.t ?? ((k) => k);
    const box = root.querySelector('.box');
    // the button stays in the DOM (hidden when there is no update), so focus stays on it while it runs
    let button = root.querySelector('button');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.addEventListener('click', () => {
        if (button.disabled) return;
        this.dispatchEvent(new CustomEvent('dash-widget-action', { bubbles: true, composed: true, detail: { title: (this.t ?? ((k) => k))('updateFirmware'), showResult: 'failure' } }));
      });
      root.append(button);
    }
    box.replaceChildren();
    const d = this._error ? null : this._data;
    if (this._error) {
      // a 401 gets advice (server.js says whether a password was set), the raw text as a detail
      const advice = /answered 401/.test(this._error) ? t(/no password set/.test(this._error) ? 'passwordNeeded' : 'wrongPassword') : null;
      const error = Object.assign(document.createElement('div'), { className: 'error', textContent: advice ?? this._error });
      if (advice) error.append(Object.assign(document.createElement('div'), { className: 'detail', textContent: this._error }));
      box.append(error);
    }
    if (Array.isArray(d?.blocks) && d.blocks.length) {
      const grid = document.createElement('div');
      grid.className = 'blocks';
      for (const b of d.blocks) grid.append(this.block(b, t));
      box.append(grid);
    }
    button.hidden = !d?.update?.available;
    const state = this.busy ? 'busy' : this._started != null ? 'started' : 'idle';
    button.disabled = state !== 'idle';
    button.classList.toggle('started', state === 'started');
    if (state === 'busy') {
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-label', `${t('updateFirmware')}: ${t('updating')}`);
      const spinner = Object.assign(document.createElement('span'), { className: 'spinner' });
      spinner.setAttribute('aria-hidden', 'true');
      button.replaceChildren(spinner);
    } else {
      button.removeAttribute('aria-busy');
      button.removeAttribute('aria-label');
      button.textContent = t(state === 'started' ? 'updateStarted' : 'updateFirmware');
    }
  }
}
customElements.define('dash-shelly', DashShelly);

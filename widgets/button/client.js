// A full-width button: a link styled as a button (href), or a button that asks the dashboard to
// run the widget's action. While it runs (`busy`) the label is a spinner; a successful run shows a
// check for a moment (`actionResult`), after which the button is ready again. The dashboard shows
// the result dialog only when the run failed (`showResult: 'failure'`).

const SUCCESS_MS = 1500;
const CHECK = 'M20 6 9 17l-5-5';

class HdButton extends HTMLElement {
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
    clearTimeout(this._successTimer);
    this._success = value?.status === 'ok';
    if (this._success) {
      this._successTimer = setTimeout(() => {
        this._success = false;
        this.render();
      }, SUCCESS_MS);
    }
    this.render();
  }
  connectedCallback() {
    // properties set before this class was defined are own properties that hide the setters
    for (const key of ['busy', 'actionResult']) {
      if (Object.hasOwn(this, key)) {
        const value = this[key];
        delete this[key];
        this[key === 'busy' ? '_busy' : '_result'] = key === 'busy' ? value === true : value;
      }
    }
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' }).innerHTML = `<style>
        /* 4px around it, as a block's margin: padding, so two buttons do not collapse it and stand
           8px apart, as blocks do */
        :host { display: block; padding: 4px; }
        a, button {
          box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          inline-size: 100%; min-block-size: 2.25rem; padding-block: .5rem; padding-inline: 1rem;
          border: 1px solid color-mix(in srgb, var(--hd-text) 25%, transparent); border-radius: 6px;
          background: color-mix(in srgb, var(--hd-text) 8%, transparent); color: var(--hd-text);
          font: inherit; font-size: .9375rem; font-weight: 500; line-height: 1.25; text-align: center;
          text-decoration: none; cursor: pointer; transition: background-color .15s ease;
        }
        a:hover, button:hover:not(:disabled) { background: color-mix(in srgb, var(--hd-text) 14%, transparent); }
        a:focus-visible, button:focus-visible { outline: 2px solid var(--hd-text); outline-offset: 2px; }
        button:disabled { cursor: progress; }
        button.done { cursor: default; color: var(--hd-ok); border-color: color-mix(in srgb, var(--hd-ok) 55%, transparent); }
        .spinner {
          inline-size: 1.125rem; block-size: 1.125rem; border-radius: 50%;
          border: 2px solid color-mix(in srgb, var(--hd-text) 25%, transparent); border-block-start-color: var(--hd-text);
          animation: spin .8s linear infinite;
        }
        .check { inline-size: 1.25rem; block-size: 1.25rem; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 50% { opacity: .35; } }
        @media (prefers-reduced-motion: reduce) {
          a, button { transition: none; }
          .spinner { animation: pulse 1.6s ease-in-out infinite; border-color: var(--hd-text); }
        }
        @media (prefers-contrast: more) { a, button { border-color: var(--hd-text); } }
      </style>`;
    }
    this.render();
  }
  disconnectedCallback() {
    clearTimeout(this._successTimer);
  }
  render() {
    const root = this.shadowRoot;
    if (!root) return;
    const o = this.options ?? {};
    const t = this.t ?? ((k) => ({ running: 'Running…', done: 'Done' })[k] ?? k);
    let href = null;
    if (o.href) {
      try {
        const url = new URL(o.href, document.baseURI);
        if (url.protocol === 'http:' || url.protocol === 'https:') href = url.href;
      } catch {
        // not a link: nothing to open
      }
    }
    const tag = href ? 'a' : 'button';
    let el = root.querySelector('a, button');
    if (el?.localName !== tag) {
      el?.remove();
      el = document.createElement(tag);
      if (tag === 'button') {
        el.type = 'button';
        el.addEventListener('click', () => {
          if (this.busy || this._success) return;
          // the label is the dialog's title; a successful run needs no dialog, the check says it
          this.dispatchEvent(new CustomEvent('hd-widget-action', { bubbles: true, composed: true, detail: { title: this.options?.text ?? '', showResult: 'failure' } }));
        });
      } else {
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
      }
      root.append(el);
    }
    if (href) {
      el.textContent = o.text ?? '';
      el.href = href;
      return;
    }
    const state = this.busy ? 'busy' : this._success ? 'done' : 'idle';
    el.disabled = state !== 'idle';
    el.classList.toggle('done', state === 'done');
    if (state === 'busy') el.setAttribute('aria-busy', 'true');
    else el.removeAttribute('aria-busy');
    if (state === 'idle') {
      el.removeAttribute('aria-label');
      el.textContent = o.text ?? '';
    } else if (state === 'busy') {
      el.setAttribute('aria-label', `${o.text ?? ''}: ${t('running')}`);
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      el.replaceChildren(spinner);
    } else {
      el.setAttribute('aria-label', `${o.text ?? ''}: ${t('done')}`);
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'check');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', CHECK);
      svg.append(path);
      el.replaceChildren(svg);
    }
  }
}
customElements.define('hd-button', HdButton);

// Client-only widget: a logo (homepage's logo widget). `icon` arrives as a URL from the
// dashboard; one ending in #dash-mask[=hex] is a single-colour icon, drawn as a mask.
const MARK = `<svg viewBox="0 0 48 48" aria-hidden="true" fill="currentColor">
  <rect x="6" y="6" width="16" height="16" rx="4"/><rect x="26" y="6" width="16" height="10" rx="4" opacity=".55"/><rect x="26" y="20" width="16" height="22" rx="4"/><rect x="6" y="26" width="16" height="16" rx="4" opacity=".55"/></svg>`;

class DashLogo extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host { display: block; }
      .logo { width: 48px; height: 48px; display: block; color: var(--dash-accent); }
      img.logo { object-fit: contain; }
      .mask { -webkit-mask: var(--mask) center / contain no-repeat; mask: var(--mask) center / contain no-repeat; background: var(--fill, var(--dash-accent)); }
    </style><div class="box"></div>`;
    this.render();
  }
  render() {
    const box = this.shadowRoot?.querySelector('.box');
    if (!box) return;
    const icon = (this.options ?? {}).icon;
    box.replaceChildren();
    if (!icon) {
      box.innerHTML = MARK;
      box.firstElementChild.classList.add('logo');
      return;
    }
    const mask = /#dash-mask(?:=([0-9a-f]+))?$/.exec(icon);
    if (mask) {
      const span = document.createElement('span');
      span.className = 'logo mask';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--mask', `url("${icon.slice(0, mask.index)}")`);
      if (mask[1]) span.style.setProperty('--fill', `#${mask[1]}`);
      box.append(span);
      return;
    }
    const img = document.createElement('img');
    img.className = 'logo';
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.src = icon.startsWith('/icons/') ? icon.slice(1) : icon; // relative, for settings.base
    box.append(img);
  }
}
customElements.define('dash-logo', DashLogo);

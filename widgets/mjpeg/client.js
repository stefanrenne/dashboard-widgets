// Client-only: an MJPEG stream (µStreamer, camera-streamer, OctoPrint's webcam) as an image,
// over a blurred copy of itself as homepage shows it. The browser loads the stream directly;
// a stream that fails shows a message instead.

class DashMjpeg extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host { display: block; }
      .box { position: relative; overflow: hidden; border-radius: 6px; background: color-mix(in srgb, var(--dash-text) 8%, transparent); }
      img { position: absolute; inset: 0; width: 100%; height: 100%; }
      .bg { object-fit: fill; filter: blur(12px); transform: scale(1.1); opacity: .6; }
      .failed { position: absolute; inset: 0; display: grid; place-items: center; font-size: .75rem; color: var(--dash-muted); }
    </style><div class="box"></div>`;
    this.render();
  }
  render() {
    const box = this.shadowRoot?.querySelector('.box');
    if (!box) return;
    box.replaceChildren();
    const o = this.options ?? {};
    box.style.height = typeof o.height === 'string' && /^\d+(\.\d+)?(rem|em|px|vh)$/.test(o.height.trim()) ? o.height.trim() : '10rem';
    let src;
    try {
      src = new URL(o.stream);
      if (src.protocol !== 'http:' && src.protocol !== 'https:') throw new Error('not http');
    } catch {
      return this.failed(box);
    }
    const bg = Object.assign(document.createElement('img'), { src: src.href, alt: '', className: 'bg' });
    const img = Object.assign(document.createElement('img'), { src: src.href, alt: this.t?.('stream') ?? 'stream' });
    img.style.objectFit = ['contain', 'cover', 'fill', 'none', 'scale-down'].includes(o.fit) ? o.fit : 'contain';
    img.addEventListener('error', () => this.failed(box));
    box.append(bg, img);
  }
  failed(box) {
    const p = document.createElement('div');
    p.className = 'failed';
    p.textContent = this.t?.('noStream') ?? 'noStream';
    box.replaceChildren(p);
  }
}
customElements.define('dash-mjpeg', DashMjpeg);

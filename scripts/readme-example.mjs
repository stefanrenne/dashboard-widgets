// A widget's README example as the options the dashboard would give it, pointed at the mock
// homelab: the first ```yaml block under "## Example" that has the widget, as a service widget
// (services.yaml), a service field (proxmoxNode + proxmoxVMID for proxmoxvm; proxmoxvm takes
// its connection from proxmox.yaml) or a header widget (widgets.yaml). `provider:` takes settings.yaml's providers as the dashboard
// does (a map fills the options it names, a text the first unset secret option), option defaults
// apply, every
// {{HD_VAR_*}} becomes test-key, and every url option (given or by default) the mock's /<id>.
// Used by tests/widgets.test.mjs, so every example on the docs site is known to run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// the dashboard's own keys on a widget entry, not options of the widget
const DASHBOARD_KEYS = ['type', 'provider', 'fields', 'refreshInterval', 'refresh', 'hide_errors', 'highlight'];

/** The YAML files in a code block that holds several (`# settings.yaml` ... `# services.yaml` ...). */
export function splitFiles(block) {
  const files = {};
  let name = 'services.yaml';
  for (const line of block.split('\n')) {
    const m = /^# ([\w.-]+\.ya?ml)\b/.exec(line);
    if (m) name = m[1].replace(/\.yml$/, '.yaml');
    files[name] = (files[name] ?? '') + line + '\n';
  }
  return files;
}

/** The first object below `node` (a services.yaml) for which `pick` gives options. */
function search(node, pick) {
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = search(n, pick);
      if (r) return r;
    }
  } else if (node && typeof node === 'object') {
    const r = pick(node);
    if (r) return r;
    for (const v of Object.values(node)) {
      const s = search(v, pick);
      if (s) return s;
    }
  }
  return null;
}

/**
 * The example's options for widget `id`, or null without an example that has it. Options are
 * returned without the dashboard's keys, ready for fetch.
 */
export function readmeExample(id, mockUrl) {
  const dir = path.join(ROOT, 'widgets', id);
  const manifest = YAML.parse(fs.readFileSync(path.join(dir, 'widget.yaml'), 'utf8'));
  const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
  const at = readme.search(/^## Example/m);
  if (at === -1) return null;
  const types = [id, ...(manifest.aliases ?? [])];
  const schema = manifest.options ?? {};
  for (const [, block] of readme.slice(at).matchAll(/```ya?ml\n([\s\S]*?)```/g)) {
    let files;
    try {
      files = Object.fromEntries(Object.entries(splitFiles(block.replace(/\{\{(HD|HOMEPAGE)_(VAR|FILE)_\w+\}\}/g, 'test-key')))
        .map(([f, text]) => [f, YAML.parse(text)]));
    } catch {
      continue;
    }
    const providers = files['settings.yaml']?.providers ?? {};
    let options = search(files['services.yaml'], (n) => (types.includes(n.type) ? n : null));
    if (!options && id === 'proxmoxvm') {
      options = search(files['services.yaml'], (n) => (n.proxmoxNode && n.proxmoxVMID
        ? { ...files['proxmox.yaml']?.[n.proxmoxNode], node: n.proxmoxNode, vmid: n.proxmoxVMID, ...(n.proxmoxType ? { type: n.proxmoxType } : {}) }
        : null));
    }
    if (!options && Array.isArray(files['widgets.yaml'])) {
      const entry = files['widgets.yaml'].find((e) => e && typeof e === 'object' && types.includes(Object.keys(e)[0]));
      if (entry) options = Object.values(entry)[0] ?? {};
    }
    if (!options) continue;
    const out = Object.fromEntries(Object.entries(options).filter(([k]) => !DASHBOARD_KEYS.includes(k)));
    // proxmoxvm takes its connection from proxmox.yaml by node, as the dashboard does
    if (id === 'proxmoxvm' && out.node) {
      for (const [k, v] of Object.entries(files['proxmox.yaml']?.[out.node] ?? files['proxmox.yaml']?.[''] ?? {})) out[k] ??= v;
    }
    const provider = options.provider !== undefined ? providers[options.provider] : undefined;
    if (typeof provider === 'string' || typeof provider === 'number') {
      const key = Object.keys(schema).find((k) => schema[k]?.secret && out[k] === undefined);
      if (key) out[key] = String(provider);
    } else if (provider && typeof provider === 'object') {
      for (const [k, v] of Object.entries(provider)) if (k in schema && out[k] === undefined) out[k] = v;
    }
    for (const [k, def] of Object.entries(schema)) {
      if (out[k] === undefined && def?.default !== undefined) out[k] = def.default;
      if (def?.type === 'url' && out[k] !== undefined) out[k] = `${mockUrl}/${id}`;
    }
    return out;
  }
  return null;
}

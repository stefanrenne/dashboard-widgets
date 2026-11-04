// State, CPU and memory of an app's pods, as homepage's app/namespace/podSelector: the pods by
// label selector, usage from metrics-server (metrics.k8s.io), CPU as a share of the pods'
// limits when they have them. RBAC: list on pods and pods.metrics.k8s.io.
// The connection helpers are kubernetes's own, copied: each widget folder stands alone.
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';

// Replaceable in tests: the service account folder and the API address (default from the env).
export const PATHS = { sa: '/var/run/secrets/kubernetes.io/serviceaccount', api: null };

function apiUrl() {
  if (PATHS.api) return PATHS.api;
  const host = process.env.KUBERNETES_SERVICE_HOST;
  if (!host) throw new Error('not running in a Kubernetes cluster (KUBERNETES_SERVICE_HOST is not set)');
  return `https://${host.includes(':') ? `[${host}]` : host}:${process.env.KUBERNETES_SERVICE_PORT ?? 443}`;
}

function get(path, signal) {
  const url = new URL(path, apiUrl());
  const token = fs.readFileSync(`${PATHS.sa}/token`, 'utf8').trim();
  const secure = url.protocol === 'https:';
  const ca = secure && fs.existsSync(`${PATHS.sa}/ca.crt`) ? fs.readFileSync(`${PATHS.sa}/ca.crt`) : undefined;
  return new Promise((resolve, reject) => {
    const req = (secure ? https : http).request(url, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, ca, signal }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`Kubernetes API ${path} answered ${res.statusCode}`));
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/** A CPU quantity ("4", "250m", "123456789n") in cores. */
function cores(q) {
  const m = /^([\d.]+)([numk]?)$/.exec(String(q ?? '').trim());
  if (!m) return 0;
  return Number(m[1]) * ({ n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, '': 1 }[m[2]]);
}

/** A memory quantity ("16Gi", "16384Ki", "1G", "1048576") in bytes. */
function bytes(q) {
  const m = /^([\d.]+)([KMGTPE]i?)?$/.exec(String(q ?? '').trim());
  if (!m) return 0;
  const exp = { K: 1, M: 2, G: 3, T: 4, P: 5, E: 6 }[m[2]?.[0]] ?? 0;
  return Number(m[1]) * (m[2]?.endsWith('i') ? 1024 : 1000) ** exp;
}

/** GET through ctx.fetch with a connection in the options (a kubeconfig, filled in by the dashboard). */
async function getWith(ctx, path) {
  const { token, username, password, tlsCa, tlsCert, tlsKey, insecure } = ctx.options;
  const authorization = token ? `Bearer ${token}` : username ? `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}` : null;
  // joined, not resolved: an API server can sit under a path (Rancher's /k8s/clusters/<id>)
  const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}${path}`, {
    headers: { accept: 'application/json', ...(authorization ? { authorization } : {}) },
    ...(tlsCa || tlsCert ? { tls: { ca: tlsCa, cert: tlsCert, key: tlsKey } } : {}),
    insecure,
  });
  if (!res.ok) throw new Error(`Kubernetes API ${path} answered ${res.status}`);
  return res.json();
}

/** A GET on the cluster: the connection in the options, else the pod's service account. */
export function k8sJson(ctx, path) {
  return ctx.options.url ? getWith(ctx, path) : get(path, ctx.signal);
}

export const APP_LABEL = 'app.kubernetes.io/name';
const READY = ['Running', 'Succeeded'];

/** Memory in decimal units: MB below 1 GB, GB with one decimal from there. */
function memoryBlock(b) {
  return b < 1e9
    ? { key: 'mem', label: 'memory', value: Math.round(b / 1e6), unit: 'MB' }
    : { key: 'mem', label: 'memory', value: Math.round(b / 1e8) / 10, unit: 'GB' };
}

export default {
  async fetch(ctx) {
    const { namespace, app, podSelector } = ctx.options;
    if (podSelector === undefined && !app) throw new Error('app or podSelector: required');
    // an empty podSelector selects every pod in the namespace (homepage's note)
    const selector = podSelector ?? `${APP_LABEL}=${app}`;
    const ns = encodeURIComponent(namespace);
    const list = await k8sJson(ctx, `/api/v1/namespaces/${ns}/pods?labelSelector=${encodeURIComponent(selector)}`);
    const pods = list.items ?? [];
    if (pods.length === 0) {
      return { status: 'down', statusText: 'not found', blocks: [{ key: 'status', label: 'status', value: 'not found', status: 'error' }] };
    }
    const ready = pods.filter((p) => READY.includes(p.status?.phase)).length;
    const state = ready === pods.length ? 'running' : ready > 0 ? 'partial' : 'not running';
    const status = state === 'running' ? 'up' : state === 'partial' ? 'warn' : 'down';
    const blocks = [
      { key: 'status', label: 'status', value: state, status: status === 'up' ? 'ok' : status },
      { key: 'pods', label: 'pods', value: `${ready}/${pods.length}`, ...(status === 'up' ? {} : { status: status === 'warn' ? 'warn' : 'error' }) },
    ];
    let memGB = null;
    if (ready > 0) {
      const names = new Set(pods.map((p) => p.metadata?.name));
      let cpuLimit = 0;
      for (const p of pods) for (const c of p.spec?.containers ?? []) cpuLimit += cores(c.resources?.limits?.cpu);
      const metrics = await k8sJson(ctx, `/apis/metrics.k8s.io/v1beta1/namespaces/${ns}/pods`).catch((err) => {
        ctx.log.warn(`kubernetes pod metrics: ${err.message} (is metrics-server installed?)`);
        return null;
      });
      if (metrics) {
        let cpu = 0;
        let mem = 0;
        for (const m of metrics.items ?? []) {
          if (!names.has(m.metadata?.name)) continue;
          for (const c of m.containers ?? []) {
            cpu += cores(c.usage?.cpu);
            mem += bytes(c.usage?.memory);
          }
        }
        blocks.push(cpuLimit > 0
          ? { key: 'cpu', label: 'cpu', value: Math.round((1000 * cpu) / cpuLimit) / 10, unit: '%' }
          : { key: 'cpu', label: 'cpu', value: Math.round(cpu * 1000) / 1000 }); // cores, as in homepage, without limits
        blocks.push(memoryBlock(mem));
        memGB = Math.round(mem / 1e8) / 10;
      }
    }
    return { status, statusText: state, attributes: { mem: memGB }, blocks };
  },
};

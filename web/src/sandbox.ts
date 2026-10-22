export interface SandboxResult {
  ok: boolean;
  output: string;
}

export const RUN_TIMEOUT_MS = 5000;
const MAX_OUTPUT = 20_000;

/** Files the sandbox can run: plain JavaScript. */
export const isRunnable = (path: string): boolean => /\.(m|c)?js$/i.test(path);

/**
 * The page loaded inside the sandbox. It captures console output and errors, runs the code as a module
 * (so `export`, `await` and `import()` of data URLs work), and reports back once timers had a moment to fire.
 */
const BOOT = `<!doctype html><meta charset="utf-8"><script>
const logs = [];
const show = (x) => { try { return typeof x === 'object' && x !== null ? JSON.stringify(x, null, 2) : String(x); } catch { return String(x); } };
for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  console[level] = (...args) => logs.push((level === 'error' || level === 'warn' ? '[' + level + '] ' : '') + args.map((a) => (typeof a === 'string' ? a : show(a))).join(' '));
}
let failed = false;
const fail = (e) => { failed = true; logs.push(e && e.stack ? String(e.stack).split('\\n').slice(0, 6).join('\\n') : String(e)); };
addEventListener('error', (e) => { fail(e.error || e.message); e.preventDefault(); });
addEventListener('unhandledrejection', (e) => { fail(e.reason); e.preventDefault(); });
addEventListener('message', async (e) => {
  if (e.source !== parent || !e.data || typeof e.data.code !== 'string') return;
  try {
    const url = URL.createObjectURL(new Blob([e.data.code], { type: 'text/javascript' }));
    await import(url);
  } catch (err) { fail(err); }
  setTimeout(() => parent.postMessage({ done: true, ok: !failed, output: logs.join('\\n') }, '*'), 300);
});
parent.postMessage({ ready: true }, '*');
<\/script>`;

/**
 * Runs JavaScript in an isolated iframe (`sandbox="allow-scripts"`: no cookies, no storage, no access to
 * the page, no same-origin requests). A run that does not finish in 5 seconds is killed.
 */
export function runInSandbox(code: string): Promise<SandboxResult> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    // Off screen but not `display:none` / `visibility:hidden`: some browsers never load such an iframe.
    frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    let settled = false;

    const finish = (result: SandboxResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      frame.remove();
      resolve({ ok: result.ok, output: result.output.slice(0, MAX_OUTPUT) });
    };

    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow || !e.data) return;
      if (e.data.ready) frame.contentWindow?.postMessage({ code }, '*');
      else if (e.data.done) finish({ ok: !!e.data.ok, output: String(e.data.output ?? '') });
    };

    const timer = window.setTimeout(
      () => finish({ ok: false, output: `Délai dépassé (${RUN_TIMEOUT_MS / 1000} s) : le code tourne sans fin ? Une boucle infinie a été arrêtée.` }),
      RUN_TIMEOUT_MS,
    );
    window.addEventListener('message', onMessage);
    frame.srcdoc = BOOT;
    document.body.appendChild(frame);
  });
}

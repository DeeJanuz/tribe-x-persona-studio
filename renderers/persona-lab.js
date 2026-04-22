// @ts-nocheck
(function () {
  'use strict';

  window.__renderers = window.__renderers || {};

  var GLOBAL_KEY = '__personaLabPluginState';
  var SESSION_LABEL = 'Persona Studio';
  var DEV_CONTROL_PLANE_URL = 'https://dev.app.tribexai.com';
  var LOCAL_CONTROL_PLANE_URL = 'http://127.0.0.1:3000';
  var TERMINAL_RUN_STATUSES = {
    SUCCEEDED: true,
    FAILED: true,
    CANCELLED: true,
  };
  var TERMINAL_BATCH_STATUSES = {
    SUCCEEDED: true,
    FAILED: true,
    PARTIAL_FAILED: true,
    CANCELLED: true,
  };
  var BATCH_STORAGE_KEY = '__personaLabBatchState';
  var modelSelectorSequence = 0;

  function getGlobalState() {
    if (!window[GLOBAL_KEY]) {
      window[GLOBAL_KEY] = {
        sessions: {},
        stylesInjected: false,
      };
    }
    return window[GLOBAL_KEY];
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function currentSessionId() {
    if (
      window.__companionUtils &&
      typeof window.__companionUtils.getActiveSession === 'function'
    ) {
      var active = window.__companionUtils.getActiveSession();
      return active && active.sessionId ? active.sessionId : 'persona-lab-default';
    }
    return 'persona-lab-default';
  }

  function getSessionState() {
    var globalState = getGlobalState();
    var sessionId = currentSessionId();
    if (!globalState.sessions[sessionId]) {
      globalState.sessions[sessionId] = {
        sessionId: sessionId,
        loading: false,
        bootstrapLoaded: false,
        bootstrapPromise: null,
        personas: [],
        registries: null,
        selectedPersonaKey: null,
        loadingPersona: false,
        personaPromise: null,
        current: null,
        form: null,
        dirty: false,
        status: '',
        error: '',
        saving: false,
        testing: false,
        lastRunId: null,
        runDetails: null,
        pollTimer: null,
        launchingBatch: false,
        batchWizardOpen: false,
        batchWizardStep: 1,
        batchDraft: null,
        batchError: '',
        lastBatchId: null,
        batchDetails: null,
        batchLaunches: [],
        batchLaunchSummary: null,
        batchPollTimer: null,
        batchAutoOpenTimer: null,
        submittingBatchPromptRunIds: {},
        runDetailOpen: false,
        runDetailLoading: false,
        runDetailError: '',
        runDetailRunId: null,
        runDetailPayload: null,
        contentScrollTop: 0,
        contentScrollLeft: 0,
        modalScrollTop: 0,
        drawerScrollTop: 0,
        chromeKey: '',
        ruleEditorIndex: -1,
        ruleEditorDraft: '',
      };
    }
    return globalState.sessions[sessionId];
  }

  function ensureStyles() {
    var globalState = getGlobalState();
    if (globalState.stylesInjected || document.getElementById('parallel-run-workshop-theme')) {
      return;
    }
    globalState.stylesInjected = true;

    var style = document.createElement('style');
    style.id = 'parallel-run-workshop-theme';
    style.textContent = [
      '.persona-lab-root{--glass-bg:rgba(255,255,255,0.06);--glass-bg-heavy:rgba(255,255,255,0.1);--glass-blur:12px;--glass-border:rgba(255,255,255,0.1);--glass-shadow:0 8px 32px rgba(0,0,0,0.4);--glass-shadow-elevated:0 12px 40px rgba(0,0,0,0.5);--glass-inset-highlight:inset 0 1px 0 rgba(255,255,255,0.06);--bg-app:#0f1117;--bg-surface:rgba(255,255,255,0.05);--bg-surface-hover:rgba(255,255,255,0.08);--bg-surface-subtle:rgba(255,255,255,0.03);--text-primary:rgba(255,255,255,0.95);--text-secondary:rgba(255,255,255,0.65);--text-tertiary:rgba(255,255,255,0.38);--accent-primary:#818cf8;--accent-primary-hover:#6366f1;--accent-primary-ghost:rgba(129,140,248,0.12);--border-default:rgba(255,255,255,0.08);--border-subtle:rgba(255,255,255,0.04);--border-strong:rgba(255,255,255,0.15);--color-success:#22c55e;--color-success-bg:rgba(34,197,94,0.15);--color-success-text:#86efac;--color-error:#ef4444;--color-error-bg:rgba(239,68,68,0.15);--color-error-text:#fca5a5;--color-warning:#eab308;--color-warning-bg:rgba(234,179,8,0.15);--color-warning-text:#fde047;--color-info:#3b82f6;--color-info-bg:rgba(59,130,246,0.15);--color-info-text:#93bbfd;--font-sans:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;--font-mono:"SF Mono","Fira Code","Cascadia Code",monospace;display:grid;grid-template-columns:304px minmax(0,1fr);height:100%;min-height:0;background:radial-gradient(circle at top left,rgba(129,140,248,0.18),transparent 28%),radial-gradient(circle at bottom right,rgba(45,212,191,0.14),transparent 24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent 28%),var(--bg-app);color:var(--text-primary);font-family:var(--font-sans)}',
      '@media (prefers-color-scheme: light){.persona-lab-root{--glass-bg:rgba(255,255,255,0.7);--glass-bg-heavy:rgba(255,255,255,0.85);--glass-border:rgba(0,0,0,0.08);--glass-shadow:0 8px 32px rgba(0,0,0,0.08);--glass-shadow-elevated:0 12px 40px rgba(0,0,0,0.12);--glass-inset-highlight:inset 0 1px 0 rgba(255,255,255,0.5);--bg-app:#f5f5f7;--bg-surface:rgba(255,255,255,0.8);--bg-surface-hover:rgba(255,255,255,0.95);--bg-surface-subtle:rgba(255,255,255,0.55);--text-primary:rgba(0,0,0,0.87);--text-secondary:rgba(0,0,0,0.62);--text-tertiary:rgba(0,0,0,0.42);--accent-primary:#6366f1;--accent-primary-hover:#4f46e5;--accent-primary-ghost:rgba(99,102,241,0.12);--border-default:rgba(0,0,0,0.08);--border-subtle:rgba(0,0,0,0.04);--border-strong:rgba(0,0,0,0.15);--color-success-text:#16a34a;--color-error-text:#dc2626;--color-warning-text:#ca8a04;--color-info-text:#2563eb}}',
      'html[data-theme="dark"] .persona-lab-root{--glass-bg:rgba(255,255,255,0.06);--glass-bg-heavy:rgba(255,255,255,0.1);--glass-border:rgba(255,255,255,0.1);--glass-shadow:0 8px 32px rgba(0,0,0,0.4);--glass-shadow-elevated:0 12px 40px rgba(0,0,0,0.5);--glass-inset-highlight:inset 0 1px 0 rgba(255,255,255,0.06);--bg-app:#0f1117;--bg-surface:rgba(255,255,255,0.05);--bg-surface-hover:rgba(255,255,255,0.08);--bg-surface-subtle:rgba(255,255,255,0.03);--text-primary:rgba(255,255,255,0.95);--text-secondary:rgba(255,255,255,0.65);--text-tertiary:rgba(255,255,255,0.38);--accent-primary:#818cf8;--accent-primary-hover:#6366f1;--accent-primary-ghost:rgba(129,140,248,0.12);--border-default:rgba(255,255,255,0.08);--border-subtle:rgba(255,255,255,0.04);--border-strong:rgba(255,255,255,0.15);--color-success-text:#86efac;--color-error-text:#fca5a5;--color-warning-text:#fde047;--color-info-text:#93bbfd}',
      'html[data-theme="light"] .persona-lab-root{--glass-bg:rgba(255,255,255,0.7);--glass-bg-heavy:rgba(255,255,255,0.85);--glass-border:rgba(0,0,0,0.08);--glass-shadow:0 8px 32px rgba(0,0,0,0.08);--glass-shadow-elevated:0 12px 40px rgba(0,0,0,0.12);--glass-inset-highlight:inset 0 1px 0 rgba(255,255,255,0.5);--bg-app:#f5f5f7;--bg-surface:rgba(255,255,255,0.8);--bg-surface-hover:rgba(255,255,255,0.95);--bg-surface-subtle:rgba(255,255,255,0.55);--text-primary:rgba(0,0,0,0.87);--text-secondary:rgba(0,0,0,0.62);--text-tertiary:rgba(0,0,0,0.42);--accent-primary:#6366f1;--accent-primary-hover:#4f46e5;--accent-primary-ghost:rgba(99,102,241,0.12);--border-default:rgba(0,0,0,0.08);--border-subtle:rgba(0,0,0,0.04);--border-strong:rgba(0,0,0,0.15);--color-success-text:#16a34a;--color-error-text:#dc2626;--color-warning-text:#ca8a04;--color-info-text:#2563eb}',
      '.persona-lab-root,.persona-lab-root *{box-sizing:border-box}',
      '.persona-lab-root button,.persona-lab-root input,.persona-lab-root textarea,.persona-lab-root select{font:inherit}',
      '.persona-lab-root code{font-family:var(--font-mono)}',
      '@keyframes persona-lab-stagger-fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
      '.persona-lab-nav,.persona-lab-panel,.persona-lab-run-card,.persona-lab-skill,.persona-lab-kv-item,.persona-lab-metric-card,.persona-lab-run-metric,.persona-lab-summary-banner,.persona-lab-review-item,.persona-lab-choice,.persona-lab-toolbar,.persona-lab-modal,.persona-lab-drawer{background:var(--glass-bg);backdrop-filter:blur(var(--glass-blur));-webkit-backdrop-filter:blur(var(--glass-blur));border:1px solid var(--glass-border);box-shadow:var(--glass-shadow),var(--glass-inset-highlight)}',
      '.persona-lab-nav{padding:18px;display:flex;flex-direction:column;gap:14px;min-height:0;background:linear-gradient(180deg,rgba(129,140,248,0.16),transparent 240px),var(--glass-bg-heavy)}',
      '.persona-lab-nav-header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
      '.persona-lab-nav-title{margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-tertiary);font-weight:700}',
      '.persona-lab-nav-header strong{display:block;margin-top:4px;font-size:18px;line-height:1.2}',
      '.persona-lab-nav-list{display:flex;flex-direction:column;gap:10px;overflow:auto;padding-right:4px;scrollbar-width:thin;scrollbar-color:rgba(127,127,127,.3) transparent}',
      '.persona-lab-nav-list::-webkit-scrollbar,.persona-lab-content::-webkit-scrollbar,.persona-lab-modal::-webkit-scrollbar,.persona-lab-drawer-body::-webkit-scrollbar{width:8px;height:8px}',
      '.persona-lab-nav-list::-webkit-scrollbar-thumb,.persona-lab-content::-webkit-scrollbar-thumb,.persona-lab-modal::-webkit-scrollbar-thumb,.persona-lab-drawer-body::-webkit-scrollbar-thumb{background:rgba(127,127,127,.28);border-radius:999px}',
      '.persona-lab-nav-item{appearance:none;width:100%;border:1px solid var(--glass-border);border-radius:14px;padding:12px 14px;background:var(--bg-surface-subtle);cursor:pointer;display:flex;flex-direction:column;gap:7px;color:var(--text-primary);text-align:left;transition:border-color .15s ease,transform .15s ease,background .15s ease;animation:persona-lab-stagger-fade-in .24s ease both}',
      '.persona-lab-nav-item:hover{border-color:var(--accent-primary);background:var(--bg-surface)}',
      '.persona-lab-nav-item.active{border-color:var(--accent-primary);background:linear-gradient(135deg,var(--accent-primary-ghost),transparent 55%),var(--bg-surface);transform:translateY(-1px)}',
      '.persona-lab-nav-item code{font-size:11px;color:var(--text-tertiary)}',
      '.persona-lab-nav-item-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:600;font-size:14px;line-height:1.35}',
      '.persona-lab-nav-item-meta{display:flex;flex-wrap:wrap;gap:6px}',
      '.persona-lab-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;border:1px solid transparent;background:var(--bg-surface);color:var(--text-secondary);font-size:11px;font-weight:600;line-height:1.2}',
      '.persona-lab-badge.dirty{background:var(--color-warning-bg);color:var(--color-warning-text)}',
      '.persona-lab-badge.status-succeeded,.persona-lab-badge.status-completed{background:var(--color-success-bg);color:var(--color-success-text)}',
      '.persona-lab-badge.status-running,.persona-lab-badge.status-pending,.persona-lab-badge.status-created{background:var(--color-info-bg);color:var(--color-info-text)}',
      '.persona-lab-badge.status-failed,.persona-lab-badge.status-cancelled,.persona-lab-badge.status-partial_failed{background:var(--color-error-bg);color:var(--color-error-text)}',
      '.persona-lab-chip{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:var(--bg-surface-subtle);border:1px solid var(--glass-border);font-size:12px;font-weight:600;color:var(--text-primary)}',
      '.persona-lab-chip-label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-tertiary)}',
      '.persona-lab-shell{display:flex;flex-direction:column;min-width:0;min-height:0;padding:18px 18px 18px 0;gap:14px}',
      '.persona-lab-toolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px 22px;border-radius:22px;animation:persona-lab-stagger-fade-in .28s ease both}',
      '.persona-lab-toolbar h1{margin:4px 0 0;font-size:30px;line-height:1.05;letter-spacing:-.03em}',
      '.persona-lab-toolbar p{margin:8px 0 0;color:var(--text-secondary);max-width:760px;line-height:1.6}',
      '.persona-lab-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}',
      '.persona-lab-button{appearance:none;border:1px solid var(--glass-border);background:var(--bg-surface-subtle);color:var(--text-primary);border-radius:12px;padding:10px 14px;font-weight:600;cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease,color .15s ease}',
      '.persona-lab-button:hover:not(:disabled){border-color:var(--accent-primary);background:var(--bg-surface);transform:translateY(-1px)}',
      '.persona-lab-button.primary{background:linear-gradient(135deg,var(--accent-primary),var(--accent-primary-hover));border-color:transparent;color:#fff;box-shadow:0 10px 28px rgba(99,102,241,.28)}',
      '.persona-lab-button:focus-visible,.persona-lab-input:focus-visible,.persona-lab-textarea:focus-visible,.persona-lab-select:focus-visible,.persona-lab-model-trigger:focus-visible{outline:none;border-color:var(--accent-primary);box-shadow:0 0 0 3px var(--accent-primary-ghost)}',
      '.persona-lab-button:disabled{cursor:not-allowed;opacity:.72;transform:none;background:var(--bg-surface-subtle);color:var(--text-tertiary)}',
      '.persona-lab-button.primary:disabled{box-shadow:none}',
      '.persona-lab-status-stack{display:flex;flex-direction:column;gap:10px;max-width:920px}',
      '.persona-lab-status,.persona-lab-error{font-size:13px;line-height:1.5;min-height:0;padding:0}',
      '.persona-lab-status:not(:empty){padding:12px 14px;border-radius:14px;background:var(--color-info-bg);border:1px solid rgba(59,130,246,.18);color:var(--color-info-text)}',
      '.persona-lab-error:not(:empty){padding:12px 14px;border-radius:14px;background:var(--color-error-bg);border:1px solid rgba(239,68,68,.2);color:var(--color-error-text)}',
      '.persona-lab-content{overflow:auto;padding:2px 0 16px 0;display:flex;flex-direction:column;gap:18px;min-height:0}',
      '.persona-lab-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}',
      '.persona-lab-panel{border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:14px;animation:persona-lab-stagger-fade-in .3s ease both}',
      '.persona-lab-panel.compact{gap:10px}',
      '.persona-lab-panel h2,.persona-lab-panel h3{margin:0;font-size:18px;line-height:1.25;letter-spacing:-.01em}',
      '.persona-lab-panel p{margin:0;color:var(--text-secondary);line-height:1.6}',
      '.persona-lab-field{display:flex;flex-direction:column;gap:8px}',
      '.persona-lab-field label{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-tertiary)}',
      '.persona-lab-field-label-row,.persona-lab-heading-row{display:flex;align-items:center;gap:8px;min-width:0}',
      '.persona-lab-heading-row h2,.persona-lab-heading-row h3{min-width:0}',
      '.persona-lab-tooltip{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:19px;height:19px;border-radius:999px;border:1px solid var(--glass-border);background:var(--bg-surface-subtle);color:var(--text-secondary);font-size:12px;font-weight:800;line-height:1;cursor:help}',
      '.persona-lab-tooltip:hover,.persona-lab-tooltip:focus-visible{border-color:var(--accent-primary);color:var(--text-primary);outline:none}',
      '.persona-lab-tooltip-popover{position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%) translateY(4px);z-index:5;width:min(320px,calc(100vw - 40px));padding:10px 12px;border-radius:12px;border:1px solid var(--glass-border);background:var(--glass-bg-heavy);box-shadow:var(--glass-shadow-elevated);color:var(--text-secondary);font-size:12px;font-weight:500;line-height:1.45;text-transform:none;letter-spacing:0;text-align:left;white-space:normal;opacity:0;pointer-events:none;transition:opacity .12s ease,transform .12s ease}',
      '.persona-lab-tooltip:hover .persona-lab-tooltip-popover,.persona-lab-tooltip:focus-visible .persona-lab-tooltip-popover{opacity:1;transform:translateX(-50%) translateY(0)}',
      '.persona-lab-input,.persona-lab-textarea,.persona-lab-select{width:100%;border:1px solid var(--glass-border);border-radius:14px;padding:12px 14px;background:var(--bg-surface-subtle);color:var(--text-primary)}',
      '.persona-lab-model-select{position:relative;width:100%}',
      '.persona-lab-model-trigger{appearance:none;width:100%;min-height:46px;border:1px solid var(--glass-border);border-radius:14px;padding:9px 12px;background:var(--bg-surface-subtle);color:var(--text-primary);display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;text-align:left;cursor:pointer;transition:border-color .15s ease,background .15s ease,box-shadow .15s ease}',
      '.persona-lab-model-trigger:hover{border-color:var(--accent-primary);background:var(--bg-surface)}',
      '.persona-lab-model-trigger:disabled{cursor:not-allowed;opacity:.72;color:var(--text-tertiary)}',
      '.persona-lab-model-trigger-copy{min-width:0;display:flex;flex-direction:column;gap:3px}',
      '.persona-lab-model-trigger-label{font-size:13px;font-weight:700;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary)}',
      '.persona-lab-model-trigger-provider{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;line-height:1.2;color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.persona-lab-model-trigger-icon{font-size:14px;color:var(--text-tertiary);transition:transform .15s ease}',
      '.persona-lab-model-select.open .persona-lab-model-trigger-icon{transform:rotate(180deg)}',
      '.persona-lab-model-menu{position:absolute;left:0;right:0;top:calc(100% + 8px);z-index:20;display:none;max-height:min(420px,48vh);overflow:auto;padding:8px;border:1px solid var(--glass-border);border-radius:16px;background:var(--glass-bg-heavy);box-shadow:var(--glass-shadow-elevated),var(--glass-inset-highlight);backdrop-filter:blur(var(--glass-blur));-webkit-backdrop-filter:blur(var(--glass-blur));scrollbar-width:thin;scrollbar-color:rgba(127,127,127,.3) transparent}',
      '.persona-lab-model-select.open .persona-lab-model-menu{display:flex;flex-direction:column;gap:6px}',
      '.persona-lab-model-menu::-webkit-scrollbar{width:8px}',
      '.persona-lab-model-menu::-webkit-scrollbar-thumb{background:rgba(127,127,127,.28);border-radius:999px}',
      '.persona-lab-model-empty,.persona-lab-model-option,.persona-lab-model-provider-toggle{appearance:none;width:100%;border:1px solid transparent;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer}',
      '.persona-lab-model-empty,.persona-lab-model-option{border-radius:12px;padding:9px 10px;display:flex;flex-direction:column;gap:3px}',
      '.persona-lab-model-empty:hover,.persona-lab-model-option:hover,.persona-lab-model-option.active{border-color:var(--accent-primary);background:var(--bg-surface)}',
      '.persona-lab-model-empty.active,.persona-lab-model-option.active{background:linear-gradient(135deg,var(--accent-primary-ghost),transparent 72%),var(--bg-surface)}',
      '.persona-lab-model-provider{border-radius:14px;background:var(--bg-surface-subtle);overflow:hidden}',
      '.persona-lab-model-provider-toggle{padding:10px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;border-radius:14px;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--text-secondary)}',
      '.persona-lab-model-provider-toggle:hover{background:var(--bg-surface)}',
      '.persona-lab-model-provider-caret{font-size:12px;color:var(--text-tertiary);transition:transform .15s ease}',
      '.persona-lab-model-provider.expanded .persona-lab-model-provider-caret{transform:rotate(90deg)}',
      '.persona-lab-model-provider-name{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.persona-lab-model-provider-count{font-size:11px;color:var(--text-tertiary);font-weight:800}',
      '.persona-lab-model-provider-options{display:none;padding:0 6px 7px}',
      '.persona-lab-model-provider.expanded .persona-lab-model-provider-options{display:flex;flex-direction:column;gap:4px}',
      '.persona-lab-model-option-label{font-size:13px;font-weight:700;line-height:1.3;color:var(--text-primary);overflow-wrap:anywhere}',
      '.persona-lab-model-option-id{font-size:11px;line-height:1.35;color:var(--text-tertiary);font-family:var(--font-mono);overflow-wrap:anywhere}',
      '.persona-lab-model-empty .persona-lab-model-option-id{font-family:var(--font-sans)}',
      '.persona-lab-input::placeholder,.persona-lab-textarea::placeholder{color:var(--text-tertiary)}',
      '.persona-lab-textarea{min-height:110px;resize:vertical;line-height:1.55}',
      '.persona-lab-textarea.json{min-height:140px;font-family:var(--font-mono);font-size:12px}',
      '.persona-lab-rule-editor{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr);gap:12px;align-items:start}',
      '.persona-lab-rule-list{display:flex;flex-direction:column;gap:8px}',
      '.persona-lab-rule-item{appearance:none;width:100%;border:1px solid var(--glass-border);border-radius:14px;background:var(--bg-surface-subtle);color:var(--text-primary);padding:10px 12px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:5px;transition:border-color .15s ease,background .15s ease}',
      '.persona-lab-rule-item:hover,.persona-lab-rule-item.active{border-color:var(--accent-primary);background:var(--bg-surface)}',
      '.persona-lab-rule-item span{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--text-tertiary);font-weight:800}',
      '.persona-lab-rule-item strong{font-size:13px;line-height:1.35;font-weight:600;color:var(--text-primary)}',
      '.persona-lab-rule-controls{display:flex;flex-direction:column;gap:10px;min-width:0}',
      '.persona-lab-choice-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}',
      '.persona-lab-choice{display:flex;align-items:flex-start;gap:10px;border-radius:16px;padding:12px;background:var(--bg-surface-subtle)}',
      '.persona-lab-choice input{margin-top:2px}',
      '.persona-lab-choice strong,.persona-lab-choice code{display:block}',
      '.persona-lab-choice strong{margin-bottom:4px}',
      '.persona-lab-choice code{font-size:11px;color:var(--text-tertiary)}',
      '.persona-lab-inline{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.persona-lab-section-list{display:flex;flex-direction:column;gap:12px}',
      '.persona-lab-skill{border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:12px;background:var(--bg-surface-subtle)}',
      '.persona-lab-skill-header{display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.persona-lab-json{margin:0;white-space:pre-wrap;word-break:break-word;background:rgba(15,23,42,.88);color:#e5eefc;border-radius:16px;padding:14px;font-size:12px;line-height:1.55;overflow:auto;border:1px solid rgba(148,163,184,.2)}',
      'html[data-theme="light"] .persona-lab-json,.persona-lab-root[data-theme="light"] .persona-lab-json{background:rgba(15,23,42,.96);color:#e5eefc}',
      '.persona-lab-list{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;color:var(--text-secondary)}',
      '.persona-lab-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}',
      '.persona-lab-kv-item{border-radius:16px;padding:12px;background:var(--bg-surface-subtle)}',
      '.persona-lab-kv-item span{display:block;font-size:11px;color:var(--text-tertiary);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em;font-weight:700}',
      '.persona-lab-empty{padding:24px;border:1px dashed var(--glass-border);border-radius:18px;background:var(--bg-surface-subtle);color:var(--text-secondary);line-height:1.6}',
      '.persona-lab-run-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}',
      '.persona-lab-run-card{border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:14px;background:linear-gradient(180deg,rgba(129,140,248,.08),transparent 45%),var(--glass-bg);animation:persona-lab-stagger-fade-in .3s ease both}',
      '.persona-lab-run-card-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}',
      '.persona-lab-run-card-header strong{display:block;font-size:19px;line-height:1.15}',
      '.persona-lab-run-eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-tertiary);font-weight:700}',
      '.persona-lab-run-subtitle{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
      '.persona-lab-run-note{font-size:12px;color:var(--text-secondary);line-height:1.6}',
      '.persona-lab-run-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.persona-lab-run-metric,.persona-lab-metric-card{border-radius:16px;padding:12px;background:var(--bg-surface-subtle)}',
      '.persona-lab-run-metric span,.persona-lab-metric-card span{display:block;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:6px;font-weight:700}',
      '.persona-lab-run-metric strong,.persona-lab-metric-card strong{display:block;font-size:18px;line-height:1.15;color:var(--text-primary)}',
      '.persona-lab-run-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.persona-lab-run-actions-copy{display:flex;flex-direction:column;gap:4px;min-width:180px}',
      '.persona-lab-run-actions-buttons{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}',
      '.persona-lab-helper{font-size:12px;color:var(--text-secondary);line-height:1.5}',
      '.persona-lab-overlay,.persona-lab-drawer-overlay{position:fixed;inset:0;background:rgba(6,10,24,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;z-index:9999}',
      '.persona-lab-overlay{align-items:center;justify-content:center;padding:20px}',
      '.persona-lab-modal{width:min(980px,100%);max-height:min(88vh,900px);overflow:auto;border-radius:24px;display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(129,140,248,.1),transparent 22%),var(--glass-bg-heavy)}',
      '.persona-lab-modal-header,.persona-lab-modal-footer{padding:22px;border-bottom:1px solid var(--glass-border);display:flex;align-items:flex-start;justify-content:space-between;gap:16px}',
      '.persona-lab-modal-header h2{margin:4px 0 0;font-size:24px;line-height:1.1;letter-spacing:-.03em}',
      '.persona-lab-modal-header p{margin:8px 0 0;color:var(--text-secondary);max-width:720px;line-height:1.6}',
      '.persona-lab-modal-body{padding:22px;display:flex;flex-direction:column;gap:18px}',
      '.persona-lab-modal-footer{border-top:1px solid var(--glass-border);border-bottom:none;align-items:center;flex-wrap:wrap}',
      '.persona-lab-stepper{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.persona-lab-step{display:flex;align-items:center;justify-content:center;padding:12px 14px;border-radius:16px;background:var(--bg-surface-subtle);border:1px solid var(--glass-border);font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-tertiary)}',
      '.persona-lab-step.active{border-color:rgba(129,140,248,.38);background:linear-gradient(135deg,var(--accent-primary-ghost),transparent 70%),var(--bg-surface);color:var(--text-primary)}',
      '.persona-lab-review-list,.persona-lab-comparison-list,.persona-lab-turn-list{display:flex;flex-direction:column;gap:10px}',
      '.persona-lab-review-item,.persona-lab-comparison-item,.persona-lab-turn-card{border-radius:16px;padding:12px;background:var(--bg-surface-subtle)}',
      '.persona-lab-comparison-item{display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.persona-lab-comparison-item strong,.persona-lab-turn-card h4{display:block;margin:0 0 8px}',
      '.persona-lab-summary-banner{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:14px 16px;border-radius:18px;background:var(--bg-surface)}',
      '.persona-lab-summary-banner.success{border-color:rgba(34,197,94,.24);background:linear-gradient(135deg,rgba(34,197,94,.14),transparent 65%),var(--bg-surface)}',
      '.persona-lab-summary-banner.warning{border-color:rgba(234,179,8,.24);background:linear-gradient(135deg,rgba(234,179,8,.14),transparent 65%),var(--bg-surface)}',
      '.persona-lab-metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}',
      '.persona-lab-drawer-overlay{justify-content:flex-end;z-index:10000}',
      '.persona-lab-drawer{width:min(760px,100%);height:100%;border-left:1px solid var(--glass-border);display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(129,140,248,.1),transparent 18%),var(--glass-bg-heavy)}',
      '.persona-lab-drawer-header{padding:20px 22px 16px;border-bottom:1px solid var(--glass-border);display:flex;align-items:flex-start;justify-content:space-between;gap:16px}',
      '.persona-lab-drawer-header h2{margin:4px 0 0;font-size:22px;line-height:1.1;letter-spacing:-.02em}',
      '.persona-lab-drawer-header p{margin:8px 0 0;color:var(--text-secondary);line-height:1.6}',
      '.persona-lab-drawer-body{padding:18px 22px 24px;overflow:auto;display:flex;flex-direction:column;gap:16px}',
      '@media (max-width: 1100px){.persona-lab-root{grid-template-columns:1fr}.persona-lab-nav{margin:18px 18px 0;border-radius:22px}.persona-lab-shell{padding-left:18px}.persona-lab-grid,.persona-lab-stepper,.persona-lab-rule-editor{grid-template-columns:1fr}}',
      '@media (max-width: 820px){.persona-lab-overlay{padding:12px}.persona-lab-modal{max-height:92vh}.persona-lab-modal-header,.persona-lab-modal-body,.persona-lab-modal-footer,.persona-lab-drawer-header,.persona-lab-drawer-body{padding-left:16px;padding-right:16px}.persona-lab-run-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.persona-lab-toolbar{flex-direction:column}.persona-lab-shell{padding-top:0}.persona-lab-model-menu{max-height:52vh}}',
    ].join('');
    document.head.appendChild(style);
  }

  function stringifyError(error) {
    if (!error) return 'Unknown error.';
    if (typeof error === 'string') return error;
    if (error.message) {
      if (/First-party AI base URL is not configured/i.test(error.message)) {
        return 'Persona Studio is configured for the ProPaasAI Cloudflare dev control plane. Set `first_party_ai.base_url` in `~/.mcpviews/config.json` to ' + DEV_CONTROL_PLANE_URL + ', then refresh this tab.';
      }
      if (
        /127\.0\.0\.1:3000\/admin\/persona-studio\/personas/i.test(error.message) ||
        /failed to connect to 127\.0\.0\.1 port 3000/i.test(error.message) ||
        /error sending request for url \(http:\/\/127\.0\.0\.1:3000/i.test(error.message)
      ) {
        return 'Persona Studio is still pointed at the old local ProPaasAI API host (' + LOCAL_CONTROL_PLANE_URL + '). Update MCPViews `first_party_ai.base_url` to ' + DEV_CONTROL_PLANE_URL + ', then refresh this tab.';
      }
      if (
        /dev\.app\.tribexai\.com\/admin\/persona-studio/i.test(error.message) &&
        /local-only|not deployed in the Cloudflare control plane/i.test(error.message)
      ) {
        return 'Persona Studio reached ' + DEV_CONTROL_PLANE_URL + ', but that deployment is still rejecting `/admin/persona-studio/*`. Deploy the Persona Studio API surface from `../ProPaasai` to the Cloudflare dev environment, then refresh this tab.';
      }
      if (
        /HTTP (401|403) from 'https:\/\/dev\.app\.tribexai\.com/i.test(error.message)
      ) {
        return 'Persona Studio reached ' + DEV_CONTROL_PLANE_URL + ', but your MCPViews first-party AI session is not authorized. Sign in to the TribeX AI dev environment in MCPViews, then refresh this tab.';
      }
      return error.message;
    }
    try {
      return JSON.stringify(error);
    } catch (_error) {
      return String(error);
    }
  }

  function request(method, path, body, query) {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      return Promise.reject(new Error('Tauri bridge is unavailable.'));
    }
    return window.__TAURI__.core.invoke('first_party_ai_request', {
      method: method,
      path: path,
      body: body || null,
      query: query || null,
    });
  }

  function replaceSessionChrome(state, title) {
    var nextTitle = title || SESSION_LABEL;
    var chromeKey = JSON.stringify({ title: nextTitle });
    if (state.chromeKey === chromeKey) {
      return;
    }
    state.chromeKey = chromeKey;
    if (
      window.__companionUtils &&
      typeof window.__companionUtils.replaceSession === 'function'
    ) {
      window.__companionUtils.replaceSession(
        state.sessionId,
        {
          toolName: SESSION_LABEL,
          contentType: 'persona_lab',
          data: { title: nextTitle },
          meta: {
            standalone: true,
            headerTitle: nextTitle,
          },
          toolArgs: {
            title: nextTitle,
          },
        },
        { autoFocus: false }
      );
    }
  }

  function buildEditableForm(detail) {
    return {
      definition: {
        displayName: detail.document.definition.displayName || '',
        description: detail.document.definition.description || '',
        owner: detail.document.definition.owner || 'platform',
      },
      draft: {
        summary: detail.document.draft.summary || '',
        description: detail.document.draft.description || '',
        agentClass: detail.document.draft.agentClass || 'PersonaHarnessAgent',
        rules: Array.isArray(detail.document.draft.rules)
          ? detail.document.draft.rules.slice()
          : [],
        modelPolicy: {
          defaultModel: detail.document.draft.modelPolicy.defaultModel || '',
          fastModel: detail.document.draft.modelPolicy.fastModel || '',
          reasoningModel: detail.document.draft.modelPolicy.reasoningModel || '',
          workflowModels: clone(detail.document.draft.modelPolicy.workflowModels || {}),
        },
        toolPolicy: {
          allowedBusinessTools: Array.isArray(detail.document.draft.toolPolicy.allowedBusinessTools)
            ? detail.document.draft.toolPolicy.allowedBusinessTools.slice()
            : [],
          allowedConnectorKeys: Array.isArray(detail.document.draft.toolPolicy.allowedConnectorKeys)
            ? detail.document.draft.toolPolicy.allowedConnectorKeys.slice()
            : [],
        },
        workflowRefs: Array.isArray(detail.document.draft.workflowRefs)
          ? detail.document.draft.workflowRefs.slice()
          : [],
        builtInSkills: Array.isArray(detail.document.draft.builtInSkills)
          ? detail.document.draft.builtInSkills.slice()
          : [],
        orchestration: normalizeOrchestration(detail.document.draft.orchestration),
        sandboxPolicy: clone(detail.document.draft.sandboxPolicy || { mode: 'disabled' }),
      },
      prompt: detail.document.prompt || '',
      customSkills: Array.isArray(detail.document.customSkills)
        ? clone(detail.document.customSkills)
        : [],
    };
  }

  function computeFingerprint(form) {
    return JSON.stringify(form || {});
  }

  function updateDirtyState(state) {
    state.dirty = computeFingerprint(state.form) !== state.lastSavedFingerprint;
  }

  function setStatus(state, message) {
    state.status = message || '';
    if (message) {
      state.error = '';
    }
  }

  function setError(state, message) {
    state.error = message || '';
    if (message) {
      state.status = '';
    }
  }

  function renderJson(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (_error) {
      return String(value);
    }
  }

  function formatNumber(value) {
    var numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return '0';
    return numeric.toLocaleString();
  }

  function formatDuration(value) {
    var ms = Number(value || 0);
    if (!Number.isFinite(ms) || ms <= 0) return '0 ms';
    if (ms < 1000) return Math.round(ms) + ' ms';
    if (ms < 60 * 1000) return (ms / 1000).toFixed(ms >= 10000 ? 0 : 1) + ' s';
    return (ms / 60000).toFixed(ms >= 10 * 60000 ? 0 : 1) + ' min';
  }

  function formatStatusLabel(value) {
    return String(value || 'draft')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function (char) { return char.toUpperCase(); });
  }

  function statusBadgeClass(value) {
    return 'persona-lab-badge status-' + String(value || 'draft').toLowerCase();
  }

  function formatThreadLabel(threadId) {
    var value = String(threadId || '');
    if (!value) return '—';
    if (value.length <= 18) return value;
    return value.slice(0, 8) + '…' + value.slice(-6);
  }

  function batchPromptForRun(run) {
    var prompt = run && run.messagePromptOverride ? String(run.messagePromptOverride).trim() : '';
    return prompt || '';
  }

  function metricsSummaryOf(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.metricsSummary && typeof value.metricsSummary === 'object') {
      return value.metricsSummary;
    }
    return null;
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function ensureObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function clampInteger(value, min, max, fallback) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(numeric)));
  }

  function defaultOrchestration() {
    return {
      capability: 'DELEGATE',
      dispatchMode: 'REVIEW',
      maxParallelSubagents: 3,
      maxDepth: 1,
    };
  }

  function normalizeOrchestration(value) {
    var source = ensureObject(value);
    var fallback = defaultOrchestration();
    return {
      capability: source.capability || fallback.capability,
      dispatchMode: source.dispatchMode || fallback.dispatchMode,
      maxParallelSubagents: clampInteger(
        source.maxParallelSubagents,
        1,
        10,
        fallback.maxParallelSubagents
      ),
      maxDepth: clampInteger(source.maxDepth, 0, 3, fallback.maxDepth),
    };
  }

  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }

  function bindInput(input, handler) {
    input.addEventListener('input', handler);
    input.addEventListener('change', handler);
  }

  function toggleListValue(list, value) {
    return list.indexOf(value) >= 0
      ? list.filter(function (item) { return item !== value; })
      : list.concat([value]);
  }

  function normalizeChoiceOption(item) {
    if (typeof item === 'string') {
      return { key: item, label: item, description: '' };
    }
    if (!item || typeof item !== 'object') return null;
    var key = item.key || item.name;
    if (!key) return null;
    return {
      key: String(key),
      label: String(item.label || item.name || key),
      description: item.description ? String(item.description) : '',
      group: item.group ? String(item.group) : '',
      toolCount: Number.isFinite(Number(item.toolCount)) ? Number(item.toolCount) : null,
    };
  }

  function mergeChoiceOptions(items, selected) {
    var options = [];
    var seen = {};
    ensureArray(items).forEach(function (item) {
      var option = normalizeChoiceOption(item);
      if (!option || seen[option.key]) return;
      seen[option.key] = true;
      options.push(option);
    });
    ensureArray(selected).forEach(function (key) {
      if (!key || seen[key]) return;
      seen[key] = true;
      options.push({
        key: key,
        label: key,
        description: 'Currently selected but not returned by the ProPaasAI registry.',
        group: 'Unregistered',
        toolCount: null,
      });
    });
    return options;
  }

  function normalizeModelId(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function providerLabel(provider) {
    var normalized = normalizeModelId(provider).toLowerCase();
    var labels = {
      anthropic: 'Anthropic',
      cohere: 'Cohere',
      deepseek: 'DeepSeek',
      google: 'Google',
      groq: 'Groq',
      meta: 'Meta',
      'meta-llama': 'Meta Llama',
      microsoft: 'Microsoft',
      mistralai: 'Mistral AI',
      moonshotai: 'Moonshot AI',
      openai: 'OpenAI',
      openrouter: 'OpenRouter',
      perplexity: 'Perplexity',
      qwen: 'Qwen',
      'x-ai': 'xAI',
      xai: 'xAI',
      unknown: 'Unknown',
    };
    if (labels[normalized]) return labels[normalized];
    if (!normalized) return 'Unknown';
    return normalized
      .split(/[-_]/)
      .filter(Boolean)
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ') || 'Unknown';
  }

  function inferModelProvider(modelId) {
    var id = normalizeModelId(modelId).toLowerCase();
    var slashIndex = id.indexOf('/');
    if (slashIndex > 0) return id.slice(0, slashIndex);
    if (/^(gpt|o[0-9]|chatgpt)/.test(id)) return 'openai';
    if (/^(claude)/.test(id)) return 'anthropic';
    if (/^(gemini|palm)/.test(id)) return 'google';
    if (/^(grok)/.test(id)) return 'x-ai';
    return 'unknown';
  }

  function normalizeModelOption(item, fallbackProvider, fallbackProviderLabel) {
    if (typeof item === 'string') {
      var stringId = normalizeModelId(item);
      if (!stringId) return null;
      var inferredProvider = fallbackProvider || inferModelProvider(stringId);
      return {
        id: stringId,
        label: stringId,
        provider: inferredProvider,
        providerLabel: fallbackProviderLabel || providerLabel(inferredProvider),
      };
    }
    if (!item || typeof item !== 'object') return null;
    var id = normalizeModelId(item.id || item.key || item.model);
    if (!id) return null;
    var provider = normalizeModelId(item.provider) || fallbackProvider || inferModelProvider(id);
    return {
      id: id,
      label: String(item.name || item.label || id),
      provider: provider,
      providerLabel: String(item.providerLabel || fallbackProviderLabel || providerLabel(provider)),
    };
  }

  function collectModelOptions(registries, selectedValue) {
    var lookup = {};
    var order = [];

    function add(option) {
      if (!option || !option.id) return null;
      if (!lookup[option.id]) {
        order.push(option.id);
        lookup[option.id] = option;
        return option;
      }
      var existing = lookup[option.id];
      lookup[option.id] = Object.assign({}, existing, option);
      if (
        existing.label &&
        existing.label !== existing.id &&
        (!option.label || option.label === option.id)
      ) {
        lookup[option.id].label = existing.label;
      }
      return lookup[option.id];
    }

    ensureArray(registries && registries.modelOptions).forEach(function (item) {
      add(normalizeModelOption(item));
    });
    ensureArray(registries && registries.modelProviderGroups).forEach(function (group) {
      if (!group || typeof group !== 'object') return;
      var provider = normalizeModelId(group.provider) || '';
      var label = group.label ? String(group.label) : providerLabel(provider);
      ensureArray(group.models).forEach(function (item) {
        add(normalizeModelOption(item, provider, label));
      });
    });
    ensureArray(registries && registries.models).forEach(function (model) {
      var id = normalizeModelId(model);
      if (!id) return;
      if (!lookup[id]) {
        add(normalizeModelOption(id));
      }
    });

    var selectedId = normalizeModelId(selectedValue);
    if (selectedId && !lookup[selectedId]) {
      add({
        id: selectedId,
        label: selectedId,
        provider: inferModelProvider(selectedId),
        providerLabel: providerLabel(inferModelProvider(selectedId)),
      });
    }

    return {
      lookup: lookup,
      order: order,
    };
  }

  function buildModelGroups(registries, selectedValue) {
    var collected = collectModelOptions(registries || {}, selectedValue);
    var groupedIds = {};
    var groups = [];

    function addGroup(provider, label, models) {
      var entries = [];
      ensureArray(models).forEach(function (model) {
        var option = typeof model === 'string'
          ? collected.lookup[model] || normalizeModelOption(model, provider, label)
          : normalizeModelOption(model, provider, label);
        if (!option || groupedIds[option.id]) return;
        groupedIds[option.id] = true;
        collected.lookup[option.id] = Object.assign({}, collected.lookup[option.id] || {}, option);
        entries.push(collected.lookup[option.id]);
      });
      if (entries.length > 0) {
        groups.push({
          provider: provider || 'unknown',
          label: label || providerLabel(provider),
          models: entries,
        });
      }
    }

    ensureArray(registries && registries.modelProviderGroups).forEach(function (group) {
      if (!group || typeof group !== 'object') return;
      var provider = normalizeModelId(group.provider) || 'unknown';
      addGroup(provider, String(group.label || providerLabel(provider)), group.models);
    });

    collected.order.forEach(function (id) {
      if (groupedIds[id]) return;
      var option = collected.lookup[id];
      var provider = option && option.provider ? option.provider : inferModelProvider(id);
      var existing = groups.filter(function (group) {
        return group.provider === provider;
      })[0];
      if (existing) {
        existing.models.push(option);
      } else {
        groups.push({
          provider: provider,
          label: option && option.providerLabel ? option.providerLabel : providerLabel(provider),
          models: [option],
        });
      }
      groupedIds[id] = true;
    });

    return groups;
  }

  function parseWorkflowModels(raw) {
    var trimmed = String(raw || '').trim();
    if (!trimmed) {
      return {};
    }
    var parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Workflow model overrides must be a JSON object.');
    }
    return parsed;
  }

  function parseJsonObject(raw, emptyValue, label) {
    var trimmed = String(raw || '').trim();
    if (!trimmed) {
      return clone(emptyValue || {});
    }
    var parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error((label || 'JSON value') + ' must be a JSON object.');
    }
    return parsed;
  }

  function storage() {
    try {
      return window.localStorage || null;
    } catch (_error) {
      return null;
    }
  }

  function readBatchStorage() {
    var store = storage();
    if (!store) return {};
    try {
      return ensureObject(JSON.parse(store.getItem(BATCH_STORAGE_KEY) || '{}'));
    } catch (_error) {
      return {};
    }
  }

  function batchStorageEntry(state) {
    return [state.sessionId, state.selectedPersonaKey || 'none'].join('::');
  }

  function persistLastBatchId(state, batchId) {
    var store = storage();
    if (!store || !state.selectedPersonaKey) return;
    var payload = readBatchStorage();
    if (batchId) {
      payload[batchStorageEntry(state)] = batchId;
    } else {
      delete payload[batchStorageEntry(state)];
    }
    store.setItem(BATCH_STORAGE_KEY, JSON.stringify(payload));
  }

  function restoreLastBatchId(state) {
    if (!state.selectedPersonaKey) return null;
    var payload = readBatchStorage();
    return payload[batchStorageEntry(state)] || null;
  }

  function defaultBatchRun(state, index) {
    return {
      label: 'Run ' + (index + 1),
      systemPromptOverride: '',
      messagePromptOverride: '',
      runtimeOverrides: {},
      runtimeOverridesText: '{}',
    };
  }

  function defaultBatchModelPolicy(state) {
    var registries = activeRegistries(state);
    var models = ensureArray(registries.models);
    var draftPolicy = state.form && state.form.draft && state.form.draft.modelPolicy
      ? state.form.draft.modelPolicy
      : {};
    var defaultModel = draftPolicy.defaultModel || models[0] || '';
    return {
      defaultModel: defaultModel,
      fastModel: draftPolicy.fastModel || models[1] || defaultModel,
      reasoningModel: draftPolicy.reasoningModel || models[2] || defaultModel,
    };
  }

  function summarizeModelPolicy(policy) {
    policy = ensureObject(policy);
    if (!policy.defaultModel && !policy.fastModel && !policy.reasoningModel) {
      return '';
    }
    return [
      'Default: ' + (policy.defaultModel || 'missing'),
      'Thinking Fast: ' + (policy.fastModel || 'missing'),
      'Reasoning: ' + (policy.reasoningModel || 'missing'),
    ].join(' | ');
  }

  function createBatchDraft(state, count) {
    var runCount = Math.max(2, Math.min(8, Number(count) || 2));
    var runs = [];
    for (var index = 0; index < runCount; index += 1) {
      runs.push(defaultBatchRun(state, index));
    }
    return {
      runCount: runCount,
      modelPolicyOverride: defaultBatchModelPolicy(state),
      runs: runs,
    };
  }

  function resetBatchWizard(state, count) {
    state.batchWizardStep = 1;
    state.batchDraft = createBatchDraft(state, count || (state.batchDraft && state.batchDraft.runCount) || 2);
    state.batchError = '';
  }

  function openBatchWizard(state) {
    resetBatchWizard(state);
    state.batchWizardOpen = true;
    renderState(state);
  }

  function closeBatchWizard(state) {
    state.batchWizardOpen = false;
    state.batchError = '';
    renderState(state);
  }

  function synchronizeBatchDraftRuns(state) {
    var runCount = Math.max(2, Math.min(8, Number(state.batchDraft && state.batchDraft.runCount) || 2));
    var runs = ensureArray(state.batchDraft && state.batchDraft.runs).slice(0, runCount);
    while (runs.length < runCount) {
      runs.push(defaultBatchRun(state, runs.length));
    }
    state.batchDraft.runCount = runCount;
    state.batchDraft.modelPolicyOverride = Object.assign(
      defaultBatchModelPolicy(state),
      ensureObject(state.batchDraft.modelPolicyOverride)
    );
    state.batchDraft.runs = runs;
  }

  function batchLaunches(payload) {
    if (Array.isArray(payload && payload.launches)) return payload.launches;
    if (Array.isArray(payload && payload.batch && payload.batch.launches)) return payload.batch.launches;
    return [];
  }

  function batchRunList(payload) {
    if (Array.isArray(payload && payload.runs)) return payload.runs;
    if (Array.isArray(payload && payload.batch && payload.batch.runs)) return payload.batch.runs;
    return [];
  }

  function batchRecord(payload) {
    if (payload && payload.batch) return payload.batch;
    return payload || null;
  }

  function clearBatchAutoOpenTimer(state) {
    if (state.batchAutoOpenTimer) {
      window.clearTimeout(state.batchAutoOpenTimer);
      state.batchAutoOpenTimer = null;
    }
  }

  function captureScrollPositions(state) {
    if (!state.container) return;
    var content = state.container.querySelector('.persona-lab-content');
    if (content) {
      state.contentScrollTop = content.scrollTop || 0;
      state.contentScrollLeft = content.scrollLeft || 0;
    }
    var modal = state.container.querySelector('.persona-lab-modal');
    if (modal) {
      state.modalScrollTop = modal.scrollTop || 0;
    }
    var drawerBody = state.container.querySelector('.persona-lab-drawer-body');
    if (drawerBody) {
      state.drawerScrollTop = drawerBody.scrollTop || 0;
    }
  }

  function restoreScrollPositions(state) {
    if (!state.container || !window.requestAnimationFrame) return;
    window.requestAnimationFrame(function () {
      var content = state.container.querySelector('.persona-lab-content');
      if (content) {
        content.scrollTop = state.contentScrollTop || 0;
        content.scrollLeft = state.contentScrollLeft || 0;
      }
      var modal = state.container.querySelector('.persona-lab-modal');
      if (modal) {
        modal.scrollTop = state.modalScrollTop || 0;
      }
      var drawerBody = state.container.querySelector('.persona-lab-drawer-body');
      if (drawerBody) {
        drawerBody.scrollTop = state.drawerScrollTop || 0;
      }
    });
  }

  function replacePanelInPlace(state, selector, nextPanel) {
    if (!state.container) return false;
    var existing = state.container.querySelector(selector);
    if (!existing || !existing.parentNode || !nextPanel) {
      return false;
    }
    existing.parentNode.replaceChild(nextPanel, existing);
    return true;
  }

  function renderBatchPanel(state) {
    var panel = renderLatestBatchPanel(state);
    if (!replacePanelInPlace(state, '.persona-lab-batch-panel', panel)) {
      renderState(state);
    }
  }

  function summarizeBatchLaunchResults(batchId, launches, results) {
    var openedCount = 0;
    var failed = [];
    ensureArray(results).forEach(function (result) {
      if (result && result.ok) {
        openedCount += 1;
        return;
      }
      if (result && result.launch) {
        failed.push({
          threadId: result.launch.threadId,
          runId: result.launch.personaTestRunId || null,
          message: stringifyError(result.error),
        });
      }
    });
    return {
      batchId: batchId,
      totalRuns: ensureArray(launches).length,
      openedCount: openedCount,
      failedCount: failed.length,
      warnings: failed,
    };
  }

  function activeRegistries(state) {
    return state.registries || {
      builtInSkills: [],
      workflows: [],
      models: [],
      toolRegistry: {
        businessTools: [],
        businessToolOptions: [],
        connectors: [],
        connectorOptions: [],
        reservedCoreTools: [],
      },
      orchestration: null,
    };
  }

  function fetchBootstrap(state) {
    if (state.bootstrapPromise) {
      return state.bootstrapPromise;
    }
    state.loading = true;
    state.bootstrapPromise = request('GET', '/admin/persona-studio/personas')
      .then(function (payload) {
        state.personas = ensureArray(payload.personas);
        state.registries = payload.registries || null;
        state.bootstrapLoaded = true;
        if (!state.selectedPersonaKey && state.personas.length > 0) {
          state.selectedPersonaKey = state.personas[0].key;
        }
        if (state.selectedPersonaKey) {
          return loadPersona(state, state.selectedPersonaKey);
        }
        return null;
      })
      .catch(function (error) {
        setError(state, stringifyError(error));
      })
      .finally(function () {
        state.loading = false;
        state.bootstrapPromise = null;
        renderState(state);
      });
    return state.bootstrapPromise;
  }

  function loadPersona(state, personaKey) {
    if (!personaKey) {
      return Promise.resolve(null);
    }
    state.loadingPersona = true;
    state.selectedPersonaKey = personaKey;
    renderState(state);
    state.personaPromise = request('GET', '/admin/persona-studio/personas/' + encodeURIComponent(personaKey))
      .then(function (detail) {
        state.current = detail;
        state.form = buildEditableForm(detail);
        state.lastSavedFingerprint = computeFingerprint(state.form);
        state.dirty = false;
        state.ruleEditorIndex = ensureArray(state.form.draft.rules).length ? 0 : -1;
        state.ruleEditorDraft =
          state.ruleEditorIndex >= 0 ? state.form.draft.rules[state.ruleEditorIndex] : '';
        state.loadingPersona = false;
        state.batchWizardOpen = false;
        state.batchError = '';
        replaceSessionChrome(state, SESSION_LABEL + ' · ' + detail.document.definition.displayName);
        renderState(state);
        if (state.lastRunId) {
          fetchRun(state, state.lastRunId);
        }
        state.lastBatchId = restoreLastBatchId(state);
        if (state.lastBatchId) {
          fetchBatch(state, state.lastBatchId).catch(function () {});
        } else {
          stopBatchPolling(state);
          state.batchDetails = null;
          state.batchLaunches = [];
          state.batchLaunchSummary = null;
          state.submittingBatchPromptRunIds = {};
          renderState(state);
        }
        return detail;
      })
      .catch(function (error) {
        state.loadingPersona = false;
        setError(state, stringifyError(error));
        renderState(state);
        throw error;
      });
    return state.personaPromise;
  }

  function refreshBootstrapAndPersona(state, personaKey) {
    return request('GET', '/admin/persona-studio/personas')
      .then(function (payload) {
        state.personas = ensureArray(payload.personas);
        state.registries = payload.registries || state.registries;
        state.bootstrapLoaded = true;
        return loadPersona(state, personaKey);
      });
  }

  function savePersona(state) {
    if (!state.current || !state.selectedPersonaKey || !state.form) {
      return Promise.reject(new Error('No persona is selected.'));
    }
    var workflowModels;
    try {
      workflowModels = parseWorkflowModels(renderJson(state.form.draft.modelPolicy.workflowModels));
    } catch (error) {
      setError(state, stringifyError(error));
      renderState(state);
      return Promise.reject(error);
    }

    state.saving = true;
    setStatus(state, 'Saving persona draft...');
    renderState(state);

    var payload = clone(state.form);
    payload.draft.modelPolicy.workflowModels = workflowModels;
    payload.draft.orchestration = normalizeOrchestration(payload.draft.orchestration);

    return request(
      'PUT',
      '/admin/persona-studio/personas/' + encodeURIComponent(state.selectedPersonaKey),
      payload
    )
      .then(function (validation) {
        state.current = Object.assign({}, state.current || {}, { validation: validation });
        return loadPersona(state, state.selectedPersonaKey);
      })
      .then(function () {
        setStatus(state, 'Saved.');
      })
      .catch(function (error) {
        setError(state, stringifyError(error));
        throw error;
      })
      .finally(function () {
        state.saving = false;
        renderState(state);
      });
  }

  function buildLaunchThreadSeed(launch) {
    if (!launch || !launch.threadId) {
      return null;
    }
    return {
      id: launch.threadId,
      title: launch.title || 'Persona Studio run',
      organizationId: launch.organizationId || null,
      workspaceId: launch.workspaceId || null,
      projectId: launch.projectId || null,
      rowState: null,
      optimistic: false,
      hydrateState: 'READY',
      lastActivityAt: new Date().toISOString(),
    };
  }

  function waitForThread(threadId, attempts, seed) {
    attempts = attempts || 24;
    return new Promise(function (resolve, reject) {
      function tick(remaining) {
        var aiState = window.__tribexAiState;
        if (aiState && typeof aiState.getThread === 'function') {
          var thread = aiState.getThread(threadId);
          if (thread) {
            resolve(thread);
            return;
          }
        }
        if (remaining <= 0) {
          reject(new Error('Timed out waiting for the Persona Studio thread to appear in MCPViews.'));
          return;
        }
        var hydratePromise = Promise.resolve();
        if (aiState && typeof aiState.hydrateThread === 'function') {
          hydratePromise = aiState.hydrateThread(threadId, seed);
        } else if (aiState && typeof aiState.refreshNavigator === 'function') {
          hydratePromise = aiState.refreshNavigator(remaining === attempts);
        }
        Promise.resolve(hydratePromise)
          .catch(function () {})
          .finally(function () {
            window.setTimeout(function () {
              tick(remaining - 1);
            }, 350);
          });
      }
      tick(attempts);
    });
  }

  function primeThreadDraft(threadId, prompt) {
    if (
      !threadId ||
      !prompt ||
      !window.__tribexAiState ||
      typeof window.__tribexAiState.getThread !== 'function' ||
      typeof window.__tribexAiState.setThreadDraft !== 'function'
    ) {
      return;
    }
    if (!window.__tribexAiState.getThread(threadId)) {
      return;
    }
    window.__tribexAiState.setThreadDraft(threadId, prompt);
  }

  function waitForThreadContext(threadId, attempts) {
    attempts = attempts || 10;
    return new Promise(function (resolve) {
      function tick(remaining) {
        if (
          !window.__tribexAiState ||
          typeof window.__tribexAiState.getThreadContext !== 'function'
        ) {
          resolve(null);
          return;
        }
        var threadContext = window.__tribexAiState.getThreadContext(threadId);
        if (!threadContext || !threadContext.thread) {
          if (remaining <= 0) {
            resolve(null);
            return;
          }
          window.setTimeout(function () {
            tick(remaining - 1);
          }, 250);
          return;
        }
        if (!threadContext.loading || remaining <= 0) {
          resolve(threadContext);
          return;
        }
        window.setTimeout(function () {
          tick(remaining - 1);
        }, 250);
      }
      tick(attempts);
    });
  }

  function threadHasExistingPromptHistory(threadContext) {
    var thread = threadContext && threadContext.thread;
    var messages = ensureArray(thread && (thread.displayMessages || thread.messages));
    var hasUserMessage = messages.some(function (message) {
      return message && message.role === 'user' && String(message.content || '').trim();
    });
    if (hasUserMessage) {
      return true;
    }
    return ensureArray(thread && thread.runs).some(function (run) {
      return !!(run && run.user && String(run.user.content || '').trim());
    });
  }

  function openThreadInNativeAi(threadId, organizationId, prompt, seed) {
    if (!window.__tribexAiClient || !window.__tribexAiState) {
      return Promise.reject(new Error('The native AI UI is not available in this MCPViews session.'));
    }

    var aiState = window.__tribexAiState;
    var organizationPromise;
    if (
      organizationId &&
      typeof aiState.selectOrganization === 'function' &&
      typeof aiState.getSnapshot === 'function' &&
      (!aiState.getSnapshot().selectedOrganization || aiState.getSnapshot().selectedOrganization.id !== organizationId)
    ) {
      organizationPromise = aiState.selectOrganization(organizationId);
    } else if (typeof aiState.refreshNavigator === 'function') {
      organizationPromise = aiState.refreshNavigator(true);
    } else {
      organizationPromise = Promise.resolve();
    }

    return Promise.resolve(organizationPromise)
      .then(function () {
        return waitForThread(threadId, 12, seed);
      })
      .then(function () {
        aiState.openThread(threadId, { connectStream: false });
        primeThreadDraft(threadId, prompt);
        return waitForThreadContext(threadId, 12);
      });
  }

  function openTestThread(state, launch) {
    if (!window.__tribexAiClient || !window.__tribexAiState) {
      return Promise.reject(new Error('The native AI UI is not available in this MCPViews session.'));
    }

    if (typeof window.__tribexAiClient.configureThreadRuntime === 'function') {
      window.__tribexAiClient.configureThreadRuntime(launch.threadId, {
        runtimeSessionBody: launch.runtimeSessionBody || null,
        personaOverride: launch.personaOverride || null,
        personaTestRunId: launch.personaTestRunId || null,
        telemetryToken: launch.telemetryToken || null,
      });
    }
    var threadSeed = buildLaunchThreadSeed(launch);
    return openThreadInNativeAi(
      launch.threadId,
      launch.organizationId,
      batchPromptForRun(findBatchRunById(state, launch.personaTestRunId)),
      threadSeed
    ).then(function (sessionId) {
      return ensureBatchPromptSubmitted(state, launch).then(function () {
        return sessionId;
      });
    });
  }

  function requestRunDetails(runId) {
    if (!runId) {
      return Promise.resolve(null);
    }
    return request('GET', '/admin/persona-studio/test-runs/' + encodeURIComponent(runId));
  }

  function fetchRun(state, runId) {
    return requestRunDetails(runId)
      .then(function (payload) {
        state.lastRunId = runId;
        state.runDetails = payload;
        renderState(state);
        return payload;
      })
      .catch(function (error) {
        setError(state, stringifyError(error));
        renderState(state);
        throw error;
      });
  }

  function closeRunDetail(state) {
    state.runDetailOpen = false;
    state.runDetailLoading = false;
    state.runDetailError = '';
    state.runDetailRunId = null;
    state.runDetailPayload = null;
    renderState(state);
  }

  function openRunDetail(state, runId) {
    if (!runId) return Promise.resolve(null);
    state.runDetailOpen = true;
    state.runDetailLoading = true;
    state.runDetailError = '';
    state.runDetailRunId = runId;
    renderState(state);
    return requestRunDetails(runId)
      .then(function (payload) {
        state.runDetailPayload = payload;
        state.runDetailLoading = false;
        renderState(state);
        return payload;
      })
      .catch(function (error) {
        state.runDetailLoading = false;
        state.runDetailError = stringifyError(error);
        renderState(state);
        throw error;
      });
  }

  function fetchBatch(state, batchId) {
    if (!batchId) {
      return Promise.resolve(null);
    }
    return request('GET', '/admin/persona-studio/test-batches/' + encodeURIComponent(batchId))
      .then(function (payload) {
        state.lastBatchId = batchId;
        state.batchDetails = payload;
        persistLastBatchId(state, batchId);
        ensureArray(batchRunList(payload)).forEach(function (run) {
          primeThreadDraft(run.threadId, batchPromptForRun(run));
        });
        renderBatchPanel(state);
        return payload;
      })
      .catch(function (error) {
        setError(state, stringifyError(error));
        renderState(state);
        throw error;
      });
  }

  function findBatchLaunch(state, run) {
    return ensureArray(state.batchLaunches).find(function (launch) {
      return (
        (run.id && launch.personaTestRunId === run.id) ||
        (run.runId && launch.personaTestRunId === run.runId) ||
        (run.threadId && launch.threadId === run.threadId)
      );
    }) || null;
  }

  function findBatchRunById(state, runId) {
    return ensureArray(batchRunList(state.batchDetails)).find(function (run) {
      return run && (run.id === runId || run.runId === runId);
    }) || null;
  }

  function retryBatchAutoOpen(state, launches, attemptsLeft) {
    clearBatchAutoOpenTimer(state);
    if (!attemptsLeft || !ensureArray(launches).length) {
      return;
    }
    state.batchAutoOpenTimer = window.setTimeout(function () {
      Promise.all(ensureArray(launches).map(function (launch) {
        return openTestThread(state, launch)
          .then(function () { return null; })
          .catch(function () { return launch; });
      })).then(function (failedLaunches) {
        var remaining = failedLaunches.filter(Boolean);
        if (remaining.length) {
          retryBatchAutoOpen(state, remaining, attemptsLeft - 1);
        } else {
          clearBatchAutoOpenTimer(state);
        }
      });
    }, 2000);
  }

  function ensureBatchPromptSubmitted(state, launch) {
    var runId = launch && launch.personaTestRunId ? launch.personaTestRunId : null;
    var run = runId ? findBatchRunById(state, runId) : null;
    var prompt = batchPromptForRun(run);
    if (!runId || !prompt) {
      return Promise.resolve(false);
    }
    if (
      state.submittingBatchPromptRunIds[runId] ||
      !window.__tribexAiState ||
      typeof window.__tribexAiState.submitPrompt !== 'function'
    ) {
      return Promise.resolve(false);
    }

    state.submittingBatchPromptRunIds[runId] = true;
    return waitForThreadContext(launch.threadId, 16)
      .then(function (threadContext) {
        if (threadHasExistingPromptHistory(threadContext)) {
          return false;
        }
        return window.__tribexAiState.submitPrompt(launch.threadId, prompt);
      })
      .then(function (submitted) {
        return submitted;
      })
      .finally(function () {
        delete state.submittingBatchPromptRunIds[runId];
      });
  }

  function openBatchRunThread(state, run) {
    var launch = findBatchLaunch(state, run);
    var threadSeed = launch || {
      threadId: run.threadId,
      title: run.label || 'Persona Studio run',
      organizationId: run.organizationId || null,
      workspaceId: run.workspaceId || null,
      projectId: run.projectId || null,
    };
    var openPromise = launch
      ? openTestThread(state, launch)
      : openThreadInNativeAi(
          run.threadId,
          run.organizationId || null,
          batchPromptForRun(run),
          threadSeed
        );
    return openPromise
      .then(function () {
        setStatus(state, 'Opened chat for ' + (run.label || run.id || 'this run') + '.');
        renderState(state);
      })
      .catch(function (error) {
        setError(state, stringifyError(error));
        renderState(state);
        throw error;
      });
  }

  function stopPolling(state) {
    if (state.pollTimer) {
      window.clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function stopBatchPolling(state) {
    if (state.batchPollTimer) {
      window.clearInterval(state.batchPollTimer);
      state.batchPollTimer = null;
    }
    clearBatchAutoOpenTimer(state);
  }

  function startPolling(state, runId) {
    stopPolling(state);
    if (!runId) return;
    state.pollTimer = window.setInterval(function () {
      fetchRun(state, runId)
        .then(function (payload) {
          var status = payload && payload.run ? payload.run.status : null;
          if (status && TERMINAL_RUN_STATUSES[status]) {
            stopPolling(state);
          }
        })
        .catch(function () {});
    }, 2000);
  }

  function startBatchPolling(state, batchId) {
    stopBatchPolling(state);
    if (!batchId) return;
    state.batchPollTimer = window.setInterval(function () {
      fetchBatch(state, batchId)
        .then(function (payload) {
          var batch = batchRecord(payload);
          var status = batch && batch.status;
          if (status && TERMINAL_BATCH_STATUSES[status]) {
            stopBatchPolling(state);
          }
        })
        .catch(function () {});
    }, 2500);
  }

  function testPersona(state) {
    if (!state.selectedPersonaKey) {
      setError(state, 'Select a persona before running a test.');
      renderState(state);
      return Promise.reject(new Error('No persona selected.'));
    }

    state.testing = true;
    setStatus(state, state.dirty ? 'Saving draft before launching test...' : 'Launching workshop test...');
    renderState(state);

    var savePromise = state.dirty ? savePersona(state) : Promise.resolve();
    return Promise.resolve(savePromise)
      .then(function () {
        return request(
          'POST',
          '/admin/persona-studio/personas/' + encodeURIComponent(state.selectedPersonaKey) + '/test-runs',
          { sourceStage: 'draft' }
        );
      })
      .then(function (payload) {
        state.lastRunId = payload.run.id;
        setStatus(state, 'Opening native AI chat tab...');
        renderState(state);
        startPolling(state, payload.run.id);
        return Promise.all([
          fetchRun(state, payload.run.id),
          openTestThread(state, payload.launch),
        ]);
      })
      .then(function () {
        setStatus(state, 'Test tab opened. Message the persona in the native AI chat to validate the saved draft.');
      })
      .catch(function (error) {
        setError(state, stringifyError(error));
        throw error;
      })
      .finally(function () {
        state.testing = false;
        renderState(state);
      });
  }

  function buildBatchPayload(state) {
    synchronizeBatchDraftRuns(state);
    var draft = state.batchDraft;
    var modelPolicyOverride = ensureObject(draft.modelPolicyOverride);
    ['defaultModel', 'fastModel', 'reasoningModel'].forEach(function (key) {
      if (!modelPolicyOverride[key]) {
        throw new Error('Batch model policy must select Default, Thinking Fast, and Reasoning models.');
      }
    });
    var runs = ensureArray(draft && draft.runs).map(function (run, index) {
      var runtimeOverrides = parseJsonObject(
        run.runtimeOverridesText || renderJson(ensureObject(run.runtimeOverrides)),
        {},
        'Runtime overrides for run ' + (index + 1)
      );
      return {
        label: String(run.label || ('Run ' + (index + 1))).trim(),
        systemPromptOverride: run.systemPromptOverride || '',
        messagePromptOverride: run.messagePromptOverride || '',
        runtimeOverrides: runtimeOverrides,
      };
    });

    return {
      sourceStage: 'draft',
      runCount: draft.runCount,
      summaryScaffold: {
        enabled: true,
        mode: 'manual',
        transcriptSource: 'full',
      },
      modelPolicyOverride: {
        defaultModel: modelPolicyOverride.defaultModel,
        fastModel: modelPolicyOverride.fastModel,
        reasoningModel: modelPolicyOverride.reasoningModel,
      },
      runs: runs,
    };
  }

  function launchBatch(state) {
    if (!state.selectedPersonaKey) {
      setError(state, 'Select a persona before launching parallel runs.');
      renderState(state);
      return Promise.reject(new Error('No persona selected.'));
    }

    var payload;
    try {
      payload = buildBatchPayload(state);
      state.batchError = '';
    } catch (error) {
      state.batchError = stringifyError(error);
      renderState(state);
      return Promise.reject(error);
    }

    state.launchingBatch = true;
    setStatus(
      state,
      state.dirty
        ? 'Saving draft before launching parallel runs...'
        : 'Launching parallel runs...'
    );
    renderState(state);

    var savePromise = state.dirty ? savePersona(state) : Promise.resolve();
    return Promise.resolve(savePromise)
      .then(function () {
        return request(
          'POST',
          '/admin/persona-studio/personas/' + encodeURIComponent(state.selectedPersonaKey) + '/test-batches',
          payload
        );
      })
      .then(function (response) {
        var batch = batchRecord(response);
        var launches = batchLaunches(response);
        if (!batch || !batch.id) {
          throw new Error('Parallel run launch did not return a batch record.');
        }
        state.lastBatchId = batch.id;
        state.batchDetails = response;
        state.batchLaunches = launches.slice();
        state.batchLaunchSummary = {
          batchId: batch.id,
          totalRuns: launches.length,
          openedCount: 0,
          failedCount: 0,
          warnings: [],
        };
        persistLastBatchId(state, batch.id);
        state.batchWizardOpen = false;
        setStatus(
          state,
          'Parallel run batch created. Opening ' +
            launches.length +
            ' chat' +
            (launches.length === 1 ? '' : 's') +
            ' and updating Parallel Runs below...'
        );
        renderState(state);
        startBatchPolling(state, batch.id);
        return Promise.all([
          fetchBatch(state, batch.id).catch(function () { return null; }),
          Promise.all(launches.map(function (launch) {
            return openTestThread(state, launch)
              .then(function () {
                return { ok: true, launch: launch };
              })
              .catch(function (error) {
                return { ok: false, launch: launch, error: error };
              });
          })),
        ]);
      })
      .then(function (results) {
        var launchResults = results[1];
        var summary = summarizeBatchLaunchResults(state.lastBatchId, state.batchLaunches, launchResults);
        state.batchLaunchSummary = summary;
        if (summary.failedCount) {
          retryBatchAutoOpen(
            state,
            summary.warnings.map(function (warning) {
              return ensureArray(state.batchLaunches).find(function (launch) {
                return launch.threadId === warning.threadId;
              });
            }).filter(Boolean),
            3
          );
          setStatus(
            state,
            'Parallel run batch created. ' +
              summary.openedCount +
              ' of ' +
              summary.totalRuns +
              ' chats opened automatically. Use Open chat in Parallel Runs below for any run that did not appear.'
          );
        } else {
          setStatus(
            state,
            'Parallel runs launched. ' +
              summary.totalRuns +
              ' chats opened, and the batch is now available below in Parallel Runs.'
          );
        }
      })
      .catch(function (error) {
        state.batchError = stringifyError(error);
        setError(state, stringifyError(error));
        throw error;
      })
      .finally(function () {
        state.launchingBatch = false;
        renderState(state);
      });
  }

  function maybeSwitchPersona(state, nextKey) {
    if (!nextKey || nextKey === state.selectedPersonaKey) {
      return;
    }
    if (
      state.dirty &&
      !window.confirm('You have unsaved persona changes. Discard them and switch personas?')
    ) {
      return;
    }
    setStatus(state, '');
    setError(state, '');
    stopPolling(state);
    stopBatchPolling(state);
    closeRunDetail(state);
    state.lastRunId = null;
    state.runDetails = null;
    state.lastBatchId = null;
    state.batchDetails = null;
    state.batchLaunches = [];
    state.batchLaunchSummary = null;
    state.submittingBatchPromptRunIds = {};
    loadPersona(state, nextKey);
  }

  function createPersona(state) {
    var key = window.prompt('New persona key', '');
    if (!key) return;
    var displayName = window.prompt('Display name', key);
    if (!displayName) return;
    var description = window.prompt('Description', displayName + ' persona draft created from Persona Studio.') || '';

    request('POST', '/admin/persona-studio/personas', {
      key: key,
      displayName: displayName,
      description: description,
    })
      .then(function (payload) {
        setStatus(state, 'Created new persona draft.');
        return refreshBootstrapAndPersona(state, payload.definition.key);
      })
      .catch(function (error) {
        setError(state, stringifyError(error));
        renderState(state);
      });
  }

  function createTooltip(helpText) {
    var trigger = createEl('span', 'persona-lab-tooltip', '?');
    trigger.tabIndex = 0;
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-label', helpText);
    trigger.title = helpText;
    trigger.appendChild(createEl('span', 'persona-lab-tooltip-popover', helpText));
    return trigger;
  }

  function appendSectionHeading(parent, tag, label, helpText) {
    if (!helpText) {
      parent.appendChild(createEl(tag, null, label));
      return;
    }
    var row = createEl('div', 'persona-lab-heading-row');
    row.appendChild(createEl(tag, null, label));
    row.appendChild(createTooltip(helpText));
    parent.appendChild(row);
  }

  function renderFieldGroup(parent, label, input, helpText) {
    var field = createEl('div', 'persona-lab-field');
    var labelRow = createEl('div', 'persona-lab-field-label-row');
    labelRow.appendChild(createEl('label', null, label));
    if (helpText) {
      labelRow.appendChild(createTooltip(helpText));
    }
    field.appendChild(labelRow);
    field.appendChild(input);
    parent.appendChild(field);
    return field;
  }

  function compactRuleText(value) {
    var text = String(value || '').trim();
    if (!text) return 'Blank rule';
    return text.length > 96 ? text.slice(0, 93) + '...' : text;
  }

  function syncRuleEditorState(state) {
    var rules = ensureArray(state.form && state.form.draft && state.form.draft.rules);
    if (!rules.length) {
      state.ruleEditorIndex = -1;
      if (state.ruleEditorDraft == null) state.ruleEditorDraft = '';
      return;
    }
    if (state.ruleEditorIndex < 0 || state.ruleEditorIndex >= rules.length) {
      state.ruleEditorIndex = 0;
      state.ruleEditorDraft = rules[0] || '';
    }
    if (state.ruleEditorDraft == null) {
      state.ruleEditorDraft = rules[state.ruleEditorIndex] || '';
    }
  }

  function renderRulesEditor(state) {
    syncRuleEditorState(state);
    var rules = ensureArray(state.form.draft.rules);
    var wrapper = createEl('div', 'persona-lab-rule-editor');
    var ruleList = createEl('div', 'persona-lab-rule-list');

    if (!rules.length) {
      ruleList.appendChild(
        createEl('div', 'persona-lab-empty', 'No persona rules yet. Add a rule to define a behavioral constraint.')
      );
    } else {
      rules.forEach(function (rule, index) {
        var item = createEl(
          'button',
          'persona-lab-rule-item' + (index === state.ruleEditorIndex ? ' active' : '')
        );
        item.type = 'button';
        item.appendChild(createEl('span', null, 'Rule ' + (index + 1)));
        item.appendChild(createEl('strong', null, compactRuleText(rule)));
        item.addEventListener('click', function () {
          state.ruleEditorIndex = index;
          state.ruleEditorDraft = rule || '';
          renderState(state);
        });
        ruleList.appendChild(item);
      });
    }

    var controls = createEl('div', 'persona-lab-rule-controls');
    var editor = createEl('textarea', 'persona-lab-textarea');
    editor.placeholder = 'Write one clear rule, such as: Always confirm financial assumptions before summarizing a forecast.';
    editor.value = state.ruleEditorDraft || '';
    bindInput(editor, function () {
      state.ruleEditorDraft = editor.value;
    });
    controls.appendChild(editor);

    var actions = createEl('div', 'persona-lab-actions');
    var addRule = createEl('button', 'persona-lab-button', 'Add new rule');
    addRule.type = 'button';
    addRule.addEventListener('click', function () {
      var newRule = String(state.ruleEditorDraft || '').trim() || 'Describe the new persona rule.';
      state.form.draft.rules = rules.concat([newRule]);
      state.ruleEditorIndex = state.form.draft.rules.length - 1;
      state.ruleEditorDraft = newRule;
      updateDirtyState(state);
      renderState(state);
    });
    actions.appendChild(addRule);

    var modifyRule = createEl('button', 'persona-lab-button', 'Modify existing rule');
    modifyRule.type = 'button';
    modifyRule.disabled = state.ruleEditorIndex < 0;
    modifyRule.addEventListener('click', function () {
      if (state.ruleEditorIndex < 0) return;
      var nextRule = String(state.ruleEditorDraft || '').trim();
      if (!nextRule) {
        setError(state, 'Rule text cannot be blank.');
        renderState(state);
        return;
      }
      state.form.draft.rules = rules.map(function (rule, index) {
        return index === state.ruleEditorIndex ? nextRule : rule;
      });
      state.ruleEditorDraft = nextRule;
      updateDirtyState(state);
      renderState(state);
    });
    actions.appendChild(modifyRule);

    var deleteRule = createEl('button', 'persona-lab-button', 'Delete Rule');
    deleteRule.type = 'button';
    deleteRule.disabled = state.ruleEditorIndex < 0;
    deleteRule.addEventListener('click', function () {
      if (state.ruleEditorIndex < 0) return;
      state.form.draft.rules = rules.filter(function (_rule, index) {
        return index !== state.ruleEditorIndex;
      });
      if (state.form.draft.rules.length) {
        state.ruleEditorIndex = Math.min(state.ruleEditorIndex, state.form.draft.rules.length - 1);
        state.ruleEditorDraft = state.form.draft.rules[state.ruleEditorIndex] || '';
      } else {
        state.ruleEditorIndex = -1;
        state.ruleEditorDraft = '';
      }
      updateDirtyState(state);
      renderState(state);
    });
    actions.appendChild(deleteRule);
    controls.appendChild(actions);

    wrapper.appendChild(ruleList);
    wrapper.appendChild(controls);
    return wrapper;
  }

  function buildCheckboxGrid(items, selected, onToggle) {
    var grid = createEl('div', 'persona-lab-choice-grid');
    var selectedValues = ensureArray(selected);
    mergeChoiceOptions(items, selectedValues).forEach(function (item) {
      var key = item.key;
      var label = item.label;
      var row = createEl('label', 'persona-lab-choice');
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = selectedValues.indexOf(key) >= 0;
      input.addEventListener('change', function () {
        onToggle(key);
      });
      row.appendChild(input);
      var copy = createEl('div');
      copy.appendChild(createEl('strong', null, label));
      copy.appendChild(createEl('code', null, key));
      if (item.description) {
        copy.appendChild(createEl('p', 'persona-lab-helper', item.description));
      } else if (item.toolCount !== null) {
        copy.appendChild(createEl('p', 'persona-lab-helper', formatNumber(item.toolCount) + ' tools'));
      }
      row.appendChild(copy);
      grid.appendChild(row);
    });
    return grid;
  }

  function buildModelSelect(registries, selectedValue, onChange, allowEmpty) {
    var currentValue = normalizeModelId(selectedValue);
    var groups = buildModelGroups(registries || {}, currentValue);
    var allOptions = [];
    var optionButtons = {};
    var emptyButton = null;
    var selectorId = 'persona-lab-model-menu-' + (++modelSelectorSequence);
    var root = createEl('div', 'persona-lab-model-select');
    var trigger = createEl('button', 'persona-lab-model-trigger');
    var triggerCopy = createEl('span', 'persona-lab-model-trigger-copy');
    var triggerLabel = createEl('span', 'persona-lab-model-trigger-label');
    var triggerProvider = createEl('span', 'persona-lab-model-trigger-provider');
    var triggerIcon = createEl('span', 'persona-lab-model-trigger-icon', 'v');
    var menu = createEl('div', 'persona-lab-model-menu');

    groups.forEach(function (group) {
      ensureArray(group.models).forEach(function (option) {
        if (option && option.id) allOptions.push(option);
      });
    });

    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', selectorId);
    triggerCopy.appendChild(triggerLabel);
    triggerCopy.appendChild(triggerProvider);
    trigger.appendChild(triggerCopy);
    trigger.appendChild(triggerIcon);

    menu.id = selectorId;
    menu.setAttribute('role', 'listbox');

    function selectedOption() {
      return allOptions.filter(function (option) {
        return option.id === currentValue;
      })[0] || null;
    }

    function updateTrigger() {
      var option = selectedOption();
      if (!currentValue && allowEmpty !== false) {
        triggerLabel.textContent = 'None';
        triggerProvider.textContent = 'No model override';
      } else if (option) {
        triggerLabel.textContent = option.label || option.id;
        triggerProvider.textContent = option.providerLabel || providerLabel(option.provider);
      } else if (currentValue) {
        triggerLabel.textContent = currentValue;
        triggerProvider.textContent = providerLabel(inferModelProvider(currentValue));
      } else {
        triggerLabel.textContent = 'No models available';
        triggerProvider.textContent = 'Registry is empty';
      }
      trigger.disabled = allOptions.length === 0 && allowEmpty === false;
    }

    function updateActiveOptions() {
      Object.keys(optionButtons).forEach(function (value) {
        var button = optionButtons[value];
        var isSelected = value === currentValue;
        button.classList.toggle('active', isSelected);
        button.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
      if (emptyButton) {
        var emptySelected = !currentValue;
        emptyButton.classList.toggle('active', emptySelected);
        emptyButton.setAttribute('aria-selected', emptySelected ? 'true' : 'false');
      }
    }

    function closeMenu() {
      root.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', handleDocumentClick);
    }

    function openMenu() {
      root.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', handleDocumentClick);
    }

    function toggleMenu() {
      if (root.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    function handleDocumentClick(event) {
      if (!document.body.contains(root) || !root.contains(event.target)) {
        closeMenu();
      }
    }

    function selectValue(value) {
      var nextValue = normalizeModelId(value);
      if (nextValue === currentValue) {
        closeMenu();
        return;
      }
      currentValue = nextValue;
      updateTrigger();
      updateActiveOptions();
      onChange(currentValue);
      closeMenu();
    }

    function setProviderExpanded(providerEl, expanded) {
      providerEl.classList.toggle('expanded', expanded);
      var toggle = providerEl.querySelector('.persona-lab-model-provider-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    if (allowEmpty !== false) {
      emptyButton = createEl('button', 'persona-lab-model-empty');
      emptyButton.type = 'button';
      emptyButton.setAttribute('role', 'option');
      emptyButton.appendChild(createEl('span', 'persona-lab-model-option-label', 'None'));
      emptyButton.appendChild(createEl('span', 'persona-lab-model-option-id', 'No model override'));
      emptyButton.addEventListener('click', function (event) {
        event.stopPropagation();
        selectValue('');
      });
      menu.appendChild(emptyButton);
    }

    groups.forEach(function (group, groupIndex) {
      var providerEl = createEl('div', 'persona-lab-model-provider');
      var providerToggle = createEl('button', 'persona-lab-model-provider-toggle');
      var caret = createEl('span', 'persona-lab-model-provider-caret', '>');
      var name = createEl('span', 'persona-lab-model-provider-name', group.label || providerLabel(group.provider));
      var count = createEl('span', 'persona-lab-model-provider-count', String(ensureArray(group.models).length));
      var optionsEl = createEl('div', 'persona-lab-model-provider-options');
      var containsSelected = ensureArray(group.models).some(function (option) {
        return option && option.id === currentValue;
      });

      providerToggle.type = 'button';
      providerToggle.setAttribute('aria-expanded', 'false');
      providerToggle.appendChild(caret);
      providerToggle.appendChild(name);
      providerToggle.appendChild(count);
      providerToggle.addEventListener('click', function (event) {
        event.stopPropagation();
        setProviderExpanded(providerEl, !providerEl.classList.contains('expanded'));
      });

      ensureArray(group.models).forEach(function (option) {
        if (!option || !option.id) return;
        var optionButton = createEl('button', 'persona-lab-model-option');
        optionButton.type = 'button';
        optionButton.setAttribute('role', 'option');
        optionButton.setAttribute('data-model-value', option.id);
        optionButton.appendChild(createEl('span', 'persona-lab-model-option-label', option.label || option.id));
        optionButton.appendChild(createEl('span', 'persona-lab-model-option-id', option.id));
        optionButton.addEventListener('click', function (event) {
          event.stopPropagation();
          selectValue(option.id);
        });
        optionButtons[option.id] = optionButton;
        optionsEl.appendChild(optionButton);
      });

      providerEl.appendChild(providerToggle);
      providerEl.appendChild(optionsEl);
      menu.appendChild(providerEl);
      setProviderExpanded(providerEl, containsSelected || (!currentValue && allowEmpty === false && groupIndex === 0));
    });

    trigger.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleMenu();
    });
    trigger.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        openMenu();
      } else if (event.key === 'Escape') {
        closeMenu();
      }
    });
    menu.addEventListener('click', function (event) {
      event.stopPropagation();
    });
    menu.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
        trigger.focus();
      }
    });

    root.appendChild(trigger);
    root.appendChild(menu);
    updateTrigger();
    updateActiveOptions();
    return root;
  }

  function buildChoiceSelect(options, selectedValue, onChange) {
    var select = createEl('select', 'persona-lab-select');
    mergeChoiceOptions(options, selectedValue ? [selectedValue] : []).forEach(function (entry) {
      var option = document.createElement('option');
      option.value = entry.key;
      option.textContent = entry.label;
      if (entry.key === selectedValue) option.selected = true;
      select.appendChild(option);
    });
    bindInput(select, function () {
      onChange(select.value);
    });
    return select;
  }

  function buildNav(state) {
    var nav = createEl('aside', 'persona-lab-nav');
    var header = createEl('div', 'persona-lab-nav-header');
    var copy = createEl('div');
    copy.appendChild(createEl('p', 'persona-lab-nav-title', 'Persona Studio'));
    copy.appendChild(createEl('strong', null, 'Personas'));
    header.appendChild(copy);
    var createButton = createEl('button', 'persona-lab-button', 'New');
    createButton.type = 'button';
    createButton.addEventListener('click', function () {
      createPersona(state);
    });
    header.appendChild(createButton);
    nav.appendChild(header);

    var list = createEl('div', 'persona-lab-nav-list');
    if (!state.personas.length) {
      list.appendChild(createEl('div', 'persona-lab-empty', 'No persona drafts found yet.'));
    } else {
      state.personas.forEach(function (persona) {
        var item = createEl(
          'button',
          'persona-lab-nav-item' + (persona.key === state.selectedPersonaKey ? ' active' : '')
        );
        item.type = 'button';
        item.addEventListener('click', function () {
          maybeSwitchPersona(state, persona.key);
        });
        var title = createEl('div', 'persona-lab-nav-item-title');
        title.appendChild(createEl('span', null, persona.displayName));
        if (persona.key === state.selectedPersonaKey && state.dirty) {
          title.appendChild(createEl('span', 'persona-lab-badge dirty', 'Unsaved'));
        }
        item.appendChild(title);
        item.appendChild(createEl('code', null, persona.key));
        var meta = createEl('div', 'persona-lab-nav-item-meta');
        meta.appendChild(createEl('span', 'persona-lab-badge', persona.hasDraft ? 'draft' : 'no-draft'));
        if (persona.betaReleaseVersion) meta.appendChild(createEl('span', 'persona-lab-badge', 'beta'));
        if (persona.deployedReleaseVersion) meta.appendChild(createEl('span', 'persona-lab-badge', 'deployed'));
        item.appendChild(meta);
        list.appendChild(item);
      });
    }
    nav.appendChild(list);
    return nav;
  }

  function renderInspectorPanel(state) {
    var panel = createEl('section', 'persona-lab-panel compact');
    panel.appendChild(createEl('h2', null, 'Draft Validation'));
    if (!state.current || !state.current.validation) {
      panel.appendChild(createEl('div', 'persona-lab-empty', 'Validation data will appear here once a persona is loaded.'));
      return panel;
    }

    if (state.current.validation.ok) {
      panel.appendChild(createEl('p', null, 'The saved draft currently validates successfully.'));
    } else {
      panel.appendChild(createEl('p', null, 'The current draft has validation errors that need attention before promotion.'));
      var list = createEl('ul', 'persona-lab-list');
      ensureArray(state.current.validation.errors).forEach(function (error) {
        list.appendChild(createEl('li', null, error));
      });
      panel.appendChild(list);
    }

    var compiledTitle = createEl('h3', null, 'Compiled Persona Payload');
    panel.appendChild(compiledTitle);
    panel.appendChild(createEl('pre', 'persona-lab-json', renderJson(state.current.validation.compiled)));
    return panel;
  }

  function renderMetricsSummaryPanel(title, metricsSummary) {
    var panel = createEl('section', 'persona-lab-panel compact');
    panel.appendChild(createEl('h3', null, title));
    if (!metricsSummary || !metricsSummary.totals) {
      panel.appendChild(createEl('div', 'persona-lab-empty', 'Metrics will appear after assistant turns are recorded for this run.'));
      return panel;
    }

    var totals = metricsSummary.totals;
    var grid = createEl('div', 'persona-lab-metric-grid');
    [
      ['Total run time', formatDuration(totals.totalRunTimeMs)],
      ['Thinking time', formatDuration(totals.thinkingTimeMs)],
      ['Turns', formatNumber(totals.assistantTurnCount)],
      ['Avg time per turn', formatDuration(totals.avgTimePerTurnMs)],
      ['Tool calls', formatNumber(totals.toolCallCount)],
      ['Total tokens', formatNumber(totals.tokenUsage && totals.tokenUsage.totalTokens)],
      ['Prompt tokens', formatNumber(totals.tokenUsage && totals.tokenUsage.promptTokens)],
      ['Completion tokens', formatNumber(totals.tokenUsage && totals.tokenUsage.completionTokens)],
    ].forEach(function (entry) {
      var card = createEl('div', 'persona-lab-metric-card');
      card.appendChild(createEl('span', null, entry[0]));
      card.appendChild(createEl('strong', null, entry[1]));
      grid.appendChild(card);
    });
    panel.appendChild(grid);
    return panel;
  }

  function renderComparisonPanel(metricsSummary) {
    var comparison = metricsSummary && metricsSummary.comparison;
    if (!comparison || !Object.keys(comparison).length) {
      return null;
    }

    var panel = createEl('section', 'persona-lab-panel compact');
    panel.appendChild(createEl('h3', null, 'Batch Comparison'));
    var list = createEl('div', 'persona-lab-comparison-list');
    [
      ['totalRunTimeMs', 'Total run time'],
      ['thinkingTimeMs', 'Thinking time'],
      ['assistantTurnCount', 'Turn count'],
      ['avgTimePerTurnMs', 'Avg time per turn'],
      ['toolCallCount', 'Tool calls'],
      ['totalTokens', 'Total tokens'],
    ].forEach(function (entry) {
      var detail = comparison[entry[0]];
      if (!detail) return;
      var item = createEl('div', 'persona-lab-comparison-item');
      var copy = createEl('div');
      copy.appendChild(createEl('strong', null, entry[1]));
      copy.appendChild(
        createEl(
          'div',
          'persona-lab-helper',
          (detail.isBest ? 'Best in batch' : 'Rank ' + detail.rank + ' in batch') +
            ' • delta ' +
            formatNumber(detail.deltaFromBest)
        )
      );
      item.appendChild(copy);
      item.appendChild(createEl('span', 'persona-lab-badge', detail.direction));
      list.appendChild(item);
    });
    panel.appendChild(list);
    return panel;
  }

  function renderTurnBreakdownPanel(metricsSummary) {
    var panel = createEl('section', 'persona-lab-panel');
    panel.appendChild(createEl('h3', null, 'Per-Turn Breakdown'));
    var turns = ensureArray(metricsSummary && metricsSummary.turns);
    if (!turns.length) {
      panel.appendChild(createEl('div', 'persona-lab-empty', 'No assistant turns have been recorded for this run yet.'));
      return panel;
    }

    var list = createEl('div', 'persona-lab-turn-list');
    turns.forEach(function (turn) {
      var card = createEl('div', 'persona-lab-turn-card');
      card.appendChild(createEl('h4', null, 'Turn ' + String(turn.turnIndex || '—')));
      var kv = createEl('div', 'persona-lab-kv');
      [
        ['Execution run', turn.executionRunId || '—'],
        ['Started', turn.startedAt || '—'],
        ['Finished', turn.finishedAt || '—'],
        ['Duration', formatDuration(turn.durationMs)],
        ['Tool calls', formatNumber(turn.toolCallCount)],
        ['Total tokens', formatNumber(turn.tokenUsage && turn.tokenUsage.totalTokens)],
      ].forEach(function (entry) {
        var item = createEl('div', 'persona-lab-kv-item');
        item.appendChild(createEl('span', null, entry[0]));
        item.appendChild(createEl('strong', null, entry[1]));
        kv.appendChild(item);
      });
      card.appendChild(kv);
      list.appendChild(card);
    });
    panel.appendChild(list);
    return panel;
  }

  function renderLatestRunPanel(state) {
    var panel = createEl('section', 'persona-lab-panel');
    panel.appendChild(createEl('h2', null, 'Latest Single Run'));
    if (!state.runDetails || !state.runDetails.run) {
      panel.appendChild(createEl('div', 'persona-lab-empty', 'No single-run workshop test has been launched from this tab yet.'));
      return panel;
    }

    var run = state.runDetails.run;
    var metricsSummary = metricsSummaryOf(run) || metricsSummaryOf(state.runDetails.diagnostics);
    var summary = createEl('div', 'persona-lab-kv');
    [
      ['Run ID', run.id],
      ['Status', run.status],
      ['Thread', run.threadId],
      ['Started', run.startedAt],
      ['Finished', run.finishedAt || 'In progress'],
    ].forEach(function (entry) {
      var card = createEl('div', 'persona-lab-kv-item');
      card.appendChild(createEl('span', null, entry[0]));
      card.appendChild(createEl('strong', null, String(entry[1] || '—')));
      summary.appendChild(card);
    });
    panel.appendChild(summary);
    panel.appendChild(renderMetricsSummaryPanel('Run Metrics', metricsSummary));

    var actions = createEl('div', 'persona-lab-run-actions');
    actions.appendChild(createEl('div', 'persona-lab-helper', 'Open the detailed run view for per-turn metrics and raw diagnostics.'));
    var detailButton = createEl('button', 'persona-lab-button', 'View run');
    detailButton.type = 'button';
    detailButton.addEventListener('click', function () {
      openRunDetail(state, run.id).catch(function () {});
    });
    actions.appendChild(detailButton);
    panel.appendChild(actions);

    if (state.runDetails.diagnostics && state.runDetails.diagnostics.latestExecutionRun) {
      panel.appendChild(createEl('h3', null, 'Billing + Execution Snapshot'));
      panel.appendChild(
        createEl(
          'pre',
          'persona-lab-json',
          renderJson(state.runDetails.diagnostics.latestExecutionRun)
        )
      );
    }

    panel.appendChild(createEl('h3', null, 'Raw Companion Payloads'));
    panel.appendChild(
      createEl(
        'pre',
        'persona-lab-json',
        renderJson((state.runDetails.diagnostics && state.runDetails.diagnostics.companionEvents) || [])
      )
    );
    return panel;
  }

  function renderBatchLaunchSummary(state, batch) {
    if (!state.batchLaunchSummary || state.batchLaunchSummary.batchId !== batch.id) {
      return null;
    }

    var summary = state.batchLaunchSummary;
    var banner = createEl(
      'div',
      'persona-lab-summary-banner ' + (summary.failedCount ? 'warning' : 'success')
    );
    var copy = createEl('div');
    copy.appendChild(
      createEl(
        'strong',
        null,
        summary.failedCount ? 'Batch created with chat-open warnings' : 'Batch created successfully'
      )
    );
    copy.appendChild(
      createEl(
        'p',
        null,
        summary.failedCount
          ? summary.openedCount +
              ' of ' +
              summary.totalRuns +
              ' chats opened automatically. You can still use the run cards below to open any missing chat.'
          : summary.totalRuns +
              ' chats opened automatically. You can revisit any run from the cards below.'
      )
    );
    banner.appendChild(copy);
    var actions = createEl('div', 'persona-lab-actions');
    if (ensureArray(state.batchLaunches).length) {
      var reopenButton = createEl('button', 'persona-lab-button', 'Open all chats');
      reopenButton.type = 'button';
      reopenButton.addEventListener('click', function () {
        Promise.all(ensureArray(state.batchLaunches).map(function (launch) {
          return openTestThread(state, launch).catch(function () { return null; });
        })).then(function () {
          setStatus(state, 'Retried opening all chats for this batch.');
          renderState(state);
        });
      });
      actions.appendChild(reopenButton);
    }
    var refreshButton = createEl('button', 'persona-lab-button', 'Refresh batch');
    refreshButton.type = 'button';
    refreshButton.addEventListener('click', function () {
      fetchBatch(state, batch.id).catch(function () {});
    });
    actions.appendChild(refreshButton);
    banner.appendChild(actions);
    return banner;
  }

  function renderBatchRunSummary(state, run, index) {
    var card = createEl('div', 'persona-lab-run-card');
    var metricsSummary = metricsSummaryOf(run);
    var header = createEl('div', 'persona-lab-run-card-header');
    var headerCopy = createEl('div');
    headerCopy.appendChild(createEl('div', 'persona-lab-run-eyebrow', 'Batch run ' + (index + 1)));
    headerCopy.appendChild(createEl('strong', null, run.label || ('Run ' + (index + 1))));
    var subtitle = createEl('div', 'persona-lab-run-subtitle');
    var policyChip = createEl('div', 'persona-lab-chip');
    policyChip.appendChild(createEl('span', 'persona-lab-chip-label', 'Models'));
    policyChip.appendChild(createEl('span', null, 'Batch policy'));
    subtitle.appendChild(policyChip);
    if (run.threadId) {
      var threadChip = createEl('div', 'persona-lab-chip');
      threadChip.appendChild(createEl('span', 'persona-lab-chip-label', 'Thread'));
      threadChip.appendChild(createEl('span', null, formatThreadLabel(run.threadId)));
      subtitle.appendChild(threadChip);
    }
    headerCopy.appendChild(subtitle);
    header.appendChild(headerCopy);
    header.appendChild(createEl('span', statusBadgeClass(run.status), formatStatusLabel(run.status)));
    card.appendChild(header);

    var kv = createEl('div', 'persona-lab-kv');
    [
      ['Run ID', run.id || run.runId || '—'],
      ['Thread', run.threadId || '—'],
      ['System prompt', run.systemPromptOverride ? 'override' : 'inherits persona'],
      ['Message prompt', run.messagePromptOverride ? 'override' : 'launch-time prompt'],
    ].forEach(function (entry) {
      var item = createEl('div', 'persona-lab-kv-item');
      item.appendChild(createEl('span', null, entry[0]));
      item.appendChild(createEl('strong', null, String(entry[1] || '—')));
      kv.appendChild(item);
    });
    card.appendChild(kv);

    if (metricsSummary && metricsSummary.totals) {
      var metricGrid = createEl('div', 'persona-lab-run-metric-grid');
      [
        ['Run time', formatDuration(metricsSummary.totals.totalRunTimeMs)],
        ['Thinking', formatDuration(metricsSummary.totals.thinkingTimeMs)],
        ['Turns', formatNumber(metricsSummary.totals.assistantTurnCount)],
        ['Per turn', formatDuration(metricsSummary.totals.avgTimePerTurnMs)],
        ['Tools', formatNumber(metricsSummary.totals.toolCallCount)],
        ['Tokens', formatNumber(metricsSummary.totals.tokenUsage && metricsSummary.totals.tokenUsage.totalTokens)],
      ].forEach(function (entry) {
        var metricCard = createEl('div', 'persona-lab-run-metric');
        metricCard.appendChild(createEl('span', null, entry[0]));
        metricCard.appendChild(createEl('strong', null, entry[1]));
        metricGrid.appendChild(metricCard);
      });
      card.appendChild(metricGrid);
    }

    if (run.systemPromptOverride) {
      card.appendChild(createEl('div', 'persona-lab-run-note', 'System prompt override is set for this run.'));
    }
    if (run.messagePromptOverride) {
      card.appendChild(createEl('div', 'persona-lab-run-note', 'Launch-time message prompt override is set for this run.'));
    }
    var actions = createEl('div', 'persona-lab-run-actions');
    var comparisonDetail = metricsSummary && metricsSummary.comparison && metricsSummary.comparison.totalRunTimeMs;
    var actionCopy = createEl('div', 'persona-lab-run-actions-copy');
    actionCopy.appendChild(
      createEl(
        'div',
        'persona-lab-helper',
        comparisonDetail
          ? (comparisonDetail.isBest ? 'Best run time in batch.' : 'Run time rank ' + comparisonDetail.rank + ' in batch.')
          : 'Per-run metrics will update as assistant turns complete.'
      )
    );
    actionCopy.appendChild(
      createEl(
        'div',
        'persona-lab-run-note',
        run.threadId
          ? (batchPromptForRun(run)
              ? 'Open the native AI chat to review or send the prefilled prompt for this run.'
              : 'Open the native AI chat, then send the first evaluation prompt to begin collecting metrics.')
          : 'Telemetry is available from the detailed run view.'
      )
    );
    actions.appendChild(actionCopy);
    var buttonGroup = createEl('div', 'persona-lab-run-actions-buttons');
    if (run.threadId) {
      var openChatButton = createEl('button', 'persona-lab-button', 'Open chat');
      openChatButton.type = 'button';
      openChatButton.addEventListener('click', function () {
        openBatchRunThread(state, run).catch(function () {});
      });
      buttonGroup.appendChild(openChatButton);
    }
    var viewButton = createEl('button', 'persona-lab-button', 'View run');
    viewButton.type = 'button';
    viewButton.addEventListener('click', function () {
      openRunDetail(state, run.id || run.runId).catch(function () {});
    });
    buttonGroup.appendChild(viewButton);
    actions.appendChild(buttonGroup);
    card.appendChild(actions);
    return card;
  }

  function renderLatestBatchPanel(state) {
    var panel = createEl('section', 'persona-lab-panel persona-lab-batch-panel');
    panel.appendChild(createEl('h2', null, 'Parallel Runs'));

    if (!state.batchDetails || !batchRecord(state.batchDetails)) {
      panel.appendChild(
        createEl(
          'div',
          'persona-lab-empty',
          'No parallel run batch has been launched for this persona in Persona Studio yet.'
        )
      );
      return panel;
    }

    var batch = batchRecord(state.batchDetails);
    var summary = createEl('div', 'persona-lab-kv');
    [
      ['Batch ID', batch.id],
      ['Status', batch.status],
      ['Run count', batch.runCount || batchRunList(state.batchDetails).length],
      ['Started', batch.startedAt || batch.createdAt || '—'],
      ['Finished', batch.finishedAt || 'In progress'],
    ].forEach(function (entry) {
      var card = createEl('div', 'persona-lab-kv-item');
      card.appendChild(createEl('span', null, entry[0]));
      card.appendChild(createEl('strong', null, String(entry[1] || '—')));
      summary.appendChild(card);
    });
    panel.appendChild(summary);
    var launchSummary = renderBatchLaunchSummary(state, batch);
    if (launchSummary) {
      panel.appendChild(launchSummary);
    }

    var runs = batchRunList(state.batchDetails);
    var eligibleForSummary = runs.some(function (run) {
      return TERMINAL_RUN_STATUSES[run.status];
    }) || TERMINAL_BATCH_STATUSES[batch.status];
    if (eligibleForSummary) {
      var summaryBanner = createEl('div', 'persona-lab-summary-banner');
      var summaryCopy = createEl('div');
      summaryCopy.appendChild(createEl('strong', null, 'Batch synthesis scaffold'));
      summaryCopy.appendChild(
        createEl(
          'p',
          null,
          'Full transcript and config metadata are persisted so this batch can feed a future comparison summary run.'
        )
      );
      summaryBanner.appendChild(summaryCopy);
      var summaryButton = createEl('button', 'persona-lab-button', 'Summarize Batch');
      summaryButton.type = 'button';
      summaryButton.disabled = true;
      summaryBanner.appendChild(summaryButton);
      panel.appendChild(summaryBanner);
    }

    if (!runs.length) {
      panel.appendChild(createEl('div', 'persona-lab-empty', 'Run definitions will appear here after launch.'));
      return panel;
    }

    panel.appendChild(createEl('h3', null, 'Batch Runs'));
    var grid = createEl('div', 'persona-lab-run-grid');
    runs.forEach(function (run, index) {
      grid.appendChild(renderBatchRunSummary(state, run, index));
    });
    panel.appendChild(grid);

    if (state.batchDetails.diagnostics || batch.diagnostics) {
      panel.appendChild(createEl('h3', null, 'Batch Diagnostics'));
      panel.appendChild(
        createEl(
          'pre',
          'persona-lab-json',
          renderJson(state.batchDetails.diagnostics || batch.diagnostics || {})
        )
      );
    }
    return panel;
  }

  function renderBatchWizard(state) {
    if (!state.batchWizardOpen || !state.batchDraft) {
      return null;
    }

    var registries = activeRegistries(state);
    synchronizeBatchDraftRuns(state);

    var overlay = createEl('div', 'persona-lab-overlay');
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay && !state.launchingBatch) {
        closeBatchWizard(state);
      }
    });

    var modal = createEl('div', 'persona-lab-modal');
    overlay.appendChild(modal);

    var header = createEl('div', 'persona-lab-modal-header');
    var copy = createEl('div');
    copy.appendChild(createEl('p', 'persona-lab-nav-title', 'Persona Studio'));
    copy.appendChild(createEl('h2', null, 'Parallel Run Wizard'));
    copy.appendChild(
      createEl(
        'p',
        null,
        'Create a persisted run batch that opens multiple native AI tabs from one saved persona draft.'
      )
    );
    header.appendChild(copy);
    var closeButton = createEl('button', 'persona-lab-button', 'Close');
    closeButton.type = 'button';
    closeButton.disabled = state.launchingBatch;
    closeButton.addEventListener('click', function () {
      closeBatchWizard(state);
    });
    header.appendChild(closeButton);
    modal.appendChild(header);

    var body = createEl('div', 'persona-lab-modal-body');
    var stepper = createEl('div', 'persona-lab-stepper');
    [
      [1, '1. Count'],
      [2, '2. Configure'],
      [3, '3. Review'],
    ].forEach(function (entry) {
      stepper.appendChild(
        createEl(
          'div',
          'persona-lab-step' + (state.batchWizardStep === entry[0] ? ' active' : ''),
          entry[1]
        )
      );
    });
    body.appendChild(stepper);

    if (state.batchError) {
      body.appendChild(createEl('div', 'persona-lab-error', state.batchError));
    }

    if (state.batchWizardStep === 1) {
      var countPanel = createEl('section', 'persona-lab-panel');
      countPanel.appendChild(createEl('h3', null, 'Choose how many runs to launch'));
      countPanel.appendChild(
        createEl(
          'p',
          null,
          'Start with the number of comparisons you want. The workshop will generate one configuration slot per run.'
        )
      );
      var countInput = createEl('input', 'persona-lab-input');
      countInput.type = 'number';
      countInput.min = '2';
      countInput.max = '8';
      countInput.value = String(state.batchDraft.runCount || 2);
      bindInput(countInput, function () {
        state.batchDraft.runCount = Math.max(2, Math.min(8, Number(countInput.value) || 2));
      });
      renderFieldGroup(countPanel, 'Run count', countInput);
      countPanel.appendChild(
        createEl(
          'div',
          'persona-lab-helper',
          'Use this for thinking-class model policy tests, prompt A/B tests, or mixed experiments.'
        )
      );
      body.appendChild(countPanel);
      var modelPolicyPanel = createEl('section', 'persona-lab-panel');
      modelPolicyPanel.appendChild(createEl('h3', null, 'Batch model policy'));
      modelPolicyPanel.appendChild(
        createEl(
          'p',
          null,
          'These model choices apply to every run in this batch. Runtime routing still chooses the Default, Thinking Fast, or Reasoning class for each turn.'
        )
      );
      var policyGrid = createEl('div', 'persona-lab-grid');
      state.batchDraft.modelPolicyOverride = Object.assign(
        defaultBatchModelPolicy(state),
        ensureObject(state.batchDraft.modelPolicyOverride)
      );
      renderFieldGroup(
        policyGrid,
        'Default model',
        buildModelSelect(registries, state.batchDraft.modelPolicyOverride.defaultModel, function (value) {
          state.batchDraft.modelPolicyOverride.defaultModel = value;
        }, false)
      );
      renderFieldGroup(
        policyGrid,
        'Thinking Fast model',
        buildModelSelect(registries, state.batchDraft.modelPolicyOverride.fastModel, function (value) {
          state.batchDraft.modelPolicyOverride.fastModel = value;
        }, false)
      );
      renderFieldGroup(
        policyGrid,
        'Reasoning model',
        buildModelSelect(registries, state.batchDraft.modelPolicyOverride.reasoningModel, function (value) {
          state.batchDraft.modelPolicyOverride.reasoningModel = value;
        }, false)
      );
      modelPolicyPanel.appendChild(policyGrid);
      body.appendChild(modelPolicyPanel);
    } else if (state.batchWizardStep === 2) {
      var runsPanel = createEl('section', 'persona-lab-panel');
      runsPanel.appendChild(createEl('h3', null, 'Configure each run'));
      runsPanel.appendChild(
        createEl(
          'p',
          null,
          'Each run can override prompt content and runtime settings while inheriting the shared batch model policy.'
        )
      );
      var runGrid = createEl('div', 'persona-lab-run-grid');
      state.batchDraft.runs.forEach(function (run, index) {
        var runCard = createEl('div', 'persona-lab-run-card');
        var title = createEl('div', 'persona-lab-run-card-header');
        var titleCopy = createEl('div');
        titleCopy.appendChild(createEl('strong', null, 'Run ' + (index + 1)));
        titleCopy.appendChild(createEl('div', 'persona-lab-helper', 'Per-run overrides for this tab.'));
        title.appendChild(titleCopy);
        runCard.appendChild(title);

        var labelInput = createEl('input', 'persona-lab-input');
        labelInput.value = run.label || '';
        bindInput(labelInput, function () {
          run.label = labelInput.value;
        });
        renderFieldGroup(runCard, 'Label', labelInput);

        var systemInput = createEl('textarea', 'persona-lab-textarea');
        systemInput.value = run.systemPromptOverride || '';
        systemInput.placeholder = 'Leave blank to inherit the saved persona system prompt.';
        bindInput(systemInput, function () {
          run.systemPromptOverride = systemInput.value;
        });
        renderFieldGroup(runCard, 'System prompt override', systemInput);

        var messageInput = createEl('textarea', 'persona-lab-textarea');
        messageInput.value = run.messagePromptOverride || '';
        messageInput.placeholder = 'Optional launch-time user/message prompt for this run.';
        bindInput(messageInput, function () {
          run.messagePromptOverride = messageInput.value;
        });
        renderFieldGroup(runCard, 'Message prompt override', messageInput);

        var runtimeInput = createEl('textarea', 'persona-lab-textarea json');
        runtimeInput.value = run.runtimeOverridesText || renderJson(ensureObject(run.runtimeOverrides));
        bindInput(runtimeInput, function () {
          run.runtimeOverridesText = runtimeInput.value;
          try {
            run.runtimeOverrides = parseJsonObject(
              runtimeInput.value,
              {},
              'Runtime overrides for ' + (run.label || ('Run ' + (index + 1)))
            );
            state.batchError = '';
          } catch (error) {
            state.batchError = stringifyError(error);
          }
        });
        renderFieldGroup(runCard, 'Additional runtime overrides (JSON)', runtimeInput);

        runGrid.appendChild(runCard);
      });
      runsPanel.appendChild(runGrid);
      body.appendChild(runsPanel);
    } else {
      var reviewPanel = createEl('section', 'persona-lab-panel');
      reviewPanel.appendChild(createEl('h3', null, 'Review batch launch'));
      reviewPanel.appendChild(
        createEl(
          'p',
          null,
          'This batch will be saved as a reusable evaluation record with linked test runs, thread IDs, and future summary scaffolding.'
        )
      );
      var policy = ensureObject(state.batchDraft.modelPolicyOverride);
      var policySummary = createEl('div', 'persona-lab-review-item');
      policySummary.appendChild(createEl('strong', null, 'Batch model policy'));
      policySummary.appendChild(
        createEl(
          'p',
          null,
          summarizeModelPolicy(policy)
        )
      );
      var reviewList = createEl('div', 'persona-lab-review-list');
      reviewList.appendChild(policySummary);
      state.batchDraft.runs.forEach(function (run, index) {
        var item = createEl('div', 'persona-lab-review-item');
        item.appendChild(createEl('strong', null, run.label || ('Run ' + (index + 1))));
        item.appendChild(
          createEl(
            'p',
            null,
            [
              'System prompt: ' + (run.systemPromptOverride ? 'override' : 'inherit'),
              'Message prompt: ' + (run.messagePromptOverride ? 'override' : 'none'),
            ].join(' • ')
          )
        );
        if (Object.keys(ensureObject(run.runtimeOverrides)).length) {
          item.appendChild(createEl('pre', 'persona-lab-json', renderJson(run.runtimeOverrides)));
        }
        reviewList.appendChild(item);
      });
      reviewPanel.appendChild(reviewList);
      body.appendChild(reviewPanel);
    }
    modal.appendChild(body);

    var footer = createEl('div', 'persona-lab-modal-footer');
    footer.appendChild(
      createEl(
        'div',
        'persona-lab-helper',
        state.dirty ? 'The workshop will save your draft before launching the batch.' : 'Saved draft is ready to launch.'
      )
    );
    var actions = createEl('div', 'persona-lab-actions');
    if (state.batchWizardStep > 1) {
      var backButton = createEl('button', 'persona-lab-button', 'Back');
      backButton.type = 'button';
      backButton.disabled = state.launchingBatch;
      backButton.addEventListener('click', function () {
        state.batchWizardStep -= 1;
        state.batchError = '';
        renderState(state);
      });
      actions.appendChild(backButton);
    }
    if (state.batchWizardStep < 3) {
      var nextButton = createEl('button', 'persona-lab-button primary', 'Next');
      nextButton.type = 'button';
      nextButton.disabled = state.launchingBatch;
      nextButton.addEventListener('click', function () {
        try {
          if (state.batchWizardStep === 1) {
            synchronizeBatchDraftRuns(state);
          }
          if (state.batchWizardStep === 2) {
            buildBatchPayload(state);
          }
          state.batchWizardStep += 1;
          state.batchError = '';
        } catch (error) {
          state.batchError = stringifyError(error);
        }
        renderState(state);
      });
      actions.appendChild(nextButton);
    } else {
      var launchButton = createEl(
        'button',
        'persona-lab-button primary',
        state.launchingBatch ? 'Launching…' : 'Launch Parallel Runs'
      );
      launchButton.type = 'button';
      launchButton.disabled = state.launchingBatch;
      launchButton.addEventListener('click', function () {
        launchBatch(state).catch(function () {});
      });
      actions.appendChild(launchButton);
    }
    footer.appendChild(actions);
    modal.appendChild(footer);

    return overlay;
  }

  function renderRunDetailDrawer(state) {
    if (!state.runDetailOpen) {
      return null;
    }

    var overlay = createEl('div', 'persona-lab-drawer-overlay');
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeRunDetail(state);
      }
    });

    var drawer = createEl('div', 'persona-lab-drawer');
    overlay.appendChild(drawer);

    var header = createEl('div', 'persona-lab-drawer-header');
    var copy = createEl('div');
    copy.appendChild(createEl('p', 'persona-lab-nav-title', 'Persona Studio'));
    var run = state.runDetailPayload && state.runDetailPayload.run;
    var runLabel = run && run.batchRunConfig && run.batchRunConfig.label
      ? run.batchRunConfig.label
      : (run && run.id ? 'Run ' + run.id : 'Run details');
    copy.appendChild(createEl('h2', null, runLabel));
    copy.appendChild(createEl('p', null, 'Inspect per-run metrics, per-turn tool usage, and the raw telemetry payloads captured for this evaluation run.'));
    header.appendChild(copy);
    var closeButton = createEl('button', 'persona-lab-button', 'Close');
    closeButton.type = 'button';
    closeButton.addEventListener('click', function () {
      closeRunDetail(state);
    });
    header.appendChild(closeButton);
    drawer.appendChild(header);

    var body = createEl('div', 'persona-lab-drawer-body');
    drawer.appendChild(body);

    if (state.runDetailLoading) {
      body.appendChild(createEl('div', 'persona-lab-empty', 'Loading run details...'));
      return overlay;
    }

    if (state.runDetailError) {
      body.appendChild(createEl('div', 'persona-lab-empty', state.runDetailError));
      return overlay;
    }

    if (!run) {
      body.appendChild(createEl('div', 'persona-lab-empty', 'Run details are not available yet.'));
      return overlay;
    }

    var metricsSummary = metricsSummaryOf(run) || metricsSummaryOf(state.runDetailPayload.diagnostics);
    var runDiagnostics = ensureObject(run.diagnostics);
    var batchPolicySummary = summarizeModelPolicy(runDiagnostics.batchModelPolicyOverride);
    var summary = createEl('div', 'persona-lab-kv');
    var summaryItems = [
      ['Run ID', run.id],
      ['Status', run.status],
      ['Thread', run.threadId],
      ['Started', run.startedAt],
      ['Finished', run.finishedAt || 'In progress'],
      [
        'Selected model',
        run.usageSummary && run.usageSummary.modelRouting && run.usageSummary.modelRouting.selectedModel
          ? run.usageSummary.modelRouting.selectedModel
          : (run.usageSummary && run.usageSummary.model) || '—',
      ],
    ];
    if (batchPolicySummary) {
      summaryItems.push(['Batch model policy', batchPolicySummary]);
    }
    summaryItems.forEach(function (entry) {
      var card = createEl('div', 'persona-lab-kv-item');
      card.appendChild(createEl('span', null, entry[0]));
      card.appendChild(createEl('strong', null, String(entry[1] || '—')));
      summary.appendChild(card);
    });
    body.appendChild(summary);
    body.appendChild(renderMetricsSummaryPanel('Metrics Summary', metricsSummary));
    var comparisonPanel = renderComparisonPanel(metricsSummary);
    if (comparisonPanel) {
      body.appendChild(comparisonPanel);
    }
    body.appendChild(renderTurnBreakdownPanel(metricsSummary));

    if (state.runDetailPayload.diagnostics && state.runDetailPayload.diagnostics.latestExecutionRun) {
      var executionPanel = createEl('section', 'persona-lab-panel');
      executionPanel.appendChild(createEl('h3', null, 'Billing + Execution Snapshot'));
      executionPanel.appendChild(
        createEl(
          'pre',
          'persona-lab-json',
          renderJson(state.runDetailPayload.diagnostics.latestExecutionRun)
        )
      );
      body.appendChild(executionPanel);
    }

    var companionPanel = createEl('section', 'persona-lab-panel');
    companionPanel.appendChild(createEl('h3', null, 'Raw Companion Payloads'));
    companionPanel.appendChild(
      createEl(
        'pre',
        'persona-lab-json',
        renderJson((state.runDetailPayload.diagnostics && state.runDetailPayload.diagnostics.companionEvents) || [])
      )
    );
    body.appendChild(companionPanel);

    return overlay;
  }

  function renderMain(state) {
    var shell = createEl('main', 'persona-lab-shell');
    var toolbar = createEl('div', 'persona-lab-toolbar');
    var titleCopy = createEl('div');
    titleCopy.appendChild(createEl('p', 'persona-lab-nav-title', 'Persona Studio'));
    titleCopy.appendChild(createEl('h1', null, 'Persona Studio'));
    titleCopy.appendChild(
      createEl(
        'p',
        null,
        'Edit the ProPaasAI persona draft through the Cloudflare dev control plane and launch single or parallel native MCPViews AI chats that test the exact saved configuration.'
      )
    );
    toolbar.appendChild(titleCopy);

    var actions = createEl('div', 'persona-lab-actions');
    var saveButton = createEl('button', 'persona-lab-button', state.saving ? 'Saving…' : 'Save');
    saveButton.type = 'button';
    saveButton.disabled = !state.form || state.saving || state.testing || state.launchingBatch;
    saveButton.addEventListener('click', function () {
      savePersona(state).catch(function () {});
    });
    var singleRunButton = createEl(
      'button',
      'persona-lab-button',
      state.testing ? 'Opening…' : 'Single Run'
    );
    singleRunButton.type = 'button';
    singleRunButton.disabled = !state.form || state.testing || state.loadingPersona || state.launchingBatch;
    singleRunButton.addEventListener('click', function () {
      testPersona(state).catch(function () {});
    });
    var batchButton = createEl(
      'button',
      'persona-lab-button primary',
      state.launchingBatch ? 'Launching…' : 'Parallel Runs'
    );
    batchButton.type = 'button';
    batchButton.disabled = !state.form || state.testing || state.loadingPersona || state.launchingBatch;
    batchButton.addEventListener('click', function () {
      openBatchWizard(state);
    });
    actions.appendChild(saveButton);
    actions.appendChild(singleRunButton);
    actions.appendChild(batchButton);
    toolbar.appendChild(actions);
    shell.appendChild(toolbar);

    if (state.status || state.error) {
      var statusRow = createEl('div', 'persona-lab-toolbar');
      statusRow.style.paddingTop = '0';
      statusRow.style.paddingBottom = '0';
      statusRow.style.borderBottom = 'none';
      var statusWrap = createEl('div', 'persona-lab-status-stack');
      statusWrap.appendChild(createEl('div', 'persona-lab-status', state.status || ''));
      statusWrap.appendChild(createEl('div', 'persona-lab-error', state.error || ''));
      statusRow.appendChild(statusWrap);
      shell.appendChild(statusRow);
    }

    var content = createEl('div', 'persona-lab-content');
    if (state.loading || state.loadingPersona) {
      content.appendChild(createEl('div', 'persona-lab-empty', 'Loading Persona Studio…'));
      shell.appendChild(content);
      return shell;
    }

    if (!state.form || !state.current) {
      content.appendChild(createEl('div', 'persona-lab-empty', 'Select a persona from the navigator to begin editing.'));
      shell.appendChild(content);
      return shell;
    }

    var registries = activeRegistries(state);

    var identity = createEl('section', 'persona-lab-panel');
    identity.appendChild(createEl('h2', null, 'Identity'));
    var identityGrid = createEl('div', 'persona-lab-grid');
    var displayNameInput = createEl('input', 'persona-lab-input');
    displayNameInput.value = state.form.definition.displayName;
    bindInput(displayNameInput, function () {
      state.form.definition.displayName = displayNameInput.value;
      updateDirtyState(state);
      renderState(state);
    });
    renderFieldGroup(identityGrid, 'Display name', displayNameInput);
    var ownerInput = createEl('input', 'persona-lab-input');
    ownerInput.value = state.form.definition.owner;
    bindInput(ownerInput, function () {
      state.form.definition.owner = ownerInput.value;
      updateDirtyState(state);
      renderState(state);
    });
    renderFieldGroup(identityGrid, 'Owner', ownerInput);
    identity.appendChild(identityGrid);
    var definitionDescription = createEl('textarea', 'persona-lab-textarea');
    definitionDescription.value = state.form.definition.description;
    bindInput(definitionDescription, function () {
      state.form.definition.description = definitionDescription.value;
      updateDirtyState(state);
    });
    renderFieldGroup(identity, 'Definition description', definitionDescription);
    content.appendChild(identity);

    var promptPanel = createEl('section', 'persona-lab-panel');
    promptPanel.appendChild(createEl('h2', null, 'Prompt + Rules'));
    var summaryInput = createEl('input', 'persona-lab-input');
    summaryInput.value = state.form.draft.summary;
    bindInput(summaryInput, function () {
      state.form.draft.summary = summaryInput.value;
      updateDirtyState(state);
    });
    renderFieldGroup(promptPanel, 'Draft summary', summaryInput);
    var draftDescription = createEl('textarea', 'persona-lab-textarea');
    draftDescription.value = state.form.draft.description;
    bindInput(draftDescription, function () {
      state.form.draft.description = draftDescription.value;
      updateDirtyState(state);
    });
    renderFieldGroup(promptPanel, 'Draft description', draftDescription);
    var promptInput = createEl('textarea', 'persona-lab-textarea');
    promptInput.style.minHeight = '220px';
    promptInput.value = state.form.prompt;
    bindInput(promptInput, function () {
      state.form.prompt = promptInput.value;
      updateDirtyState(state);
    });
    renderFieldGroup(promptPanel, 'System prompt', promptInput);
    appendSectionHeading(
      promptPanel,
      'h3',
      'Rules',
      'Persona rules are saved as an ordered list of behavioral constraints. Example: Always ask one clarifying question before estimating project scope.'
    );
    promptPanel.appendChild(renderRulesEditor(state));
    content.appendChild(promptPanel);

    var policyPanel = createEl('section', 'persona-lab-panel');
    policyPanel.appendChild(createEl('h2', null, 'Models + Tooling'));
    var policyGrid = createEl('div', 'persona-lab-grid');

    renderFieldGroup(
      policyGrid,
      'Default model',
      buildModelSelect(registries, state.form.draft.modelPolicy.defaultModel, function (value) {
        state.form.draft.modelPolicy.defaultModel = value;
        updateDirtyState(state);
      })
    );
    renderFieldGroup(
      policyGrid,
      'Fast model',
      buildModelSelect(registries, state.form.draft.modelPolicy.fastModel || '', function (value) {
        state.form.draft.modelPolicy.fastModel = value;
        updateDirtyState(state);
      })
    );
    renderFieldGroup(
      policyGrid,
      'Reasoning model',
      buildModelSelect(registries, state.form.draft.modelPolicy.reasoningModel || '', function (value) {
        state.form.draft.modelPolicy.reasoningModel = value;
        updateDirtyState(state);
      })
    );
    policyPanel.appendChild(policyGrid);

    var workflowModels = createEl('textarea', 'persona-lab-textarea json');
    workflowModels.value = renderJson(state.form.draft.modelPolicy.workflowModels);
    bindInput(workflowModels, function () {
      try {
        state.form.draft.modelPolicy.workflowModels = parseWorkflowModels(workflowModels.value);
        updateDirtyState(state);
        if (state.error && /workflow model overrides/i.test(state.error)) {
          setError(state, '');
        }
      } catch (error) {
        setError(state, stringifyError(error));
      }
    });
    renderFieldGroup(policyPanel, 'Workflow-specific model overrides (JSON)', workflowModels);

    state.form.draft.orchestration = normalizeOrchestration(state.form.draft.orchestration);
    var orchestration = state.form.draft.orchestration;
    var orchestrationRegistry = ensureObject(registries.orchestration);
    var capabilityOptions = ensureArray(orchestrationRegistry.capabilities);
    if (!capabilityOptions.length) {
      capabilityOptions = [
        { key: 'DISABLED', label: 'Disabled' },
        { key: 'DELEGATE', label: 'Delegate' },
        { key: 'COORDINATOR', label: 'Coordinator' },
        { key: 'COORDINATOR_AND_DELEGATE', label: 'Coordinator + Delegate' },
      ];
    }
    var dispatchModeOptions = ensureArray(orchestrationRegistry.dispatchModes);
    if (!dispatchModeOptions.length) {
      dispatchModeOptions = [
        { key: 'REVIEW', label: 'Review' },
        { key: 'AUTO', label: 'Auto' },
        { key: 'MANUAL', label: 'Manual' },
      ];
    }
    policyPanel.appendChild(createEl('h3', null, 'Orchestration'));
    var orchestrationGrid = createEl('div', 'persona-lab-grid');
    renderFieldGroup(
      orchestrationGrid,
      'Capability',
      buildChoiceSelect(capabilityOptions, orchestration.capability, function (value) {
        state.form.draft.orchestration.capability = value;
        updateDirtyState(state);
      })
    );
    renderFieldGroup(
      orchestrationGrid,
      'Dispatch mode',
      buildChoiceSelect(dispatchModeOptions, orchestration.dispatchMode, function (value) {
        state.form.draft.orchestration.dispatchMode = value;
        updateDirtyState(state);
      })
    );
    var maxParallelInput = createEl('input', 'persona-lab-input');
    maxParallelInput.type = 'number';
    maxParallelInput.min = '1';
    maxParallelInput.max = '10';
    maxParallelInput.step = '1';
    maxParallelInput.value = String(orchestration.maxParallelSubagents);
    bindInput(maxParallelInput, function () {
      state.form.draft.orchestration.maxParallelSubagents = clampInteger(
        maxParallelInput.value,
        1,
        10,
        3
      );
      updateDirtyState(state);
    });
    renderFieldGroup(orchestrationGrid, 'Max parallel subagents', maxParallelInput);
    var maxDepthInput = createEl('input', 'persona-lab-input');
    maxDepthInput.type = 'number';
    maxDepthInput.min = '0';
    maxDepthInput.max = '3';
    maxDepthInput.step = '1';
    maxDepthInput.value = String(orchestration.maxDepth);
    bindInput(maxDepthInput, function () {
      state.form.draft.orchestration.maxDepth = clampInteger(maxDepthInput.value, 0, 3, 1);
      updateDirtyState(state);
    });
    renderFieldGroup(orchestrationGrid, 'Max depth', maxDepthInput);
    policyPanel.appendChild(orchestrationGrid);

    var toolRegistry = ensureObject(registries.toolRegistry);
    var businessToolOptions = ensureArray(toolRegistry.businessToolOptions).length
      ? toolRegistry.businessToolOptions
      : ensureArray(toolRegistry.businessTools);
    var connectorOptions = ensureArray(toolRegistry.connectorOptions).length
      ? toolRegistry.connectorOptions
      : ensureArray(toolRegistry.connectors);

    policyPanel.appendChild(createEl('h3', null, 'Allowed business tools'));
    policyPanel.appendChild(
      buildCheckboxGrid(
        businessToolOptions,
        state.form.draft.toolPolicy.allowedBusinessTools,
        function (key) {
          state.form.draft.toolPolicy.allowedBusinessTools = toggleListValue(
            state.form.draft.toolPolicy.allowedBusinessTools,
            key
          );
          updateDirtyState(state);
          renderState(state);
        }
      )
    );
    policyPanel.appendChild(createEl('h3', null, 'Allowed connectors'));
    policyPanel.appendChild(
      buildCheckboxGrid(
        connectorOptions,
        state.form.draft.toolPolicy.allowedConnectorKeys,
        function (key) {
          state.form.draft.toolPolicy.allowedConnectorKeys = toggleListValue(
            state.form.draft.toolPolicy.allowedConnectorKeys,
            key
          );
          updateDirtyState(state);
          renderState(state);
        }
      )
    );
    content.appendChild(policyPanel);

    var skillPanel = createEl('section', 'persona-lab-panel');
    appendSectionHeading(
      skillPanel,
      'h2',
      'Skills + Workflows',
      'Skills and workflow refs add reusable instructions that are bundled into the saved persona configuration.'
    );
    appendSectionHeading(
      skillPanel,
      'h3',
      'Built-in skills',
      'Select registered skills this persona should receive. Examples: tdd-workflow, solid-review, or a domain-specific analysis skill.'
    );
    skillPanel.appendChild(
      buildCheckboxGrid(
        ensureArray(registries.builtInSkills),
        state.form.draft.builtInSkills,
        function (key) {
          state.form.draft.builtInSkills = toggleListValue(state.form.draft.builtInSkills, key);
          updateDirtyState(state);
          renderState(state);
        }
      )
    );
    appendSectionHeading(
      skillPanel,
      'h3',
      'Workflow refs',
      'Select reusable workflow definitions the persona can follow. Examples: weekly-report-review or customer-escalation-triage.'
    );
    skillPanel.appendChild(
      buildCheckboxGrid(
        ensureArray(registries.workflows),
        state.form.draft.workflowRefs,
        function (key) {
          state.form.draft.workflowRefs = toggleListValue(state.form.draft.workflowRefs, key);
          updateDirtyState(state);
          renderState(state);
        }
      )
    );

    var sandboxMode = createEl('select', 'persona-lab-select');
    [
      { value: 'disabled', label: 'Disabled' },
      { value: 'brokered', label: 'Brokered Cloudflare sandbox' },
    ].forEach(function (entry) {
      var option = document.createElement('option');
      option.value = entry.value;
      option.textContent = entry.label;
      if (state.form.draft.sandboxPolicy.mode === entry.value) option.selected = true;
      sandboxMode.appendChild(option);
    });
    bindInput(sandboxMode, function () {
      if (sandboxMode.value === 'brokered') {
        state.form.draft.sandboxPolicy = {
          mode: 'brokered',
          provider: 'cloudflare-sandbox',
          exportToolName:
            state.form.draft.sandboxPolicy.exportToolName || 'finance_report_export',
        };
      } else {
        state.form.draft.sandboxPolicy = { mode: 'disabled' };
      }
      updateDirtyState(state);
      renderState(state);
    });
    renderFieldGroup(
      skillPanel,
      'Sandbox policy',
      sandboxMode,
      'Controls whether this persona can use the brokered execution sandbox. Example: Brokered Cloudflare sandbox for report generation tasks.'
    );
    if (state.form.draft.sandboxPolicy.mode === 'brokered') {
      var exportTool = createEl('input', 'persona-lab-input');
      exportTool.value = state.form.draft.sandboxPolicy.exportToolName || '';
      bindInput(exportTool, function () {
        state.form.draft.sandboxPolicy.exportToolName = exportTool.value;
        updateDirtyState(state);
      });
      renderFieldGroup(
        skillPanel,
        'Sandbox export tool name',
        exportTool,
        'Tool name exposed for sandbox exports. Use a stable snake_case identifier. Example: finance_report_export.'
      );
    }

    appendSectionHeading(
      skillPanel,
      'h3',
      'Custom skills',
      'Custom skills are persona-local markdown instructions with metadata. Use them for behavior that is not in the shared skill registry.'
    );
    var skillList = createEl('div', 'persona-lab-section-list');
    var customSkillHelp = {
      key: 'Stable machine-readable skill id. Use lowercase kebab-case. Example: renewal-risk-review.',
      title: 'Human-friendly skill name shown in Persona Studio. Example: Renewal Risk Review.',
      summary: 'One sentence describing when this skill applies. Example: Use when assessing account renewal risks before customer outreach.',
      content: 'Markdown instructions passed to the persona. Example: include trigger conditions, required checks, and output format bullets.',
    };
    ensureArray(state.form.customSkills).forEach(function (skill, index) {
      var skillCard = createEl('div', 'persona-lab-skill');
      var skillHeader = createEl('div', 'persona-lab-skill-header');
      skillHeader.appendChild(createEl('strong', null, skill.title || ('Skill ' + (index + 1))));
      var remove = createEl('button', 'persona-lab-button', 'Remove');
      remove.type = 'button';
      remove.addEventListener('click', function () {
        state.form.customSkills.splice(index, 1);
        updateDirtyState(state);
        renderState(state);
      });
      skillHeader.appendChild(remove);
      skillCard.appendChild(skillHeader);
      ['key', 'title', 'summary'].forEach(function (field) {
        var input = createEl('input', 'persona-lab-input');
        input.value = skill[field] || '';
        bindInput(input, function () {
          skill[field] = input.value;
          updateDirtyState(state);
        });
        renderFieldGroup(skillCard, field, input, customSkillHelp[field]);
      });
      var contentInput = createEl('textarea', 'persona-lab-textarea');
      contentInput.style.minHeight = '160px';
      contentInput.value = skill.content || '';
      bindInput(contentInput, function () {
        skill.content = contentInput.value;
        updateDirtyState(state);
      });
      renderFieldGroup(skillCard, 'content', contentInput, customSkillHelp.content);
      skillList.appendChild(skillCard);
    });
    if (!state.form.customSkills.length) {
      skillList.appendChild(createEl('div', 'persona-lab-empty', 'No custom skills yet.'));
    }
    skillPanel.appendChild(skillList);
    var addSkill = createEl('button', 'persona-lab-button', 'Add custom skill');
    addSkill.type = 'button';
    addSkill.addEventListener('click', function () {
      state.form.customSkills.push({
        key: 'custom-skill-' + (state.form.customSkills.length + 1),
        title: 'New custom skill',
        summary: 'Describe what this skill adds.',
        content: 'Add markdown instructions here.',
      });
      updateDirtyState(state);
      renderState(state);
    });
    skillPanel.appendChild(addSkill);
    content.appendChild(skillPanel);

    content.appendChild(renderInspectorPanel(state));

    var promptSnapshot = createEl('section', 'persona-lab-panel');
    promptSnapshot.appendChild(createEl('h2', null, 'Runtime Snapshots'));
    promptSnapshot.appendChild(createEl('h3', null, 'Saved system prompt'));
    promptSnapshot.appendChild(createEl('pre', 'persona-lab-json', state.current.document.prompt || ''));
    promptSnapshot.appendChild(createEl('h3', null, 'Inspector'));
    promptSnapshot.appendChild(createEl('pre', 'persona-lab-json', renderJson(state.current.inspector || {})));
    content.appendChild(promptSnapshot);

    content.appendChild(renderLatestRunPanel(state));
    content.appendChild(renderLatestBatchPanel(state));
    shell.appendChild(content);
    return shell;
  }

  function renderState(state) {
    if (!state.container) return;
    captureScrollPositions(state);
    replaceSessionChrome(state, state.current && state.current.document
      ? SESSION_LABEL + ' · ' + state.current.document.definition.displayName
      : SESSION_LABEL);

    state.container.innerHTML = '';
    var root = createEl('div', 'persona-lab-root');
    root.appendChild(buildNav(state));
    root.appendChild(renderMain(state));
    state.container.appendChild(root);
    var wizard = renderBatchWizard(state);
    if (wizard) {
      state.container.appendChild(wizard);
    }
    var drawer = renderRunDetailDrawer(state);
    if (drawer) {
      state.container.appendChild(drawer);
    }
    restoreScrollPositions(state);
  }

  window.__renderers['persona_lab'] = function renderPersonaLab(container) {
    ensureStyles();
    var state = getSessionState();
    state.container = container;
    renderState(state);
    if (!state.bootstrapLoaded && !state.bootstrapPromise) {
      fetchBootstrap(state);
    }
  };
})();

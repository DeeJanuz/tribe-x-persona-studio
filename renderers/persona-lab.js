// @ts-nocheck
(function () {
  'use strict';

  window.__renderers = window.__renderers || {};

  var GLOBAL_KEY = '__personaLabPluginState';
  var RENDERER_VERSION = '2026-05-12-skill-variable-scroll-anchor-v1';
  var SESSION_LABEL = 'Persona Studio';
  var DEV_CONTROL_PLANE_URL = 'https://dev.app.tribexai.com';
  var LOCAL_CONTROL_PLANE_URL = 'http://127.0.0.1:3000';
  var SYSTEM_PERSONA_GROUP = 'System';
  var UNGROUPED_PERSONA_GROUP = 'Ungrouped';
  var PERSONA_FOLDER_CATEGORY_KEY_PREFIX = 'persona-folder-';
  var CUSTOM_SKILL_DEFAULT_TITLE = 'New custom skill';
  var CUSTOM_SKILL_DEFAULT_SUMMARY = 'Describe what this skill adds.';
  var CUSTOM_SKILL_DEFAULT_CONTENT = 'Add markdown instructions here.';
  var FALLBACK_PERSONA_STUDIO_MODELS = [
    'google/gemini-3-flash-preview',
    'openai/gpt-5-mini',
    'openai/gpt-5',
  ];
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
    if (!window[GLOBAL_KEY] || window[GLOBAL_KEY].rendererVersion !== RENDERER_VERSION) {
      var existingStyle = document.getElementById('parallel-run-workshop-theme');
      if (existingStyle && existingStyle.parentNode) {
        existingStyle.parentNode.removeChild(existingStyle);
      }
      window[GLOBAL_KEY] = {
        rendererVersion: RENDERER_VERSION,
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

  function defaultCustomToolDraft() {
    return {
      toolKey: '',
      label: '',
      description: '',
      connectorLabel: '',
      connectorDescription: '',
      operationKind: 'read',
      metadataText: '{}',
    };
  }

  function defaultCreatePersonaDraft(metadataGroup) {
    return {
      key: '',
      displayName: '',
      description: '',
      metadataGroup: normalizePersonaFolderLabel(metadataGroup),
    };
  }

  function defaultPersonaFolderDraft() {
    return {
      name: '',
      description: '',
    };
  }

  function defaultArchiveConfirmDraft(reason) {
    return {
      reason: String(reason || ''),
      confirmed: false,
    };
  }

  function defaultDeleteConfirmDraft() {
    return {
      confirmation: '',
    };
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
        organizationId: null,
        organizationName: '',
        organizationKind: '',
        showArchivedPersonas: false,
        navGroupExpansion: {},
        personaFolders: [],
        personas: [],
        registries: null,
        assetRegistry: null,
        localMcpCatalog: null,
        localMcpCatalogLoaded: false,
        localMcpCatalogLoading: false,
        localMcpCatalogPromise: null,
        localMcpCatalogError: '',
        customToolDraft: defaultCustomToolDraft(),
        customToolRegistering: false,
        customToolError: '',
        createPersonaModalOpen: false,
        createPersonaDraft: defaultCreatePersonaDraft(''),
        createPersonaSubmitting: false,
        createPersonaError: '',
        createPersonaKeyTouched: false,
        folderCreateModalOpen: false,
        folderDraft: defaultPersonaFolderDraft(),
        folderCreateSubmitting: false,
        folderCreateError: '',
        archiveConfirmModalOpen: false,
        archiveConfirmDraft: defaultArchiveConfirmDraft(),
        archiveConfirmSubmitting: false,
        archiveConfirmError: '',
        deleteConfirmModalOpen: false,
        deleteConfirmDraft: defaultDeleteConfirmDraft(),
        deleteConfirmSubmitting: false,
        deleteConfirmError: '',
        selectedPersonaKey: null,
        loadingPersona: false,
        personaPromise: null,
        current: null,
        form: null,
        dirty: false,
        status: '',
        error: '',
        saving: false,
        archivingPersona: false,
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
        navScrollTop: 0,
        navScrollTargetKey: '',
        navScrollTargetGroupKey: '',
        contentScrollAnchorKey: '',
        contentScrollAnchorTop: 0,
        modalScrollTop: 0,
        drawerScrollTop: 0,
        chromeKey: '',
        ruleEditorIndex: -1,
        ruleEditorDraft: '',
        skillEditorOpen: false,
        skillEditorIndex: -1,
        skillEditorDraft: '',
        skillEditorError: '',
        skillVariableRowSequence: 0,
        expandedCustomSkillIndex: -1,
      };
    }
    return globalState.sessions[sessionId];
  }

  function selectedOrganizationSnapshot() {
    if (
      window.__tribexAiState &&
      typeof window.__tribexAiState.getSnapshot === 'function'
    ) {
      var snapshot = window.__tribexAiState.getSnapshot();
      var organization = snapshot && snapshot.selectedOrganization;
      if (organization && organization.id) {
        return {
          id: String(organization.id),
          name: String(organization.name || organization.slug || organization.id),
          kind: String(organization.kind || ''),
        };
      }
    }
    return { id: null, name: '', kind: '' };
  }

  function syncOrganizationContext(state) {
    var organization = selectedOrganizationSnapshot();
    if (
      state.organizationId === organization.id &&
      state.organizationName === organization.name &&
      state.organizationKind === organization.kind
    ) {
      return false;
    }
    if (state.dirty && state.organizationId !== organization.id) {
      setError(state, 'Organization changed. Unsaved persona edits were discarded so the catalog can reload.');
    }
    state.organizationId = organization.id;
    state.organizationName = organization.name;
    state.organizationKind = organization.kind;
    state.bootstrapLoaded = false;
    state.bootstrapPromise = null;
    state.personas = [];
    state.personaFolders = [];
    state.navGroupExpansion = {};
    state.registries = null;
    state.assetRegistry = null;
    state.customToolDraft = defaultCustomToolDraft();
    state.customToolRegistering = false;
    state.customToolError = '';
    state.createPersonaModalOpen = false;
    state.createPersonaDraft = defaultCreatePersonaDraft('');
    state.createPersonaSubmitting = false;
    state.createPersonaError = '';
    state.createPersonaKeyTouched = false;
    state.folderCreateModalOpen = false;
    state.folderDraft = defaultPersonaFolderDraft();
    state.folderCreateSubmitting = false;
    state.folderCreateError = '';
    state.archiveConfirmModalOpen = false;
    state.archiveConfirmDraft = defaultArchiveConfirmDraft();
    state.archiveConfirmSubmitting = false;
    state.archiveConfirmError = '';
    state.deleteConfirmModalOpen = false;
    state.deleteConfirmDraft = defaultDeleteConfirmDraft();
    state.deleteConfirmSubmitting = false;
    state.deleteConfirmError = '';
    clearSelectedPersona(state);
    return true;
  }

  function selectedConsultantOrganizationId(state) {
    return state.organizationKind === 'CONSULTANT' && state.organizationId
      ? state.organizationId
      : '';
  }

  function hasConsultantOrganizationContext(state) {
    return Boolean(selectedConsultantOrganizationId(state));
  }

  function consultantOrganizationRequiredMessage(state) {
    if (!state.organizationId) {
      return 'Select a consultant organization before opening Persona Studio.';
    }
    return 'Persona Studio authoring is available only for consultant organizations. Select a consultant organization to create and edit personas.';
  }

  function personaAuthoringQuery(state, extra) {
    var query = Object.assign({}, ensureObject(extra));
    var organizationId = selectedConsultantOrganizationId(state);
    if (organizationId) {
      query.organizationId = organizationId;
    }
    return Object.keys(query).length ? query : null;
  }

  function requireConsultantOrganizationContext(state) {
    if (hasConsultantOrganizationContext(state)) {
      return true;
    }
    setError(state, consultantOrganizationRequiredMessage(state));
    renderState(state);
    return false;
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
      '.persona-lab-root{--glass-bg:rgba(255,255,255,0.06);--glass-bg-heavy:rgba(255,255,255,0.1);--glass-blur:12px;--glass-border:rgba(255,255,255,0.1);--glass-shadow:0 8px 32px rgba(0,0,0,0.4);--glass-shadow-elevated:0 12px 40px rgba(0,0,0,0.5);--glass-inset-highlight:inset 0 1px 0 rgba(255,255,255,0.06);--bg-app:#0f1117;--bg-surface:rgba(255,255,255,0.05);--bg-surface-hover:rgba(255,255,255,0.08);--bg-surface-subtle:rgba(255,255,255,0.03);--text-primary:rgba(255,255,255,0.95);--text-secondary:rgba(255,255,255,0.65);--text-tertiary:rgba(255,255,255,0.38);--accent-primary:#818cf8;--accent-primary-hover:#6366f1;--accent-primary-ghost:rgba(129,140,248,0.12);--border-default:rgba(255,255,255,0.08);--border-subtle:rgba(255,255,255,0.04);--border-strong:rgba(255,255,255,0.15);--color-success:#22c55e;--color-success-bg:rgba(34,197,94,0.15);--color-success-text:#86efac;--color-error:#ef4444;--color-error-bg:rgba(239,68,68,0.15);--color-error-text:#fca5a5;--color-warning:#eab308;--color-warning-bg:rgba(234,179,8,0.15);--color-warning-text:#fde047;--color-info:#3b82f6;--color-info-bg:rgba(59,130,246,0.15);--color-info-text:#93bbfd;--font-sans:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;--font-mono:"SF Mono","Fira Code","Cascadia Code",monospace;display:grid;grid-template-columns:304px minmax(0,1fr);height:100%;min-height:0;overflow:hidden;background:var(--bg-app);color:var(--text-primary);font-family:var(--font-sans)}',
      '@media (prefers-color-scheme: light){.persona-lab-root{--glass-bg:rgba(255,255,255,0.7);--glass-bg-heavy:rgba(255,255,255,0.85);--glass-border:rgba(0,0,0,0.08);--glass-shadow:0 8px 32px rgba(0,0,0,0.08);--glass-shadow-elevated:0 12px 40px rgba(0,0,0,0.12);--glass-inset-highlight:inset 0 1px 0 rgba(255,255,255,0.5);--bg-app:#f5f5f7;--bg-surface:rgba(255,255,255,0.8);--bg-surface-hover:rgba(255,255,255,0.95);--bg-surface-subtle:rgba(255,255,255,0.55);--text-primary:rgba(0,0,0,0.87);--text-secondary:rgba(0,0,0,0.62);--text-tertiary:rgba(0,0,0,0.42);--accent-primary:#6366f1;--accent-primary-hover:#4f46e5;--accent-primary-ghost:rgba(99,102,241,0.12);--border-default:rgba(0,0,0,0.08);--border-subtle:rgba(0,0,0,0.04);--border-strong:rgba(0,0,0,0.15);--color-success-text:#16a34a;--color-error-text:#dc2626;--color-warning-text:#ca8a04;--color-info-text:#2563eb}}',
      'html[data-theme="dark"] .persona-lab-root{--glass-bg:rgba(255,255,255,0.06);--glass-bg-heavy:rgba(255,255,255,0.1);--glass-border:rgba(255,255,255,0.1);--glass-shadow:0 8px 32px rgba(0,0,0,0.4);--glass-shadow-elevated:0 12px 40px rgba(0,0,0,0.5);--glass-inset-highlight:inset 0 1px 0 rgba(255,255,255,0.06);--bg-app:#0f1117;--bg-surface:rgba(255,255,255,0.05);--bg-surface-hover:rgba(255,255,255,0.08);--bg-surface-subtle:rgba(255,255,255,0.03);--text-primary:rgba(255,255,255,0.95);--text-secondary:rgba(255,255,255,0.65);--text-tertiary:rgba(255,255,255,0.38);--accent-primary:#818cf8;--accent-primary-hover:#6366f1;--accent-primary-ghost:rgba(129,140,248,0.12);--border-default:rgba(255,255,255,0.08);--border-subtle:rgba(255,255,255,0.04);--border-strong:rgba(255,255,255,0.15);--color-success-text:#86efac;--color-error-text:#fca5a5;--color-warning-text:#fde047;--color-info-text:#93bbfd}',
      'html[data-theme="light"] .persona-lab-root{--glass-bg:rgba(255,255,255,0.7);--glass-bg-heavy:rgba(255,255,255,0.85);--glass-border:rgba(0,0,0,0.08);--glass-shadow:0 8px 32px rgba(0,0,0,0.08);--glass-shadow-elevated:0 12px 40px rgba(0,0,0,0.12);--glass-inset-highlight:inset 0 1px 0 rgba(255,255,255,0.5);--bg-app:#f5f5f7;--bg-surface:rgba(255,255,255,0.8);--bg-surface-hover:rgba(255,255,255,0.95);--bg-surface-subtle:rgba(255,255,255,0.55);--text-primary:rgba(0,0,0,0.87);--text-secondary:rgba(0,0,0,0.62);--text-tertiary:rgba(0,0,0,0.42);--accent-primary:#6366f1;--accent-primary-hover:#4f46e5;--accent-primary-ghost:rgba(99,102,241,0.12);--border-default:rgba(0,0,0,0.08);--border-subtle:rgba(0,0,0,0.04);--border-strong:rgba(0,0,0,0.15);--color-success-text:#16a34a;--color-error-text:#dc2626;--color-warning-text:#ca8a04;--color-info-text:#2563eb}',
      '.persona-lab-root,.persona-lab-root *{box-sizing:border-box}',
      '.persona-lab-root button,.persona-lab-root input,.persona-lab-root textarea,.persona-lab-root select{font:inherit}',
      '.persona-lab-root code{font-family:var(--font-mono)}',
      '@keyframes persona-lab-stagger-fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
      '.persona-lab-nav,.persona-lab-panel,.persona-lab-run-card,.persona-lab-skill,.persona-lab-kv-item,.persona-lab-metric-card,.persona-lab-run-metric,.persona-lab-summary-banner,.persona-lab-review-item,.persona-lab-choice,.persona-lab-toolbar,.persona-lab-modal,.persona-lab-drawer{background:var(--glass-bg);backdrop-filter:blur(var(--glass-blur));-webkit-backdrop-filter:blur(var(--glass-blur));border:1px solid var(--glass-border);box-shadow:var(--glass-shadow),var(--glass-inset-highlight)}',
      '.persona-lab-nav{padding:18px;display:flex;flex-direction:column;gap:14px;height:100%;min-height:0;overflow:hidden;background:var(--glass-bg-heavy)}',
      '.persona-lab-nav-header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
      '.persona-lab-nav-controls{display:flex;flex-direction:column;align-items:stretch;gap:10px}',
      '.persona-lab-nav-controls>.persona-lab-button{width:100%}',
      '.persona-lab-segmented{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px;padding:3px;border:1px solid var(--glass-border);border-radius:12px;background:var(--bg-surface-subtle)}',
      '.persona-lab-segmented button{appearance:none;min-height:30px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--text-secondary);font-size:12px;font-weight:700;cursor:pointer}',
      '.persona-lab-segmented button:hover:not(:disabled){color:var(--text-primary);background:var(--bg-surface-hover)}',
      '.persona-lab-segmented button.active{color:var(--text-primary);background:var(--accent-primary-ghost);border-color:rgba(129,140,248,.28)}',
      '.persona-lab-segmented button:disabled{cursor:not-allowed;opacity:.6}',
      '.persona-lab-nav-title{margin:0;font-size:11px;letter-spacing:0;text-transform:uppercase;color:var(--text-tertiary);font-weight:700}',
      '.persona-lab-nav-header strong{display:block;margin-top:4px;font-size:18px;line-height:1.2}',
      '.persona-lab-toggle{display:inline-flex;align-items:center;gap:8px;cursor:pointer;color:var(--text-secondary);font-size:12px;font-weight:700;line-height:1.3;user-select:none}',
      '.persona-lab-toggle input{width:16px;height:16px;accent-color:var(--accent-primary);cursor:pointer}',
      '.persona-lab-nav-list{display:flex;flex:1 1 auto;min-height:0;max-height:100%;flex-direction:column;gap:4px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding-right:4px;padding-bottom:12px;scrollbar-width:thin;scrollbar-color:rgba(127,127,127,.3) transparent}',
      '.persona-lab-nav-list::-webkit-scrollbar,.persona-lab-content::-webkit-scrollbar,.persona-lab-modal::-webkit-scrollbar,.persona-lab-drawer-body::-webkit-scrollbar{width:8px;height:8px}',
      '.persona-lab-nav-list::-webkit-scrollbar-thumb,.persona-lab-content::-webkit-scrollbar-thumb,.persona-lab-modal::-webkit-scrollbar-thumb,.persona-lab-drawer-body::-webkit-scrollbar-thumb{background:rgba(127,127,127,.28);border-radius:999px}',
      '.persona-lab-nav-group{flex:0 0 auto;border-radius:8px;overflow:hidden}',
      '.persona-lab-nav-group-summary{list-style:none;display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;gap:6px;min-height:28px;padding:4px 6px;border-radius:6px;color:var(--text-secondary);cursor:pointer;font-size:11px;font-weight:800;letter-spacing:0;text-transform:uppercase}',
      '.persona-lab-nav-group-summary::-webkit-details-marker{display:none}',
      '.persona-lab-nav-group-summary:hover{background:var(--bg-surface-subtle);color:var(--text-primary)}',
      '.persona-lab-nav-group-name{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.persona-lab-nav-group-count{font-size:10px;color:var(--text-tertiary);font-weight:800}',
      '.persona-lab-nav-group-children{display:flex;flex-direction:column;gap:1px;margin:1px 0 7px 11px;padding-left:7px;border-left:1px solid var(--border-default)}',
      '.persona-lab-nav-folder-empty{display:flex;flex-direction:column;gap:8px;margin:3px 0 8px;padding:10px;border:1px dashed var(--glass-border);border-radius:8px;background:var(--bg-surface-subtle);color:var(--text-secondary);font-size:12px;line-height:1.4}',
      '.persona-lab-nav-folder-empty .persona-lab-button{align-self:flex-start}',
      '.persona-lab-nav-group-caret{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;color:var(--text-tertiary);font-size:12px;transition:transform .15s ease}',
      '.persona-lab-nav-group[open]>.persona-lab-nav-group-summary .persona-lab-nav-group-caret{transform:rotate(90deg)}',
      '.persona-lab-nav-item{appearance:none;width:100%;border:1px solid transparent;border-radius:6px;padding:5px 7px;background:transparent;cursor:pointer;display:grid;grid-template-columns:16px minmax(0,1fr) auto;align-items:center;gap:7px;color:var(--text-primary);text-align:left;transition:border-color .12s ease,background .12s ease,color .12s ease;animation:persona-lab-stagger-fade-in .18s ease both}',
      '.persona-lab-nav-item:hover{background:var(--bg-surface-subtle);border-color:var(--border-default)}',
      '.persona-lab-nav-item.active{border-color:rgba(129,140,248,.35);background:var(--accent-primary-ghost)}',
      '.persona-lab-nav-item.archived{opacity:.72}',
      '.persona-lab-nav-file-icon{width:9px;height:11px;border:1px solid var(--text-tertiary);border-radius:2px;opacity:.78}',
      '.persona-lab-nav-item-copy{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.persona-lab-nav-item code{display:block;font-size:10px;color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.persona-lab-nav-item-title{min-width:0;font-weight:600;font-size:13px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.persona-lab-nav-item-meta{display:flex;align-items:center;justify-content:flex-end;gap:4px;min-width:0}',
      '.persona-lab-nav-item-meta .persona-lab-badge{padding:2px 6px;font-size:10px}',
      '.persona-lab-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;border:1px solid transparent;background:var(--bg-surface);color:var(--text-secondary);font-size:11px;font-weight:600;line-height:1.2}',
      '.persona-lab-badge.dirty{background:var(--color-warning-bg);color:var(--color-warning-text)}',
      '.persona-lab-badge.archived{background:var(--color-warning-bg);color:var(--color-warning-text)}',
      '.persona-lab-badge.status-succeeded,.persona-lab-badge.status-completed{background:var(--color-success-bg);color:var(--color-success-text)}',
      '.persona-lab-badge.status-running,.persona-lab-badge.status-pending,.persona-lab-badge.status-created{background:var(--color-info-bg);color:var(--color-info-text)}',
      '.persona-lab-badge.status-failed,.persona-lab-badge.status-cancelled,.persona-lab-badge.status-partial_failed{background:var(--color-error-bg);color:var(--color-error-text)}',
      '.persona-lab-chip{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:var(--bg-surface-subtle);border:1px solid var(--glass-border);font-size:12px;font-weight:600;color:var(--text-primary)}',
      '.persona-lab-chip-label{font-size:10px;letter-spacing:0;text-transform:uppercase;color:var(--text-tertiary)}',
      '.persona-lab-shell{display:flex;flex-direction:column;min-width:0;min-height:0;padding:18px 18px 18px 0;gap:14px}',
      '.persona-lab-toolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px 22px;border-radius:var(--border-radius-lg);animation:persona-lab-stagger-fade-in .28s ease both}',
      '.persona-lab-toolbar h1{margin:4px 0 0;font-size:30px;line-height:1.05;letter-spacing:0}',
      '.persona-lab-toolbar p{margin:8px 0 0;color:var(--text-secondary);max-width:760px;line-height:1.6}',
      '.persona-lab-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}',
      '.persona-lab-button{appearance:none;border:1px solid var(--glass-border);background:var(--bg-surface-subtle);color:var(--text-primary);border-radius:12px;padding:10px 14px;font-weight:600;cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease,color .15s ease}',
      '.persona-lab-button.small{padding:7px 10px;border-radius:10px;font-size:12px}',
      '.persona-lab-button:hover:not(:disabled){border-color:var(--accent-primary);background:var(--bg-surface)}',
      '.persona-lab-button.primary{background:var(--accent-primary);border-color:var(--accent-primary);color:#fff}',
      '.persona-lab-button.danger{background:var(--color-error-bg);border-color:rgba(239,68,68,.25);color:var(--color-error-text)}',
      '.persona-lab-button:focus-visible,.persona-lab-input:focus-visible,.persona-lab-textarea:focus-visible,.persona-lab-select:focus-visible,.persona-lab-model-trigger:focus-visible{outline:none;border-color:var(--accent-primary);box-shadow:0 0 0 3px var(--accent-primary-ghost)}',
      '.persona-lab-button:disabled{cursor:not-allowed;opacity:.72;transform:none;background:var(--bg-surface-subtle);color:var(--text-tertiary)}',
      '.persona-lab-button.primary:disabled{box-shadow:none}',
      '.persona-lab-status-stack{display:flex;flex-direction:column;gap:10px;max-width:920px}',
      '.persona-lab-status,.persona-lab-error{font-size:13px;line-height:1.5;min-height:0;padding:0;white-space:pre-wrap}',
      '.persona-lab-status:not(:empty){padding:12px 14px;border-radius:14px;background:var(--color-info-bg);border:1px solid rgba(59,130,246,.18);color:var(--color-info-text)}',
      '.persona-lab-error:not(:empty){padding:12px 14px;border-radius:14px;background:var(--color-error-bg);border:1px solid rgba(239,68,68,.2);color:var(--color-error-text)}',
      '.persona-lab-content{overflow:auto;padding:2px 0 16px 0;display:flex;flex-direction:column;gap:18px;min-height:0}',
      '.persona-lab-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}',
      '.persona-lab-panel{border-radius:var(--border-radius-lg);padding:18px;display:flex;flex-direction:column;gap:14px;animation:persona-lab-stagger-fade-in .3s ease both}',
      '.persona-lab-panel.compact{gap:10px}',
      '.persona-lab-panel h2,.persona-lab-panel h3{margin:0;font-size:18px;line-height:1.25;letter-spacing:0}',
      '.persona-lab-panel p{margin:0;color:var(--text-secondary);line-height:1.6}',
      '.persona-lab-field{display:flex;flex-direction:column;gap:8px}',
      '.persona-lab-field label{font-size:12px;font-weight:700;letter-spacing:0;text-transform:uppercase;color:var(--text-tertiary)}',
      '.persona-lab-field-label-row,.persona-lab-heading-row{display:flex;align-items:center;gap:8px;min-width:0}',
      '.persona-lab-heading-row h2,.persona-lab-heading-row h3{min-width:0}',
      '.persona-lab-tooltip{appearance:none;position:relative;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:19px;height:19px;padding:0;border-radius:999px;border:1px solid var(--glass-border);background:var(--bg-surface-subtle);color:var(--text-secondary);font-size:12px;font-weight:800;line-height:1;cursor:help}',
      '.persona-lab-tooltip:hover,.persona-lab-tooltip:focus-visible{border-color:var(--accent-primary);color:var(--text-primary);outline:none}',
      '.persona-lab-floating-tooltip{position:fixed;left:0;top:0;z-index:10050;width:min(360px,calc(100vw - 32px));padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(15,17,23,.96);box-shadow:0 18px 48px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06);color:rgba(255,255,255,.76);font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:12px;font-weight:500;line-height:1.5;text-align:left;white-space:normal;opacity:0;pointer-events:none;transform:translateY(4px);transition:opacity .12s ease,transform .12s ease}',
      '.persona-lab-floating-tooltip.visible{opacity:1;transform:translateY(0)}',
      '.persona-lab-floating-tooltip p{margin:0}',
      '.persona-lab-floating-tooltip-example{margin-top:9px;padding:9px 10px;border-left:2px solid #818cf8;border-radius:10px;background:rgba(129,140,248,.13);color:rgba(255,255,255,.92);font-weight:650}',
      'html[data-theme="light"] .persona-lab-floating-tooltip{border-color:rgba(0,0,0,.12);background:rgba(255,255,255,.98);box-shadow:0 18px 48px rgba(15,23,42,.16),inset 0 1px 0 rgba(255,255,255,.7);color:rgba(0,0,0,.68)}',
      'html[data-theme="light"] .persona-lab-floating-tooltip-example{background:rgba(99,102,241,.11);color:rgba(0,0,0,.86)}',
      '.persona-lab-input,.persona-lab-textarea,.persona-lab-select{width:100%;border:1px solid var(--glass-border);border-radius:14px;padding:12px 14px;background:var(--bg-surface-subtle);color:var(--text-primary)}',
      '.persona-lab-model-select{position:relative;width:100%}',
      '.persona-lab-model-select.open{z-index:10002}',
      '.persona-lab-model-trigger{appearance:none;width:100%;min-height:46px;border:1px solid var(--glass-border);border-radius:14px;padding:9px 12px;background:var(--bg-surface-subtle);color:var(--text-primary);display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;text-align:left;cursor:pointer;transition:border-color .15s ease,background .15s ease,box-shadow .15s ease}',
      '.persona-lab-model-trigger:hover{border-color:var(--accent-primary);background:var(--bg-surface)}',
      '.persona-lab-model-trigger:disabled{cursor:not-allowed;opacity:.72;color:var(--text-tertiary)}',
      '.persona-lab-model-trigger-copy{min-width:0;display:flex;flex-direction:column;gap:3px}',
      '.persona-lab-model-trigger-label{font-size:13px;font-weight:700;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary)}',
      '.persona-lab-model-trigger-provider{font-size:11px;font-weight:700;letter-spacing:0;text-transform:uppercase;line-height:1.2;color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.persona-lab-model-trigger-icon{font-size:14px;color:var(--text-tertiary);transition:transform .15s ease}',
      '.persona-lab-model-select.open .persona-lab-model-trigger-icon{transform:rotate(180deg)}',
      '.persona-lab-model-menu{position:absolute;left:0;right:0;top:calc(100% + 8px);z-index:10003;display:none;max-height:min(420px,48vh);overflow:auto;padding:8px;border:1px solid var(--glass-border);border-radius:16px;background:var(--bg-app);box-shadow:var(--glass-shadow-elevated),var(--glass-inset-highlight);scrollbar-width:thin;scrollbar-color:rgba(127,127,127,.3) transparent}',
      '.persona-lab-model-select.open .persona-lab-model-menu{display:flex;flex-direction:column;gap:6px}',
      '.persona-lab-model-menu::-webkit-scrollbar{width:8px}',
      '.persona-lab-model-menu::-webkit-scrollbar-thumb{background:rgba(127,127,127,.28);border-radius:999px}',
      '.persona-lab-model-empty,.persona-lab-model-option,.persona-lab-model-provider-toggle{appearance:none;width:100%;border:1px solid transparent;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer}',
      '.persona-lab-model-empty,.persona-lab-model-option{border-radius:12px;padding:9px 10px;display:flex;flex:0 0 auto;flex-direction:column;gap:3px}',
      '.persona-lab-model-empty:hover,.persona-lab-model-option:hover,.persona-lab-model-option.active{border-color:var(--accent-primary);background:var(--bg-surface)}',
      '.persona-lab-model-empty.active,.persona-lab-model-option.active{background:var(--accent-primary-ghost)}',
      '.persona-lab-model-provider{flex:0 0 auto;border-radius:14px;background:var(--bg-surface-subtle);overflow:hidden}',
      '.persona-lab-model-provider-toggle{padding:10px;display:grid;flex:0 0 auto;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;border-radius:14px;font-size:12px;font-weight:800;letter-spacing:0;text-transform:uppercase;color:var(--text-secondary)}',
      '.persona-lab-model-provider-toggle:hover{background:var(--bg-surface)}',
      '.persona-lab-model-provider-caret{font-size:12px;color:var(--text-tertiary);transition:transform .15s ease}',
      '.persona-lab-model-provider.expanded .persona-lab-model-provider-caret{transform:rotate(90deg)}',
      '.persona-lab-model-provider-name{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.persona-lab-model-provider-count{font-size:11px;color:var(--text-tertiary);font-weight:800}',
      '.persona-lab-model-provider-options{display:none;padding:0 6px 7px}',
      '.persona-lab-model-provider.expanded .persona-lab-model-provider-options{display:flex;flex:0 0 auto;flex-direction:column;gap:4px}',
      '.persona-lab-model-option-label{font-size:13px;font-weight:700;line-height:1.3;color:var(--text-primary);overflow-wrap:anywhere}',
      '.persona-lab-model-option-id{font-size:11px;line-height:1.35;color:var(--text-tertiary);font-family:var(--font-mono);overflow-wrap:anywhere}',
      '.persona-lab-model-price{font-size:11px;line-height:1.35;color:var(--text-secondary);overflow-wrap:anywhere}',
      '.persona-lab-model-empty .persona-lab-model-option-id{font-family:var(--font-sans)}',
      '.persona-lab-input::placeholder,.persona-lab-textarea::placeholder{color:var(--text-tertiary)}',
      '.persona-lab-textarea{min-height:110px;resize:vertical;line-height:1.55}',
      '.persona-lab-textarea.json{min-height:140px;font-family:var(--font-mono);font-size:12px}',
      '.persona-lab-rule-editor{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr);gap:12px;align-items:start}',
      '.persona-lab-rule-list{display:flex;flex-direction:column;gap:8px}',
      '.persona-lab-rule-item{appearance:none;width:100%;border:1px solid var(--glass-border);border-radius:14px;background:var(--bg-surface-subtle);color:var(--text-primary);padding:10px 12px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:5px;transition:border-color .15s ease,background .15s ease}',
      '.persona-lab-rule-item:hover,.persona-lab-rule-item.active{border-color:var(--accent-primary);background:var(--bg-surface)}',
      '.persona-lab-rule-item span{font-size:11px;letter-spacing:0;text-transform:uppercase;color:var(--text-tertiary);font-weight:800}',
      '.persona-lab-rule-item strong{font-size:13px;line-height:1.35;font-weight:600;color:var(--text-primary)}',
      '.persona-lab-rule-controls{display:flex;flex-direction:column;gap:10px;min-width:0}',
      '.persona-lab-details{overflow:hidden}',
      '.persona-lab-details-summary{list-style:none;cursor:pointer}',
      '.persona-lab-details-summary::-webkit-details-marker{display:none}',
      '.persona-lab-details-caret{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;color:var(--text-tertiary);font-size:13px;transition:transform .15s ease}',
      '.persona-lab-details[open]>.persona-lab-details-summary .persona-lab-details-caret{transform:rotate(90deg)}',
      '.persona-lab-details-body{display:flex;flex-direction:column;gap:12px;padding:14px;border-top:1px solid var(--glass-border)}',
      '.persona-lab-choice-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}',
      '.persona-lab-choice{display:flex;align-items:flex-start;gap:10px;border-radius:16px;padding:12px;background:var(--bg-surface-subtle)}',
      '.persona-lab-choice input{margin-top:2px}',
      '.persona-lab-choice strong,.persona-lab-choice code{display:block}',
      '.persona-lab-choice strong{margin-bottom:4px}',
      '.persona-lab-choice code{font-size:11px;color:var(--text-tertiary)}',
      '.persona-lab-choice-variable-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
      '.persona-lab-inline{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.persona-lab-runtime-tools{display:flex;flex-direction:column;gap:12px}',
      '.persona-lab-tool-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.persona-lab-tool-toolbar .persona-lab-input{max-width:360px}',
      '.persona-lab-tool-toolbar-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.persona-lab-tool-group{border:1px solid var(--glass-border);border-radius:18px;background:var(--bg-surface-subtle);overflow:hidden}',
      '.persona-lab-tool-group-header{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--bg-surface-subtle)}',
      '.persona-lab-tool-group[open]>.persona-lab-tool-group-header{border-bottom:1px solid var(--glass-border)}',
      '.persona-lab-tool-group-header strong{display:block;font-size:14px;line-height:1.3}',
      '.persona-lab-tool-group-header code{display:block;margin-top:4px;font-size:11px;color:var(--text-tertiary)}',
      '.persona-lab-tool-group-meta{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap}',
      '.persona-lab-tool-list{display:flex;flex-direction:column}',
      '.persona-lab-tool-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:start;padding:12px 14px;border-top:1px solid var(--border-subtle)}',
      '.persona-lab-tool-row:first-child{border-top:none}',
      '.persona-lab-tool-row input{margin-top:4px}',
      '.persona-lab-tool-copy{display:flex;flex-direction:column;gap:5px;min-width:0}',
      '.persona-lab-tool-copy strong{font-size:13px;line-height:1.35}',
      '.persona-lab-tool-copy code{font-size:11px;color:var(--text-tertiary);word-break:break-all}',
      '.persona-lab-tool-row.hidden,.persona-lab-tool-group.hidden{display:none}',
      '.persona-lab-variable-list{display:flex;flex-direction:column;gap:10px}',
      '.persona-lab-variable-row{display:grid;grid-template-columns:minmax(120px,1fr) minmax(140px,1fr) minmax(120px,.8fr) minmax(120px,1fr) auto auto;gap:8px;align-items:end;padding:10px;border:1px solid var(--glass-border);border-radius:14px;background:var(--bg-surface-subtle)}',
      '.persona-lab-variable-row .persona-lab-field{gap:5px}',
      '.persona-lab-variable-required{align-self:center;margin-bottom:11px}',
      '.persona-lab-section-list{display:flex;flex-direction:column;gap:12px}',
      '.persona-lab-skill{border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:12px;background:var(--bg-surface-subtle)}',
      '.persona-lab-skill.persona-lab-details{padding:0}',
      '.persona-lab-skill>.persona-lab-details-summary{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:14px}',
      '.persona-lab-skill>.persona-lab-details-summary strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.persona-lab-skill-summary-copy{min-width:0;display:flex;flex-direction:column;gap:3px}',
      '.persona-lab-skill-summary-copy strong{display:block;font-size:15px;line-height:1.25}',
      '.persona-lab-skill-summary-meta{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-tertiary);font-size:12px;line-height:1.25}',
      '.persona-lab-skill-header{display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.persona-lab-skill-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}',
      '.persona-lab-skill-meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
      '.persona-lab-skill-prompt-panel{display:flex;flex-direction:column;gap:12px;padding:12px;border:1px solid var(--glass-border);border-radius:14px;background:var(--bg-surface-subtle)}',
      '.persona-lab-skill-preview{margin:0;max-height:132px;overflow:auto;white-space:pre-wrap;word-break:break-word;border:1px solid var(--glass-border);border-radius:14px;padding:12px;background:rgba(15,23,42,.38);color:var(--text-secondary);font-size:12px;line-height:1.5}',
      'html[data-theme="light"] .persona-lab-skill-preview,.persona-lab-root[data-theme="light"] .persona-lab-skill-preview{background:rgba(255,255,255,.58)}',
      '.persona-lab-skill-editor-tools{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px;border:1px solid var(--glass-border);border-radius:14px;background:var(--bg-surface-subtle)}',
      '.persona-lab-skill-editor-tools .persona-lab-helper{max-width:520px}',
      '.persona-lab-variable-picker{position:relative;z-index:20}',
      '.persona-lab-variable-picker[open]{z-index:10020}',
      '.persona-lab-variable-picker>summary{list-style:none}',
      '.persona-lab-variable-picker>summary::-webkit-details-marker{display:none}',
      '.persona-lab-variable-picker-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:10021;width:min(360px,72vw);display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--border-strong);border-radius:14px;background:var(--bg-app);box-shadow:0 18px 48px rgba(0,0,0,.55),var(--glass-inset-highlight)}',
      '.persona-lab-variable-picker-list{display:flex;flex-direction:column;gap:6px;max-height:240px;overflow:auto}',
      '.persona-lab-variable-token{appearance:none;width:100%;border:1px solid var(--glass-border);border-radius:10px;padding:8px 10px;background:var(--bg-surface-hover);color:var(--text-primary);cursor:pointer;text-align:left;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}',
      '.persona-lab-variable-token:hover{border-color:var(--accent-primary);background:var(--accent-primary-ghost)}',
      '.persona-lab-variable-token code{font-size:12px;color:var(--color-info-text);white-space:nowrap}',
      '.persona-lab-skill-editor{min-height:min(52vh,520px);font-family:var(--font-mono);font-size:12px}',
      '.persona-lab-json{margin:0;white-space:pre-wrap;word-break:break-word;background:rgba(15,23,42,.88);color:#e5eefc;border-radius:16px;padding:14px;font-size:12px;line-height:1.55;overflow:auto;border:1px solid rgba(148,163,184,.2)}',
      'html[data-theme="light"] .persona-lab-json,.persona-lab-root[data-theme="light"] .persona-lab-json{background:rgba(15,23,42,.96);color:#e5eefc}',
      '.persona-lab-list{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;color:var(--text-secondary)}',
      '.persona-lab-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}',
      '.persona-lab-kv-item{border-radius:16px;padding:12px;background:var(--bg-surface-subtle)}',
      '.persona-lab-kv-item span{display:block;font-size:11px;color:var(--text-tertiary);margin-bottom:6px;text-transform:uppercase;letter-spacing:0;font-weight:700}',
      '.persona-lab-empty{padding:24px;border:1px dashed var(--glass-border);border-radius:18px;background:var(--bg-surface-subtle);color:var(--text-secondary);line-height:1.6}',
      '.persona-lab-confirmation-card{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:16px;border:1px solid rgba(234,179,8,.22);background:var(--color-warning-bg);color:var(--text-primary);line-height:1.5}',
      '.persona-lab-confirmation-card.danger{border-color:rgba(239,68,68,.28);background:var(--color-error-bg)}',
      '.persona-lab-confirmation-card strong{font-size:14px}',
      '.persona-lab-confirmation-card p{margin:0;color:var(--text-secondary)}',
      '.persona-lab-run-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}',
      '.persona-lab-run-card{border-radius:var(--border-radius-md);padding:18px;display:flex;flex-direction:column;gap:14px;background:var(--glass-bg);animation:persona-lab-stagger-fade-in .3s ease both}',
      '.persona-lab-run-card.persona-lab-details{padding:0;gap:0}',
      '.persona-lab-run-card>.persona-lab-details-summary{padding:18px}',
      '.persona-lab-run-card>.persona-lab-details-body{padding:18px}',
      '.persona-lab-run-card-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}',
      '.persona-lab-run-card-header strong{display:block;font-size:19px;line-height:1.15}',
      '.persona-lab-run-eyebrow{font-size:11px;letter-spacing:0;text-transform:uppercase;color:var(--text-tertiary);font-weight:700}',
      '.persona-lab-run-subtitle{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
      '.persona-lab-run-note{font-size:12px;color:var(--text-secondary);line-height:1.6}',
      '.persona-lab-run-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.persona-lab-run-metric,.persona-lab-metric-card{border-radius:16px;padding:12px;background:var(--bg-surface-subtle)}',
      '.persona-lab-run-metric span,.persona-lab-metric-card span{display:block;font-size:11px;letter-spacing:0;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:6px;font-weight:700}',
      '.persona-lab-run-metric strong,.persona-lab-metric-card strong{display:block;font-size:18px;line-height:1.15;color:var(--text-primary)}',
      '.persona-lab-run-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.persona-lab-run-actions-copy{display:flex;flex-direction:column;gap:4px;min-width:180px}',
      '.persona-lab-run-actions-buttons{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}',
      '.persona-lab-helper{font-size:12px;color:var(--text-secondary);line-height:1.5}',
      '.persona-lab-overlay,.persona-lab-drawer-overlay{position:fixed;inset:0;background:rgba(6,10,24,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;z-index:9999}',
      '.persona-lab-overlay{align-items:center;justify-content:center;padding:20px}',
      '.persona-lab-modal{width:min(980px,100%);max-height:min(88vh,900px);overflow:auto;border-radius:var(--border-radius-lg);display:flex;flex-direction:column;background:var(--bg-app)}',
      '.persona-lab-modal-header,.persona-lab-modal-footer{padding:22px;border-bottom:1px solid var(--glass-border);display:flex;align-items:flex-start;justify-content:space-between;gap:16px}',
      '.persona-lab-modal-header h2{margin:4px 0 0;font-size:24px;line-height:1.1;letter-spacing:0}',
      '.persona-lab-modal-header p{margin:8px 0 0;color:var(--text-secondary);max-width:720px;line-height:1.6}',
      '.persona-lab-modal-body{padding:22px;display:flex;flex-direction:column;gap:18px}',
      '.persona-lab-modal-footer{border-top:1px solid var(--glass-border);border-bottom:none;align-items:center;flex-wrap:wrap}',
      '.persona-lab-stepper{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.persona-lab-step{display:flex;align-items:center;justify-content:center;padding:12px 14px;border-radius:16px;background:var(--bg-surface-subtle);border:1px solid var(--glass-border);font-size:12px;font-weight:700;letter-spacing:0;text-transform:uppercase;color:var(--text-tertiary)}',
      '.persona-lab-step.active{border-color:rgba(129,140,248,.38);background:var(--accent-primary-ghost);color:var(--text-primary)}',
      '.persona-lab-review-list,.persona-lab-comparison-list,.persona-lab-turn-list{display:flex;flex-direction:column;gap:10px}',
      '.persona-lab-review-item,.persona-lab-comparison-item,.persona-lab-turn-card{border-radius:16px;padding:12px;background:var(--bg-surface-subtle)}',
      '.persona-lab-comparison-item{display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.persona-lab-comparison-item strong,.persona-lab-turn-card h4{display:block;margin:0 0 8px}',
      '.persona-lab-summary-banner{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:14px 16px;border-radius:18px;background:var(--bg-surface)}',
      '.persona-lab-summary-banner.success{border-color:rgba(34,197,94,.24);background:var(--color-success-bg)}',
      '.persona-lab-summary-banner.warning{border-color:rgba(234,179,8,.24);background:var(--color-warning-bg)}',
      '.persona-lab-metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}',
      '.persona-lab-drawer-overlay{justify-content:flex-end;z-index:10000}',
      '.persona-lab-drawer{width:min(760px,100%);height:100%;border-left:1px solid var(--glass-border);display:flex;flex-direction:column;background:var(--bg-app)}',
      '.persona-lab-drawer-header{padding:20px 22px 16px;border-bottom:1px solid var(--glass-border);display:flex;align-items:flex-start;justify-content:space-between;gap:16px}',
      '.persona-lab-drawer-header h2{margin:4px 0 0;font-size:22px;line-height:1.1;letter-spacing:0}',
      '.persona-lab-drawer-header p{margin:8px 0 0;color:var(--text-secondary);line-height:1.6}',
      '.persona-lab-drawer-body{padding:18px 22px 24px;overflow:auto;display:flex;flex-direction:column;gap:16px}',
      '@media (max-width: 1100px){.persona-lab-root{grid-template-columns:1fr}.persona-lab-nav{margin:18px 18px 0;border-radius:var(--border-radius-lg)}.persona-lab-shell{padding-left:18px}.persona-lab-grid,.persona-lab-stepper,.persona-lab-rule-editor,.persona-lab-variable-row,.persona-lab-skill-meta-grid{grid-template-columns:1fr}}',
      '@media (max-width: 820px){.persona-lab-overlay{padding:12px}.persona-lab-modal{max-height:92vh}.persona-lab-modal-header,.persona-lab-modal-body,.persona-lab-modal-footer,.persona-lab-drawer-header,.persona-lab-drawer-body{padding-left:16px;padding-right:16px}.persona-lab-run-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.persona-lab-toolbar{flex-direction:column}.persona-lab-shell{padding-top:0}.persona-lab-model-menu{max-height:52vh}}',
      '.persona-lab-root{--text-secondary:rgba(255,255,255,0.6);--text-tertiary:rgba(255,255,255,0.35);--accent-primary-ghost:rgba(129,140,248,0.1);--border-radius-sm:4px;--border-radius-md:8px;--border-radius-lg:12px;--border-radius-pill:999px;--text-h1:24px;--text-h2:20px;--text-h3:16px;--text-body:14px;--text-small:12px;--text-xs:11px;--weight-regular:400;--weight-medium:500;--weight-semibold:600;--weight-bold:700;--leading-tight:1.3;--leading-normal:1.6;--space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;--space-8:32px;--transition-fast:.15s ease;--transition-normal:.25s ease;--scrollbar-thumb:rgba(255,255,255,.12);--scrollbar-thumb-hover:rgba(255,255,255,.2);background:var(--bg-app);font-size:var(--text-body);line-height:var(--leading-normal)}',
      '@media (prefers-color-scheme: light){.persona-lab-root{--text-secondary:rgba(0,0,0,0.6);--text-tertiary:rgba(0,0,0,0.38);--accent-primary-ghost:rgba(99,102,241,0.1);--scrollbar-thumb:rgba(0,0,0,.15);--scrollbar-thumb-hover:rgba(0,0,0,.25)}}',
      'html[data-theme="light"] .persona-lab-root{--text-secondary:rgba(0,0,0,0.6);--text-tertiary:rgba(0,0,0,0.38);--accent-primary-ghost:rgba(99,102,241,0.1);--scrollbar-thumb:rgba(0,0,0,.15);--scrollbar-thumb-hover:rgba(0,0,0,.25)}',
      'html[data-theme="dark"] .persona-lab-root{--text-secondary:rgba(255,255,255,0.6);--text-tertiary:rgba(255,255,255,0.35);--accent-primary-ghost:rgba(129,140,248,0.1);--scrollbar-thumb:rgba(255,255,255,.12);--scrollbar-thumb-hover:rgba(255,255,255,.2)}',
      '.persona-lab-nav,.persona-lab-panel,.persona-lab-run-card,.persona-lab-skill,.persona-lab-kv-item,.persona-lab-metric-card,.persona-lab-run-metric,.persona-lab-summary-banner,.persona-lab-review-item,.persona-lab-choice,.persona-lab-toolbar,.persona-lab-modal,.persona-lab-drawer{background:var(--glass-bg);border:1px solid var(--glass-border);box-shadow:var(--glass-shadow),var(--glass-inset-highlight)}',
      '.persona-lab-nav{padding:var(--space-4);gap:var(--space-3);border-radius:0;border-width:0 1px 0 0;background:var(--glass-bg-heavy)}',
      '.persona-lab-nav-title,.persona-lab-field label,.persona-lab-run-eyebrow,.persona-lab-chip-label,.persona-lab-kv-item span,.persona-lab-metric-card span,.persona-lab-run-metric span,.persona-lab-rule-item span,.persona-lab-model-trigger-provider,.persona-lab-model-provider-toggle{letter-spacing:0;font-size:var(--text-xs);font-weight:var(--weight-semibold)}',
      '.persona-lab-nav-header strong{font-size:var(--text-h3);line-height:var(--leading-tight);font-weight:var(--weight-semibold)}',
      '.persona-lab-nav-list{scrollbar-color:var(--scrollbar-thumb) transparent}',
      '.persona-lab-nav-list::-webkit-scrollbar-thumb,.persona-lab-content::-webkit-scrollbar-thumb,.persona-lab-modal::-webkit-scrollbar-thumb,.persona-lab-drawer-body::-webkit-scrollbar-thumb,.persona-lab-model-menu::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb);border-radius:var(--border-radius-sm)}',
      '.persona-lab-nav-item{border-radius:var(--border-radius-sm);padding:6px 8px;transition:border-color var(--transition-fast),background var(--transition-fast),color var(--transition-fast)}',
      '.persona-lab-nav-item:hover{background:var(--bg-surface-hover);border-color:var(--accent-primary)}',
      '.persona-lab-nav-item.active{border-color:var(--accent-primary);background:var(--accent-primary-ghost)}',
      '.persona-lab-nav-group-summary{border-radius:var(--border-radius-sm);letter-spacing:0;font-weight:var(--weight-semibold)}',
      '.persona-lab-nav-group-children{border-left-color:var(--border-default)}',
      '.persona-lab-nav-folder-empty{border-radius:var(--border-radius-sm)}',
      '.persona-lab-segmented{border-radius:var(--border-radius-md)}',
      '.persona-lab-segmented button{border-radius:var(--border-radius-sm)}',
      '.persona-lab-badge{padding:2px 8px;border-radius:var(--border-radius-pill);font-size:var(--text-xs);font-weight:var(--weight-medium);line-height:var(--leading-tight);background:var(--bg-surface);color:var(--text-secondary)}',
      '.persona-lab-chip{padding:5px 10px;border-radius:var(--border-radius-pill);background:var(--bg-surface-subtle);border-color:var(--glass-border);font-size:var(--text-small);font-weight:var(--weight-medium)}',
      '.persona-lab-shell{padding:var(--space-4);gap:var(--space-4)}',
      '.persona-lab-toolbar{padding:var(--space-4);gap:var(--space-4);border-radius:var(--border-radius-lg);align-items:flex-start;animation:persona-lab-stagger-fade-in .3s ease both}',
      '.persona-lab-toolbar h1{margin:var(--space-1) 0 0;font-size:var(--text-h1);line-height:1.1;letter-spacing:0;font-weight:var(--weight-bold)}',
      '.persona-lab-toolbar p{margin:var(--space-2) 0 0;color:var(--text-secondary);font-size:var(--text-body);line-height:var(--leading-normal)}',
      '.persona-lab-actions{gap:var(--space-2)}',
      '.persona-lab-button{border-radius:var(--border-radius-sm);padding:8px 12px;background:var(--bg-surface-subtle);font-size:var(--text-small);font-weight:var(--weight-medium);transition:border-color var(--transition-fast),background var(--transition-fast),color var(--transition-fast),opacity var(--transition-fast)}',
      '.persona-lab-button.small{padding:6px 10px;border-radius:var(--border-radius-sm);font-size:var(--text-xs)}',
      '.persona-lab-button:hover:not(:disabled){border-color:var(--accent-primary);background:var(--bg-surface-hover);transform:none}',
      '.persona-lab-button.primary{background:var(--accent-primary);border-color:var(--accent-primary);color:#fff;box-shadow:none}',
      '.persona-lab-button.primary:hover:not(:disabled){background:var(--accent-primary-hover);border-color:var(--accent-primary-hover)}',
      '.persona-lab-button.danger{background:transparent;border-color:var(--glass-border);color:var(--color-error-text)}',
      '.persona-lab-button.danger:hover:not(:disabled){border-color:var(--color-error);background:var(--color-error-bg)}',
      '.persona-lab-panel{border-radius:var(--border-radius-lg);padding:var(--space-4);gap:var(--space-3);animation:persona-lab-stagger-fade-in .3s ease both}',
      '.persona-lab-panel.compact{gap:var(--space-3)}',
      '.persona-lab-panel h2{font-size:var(--text-h2);line-height:var(--leading-tight);letter-spacing:0;font-weight:var(--weight-semibold)}',
      '.persona-lab-panel h3{font-size:var(--text-h3);line-height:var(--leading-tight);letter-spacing:0;font-weight:var(--weight-semibold)}',
      '.persona-lab-panel p,.persona-lab-helper,.persona-lab-run-note{font-size:var(--text-small);line-height:var(--leading-normal);color:var(--text-secondary)}',
      '.persona-lab-status:not(:empty),.persona-lab-error:not(:empty){padding:var(--space-3);border-radius:var(--border-radius-md);font-size:var(--text-small)}',
      '.persona-lab-input,.persona-lab-textarea,.persona-lab-select,.persona-lab-model-trigger{border-radius:10px;padding:10px 12px;background:var(--glass-bg-heavy);font-size:13px}',
      '.persona-lab-textarea{line-height:var(--leading-normal)}',
      '.persona-lab-textarea.json,.persona-lab-json,.persona-lab-skill-editor{font-size:var(--text-small)}',
      '.persona-lab-model-menu{border-radius:var(--border-radius-lg);background:var(--bg-app);box-shadow:var(--glass-shadow-elevated),var(--glass-inset-highlight)}',
      '.persona-lab-model-empty,.persona-lab-model-option,.persona-lab-model-provider,.persona-lab-model-provider-toggle{border-radius:var(--border-radius-md)}',
      '.persona-lab-model-empty:hover,.persona-lab-model-option:hover,.persona-lab-model-option.active{border-color:var(--accent-primary);background:var(--bg-surface-hover)}',
      '.persona-lab-model-empty.active,.persona-lab-model-option.active,.persona-lab-step.active{background:var(--accent-primary-ghost)}',
      '.persona-lab-rule-item,.persona-lab-tool-group,.persona-lab-variable-row,.persona-lab-choice,.persona-lab-skill,.persona-lab-kv-item,.persona-lab-empty,.persona-lab-run-card,.persona-lab-run-metric,.persona-lab-metric-card,.persona-lab-review-item,.persona-lab-comparison-item,.persona-lab-turn-card,.persona-lab-summary-banner{border-radius:var(--border-radius-md)}',
      '.persona-lab-choice,.persona-lab-skill,.persona-lab-kv-item,.persona-lab-run-metric,.persona-lab-metric-card,.persona-lab-review-item,.persona-lab-comparison-item,.persona-lab-turn-card{background:var(--bg-surface-subtle)}',
      '.persona-lab-choice:hover,.persona-lab-tool-row:hover,.persona-lab-rule-item:hover,.persona-lab-rule-item.active{background:var(--bg-surface-hover);border-color:var(--accent-primary)}',
      '.persona-lab-details-body{padding:var(--space-4);border-top-color:var(--glass-border)}',
      '.persona-lab-skill>.persona-lab-details-summary,.persona-lab-run-card>.persona-lab-details-summary{padding:var(--space-3)}',
      '.persona-lab-run-card{padding:var(--space-4);gap:var(--space-3);background:var(--glass-bg)}',
      '.persona-lab-run-card-header strong{font-size:var(--text-h3);line-height:var(--leading-tight);font-weight:var(--weight-semibold)}',
      '.persona-lab-kv{gap:var(--space-2)}',
      '.persona-lab-kv-item,.persona-lab-run-metric,.persona-lab-metric-card{padding:var(--space-3)}',
      '.persona-lab-kv-item strong,.persona-lab-run-metric strong,.persona-lab-metric-card strong{font-size:var(--text-h3);line-height:var(--leading-tight);font-weight:var(--weight-semibold)}',
      '.persona-lab-json,.persona-lab-skill-preview{border-radius:var(--border-radius-md)}',
      '.persona-lab-skill-editor-tools{border-radius:var(--border-radius-md)}',
      '.persona-lab-variable-picker-menu{border-radius:var(--border-radius-md)}',
      '.persona-lab-variable-token{border-radius:var(--border-radius-sm)}',
      '.persona-lab-overlay,.persona-lab-drawer-overlay{background:rgba(0,0,0,.4);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}',
      '.persona-lab-modal{border-radius:var(--border-radius-lg);background:var(--bg-app);box-shadow:var(--glass-shadow-elevated),var(--glass-inset-highlight)}',
      '.persona-lab-modal-header,.persona-lab-modal-footer{padding:var(--space-4);border-color:var(--glass-border)}',
      '.persona-lab-modal-body{padding:var(--space-4);gap:var(--space-4)}',
      '.persona-lab-modal-header h2,.persona-lab-drawer-header h2{font-size:var(--text-h2);line-height:var(--leading-tight);letter-spacing:0;font-weight:var(--weight-semibold)}',
      '.persona-lab-step{border-radius:var(--border-radius-md);padding:var(--space-3);letter-spacing:0;font-size:var(--text-xs);font-weight:var(--weight-semibold)}',
      '.persona-lab-drawer{background:var(--bg-app);box-shadow:-8px 0 32px rgba(0,0,0,.3)}',
      '.persona-lab-drawer-header{padding:var(--space-4);border-color:var(--glass-border)}',
      '.persona-lab-drawer-body{padding:var(--space-4);gap:var(--space-4)}',
      '@media (max-width:1100px){.persona-lab-nav{margin:var(--space-4) var(--space-4) 0;border-width:1px;border-radius:var(--border-radius-lg)}.persona-lab-shell{padding:var(--space-4)}}',
      '@media (max-width:820px){.persona-lab-toolbar{flex-direction:column}.persona-lab-modal-header,.persona-lab-modal-body,.persona-lab-modal-footer,.persona-lab-drawer-header,.persona-lab-drawer-body{padding-left:var(--space-4);padding-right:var(--space-4)}}',
    ].join('');
    document.head.appendChild(style);
  }

  function stringifyError(error) {
    if (!error) return 'Unknown error.';
    if (typeof error === 'string') return error;
    if (error.message) {
      if (/First-party AI base URL is not configured/i.test(error.message)) {
        return 'Persona Studio is configured for the TribeX AI Cloudflare dev control plane. Set `first_party_ai.base_url` in `~/.mcpviews/config.json` to ' + DEV_CONTROL_PLANE_URL + ', then refresh this tab.';
      }
      if (
        /127\.0\.0\.1:3000\/admin\/persona-studio\/personas/i.test(error.message) ||
        /failed to connect to 127\.0\.0\.1 port 3000/i.test(error.message) ||
        /error sending request for url \(http:\/\/127\.0\.0\.1:3000/i.test(error.message)
      ) {
        return 'Persona Studio is still pointed at the old local API host (' + LOCAL_CONTROL_PLANE_URL + '). Update MCPViews `first_party_ai.base_url` to ' + DEV_CONTROL_PLANE_URL + ', then refresh this tab.';
      }
      if (
        /dev\.app\.tribexai\.com\/admin\/persona-studio/i.test(error.message) &&
        /local-only|not deployed in the Cloudflare control plane/i.test(error.message)
      ) {
        return 'Persona Studio reached ' + DEV_CONTROL_PLANE_URL + ', but that deployment is still rejecting `/admin/persona-studio/*`. Deploy the Persona Studio API surface from `../tribe-x-ai` to the Cloudflare dev environment, then refresh this tab.';
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
        metadataGroup: personaMetadataGroup(detail.document.definition),
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
        toolPolicy: ensureToolPolicyShape(detail.document.draft.toolPolicy),
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
        ? clone(detail.document.customSkills).map(normalizeCustomSkill)
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

  function isSystemPersonaSource(persona) {
    var source = ensureObject(persona);
    return !source.ownerOrganizationId && String(source.owner || 'platform').toLowerCase() !== 'consultant';
  }

  function normalizePersonaMetadataGroup(value, persona) {
    var text = String(value || '').trim();
    if (text) return text;
    return isSystemPersonaSource(persona) ? SYSTEM_PERSONA_GROUP : '';
  }

  function personaMetadataGroup(persona) {
    var source = ensureObject(persona);
    var metadata = ensureObject(source.metadata);
    return normalizePersonaMetadataGroup(
      source.metadataGroup || source.group || metadata.metadataGroup || metadata.group,
      source
    );
  }

  function personaIsArchived(persona) {
    var source = ensureObject(persona);
    return source.status === 'ARCHIVED' || Boolean(source.archivedAt);
  }

  function visiblePersonasForArchiveMode(state, personas) {
    var archiveView = Boolean(state && state.showArchivedPersonas);
    return ensureArray(personas).filter(function (persona) {
      return personaIsArchived(persona) === archiveView;
    });
  }

  function personaListContainsKey(personas, key) {
    return Boolean(key) && ensureArray(personas).some(function (persona) {
      return persona && persona.key === key;
    });
  }

  function firstPersonaKey(personas) {
    var first = ensureArray(personas)[0];
    return first && first.key ? first.key : null;
  }

  function normalizePersonaFolderLabel(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function personaFolderGroupKey(value) {
    return normalizePersonaFolderLabel(value).toLowerCase();
  }

  function isReservedPersonaFolderLabel(value) {
    var key = personaFolderGroupKey(value);
    return key === personaFolderGroupKey(SYSTEM_PERSONA_GROUP) ||
      key === personaFolderGroupKey(UNGROUPED_PERSONA_GROUP);
  }

  function slugifyKey(value, fallback) {
    var slug = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
    return (slug || fallback || 'item').slice(0, 80);
  }

  function personaFolderCategoryKey(label) {
    var slug = slugifyKey(label, 'folder');
    return (PERSONA_FOLDER_CATEGORY_KEY_PREFIX + slug).slice(0, 120);
  }

  function mergePersonaFolderLabels() {
    var seen = {};
    var labels = [];
    Array.prototype.slice.call(arguments).forEach(function (source) {
      ensureArray(source).forEach(function (value) {
        var label = normalizePersonaFolderLabel(value);
        if (!label) return;
        var key = personaFolderGroupKey(label);
        if (seen[key]) return;
        seen[key] = true;
        labels.push(label);
      });
    });
    return labels.sort(function (left, right) {
      if (left === SYSTEM_PERSONA_GROUP && right !== SYSTEM_PERSONA_GROUP) return -1;
      if (right === SYSTEM_PERSONA_GROUP && left !== SYSTEM_PERSONA_GROUP) return 1;
      if (left === UNGROUPED_PERSONA_GROUP && right !== UNGROUPED_PERSONA_GROUP) return 1;
      if (right === UNGROUPED_PERSONA_GROUP && left !== UNGROUPED_PERSONA_GROUP) return -1;
      return left.localeCompare(right);
    });
  }

  function personaFolderLabelsFromAssetRegistry(assetRegistry) {
    return ensureArray(assetRegistry && assetRegistry.categories)
      .map(function (category) {
        var metadata = ensureObject(category && category.metadata);
        var key = String((category && category.key) || '');
        var isPersonaFolder =
          metadata.personaFolder === true ||
          String(metadata.kind || '').toUpperCase() === 'PERSONA_FOLDER' ||
          key.indexOf(PERSONA_FOLDER_CATEGORY_KEY_PREFIX) === 0;
        if (!isPersonaFolder || category.status === 'ARCHIVED') return '';
        return normalizePersonaFolderLabel(metadata.metadataGroup || category.label || key);
      })
      .filter(Boolean);
  }

  function personaFolderLabelsFromPersonas(personas) {
    return ensureArray(personas).map(personaMetadataGroup).filter(Boolean);
  }

  function personaFolderLabels(state) {
    return mergePersonaFolderLabels(
      state.personaFolders,
      personaFolderLabelsFromAssetRegistry(state.assetRegistry),
      personaFolderLabelsFromPersonas(state.personas)
    );
  }

  function personaFolderChoiceOptions(state, selectedValue) {
    var labels = mergePersonaFolderLabels(
      personaFolderLabels(state),
      selectedValue ? [selectedValue] : []
    );
    var options = [{ key: '', label: UNGROUPED_PERSONA_GROUP }];
    labels.forEach(function (label) {
      if (label === UNGROUPED_PERSONA_GROUP) return;
      options.push({ key: label, label: label });
    });
    return options;
  }

  function buildPersonaFolderSelect(state, selectedValue, onChange) {
    var select = createEl('select', 'persona-lab-select');
    personaFolderChoiceOptions(state, selectedValue).forEach(function (entry) {
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

  function normalizeSkillVariable(variable, index) {
    var source = ensureObject(variable);
    var name = String(source.name || source.key || source.variableName || '').trim();
    return {
      name: name || 'variable_' + (index + 1),
      label: String(source.label || source.displayName || source.title || name || 'Variable ' + (index + 1)).trim(),
      type: String(source.type || source.kind || source.dataType || source.variableType || 'text').trim(),
      default: source.default !== undefined ? source.default : source.defaultValue,
      required: source.required !== false,
    };
  }

  function normalizeCustomSkill(skill, index) {
    var source = ensureObject(skill);
    return {
      key: String(source.key || 'custom-skill-' + (index + 1)),
      title: String(source.title || source.name || 'Custom skill ' + (index + 1)),
      summary: String(source.summary || source.description || CUSTOM_SKILL_DEFAULT_SUMMARY),
      content: String(source.content || source.promptTemplate || CUSTOM_SKILL_DEFAULT_CONTENT),
      variables: ensureArray(source.variables).map(normalizeSkillVariable),
    };
  }

  function ensureToolPolicyShape(policy) {
    var source = ensureObject(policy);
    return {
      reservedCoreTools: ensureArray(source.reservedCoreTools).slice(),
      allowedBusinessTools: ensureArray(source.allowedBusinessTools).slice(),
      deniedBusinessTools: ensureArray(source.deniedBusinessTools).slice(),
      allowedConnectorKeys: ensureArray(source.allowedConnectorKeys).slice(),
      allowedRuntimeToolIds: ensureArray(source.allowedRuntimeToolIds).slice(),
    };
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

  function disableSmartText(input) {
    if (!input) return input;
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('spellcheck', 'false');
    input.spellcheck = false;
    return input;
  }

  function toggleListValue(list, value) {
    return list.indexOf(value) >= 0
      ? list.filter(function (item) { return item !== value; })
      : list.concat([value]);
  }

  function normalizeChoiceOption(item) {
    if (typeof item === 'string') {
      return {
        key: item,
        value: item,
        displayKey: item,
        label: item,
        description: '',
        group: '',
        kindLabel: '',
        toolCount: null,
        sourceBadge: '',
        installed: null,
        authRequired: null,
        variables: [],
      };
    }
    if (!item || typeof item !== 'object') return null;
    var key = item.key || item.name;
    if (!key) return null;
    var metadata = ensureObject(item.metadata);
    var metadataGroup = String(
      item.metadataGroup || item.group || metadata.metadataGroup || metadata.group || ''
    ).trim();
    return {
      key: String(key),
      value: String(item.value || item.selectionKey || key),
      displayKey: String(item.displayKey || item.registryKey || key),
      label: String(item.label || item.name || key),
      description: item.description ? String(item.description) : '',
      group: metadataGroup,
      kindLabel: item.kindLabel ? String(item.kindLabel) : '',
      toolCount: Number.isFinite(Number(item.toolCount)) ? Number(item.toolCount) : null,
      sourceBadge: item.sourceBadge ? String(item.sourceBadge) : '',
      installed: typeof item.installed === 'boolean' ? item.installed : null,
      authRequired: typeof item.authRequired === 'boolean' ? item.authRequired : null,
      variables: ensureArray(item.variables || metadata.variables).map(normalizeSkillVariable),
    };
  }

  function mergeChoiceOptions(items, selected) {
    var options = [];
    var seen = {};
    ensureArray(items).forEach(function (item) {
      var option = normalizeChoiceOption(item);
      if (!option || seen[option.value]) return;
      seen[option.value] = true;
      options.push(option);
    });
    ensureArray(selected).forEach(function (value) {
      if (!value || seen[value]) return;
      seen[value] = true;
      options.push({
        key: value,
        value: value,
        displayKey: value,
        label: value,
        description: 'Currently selected but not returned by the TribeX AI registry.',
        group: 'Unregistered',
        kindLabel: '',
        toolCount: null,
        sourceBadge: '',
        installed: null,
        authRequired: null,
        variables: [],
      });
    });
    return options;
  }

  function assetRegistryForState(state, registries) {
    return ensureObject((registries && registries.assetRegistry) || state.assetRegistry);
  }

  function choiceOptionsFromAssets(assetRegistry, assetType, fallbackItems, keyResolver) {
    var assets = ensureArray(assetRegistry && assetRegistry.assets)
      .filter(function (asset) {
        return asset && asset.assetType === assetType && asset.status !== 'ARCHIVED';
      })
      .map(function (asset) {
        var key = keyResolver ? keyResolver(asset) : asset.key;
        if (!key) return null;
        var metadata = ensureObject(asset.metadata);
        var metadataGroup = String(
          asset.metadataGroup || asset.group || metadata.metadataGroup || metadata.group || ''
        ).trim();
        var toolCount = Number(asset.toolCount !== undefined ? asset.toolCount : metadata.toolCount);
        return {
          key: String(key),
          label: String(asset.label || key),
          description: asset.description ? String(asset.description) : '',
          group: metadataGroup,
          toolCount: Number.isFinite(toolCount) ? toolCount : null,
          sourceBadge: asset.sourceBadge || asset.source || '',
          installed: typeof asset.installed === 'boolean' ? asset.installed : null,
          authRequired: typeof asset.authRequired === 'boolean' ? asset.authRequired : null,
          metadata: metadata,
          variables: ensureArray(metadata.variables).map(normalizeSkillVariable),
        };
      })
      .filter(Boolean);
    return assets.length ? assets : fallbackItems;
  }

  function isRegisteredRuntimeAsset(asset) {
    if (!asset || asset.assetType !== 'STATIC_TOOL' || asset.status === 'ARCHIVED') return false;
    var metadata = ensureObject(asset.metadata);
    var consultantOwned = Boolean(
      asset.source === 'CONSULTANT' ||
      asset.ownerOrganizationId ||
      asset.pluginPackageId ||
      metadata.registrationMode === 'manual-mcpviews-plugin'
    );
    return consultantOwned && Boolean(
      asset.runtimeToolId ||
      (asset.connectorKey && asset.toolName)
    );
  }

  function assetRegistryWithoutRegisteredRuntimeAssets(assetRegistry) {
    return Object.assign({}, ensureObject(assetRegistry), {
      assets: ensureArray(assetRegistry && assetRegistry.assets).filter(function (asset) {
        return !isRegisteredRuntimeAsset(asset);
      }),
    });
  }

  function capabilityKindLabel(kind) {
    return kind === 'workflow' ? 'Workflow' : 'Instruction';
  }

  function normalizeCapabilityKind(value, fallback) {
    var normalized = String(value || fallback || '').trim().toLowerCase();
    return normalized === 'workflow' ? 'workflow' : 'instruction';
  }

  function capabilitySelectionValue(kind, key) {
    return normalizeCapabilityKind(kind) + ':' + String(key || '').trim();
  }

  function selectedCapabilityValues(form) {
    var draft = ensureObject(form && form.draft);
    return ensureArray(draft.builtInSkills)
      .map(function (key) { return capabilitySelectionValue('instruction', key); })
      .concat(
        ensureArray(draft.workflowRefs).map(function (key) {
          return capabilitySelectionValue('workflow', key);
        })
      );
  }

  function toggleCapabilitySelection(state, value) {
    var text = String(value || '');
    var separator = text.indexOf(':');
    var kind = normalizeCapabilityKind(separator >= 0 ? text.slice(0, separator) : 'instruction');
    var key = separator >= 0 ? text.slice(separator + 1) : text;
    if (!key) return;
    if (kind === 'workflow') {
      state.form.draft.workflowRefs = toggleListValue(state.form.draft.workflowRefs, key);
    } else {
      state.form.draft.builtInSkills = toggleListValue(state.form.draft.builtInSkills, key);
    }
  }

  function capabilityOptionFromSource(source, fallbackKind) {
    var item = ensureObject(source);
    var metadata = ensureObject(item.metadata);
    var key = String(item.key || item.name || '').trim();
    if (!key) return null;
    var kind = normalizeCapabilityKind(
      item.capabilityKind || item.kind || metadata.capabilityKind,
      fallbackKind
    );
    return {
      key: key,
      value: capabilitySelectionValue(kind, key),
      displayKey: key,
      label: String(item.label || item.name || key),
      description: item.description ? String(item.description) : '',
      group: String(
        item.metadataGroup || item.group || metadata.metadataGroup || metadata.group || 'Skills'
      ).trim(),
      kindLabel: capabilityKindLabel(kind),
      variables: ensureArray(item.variables || metadata.variables).map(normalizeSkillVariable),
    };
  }

  function capabilityOptionsFromRegistries(assetRegistry, registries) {
    var assetOptions = ensureArray(assetRegistry && assetRegistry.assets)
      .filter(function (asset) {
        return asset && (asset.assetType === 'SKILL' || asset.assetType === 'WORKFLOW') && asset.status !== 'ARCHIVED';
      })
      .map(function (asset) {
        return capabilityOptionFromSource(
          asset,
          asset.assetType === 'WORKFLOW' ? 'workflow' : 'instruction'
        );
      })
      .filter(Boolean);
    if (assetOptions.length) return assetOptions;

    var registryCapabilities = ensureArray(registries.capabilities)
      .map(function (capability) {
        return capabilityOptionFromSource(capability, capability.kind);
      })
      .filter(Boolean);
    if (registryCapabilities.length) return registryCapabilities;

    return ensureArray(registries.builtInSkills)
      .map(function (skill) { return capabilityOptionFromSource(skill, 'instruction'); })
      .filter(Boolean)
      .concat(
        ensureArray(registries.workflows)
          .map(function (workflow) {
            return capabilityOptionFromSource(
              typeof workflow === 'string' ? { key: workflow, label: workflow } : workflow,
              'workflow'
            );
          })
          .filter(Boolean)
      );
  }

  function toolSelectionValue(kind, key) {
    return String(kind || 'tool') + ':' + String(key || '').trim();
  }

  function selectedToolValues(form) {
    var toolPolicy = ensureObject(form && form.draft && form.draft.toolPolicy);
    return ensureArray(toolPolicy.allowedBusinessTools)
      .map(function (key) { return toolSelectionValue('business', key); })
      .concat(
        ensureArray(toolPolicy.allowedRuntimeToolIds).map(function (id) {
          return toolSelectionValue('runtime', id);
        })
      );
  }

  function toggleToolSelection(state, value) {
    var text = String(value || '');
    var separator = text.indexOf(':');
    var kind = separator >= 0 ? text.slice(0, separator) : 'business';
    var key = separator >= 0 ? text.slice(separator + 1) : text;
    if (!key) return;
    state.form.draft.toolPolicy = ensureToolPolicyShape(state.form.draft.toolPolicy);
    if (kind === 'runtime') {
      state.form.draft.toolPolicy.allowedRuntimeToolIds = toggleListValue(
        state.form.draft.toolPolicy.allowedRuntimeToolIds,
        key
      );
      return;
    }
    state.form.draft.toolPolicy.allowedBusinessTools = toggleListValue(
      state.form.draft.toolPolicy.allowedBusinessTools,
      key
    );
  }

  function unifiedToolOptions(businessToolOptions, runtimeToolOptions, selectedRuntimeToolIds) {
    var options = [];
    var seen = {};
    var selectedRuntimeSet = new Set(
      ensureArray(selectedRuntimeToolIds).map(function (id) { return String(id); })
    );
    ensureArray(businessToolOptions).forEach(function (item) {
      var option = normalizeChoiceOption(item);
      if (!option || !option.key) return;
      var value = toolSelectionValue('business', option.key);
      if (seen[value]) return;
      seen[value] = true;
      options.push(Object.assign({}, option, {
        value: value,
        displayKey: option.displayKey || option.key,
        group: option.group || 'Built-in tools',
        kindLabel: option.kindLabel || 'Built-in',
      }));
    });

    ensureArray(runtimeToolOptions)
      .filter(function (option) {
        return option && (option.source !== 'static' || selectedRuntimeSet.has(String(option.id || '')));
      })
      .forEach(function (option) {
        var id = String(option.id || '').trim();
        if (!id) return;
        var value = toolSelectionValue('runtime', id);
        if (seen[value]) return;
        seen[value] = true;
        options.push({
          key: id,
          value: value,
          displayKey: option.toolName || id,
          label: String(option.label || humanizeIdentifier(option.toolName || id)),
          description: String(option.description || ''),
          group: option.source === 'static'
            ? 'Advanced selections'
            : option.source === 'registered'
              ? String(option.group || option.connectorLabel || 'Registered tools')
            : String(option.connectorLabel || option.group || 'Connected tools'),
          kindLabel: option.source === 'static'
            ? 'Advanced'
            : option.source === 'registered'
              ? 'Registered'
            : option.source === 'unavailable' ? 'Unavailable' : 'Connected',
          toolCount: null,
          sourceBadge: option.authState || '',
          installed: null,
          authRequired: option.authState === 'auth required',
          variables: [],
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

  function normalizeTokenPrice(value) {
    var numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  }

  function modelTokenPrice(item, directKeys, pricingKey) {
    if (!item || typeof item !== 'object') return null;
    for (var index = 0; index < directKeys.length; index += 1) {
      if (item[directKeys[index]] !== undefined && item[directKeys[index]] !== null) {
        return normalizeTokenPrice(item[directKeys[index]]);
      }
    }
    if (item.pricing && typeof item.pricing === 'object') {
      return normalizeTokenPrice(item.pricing[pricingKey]);
    }
    return null;
  }

  function formatUsdPerMillionTokens(price) {
    if (price === null || price === undefined || !Number.isFinite(Number(price))) return '';
    var perMillion = Number(price) * 1000000;
    if (perMillion === 0) return '$0/M';
    if (perMillion < 0.01) return '$' + perMillion.toFixed(4) + '/M';
    if (perMillion < 1) return '$' + perMillion.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + '/M';
    return '$' + perMillion.toFixed(2).replace(/\.00$/, '') + '/M';
  }

  function modelPriceLabel(option) {
    if (!option) return '';
    var input = formatUsdPerMillionTokens(option.inputTokenPriceUsd);
    var output = formatUsdPerMillionTokens(option.outputTokenPriceUsd);
    if (input && output) {
      if (input === '$0/M' && output === '$0/M') return 'Free';
      return 'In ' + input + ' · Out ' + output;
    }
    if (input) return 'In ' + input;
    if (output) return 'Out ' + output;
    return '';
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
    var id = normalizeModelId(item.id || item.value || item.key || item.model || item.modelId || item.slug);
    if (!id) return null;
    var provider = normalizeModelId(item.provider || item.providerId || item.providerKey)
      || fallbackProvider
      || inferModelProvider(id);
    return {
      id: id,
      label: String(item.name || item.label || item.displayName || item.title || id),
      provider: provider,
      providerLabel: String(item.providerLabel || fallbackProviderLabel || providerLabel(provider)),
      inputTokenPriceUsd: modelTokenPrice(
        item,
        ['inputTokenPriceUsd', 'inputPriceUsd', 'promptTokenPriceUsd', 'promptPriceUsd'],
        'prompt'
      ),
      outputTokenPriceUsd: modelTokenPrice(
        item,
        ['outputTokenPriceUsd', 'outputPriceUsd', 'completionTokenPriceUsd', 'completionPriceUsd'],
        'completion'
      ),
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

    function addModelCollection(collection, fallbackProvider, fallbackProviderLabel) {
      if (Array.isArray(collection)) {
        collection.forEach(function (item) {
          add(normalizeModelOption(item, fallbackProvider, fallbackProviderLabel));
        });
        return;
      }
      if (!collection || typeof collection !== 'object') return;
      ['models', 'modelOptions', 'options', 'items'].forEach(function (key) {
        if (Array.isArray(collection[key])) {
          addModelCollection(collection[key], fallbackProvider, fallbackProviderLabel);
        }
      });
      Object.keys(collection).forEach(function (key) {
        if (['models', 'modelOptions', 'options', 'items'].indexOf(key) >= 0) return;
        if (!Array.isArray(collection[key])) return;
        addModelCollection(collection[key], key, providerLabel(key));
      });
      Object.keys(collection).forEach(function (key) {
        var value = collection[key];
        if (['models', 'modelOptions', 'options', 'items'].indexOf(key) >= 0) return;
        if (Array.isArray(value)) return;
        if (value && typeof value === 'object') {
          if (
            Array.isArray(value.models)
            || Array.isArray(value.modelOptions)
            || Array.isArray(value.options)
            || Array.isArray(value.items)
          ) {
            addModelCollection(value, key, providerLabel(key));
            return;
          }
          add(normalizeModelOption(
            Object.assign({}, value, { id: normalizeModelId(value.id || value.value || value.key || value.model) || key }),
            fallbackProvider,
            fallbackProviderLabel
          ));
        } else if (typeof value === 'string') {
          add(normalizeModelOption({ id: key, label: value }, fallbackProvider, fallbackProviderLabel));
        }
      });
    }

    addModelCollection(registries && registries.modelOptions);
    ensureArray(registries && registries.modelProviderGroups).forEach(function (group) {
      if (!group || typeof group !== 'object') return;
      var provider = normalizeModelId(group.provider) || '';
      var label = group.label ? String(group.label) : providerLabel(provider);
      ensureArray(group.models).forEach(function (item) {
        add(normalizeModelOption(item, provider, label));
      });
    });
    addModelCollection(registries && registries.models);

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

    function compareModelOptions(left, right) {
      var leftLabel = String((left && left.label) || (left && left.id) || '');
      var rightLabel = String((right && right.label) || (right && right.id) || '');
      return leftLabel.localeCompare(rightLabel) || String(left && left.id || '').localeCompare(String(right && right.id || ''));
    }

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
          models: entries.sort(compareModelOptions),
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

    groups.forEach(function (group) {
      group.models = ensureArray(group.models).sort(compareModelOptions);
    });
    return groups.sort(function (left, right) {
      return String(left.label || '').localeCompare(String(right.label || ''))
        || String(left.provider || '').localeCompare(String(right.provider || ''));
    });
  }

  function modelIdsFromRegistries(registries, selectedValue) {
    var ids = [];
    var seen = {};
    buildModelGroups(registries || {}, selectedValue).forEach(function (group) {
      ensureArray(group.models).forEach(function (option) {
        if (!option || !option.id || seen[option.id]) return;
        seen[option.id] = true;
        ids.push(option.id);
      });
    });
    return ids;
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

  function parseCustomToolKey(value) {
    var parts = String(value || '')
      .trim()
      .split('.')
      .map(function (part) { return part.trim().toLowerCase(); })
      .filter(Boolean);
    if (parts.length < 2 || !parts[0] || !parts.slice(1).join('.')) {
      throw new Error('Tool key must use namespace.tool-name format.');
    }
    return {
      connectorKey: parts[0],
      toolName: parts.slice(1).join('.'),
      toolKey: parts[0] + '.' + parts.slice(1).join('.'),
    };
  }

  function buildCustomToolRegistrationPayload(state) {
    var draft = Object.assign(defaultCustomToolDraft(), ensureObject(state.customToolDraft));
    var parsedKey = parseCustomToolKey(draft.toolKey);
    var metadata = parseJsonObject(draft.metadataText, {}, 'Tool metadata');
    var metadataInputSchema = ensureObject(metadata.inputSchema);
    var payload = {
      toolKey: parsedKey.toolKey,
      label: String(draft.label || '').trim() || humanizeIdentifier(parsedKey.toolName),
      description: String(draft.description || '').trim() || null,
      connectorLabel: String(draft.connectorLabel || '').trim() || humanizeIdentifier(parsedKey.connectorKey),
      connectorDescription: String(draft.connectorDescription || '').trim() || null,
      operationKind: draft.operationKind || 'read',
      metadata: metadata,
    };
    if (Object.keys(metadataInputSchema).length) {
      payload.inputSchema = metadataInputSchema;
    }
    return payload;
  }

  function consultantOrganizationIdForCustomToolRegistration(state) {
    if (state.organizationKind === 'CONSULTANT' && state.organizationId) {
      return state.organizationId;
    }
    return '';
  }

  function buildManualPluginManifestUrl(connectorKey) {
    return 'https://mcpviews.local/manual/' + encodeURIComponent(connectorKey) + '/manifest.json';
  }

  function customToolRegistrationFallbackNeeded(error) {
    var message = stringifyError(error);
    return /HTTP 404\b/i.test(message) && /persona-studio\/custom-tools/i.test(message);
  }

  function registerCustomMcpToolViaAssetApis(state, payload) {
    var parsedKey = parseCustomToolKey(payload.toolKey);
    var connectorKey = parsedKey.connectorKey;
    var toolName = parsedKey.toolName;
    var runtimeToolId = canonicalRuntimeToolId(connectorKey, toolName);
    var consultantOrganizationId = consultantOrganizationIdForCustomToolRegistration(state);
    if (!consultantOrganizationId) {
      return Promise.reject(new Error('No consultant organization is available for manual tool registration.'));
    }

    var metadata = ensureObject(payload.metadata);
    var inputSchema = ensureObject(payload.inputSchema || metadata.inputSchema);
    var manifestVersion = String(payload.manifestVersion || 'manual');
    var connectorLabel = String(payload.connectorLabel || humanizeIdentifier(connectorKey));
    var connectorDescription = payload.connectorDescription || payload.description || null;
    var registrationMetadata = {
      registrationMode: 'manual-mcpviews-plugin',
      registeredVia: 'PERSONA_STUDIO',
      relay: 'mcpviews',
      connectorKey: connectorKey,
      toolName: toolName,
      toolKey: parsedKey.toolKey,
      runtimeToolId: runtimeToolId,
    };
    var manifestHash = ('manual:' + connectorKey + ':' + manifestVersion).slice(0, 200);
    var packageId = null;
    var connectorAssetId = null;
    var toolAssetId = null;

    return request(
      'POST',
      '/organizations/' + encodeURIComponent(consultantOrganizationId) + '/persona-studio/plugin-packages',
      {
        pluginId: connectorKey,
        pluginName: connectorKey,
        displayName: connectorLabel,
        description: connectorDescription,
        manifestUrl: buildManualPluginManifestUrl(connectorKey),
        downloadUrl: null,
        manifestVersion: manifestVersion,
        manifestHash: manifestHash,
        metadata: registrationMetadata,
      }
    )
      .then(function (result) {
        packageId = result && result.pluginPackage && result.pluginPackage.id
          ? result.pluginPackage.id
          : null;
        return request(
          'POST',
          '/organizations/' + encodeURIComponent(consultantOrganizationId) + '/persona-studio/assets',
          {
            assetType: 'CONNECTOR_GRANT',
            key: connectorKey,
            label: connectorLabel,
            description: connectorDescription,
            pluginPackageId: packageId,
            pluginId: connectorKey,
            pluginName: connectorKey,
            connectorKey: connectorKey,
            toolName: null,
            manifestVersion: manifestVersion,
            runtimeToolId: null,
            metadata: Object.assign({}, registrationMetadata, {
              registeredToolKeys: [parsedKey.toolKey],
              namespaces: [connectorKey],
              toolCount: 1,
              group: metadata.group || 'Registered services',
            }),
          }
        );
      })
      .then(function (result) {
        connectorAssetId = result && result.asset && result.asset.id ? result.asset.id : null;
        return request(
          'POST',
          '/organizations/' + encodeURIComponent(consultantOrganizationId) + '/persona-studio/assets',
          {
            assetType: 'STATIC_TOOL',
            key: parsedKey.toolKey,
            label: payload.label || humanizeIdentifier(toolName),
            description: payload.description || null,
            pluginPackageId: packageId,
            pluginId: connectorKey,
            pluginName: connectorKey,
            connectorKey: connectorKey,
            toolName: toolName,
            manifestVersion: manifestVersion,
            runtimeToolId: runtimeToolId,
            metadata: Object.assign({}, metadata, registrationMetadata, {
              operationKind: payload.operationKind || 'read',
              group: metadata.group || 'Registered tools',
            }, Object.keys(inputSchema).length ? { inputSchema: inputSchema } : {}),
          }
        );
      })
      .then(function (result) {
        toolAssetId = result && result.asset && result.asset.id ? result.asset.id : null;
        return null;
      })
      .then(function () {
        var enablements = [connectorAssetId, toolAssetId]
          .filter(Boolean)
          .map(function (assetId) {
            return request(
              'PUT',
              '/organizations/' + encodeURIComponent(state.organizationId) + '/persona-studio/enablements',
              {
                assetId: assetId,
                enabled: true,
                metadata: registrationMetadata,
              }
            );
          });
        return Promise.all(enablements);
      })
      .then(function () {
        return {
          pluginPackage: packageId ? { id: packageId } : null,
          connectorKey: connectorKey,
          toolName: toolName,
          toolKey: parsedKey.toolKey,
          runtimeToolId: runtimeToolId,
        };
      });
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
    var draftPolicy = state.form && state.form.draft && state.form.draft.modelPolicy
      ? state.form.draft.modelPolicy
      : {};
    var models = modelIdsFromRegistries(registries, draftPolicy.defaultModel);
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
    var navList = state.container.querySelector('.persona-lab-nav-list');
    if (navList && !state.navScrollTargetKey && !state.navScrollTargetGroupKey) {
      state.navScrollTop = navList.scrollTop || 0;
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
        if (state.contentScrollAnchorKey) {
          var anchor = content.querySelector('[data-persona-scroll-anchor="' + cssEscape(state.contentScrollAnchorKey) + '"]');
          if (anchor) {
            content.scrollTop += anchor.getBoundingClientRect().top - state.contentScrollAnchorTop;
          }
          state.contentScrollAnchorKey = '';
          state.contentScrollAnchorTop = 0;
        }
      }
      var navList = state.container.querySelector('.persona-lab-nav-list');
      if (navList) {
        navList.scrollTop = state.navScrollTop || 0;
        var target = null;
        if (state.navScrollTargetKey) {
          target = navList.querySelector('[data-persona-key="' + cssEscape(state.navScrollTargetKey) + '"]');
        }
        if (!target && state.navScrollTargetGroupKey) {
          target = navList.querySelector('[data-persona-group-key="' + cssEscape(state.navScrollTargetGroupKey) + '"]');
        }
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'nearest' });
          state.navScrollTop = navList.scrollTop || 0;
        }
        state.navScrollTargetKey = '';
        state.navScrollTargetGroupKey = '';
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

  function markFocusKey(element, key) {
    if (element && key) {
      element.setAttribute('data-persona-focus-key', key);
    }
    return element;
  }

  function markScrollAnchor(element, key) {
    if (element && key) {
      element.setAttribute('data-persona-scroll-anchor', key);
    }
    return element;
  }

  function captureContentScrollAnchor(state, element) {
    if (!state.container || !element) return;
    var content = state.container.querySelector('.persona-lab-content');
    if (!content || !content.contains(element)) return;
    var key = element.getAttribute('data-persona-scroll-anchor') || '';
    if (!key) return;
    state.contentScrollAnchorKey = key;
    state.contentScrollAnchorTop = element.getBoundingClientRect().top;
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function elementPath(root, element) {
    var path = [];
    var current = element;
    while (current && current !== root && current.parentNode) {
      var siblings = Array.prototype.slice.call(current.parentNode.children || []);
      path.unshift(siblings.indexOf(current));
      current = current.parentNode;
    }
    return current === root ? path : [];
  }

  function elementAtPath(root, path) {
    var current = root;
    ensureArray(path).forEach(function (index) {
      current = current && current.children ? current.children[index] : null;
    });
    return current || null;
  }

  function captureActiveElementState(state) {
    if (!state.container || !state.container.contains(document.activeElement)) {
      return null;
    }
    var active = document.activeElement;
    if (!active || !/^(INPUT|TEXTAREA|SELECT)$/i.test(active.tagName)) {
      return null;
    }
    return {
      focusKey: active.getAttribute('data-persona-focus-key') || '',
      path: elementPath(state.container, active),
      selectionStart: typeof active.selectionStart === 'number' ? active.selectionStart : null,
      selectionEnd: typeof active.selectionEnd === 'number' ? active.selectionEnd : null,
    };
  }

  function restoreActiveElementState(state, activeState) {
    if (!state.container || !activeState || !window.requestAnimationFrame) return;
    window.requestAnimationFrame(function () {
      var target = null;
      if (activeState.focusKey) {
        target = state.container.querySelector('[data-persona-focus-key="' + cssEscape(activeState.focusKey) + '"]');
      }
      if (!target && activeState.path && activeState.path.length) {
        target = elementAtPath(state.container, activeState.path);
      }
      if (!target || typeof target.focus !== 'function') return;
      target.focus({ preventScroll: true });
      if (
        activeState.selectionStart !== null &&
        typeof target.setSelectionRange === 'function'
      ) {
        try {
          target.setSelectionRange(activeState.selectionStart, activeState.selectionEnd);
        } catch (_error) {}
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

  function humanizeIdentifier(value) {
    return String(value || '')
      .split(/[-_\s:]+/)
      .filter(Boolean)
      .map(function (part) {
        return part.slice(0, 1).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  function canonicalRuntimeToolId(connectorKey, toolName) {
    return String((connectorKey || '*')).trim().toLowerCase() + ':' + String(toolName || '').trim().toLowerCase();
  }

  function normalizeRuntimeToolOption(tool, connector, source, groupName) {
    var toolSource = ensureObject(tool);
    var connectorSource = ensureObject(connector);
    var toolName = String(toolSource.toolName || toolSource.name || toolSource.key || '').trim();
    var connectorKey = String(toolSource.connectorKey || connectorSource.key || '').trim();
    if (!toolName || !connectorKey) return null;
    var id = String(toolSource.id || canonicalRuntimeToolId(connectorKey, toolName)).trim();
    return {
      id: id,
      key: toolName,
      toolName: toolName,
      connectorKey: connectorKey,
      connectorLabel: String(connectorSource.label || toolSource.connectorLabel || humanizeIdentifier(connectorKey)),
      label: String(toolSource.label || humanizeIdentifier(toolName)),
      description: String(toolSource.description || toolSource.whenToCall || ''),
      operationKind: String(toolSource.operationKind || toolSource.operation_kind || (toolSource.destructive ? 'destructive' : toolSource.mutating ? 'write' : 'read')),
      authState: String(toolSource.authState || connectorSource.authState || ''),
      source: source || String(toolSource.source || 'static'),
      group: String(groupName || toolSource.group || ''),
    };
  }

  function collectStaticRuntimeToolOptions(toolRegistry) {
    return ensureArray(toolRegistry && toolRegistry.businessToolOptions)
      .map(function (tool) {
        return normalizeRuntimeToolOption(tool, { key: tool && tool.connectorKey, label: '' }, 'static', tool && tool.group);
      })
      .filter(Boolean);
  }

  function registeredRuntimeToolOptionsFromAssetRegistry(assetRegistry) {
    return ensureArray(assetRegistry && assetRegistry.assets)
      .filter(isRegisteredRuntimeAsset)
      .map(function (asset) {
        var metadata = ensureObject(asset.metadata);
        var connectorKey = String(asset.connectorKey || metadata.connectorKey || asset.pluginId || '').trim();
        var toolName = String(asset.toolName || metadata.toolName || '').trim();
        if (!toolName && asset.key && String(asset.key).indexOf('.') > 0) {
          toolName = String(asset.key).split('.').slice(1).join('.');
        }
        if (!connectorKey || !toolName) return null;
        return normalizeRuntimeToolOption(
          {
            id: asset.runtimeToolId || canonicalRuntimeToolId(connectorKey, toolName),
            key: toolName,
            toolName: toolName,
            connectorKey: connectorKey,
            connectorLabel: metadata.connectorLabel || asset.pluginName || humanizeIdentifier(connectorKey),
            label: asset.label || metadata.label || humanizeIdentifier(toolName),
            description: asset.description || metadata.description || '',
            operationKind: metadata.operationKind || 'read',
            authState: asset.installed === false ? 'not installed' : 'registered',
            group: metadata.group || 'Registered tools',
          },
          { key: connectorKey, label: metadata.connectorLabel || asset.pluginName || humanizeIdentifier(connectorKey) },
          'registered',
          metadata.group || 'Registered tools'
        );
      })
      .filter(Boolean);
  }

  function collectLocalRuntimeToolOptions(catalog) {
    var options = [];
    ensureArray(catalog && catalog.connectors).forEach(function (connector) {
      ensureArray(connector.tools).forEach(function (tool) {
        var option = normalizeRuntimeToolOption(tool, connector, 'dynamic', 'Tools');
        if (option) options.push(option);
      });
      ensureArray(connector.toolGroups).forEach(function (group) {
        ensureArray(group.tools).forEach(function (tool) {
          var option = normalizeRuntimeToolOption(tool, connector, 'dynamic', group.name);
          if (option) options.push(option);
        });
      });
    });
    return options;
  }

  function mergeRuntimeToolOptions(options, selectedIds) {
    var merged = [];
    var seen = new Set();
    ensureArray(options).forEach(function (option) {
      if (!option || !option.id) return;
      var optionId = String(option.id);
      if (seen.has(optionId)) return;
      seen.add(optionId);
      merged.push(option);
    });
    ensureArray(selectedIds).forEach(function (id) {
      if (!id) return;
      var selectedId = String(id);
      if (seen.has(selectedId)) return;
      seen.add(selectedId);
      var separator = selectedId.indexOf(':');
      var connectorKey = separator > 0 ? selectedId.slice(0, separator) : 'unavailable';
      var toolName = separator > 0 ? selectedId.slice(separator + 1) : selectedId;
      merged.push({
        id: selectedId,
        key: toolName,
        toolName: toolName,
        connectorKey: connectorKey,
        connectorLabel: humanizeIdentifier(connectorKey),
        label: humanizeIdentifier(toolName),
        description: 'Currently selected but not returned by the static registry or local MCPViews plugin catalog.',
        operationKind: 'read',
        authState: 'unavailable',
        source: 'unavailable',
        group: 'Unavailable',
      });
    });
    return merged;
  }

  function runtimeToolOptionsForState(state, registries) {
    var toolRegistry = ensureObject(registries && registries.toolRegistry);
    var assetRegistry = assetRegistryForState(state, registries);
    var selected = state.form && state.form.draft && state.form.draft.toolPolicy
      ? state.form.draft.toolPolicy.allowedRuntimeToolIds
      : [];
    return mergeRuntimeToolOptions(
      collectStaticRuntimeToolOptions(toolRegistry)
        .concat(registeredRuntimeToolOptionsFromAssetRegistry(assetRegistry))
        .concat(collectLocalRuntimeToolOptions(state.localMcpCatalog)),
      selected
    );
  }

  function loadLocalMcpCatalog(state) {
    if (state.localMcpCatalogLoaded || state.localMcpCatalogPromise) {
      return state.localMcpCatalogPromise || Promise.resolve(state.localMcpCatalog);
    }
    if (!window.__TAURI__ || !window.__TAURI__.core || typeof window.__TAURI__.core.invoke !== 'function') {
      state.localMcpCatalogLoaded = true;
      return Promise.resolve(null);
    }
    state.localMcpCatalogLoading = true;
    state.localMcpCatalogPromise = window.__TAURI__.core.invoke('get_local_mcp_catalog')
      .then(function (catalog) {
        state.localMcpCatalog = catalog || null;
        state.localMcpCatalogError = '';
        return state.localMcpCatalog;
      })
      .catch(function (error) {
        state.localMcpCatalog = null;
        state.localMcpCatalogError = stringifyError(error);
        return null;
      })
      .finally(function () {
        state.localMcpCatalogLoaded = true;
        state.localMcpCatalogLoading = false;
        state.localMcpCatalogPromise = null;
        renderState(state);
      });
    return state.localMcpCatalogPromise;
  }

  function activeRegistries(state) {
    var source = ensureObject(state.registries);
    var registries = Object.assign({
      capabilities: [],
      builtInSkills: [],
      workflows: [],
      models: FALLBACK_PERSONA_STUDIO_MODELS.slice(),
      toolRegistry: {
        businessTools: [],
        businessToolOptions: [],
        connectors: [],
        connectorOptions: [],
        reservedCoreTools: [],
      },
      orchestration: null,
    }, source);
    if (!modelIdsFromRegistries(registries, '').length) {
      registries.models = FALLBACK_PERSONA_STUDIO_MODELS.slice();
    }
    registries.toolRegistry = Object.assign({
      businessTools: [],
      businessToolOptions: [],
      runtimeToolOptions: [],
      connectors: [],
      connectorOptions: [],
	      reservedCoreTools: [],
	    }, ensureObject(registries.toolRegistry));
	    registries.toolRegistry.runtimeToolOptions = runtimeToolOptionsForState(state, registries);
	    registries.assetRegistry = source.assetRegistry || state.assetRegistry || null;
	    return registries;
	  }

  function ensureRequiredModelDefaults(state, registries) {
    if (!state.form || !state.form.draft || !state.form.draft.modelPolicy) return;
    if (state.form.draft.modelPolicy.defaultModel) return;
    var models = modelIdsFromRegistries(registries, '');
    if (models[0]) {
      state.form.draft.modelPolicy.defaultModel = models[0];
      updateDirtyState(state);
    }
  }

  function personaListQuery(state) {
    var query = {};
    if (state.showArchivedPersonas) {
      query.includeArchived = 'true';
    }
    if (state.organizationId) {
      query.organizationId = state.organizationId;
    }
    return Object.keys(query).length ? query : null;
  }

  function currentPersonaDefinition(state) {
    return state.current && state.current.document
      ? ensureObject(state.current.document.definition)
      : {};
  }

  function isCurrentPersonaArchived(state) {
    var definition = currentPersonaDefinition(state);
    return personaIsArchived(definition);
  }

  function applyBootstrapPayload(state, payload) {
    state.registries = payload && payload.registries ? payload.registries : state.registries;
    state.assetRegistry = payload && payload.assetRegistry ? payload.assetRegistry : state.assetRegistry;
    state.personaFolders = mergePersonaFolderLabels(
      state.personaFolders,
      personaFolderLabelsFromAssetRegistry(state.assetRegistry)
    );
    state.personas = mergePersonaAssetsIntoCatalog(
      ensureArray(payload && payload.personas),
      state.assetRegistry
    );
    state.bootstrapLoaded = true;
    var visiblePersonas = visiblePersonasForArchiveMode(state, state.personas);
    var previousSelectedKey = state.selectedPersonaKey;
    if (
      state.selectedPersonaKey &&
      !personaListContainsKey(visiblePersonas, state.selectedPersonaKey)
    ) {
      state.selectedPersonaKey = firstPersonaKey(visiblePersonas);
    }
    if (!state.selectedPersonaKey && visiblePersonas.length > 0) {
      state.selectedPersonaKey = firstPersonaKey(visiblePersonas);
    }
    if (state.selectedPersonaKey && state.selectedPersonaKey !== previousSelectedKey) {
      state.navScrollTargetKey = state.selectedPersonaKey;
    }
  }

  function fetchBootstrap(state) {
    syncOrganizationContext(state);
    if (!hasConsultantOrganizationContext(state)) {
      state.loading = false;
      state.bootstrapLoaded = true;
      state.bootstrapPromise = null;
      state.personas = [];
      state.personaFolders = [];
      state.registries = null;
      state.assetRegistry = null;
      state.current = null;
      state.form = null;
      state.dirty = false;
      setError(state, consultantOrganizationRequiredMessage(state));
      renderState(state);
      return Promise.resolve(null);
    }
    if (state.bootstrapPromise) {
      return state.bootstrapPromise;
    }
    state.loading = true;
    state.bootstrapPromise = request(
      'GET',
      '/admin/persona-studio/personas',
      null,
      personaListQuery(state)
    )
      .then(function (payload) {
        applyBootstrapPayload(state, payload);
        return refreshAssetRegistry(state)
          .catch(function () {
            return null;
          })
          .then(function () {
            state.personas = mergePersonaAssetsIntoCatalog(state.personas, state.assetRegistry);
            if (state.selectedPersonaKey) {
              return loadPersona(state, state.selectedPersonaKey);
            }
            state.current = null;
            state.form = null;
            state.dirty = false;
            return null;
          });
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

  function refreshAssetRegistry(state) {
    if (!hasConsultantOrganizationContext(state)) {
      return Promise.resolve(null);
    }
    var query = state.showArchivedPersonas ? { includeArchived: 'true' } : null;
    return request(
      'GET',
      '/organizations/' + encodeURIComponent(state.organizationId) + '/persona-studio/assets',
      null,
      query
    ).then(function (assetRegistry) {
      state.assetRegistry = assetRegistry || null;
      state.personaFolders = mergePersonaFolderLabels(
        state.personaFolders,
        personaFolderLabelsFromAssetRegistry(state.assetRegistry)
      );
      state.registries = Object.assign({}, ensureObject(state.registries), {
        assetRegistry: state.assetRegistry,
      });
      return state.assetRegistry;
    });
  }

  function loadPersona(state, personaKey) {
    if (!personaKey) {
      return Promise.resolve(null);
    }
    if (!requireConsultantOrganizationContext(state)) {
      return Promise.reject(new Error(consultantOrganizationRequiredMessage(state)));
    }
    state.loadingPersona = true;
    state.selectedPersonaKey = personaKey;
    state.navScrollTargetKey = personaKey;
    state.skillEditorOpen = false;
    state.skillEditorIndex = -1;
    state.skillEditorDraft = '';
    state.skillEditorError = '';
    renderState(state);
    state.personaPromise = request(
      'GET',
      '/admin/persona-studio/personas/' + encodeURIComponent(personaKey),
      null,
      personaAuthoringQuery(state)
    )
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
        state.skillEditorOpen = false;
        state.skillEditorIndex = -1;
        state.skillEditorDraft = '';
        state.skillEditorError = '';
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
    return request(
      'GET',
      '/admin/persona-studio/personas',
      null,
      personaListQuery(state)
    )
      .then(function (payload) {
        applyBootstrapPayload(state, payload);
        var visiblePersonas = visiblePersonasForArchiveMode(state, state.personas);
        var nextKey = personaListContainsKey(visiblePersonas, personaKey)
          ? personaKey
          : personaListContainsKey(visiblePersonas, state.selectedPersonaKey)
            ? state.selectedPersonaKey
            : firstPersonaKey(visiblePersonas);
        if (!nextKey) {
          state.current = null;
          state.form = null;
          state.dirty = false;
          renderState(state);
          return null;
        }
        return loadPersona(state, nextKey);
      });
  }

  function registerCustomMcpTool(state) {
    if (!requireConsultantOrganizationContext(state)) {
      return;
    }
    if (!state.form || !state.form.draft) {
      setError(state, 'Select a persona before registering a tool.');
      renderState(state);
      return;
    }

    var payload;
    try {
      payload = buildCustomToolRegistrationPayload(state);
    } catch (error) {
      state.customToolError = stringifyError(error);
      setError(state, state.customToolError);
      renderState(state);
      return;
    }

    state.customToolRegistering = true;
    state.customToolError = '';
    setStatus(state, 'Registering tool...');
    renderState(state);

    request(
      'POST',
      '/organizations/' + encodeURIComponent(state.organizationId) + '/persona-studio/custom-tools',
      payload
    )
      .catch(function (error) {
        if (!customToolRegistrationFallbackNeeded(error)) {
          throw error;
        }
        setStatus(state, 'Registering tool with compatibility asset APIs...');
        renderState(state);
        return registerCustomMcpToolViaAssetApis(state, payload);
      })
      .then(function (result) {
        return refreshAssetRegistry(state).then(function () {
          return result;
        });
      })
      .then(function (result) {
        var runtimeToolId = String((result && result.runtimeToolId) || '').trim();
        if (runtimeToolId) {
          state.form.draft.toolPolicy = ensureToolPolicyShape(state.form.draft.toolPolicy);
          if (state.form.draft.toolPolicy.allowedRuntimeToolIds.indexOf(runtimeToolId) < 0) {
            state.form.draft.toolPolicy.allowedRuntimeToolIds =
              state.form.draft.toolPolicy.allowedRuntimeToolIds.concat([runtimeToolId]);
          }
          if (state.form.draft.toolPolicy.allowedConnectorKeys.indexOf('mcpviews-plugins') < 0) {
            state.form.draft.toolPolicy.allowedConnectorKeys =
              state.form.draft.toolPolicy.allowedConnectorKeys.concat(['mcpviews-plugins']);
          }
        }
        state.customToolDraft = defaultCustomToolDraft();
        state.customToolError = '';
        updateDirtyState(state);
        setStatus(state, runtimeToolId
          ? 'Registered and selected ' + runtimeToolId + '.'
          : 'Registered tool.');
      })
      .catch(function (error) {
        state.customToolError = stringifyError(error);
        setError(state, state.customToolError);
      })
      .finally(function () {
        state.customToolRegistering = false;
        renderState(state);
      });
  }

  function savePersona(state) {
    if (!state.current || !state.selectedPersonaKey || !state.form) {
      return Promise.reject(new Error('No persona is selected.'));
    }
    if (!requireConsultantOrganizationContext(state)) {
      return Promise.reject(new Error(consultantOrganizationRequiredMessage(state)));
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
    payload.organizationId = selectedConsultantOrganizationId(state);
    payload.draft.modelPolicy.workflowModels = workflowModels;
    payload.draft.orchestration = normalizeOrchestration(payload.draft.orchestration);
    payload.customSkills = ensureArray(payload.customSkills).map(serializeCustomSkillForSave);

    var customSkillErrors = validateCustomSkillsForSave(payload.customSkills);
    if (customSkillErrors.length) {
      var validationError = new Error(customSkillErrors.join('\n'));
      state.saving = false;
      setError(state, validationError.message);
      renderState(state);
      return Promise.reject(validationError);
    }

    return request(
      'PUT',
      '/admin/persona-studio/personas/' + encodeURIComponent(state.selectedPersonaKey),
      payload,
      personaAuthoringQuery(state)
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
        runtimeSession: launch.runtimeSession || null,
        relay: launch.relay || null,
        effectivePersona: launch.effectivePersona || null,
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
    if (!requireConsultantOrganizationContext(state)) {
      return Promise.reject(new Error(consultantOrganizationRequiredMessage(state)));
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
          {
            sourceStage: 'draft',
            organizationId: selectedConsultantOrganizationId(state),
          },
          personaAuthoringQuery(state)
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
      organizationId: selectedConsultantOrganizationId(state),
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
    if (!requireConsultantOrganizationContext(state)) {
      return Promise.reject(new Error(consultantOrganizationRequiredMessage(state)));
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
          payload,
          personaAuthoringQuery(state)
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

  function clearSelectedPersona(state) {
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
    state.current = null;
    state.form = null;
    state.dirty = false;
    state.skillEditorOpen = false;
    state.skillEditorIndex = -1;
    state.skillEditorDraft = '';
    state.skillEditorError = '';
  }

  function reloadPersonaList(state, preferredPersonaKey) {
    state.loading = true;
    renderState(state);
    return request(
      'GET',
      '/admin/persona-studio/personas',
      null,
      personaListQuery(state)
    )
      .then(function (payload) {
        applyBootstrapPayload(state, payload);
        var visiblePersonas = visiblePersonasForArchiveMode(state, state.personas);
        var nextKey = personaListContainsKey(visiblePersonas, preferredPersonaKey)
          ? preferredPersonaKey
          : personaListContainsKey(visiblePersonas, state.selectedPersonaKey)
            ? state.selectedPersonaKey
            : firstPersonaKey(visiblePersonas);
        if (!nextKey) {
          clearSelectedPersona(state);
          renderState(state);
          return null;
        }
        return loadPersona(state, nextKey);
      })
      .catch(function (error) {
        setError(state, stringifyError(error));
        renderState(state);
        throw error;
      })
      .finally(function () {
        state.loading = false;
        renderState(state);
      });
  }

  function toggleArchivedPersonas(state, showArchived) {
    if (state.showArchivedPersonas === showArchived) {
      return;
    }
    if (
      state.dirty &&
      !window.confirm('You have unsaved persona changes. Discard them and reload the persona list?')
    ) {
      renderState(state);
      return;
    }
    state.showArchivedPersonas = showArchived;
    setStatus(state, showArchived ? 'Viewing archived personas.' : 'Viewing active personas.');
    clearSelectedPersona(state);
    state.navScrollTop = 0;
    reloadPersonaList(state, state.selectedPersonaKey).catch(function () {});
  }

  function openArchiveConfirmModal(state) {
    if (!state.selectedPersonaKey || state.archivingPersona || state.deleteConfirmSubmitting) {
      return;
    }
    if (!requireConsultantOrganizationContext(state)) {
      return;
    }
    var definition = currentPersonaDefinition(state);
    if (definition.status === 'ARCHIVED' || definition.archivedAt) {
      return;
    }
    state.archiveConfirmDraft = defaultArchiveConfirmDraft(definition.archiveReason || '');
    state.archiveConfirmError = '';
    state.archiveConfirmModalOpen = true;
    renderState(state);
  }

  function closeArchiveConfirmModal(state) {
    if (state.archiveConfirmSubmitting || state.archivingPersona) return;
    state.archiveConfirmModalOpen = false;
    state.archiveConfirmDraft = defaultArchiveConfirmDraft();
    state.archiveConfirmError = '';
    renderState(state);
  }

  function archiveSelectedPersona(state) {
    if (!state.selectedPersonaKey || state.archivingPersona || state.archiveConfirmSubmitting) {
      return Promise.resolve(null);
    }
    var definition = currentPersonaDefinition(state);
    var label = definition.displayName || state.selectedPersonaKey;
    var draft = ensureObject(state.archiveConfirmDraft);
    if (!draft.confirmed) {
      state.archiveConfirmError = 'Confirm the archive action before continuing.';
      renderState(state);
      return Promise.resolve(null);
    }
    var reason = String(draft.reason || '').trim();
    var archivedKey = state.selectedPersonaKey;
    state.archivingPersona = true;
    state.archiveConfirmSubmitting = true;
    state.archiveConfirmError = '';
    setStatus(state, 'Archiving ' + label + '...');
    renderState(state);
    return request(
      'POST',
      '/admin/persona-studio/personas/' + encodeURIComponent(archivedKey) + '/archive',
      {
        reason: reason,
        organizationId: selectedConsultantOrganizationId(state),
      },
      personaAuthoringQuery(state)
    )
      .then(function () {
        state.archiveConfirmModalOpen = false;
        state.archiveConfirmDraft = defaultArchiveConfirmDraft();
        setStatus(state, 'Archived ' + label + '. Use View archive to restore or delete it.');
        state.selectedPersonaKey = null;
        return reloadPersonaList(state, null);
      })
      .catch(function (error) {
        state.archiveConfirmError = stringifyError(error);
        setError(state, state.archiveConfirmError);
        renderState(state);
        throw error;
      })
      .finally(function () {
        state.archivingPersona = false;
        state.archiveConfirmSubmitting = false;
        renderState(state);
      });
  }

  function unarchiveSelectedPersona(state) {
    if (!state.selectedPersonaKey || state.archivingPersona || state.deleteConfirmSubmitting) {
      return Promise.resolve(null);
    }
    if (!requireConsultantOrganizationContext(state)) {
      return Promise.resolve(null);
    }
    var definition = currentPersonaDefinition(state);
    var label = definition.displayName || state.selectedPersonaKey;
    var restoredKey = state.selectedPersonaKey;
    state.archivingPersona = true;
    setStatus(state, 'Restoring ' + label + '...');
    renderState(state);
    return request(
      'POST',
      '/admin/persona-studio/personas/' + encodeURIComponent(restoredKey) + '/unarchive',
      null,
      personaAuthoringQuery(state)
    )
      .then(function () {
        setStatus(state, 'Restored ' + label + '.');
        state.selectedPersonaKey = null;
        return reloadPersonaList(state, null);
      })
      .catch(function (error) {
        setError(state, stringifyError(error));
        renderState(state);
        throw error;
      })
      .finally(function () {
        state.archivingPersona = false;
        renderState(state);
      });
  }

  function openDeleteConfirmModal(state) {
    if (!state.selectedPersonaKey || state.deleteConfirmSubmitting || state.archivingPersona) {
      return;
    }
    if (!isCurrentPersonaArchived(state)) {
      setError(state, 'Only archived personas can be deleted.');
      renderState(state);
      return;
    }
    state.deleteConfirmDraft = defaultDeleteConfirmDraft();
    state.deleteConfirmError = '';
    state.deleteConfirmModalOpen = true;
    renderState(state);
  }

  function closeDeleteConfirmModal(state) {
    if (state.deleteConfirmSubmitting) return;
    state.deleteConfirmModalOpen = false;
    state.deleteConfirmDraft = defaultDeleteConfirmDraft();
    state.deleteConfirmError = '';
    renderState(state);
  }

  function deleteArchivedPersona(state) {
    if (!state.selectedPersonaKey || state.deleteConfirmSubmitting) {
      return Promise.resolve(null);
    }
    if (!requireConsultantOrganizationContext(state)) {
      return Promise.resolve(null);
    }
    if (!isCurrentPersonaArchived(state)) {
      state.deleteConfirmError = 'Only archived personas can be deleted.';
      renderState(state);
      return Promise.resolve(null);
    }
    var key = state.selectedPersonaKey;
    var definition = currentPersonaDefinition(state);
    var label = definition.displayName || key;
    var confirmation = String(ensureObject(state.deleteConfirmDraft).confirmation || '').trim();
    if (confirmation !== key) {
      state.deleteConfirmError = 'Type the exact persona key to confirm deletion.';
      renderState(state);
      return Promise.resolve(null);
    }
    state.deleteConfirmSubmitting = true;
    state.deleteConfirmError = '';
    setStatus(state, 'Deleting ' + label + '...');
    renderState(state);
    return request(
      'DELETE',
      '/admin/persona-studio/personas/' + encodeURIComponent(key),
      null,
      personaAuthoringQuery(state)
    )
      .then(function () {
        state.deleteConfirmModalOpen = false;
        state.deleteConfirmDraft = defaultDeleteConfirmDraft();
        setStatus(state, 'Deleted ' + label + '.');
        state.selectedPersonaKey = null;
        clearSelectedPersona(state);
        return reloadPersonaList(state, null);
      })
      .catch(function (error) {
        state.deleteConfirmError = stringifyError(error);
        setError(state, state.deleteConfirmError);
        renderState(state);
        throw error;
      })
      .finally(function () {
        state.deleteConfirmSubmitting = false;
        renderState(state);
      });
  }

  function personaKeyExists(state, key) {
    var normalized = String(key || '').trim().toLowerCase();
    return ensureArray(state.personas).some(function (persona) {
      return String((persona && persona.key) || '').trim().toLowerCase() === normalized;
    });
  }

  function nextAvailablePersonaKey(state, value) {
    var base = slugifyKey(value, 'new-persona');
    var candidate = base;
    var index = 2;
    while (personaKeyExists(state, candidate)) {
      var suffix = '-' + index;
      candidate = base.slice(0, Math.max(1, 80 - suffix.length)) + suffix;
      index += 1;
    }
    return candidate;
  }

  function openCreatePersonaModal(state, metadataGroup) {
    if (!requireConsultantOrganizationContext(state)) {
      return;
    }
    var folder = normalizePersonaFolderLabel(metadataGroup);
    if (folder === UNGROUPED_PERSONA_GROUP) {
      folder = '';
    }
    state.createPersonaDraft = defaultCreatePersonaDraft(folder);
    state.createPersonaKeyTouched = false;
    state.createPersonaError = '';
    state.createPersonaModalOpen = true;
    renderState(state);
  }

  function closeCreatePersonaModal(state) {
    if (state.createPersonaSubmitting) return;
    state.createPersonaModalOpen = false;
    state.createPersonaDraft = defaultCreatePersonaDraft('');
    state.createPersonaKeyTouched = false;
    state.createPersonaError = '';
    renderState(state);
  }

  function submitCreatePersona(state) {
    if (state.createPersonaSubmitting) {
      return Promise.resolve(null);
    }
    var draft = ensureObject(state.createPersonaDraft);
    var key = slugifyKey(draft.key || draft.displayName, '');
    var displayName = String(draft.displayName || '').replace(/\s+/g, ' ').trim();
    var description = String(draft.description || '').trim();
    var metadataGroup = normalizePersonaFolderLabel(draft.metadataGroup);

    if (!displayName) {
      state.createPersonaError = 'Name is required.';
      renderState(state);
      return Promise.resolve(null);
    }
    if (!key) {
      state.createPersonaError = 'Key is required.';
      renderState(state);
      return Promise.resolve(null);
    }
    if (personaKeyExists(state, key)) {
      state.createPersonaError = 'A persona with that key already exists.';
      renderState(state);
      return Promise.resolve(null);
    }
    if (displayName.length > 120) {
      state.createPersonaError = 'Name must be 120 characters or fewer.';
      renderState(state);
      return Promise.resolve(null);
    }
    if (description.length > 500) {
      state.createPersonaError = 'Description must be 500 characters or fewer.';
      renderState(state);
      return Promise.resolve(null);
    }
    if (
      state.dirty &&
      !window.confirm('Create ' + displayName + '? Unsaved changes on the current persona will be discarded when the new draft opens.')
    ) {
      return Promise.resolve(null);
    }

    state.createPersonaSubmitting = true;
    state.createPersonaError = '';
    setStatus(state, 'Creating persona draft...');
    renderState(state);

    return request('POST', '/admin/persona-studio/personas', {
      key: key,
      displayName: displayName,
      description: description,
      metadataGroup: metadataGroup,
      organizationId: selectedConsultantOrganizationId(state),
    }, personaAuthoringQuery(state))
      .then(function (payload) {
        var nextKey = (payload && payload.definition && payload.definition.key) || key;
        state.personaFolders = mergePersonaFolderLabels(state.personaFolders, [metadataGroup]);
        state.navGroupExpansion[personaFolderGroupKey(metadataGroup || UNGROUPED_PERSONA_GROUP)] = true;
        state.createPersonaModalOpen = false;
        state.createPersonaDraft = defaultCreatePersonaDraft('');
        state.createPersonaKeyTouched = false;
        setStatus(state, 'Created ' + displayName + '.');
        return refreshBootstrapAndPersona(state, nextKey);
      })
      .catch(function (error) {
        state.createPersonaError = stringifyError(error);
        setError(state, state.createPersonaError);
        renderState(state);
        throw error;
      })
      .finally(function () {
        state.createPersonaSubmitting = false;
        renderState(state);
      });
  }

  function openCreateFolderModal(state) {
    if (!requireConsultantOrganizationContext(state)) {
      return;
    }
    state.folderDraft = defaultPersonaFolderDraft();
    state.folderCreateError = '';
    state.folderCreateModalOpen = true;
    renderState(state);
  }

  function closeCreateFolderModal(state) {
    if (state.folderCreateSubmitting) return;
    state.folderCreateModalOpen = false;
    state.folderDraft = defaultPersonaFolderDraft();
    state.folderCreateError = '';
    renderState(state);
  }

  function submitCreateFolder(state) {
    if (state.folderCreateSubmitting) {
      return Promise.resolve(null);
    }
    var folderName = normalizePersonaFolderLabel(state.folderDraft && state.folderDraft.name);
    var description = String((state.folderDraft && state.folderDraft.description) || '').trim();
    if (!folderName) {
      state.folderCreateError = 'Folder name is required.';
      renderState(state);
      return Promise.resolve(null);
    }
    if (folderName.length > 120) {
      state.folderCreateError = 'Folder name must be 120 characters or fewer.';
      renderState(state);
      return Promise.resolve(null);
    }
    if (isReservedPersonaFolderLabel(folderName)) {
      state.folderCreateError = folderName + ' is reserved by Persona Studio.';
      renderState(state);
      return Promise.resolve(null);
    }
    var exists = personaFolderLabels(state).some(function (label) {
      return personaFolderGroupKey(label) === personaFolderGroupKey(folderName);
    });
    if (exists) {
      state.folderCreateError = 'That folder already exists.';
      renderState(state);
      return Promise.resolve(null);
    }

    var authorOrganizationId = consultantOrganizationIdForCustomToolRegistration(state);
    var createRequest = authorOrganizationId
      ? request(
          'POST',
          '/organizations/' + encodeURIComponent(authorOrganizationId) + '/persona-studio/categories',
          {
            key: personaFolderCategoryKey(folderName),
            label: folderName,
            description: description || null,
            metadata: {
              kind: 'PERSONA_FOLDER',
              personaFolder: true,
              metadataGroup: folderName,
            },
          }
        )
      : Promise.resolve(null);

    state.folderCreateSubmitting = true;
    state.folderCreateError = '';
    setStatus(state, authorOrganizationId ? 'Creating folder...' : 'Creating local folder...');
    renderState(state);

    return createRequest
      .then(function () {
        state.personaFolders = mergePersonaFolderLabels(state.personaFolders, [folderName]);
        state.navGroupExpansion[personaFolderGroupKey(folderName)] = true;
        state.navScrollTargetGroupKey = personaFolderGroupKey(folderName);
        state.folderCreateModalOpen = false;
        state.folderDraft = defaultPersonaFolderDraft();
        setStatus(state, authorOrganizationId
          ? 'Created folder ' + folderName + '.'
          : 'Created local folder ' + folderName + '. Add a persona to persist the group.');
        if (authorOrganizationId) {
          return refreshAssetRegistry(state).catch(function () {
            return null;
          });
        }
        return null;
      })
      .catch(function (error) {
        state.folderCreateError = stringifyError(error);
        setError(state, state.folderCreateError);
        renderState(state);
        throw error;
      })
      .finally(function () {
        state.folderCreateSubmitting = false;
        renderState(state);
      });
  }

  function tooltipLabel(helpText) {
    var text = String(helpText || '').trim();
    var sentenceMatch = text.match(/^.*?[.!?](\s|$)/);
    var firstSentence = sentenceMatch ? sentenceMatch[0].trim() : text;
    return 'Show help: ' + (firstSentence.length > 90 ? firstSentence.slice(0, 87) + '...' : firstSentence);
  }

  function ensureFloatingTooltip() {
    var globalState = getGlobalState();
    if (globalState.tooltipEl && document.body.contains(globalState.tooltipEl)) {
      return globalState.tooltipEl;
    }
    var tooltip = document.getElementById('persona-lab-floating-tooltip') || createEl('div', 'persona-lab-floating-tooltip');
    tooltip.id = 'persona-lab-floating-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    if (!tooltip.parentNode) {
      document.body.appendChild(tooltip);
    }
    globalState.tooltipEl = tooltip;
    if (!globalState.tooltipKeyHandlerInstalled) {
      globalState.tooltipKeyHandlerInstalled = true;
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          hideFloatingTooltip();
        }
      });
    }
    return tooltip;
  }

  function fillFloatingTooltip(tooltip, helpText) {
    var text = String(helpText || '').trim();
    tooltip.innerHTML = '';
    var exampleMatch = text.match(/\bExamples?:/i);
    if (!exampleMatch) {
      tooltip.appendChild(createEl('p', null, text));
      return;
    }
    var body = text.slice(0, exampleMatch.index).trim();
    var example = text.slice(exampleMatch.index).trim();
    if (body) {
      tooltip.appendChild(createEl('p', null, body));
    }
    tooltip.appendChild(createEl('div', 'persona-lab-floating-tooltip-example', example));
  }

  function positionFloatingTooltip(trigger, tooltip) {
    var triggerRect = trigger.getBoundingClientRect();
    var tooltipRect = tooltip.getBoundingClientRect();
    var gap = 10;
    var margin = 12;
    var left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));
    var top = triggerRect.top - tooltipRect.height - gap;
    if (top < margin) {
      top = triggerRect.bottom + gap;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function showFloatingTooltip(trigger, helpText) {
    var tooltip = ensureFloatingTooltip();
    fillFloatingTooltip(tooltip, helpText);
    tooltip.classList.add('visible');
    positionFloatingTooltip(trigger, tooltip);
    trigger.setAttribute('aria-describedby', tooltip.id);
    getGlobalState().activeTooltipTrigger = trigger;
  }

  function hideFloatingTooltip(trigger) {
    var globalState = getGlobalState();
    if (trigger && globalState.activeTooltipTrigger && globalState.activeTooltipTrigger !== trigger) {
      return;
    }
    if (globalState.tooltipEl) {
      globalState.tooltipEl.classList.remove('visible');
    }
    if (globalState.activeTooltipTrigger) {
      globalState.activeTooltipTrigger.removeAttribute('aria-describedby');
    }
    globalState.activeTooltipTrigger = null;
  }

  function createTooltip(helpText) {
    var trigger = createEl('button', 'persona-lab-tooltip', '?');
    trigger.type = 'button';
    trigger.setAttribute('aria-label', tooltipLabel(helpText));
    trigger.addEventListener('mouseenter', function () {
      showFloatingTooltip(trigger, helpText);
    });
    trigger.addEventListener('mouseleave', function () {
      hideFloatingTooltip(trigger);
    });
    trigger.addEventListener('focus', function () {
      showFloatingTooltip(trigger, helpText);
    });
    trigger.addEventListener('blur', function () {
      hideFloatingTooltip(trigger);
    });
    trigger.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (getGlobalState().activeTooltipTrigger === trigger) {
        hideFloatingTooltip(trigger);
      } else {
        showFloatingTooltip(trigger, helpText);
      }
    });
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

  function renderCustomToolRegistrationPanel(state) {
    var draft = Object.assign(defaultCustomToolDraft(), ensureObject(state.customToolDraft));
    state.customToolDraft = draft;
    var wrapper = createEl('div', 'persona-lab-custom-tool-registration');
    appendSectionHeading(
      wrapper,
      'h3',
      'Register MCPViews tool',
      'Add a consultant-owned plugin tool by namespace.tool-name, then select it for this persona through MCPViews relay.'
    );

    var grid = createEl('div', 'persona-lab-grid');
    var keyInput = markFocusKey(createEl('input', 'persona-lab-input'), 'custom-tool-key');
    keyInput.value = draft.toolKey;
    keyInput.placeholder = 'namespace.tool-name';
    bindInput(keyInput, function () {
      draft.toolKey = keyInput.value;
    });
    renderFieldGroup(
      grid,
      'Tool key',
      keyInput,
      'The plugin namespace and tool name. Example: acme.lookup-account.'
    );

    var labelInput = markFocusKey(createEl('input', 'persona-lab-input'), 'custom-tool-label');
    labelInput.value = draft.label;
    labelInput.placeholder = 'Lookup account';
    bindInput(labelInput, function () {
      draft.label = labelInput.value;
    });
    renderFieldGroup(
      grid,
      'Label',
      labelInput,
      'Human-readable name shown in the persona tool selector.'
    );

    var connectorInput = markFocusKey(createEl('input', 'persona-lab-input'), 'custom-tool-connector');
    connectorInput.value = draft.connectorLabel;
    connectorInput.placeholder = 'Acme';
    bindInput(connectorInput, function () {
      draft.connectorLabel = connectorInput.value;
    });
    renderFieldGroup(
      grid,
      'Service label',
      connectorInput,
      'Optional label for the service group. Defaults to the namespace.'
    );

    var operationSelect = markFocusKey(createEl('select', 'persona-lab-select'), 'custom-tool-operation');
    [
      { value: 'read', label: 'Read' },
      { value: 'write', label: 'Write' },
      { value: 'destructive', label: 'Destructive' },
    ].forEach(function (entry) {
      var option = document.createElement('option');
      option.value = entry.value;
      option.textContent = entry.label;
      if (draft.operationKind === entry.value) option.selected = true;
      operationSelect.appendChild(option);
    });
    bindInput(operationSelect, function () {
      draft.operationKind = operationSelect.value;
    });
    renderFieldGroup(
      grid,
      'Operation',
      operationSelect,
      'Risk level used for review and relay metadata.'
    );

    var descriptionInput = markFocusKey(createEl('textarea', 'persona-lab-textarea'), 'custom-tool-description');
    descriptionInput.value = draft.description;
    bindInput(descriptionInput, function () {
      draft.description = descriptionInput.value;
    });
    renderFieldGroup(
      grid,
      'Description',
      descriptionInput,
      'Short description of when the persona should use this tool.'
    );

    var connectorDescriptionInput = markFocusKey(createEl('textarea', 'persona-lab-textarea'), 'custom-tool-connector-description');
    connectorDescriptionInput.value = draft.connectorDescription;
    bindInput(connectorDescriptionInput, function () {
      draft.connectorDescription = connectorDescriptionInput.value;
    });
    renderFieldGroup(
      grid,
      'Service notes',
      connectorDescriptionInput,
      'Optional notes for the service-level connector record.'
    );

    var metadataInput = markFocusKey(createEl('textarea', 'persona-lab-textarea json'), 'custom-tool-metadata');
    metadataInput.style.minHeight = '140px';
    metadataInput.value = draft.metadataText;
    bindInput(metadataInput, function () {
      draft.metadataText = metadataInput.value;
    });
    var metadataField = renderFieldGroup(
      grid,
      'Metadata JSON',
      metadataInput,
      'Optional JSON metadata. Include inputSchema to describe tool arguments.'
    );
    metadataField.style.gridColumn = '1 / -1';

    wrapper.appendChild(grid);

    var actions = createEl('div', 'persona-lab-inline');
    actions.style.justifyContent = 'flex-end';
    if (state.customToolError) {
      actions.style.justifyContent = 'space-between';
      actions.appendChild(createEl('div', 'persona-lab-error', state.customToolError));
    }
    var button = createEl(
      'button',
      'persona-lab-button',
      state.customToolRegistering ? 'Registering...' : 'Register tool'
    );
    button.type = 'button';
    button.disabled = Boolean(state.customToolRegistering);
    button.addEventListener('click', function () {
      registerCustomMcpTool(state);
    });
    actions.appendChild(button);
    wrapper.appendChild(actions);
    return wrapper;
  }

  function compactRuleText(value) {
    var text = String(value || '').trim();
    if (!text) return 'Blank rule';
    return text.length > 96 ? text.slice(0, 93) + '...' : text;
  }

  function compactSkillContent(value) {
    var text = String(value || '').trim();
    if (!text) return 'No content yet.';
    return text.length > 520 ? text.slice(0, 517) + '...' : text;
  }

  function isDefaultCustomSkillTitle(value) {
    return String(value || '').trim().toLowerCase() === CUSTOM_SKILL_DEFAULT_TITLE.toLowerCase();
  }

  function customSkillDisplayName(skill, index) {
    var title = String(skill && skill.title ? skill.title : '').trim();
    var key = String(skill && skill.key ? skill.key : '').trim();
    var summary = String(skill && skill.summary ? skill.summary : '').trim();
    if (title && !isDefaultCustomSkillTitle(title)) return title;
    if (key) return humanizeIdentifier(key);
    if (summary && summary !== CUSTOM_SKILL_DEFAULT_SUMMARY) {
      return summary.length > 72 ? summary.slice(0, 69) + '...' : summary;
    }
    return 'Custom skill ' + (index + 1);
  }

  function customSkillSummaryMeta(skill) {
    var summary = String(skill && skill.summary ? skill.summary : '').trim();
    var key = String(skill && skill.key ? skill.key : '').trim();
    if (summary && summary !== CUSTOM_SKILL_DEFAULT_SUMMARY) {
      return summary.length > 96 ? summary.slice(0, 93) + '...' : summary;
    }
    return key;
  }

  function nextCustomSkillKey(skills) {
    var existing = {};
    ensureArray(skills).forEach(function (skill) {
      var key = String(skill && skill.key ? skill.key : '').trim();
      if (key) existing[key] = true;
    });
    var index = ensureArray(skills).length + 1;
    var key = 'custom-skill-' + index;
    while (existing[key]) {
      index += 1;
      key = 'custom-skill-' + index;
    }
    return key;
  }

  function serializeSkillVariableForSave(variable, index) {
    var source = ensureObject(variable);
    var serialized = {
      name: String(source.name || '').trim(),
      label: String(source.label || '').trim(),
      type: String(source.type || 'text').trim() || 'text',
      required: source.required !== false,
    };
    if (source.default !== undefined) {
      serialized.default = source.default;
    }
    if (!serialized.label) {
      serialized.label = serialized.name || 'Variable ' + (index + 1);
    }
    return serialized;
  }

  function serializeCustomSkillForSave(skill, index) {
    var source = ensureObject(skill);
    var title = String(source.title || '').trim();
    return {
      key: String(source.key || '').trim(),
      title: title && !isDefaultCustomSkillTitle(title) ? title : customSkillDisplayName(source, index),
      summary: String(source.summary || '').trim(),
      content: source.content == null ? '' : String(source.content),
      variables: ensureArray(source.variables).map(serializeSkillVariableForSave),
    };
  }

  function validateCustomSkillsForSave(skills) {
    var errors = [];
    var skillKeys = {};
    ensureArray(skills).forEach(function (skill, index) {
      var label = 'Custom skill ' + (index + 1);
      var key = String(skill && skill.key ? skill.key : '').trim();
      if (!key) {
        errors.push(label + ' needs a key.');
      } else if (skillKeys[key]) {
        errors.push('Custom skill key "' + key + '" is used more than once.');
      } else {
        skillKeys[key] = true;
      }
      if (!String(skill && skill.title ? skill.title : '').trim()) {
        errors.push((key || label) + ' needs a title.');
      }
      if (!String(skill && skill.summary ? skill.summary : '').trim()) {
        errors.push((key || label) + ' needs a summary.');
      }
      if (!String(skill && skill.content ? skill.content : '').trim()) {
        errors.push((key || label) + ' needs prompt content.');
      }
      var variableNames = {};
      ensureArray(skill && skill.variables).forEach(function (variable, variableIndex) {
        var variableLabel = (key || label) + ' variable ' + (variableIndex + 1);
        var name = String(variable && variable.name ? variable.name : '').trim();
        if (!name) {
          errors.push(variableLabel + ' needs a name.');
        } else if (variableNames[name]) {
          errors.push((key || label) + ' variable "' + name + '" is used more than once.');
        } else {
          variableNames[name] = true;
        }
      });
    });
    return errors;
  }

  function skillVariableMergeToken(variable) {
    var name = String(variable && variable.name ? variable.name : '').trim();
    return name ? '{{' + name + '}}' : '';
  }

  function insertTextAtTextareaCursor(textarea, text) {
    if (!textarea || !text) return;
    var value = String(textarea.value || '');
    var start = typeof textarea.selectionStart === 'number' ? textarea.selectionStart : value.length;
    var end = typeof textarea.selectionEnd === 'number' ? textarea.selectionEnd : start;
    var prefix = value.slice(0, start);
    var suffix = value.slice(end);
    var nextValue = prefix + text + suffix;
    textarea.value = nextValue;
    var nextCursor = start + text.length;
    textarea.focus();
    if (typeof textarea.setSelectionRange === 'function') {
      textarea.setSelectionRange(nextCursor, nextCursor);
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function buildSkillVariableInsertTools(skill, editor) {
    function currentVariables() {
      return ensureArray(skill && skill.variables)
        .map(function (variable, index) { return normalizeSkillVariable(variable, index); })
        .filter(function (variable) { return Boolean(String(variable.name || '').trim()); });
    }

    var initialVariables = currentVariables();

    var wrapper = createEl('div', 'persona-lab-skill-editor-tools');
    wrapper.appendChild(
      createEl(
        'div',
        'persona-lab-helper',
        initialVariables.length
          ? 'Insert a merge token into the skill prompt. Runtime expansion replaces tokens such as {{account_name}} with the collected value.'
          : 'Add variables to this skill, then insert merge tokens into the prompt from here.'
      )
    );

    var picker = createEl('details', 'persona-lab-variable-picker');
    var summary = createEl('summary', 'persona-lab-button');
    summary.textContent = initialVariables.length ? 'Insert variable' : 'No variables';
    summary.title = initialVariables.length
      ? 'Find a skill variable and insert its merge token at the cursor.'
      : 'Add a variable to this skill before inserting merge tokens.';
    if (!initialVariables.length) {
      summary.setAttribute('aria-disabled', 'true');
    }
    picker.appendChild(summary);

    if (initialVariables.length) {
      var menu = createEl('div', 'persona-lab-variable-picker-menu');
      var search = disableSmartText(createEl('input', 'persona-lab-input'));
      search.type = 'search';
      search.placeholder = 'Find variable';
      search.setAttribute('aria-label', 'Find skill variable');
      var list = createEl('div', 'persona-lab-variable-picker-list');

      function renderOptions() {
        var variables = currentVariables();
        var query = String(search.value || '').trim().toLowerCase();
        list.innerHTML = '';
        var matches = variables.filter(function (variable) {
          var haystack = [
            variable.name,
            variable.label,
            variable.type,
            variable.default == null ? '' : String(variable.default),
          ].join(' ').toLowerCase();
          return !query || haystack.indexOf(query) >= 0;
        });
        if (!matches.length) {
          list.appendChild(createEl('div', 'persona-lab-empty', 'No matching variables.'));
          return;
        }
        matches.forEach(function (variable) {
          var token = skillVariableMergeToken(variable);
          var button = createEl('button', 'persona-lab-variable-token');
          button.type = 'button';
          button.title = 'Insert ' + token;
          button.appendChild(createEl('span', null, variable.label || variable.name));
          button.appendChild(createEl('code', null, token));
          button.addEventListener('click', function () {
            insertTextAtTextareaCursor(editor, token);
            picker.open = false;
          });
          list.appendChild(button);
        });
      }

      search.addEventListener('input', renderOptions);
      picker.addEventListener('toggle', function () {
        if (!picker.open) return;
        renderOptions();
        setTimeout(function () {
          search.focus();
          search.select();
        }, 0);
      });
      renderOptions();
      menu.appendChild(search);
      menu.appendChild(list);
      picker.appendChild(menu);
    }

    wrapper.appendChild(picker);
    return wrapper;
  }

  function ensureVariableRowId(state, variable) {
    if (!variable) return '';
    if (!variable.__personaRowId) {
      Object.defineProperty(variable, '__personaRowId', {
        value: 'variable-row-' + (++state.skillVariableRowSequence),
        enumerable: false,
        configurable: true,
      });
    }
    return variable.__personaRowId;
  }

  function defaultSkillVariable(index) {
    return {
      name: 'variable_' + (index + 1),
      label: 'Variable ' + (index + 1),
      type: 'text',
      default: '',
      required: true,
    };
  }

  function buildSkillVariableEditor(state, skill, skillIndex) {
    skill.variables = ensureArray(skill.variables).map(function (variable, index) {
      if (variable && typeof variable === 'object' && !Array.isArray(variable)) {
        var normalized = normalizeSkillVariable(variable, index);
        Object.assign(variable, normalized);
        return variable;
      }
      return normalizeSkillVariable(variable, index);
    });
    var wrapper = createEl('div', 'persona-lab-section-list');
    var header = createEl('div', 'persona-lab-skill-header');
    appendSectionHeading(
	      header,
	      'h3',
	      'Variables',
	      'Variables let a skill ask for user-specific values before the prompt is generated. Example: audience, account_name, date_start.'
    );
    var addVariable = markScrollAnchor(
      createEl('button', 'persona-lab-button', 'Add variable'),
      'custom-skill-' + skillIndex + '-add-variable'
    );
    addVariable.type = 'button';
    addVariable.addEventListener('click', function () {
      captureContentScrollAnchor(state, addVariable);
      skill.variables.push(defaultSkillVariable(skill.variables.length));
      state.expandedCustomSkillIndex = skillIndex;
      updateDirtyState(state);
      renderState(state);
    });
    header.appendChild(addVariable);
    wrapper.appendChild(header);

	    var list = createEl('div', 'persona-lab-variable-list');
	    if (!skill.variables.length) {
	      list.appendChild(createEl('div', 'persona-lab-empty', 'No variables for this custom skill.'));
    }
    skill.variables.forEach(function (variable, variableIndex) {
      var rowId = ensureVariableRowId(state, variable);
      var row = createEl('div', 'persona-lab-variable-row');

      var nameInput = disableSmartText(markFocusKey(createEl('input', 'persona-lab-input'), 'skill-' + skillIndex + '-' + rowId + '-name'));
      nameInput.value = variable.name || '';
      bindInput(nameInput, function () {
        variable.name = nameInput.value;
        updateDirtyState(state);
      });
      renderFieldGroup(row, 'Name', nameInput, 'Machine-readable variable name. Use lowercase snake_case. Example: account_name.');

      var labelInput = markFocusKey(createEl('input', 'persona-lab-input'), 'skill-' + skillIndex + '-' + rowId + '-label');
      labelInput.value = variable.label || '';
      bindInput(labelInput, function () {
        variable.label = labelInput.value;
        updateDirtyState(state);
      });
      renderFieldGroup(row, 'Label', labelInput, 'Short label shown to the person filling out the skill. Example: Account name.');

      var typeSelect = markFocusKey(createEl('select', 'persona-lab-select'), 'skill-' + skillIndex + '-' + rowId + '-type');
      ['text', 'textarea', 'datetime', 'email_account_multi_select', 'number', 'boolean'].forEach(function (type) {
        var option = document.createElement('option');
        option.value = type;
        option.textContent = humanizeIdentifier(type);
        if ((variable.type || 'text') === type) option.selected = true;
        typeSelect.appendChild(option);
      });
      bindInput(typeSelect, function () {
        variable.type = typeSelect.value;
        updateDirtyState(state);
      });
      renderFieldGroup(row, 'Type', typeSelect, 'Input type used when collecting the value. Example: textarea for a long customer brief.');

      var defaultInput = disableSmartText(markFocusKey(createEl('input', 'persona-lab-input'), 'skill-' + skillIndex + '-' + rowId + '-default'));
      defaultInput.value = variable.default == null ? '' : String(variable.default);
      bindInput(defaultInput, function () {
        variable.default = defaultInput.value;
        updateDirtyState(state);
      });
      renderFieldGroup(row, 'Default', defaultInput, 'Optional default value used when the person does not provide one. Example: Current quarter.');

      var requiredLabel = createEl('label', 'persona-lab-toggle persona-lab-variable-required');
      var requiredInput = document.createElement('input');
      requiredInput.type = 'checkbox';
      requiredInput.checked = variable.required !== false;
      requiredInput.addEventListener('change', function () {
        variable.required = requiredInput.checked;
        updateDirtyState(state);
      });
      requiredLabel.appendChild(requiredInput);
      requiredLabel.appendChild(document.createTextNode('Required'));
      row.appendChild(requiredLabel);

      var remove = createEl('button', 'persona-lab-button', 'Remove');
      remove.type = 'button';
      remove.addEventListener('click', function () {
        skill.variables.splice(variableIndex, 1);
        state.expandedCustomSkillIndex = skillIndex;
        updateDirtyState(state);
        renderState(state);
      });
      row.appendChild(remove);
      list.appendChild(row);
    });
    wrapper.appendChild(list);
    return wrapper;
  }

  function openCustomSkillEditor(state, index) {
    var skills = ensureArray(state.form && state.form.customSkills);
    if (index < 0 || index >= skills.length) return;
    state.skillEditorOpen = true;
    state.skillEditorIndex = index;
    state.skillEditorDraft = skills[index].content || '';
    state.skillEditorError = '';
    renderState(state);
  }

  function closeCustomSkillEditor(state) {
    state.skillEditorOpen = false;
    state.skillEditorIndex = -1;
    state.skillEditorDraft = '';
    state.skillEditorError = '';
    renderState(state);
  }

  function saveCustomSkillEditor(state) {
    var skills = ensureArray(state.form && state.form.customSkills);
    if (state.skillEditorIndex < 0 || state.skillEditorIndex >= skills.length) {
      state.skillEditorError = 'This skill is no longer available.';
      renderState(state);
      return;
    }
    skills[state.skillEditorIndex].content = state.skillEditorDraft || '';
    updateDirtyState(state);
    closeCustomSkillEditor(state);
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
      if (item.variables && item.variables.length) {
        var variableList = createEl('div', 'persona-lab-choice-variable-list');
        item.variables.forEach(function (variable) {
          variableList.appendChild(
            createEl(
              'span',
              'persona-lab-badge',
              (variable.label || variable.name) + ' · ' + variable.type
            )
          );
        });
        copy.appendChild(variableList);
      }
      if (item.sourceBadge || item.installed !== null || item.authRequired) {
        var badges = createEl('div', 'persona-lab-choice-variable-list');
        if (item.sourceBadge) {
          badges.appendChild(createEl('span', 'persona-lab-badge', item.sourceBadge));
        }
        if (item.installed !== null) {
          badges.appendChild(createEl('span', 'persona-lab-badge', item.installed ? 'installed' : 'not installed'));
        }
        if (item.authRequired) {
          badges.appendChild(createEl('span', 'persona-lab-badge', 'auth required'));
        }
        copy.appendChild(badges);
      }
      row.appendChild(copy);
      grid.appendChild(row);
    });
    return grid;
  }

  function groupedChoiceCountLabel(count, singular, plural) {
    return formatNumber(count) + ' ' + (count === 1 ? singular : plural);
  }

  function sortGroupedChoiceLabels(left, right) {
    if (left === 'Unregistered' && right !== 'Unregistered') return 1;
    if (right === 'Unregistered' && left !== 'Unregistered') return -1;
    if (left === UNGROUPED_PERSONA_GROUP && right !== UNGROUPED_PERSONA_GROUP) return 1;
    if (right === UNGROUPED_PERSONA_GROUP && left !== UNGROUPED_PERSONA_GROUP) return -1;
    return left.localeCompare(right);
  }

  function buildGroupedChoiceSelector(items, selected, onToggle, config) {
    var selectorConfig = Object.assign({
      defaultGroup: UNGROUPED_PERSONA_GROUP,
      emptyMessage: 'No registry items are available.',
      itemSingular: 'item',
      itemPlural: 'items',
	      searchPlaceholder: 'Search names, keys, descriptions, or metadata groups',
	      searchLabel: 'Search registry items',
	      copyLabel: 'Copy key',
	      showKeys: true,
	      showCopyButton: true,
	    }, ensureObject(config));
    var selectedValues = ensureArray(selected);
    var selectedSet = new Set(selectedValues.map(function (value) { return String(value); }));
    var options = mergeChoiceOptions(items, selectedValues);
    var root = createEl('div', 'persona-lab-runtime-tools');
    var toolbar = createEl('div', 'persona-lab-tool-toolbar');
    var search = createEl('input', 'persona-lab-input');
    search.type = 'search';
    search.placeholder = selectorConfig.searchPlaceholder;
    search.setAttribute('aria-label', selectorConfig.searchLabel);
    toolbar.appendChild(search);
    var toolbarActions = createEl('div', 'persona-lab-tool-toolbar-actions');
    var selectedToggle = createEl('label', 'persona-lab-toggle');
    var selectedOnly = document.createElement('input');
    selectedOnly.type = 'checkbox';
    selectedToggle.appendChild(selectedOnly);
    selectedToggle.appendChild(document.createTextNode('Selected only'));
    toolbarActions.appendChild(selectedToggle);
    var expandAll = createEl('button', 'persona-lab-button small', 'Expand all');
    expandAll.type = 'button';
    expandAll.addEventListener('click', function () {
      Array.prototype.forEach.call(root.querySelectorAll('.persona-lab-tool-group:not(.hidden)'), function (group) {
        group.open = true;
      });
    });
    toolbarActions.appendChild(expandAll);
    var collapseAll = createEl('button', 'persona-lab-button small', 'Collapse all');
    collapseAll.type = 'button';
    collapseAll.addEventListener('click', function () {
      Array.prototype.forEach.call(root.querySelectorAll('.persona-lab-tool-group'), function (group) {
        group.open = false;
      });
    });
    toolbarActions.appendChild(collapseAll);
    toolbarActions.appendChild(
      createEl('span', 'persona-lab-badge', formatNumber(selectedValues.length) + ' selected')
    );
    toolbar.appendChild(toolbarActions);
    search.addEventListener('input', function () {
      filterRuntimeToolRows(root, search.value, selectedOnly.checked);
    });
    selectedOnly.addEventListener('change', function () {
      filterRuntimeToolRows(root, search.value, selectedOnly.checked);
    });
    root.appendChild(toolbar);

    var groups = new Map();
    options.forEach(function (option) {
      var groupLabel = String(option.group || selectorConfig.defaultGroup || UNGROUPED_PERSONA_GROUP).trim()
        || UNGROUPED_PERSONA_GROUP;
      var groupKey = groupLabel.toLowerCase();
      var group = groups.get(groupKey);
      if (!group) {
        group = {
          key: groupKey,
          label: groupLabel,
          options: [],
        };
        groups.set(groupKey, group);
      }
      group.options.push(option);
    });

    Array.from(groups.keys()).sort(function (leftKey, rightKey) {
      var leftGroup = groups.get(leftKey);
      var rightGroup = groups.get(rightKey);
      return sortGroupedChoiceLabels(leftGroup ? leftGroup.label : leftKey, rightGroup ? rightGroup.label : rightKey);
    }).forEach(function (groupKey) {
      var group = groups.get(groupKey);
      if (!group) return;
      var selectedCount = group.options.filter(function (option) {
        return selectedSet.has(String(option.value || option.key));
      }).length;
      var groupEl = createEl('details', 'persona-lab-tool-group persona-lab-details');
      groupEl.open = Boolean(selectedCount || groups.size <= 1);
      var header = createEl('summary', 'persona-lab-tool-group-header persona-lab-details-summary');
      header.appendChild(createEl('span', 'persona-lab-details-caret', '›'));
      var headerCopy = createEl('div');
      headerCopy.appendChild(createEl('strong', null, group.label));
      headerCopy.appendChild(createEl('code', null, group.key));
      header.appendChild(headerCopy);
      var headerMeta = createEl('div', 'persona-lab-tool-group-meta');
      if (selectedCount) {
        headerMeta.appendChild(createEl('span', 'persona-lab-badge', formatNumber(selectedCount) + ' selected'));
      }
      headerMeta.appendChild(
        createEl(
          'span',
          'persona-lab-badge',
          groupedChoiceCountLabel(group.options.length, selectorConfig.itemSingular, selectorConfig.itemPlural)
        )
      );
      header.appendChild(headerMeta);
      groupEl.appendChild(header);
      var list = createEl('div', 'persona-lab-tool-list');
      group.options.sort(function (left, right) {
        return String(left.label).localeCompare(String(right.label))
          || String(left.key).localeCompare(String(right.key));
      }).forEach(function (option) {
        var row = createEl('label', 'persona-lab-tool-row');
        var selectionValue = String(option.value || option.key);
        var displayKey = String(option.displayKey || option.key);
        var variableSearch = ensureArray(option.variables).map(function (variable) {
          return [variable.name, variable.label, variable.type].join(' ');
        }).join(' ');
        row.setAttribute(
          'data-search',
          [
            option.key,
            selectionValue,
            displayKey,
            option.label,
            option.description,
            option.group,
            option.kindLabel,
            option.sourceBadge,
            option.installed === null ? '' : (option.installed ? 'installed' : 'not installed'),
            option.authRequired ? 'auth required' : '',
            variableSearch,
          ].join(' ')
        );
        row.setAttribute('data-selected', selectedSet.has(selectionValue) ? 'true' : 'false');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = selectedSet.has(selectionValue);
        input.addEventListener('change', function () {
          onToggle(selectionValue);
        });
        row.appendChild(input);
        var copy = createEl('div', 'persona-lab-tool-copy');
        copy.appendChild(createEl('strong', null, option.label));
        if (selectorConfig.showKeys !== false) {
          copy.appendChild(createEl('code', null, displayKey));
        }
        if (option.description) {
          copy.appendChild(createEl('p', 'persona-lab-helper', option.description));
        }
        var badges = createEl('div', 'persona-lab-inline');
        if (option.kindLabel) {
          badges.appendChild(createEl('span', 'persona-lab-badge', option.kindLabel));
        }
        if (option.toolCount !== null) {
          badges.appendChild(createEl('span', 'persona-lab-badge', groupedChoiceCountLabel(option.toolCount, 'tool', 'tools')));
        }
        if (option.sourceBadge) {
          badges.appendChild(createEl('span', 'persona-lab-badge', option.sourceBadge));
        }
        if (option.installed !== null) {
          badges.appendChild(createEl('span', 'persona-lab-badge', option.installed ? 'installed' : 'not installed'));
        }
        if (option.authRequired) {
          badges.appendChild(createEl('span', 'persona-lab-badge', 'auth required'));
        }
        if (badges.childNodes.length) {
          copy.appendChild(badges);
        }
        if (option.variables && option.variables.length) {
          var variableList = createEl('div', 'persona-lab-choice-variable-list');
          option.variables.forEach(function (variable) {
            variableList.appendChild(
              createEl(
                'span',
                'persona-lab-badge',
                (variable.label || variable.name) + ' · ' + variable.type
              )
            );
          });
          copy.appendChild(variableList);
        }
        row.appendChild(copy);
        if (selectorConfig.showCopyButton !== false) {
          var copyButton = createEl('button', 'persona-lab-button', selectorConfig.copyLabel);
          copyButton.type = 'button';
          copyButton.setAttribute('aria-label', selectorConfig.copyLabel + ' ' + displayKey);
          copyButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            copyText(displayKey);
          });
          row.appendChild(copyButton);
        }
        list.appendChild(row);
      });
      groupEl.appendChild(list);
      root.appendChild(groupEl);
    });

    if (!options.length) {
      root.appendChild(createEl('div', 'persona-lab-empty', selectorConfig.emptyMessage));
    }

    return root;
  }

  function copyText(value) {
    if (window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) {
      window.navigator.clipboard.writeText(String(value || '')).catch(function () {});
    }
  }

  function filterRuntimeToolRows(root, query, selectedOnly) {
    var normalized = String(query || '').trim().toLowerCase();
    Array.prototype.forEach.call(root.querySelectorAll('.persona-lab-tool-row'), function (row) {
      var haystack = String(row.getAttribute('data-search') || '').toLowerCase();
      var matchesQuery = !normalized || haystack.indexOf(normalized) >= 0;
      var matchesSelection = !selectedOnly || row.getAttribute('data-selected') === 'true';
      row.classList.toggle('hidden', !(matchesQuery && matchesSelection));
    });
    Array.prototype.forEach.call(root.querySelectorAll('.persona-lab-tool-group'), function (group) {
      var visibleRows = group.querySelectorAll('.persona-lab-tool-row:not(.hidden)').length;
      group.classList.toggle('hidden', visibleRows === 0);
      if ((normalized || selectedOnly) && visibleRows > 0) {
        group.open = true;
      }
    });
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
    if (!currentValue && allowEmpty === false && allOptions[0]) {
      currentValue = allOptions[0].id;
    }

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
        var priceLabel = modelPriceLabel(option);
        triggerLabel.textContent = option.label || option.id;
        triggerProvider.textContent = (option.providerLabel || providerLabel(option.provider))
          + (priceLabel ? ' · ' + priceLabel : '');
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
        var optionPrice = modelPriceLabel(option);
        if (optionPrice) {
          optionButton.appendChild(createEl('span', 'persona-lab-model-price', optionPrice));
        }
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
      setProviderExpanded(providerEl, containsSelected || (!currentValue && groupIndex === 0));
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

  function buildPersonaNavGroups(personas, folderLabels) {
    var groups = {};
    function ensureGroup(label) {
      var normalized = normalizePersonaFolderLabel(label) || UNGROUPED_PERSONA_GROUP;
      var key = personaFolderGroupKey(normalized);
      if (!groups[key]) {
        groups[key] = {
          key: key,
          label: normalized,
          personas: [],
        };
      }
      return groups[key];
    }
    ensureArray(folderLabels).forEach(ensureGroup);
    ensureArray(personas).forEach(function (persona) {
      if (!persona) return;
      var label = personaMetadataGroup(persona) || UNGROUPED_PERSONA_GROUP;
      ensureGroup(label).personas.push(persona);
    });
    return Object.keys(groups).map(function (key) {
      groups[key].personas.sort(function (left, right) {
        return String(left.displayName || '').localeCompare(String(right.displayName || ''))
          || String(left.key || '').localeCompare(String(right.key || ''));
      });
      return groups[key];
    }).sort(function (left, right) {
      if (left.label === SYSTEM_PERSONA_GROUP && right.label !== SYSTEM_PERSONA_GROUP) return -1;
      if (right.label === SYSTEM_PERSONA_GROUP && left.label !== SYSTEM_PERSONA_GROUP) return 1;
      if (left.label === UNGROUPED_PERSONA_GROUP && right.label !== UNGROUPED_PERSONA_GROUP) return 1;
      if (right.label === UNGROUPED_PERSONA_GROUP && left.label !== UNGROUPED_PERSONA_GROUP) return -1;
      return left.label.localeCompare(right.label);
    });
  }

  function personaCatalogItemFromAsset(asset) {
    if (!asset || asset.assetType !== 'PERSONA' || !asset.key) {
      return null;
    }
    if (asset.enabled === false || asset.installed === false || asset.status === 'ARCHIVED') {
      return null;
    }
    var metadata = ensureObject(asset.metadata);
    return {
      key: String(asset.key),
      definitionId: asset.personaDefinitionId || asset.id || '',
      displayName: String(asset.label || asset.name || asset.key),
      description: String(asset.description || ''),
      status: asset.status || 'ACTIVE',
      archivedAt: null,
      archiveReason: null,
      owner: asset.ownerOrganizationId ? 'consultant' : 'platform',
      ownerOrganizationId: asset.ownerOrganizationId || null,
      metadataGroup: String(
        asset.metadataGroup || asset.group || metadata.metadataGroup || metadata.group || 'Consultant'
      ),
      hasDraft: true,
      betaReleaseVersion: null,
      deployedReleaseVersion: null,
    };
  }

  function mergePersonaAssetsIntoCatalog(personas, assetRegistry) {
    var merged = ensureArray(personas).slice();
    var seen = {};
    merged.forEach(function (persona) {
      if (persona && persona.key) {
        seen[String(persona.key)] = true;
      }
    });
    ensureArray(assetRegistry && assetRegistry.assets).forEach(function (asset) {
      var item = personaCatalogItemFromAsset(asset);
      if (!item || seen[item.key]) return;
      seen[item.key] = true;
      merged.push(item);
    });
    return merged.sort(function (left, right) {
      return String(left.displayName || '').localeCompare(String(right.displayName || ''))
        || String(left.key || '').localeCompare(String(right.key || ''));
    });
  }

  function renderNavPersonaItem(state, persona) {
    var archived = personaIsArchived(persona);
    var item = createEl(
      'button',
      'persona-lab-nav-item' +
        (persona.key === state.selectedPersonaKey ? ' active' : '') +
        (archived ? ' archived' : '')
    );
    item.type = 'button';
    item.setAttribute('data-persona-key', String(persona.key || ''));
    item.addEventListener('click', function () {
      maybeSwitchPersona(state, persona.key);
    });
    item.appendChild(createEl('span', 'persona-lab-nav-file-icon'));
    var copy = createEl('span', 'persona-lab-nav-item-copy');
    copy.appendChild(createEl('span', 'persona-lab-nav-item-title', persona.displayName));
    copy.appendChild(createEl('code', null, persona.key));
    item.appendChild(copy);
    var meta = createEl('span', 'persona-lab-nav-item-meta');
    if (persona.key === state.selectedPersonaKey && state.dirty) {
      meta.appendChild(createEl('span', 'persona-lab-badge dirty', 'Unsaved'));
    }
    if (archived) meta.appendChild(createEl('span', 'persona-lab-badge archived', 'archived'));
    if (persona.betaReleaseVersion) meta.appendChild(createEl('span', 'persona-lab-badge', 'beta'));
    if (persona.deployedReleaseVersion) meta.appendChild(createEl('span', 'persona-lab-badge', 'deployed'));
    item.appendChild(meta);
    return item;
  }

  function buildNav(state) {
    var nav = createEl('aside', 'persona-lab-nav');
    var canAuthor = hasConsultantOrganizationContext(state);
    var header = createEl('div', 'persona-lab-nav-header');
    var copy = createEl('div');
    copy.appendChild(createEl('p', 'persona-lab-nav-title', 'Persona Studio'));
    copy.appendChild(createEl('strong', null, 'Personas'));
    if (state.organizationName) {
      copy.appendChild(createEl('span', 'persona-lab-badge', state.organizationName));
    }
    header.appendChild(copy);
    var createButton = createEl('button', 'persona-lab-button small', 'New persona');
    createButton.type = 'button';
    createButton.disabled = Boolean(state.showArchivedPersonas) || !canAuthor;
    createButton.addEventListener('click', function () {
      openCreatePersonaModal(state, '');
    });
    header.appendChild(createButton);
    nav.appendChild(header);

    var controls = createEl('div', 'persona-lab-nav-controls');
    var modeControl = createEl('div', 'persona-lab-segmented');
    var activeModeButton = createEl(
      'button',
      state.showArchivedPersonas ? '' : 'active',
      'Active'
    );
    activeModeButton.type = 'button';
    activeModeButton.disabled = !canAuthor;
    activeModeButton.addEventListener('click', function () {
      toggleArchivedPersonas(state, false);
    });
    var archiveModeButton = createEl(
      'button',
      state.showArchivedPersonas ? 'active' : '',
      'View archive'
    );
    archiveModeButton.type = 'button';
    archiveModeButton.disabled = !canAuthor;
    archiveModeButton.addEventListener('click', function () {
      toggleArchivedPersonas(state, true);
    });
    modeControl.appendChild(activeModeButton);
    modeControl.appendChild(archiveModeButton);
    controls.appendChild(modeControl);

    var folderButton = createEl('button', 'persona-lab-button small', 'New folder');
    folderButton.type = 'button';
    folderButton.disabled = !canAuthor;
    folderButton.addEventListener('click', function () {
      openCreateFolderModal(state);
    });
    if (!state.showArchivedPersonas) {
      controls.appendChild(folderButton);
    } else {
      controls.appendChild(createEl('span', 'persona-lab-badge archived', 'archive view'));
      controls.appendChild(createEl('div', 'persona-lab-helper', 'Archived personas are hidden from active authoring.'));
    }
    nav.appendChild(controls);

    var list = createEl('div', 'persona-lab-nav-list');
    var visiblePersonas = visiblePersonasForArchiveMode(state, state.personas);
    var navGroups = buildPersonaNavGroups(
      visiblePersonas,
      state.showArchivedPersonas ? [] : personaFolderLabels(state)
    );
    if (!navGroups.length) {
      list.appendChild(
        createEl(
          'div',
          'persona-lab-empty',
          state.showArchivedPersonas
            ? 'No archived persona drafts found.'
            : 'No active persona drafts found. View archive to inspect retired personas.'
        )
      );
    } else {
      navGroups.forEach(function (group) {
        var groupEl = createEl('details', 'persona-lab-nav-group');
        groupEl.setAttribute('data-persona-group-key', group.key);
        groupEl.open = state.navGroupExpansion[group.key] !== false;
        var summary = createEl('summary', 'persona-lab-nav-group-summary');
        summary.appendChild(createEl('span', 'persona-lab-nav-group-caret', '>'));
        summary.appendChild(createEl('span', 'persona-lab-nav-group-name', group.label));
        summary.appendChild(createEl('span', 'persona-lab-nav-group-count', formatNumber(group.personas.length)));
        groupEl.appendChild(summary);
        groupEl.addEventListener('toggle', function () {
          state.navGroupExpansion[group.key] = groupEl.open;
        });
        var groupList = createEl('div', 'persona-lab-nav-group-children');
        if (group.personas.length) {
          group.personas.forEach(function (persona) {
            groupList.appendChild(renderNavPersonaItem(state, persona));
          });
        } else {
          var emptyFolder = createEl('div', 'persona-lab-nav-folder-empty');
          emptyFolder.appendChild(createEl('span', null, 'No personas in this folder yet.'));
          var addPersonaButton = createEl('button', 'persona-lab-button small', 'Add persona');
          addPersonaButton.type = 'button';
          addPersonaButton.disabled = !canAuthor;
          addPersonaButton.addEventListener('click', function () {
            openCreatePersonaModal(state, group.label);
          });
          emptyFolder.appendChild(addPersonaButton);
          groupList.appendChild(emptyFolder);
        }
        groupEl.appendChild(groupList);
        list.appendChild(groupEl);
      });
    }
    nav.appendChild(list);
    return nav;
  }

  function renderInspectorPanel(state) {
    var panel = createEl('section', 'persona-lab-panel compact');
    appendSectionHeading(
      panel,
      'h2',
      'Test & Diagnostics',
      'Validation, compiled payloads, saved prompt snapshots, and latest test run results.'
    );
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
    var card = createEl('details', 'persona-lab-run-card persona-lab-details');
    card.open = index === 0 || /failed|cancelled/i.test(String(run.status || ''));
    var metricsSummary = metricsSummaryOf(run);
    var header = createEl('summary', 'persona-lab-run-card-header persona-lab-details-summary');
    header.appendChild(createEl('span', 'persona-lab-details-caret', '›'));
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
    var body = createEl('div', 'persona-lab-details-body');

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
    body.appendChild(kv);

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
      body.appendChild(metricGrid);
    }

    if (run.systemPromptOverride) {
      body.appendChild(createEl('div', 'persona-lab-run-note', 'System prompt override is set for this run.'));
    }
    if (run.messagePromptOverride) {
      body.appendChild(createEl('div', 'persona-lab-run-note', 'Launch-time message prompt override is set for this run.'));
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
    body.appendChild(actions);
    card.appendChild(body);
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
        var runCard = createEl('details', 'persona-lab-run-card persona-lab-details');
        runCard.open = index === 0 || Boolean(run.systemPromptOverride || run.messagePromptOverride || Object.keys(ensureObject(run.runtimeOverrides)).length);
        var title = createEl('summary', 'persona-lab-run-card-header persona-lab-details-summary');
        title.appendChild(createEl('span', 'persona-lab-details-caret', '›'));
        var titleCopy = createEl('div');
        titleCopy.appendChild(createEl('strong', null, 'Run ' + (index + 1)));
        titleCopy.appendChild(createEl('div', 'persona-lab-helper', 'Per-run overrides for this tab.'));
        title.appendChild(titleCopy);
        title.appendChild(createEl('span', 'persona-lab-badge', run.label || 'Untitled'));
        runCard.appendChild(title);
        var runBody = createEl('div', 'persona-lab-details-body');

        var labelInput = createEl('input', 'persona-lab-input');
        labelInput.value = run.label || '';
        bindInput(labelInput, function () {
          run.label = labelInput.value;
        });
        renderFieldGroup(runBody, 'Label', labelInput);

        var systemInput = createEl('textarea', 'persona-lab-textarea');
        systemInput.value = run.systemPromptOverride || '';
        systemInput.placeholder = 'Leave blank to inherit the saved persona system prompt.';
        bindInput(systemInput, function () {
          run.systemPromptOverride = systemInput.value;
        });
        renderFieldGroup(
          runBody,
          'System prompt override',
          systemInput,
          'Optional replacement for the saved persona system prompt. Example: Emphasize speed and concise status updates for this run only.'
        );

        var messageInput = createEl('textarea', 'persona-lab-textarea');
        messageInput.value = run.messagePromptOverride || '';
        messageInput.placeholder = 'Optional launch-time user/message prompt for this run.';
        bindInput(messageInput, function () {
          run.messagePromptOverride = messageInput.value;
        });
        renderFieldGroup(
          runBody,
          'Message prompt override',
          messageInput,
          'The first prompt to send into this test tab. Example: Triage the last 10 renewal-risk emails and list the top three follow-ups.'
        );

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
        renderFieldGroup(
          runBody,
          'Additional runtime overrides (JSON)',
          runtimeInput,
          'Optional JSON for test-only runtime knobs. Example: {"temperature":0.2,"maxTurns":4}.'
        );

        runCard.appendChild(runBody);
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

  function renderCreatePersonaModal(state) {
    if (!state.createPersonaModalOpen) {
      return null;
    }
    var draft = ensureObject(state.createPersonaDraft);
    var overlay = createEl('div', 'persona-lab-overlay');
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeCreatePersonaModal(state);
      }
    });

    var modal = createEl('form', 'persona-lab-modal');
    modal.addEventListener('submit', function (event) {
      event.preventDefault();
      submitCreatePersona(state).catch(function () {});
    });
    overlay.appendChild(modal);

    var header = createEl('div', 'persona-lab-modal-header');
    var copy = createEl('div');
    copy.appendChild(createEl('p', 'persona-lab-nav-title', 'Persona Studio'));
    copy.appendChild(createEl('h2', null, 'New Persona'));
    copy.appendChild(createEl('p', null, 'Create a draft persona and place it in a sidebar folder.'));
    header.appendChild(copy);
    var closeButton = createEl('button', 'persona-lab-button', 'Close');
    closeButton.type = 'button';
    closeButton.disabled = Boolean(state.createPersonaSubmitting);
    closeButton.addEventListener('click', function () {
      closeCreatePersonaModal(state);
    });
    header.appendChild(closeButton);
    modal.appendChild(header);

    var body = createEl('div', 'persona-lab-modal-body');
    if (state.createPersonaError) {
      body.appendChild(createEl('div', 'persona-lab-error', state.createPersonaError));
    }

    var grid = createEl('div', 'persona-lab-grid');
    var displayNameInput = createEl('input', 'persona-lab-input');
    displayNameInput.value = String(draft.displayName || '');
    displayNameInput.placeholder = 'Research Coordinator';
    var keyInput = createEl('input', 'persona-lab-input');
    keyInput.value = String(draft.key || '');
    keyInput.placeholder = 'research-coordinator';
    displayNameInput.addEventListener('input', function () {
      state.createPersonaDraft.displayName = displayNameInput.value;
      if (!state.createPersonaKeyTouched) {
        state.createPersonaDraft.key = nextAvailablePersonaKey(state, displayNameInput.value);
        keyInput.value = state.createPersonaDraft.key;
      }
    });
    keyInput.addEventListener('input', function () {
      state.createPersonaKeyTouched = true;
      state.createPersonaDraft.key = slugifyKey(keyInput.value, '');
      keyInput.value = state.createPersonaDraft.key;
    });
    renderFieldGroup(grid, 'Name', displayNameInput, 'The human-readable persona name.');
    renderFieldGroup(grid, 'Key', keyInput, 'Stable identifier used in URLs and API calls.');

    var folderSelect = buildPersonaFolderSelect(
      state,
      String(draft.metadataGroup || ''),
      function (value) {
        state.createPersonaDraft.metadataGroup = normalizePersonaFolderLabel(value);
      }
    );
    renderFieldGroup(grid, 'Folder', folderSelect, 'Sidebar folder used to organize this persona.');
    body.appendChild(grid);

    var descriptionInput = createEl('textarea', 'persona-lab-textarea');
    descriptionInput.value = String(draft.description || '');
    descriptionInput.placeholder = 'Short summary for catalogs and handoffs.';
    bindInput(descriptionInput, function () {
      state.createPersonaDraft.description = descriptionInput.value;
    });
    renderFieldGroup(body, 'Description', descriptionInput, 'Short summary used in catalogs and handoffs.');
    modal.appendChild(body);

    var footer = createEl('div', 'persona-lab-modal-footer');
    footer.appendChild(
      createEl(
        'div',
        'persona-lab-helper',
        state.createPersonaSubmitting ? 'Creating draft...' : 'The new draft opens automatically after creation.'
      )
    );
    var actions = createEl('div', 'persona-lab-actions');
    var cancelButton = createEl('button', 'persona-lab-button', 'Cancel');
    cancelButton.type = 'button';
    cancelButton.disabled = Boolean(state.createPersonaSubmitting);
    cancelButton.addEventListener('click', function () {
      closeCreatePersonaModal(state);
    });
    var submitButton = createEl(
      'button',
      'persona-lab-button primary',
      state.createPersonaSubmitting ? 'Creating...' : 'Create Persona'
    );
    submitButton.type = 'submit';
    submitButton.disabled = Boolean(state.createPersonaSubmitting);
    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);
    footer.appendChild(actions);
    modal.appendChild(footer);

    setTimeout(function () {
      displayNameInput.focus();
    }, 0);
    return overlay;
  }

  function renderCreateFolderModal(state) {
    if (!state.folderCreateModalOpen) {
      return null;
    }
    var draft = ensureObject(state.folderDraft);
    var overlay = createEl('div', 'persona-lab-overlay');
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeCreateFolderModal(state);
      }
    });

    var modal = createEl('form', 'persona-lab-modal');
    modal.addEventListener('submit', function (event) {
      event.preventDefault();
      submitCreateFolder(state).catch(function () {});
    });
    overlay.appendChild(modal);

    var header = createEl('div', 'persona-lab-modal-header');
    var copy = createEl('div');
    copy.appendChild(createEl('p', 'persona-lab-nav-title', 'Persona Studio'));
    copy.appendChild(createEl('h2', null, 'New Folder'));
    copy.appendChild(createEl('p', null, 'Create a sidebar group for organizing persona drafts.'));
    header.appendChild(copy);
    var closeButton = createEl('button', 'persona-lab-button', 'Close');
    closeButton.type = 'button';
    closeButton.disabled = Boolean(state.folderCreateSubmitting);
    closeButton.addEventListener('click', function () {
      closeCreateFolderModal(state);
    });
    header.appendChild(closeButton);
    modal.appendChild(header);

    var body = createEl('div', 'persona-lab-modal-body');
    if (state.folderCreateError) {
      body.appendChild(createEl('div', 'persona-lab-error', state.folderCreateError));
    }
    var nameInput = createEl('input', 'persona-lab-input');
    nameInput.value = String(draft.name || '');
    nameInput.placeholder = 'Client Success';
    bindInput(nameInput, function () {
      state.folderDraft.name = nameInput.value;
    });
    renderFieldGroup(body, 'Folder name', nameInput, 'Sidebar group name used by persona metadata.');

    var descriptionInput = createEl('textarea', 'persona-lab-textarea');
    descriptionInput.value = String(draft.description || '');
    descriptionInput.placeholder = 'Optional note for this folder.';
    bindInput(descriptionInput, function () {
      state.folderDraft.description = descriptionInput.value;
    });
    renderFieldGroup(body, 'Description', descriptionInput, 'Optional note saved with the folder record when an author organization is available.');
    modal.appendChild(body);

    var footer = createEl('div', 'persona-lab-modal-footer');
    footer.appendChild(
      createEl(
        'div',
        'persona-lab-helper',
        state.folderCreateSubmitting ? 'Creating folder...' : 'Personas added to this folder inherit the same metadata group.'
      )
    );
    var actions = createEl('div', 'persona-lab-actions');
    var cancelButton = createEl('button', 'persona-lab-button', 'Cancel');
    cancelButton.type = 'button';
    cancelButton.disabled = Boolean(state.folderCreateSubmitting);
    cancelButton.addEventListener('click', function () {
      closeCreateFolderModal(state);
    });
    var submitButton = createEl(
      'button',
      'persona-lab-button primary',
      state.folderCreateSubmitting ? 'Creating...' : 'Create Folder'
    );
    submitButton.type = 'submit';
    submitButton.disabled = Boolean(state.folderCreateSubmitting);
    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);
    footer.appendChild(actions);
    modal.appendChild(footer);

    setTimeout(function () {
      nameInput.focus();
    }, 0);
    return overlay;
  }

  function renderArchiveConfirmModal(state) {
    if (!state.archiveConfirmModalOpen) {
      return null;
    }
    var definition = currentPersonaDefinition(state);
    var personaKey = state.selectedPersonaKey || '';
    var label = definition.displayName || personaKey;
    var draft = ensureObject(state.archiveConfirmDraft);
    var overlay = createEl('div', 'persona-lab-overlay');
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeArchiveConfirmModal(state);
      }
    });

    var modal = createEl('form', 'persona-lab-modal');
    modal.addEventListener('submit', function (event) {
      event.preventDefault();
      archiveSelectedPersona(state).catch(function () {});
    });
    overlay.appendChild(modal);

    var header = createEl('div', 'persona-lab-modal-header');
    var copy = createEl('div');
    copy.appendChild(createEl('p', 'persona-lab-nav-title', 'Persona Studio'));
    copy.appendChild(createEl('h2', null, 'Archive Persona'));
    copy.appendChild(createEl('p', null, 'Move this persona out of active authoring while keeping it restorable from the archive.'));
    header.appendChild(copy);
    var closeButton = createEl('button', 'persona-lab-button', 'Close');
    closeButton.type = 'button';
    closeButton.disabled = Boolean(state.archiveConfirmSubmitting || state.archivingPersona);
    closeButton.addEventListener('click', function () {
      closeArchiveConfirmModal(state);
    });
    header.appendChild(closeButton);
    modal.appendChild(header);

    var body = createEl('div', 'persona-lab-modal-body');
    if (state.archiveConfirmError) {
      body.appendChild(createEl('div', 'persona-lab-error', state.archiveConfirmError));
    }
    var warning = createEl('div', 'persona-lab-confirmation-card');
    warning.appendChild(createEl('strong', null, label));
    warning.appendChild(
      createEl(
        'p',
        null,
        state.dirty
          ? 'Unsaved edits on this persona will be discarded when it is archived.'
          : 'Archived personas leave the active list and move to View archive.'
      )
    );
    body.appendChild(warning);

    var reasonInput = createEl('textarea', 'persona-lab-textarea');
    reasonInput.value = String(draft.reason || '');
    reasonInput.placeholder = 'Optional archive reason.';
    bindInput(reasonInput, function () {
      state.archiveConfirmDraft.reason = reasonInput.value;
    });
    renderFieldGroup(body, 'Archive reason', reasonInput, 'Optional note stored with the archived persona.');

    var confirmLabel = createEl('label', 'persona-lab-toggle');
    var confirmInput = document.createElement('input');
    confirmInput.type = 'checkbox';
    confirmInput.checked = Boolean(draft.confirmed);
    confirmInput.addEventListener('change', function () {
      state.archiveConfirmDraft.confirmed = confirmInput.checked;
      renderState(state);
    });
    confirmLabel.appendChild(confirmInput);
    confirmLabel.appendChild(createEl('span', null, 'I understand this persona will leave Active view.'));
    body.appendChild(confirmLabel);
    modal.appendChild(body);

    var footer = createEl('div', 'persona-lab-modal-footer');
    footer.appendChild(
      createEl(
        'div',
        'persona-lab-helper',
        state.archiveConfirmSubmitting ? 'Archiving persona...' : 'You can restore archived personas from View archive.'
      )
    );
    var actions = createEl('div', 'persona-lab-actions');
    var cancelButton = createEl('button', 'persona-lab-button', 'Cancel');
    cancelButton.type = 'button';
    cancelButton.disabled = Boolean(state.archiveConfirmSubmitting || state.archivingPersona);
    cancelButton.addEventListener('click', function () {
      closeArchiveConfirmModal(state);
    });
    var submitButton = createEl(
      'button',
      'persona-lab-button danger',
      state.archiveConfirmSubmitting ? 'Archiving...' : 'Archive Persona'
    );
    submitButton.type = 'submit';
    submitButton.disabled = Boolean(state.archiveConfirmSubmitting || state.archivingPersona || !draft.confirmed);
    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);
    footer.appendChild(actions);
    modal.appendChild(footer);

    setTimeout(function () {
      reasonInput.focus();
    }, 0);
    return overlay;
  }

  function renderDeleteConfirmModal(state) {
    if (!state.deleteConfirmModalOpen) {
      return null;
    }
    var definition = currentPersonaDefinition(state);
    var personaKey = state.selectedPersonaKey || '';
    var label = definition.displayName || personaKey;
    var draft = ensureObject(state.deleteConfirmDraft);
    var typedKey = String(draft.confirmation || '').trim();
    var canDelete = typedKey === personaKey;
    var overlay = createEl('div', 'persona-lab-overlay');
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeDeleteConfirmModal(state);
      }
    });

    var modal = createEl('form', 'persona-lab-modal');
    modal.addEventListener('submit', function (event) {
      event.preventDefault();
      deleteArchivedPersona(state).catch(function () {});
    });
    overlay.appendChild(modal);

    var header = createEl('div', 'persona-lab-modal-header');
    var copy = createEl('div');
    copy.appendChild(createEl('p', 'persona-lab-nav-title', 'Persona Studio'));
    copy.appendChild(createEl('h2', null, 'Delete Archived Persona'));
    copy.appendChild(createEl('p', null, 'Permanently remove an archived persona from Persona Studio.'));
    header.appendChild(copy);
    var closeButton = createEl('button', 'persona-lab-button', 'Close');
    closeButton.type = 'button';
    closeButton.disabled = Boolean(state.deleteConfirmSubmitting);
    closeButton.addEventListener('click', function () {
      closeDeleteConfirmModal(state);
    });
    header.appendChild(closeButton);
    modal.appendChild(header);

    var body = createEl('div', 'persona-lab-modal-body');
    if (state.deleteConfirmError) {
      body.appendChild(createEl('div', 'persona-lab-error', state.deleteConfirmError));
    }
    var warning = createEl('div', 'persona-lab-confirmation-card danger');
    warning.appendChild(createEl('strong', null, label));
    warning.appendChild(
      createEl(
        'p',
        null,
        'This is permanent. Delete is only available from View archive and cannot be undone from Persona Studio.'
      )
    );
    warning.appendChild(createEl('code', null, personaKey));
    body.appendChild(warning);

    var confirmationInput = createEl('input', 'persona-lab-input');
    confirmationInput.value = typedKey;
    confirmationInput.placeholder = personaKey;
    confirmationInput.addEventListener('input', function () {
      state.deleteConfirmDraft.confirmation = confirmationInput.value;
      renderState(state);
    });
    renderFieldGroup(body, 'Type persona key', confirmationInput, 'Required secondary confirmation before permanent deletion.');
    modal.appendChild(body);

    var footer = createEl('div', 'persona-lab-modal-footer');
    footer.appendChild(
      createEl(
        'div',
        'persona-lab-helper',
        state.deleteConfirmSubmitting ? 'Deleting persona...' : 'The delete button unlocks after the exact key is typed.'
      )
    );
    var actions = createEl('div', 'persona-lab-actions');
    var cancelButton = createEl('button', 'persona-lab-button', 'Cancel');
    cancelButton.type = 'button';
    cancelButton.disabled = Boolean(state.deleteConfirmSubmitting);
    cancelButton.addEventListener('click', function () {
      closeDeleteConfirmModal(state);
    });
    var submitButton = createEl(
      'button',
      'persona-lab-button danger',
      state.deleteConfirmSubmitting ? 'Deleting...' : 'Delete Permanently'
    );
    submitButton.type = 'submit';
    submitButton.disabled = Boolean(state.deleteConfirmSubmitting || !canDelete);
    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);
    footer.appendChild(actions);
    modal.appendChild(footer);

    setTimeout(function () {
      confirmationInput.focus();
    }, 0);
    return overlay;
  }

  function renderCustomSkillEditorModal(state) {
    if (!state.skillEditorOpen) {
      return null;
    }

    var skills = ensureArray(state.form && state.form.customSkills);
    var skill = skills[state.skillEditorIndex];

    var overlay = createEl('div', 'persona-lab-overlay');
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeCustomSkillEditor(state);
      }
    });

    var modal = createEl('div', 'persona-lab-modal');
    overlay.appendChild(modal);

    var header = createEl('div', 'persona-lab-modal-header');
    var copy = createEl('div');
    copy.appendChild(createEl('p', 'persona-lab-nav-title', 'Custom skill'));
    copy.appendChild(createEl('h2', null, skill ? (skill.title || 'Edit skill content') : 'Edit skill content'));
    copy.appendChild(
      createEl(
        'p',
	        null,
	        skill
	          ? 'Edit the markdown instructions saved with this persona-local skill.'
	          : 'This skill is no longer available.'
      )
    );
    header.appendChild(copy);
    var closeButton = createEl('button', 'persona-lab-button', 'Close');
    closeButton.type = 'button';
    closeButton.addEventListener('click', function () {
      closeCustomSkillEditor(state);
    });
    header.appendChild(closeButton);
    modal.appendChild(header);

    var body = createEl('div', 'persona-lab-modal-body');
    if (state.skillEditorError) {
      body.appendChild(createEl('div', 'persona-lab-error', state.skillEditorError));
    }
    if (skill) {
	      var editor = disableSmartText(createEl('textarea', 'persona-lab-textarea persona-lab-skill-editor'));
	      editor.value = state.skillEditorDraft || '';
	      editor.placeholder = 'Add markdown instructions for when and how this custom skill should be used.';
      bindInput(editor, function () {
        state.skillEditorDraft = editor.value;
      });
      body.appendChild(buildSkillVariableInsertTools(skill, editor));
      renderFieldGroup(body, 'Content', editor);
	    } else {
	      body.appendChild(createEl('div', 'persona-lab-empty', 'This skill is no longer available.'));
    }
    modal.appendChild(body);

    var footer = createEl('div', 'persona-lab-modal-footer');
    footer.appendChild(
      createEl(
        'div',
        'persona-lab-helper',
        'Skill content is saved to the persona draft. Use the main Save button to persist the persona.'
      )
    );
    var actions = createEl('div', 'persona-lab-actions');
    var cancelButton = createEl('button', 'persona-lab-button', 'Cancel');
    cancelButton.type = 'button';
    cancelButton.addEventListener('click', function () {
      closeCustomSkillEditor(state);
    });
    actions.appendChild(cancelButton);
    var saveButton = createEl('button', 'persona-lab-button primary', 'Apply content');
    saveButton.type = 'button';
    saveButton.disabled = !skill;
    saveButton.addEventListener('click', function () {
      saveCustomSkillEditor(state);
    });
    actions.appendChild(saveButton);
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
    if (isCurrentPersonaArchived(state)) {
      titleCopy.appendChild(createEl('span', 'persona-lab-badge archived', 'Archived persona'));
    }
    titleCopy.appendChild(
      createEl(
        'p',
        null,
        state.organizationName
          ? 'Shape personas for ' + state.organizationName + ', choose scoped tools, and launch saved test runs from the same draft.'
          : 'Shape the persona, choose its tools, and launch saved test runs from the same draft.'
      )
    );
    toolbar.appendChild(titleCopy);

    var actions = createEl('div', 'persona-lab-actions');
    var personaArchived = isCurrentPersonaArchived(state);
    var saveButton = createEl('button', 'persona-lab-button', state.saving ? 'Saving…' : 'Save');
    saveButton.type = 'button';
    saveButton.disabled =
      !state.form ||
      state.saving ||
      state.testing ||
      state.launchingBatch ||
      state.archivingPersona ||
      state.deleteConfirmSubmitting;
    saveButton.addEventListener('click', function () {
      savePersona(state).catch(function () {});
    });
    var archiveButton = createEl(
      'button',
      personaArchived ? 'persona-lab-button' : 'persona-lab-button danger',
      state.archivingPersona
        ? personaArchived ? 'Restoring…' : 'Archiving…'
        : personaArchived ? 'Unarchive' : 'Archive'
    );
    archiveButton.type = 'button';
    archiveButton.disabled =
      !state.form ||
      state.saving ||
      state.testing ||
      state.launchingBatch ||
      state.archivingPersona ||
      state.deleteConfirmSubmitting;
    archiveButton.addEventListener('click', function () {
      if (personaArchived) {
        unarchiveSelectedPersona(state).catch(function () {});
      } else {
        openArchiveConfirmModal(state);
      }
    });
    var deleteButton = createEl(
      'button',
      'persona-lab-button danger',
      state.deleteConfirmSubmitting ? 'Deleting…' : 'Delete'
    );
    deleteButton.type = 'button';
    deleteButton.disabled =
      !state.form ||
      !personaArchived ||
      !state.showArchivedPersonas ||
      state.saving ||
      state.testing ||
      state.launchingBatch ||
      state.archivingPersona ||
      state.deleteConfirmSubmitting;
    deleteButton.addEventListener('click', function () {
      openDeleteConfirmModal(state);
    });
    var singleRunButton = createEl(
      'button',
      'persona-lab-button',
      state.testing ? 'Opening…' : 'Single Run'
    );
    singleRunButton.type = 'button';
    singleRunButton.disabled =
      !state.form ||
      personaArchived ||
      state.testing ||
      state.loadingPersona ||
      state.launchingBatch ||
      state.archivingPersona ||
      state.deleteConfirmSubmitting;
    singleRunButton.addEventListener('click', function () {
      testPersona(state).catch(function () {});
    });
    var batchButton = createEl(
      'button',
      'persona-lab-button primary',
      state.launchingBatch ? 'Launching…' : 'Parallel Runs'
    );
    batchButton.type = 'button';
    batchButton.disabled =
      !state.form ||
      personaArchived ||
      state.testing ||
      state.loadingPersona ||
      state.launchingBatch ||
      state.archivingPersona ||
      state.deleteConfirmSubmitting;
    batchButton.addEventListener('click', function () {
      openBatchWizard(state);
    });
    actions.appendChild(saveButton);
    actions.appendChild(archiveButton);
    if (personaArchived && state.showArchivedPersonas) {
      actions.appendChild(deleteButton);
    }
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

    if (!hasConsultantOrganizationContext(state)) {
      content.appendChild(createEl('div', 'persona-lab-empty', consultantOrganizationRequiredMessage(state)));
      shell.appendChild(content);
      return shell;
    }

    if (!state.form || !state.current) {
      content.appendChild(createEl('div', 'persona-lab-empty', 'Select a persona from the navigator to begin editing.'));
      shell.appendChild(content);
      return shell;
    }

    var registries = activeRegistries(state);
    ensureRequiredModelDefaults(state, registries);

    var identity = createEl('section', 'persona-lab-panel');
    appendSectionHeading(
      identity,
      'h2',
      'Overview',
      'Name, ownership, and the short description people see when choosing this persona.'
    );
    var identityGrid = createEl('div', 'persona-lab-grid');
    var displayNameInput = markFocusKey(createEl('input', 'persona-lab-input'), 'overview-display-name');
    displayNameInput.value = state.form.definition.displayName;
    bindInput(displayNameInput, function () {
      state.form.definition.displayName = displayNameInput.value;
      updateDirtyState(state);
      replaceSessionChrome(state, SESSION_LABEL + ' · ' + (displayNameInput.value || SESSION_LABEL));
    });
    renderFieldGroup(identityGrid, 'Display name', displayNameInput, 'The human-readable persona name. Example: Email Coordinator.');
    var ownerInput = markFocusKey(createEl('input', 'persona-lab-input'), 'overview-owner');
    ownerInput.value = state.form.definition.owner;
    bindInput(ownerInput, function () {
      state.form.definition.owner = ownerInput.value;
      updateDirtyState(state);
    });
    renderFieldGroup(identityGrid, 'Owner', ownerInput, 'Team, person, or system responsible for maintaining this persona. Example: Customer Success Ops.');
    var metadataGroupInput = markFocusKey(createEl('input', 'persona-lab-input'), 'overview-metadata-group');
    metadataGroupInput.value = state.form.definition.metadataGroup || '';
    metadataGroupInput.placeholder = isSystemPersonaSource(state.form.definition)
      ? SYSTEM_PERSONA_GROUP
      : 'Client Success';
    bindInput(metadataGroupInput, function () {
      state.form.definition.metadataGroup = metadataGroupInput.value;
      updateDirtyState(state);
    });
    renderFieldGroup(identityGrid, 'Metadata group', metadataGroupInput, 'Sidebar folder used to group this persona. Example: Client Success, Email Operations, or Reporting.');
    identity.appendChild(identityGrid);
    var definitionDescription = createEl('textarea', 'persona-lab-textarea');
    definitionDescription.value = state.form.definition.description;
    bindInput(definitionDescription, function () {
      state.form.definition.description = definitionDescription.value;
      updateDirtyState(state);
    });
    renderFieldGroup(identity, 'Description', definitionDescription, 'Short summary used in catalogs and handoffs. Example: Reviews inbound customer email and drafts prioritized replies.');
    content.appendChild(identity);

    var promptPanel = createEl('section', 'persona-lab-panel');
    appendSectionHeading(
      promptPanel,
      'h2',
      'Instructions',
      'The base behavior and ordered rules that guide every run of this persona.'
    );
    var summaryInput = createEl('input', 'persona-lab-input');
    summaryInput.value = state.form.draft.summary;
    bindInput(summaryInput, function () {
      state.form.draft.summary = summaryInput.value;
      updateDirtyState(state);
    });
    renderFieldGroup(promptPanel, 'Summary', summaryInput, 'One sentence describing what this persona is for. Example: Triage customer emails and prepare concise next-step recommendations.');
    var draftDescription = createEl('textarea', 'persona-lab-textarea');
    draftDescription.value = state.form.draft.description;
    bindInput(draftDescription, function () {
      state.form.draft.description = draftDescription.value;
      updateDirtyState(state);
    });
    renderFieldGroup(promptPanel, 'Draft notes', draftDescription, 'Internal authoring notes for this draft. Example: Validate tone against the support playbook before promotion.');
    var promptInput = createEl('textarea', 'persona-lab-textarea');
    promptInput.style.minHeight = '220px';
    promptInput.value = state.form.prompt;
    bindInput(promptInput, function () {
      state.form.prompt = promptInput.value;
      updateDirtyState(state);
    });
    renderFieldGroup(promptPanel, 'System prompt', promptInput, 'The main instruction block sent to the LLM. Example: You are a calm customer operations specialist. Ask one clarifying question when the request is ambiguous, then produce a short action list.');
    appendSectionHeading(
      promptPanel,
      'h3',
      'Rules',
      'Persona rules are saved as an ordered list of behavioral constraints. Example: Always ask one clarifying question before estimating project scope.'
    );
    promptPanel.appendChild(renderRulesEditor(state));
    content.appendChild(promptPanel);

    var policyPanel = createEl('section', 'persona-lab-panel');
    appendSectionHeading(
      policyPanel,
      'h2',
      'Runtime',
      'Models, delegation behavior, sandboxes, connectors, and precise tool permissions.'
    );
    var policyGrid = createEl('div', 'persona-lab-grid');

    renderFieldGroup(
      policyGrid,
      'Default model',
      buildModelSelect(registries, state.form.draft.modelPolicy.defaultModel, function (value) {
        state.form.draft.modelPolicy.defaultModel = value;
        updateDirtyState(state);
      }, false),
      'General-purpose model used for normal turns. Example: openai/gpt-5-mini for fast everyday execution.'
    );
    renderFieldGroup(
      policyGrid,
      'Fast model',
      buildModelSelect(registries, state.form.draft.modelPolicy.fastModel || '', function (value) {
        state.form.draft.modelPolicy.fastModel = value;
        updateDirtyState(state);
      }),
      'Lower-latency model for quick routing or lightweight turns. Example: google/gemini-3-flash-preview.'
    );
    renderFieldGroup(
      policyGrid,
      'Reasoning model',
      buildModelSelect(registries, state.form.draft.modelPolicy.reasoningModel || '', function (value) {
        state.form.draft.modelPolicy.reasoningModel = value;
        updateDirtyState(state);
      }),
      'Higher-reasoning model for complex work. Example: openai/gpt-5.'
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
    renderFieldGroup(policyPanel, 'Workflow model overrides', workflowModels, 'Optional JSON map from workflow key to model ID. Example: {"email_triage":"openai/gpt-5-mini"}.');

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
    appendSectionHeading(
      policyPanel,
      'h3',
      'Orchestration',
      'Controls whether this persona can delegate to subagents, coordinate child runs, or run alone. Example: use Coordinator + Delegate for research personas that split work across specialists.'
    );
    var orchestrationGrid = createEl('div', 'persona-lab-grid');
    renderFieldGroup(
      orchestrationGrid,
      'Role',
      buildChoiceSelect(capabilityOptions, orchestration.capability, function (value) {
        state.form.draft.orchestration.capability = value;
        updateDirtyState(state);
      }),
      'What orchestration role this persona may play. Example: Delegate for a specialist, Coordinator + Delegate for a lead researcher.'
    );
    renderFieldGroup(
      orchestrationGrid,
      'Dispatch mode',
      buildChoiceSelect(dispatchModeOptions, orchestration.dispatchMode, function (value) {
        state.form.draft.orchestration.dispatchMode = value;
        updateDirtyState(state);
      }),
      'How subagent work is approved. Example: Review when a human should inspect proposed launches first.'
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
    renderFieldGroup(orchestrationGrid, 'Max parallel subagents', maxParallelInput, 'Maximum child agents this persona may run at once. Example: 3 for balanced research without overwhelming the workspace.');
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
    renderFieldGroup(orchestrationGrid, 'Max depth', maxDepthInput, 'How many delegation levels are allowed. Example: 1 lets the persona create workers but prevents workers from creating more workers.');
    policyPanel.appendChild(orchestrationGrid);

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
	            state.form.draft.sandboxPolicy.exportToolName || 'sandbox_artifact_export',
        };
      } else {
        state.form.draft.sandboxPolicy = { mode: 'disabled' };
      }
      updateDirtyState(state);
      renderState(state);
    });
    renderFieldGroup(
      policyPanel,
      'Sandbox policy',
      sandboxMode,
      'Allows controlled execution tools for personas that need files, generated reports, or workspace operations. Example: enable for a reporting persona that exports CSV or PDF artifacts.'
    );
    if (state.form.draft.sandboxPolicy.mode === 'brokered') {
      var exportTool = createEl('input', 'persona-lab-input');
      exportTool.value = state.form.draft.sandboxPolicy.exportToolName || '';
      bindInput(exportTool, function () {
        state.form.draft.sandboxPolicy.exportToolName = exportTool.value;
        updateDirtyState(state);
      });
      renderFieldGroup(
	        policyPanel,
	        'Sandbox export tool',
	        exportTool,
	        'Stable snake_case tool name exposed for sandbox exports. Example: sandbox_artifact_export.'
      );
    }

	    state.form.draft.toolPolicy = ensureToolPolicyShape(state.form.draft.toolPolicy);
	    var toolRegistry = ensureObject(registries.toolRegistry);
	    var assetRegistry = assetRegistryForState(state, registries);
	    var flatBusinessToolOptions = ensureArray(toolRegistry.businessToolOptions).length
	      ? toolRegistry.businessToolOptions
	      : ensureArray(toolRegistry.businessTools);
	    var flatConnectorOptions = ensureArray(toolRegistry.connectorOptions).length
	      ? toolRegistry.connectorOptions
	      : ensureArray(toolRegistry.connectors);
	    var businessToolOptions = choiceOptionsFromAssets(
	      assetRegistryWithoutRegisteredRuntimeAssets(assetRegistry),
	      'STATIC_TOOL',
	      flatBusinessToolOptions,
	      function (asset) { return asset.toolName || asset.key; }
	    );
		    var connectorOptions = choiceOptionsFromAssets(
		      assetRegistry,
		      'CONNECTOR_GRANT',
		      flatConnectorOptions,
		      function (asset) { return asset.connectorKey || asset.key; }
	    );
	    var runtimeToolOptions = ensureArray(toolRegistry.runtimeToolOptions);
	    var toolOptions = unifiedToolOptions(
	      businessToolOptions,
	      runtimeToolOptions,
	      state.form.draft.toolPolicy.allowedRuntimeToolIds
	    );
	    var capabilityOptions = capabilityOptionsFromRegistries(assetRegistry, registries);

	    policyPanel.appendChild(renderCustomToolRegistrationPanel(state));
	    appendSectionHeading(
	      policyPanel,
	      'h3',
	      'Tools',
	      'Choose the specific actions this persona can use. Built-in tools and connected app tools are shown together by service.'
	    );
	    policyPanel.appendChild(
	      buildGroupedChoiceSelector(
	        toolOptions,
	        selectedToolValues(state.form),
	        function (value) {
	          toggleToolSelection(state, value);
	          updateDirtyState(state);
	          renderState(state);
	        },
	        {
	          defaultGroup: 'Tools',
	          emptyMessage: 'No tools are available from the backend registry or connected app catalog.',
	          itemSingular: 'tool',
	          itemPlural: 'tools',
	          searchPlaceholder: 'Search tools, services, descriptions, or groups',
	          searchLabel: 'Search tools by name, service, description, or group',
	          showKeys: false,
	          showCopyButton: false,
	        }
	      )
	    );
	    appendSectionHeading(
	      policyPanel,
	      'h3',
	      'Connected services',
	      'Give broad access to a whole service only when the persona should use most of that service. Prefer selecting specific tools above when possible.'
	    );
	    policyPanel.appendChild(
	      buildGroupedChoiceSelector(
        connectorOptions,
        state.form.draft.toolPolicy.allowedConnectorKeys,
        function (key) {
          state.form.draft.toolPolicy.allowedConnectorKeys = toggleListValue(
            state.form.draft.toolPolicy.allowedConnectorKeys,
            key
          );
          updateDirtyState(state);
          renderState(state);
	        },
	        {
	          defaultGroup: 'Connected services',
	          emptyMessage: 'No connected services are available from the backend registry.',
	          itemSingular: 'service',
	          itemPlural: 'services',
	          searchPlaceholder: 'Search connected services, descriptions, or groups',
	          searchLabel: 'Search connected services by name, description, or group',
	          showKeys: false,
	          showCopyButton: false,
	        }
	      )
	    );
    content.appendChild(policyPanel);

	    var skillPanel = createEl('section', 'persona-lab-panel');
	    appendSectionHeading(
	      skillPanel,
	      'h2',
	      'Skills',
	      'Reusable instructions, prompt templates, variables, and workflow runbooks bundled into the persona.'
	    );
	    appendSectionHeading(
	      skillPanel,
	      'h3',
	      'Shared skills',
	      'Select registered instructions and workflow runbooks this persona should receive.'
	    );
	    skillPanel.appendChild(
	      buildGroupedChoiceSelector(
	        capabilityOptions,
	        selectedCapabilityValues(state.form),
	        function (key) {
	          toggleCapabilitySelection(state, key);
	          updateDirtyState(state);
	          renderState(state);
	        },
	        {
	          defaultGroup: 'Skills',
	          emptyMessage: 'No shared skills are available from the backend registry.',
	          itemSingular: 'skill',
	          itemPlural: 'skills',
	          searchPlaceholder: 'Search skills, keys, descriptions, variables, or metadata groups',
	          searchLabel: 'Search skills by name, key, description, variable, or metadata group',
	          copyLabel: 'Copy skill key',
	        }
	      )
	    );

	    appendSectionHeading(
	      skillPanel,
	      'h3',
	      'Custom skills',
	      'Custom skills are persona-local markdown instructions with variables. Use them for behavior that is not in the shared skill registry.'
	    );
    var skillList = createEl('div', 'persona-lab-section-list');
	    var customSkillHelp = {
	      key: 'Stable machine-readable skill id. Use lowercase kebab-case. Example: renewal-risk-review.',
	      title: 'Human-friendly skill name shown in Persona Studio. Example: Renewal Risk Review.',
	      summary: 'One sentence describing when this skill applies. Example: Use when assessing account renewal risks before customer outreach.',
	      content: 'Markdown instructions passed to the persona. Example: include trigger conditions, required checks, and output format bullets.',
	      variables: 'Optional values collected before the skill prompt is generated. Example: account_name, renewal_date, or risk_notes.',
	    };
    ensureArray(state.form.customSkills).forEach(function (skill, index) {
      var skillCard = createEl('details', 'persona-lab-skill persona-lab-details');
      skillCard.open = index === 0 || state.expandedCustomSkillIndex === index || !skill.key;
      var skillSummary = createEl('summary', 'persona-lab-details-summary');
      var variableCount = ensureArray(skill.variables).length;
      skillSummary.appendChild(createEl('span', 'persona-lab-details-caret', '›'));
      var skillSummaryCopy = createEl('div', 'persona-lab-skill-summary-copy');
      var skillSummaryTitle = createEl('strong');
      var skillSummaryMeta = createEl('span', 'persona-lab-skill-summary-meta');
      function refreshSkillSummary() {
        var meta = customSkillSummaryMeta(skill);
        skillSummaryTitle.textContent = customSkillDisplayName(skill, index);
        skillSummaryMeta.textContent = meta;
        skillSummaryMeta.hidden = !meta;
      }
      refreshSkillSummary();
      skillSummaryCopy.appendChild(skillSummaryTitle);
      skillSummaryCopy.appendChild(skillSummaryMeta);
      skillSummary.appendChild(skillSummaryCopy);
      skillSummary.appendChild(createEl('span', 'persona-lab-badge', formatNumber(variableCount) + ' variable' + (variableCount === 1 ? '' : 's')));
      skillCard.appendChild(skillSummary);
      var skillBody = createEl('div', 'persona-lab-details-body');
      var skillHeader = createEl('div', 'persona-lab-skill-header');
      var skillKeyHeading = createEl('strong', null, skill.key || ('custom-skill-' + (index + 1)));
      skillHeader.appendChild(skillKeyHeading);
      var skillActions = createEl('div', 'persona-lab-skill-actions');
      var remove = createEl('button', 'persona-lab-button', 'Remove');
      remove.type = 'button';
      remove.addEventListener('click', function () {
        if (state.skillEditorOpen && state.skillEditorIndex === index) {
          state.skillEditorOpen = false;
          state.skillEditorIndex = -1;
          state.skillEditorDraft = '';
          state.skillEditorError = '';
        }
        state.form.customSkills.splice(index, 1);
        state.expandedCustomSkillIndex = Math.min(index, state.form.customSkills.length - 1);
        updateDirtyState(state);
        renderState(state);
      });
      skillActions.appendChild(remove);
      skillHeader.appendChild(skillActions);
      skillBody.appendChild(skillHeader);
      var skillMetaGrid = createEl('div', 'persona-lab-skill-meta-grid');
      ['key', 'title', 'summary'].forEach(function (field) {
        var input = markFocusKey(createEl('input', 'persona-lab-input'), 'custom-skill-' + index + '-' + field);
        if (field === 'key') disableSmartText(input);
        input.value = skill[field] || '';
        bindInput(input, function () {
          skill[field] = input.value;
          refreshSkillSummary();
          if (field === 'key') {
            skillKeyHeading.textContent = skill.key || ('custom-skill-' + (index + 1));
          }
          updateDirtyState(state);
        });
        var fieldGroup = renderFieldGroup(skillMetaGrid, field, input, customSkillHelp[field]);
        if (field === 'summary') fieldGroup.style.gridColumn = '1 / -1';
      });
      skillBody.appendChild(skillMetaGrid);
      skillBody.appendChild(buildSkillVariableEditor(state, skill, index));
      var promptPanel = createEl('div', 'persona-lab-skill-prompt-panel');
      appendSectionHeading(promptPanel, 'h3', 'Prompt', customSkillHelp.content);
      var promptEditor = disableSmartText(markFocusKey(
        createEl('textarea', 'persona-lab-textarea persona-lab-skill-editor'),
        'custom-skill-' + index + '-content'
      ));
      promptEditor.value = skill.content || '';
      promptEditor.placeholder = 'Add markdown instructions for when and how this custom skill should be used.';
      bindInput(promptEditor, function () {
        skill.content = promptEditor.value;
        updateDirtyState(state);
      });
      promptPanel.appendChild(buildSkillVariableInsertTools(skill, promptEditor));
      renderFieldGroup(promptPanel, 'Content', promptEditor);
      skillBody.appendChild(promptPanel);
      skillCard.appendChild(skillBody);
      skillList.appendChild(skillCard);
    });
	    if (!state.form.customSkills.length) {
	      skillList.appendChild(createEl('div', 'persona-lab-empty', 'No custom skills yet.'));
	    }
	    skillPanel.appendChild(skillList);
	    var addSkill = createEl('button', 'persona-lab-button', 'Add custom skill');
    addSkill.type = 'button';
	    addSkill.addEventListener('click', function () {
      state.form.customSkills = ensureArray(state.form.customSkills);
      var nextKey = nextCustomSkillKey(state.form.customSkills);
      state.form.customSkills.push({
        key: nextKey,
        title: humanizeIdentifier(nextKey),
        summary: CUSTOM_SKILL_DEFAULT_SUMMARY,
        content: CUSTOM_SKILL_DEFAULT_CONTENT,
	        variables: [],
      });
      state.skillEditorOpen = false;
      state.skillEditorIndex = -1;
      state.expandedCustomSkillIndex = state.form.customSkills.length - 1;
      state.skillEditorDraft = '';
      state.skillEditorError = '';
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
    hideFloatingTooltip();
    captureScrollPositions(state);
    var activeState = captureActiveElementState(state);
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
    var createPersonaModal = renderCreatePersonaModal(state);
    if (createPersonaModal) {
      state.container.appendChild(createPersonaModal);
    }
    var createFolderModal = renderCreateFolderModal(state);
    if (createFolderModal) {
      state.container.appendChild(createFolderModal);
    }
    var archiveConfirmModal = renderArchiveConfirmModal(state);
    if (archiveConfirmModal) {
      state.container.appendChild(archiveConfirmModal);
    }
    var deleteConfirmModal = renderDeleteConfirmModal(state);
    if (deleteConfirmModal) {
      state.container.appendChild(deleteConfirmModal);
    }
    var skillEditor = renderCustomSkillEditorModal(state);
    if (skillEditor) {
      state.container.appendChild(skillEditor);
    }
    var drawer = renderRunDetailDrawer(state);
    if (drawer) {
      state.container.appendChild(drawer);
    }
    restoreActiveElementState(state, activeState);
    restoreScrollPositions(state);
  }

  window.__renderers['persona_lab'] = function renderPersonaLab(container) {
    ensureStyles();
    var state = getSessionState();
    state.container = container;
    syncOrganizationContext(state);
    renderState(state);
    if (!state.bootstrapLoaded && !state.bootstrapPromise) {
      fetchBootstrap(state);
    }
    if (!state.localMcpCatalogLoaded && !state.localMcpCatalogPromise) {
      loadLocalMcpCatalog(state);
    }
  };
})();

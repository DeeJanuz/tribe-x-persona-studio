// @ts-nocheck
(function () {
  'use strict';

  window.__renderers = window.__renderers || {};

  var GLOBAL_KEY = '__personaManagementPluginState';
  var STYLE_ID = 'persona-management-theme';
  var SESSION_LABEL = 'Persona Management';
  var TOOL_PREFIX = 'tribe_x_persona_studio__';
  var MCP_URL = 'http://127.0.0.1:4877/mcp';

  var REQUEST_TYPES = ['agent', 'persona', 'feature', 'bug'];
  var PRIORITIES = ['low', 'medium', 'high', 'urgent'];
  var STATUSES = [
    'BACKLOG',
    'DRAFT',
    'PROPOSED',
    'APPROVED',
    'IN_PROGRESS',
    'STAGED',
    'IMPLEMENTED',
    'TODO',
    'BLOCKED',
    'DONE',
  ];
  var WIZARD_STEPS = [
    { key: 'basics', label: 'Basics' },
    { key: 'stories', label: 'User Stories' },
    { key: 'capabilities', label: 'Capabilities' },
    { key: 'guardrails', label: 'Guardrails' },
    { key: 'review', label: 'Review' },
  ];

  function getGlobalState() {
    if (!window[GLOBAL_KEY]) {
      window[GLOBAL_KEY] = {
        sessions: {},
        stylesInjected: false,
      };
    }
    return window[GLOBAL_KEY];
  }

  function currentSessionId() {
    if (
      window.__companionUtils &&
      typeof window.__companionUtils.getActiveSession === 'function'
    ) {
      var active = window.__companionUtils.getActiveSession();
      return active && active.sessionId ? active.sessionId : 'persona-management-default';
    }
    return 'persona-management-default';
  }

  function defaultFilters() {
    return {
      personaKey: '',
      requestType: '',
      customerOrganizationId: '',
      status: '',
      priority: '',
      ownerId: '',
      requesterId: '',
    };
  }

  function defaultDraft() {
    return {
      organizationId: '',
      customerOrganizationId: '',
      requesterId: '',
      requesterName: '',
      requesterOrganizationId: '',
      personaKey: '',
      requestType: 'agent',
      priority: 'medium',
      decidrProjectId: '',
      purpose: '',
      userStoriesText: '',
      skillsText: '',
      guardrailsText: '',
      outcomesText: '',
      sourceRefsText: '',
      requiresDurableDecision: false,
    };
  }

  function getSessionState() {
    var globalState = getGlobalState();
    var sessionId = currentSessionId();
    if (!globalState.sessions[sessionId]) {
      globalState.sessions[sessionId] = {
        sessionId: sessionId,
        container: null,
        chromeKey: '',
        loaded: false,
        loading: false,
        error: '',
        status: '',
        records: [],
        filters: defaultFilters(),
        modalOpen: false,
        wizardStep: 'basics',
        draft: defaultDraft(),
        submitting: false,
        selected: null,
        detail: null,
        detailLoading: false,
        detailError: '',
        commentDraft: '',
        commentSubmitting: false,
        commentError: '',
      };
    }
    return globalState.sessions[sessionId];
  }

  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }

  function icon(name) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('pm-icon');
    var paths = {
      plus: ['M12 5v14', 'M5 12h14'],
      refresh: ['M21 12a9 9 0 0 1-15.5 6.2', 'M3 12a9 9 0 0 1 15.5-6.2', 'M18 3v5h-5', 'M6 21v-5h5'],
      search: ['M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z', 'M16 16l5 5'],
      send: ['M22 2 11 13', 'M22 2l-7 20-4-9-9-4 20-7Z'],
      close: ['M18 6 6 18', 'M6 6l12 12'],
      comment: ['M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z'],
      chevron: ['M9 18l6-6-6-6'],
    };
    (paths[name] || paths.chevron).forEach(function (d) {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    });
    return svg;
  }

  function button(className, label, iconName) {
    var el = createEl('button', className || 'pm-button');
    el.type = 'button';
    if (iconName) el.appendChild(icon(iconName));
    el.appendChild(createEl('span', null, label));
    return el;
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function ensureObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function textLines(value) {
    return String(value || '')
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
  }

  function parseSourceRefs(text) {
    return textLines(text).map(function (line) {
      var separator = line.indexOf('|');
      if (separator > -1) {
        return {
          label: line.slice(0, separator).trim(),
          url: line.slice(separator + 1).trim(),
        };
      }
      return { label: line };
    });
  }

  function titleCase(value) {
    return String(value || '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, function (match) { return match.toUpperCase(); });
  }

  function selectedOrganization() {
    var aiState = window.__tribexAiState;
    if (!aiState || typeof aiState.getSnapshot !== 'function') return null;
    var snapshot = aiState.getSnapshot();
    return snapshot && snapshot.selectedOrganization ? snapshot.selectedOrganization : null;
  }

  function selectedOrganizationId() {
    var org = selectedOrganization();
    return org && org.id ? org.id : '';
  }

  function selectedOrganizationName() {
    var org = selectedOrganization();
    return org && org.name ? org.name : selectedOrganizationId();
  }

  function syncDefaultDraftContext(state) {
    var orgId = selectedOrganizationId();
    if (orgId && !state.draft.organizationId) {
      state.draft.organizationId = orgId;
    }
    if (orgId && !state.draft.requesterOrganizationId) {
      state.draft.requesterOrganizationId = orgId;
    }
  }

  function replaceSessionChrome(state, title) {
    var chromeKey = JSON.stringify({ title: title || SESSION_LABEL });
    if (state.chromeKey === chromeKey) return;
    state.chromeKey = chromeKey;
    if (
      window.__companionUtils &&
      typeof window.__companionUtils.replaceSession === 'function'
    ) {
      window.__companionUtils.replaceSession(
        state.sessionId,
        {
          toolName: SESSION_LABEL,
          contentType: 'persona_management',
          data: { title: title || SESSION_LABEL },
          meta: {
            standalone: true,
            headerTitle: title || SESSION_LABEL,
          },
          toolArgs: {
            title: title || SESSION_LABEL,
          },
        },
        { autoFocus: false }
      );
    }
  }

  function parseToolPayload(result) {
    if (result && Array.isArray(result.content) && result.content[0] && result.content[0].text) {
      try {
        return JSON.parse(result.content[0].text);
      } catch (_error) {
        return { text: result.content[0].text };
      }
    }
    if (result && result.result) return parseToolPayload(result.result);
    return result || {};
  }

  function callTool(name, args) {
    var fullName = name.indexOf(TOOL_PREFIX) === 0 ? name : TOOL_PREFIX + name;
    if (typeof window.__personaManagementToolCall === 'function') {
      return Promise.resolve(window.__personaManagementToolCall(fullName, args || {})).then(parseToolPayload);
    }
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      return window.__TAURI__.core.invoke('call_local_mcp_tool', {
        name: fullName,
        arguments: args || {},
      }).then(parseToolPayload);
    }
    return fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'persona-management-' + Date.now(),
        method: 'tools/call',
        params: {
          name: fullName,
          arguments: args || {},
        },
      }),
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Persona Studio relay returned HTTP ' + response.status + '.');
        }
        return response.json();
      })
      .then(function (payload) {
        if (payload && payload.error) {
          throw new Error(payload.error.message || 'Persona Studio relay tool call failed.');
        }
        return parseToolPayload(payload.result);
      });
  }

  function toolErrorMessage(error) {
    if (error && error.message) return error.message;
    try {
      return JSON.stringify(error);
    } catch (_error) {
      return String(error);
    }
  }

  function listFromPayload(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.data)) return value.data;
    if (value && value.data && Array.isArray(value.data.data)) return value.data.data;
    return [];
  }

  function normalizeRecord(record, recordType) {
    var data = ensureObject(record);
    var tags = ensureArray(data.tags).map(function (tag) {
      return typeof tag === 'string' ? tag : String(tag && tag.name || '');
    }).filter(Boolean);
    return {
      id: String(data.id || ''),
      recordType: recordType,
      title: data.title || data.name || 'Untitled request',
      description: data.description || '',
      status: data.status || '',
      owner: data.owner || data.assignee || null,
      implementer: data.implementer || null,
      createdAt: data.createdAt || data.created_at || '',
      updatedAt: data.updatedAt || data.updated_at || '',
      tags: tags,
      raw: data,
    };
  }

  function normalizeRecords(payload) {
    var decisions = listFromPayload(payload.decisions).map(function (record) {
      return normalizeRecord(record, 'decision');
    });
    var bugTasks = listFromPayload(payload.bugTasks).map(function (record) {
      return normalizeRecord(record, 'task');
    });
    return decisions.concat(bugTasks).filter(function (record) { return record.id; });
  }

  function tagValue(record, prefix) {
    var match = ensureArray(record.tags).find(function (tag) {
      return tag.indexOf(prefix) === 0;
    });
    return match ? match.slice(prefix.length) : '';
  }

  function requestTypeFor(record) {
    return tagValue(record, 'request:') || (record.recordType === 'task' ? 'bug' : 'agent');
  }

  function priorityFor(record) {
    return tagValue(record, 'priority:') || 'medium';
  }

  function personaFor(record) {
    return tagValue(record, 'persona:');
  }

  function customerFor(record) {
    return tagValue(record, 'customer:');
  }

  function statusCopy(status) {
    var map = {
      BACKLOG: 'Backlog',
      DRAFT: 'Intake',
      PROPOSED: 'Ready for builder',
      APPROVED: 'Approved',
      IN_PROGRESS: 'Building',
      STAGED: 'Testing',
      IMPLEMENTED: 'Implemented',
      TODO: 'Triaged',
      BLOCKED: 'Blocked',
      DONE: 'Done',
    };
    return map[status] || titleCase(status || 'Unknown');
  }

  function recordSummary(record) {
    var description = String(record.description || '').split('\n').filter(Boolean);
    return description.find(function (line) {
      return !/^(Persona Studio|Request type:|Priority:|Organization:|Customer organization:|Persona:|Tags:)/.test(line);
    }) || record.description || '';
  }

  function formatDate(value) {
    if (!value) return 'No date';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function renderStatusPill(status, recordType) {
    var pill = createEl('span', 'pm-pill status status-' + String(status || 'unknown').toLowerCase());
    pill.appendChild(createEl('span', 'pm-dot'));
    pill.appendChild(createEl('span', null, statusCopy(status)));
    if (recordType === 'task') pill.appendChild(createEl('span', 'pm-pill-suffix', 'Task'));
    return pill;
  }

  function renderPriority(priority) {
    return createEl('span', 'pm-pill priority priority-' + String(priority || 'medium').toLowerCase(), titleCase(priority || 'medium'));
  }

  function field(parent, id, label, input, hint) {
    var wrap = createEl('div', 'pm-field');
    var labelEl = createEl('label', null, label);
    labelEl.setAttribute('for', id);
    input.id = id;
    wrap.appendChild(labelEl);
    wrap.appendChild(input);
    if (hint) wrap.appendChild(createEl('div', 'pm-help', hint));
    parent.appendChild(wrap);
    return input;
  }

  function input(value, onInput, placeholder) {
    var el = createEl('input', 'pm-input');
    el.value = value || '';
    if (placeholder) el.placeholder = placeholder;
    el.addEventListener('input', function () {
      onInput(el.value);
    });
    return el;
  }

  function textarea(value, onInput, placeholder) {
    var el = createEl('textarea', 'pm-textarea');
    el.value = value || '';
    if (placeholder) el.placeholder = placeholder;
    el.addEventListener('input', function () {
      onInput(el.value);
    });
    return el;
  }

  function select(value, options, onInput, includeAny) {
    var el = createEl('select', 'pm-select');
    if (includeAny) {
      var any = document.createElement('option');
      any.value = '';
      any.textContent = 'Any';
      if (!value) any.selected = true;
      el.appendChild(any);
    }
    options.forEach(function (optionValue) {
      var option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionValue === 'agent' ? 'New agent' : titleCase(optionValue);
      if (value === optionValue) option.selected = true;
      el.appendChild(option);
    });
    el.addEventListener('input', function () {
      onInput(el.value);
    });
    return el;
  }

  function checkbox(checked, onInput) {
    var el = createEl('input', 'pm-checkbox');
    el.type = 'checkbox';
    el.checked = !!checked;
    el.addEventListener('input', function () {
      onInput(el.checked);
    });
    return el;
  }

  function organizationIdForState(state) {
    return state.draft.organizationId || selectedOrganizationId();
  }

  function listArgs(state) {
    var filters = state.filters;
    return {
      organizationId: organizationIdForState(state),
      personaKey: filters.personaKey || undefined,
      requestType: filters.requestType || undefined,
      customerOrganizationId: filters.customerOrganizationId || undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      ownerId: filters.ownerId || undefined,
      requesterId: filters.requesterId || undefined,
      includeBugTasks: true,
      limit: 100,
    };
  }

  function submitArgs(state) {
    var draft = state.draft;
    var requestType = draft.requestType || 'agent';
    return {
      organizationId: organizationIdForState(state),
      customerOrganizationId: draft.customerOrganizationId || undefined,
      requesterId: draft.requesterId || undefined,
      requesterName: draft.requesterName || undefined,
      requesterOrganizationId: draft.requesterOrganizationId || selectedOrganizationId() || undefined,
      personaKey: draft.personaKey || undefined,
      requestType: requestType,
      purpose: draft.purpose,
      userStories: textLines(draft.userStoriesText),
      skills: textLines(draft.skillsText),
      guardrails: textLines(draft.guardrailsText),
      outcomes: textLines(draft.outcomesText),
      priority: draft.priority || 'medium',
      compactSourceRefs: parseSourceRefs(draft.sourceRefsText),
      requiresDurableDecision: draft.requiresDurableDecision === true,
      decidrProjectId: draft.decidrProjectId || undefined,
    };
  }

  function loadRequests(state) {
    if (state.loading) return Promise.resolve(null);
    if (!organizationIdForState(state)) {
      state.loaded = true;
      state.error = 'Select a DecidR organization before loading requests.';
      renderState(state);
      return Promise.resolve(null);
    }
    state.loading = true;
    state.error = '';
    renderState(state);
    return callTool('persona-requirements-list', listArgs(state))
      .then(function (payload) {
        state.records = normalizeRecords(payload);
        state.loaded = true;
        state.status = 'Loaded ' + state.records.length + ' request' + (state.records.length === 1 ? '' : 's') + '.';
      })
      .catch(function (error) {
        state.error = toolErrorMessage(error);
      })
      .finally(function () {
        state.loading = false;
        renderState(state);
      });
  }

  function openRequestModal(state) {
    syncDefaultDraftContext(state);
    state.modalOpen = true;
    state.wizardStep = 'basics';
    state.status = '';
    state.error = '';
    renderState(state);
    window.setTimeout(function () {
      var target = state.container && state.container.querySelector('[data-pm-autofocus]');
      if (target && typeof target.focus === 'function') target.focus();
    }, 0);
  }

  function closeRequestModal(state) {
    if (state.submitting) return;
    state.modalOpen = false;
    renderState(state);
  }

  function submitRequest(state) {
    if (state.submitting) return Promise.resolve(null);
    if (!String(state.draft.purpose || '').trim()) {
      state.error = 'Purpose is required.';
      state.wizardStep = 'basics';
      renderState(state);
      return Promise.resolve(null);
    }
    state.submitting = true;
    state.error = '';
    state.status = 'Submitting request...';
    renderState(state);
    return callTool('persona-requirement-submit', submitArgs(state))
      .then(function (payload) {
        state.modalOpen = false;
        state.draft = Object.assign(defaultDraft(), {
          organizationId: organizationIdForState(state),
          requesterOrganizationId: selectedOrganizationId(),
        });
        state.status = 'Request submitted to DecidR.';
        state.loaded = false;
        return loadRequests(state).then(function () { return payload; });
      })
      .catch(function (error) {
        state.error = toolErrorMessage(error);
      })
      .finally(function () {
        state.submitting = false;
        renderState(state);
      });
  }

  function loadDetail(state, record) {
    state.selected = record;
    state.detail = null;
    state.detailError = '';
    state.detailLoading = true;
    state.commentDraft = '';
    state.commentError = '';
    renderState(state);
    return callTool('persona-requirement-detail', {
      organizationId: organizationIdForState(state),
      recordType: record.recordType,
      id: record.id,
    })
      .then(function (payload) {
        state.detail = payload;
      })
      .catch(function (error) {
        state.detailError = toolErrorMessage(error);
      })
      .finally(function () {
        state.detailLoading = false;
        renderState(state);
      });
  }

  function postComment(state) {
    var record = state.selected;
    var text = String(state.commentDraft || '').trim();
    if (!record || !text || state.commentSubmitting) return Promise.resolve(null);
    state.commentSubmitting = true;
    state.commentError = '';
    renderState(state);
    return callTool('persona-requirement-comment', {
      organizationId: organizationIdForState(state),
      recordType: record.recordType,
      id: record.id,
      comment: text,
      customerOrganizationId: customerFor(record) || undefined,
      personaKey: personaFor(record) || undefined,
      requestType: requestTypeFor(record) || undefined,
    })
      .then(function () {
        state.commentDraft = '';
        return loadDetail(state, record);
      })
      .catch(function (error) {
        state.commentError = toolErrorMessage(error);
      })
      .finally(function () {
        state.commentSubmitting = false;
        renderState(state);
      });
  }

  function closeDetail(state) {
    state.selected = null;
    state.detail = null;
    state.detailError = '';
    renderState(state);
  }

  function applyFilterChange(state, key, value) {
    state.filters[key] = value;
    state.loaded = false;
  }

  function renderHeader(state) {
    var header = createEl('header', 'pm-header');
    var copy = createEl('div', 'pm-header-copy');
    copy.appendChild(createEl('p', 'pm-eyebrow', selectedOrganizationName() || 'No organization selected'));
    copy.appendChild(createEl('h1', null, 'Persona Management'));
    header.appendChild(copy);
    var actions = createEl('div', 'pm-actions');
    var refresh = button('pm-button', state.loading ? 'Refreshing' : 'Refresh', 'refresh');
    refresh.disabled = state.loading;
    refresh.addEventListener('click', function () {
      loadRequests(state);
    });
    actions.appendChild(refresh);
    var request = button('pm-button primary', 'Request new agent', 'plus');
    request.addEventListener('click', function () {
      openRequestModal(state);
    });
    actions.appendChild(request);
    header.appendChild(actions);
    return header;
  }

  function renderMetrics(state) {
    var counts = {
      open: 0,
      building: 0,
      testing: 0,
      done: 0,
    };
    state.records.forEach(function (record) {
      if (record.status === 'IN_PROGRESS') counts.building += 1;
      else if (record.status === 'STAGED') counts.testing += 1;
      else if (record.status === 'IMPLEMENTED' || record.status === 'DONE') counts.done += 1;
      else counts.open += 1;
    });
    var row = createEl('section', 'pm-metrics');
    [
      ['Open', counts.open],
      ['Building', counts.building],
      ['Testing', counts.testing],
      ['Done', counts.done],
    ].forEach(function (entry) {
      var item = createEl('div', 'pm-metric');
      item.appendChild(createEl('span', null, entry[0]));
      item.appendChild(createEl('strong', null, String(entry[1])));
      row.appendChild(item);
    });
    return row;
  }

  function renderFilters(state) {
    var panel = createEl('section', 'pm-filters');
    var searchWrap = createEl('div', 'pm-search');
    searchWrap.appendChild(icon('search'));
    searchWrap.appendChild(fieldlessInput(state.filters.personaKey, function (value) {
      applyFilterChange(state, 'personaKey', value);
    }, 'Persona key'));
    panel.appendChild(searchWrap);
    panel.appendChild(select(state.filters.requestType, REQUEST_TYPES, function (value) {
      applyFilterChange(state, 'requestType', value);
    }, true));
    panel.appendChild(input(state.filters.customerOrganizationId, function (value) {
      applyFilterChange(state, 'customerOrganizationId', value);
    }, 'Customer org'));
    panel.appendChild(select(state.filters.status, STATUSES, function (value) {
      applyFilterChange(state, 'status', value);
    }, true));
    panel.appendChild(select(state.filters.priority, PRIORITIES, function (value) {
      applyFilterChange(state, 'priority', value);
    }, true));
    panel.appendChild(input(state.filters.ownerId, function (value) {
      applyFilterChange(state, 'ownerId', value);
    }, 'Owner'));
    panel.appendChild(input(state.filters.requesterId, function (value) {
      applyFilterChange(state, 'requesterId', value);
    }, 'Requester'));
    var apply = button('pm-button subtle', 'Apply', 'refresh');
    apply.addEventListener('click', function () {
      loadRequests(state);
    });
    panel.appendChild(apply);
    return panel;
  }

  function fieldlessInput(value, onInput, placeholder) {
    var el = createEl('input', 'pm-input bare');
    el.value = value || '';
    el.placeholder = placeholder || '';
    el.addEventListener('input', function () {
      onInput(el.value);
    });
    return el;
  }

  function renderRecords(state) {
    var panel = createEl('section', 'pm-table-panel');
    var head = createEl('div', 'pm-table-head');
    head.appendChild(createEl('span', null, 'Request'));
    head.appendChild(createEl('span', null, 'Status'));
    head.appendChild(createEl('span', null, 'Priority'));
    head.appendChild(createEl('span', null, 'Scope'));
    head.appendChild(createEl('span', null, 'Updated'));
    panel.appendChild(head);

    if (state.loading && !state.records.length) {
      for (var index = 0; index < 4; index += 1) {
        panel.appendChild(createEl('div', 'pm-skeleton-row'));
      }
      return panel;
    }

    if (!state.records.length) {
      var empty = createEl('div', 'pm-empty');
      empty.appendChild(createEl('strong', null, 'No requests found'));
      empty.appendChild(createEl('span', null, state.loaded ? 'Change filters or create a new request.' : 'Load requests to view the dashboard.'));
      panel.appendChild(empty);
      return panel;
    }

    state.records.forEach(function (record) {
      var row = createEl('button', 'pm-record-row');
      row.type = 'button';
      row.addEventListener('click', function () {
        loadDetail(state, record);
      });
      var main = createEl('span', 'pm-record-main');
      main.appendChild(createEl('strong', null, record.title));
      main.appendChild(createEl('small', null, recordSummary(record).slice(0, 130)));
      row.appendChild(main);
      row.appendChild(renderStatusPill(record.status, record.recordType));
      row.appendChild(renderPriority(priorityFor(record)));
      row.appendChild(createEl('span', 'pm-muted', [requestTypeFor(record), personaFor(record), customerFor(record)].filter(Boolean).join(' / ') || 'General'));
      row.appendChild(createEl('span', 'pm-muted', formatDate(record.updatedAt || record.createdAt)));
      panel.appendChild(row);
    });
    return panel;
  }

  function renderNotice(state) {
    if (!state.error && !state.status) return null;
    var notice = createEl('div', state.error ? 'pm-notice error' : 'pm-notice');
    notice.setAttribute(state.error ? 'role' : 'aria-live', state.error ? 'alert' : 'polite');
    notice.textContent = state.error || state.status;
    return notice;
  }

  function renderWizardStepper(state) {
    var stepper = createEl('div', 'pm-stepper');
    WIZARD_STEPS.forEach(function (step, index) {
      var item = createEl('button', 'pm-step' + (step.key === state.wizardStep ? ' active' : ''));
      item.type = 'button';
      item.appendChild(createEl('span', null, String(index + 1)));
      item.appendChild(createEl('strong', null, step.label));
      item.addEventListener('click', function () {
        state.wizardStep = step.key;
        renderState(state);
      });
      stepper.appendChild(item);
    });
    return stepper;
  }

  function currentStepIndex(state) {
    var key = state.wizardStep;
    for (var index = 0; index < WIZARD_STEPS.length; index += 1) {
      if (WIZARD_STEPS[index].key === key) return index;
    }
    return 0;
  }

  function renderWizardBody(state) {
    var draft = state.draft;
    var body = createEl('div', 'pm-modal-body');
    body.appendChild(renderWizardStepper(state));
    var grid = createEl('div', 'pm-form-grid');

    if (state.wizardStep === 'basics') {
      field(grid, 'pm-purpose', 'Purpose', textarea(draft.purpose, function (value) {
        draft.purpose = value;
      }, 'Agent goal or change request'), null).setAttribute('data-pm-autofocus', 'true');
      field(grid, 'pm-request-type', 'Type', select(draft.requestType, REQUEST_TYPES, function (value) {
        draft.requestType = value || 'agent';
      }, false));
      field(grid, 'pm-priority', 'Priority', select(draft.priority, PRIORITIES, function (value) {
        draft.priority = value || 'medium';
      }, false));
      field(grid, 'pm-persona', 'Persona key', input(draft.personaKey, function (value) {
        draft.personaKey = value;
      }, 'optional'));
      field(grid, 'pm-customer', 'Customer org', input(draft.customerOrganizationId, function (value) {
        draft.customerOrganizationId = value;
      }, 'optional'));
      field(grid, 'pm-project', 'DecidR project', input(draft.decidrProjectId, function (value) {
        draft.decidrProjectId = value;
      }, 'configured or paste id'));
    } else if (state.wizardStep === 'stories') {
      field(grid, 'pm-stories', 'User stories', textarea(draft.userStoriesText, function (value) {
        draft.userStoriesText = value;
      }, 'As a user, I want...'));
      field(grid, 'pm-outcomes', 'Outcomes', textarea(draft.outcomesText, function (value) {
        draft.outcomesText = value;
      }, 'one outcome per line'));
      field(grid, 'pm-requester', 'Requester', input(draft.requesterName, function (value) {
        draft.requesterName = value;
      }, 'name or team'));
      field(grid, 'pm-requester-id', 'Requester ID', input(draft.requesterId, function (value) {
        draft.requesterId = value;
      }, 'optional'));
    } else if (state.wizardStep === 'capabilities') {
      field(grid, 'pm-skills', 'Skills', textarea(draft.skillsText, function (value) {
        draft.skillsText = value;
      }, 'one capability per line'));
      field(grid, 'pm-source-refs', 'Source refs', textarea(draft.sourceRefsText, function (value) {
        draft.sourceRefsText = value;
      }, 'label | url'));
    } else if (state.wizardStep === 'guardrails') {
      field(grid, 'pm-guardrails', 'Guardrails', textarea(draft.guardrailsText, function (value) {
        draft.guardrailsText = value;
      }, 'one guardrail per line'));
      var checkWrap = createEl('div', 'pm-checkline');
      checkWrap.appendChild(checkbox(draft.requiresDurableDecision, function (value) {
        draft.requiresDurableDecision = value;
      }));
      checkWrap.appendChild(createEl('span', null, 'Treat this bug as a durable decision'));
      grid.appendChild(checkWrap);
    } else {
      var preview = createEl('pre', 'pm-json');
      preview.textContent = JSON.stringify(submitArgs(state), null, 2);
      grid.appendChild(preview);
    }

    body.appendChild(grid);
    return body;
  }

  function renderRequestModal(state) {
    if (!state.modalOpen) return null;
    var overlay = createEl('div', 'pm-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'pm-request-title');
    var modal = createEl('section', 'pm-modal');
    var header = createEl('div', 'pm-modal-header');
    header.appendChild(createEl('h2', null, 'Request new agent'));
    header.querySelector('h2').id = 'pm-request-title';
    var close = button('pm-icon-button', 'Close', 'close');
    close.addEventListener('click', function () {
      closeRequestModal(state);
    });
    header.appendChild(close);
    modal.appendChild(header);
    modal.appendChild(renderWizardBody(state));
    var footer = createEl('div', 'pm-modal-footer');
    var index = currentStepIndex(state);
    if (index > 0) {
      var back = button('pm-button', 'Back');
      back.addEventListener('click', function () {
        state.wizardStep = WIZARD_STEPS[index - 1].key;
        renderState(state);
      });
      footer.appendChild(back);
    }
    if (index < WIZARD_STEPS.length - 1) {
      var next = button('pm-button primary', 'Next: ' + WIZARD_STEPS[index + 1].label);
      next.addEventListener('click', function () {
        state.wizardStep = WIZARD_STEPS[index + 1].key;
        renderState(state);
      });
      footer.appendChild(next);
    } else {
      var submit = button('pm-button primary', state.submitting ? 'Submitting' : 'Submit request', 'send');
      submit.disabled = state.submitting;
      submit.addEventListener('click', function () {
        submitRequest(state);
      });
      footer.appendChild(submit);
    }
    modal.appendChild(footer);
    overlay.appendChild(modal);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeRequestModal(state);
    });
    return overlay;
  }

  function renderTimelineItems(events) {
    var list = createEl('div', 'pm-timeline');
    ensureArray(events).forEach(function (event) {
      var item = createEl('div', 'pm-timeline-item');
      item.appendChild(createEl('strong', null, statusCopy(event.action || 'COMMENTED')));
      item.appendChild(createEl('p', null, event.description || event.summary || ''));
      item.appendChild(createEl('small', null, formatDate(event.occurredAt || event.createdAt)));
      list.appendChild(item);
    });
    if (!list.children.length) {
      list.appendChild(createEl('div', 'pm-empty compact', 'No timeline activity yet.'));
    }
    return list;
  }

  function renderDetailDrawer(state) {
    if (!state.selected) return null;
    var record = state.selected;
    var drawer = createEl('aside', 'pm-drawer');
    drawer.setAttribute('role', 'complementary');
    var header = createEl('div', 'pm-drawer-header');
    var copy = createEl('div');
    copy.appendChild(createEl('span', 'pm-eyebrow', record.recordType));
    copy.appendChild(createEl('h2', null, record.title));
    header.appendChild(copy);
    var close = button('pm-icon-button', 'Close', 'close');
    close.addEventListener('click', function () {
      closeDetail(state);
    });
    header.appendChild(close);
    drawer.appendChild(header);

    var body = createEl('div', 'pm-drawer-body');
    if (state.detailLoading) {
      body.appendChild(createEl('div', 'pm-skeleton-block'));
    } else if (state.detailError) {
      var error = createEl('div', 'pm-notice error', state.detailError);
      error.setAttribute('role', 'alert');
      body.appendChild(error);
    } else {
      var meta = createEl('div', 'pm-detail-meta');
      meta.appendChild(renderStatusPill(record.status, record.recordType));
      meta.appendChild(renderPriority(priorityFor(record)));
      meta.appendChild(createEl('span', 'pm-pill neutral', requestTypeFor(record)));
      if (personaFor(record)) meta.appendChild(createEl('span', 'pm-pill neutral', personaFor(record)));
      body.appendChild(meta);
      body.appendChild(createEl('p', 'pm-detail-description', record.description || 'No description.'));
      var detail = ensureObject(state.detail);
      var timeline = listFromPayload(detail.timeline);
      body.appendChild(createEl('h3', null, 'Timeline'));
      body.appendChild(renderTimelineItems(timeline));
      body.appendChild(createEl('h3', null, 'Comments'));
      var comment = textarea(state.commentDraft, function (value) {
        state.commentDraft = value;
      }, 'Add a comment');
      body.appendChild(comment);
      if (state.commentError) {
        var commentError = createEl('div', 'pm-notice error', state.commentError);
        commentError.setAttribute('role', 'alert');
        body.appendChild(commentError);
      }
      var post = button('pm-button primary', state.commentSubmitting ? 'Posting' : 'Post comment', 'comment');
      post.disabled = state.commentSubmitting;
      post.addEventListener('click', function () {
        postComment(state);
      });
      body.appendChild(post);
    }
    drawer.appendChild(body);
    return drawer;
  }

  function renderState(state) {
    if (!state.container) return;
    replaceSessionChrome(state, SESSION_LABEL);
    syncDefaultDraftContext(state);
    state.container.innerHTML = '';
    var root = createEl('div', 'pm-root');
    root.appendChild(renderHeader(state));
    var notice = renderNotice(state);
    if (notice) root.appendChild(notice);
    root.appendChild(renderMetrics(state));
    root.appendChild(renderFilters(state));
    root.appendChild(renderRecords(state));
    state.container.appendChild(root);
    var modal = renderRequestModal(state);
    if (modal) state.container.appendChild(modal);
    var drawer = renderDetailDrawer(state);
    if (drawer) state.container.appendChild(drawer);
  }

  function ensureStyles() {
    var globalState = getGlobalState();
    if (globalState.stylesInjected || document.getElementById(STYLE_ID)) return;
    globalState.stylesInjected = true;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.pm-root,.pm-overlay,.pm-drawer{--pm-bg:#f8fafc;--pm-panel:#fff;--pm-panel-soft:#f1f5f9;--pm-line:#dbe3ed;--pm-text:#172033;--pm-muted:#5b687c;--pm-soft:#eef6f4;--pm-accent:#3056d3;--pm-accent-2:#0f766e;--pm-danger:#b42318;--pm-warning:#b45309;--pm-success:#147a48;color:var(--pm-text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.pm-root{min-height:100%;background:var(--pm-bg);padding:20px;display:flex;flex-direction:column;gap:14px}',
      '.pm-header,.pm-filters,.pm-table-panel,.pm-metrics,.pm-notice{background:var(--pm-panel);border:1px solid var(--pm-line);border-radius:8px}',
      '.pm-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px}',
      '.pm-header-copy{display:flex;flex-direction:column;gap:4px;min-width:0}.pm-header h1{font-size:24px;line-height:1.15;margin:0;letter-spacing:0}.pm-eyebrow{margin:0;color:var(--pm-muted);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}',
      '.pm-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.pm-button,.pm-icon-button{appearance:none;border:1px solid var(--pm-line);background:var(--pm-panel);color:var(--pm-text);border-radius:8px;min-height:38px;padding:8px 12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;cursor:pointer;transition:background .18s ease,border-color .18s ease,color .18s ease,opacity .18s ease}.pm-button:hover:not(:disabled),.pm-icon-button:hover:not(:disabled){border-color:var(--pm-accent);background:#eef2ff}.pm-button.primary{background:var(--pm-accent);border-color:var(--pm-accent);color:#fff}.pm-button.primary:hover:not(:disabled){background:#2446b8;border-color:#2446b8}.pm-button.subtle{background:var(--pm-panel-soft)}.pm-button:disabled{cursor:not-allowed;opacity:.65}.pm-icon-button{width:38px;padding:0}.pm-icon-button span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}',
      '.pm-icon{width:18px;height:18px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}',
      '.pm-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;overflow:hidden}.pm-metric{padding:14px 16px;background:var(--pm-panel);display:flex;flex-direction:column;gap:4px}.pm-metric span{color:var(--pm-muted);font-size:12px;font-weight:700}.pm-metric strong{font-size:24px;line-height:1}',
      '.pm-filters{display:grid;grid-template-columns:1.5fr repeat(6,minmax(110px,1fr)) auto;gap:10px;padding:12px}.pm-search{display:flex;align-items:center;gap:8px;border:1px solid var(--pm-line);border-radius:8px;background:#fff;padding:0 10px}.pm-search .pm-input{border:none;padding-left:0}.pm-input,.pm-select,.pm-textarea{width:100%;box-sizing:border-box;border:1px solid var(--pm-line);border-radius:8px;background:#fff;color:var(--pm-text);font:inherit;font-size:14px;padding:9px 10px;min-height:38px}.pm-input.bare{background:transparent}.pm-textarea{min-height:96px;resize:vertical;line-height:1.45}.pm-input:focus-visible,.pm-select:focus-visible,.pm-textarea:focus-visible,.pm-button:focus-visible,.pm-icon-button:focus-visible{outline:3px solid rgba(48,86,211,.22);outline-offset:1px;border-color:var(--pm-accent)}',
      '.pm-table-panel{overflow:hidden}.pm-table-head,.pm-record-row{display:grid;grid-template-columns:minmax(280px,2.1fr) minmax(150px,.8fr) minmax(100px,.6fr) minmax(150px,1fr) minmax(88px,.5fr);gap:12px;align-items:center}.pm-table-head{padding:11px 14px;background:var(--pm-panel-soft);font-size:12px;font-weight:800;color:var(--pm-muted);text-transform:uppercase;letter-spacing:.04em}.pm-record-row{width:100%;text-align:left;border:0;border-top:1px solid var(--pm-line);background:#fff;padding:14px;cursor:pointer;color:inherit;transition:background .18s ease}.pm-record-row:hover{background:#f8fbff}.pm-record-main{min-width:0;display:flex;flex-direction:column;gap:4px}.pm-record-main strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pm-record-main small,.pm-muted{color:var(--pm-muted);font-size:13px;line-height:1.35;min-width:0;overflow:hidden;text-overflow:ellipsis}.pm-pill{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;border-radius:999px;padding:5px 8px;font-size:12px;font-weight:800;border:1px solid transparent;white-space:nowrap}.pm-dot{width:7px;height:7px;border-radius:999px;background:currentColor}.pm-pill-suffix{font-size:11px;color:inherit;opacity:.75}.pm-pill.neutral{background:#eef2f7;border-color:#d8e0ea;color:#40506a}.status-backlog,.status-draft,.status-todo{background:#f1f5f9;border-color:#dbe3ed;color:#475569}.status-proposed,.status-approved{background:#eef2ff;border-color:#c7d2fe;color:#3147a8}.status-in_progress{background:#ecfeff;border-color:#a5f3fc;color:#0e7490}.status-staged{background:#fff7ed;border-color:#fed7aa;color:#b45309}.status-implemented,.status-done{background:#ecfdf3;border-color:#bbf7d0;color:#147a48}.status-blocked,.status-rejected{background:#fef3f2;border-color:#fecaca;color:#b42318}.priority-low{background:#f1f5f9;color:#475569}.priority-medium{background:#eef2ff;color:#3147a8}.priority-high{background:#fff7ed;color:#b45309}.priority-urgent{background:#fef3f2;color:#b42318}',
      '.pm-empty{padding:28px;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;color:var(--pm-muted);text-align:center}.pm-empty strong{color:var(--pm-text)}.pm-empty.compact{padding:12px;align-items:flex-start;text-align:left}.pm-notice{padding:12px 14px;color:#2446b8;background:#eef2ff;border-color:#c7d2fe}.pm-notice.error{color:#b42318;background:#fef3f2;border-color:#fecaca}',
      '.pm-overlay{position:fixed;inset:0;background:rgba(15,23,42,.36);display:flex;align-items:center;justify-content:center;padding:18px;z-index:50}.pm-modal{width:min(880px,100%);max-height:92vh;display:flex;flex-direction:column;background:#fff;border:1px solid var(--pm-line);border-radius:8px;box-shadow:0 24px 80px rgba(15,23,42,.24);overflow:hidden}.pm-modal-header,.pm-modal-footer,.pm-drawer-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid var(--pm-line)}.pm-modal-header h2,.pm-drawer-header h2{margin:0;font-size:20px;letter-spacing:0}.pm-modal-body{padding:18px;overflow:auto;display:flex;flex-direction:column;gap:16px}.pm-modal-footer{border-top:1px solid var(--pm-line);border-bottom:0;justify-content:flex-end}.pm-stepper{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.pm-step{border:1px solid var(--pm-line);border-radius:8px;background:#fff;color:var(--pm-muted);padding:8px;text-align:left;display:flex;gap:8px;align-items:center;cursor:pointer}.pm-step span{width:22px;height:22px;border-radius:999px;background:var(--pm-panel-soft);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex:0 0 auto}.pm-step strong{font-size:12px;line-height:1.15}.pm-step.active{border-color:var(--pm-accent);color:var(--pm-accent);background:#eef2ff}.pm-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.pm-field{display:flex;flex-direction:column;gap:6px}.pm-field:first-child,.pm-json,.pm-checkline{grid-column:1 / -1}.pm-field label{font-size:13px;font-weight:800;color:var(--pm-text)}.pm-help{font-size:12px;color:var(--pm-muted)}.pm-checkline{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--pm-line);border-radius:8px;background:var(--pm-panel-soft);font-weight:700}.pm-checkbox{width:18px;height:18px;accent-color:var(--pm-accent)}.pm-json{white-space:pre-wrap;background:#0f172a;color:#e2e8f0;padding:14px;border-radius:8px;overflow:auto;font-size:12px;line-height:1.45}',
      '.pm-drawer{position:fixed;top:0;right:0;bottom:0;width:min(560px,100%);background:#fff;border-left:1px solid var(--pm-line);box-shadow:-18px 0 60px rgba(15,23,42,.18);z-index:45;display:flex;flex-direction:column}.pm-drawer-body{padding:18px;overflow:auto;display:flex;flex-direction:column;gap:14px}.pm-detail-meta{display:flex;gap:8px;flex-wrap:wrap}.pm-detail-description{white-space:pre-wrap;color:var(--pm-muted);line-height:1.5;margin:0}.pm-drawer h3{margin:8px 0 0;font-size:14px;letter-spacing:0}.pm-timeline{display:flex;flex-direction:column;gap:8px}.pm-timeline-item{border:1px solid var(--pm-line);border-radius:8px;padding:10px;background:#fff}.pm-timeline-item p{margin:4px 0;color:var(--pm-muted);line-height:1.4}.pm-timeline-item small{color:var(--pm-muted)}',
      '.pm-skeleton-row,.pm-skeleton-block{background:linear-gradient(90deg,#eef2f7,#f8fafc,#eef2f7);background-size:200% 100%;animation:pm-shimmer 1.2s ease-in-out infinite}.pm-skeleton-row{height:64px;border-top:1px solid var(--pm-line)}.pm-skeleton-block{height:180px;border-radius:8px}@keyframes pm-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@media (prefers-reduced-motion:reduce){.pm-skeleton-row,.pm-skeleton-block{animation:none}.pm-button,.pm-icon-button,.pm-record-row{transition:none}}',
      '@media (max-width:1100px){.pm-filters{grid-template-columns:repeat(3,minmax(0,1fr))}.pm-search{grid-column:1 / -1}.pm-table-head{display:none}.pm-record-row{grid-template-columns:1fr auto;align-items:flex-start}.pm-record-row>.pm-muted:last-child{display:none}.pm-record-row>.pm-muted{grid-column:1 / -1}.pm-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '@media (max-width:720px){.pm-root{padding:12px}.pm-header{align-items:flex-start;flex-direction:column}.pm-actions{width:100%}.pm-actions .pm-button{flex:1}.pm-filters{grid-template-columns:1fr}.pm-modal{max-height:96vh}.pm-stepper,.pm-form-grid{grid-template-columns:1fr}.pm-step{align-items:center}.pm-modal-footer{flex-wrap:wrap}.pm-modal-footer .pm-button{flex:1}.pm-record-row{grid-template-columns:1fr}.pm-pill{width:max-content}.pm-drawer{width:100%}}',
    ].join('\n');
    document.head.appendChild(style);
  }

  window.__renderers.persona_management = function renderPersonaManagement(container) {
    ensureStyles();
    var state = getSessionState();
    state.container = container;
    syncDefaultDraftContext(state);
    renderState(state);
    if (!state.loaded && !state.loading) {
      window.setTimeout(function () {
        loadRequests(state);
      }, 0);
    }
  };
})();

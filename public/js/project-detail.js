(async function () {
  // helpers
  const uiScript = document.createElement('script');
  uiScript.src = '/public/js/ui.js';
  uiScript.defer = true;
  document.head.appendChild(uiScript);

  const projectId = (() => {
    const parts = location.pathname.split('/').filter(Boolean);
    return parseInt(parts[1], 10);
  })();

  const titleEl = document.getElementById('project-title');
  const subtitleEl = document.getElementById('project-subtitle');

  const filterStatus = document.getElementById('filter-status');
  const filterPriority = document.getElementById('filter-priority');
  const filterDue = document.getElementById('filter-due');
  const filterSearch = document.getElementById('filter-search');
  const btnRefresh = document.getElementById('btn-refresh');
  const btnNewTask = document.getElementById('btn-new-task');

  const tasksTbody = document.getElementById('tasks-tbody');
  const tasksCount = document.getElementById('tasks-count');

  // Members
  const membersTbody = document.getElementById('members-tbody');
  const memberEmail = document.getElementById('member-email');
  const btnAddMember = document.getElementById('btn-add-member');
  const memberError = document.getElementById('member-error');

  // Task modal (same IDs as dashboard)
  const taskModalEl = document.getElementById('taskModal');
  const taskModal = new bootstrap.Modal(taskModalEl);
  const taskModalTitle = document.getElementById('taskModalTitle');
  const taskError = document.getElementById('task-error');

  const taskIdEl = document.getElementById('task-id');
  const taskProject = document.getElementById('task-project');
  const taskAssigned = document.getElementById('task-assigned-user-id');
  const taskTitle = document.getElementById('task-title');
  const taskDesc = document.getElementById('task-desc');
  const taskStatus = document.getElementById('task-status');
  const taskPriority = document.getElementById('task-priority');
  const taskDue = document.getElementById('task-due');
  const btnSaveTask = document.getElementById('btn-save-task');
  const btnDeleteTask = document.getElementById('btn-delete-task');

  let lookups = { statuses: [], priorities: [] };
  let tasks = [];
  let canManageMembers = false;

  function showTaskError(msg) { taskError.textContent = msg; taskError.classList.remove('d-none'); }
  function hideTaskError() { taskError.classList.add('d-none'); taskError.textContent = ''; }

  function showMemberError(msg) { memberError.textContent = msg; memberError.classList.remove('d-none'); }
  function hideMemberError() { memberError.classList.add('d-none'); memberError.textContent = ''; }

  function fillSelect(select, items, valueKey, textKey, includeAll) {
    const keepFirst = includeAll ? 1 : 0;
    while (select.options.length > keepFirst) select.remove(keepFirst);
    for (const it of items) {
      const opt = document.createElement('option');
      opt.value = it[valueKey];
      opt.textContent = it[textKey];
      select.appendChild(opt);
    }
  }

  async function loadProject() {
    const [me, lk, prj] = await Promise.all([
      apiFetch('/api/auth/me'),
      apiFetch('/api/lookups'),
      apiFetch(`/api/projects/${projectId}`)
    ]);

    lookups = { statuses: lk.statuses, priorities: lk.priorities };

    titleEl.textContent = prj.project.nombre;
    subtitleEl.textContent = prj.project.descripcion || `Proyecto #${projectId}`;

    // permissions
    canManageMembers = (me.user.role === 'Admin') || (prj.project.owner_user_id === me.user.id_user);

    fillSelect(filterStatus, lookups.statuses, 'id_status', 'nombre', true);
    fillSelect(filterPriority, lookups.priorities, 'id_priority', 'nombre', true);

    fillSelect(taskStatus, lookups.statuses, 'id_status', 'nombre', false);
    fillSelect(taskPriority, lookups.priorities, 'id_priority', 'nombre', false);

    // project select (disabled)
    taskProject.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = prj.project.id_project;
    opt.textContent = prj.project.nombre;
    taskProject.appendChild(opt);
    taskProject.value = prj.project.id_project;
  }

  function buildQuery() {
    const q = new URLSearchParams();
    q.set('projectId', projectId);
    if (filterStatus.value) q.set('statusId', filterStatus.value);
    if (filterPriority.value) q.set('priorityId', filterPriority.value);
    if (filterDue.value) q.set('due', filterDue.value);
    if (filterSearch.value.trim()) q.set('search', filterSearch.value.trim());
    return q.toString();
  }

  async function loadTasks() {
    tasksTbody.innerHTML = `<tr><td colspan="6" class="text-muted">Cargando...</td></tr>`;
    const data = await apiFetch('/api/tasks?' + buildQuery());
    tasks = data.tasks || [];
    renderTasks();
  }

  function renderTasks() {
    if (!window.escapeHtml) { setTimeout(renderTasks, 50); return; }

    tasksCount.textContent = `${tasks.length} tarea(s)`;
    if (!tasks.length) {
      tasksTbody.innerHTML = `<tr><td colspan="6" class="text-muted">Sin tareas</td></tr>`;
      return;
    }

    tasksTbody.innerHTML = tasks.map(t => {
      const due = t.due_at_utc ? formatDateShort(t.due_at_utc) : '';
      return `
        <tr>
          <td>
            <div class="fw-semibold">${escapeHtml(t.title)}</div>
            <div class="text-muted small text-truncate" style="max-width: 420px">${escapeHtml(t.description || '')}</div>
          </td>
          <td>${badge(escapeHtml(t.status_name), t.is_final ? 'success' : 'secondary')}</td>
          <td>${badge(escapeHtml(t.priority_name), t.priority_name === 'Alta' ? 'danger' : (t.priority_name === 'Media' ? 'warning' : 'info'))}</td>
          <td>${due || '<span class="text-muted">—</span>'}</td>
          <td>${escapeHtml(t.assigned_name || '') || '<span class="text-muted">—</span>'}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${t.id_task}">Editar</button>
          </td>
        </tr>
      `;
    }).join('');

    tasksTbody.querySelectorAll('button[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id, 10)));
    });
  }

  function resetModal() {
    hideTaskError();
    taskIdEl.value = '';
    taskAssigned.value = '';
    taskTitle.value = '';
    taskDesc.value = '';
    taskDue.value = '';
    btnDeleteTask.classList.add('d-none');

    const defStatus = lookups.statuses.find(s => s.nombre === 'Pendiente') || lookups.statuses[0];
    const defPrio = lookups.priorities.find(p => p.nombre === 'Baja') || lookups.priorities[0];
    if (defStatus) taskStatus.value = defStatus.id_status;
    if (defPrio) taskPriority.value = defPrio.id_priority;
  }

  function openNewModal() {
    resetModal();
    taskModalTitle.textContent = 'Nueva tarea';
    taskModal.show();
  }

  async function openEditModal(id) {
    resetModal();
    taskModalTitle.textContent = 'Editar tarea';
    btnDeleteTask.classList.remove('d-none');

    const data = await apiFetch(`/api/tasks/${id}`);
    const t = data.task;

    taskIdEl.value = t.id_task;
    taskAssigned.value = t.assigned_user_id || '';
    taskTitle.value = t.title || '';
    taskDesc.value = t.description || '';
    taskStatus.value = t.id_status;
    taskPriority.value = t.id_priority;
    taskDue.value = toDateInputValue(t.due_at_utc);

    taskModal.show();
  }

  async function saveTask() {
    hideTaskError();
    const payload = {
      id_project: projectId,
      title: taskTitle.value.trim(),
      description: taskDesc.value.trim(),
      id_status: taskStatus.value,
      id_priority: taskPriority.value,
      due_date: taskDue.value || null,
      assigned_user_id: taskAssigned.value.trim() || null
    };

    if (!payload.title || payload.title.length < 2) return showTaskError('El título es obligatorio (mín 2).');

    btnSaveTask.disabled = true;
    try {
      if (taskIdEl.value) {
        await apiFetch(`/api/tasks/${taskIdEl.value}`, { method:'PATCH', body: payload });
      } else {
        await apiFetch('/api/tasks', { method:'POST', body: payload });
      }
      taskModal.hide();
      await loadTasks();
    } catch (e) {
      showTaskError(e.message || 'Error al guardar');
    } finally {
      btnSaveTask.disabled = false;
    }
  }

  async function deleteTask() {
    if (!taskIdEl.value) return;
    if (!confirm('¿Eliminar esta tarea?')) return;

    btnDeleteTask.disabled = true;
    try {
      await apiFetch(`/api/tasks/${taskIdEl.value}`, { method:'DELETE' });
      taskModal.hide();
      await loadTasks();
    } catch (e) {
      showTaskError(e.message || 'Error al eliminar');
    } finally {
      btnDeleteTask.disabled = false;
    }
  }

  async function loadMembers() {
    membersTbody.innerHTML = `<tr><td colspan="4" class="text-muted">Cargando...</td></tr>`;
    const data = await apiFetch(`/api/projects/${projectId}/members`);
    const members = data.members || [];

    if (!members.length) {
      membersTbody.innerHTML = `<tr><td colspan="4" class="text-muted">Sin miembros</td></tr>`;
      return;
    }

    membersTbody.innerHTML = members.map(m => {
      const canRemove = canManageMembers && m.member_role !== 'Owner';
      return `
        <tr>
          <td>${m.nombre}</td>
          <td>${m.correo}</td>
          <td>${m.member_role}</td>
          <td class="text-end">
            ${canRemove ? `<button class="btn btn-sm btn-outline-danger" data-action="remove" data-id="${m.id_user}">Quitar</button>` : `<span class="text-muted">—</span>`}
          </td>
        </tr>
      `;
    }).join('');

    membersTbody.querySelectorAll('button[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = parseInt(btn.dataset.id, 10);
        if (!confirm('¿Quitar miembro del proyecto?')) return;
        await apiFetch(`/api/projects/${projectId}/members/${uid}`, { method:'DELETE' });
        await loadMembers();
      });
    });

    // Habilitar/deshabilitar UI add member
    if (!canManageMembers) {
      btnAddMember.disabled = true;
      memberEmail.disabled = true;
    }
  }

  async function addMember() {
    hideMemberError();
    const email = memberEmail.value.trim();
    if (!email.includes('@')) return showMemberError('Email inválido');

    btnAddMember.disabled = true;
    try {
      await apiFetch(`/api/projects/${projectId}/members`, { method:'POST', body:{ email } });
      memberEmail.value = '';
      await loadMembers();
    } catch (e) {
      showMemberError(e.message || 'Error al agregar');
    } finally {
      btnAddMember.disabled = false;
    }
  }

  // Events
  btnRefresh.addEventListener('click', loadTasks);
  btnNewTask.addEventListener('click', openNewModal);
  btnSaveTask.addEventListener('click', saveTask);
  btnDeleteTask.addEventListener('click', deleteTask);

  [filterStatus, filterPriority, filterDue].forEach(el => el.addEventListener('change', loadTasks));
  filterSearch.addEventListener('input', () => {
    clearTimeout(window.__searchT);
    window.__searchT = setTimeout(loadTasks, 350);
  });

  btnAddMember.addEventListener('click', addMember);

  // Boot
  try {
    await loadProject();
    await loadTasks();
    await loadMembers();
  } catch (e) {
    subtitleEl.textContent = e.message || 'Error al cargar';
  }
})();

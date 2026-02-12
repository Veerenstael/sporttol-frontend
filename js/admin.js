let teamsData = [];
let activitiesData = [];

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function fmt(n) { return n.toLocaleString('nl-NL'); }

// ============ Admin Login ============
async function adminLogin() {
  const pw = document.getElementById('passwordInput').value;
  const banner = document.getElementById('loadingBanner');
  banner.classList.add('show');
  banner.textContent = '⏳ Verbinden met server...';

  try {
    const res = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    const data = await res.json();
    banner.classList.remove('show');
    if (data.success) {
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('adminPanel').style.display = 'block';
      loadAdminData();
    } else { showToast('Onjuist wachtwoord', 'error'); }
  } catch (err) {
    banner.textContent = '⚠️ Backend wordt opgestart, even geduld...';
    setTimeout(() => adminLogin(), 5000);
  }
}

async function loadAdminData() {
  await Promise.all([loadTeamsAdmin(), loadActivitiesAdmin()]);
  populateSelects();
  document.getElementById('quickDate').value = new Date().toISOString().split('T')[0];
}

// ============ Activities CRUD ============
async function loadActivitiesAdmin() {
  try {
    activitiesData = await (await fetch(`${API_URL}/api/activities`)).json();
    renderActivities();
  } catch (err) { showToast('Fout bij laden activiteiten', 'error'); }
}

function renderActivities() {
  const el = document.getElementById('activitiesList');
  if (!activitiesData.length) {
    el.innerHTML = '<p style="color:#888;font-size:0.85rem;text-align:center;">Nog geen activiteiten. Voeg hieronder een activiteit toe.</p>';
    return;
  }
  el.innerHTML = activitiesData.map(a => `
    <div class="activity-card">
      <div class="activity-card-info">
        <div class="activity-card-emoji">${a.emoji}</div>
        <div>
          <div class="activity-card-name">${a.name}</div>
          <div class="activity-card-steps">+${fmt(a.bonusSteps)} stappen</div>
        </div>
      </div>
      <div>
        <button class="btn btn-secondary btn-sm" onclick="editActivity('${a._id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteActivity('${a._id}', '${a.name}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

async function addActivity() {
  const name = document.getElementById('newActivityName').value.trim();
  const emoji = document.getElementById('newActivityEmoji').value.trim() || '🏃';
  const bonusSteps = parseInt(document.getElementById('newActivitySteps').value) || 0;

  if (!name || bonusSteps <= 0) { showToast('Vul naam en bonusstappen in', 'error'); return; }

  try {
    await fetch(`${API_URL}/api/activities`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, emoji, bonusSteps })
    });
    document.getElementById('newActivityName').value = '';
    document.getElementById('newActivityEmoji').value = '';
    document.getElementById('newActivitySteps').value = '';
    showToast(`Activiteit "${name}" toegevoegd!`);
    loadActivitiesAdmin();
  } catch (err) { showToast('Fout bij toevoegen', 'error'); }
}

async function editActivity(id) {
  const act = activitiesData.find(a => a._id === id);
  if (!act) return;
  const newName = prompt('Activiteit naam:', act.name);
  if (newName === null) return;
  const newEmoji = prompt('Emoji:', act.emoji);
  if (newEmoji === null) return;
  const newSteps = prompt('Bonusstappen:', act.bonusSteps);
  if (newSteps === null) return;

  try {
    await fetch(`${API_URL}/api/activities/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), emoji: newEmoji.trim(), bonusSteps: parseInt(newSteps) || 0 })
    });
    showToast('Activiteit bijgewerkt!');
    loadActivitiesAdmin();
  } catch (err) { showToast('Fout bij bewerken', 'error'); }
}

async function deleteActivity(id, name) {
  if (!confirm(`"${name}" verwijderen?`)) return;
  try {
    await fetch(`${API_URL}/api/activities/${id}`, { method: 'DELETE' });
    showToast(`"${name}" verwijderd`);
    loadActivitiesAdmin();
  } catch (err) { showToast('Fout bij verwijderen', 'error'); }
}

// ============ Teams CRUD ============
async function loadTeamsAdmin() {
  try {
    teamsData = await (await fetch(`${API_URL}/api/teams`)).json();
    renderTeams();
  } catch (err) { showToast('Fout bij laden teams', 'error'); }
}

function renderTeams() {
  const el = document.getElementById('teamsList');
  if (!teamsData.length) {
    el.innerHTML = '<p style="color:#888;text-align:center;padding:1rem 0;">Nog geen teams.</p>';
    return;
  }
  el.innerHTML = teamsData.map(t => `
    <div class="team-card">
      <div class="team-card-header">
        <h4>${t.name}</h4>
        <div>
          <button class="btn btn-secondary btn-sm" onclick="editTeam('${t._id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteTeam('${t._id}', '${t.name}')">🗑️</button>
        </div>
      </div>
      <div>${t.members.map(m => `<span class="member-tag">${m}</span>`).join(' ') || '<span style="color:#888;font-size:0.85rem;">Geen leden</span>'}</div>
    </div>
  `).join('');
}

async function addTeam() {
  const name = document.getElementById('newTeamName').value.trim();
  const membersStr = document.getElementById('newTeamMembers').value.trim();
  if (!name) { showToast('Voer een teamnaam in', 'error'); return; }
  const members = membersStr ? membersStr.split(',').map(m => m.trim()).filter(m => m) : [];

  try {
    await fetch(`${API_URL}/api/teams`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, members })
    });
    document.getElementById('newTeamName').value = '';
    document.getElementById('newTeamMembers').value = '';
    showToast(`Team "${name}" aangemaakt!`);
    loadAdminData();
  } catch (err) { showToast('Fout bij aanmaken', 'error'); }
}

async function editTeam(id) {
  const team = teamsData.find(t => t._id === id);
  if (!team) return;
  const newName = prompt('Teamnaam:', team.name);
  if (newName === null) return;
  const newMembers = prompt('Teamleden (kommagescheiden):', team.members.join(', '));
  if (newMembers === null) return;

  try {
    await fetch(`${API_URL}/api/teams/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), members: newMembers.split(',').map(m => m.trim()).filter(m => m) })
    });
    showToast('Team bijgewerkt!');
    loadAdminData();
  } catch (err) { showToast('Fout bij bewerken', 'error'); }
}

async function deleteTeam(id, name) {
  if (!confirm(`"${name}" verwijderen? Alle invoer wordt ook verwijderd!`)) return;
  try {
    await fetch(`${API_URL}/api/teams/${id}`, { method: 'DELETE' });
    showToast(`"${name}" verwijderd`);
    loadAdminData();
  } catch (err) { showToast('Fout bij verwijderen', 'error'); }
}

// ============ Selects ============
function populateSelects() {
  ['adminTeamSelect', 'quickTeamSelect'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">— Kies team —</option>';
    teamsData.forEach(t => { sel.innerHTML += `<option value="${t._id}">${t.name}</option>`; });
  });
}

function loadAdminMembers() {
  const teamId = document.getElementById('adminTeamSelect').value;
  const sel = document.getElementById('adminMemberSelect');
  sel.innerHTML = '<option value="">— Alle leden —</option>';
  if (teamId) {
    const team = teamsData.find(t => t._id === teamId);
    if (team) team.members.forEach(m => { sel.innerHTML += `<option value="${m}">${m}</option>`; });
  }
  loadAdminEntries();
}

function loadQuickMembers() {
  const teamId = document.getElementById('quickTeamSelect').value;
  const sel = document.getElementById('quickMemberSelect');
  sel.innerHTML = '<option value="">— Kies lid —</option>';
  if (teamId) {
    const team = teamsData.find(t => t._id === teamId);
    if (team) team.members.forEach(m => { sel.innerHTML += `<option value="${m}">${m}</option>`; });
  }
}

// ============ Entries Management ============
async function loadAdminEntries() {
  const teamId = document.getElementById('adminTeamSelect').value;
  const memberName = document.getElementById('adminMemberSelect').value;
  const container = document.getElementById('adminEntries');

  if (!teamId) {
    container.innerHTML = '<p style="color:#888;text-align:center;padding:1rem 0;">Selecteer een team.</p>';
    return;
  }

  let url = `${API_URL}/api/entries?teamId=${teamId}`;
  if (memberName) url += `&memberName=${encodeURIComponent(memberName)}`;

  try {
    const entries = await (await fetch(url)).json();
    if (!entries.length) {
      container.innerHTML = '<p style="color:#888;text-align:center;padding:1rem 0;">Geen invoer gevonden.</p>';
      return;
    }

    container.innerHTML = `<table class="history-table">
      <thead><tr><th>Datum</th><th>Naam</th><th>Stappen</th><th>Bonus</th><th>Mult.</th><th>Totaal</th><th>Acties</th></tr></thead>
      <tbody>${entries.map(e => {
        const bonus = e.activities.reduce((s, a) => s + a.bonusSteps, 0);
        let mult = 1;
        if (e.withColleagues) mult *= 1.5;
        if (e.photoShared) mult *= 1.25;
        const total = Math.round((e.steps + bonus) * mult);
        const [y, m, d] = e.date.split('-');
        let multTags = '';
        if (e.withColleagues) multTags += '👥';
        if (e.photoShared) multTags += '📸';
        return `<tr>
          <td>${d}-${m}-${y}</td>
          <td>${e.memberName}</td>
          <td>${fmt(e.steps)}</td>
          <td>${bonus > 0 ? `+${fmt(bonus)}` : '—'}</td>
          <td>${multTags || '—'}</td>
          <td style="font-weight:700;color:#2A6085;">${fmt(total)}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="openEditEntry('${e._id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteEntry('${e._id}')">🗑️</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  } catch (err) { container.innerHTML = '<p style="color:#B0543B;">Fout bij laden invoer.</p>'; }
}

// ============ Edit Entry Modal ============
async function openEditEntry(id) {
  try {
    const entry = await (await fetch(`${API_URL}/api/entries/${id}`)).json();

    document.getElementById('editEntryId').value = entry._id;
    document.getElementById('editDate').value = entry.date;
    document.getElementById('editSteps').value = entry.steps;
    document.getElementById('editWithColleagues').checked = entry.withColleagues || false;
    document.getElementById('editPhotoShared').checked = entry.photoShared || false;

    document.querySelectorAll('#editModal .multiplier-option').forEach(el => {
      el.classList.toggle('active', el.querySelector('input').checked);
    });

    const grid = document.getElementById('editActivitiesGrid');
    grid.innerHTML = activitiesData.map(a => {
      const checked = entry.activities.some(ea => ea.activityId === a._id || ea.name === a.name);
      return `<label class="activity-option ${checked ? 'active' : ''}" onclick="toggleEditAct(this)">
        <input type="checkbox" value="${a._id}" data-bonus="${a.bonusSteps}" data-name="${a.name}" ${checked ? 'checked' : ''}>
        <div>
          <div class="activity-label">${a.emoji} ${a.name}</div>
          <div class="activity-bonus">+${fmt(a.bonusSteps)}</div>
        </div>
      </label>`;
    }).join('');

    document.getElementById('editModal').style.display = 'flex';
  } catch (err) { showToast('Fout bij laden invoer', 'error'); }
}

function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }

function toggleEditAct(el) {
  setTimeout(() => { el.classList.toggle('active', el.querySelector('input').checked); }, 10);
}

function toggleEditMult(el) {
  setTimeout(() => { el.classList.toggle('active', el.querySelector('input').checked); }, 10);
}

async function saveEditEntry() {
  const id = document.getElementById('editEntryId').value;
  const date = document.getElementById('editDate').value;
  let steps = parseInt(document.getElementById('editSteps').value) || 0;
  steps = Math.min(Math.max(steps, 0), 35000);

  const activities = [];
  document.querySelectorAll('#editActivitiesGrid input:checked').forEach(cb => {
    activities.push({ activityId: cb.value, name: cb.dataset.name, bonusSteps: parseInt(cb.dataset.bonus) });
  });

  const withColleagues = document.getElementById('editWithColleagues').checked;
  const photoShared = document.getElementById('editPhotoShared').checked;

  try {
    const res = await fetch(`${API_URL}/api/entries/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, steps, activities, withColleagues, photoShared })
    });
    if (!res.ok) throw new Error();
    showToast('✅ Invoer bijgewerkt!');
    closeEditModal();
    loadAdminEntries();
  } catch (err) { showToast('Fout bij bijwerken', 'error'); }
}

async function deleteEntry(id) {
  if (!confirm('Invoer verwijderen?')) return;
  try {
    await fetch(`${API_URL}/api/entries/${id}`, { method: 'DELETE' });
    showToast('Invoer verwijderd');
    loadAdminEntries();
  } catch (err) { showToast('Fout bij verwijderen', 'error'); }
}

// ============ Quick Submit ============
async function quickSubmit() {
  const teamId = document.getElementById('quickTeamSelect').value;
  const memberName = document.getElementById('quickMemberSelect').value;
  const date = document.getElementById('quickDate').value;
  let steps = parseInt(document.getElementById('quickSteps').value) || 0;

  if (!teamId || !memberName || !date) { showToast('Vul alle velden in', 'error'); return; }
  if (steps > 35000) { showToast('Maximaal 35.000 stappen per dag', 'error'); return; }
  steps = Math.min(Math.max(steps, 0), 35000);

  try {
    await fetch(`${API_URL}/api/entries`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, memberName, date, steps, activities: [], withColleagues: false, photoShared: false })
    });
    showToast(`✅ ${fmt(steps)} stappen opgeslagen voor ${memberName}`);
    document.getElementById('quickSteps').value = '';
    loadAdminEntries();
  } catch (err) { showToast('Fout bij opslaan', 'error'); }
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeEditModal();
});

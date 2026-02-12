let teamsData = [];
let activitiesData = [];

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function fmt(n) { return n.toLocaleString('nl-NL'); }

// ============ Init with retry ============
async function init() {
  const banner = document.getElementById('loadingBanner');
  banner.classList.add('show');

  try {
    await Promise.all([loadTeams(), loadActivities()]);
    banner.classList.remove('show');
  } catch (err) {
    banner.textContent = '⚠️ Backend wordt opgestart, even geduld...';
    setTimeout(init, 5000);
  }

  document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
  updatePreview();
}

// ============ Load Teams ============
async function loadTeams() {
  teamsData = await (await fetch(`${API_URL}/api/teams`)).json();
  const sel = document.getElementById('teamSelect');
  sel.innerHTML = '<option value="">— Kies je team —</option>';
  teamsData.forEach(t => { sel.innerHTML += `<option value="${t._id}">${t.name}</option>`; });
}

function loadMembers() {
  const teamId = document.getElementById('teamSelect').value;
  const sel = document.getElementById('memberSelect');
  if (!teamId) { sel.innerHTML = '<option value="">— Kies eerst een team —</option>'; return; }
  const team = teamsData.find(t => t._id === teamId);
  sel.innerHTML = '<option value="">— Kies je naam —</option>';
  team.members.forEach(m => { sel.innerHTML += `<option value="${m}">${m}</option>`; });
  sel.onchange = () => loadRecentEntries();
}

// ============ Load Activities ============
async function loadActivities() {
  activitiesData = await (await fetch(`${API_URL}/api/activities`)).json();
  const grid = document.getElementById('activitiesGrid');

  if (!activitiesData.length) {
    grid.innerHTML = '<p style="color:#888;font-size:0.85rem;">Nog geen activiteiten. Admin kan deze toevoegen.</p>';
    return;
  }

  grid.innerHTML = activitiesData.map(a => `
    <label class="activity-option" onclick="toggleActivity(this)">
      <input type="checkbox" value="${a._id}" data-bonus="${a.bonusSteps}" data-name="${a.name}" onchange="updatePreview()">
      <div>
        <div class="activity-label">${a.emoji} ${a.name}</div>
        <div class="activity-bonus">+${fmt(a.bonusSteps)} stappen</div>
      </div>
    </label>
  `).join('');
}

// ============ Toggles ============
function toggleActivity(el) {
  setTimeout(() => { el.classList.toggle('active', el.querySelector('input').checked); updatePreview(); }, 10);
}

function toggleMultiplier(el) {
  setTimeout(() => { el.classList.toggle('active', el.querySelector('input').checked); updatePreview(); }, 10);
}

// ============ Live Preview ============
function updatePreview() {
  let steps = parseInt(document.getElementById('stepsInput').value) || 0;
  steps = Math.min(Math.max(steps, 0), 35000);

  let bonus = 0;
  document.querySelectorAll('#activitiesGrid input:checked').forEach(cb => {
    bonus += parseInt(cb.dataset.bonus) || 0;
  });

  let mult = 1;
  if (document.getElementById('withColleagues').checked) mult *= 1.5;
  if (document.getElementById('photoShared').checked) mult *= 1.25;

  const base = steps + bonus;
  const total = Math.round(base * mult);

  document.getElementById('previewTotal').textContent = fmt(total);

  let breakdown = `${fmt(steps)} stappen`;
  if (bonus > 0) breakdown += ` + ${fmt(bonus)} bonus`;
  if (mult > 1) breakdown += ` × ${mult % 1 === 0 ? mult : mult.toFixed(3).replace(/0+$/, '')}`;
  document.getElementById('previewBreakdown').textContent = breakdown;
}

// ============ Submit ============
async function submitEntry() {
  const teamId = document.getElementById('teamSelect').value;
  const memberName = document.getElementById('memberSelect').value;
  const date = document.getElementById('dateInput').value;
  let steps = parseInt(document.getElementById('stepsInput').value) || 0;

  if (!teamId || !memberName || !date) { showToast('Vul alle velden in (team, naam, datum)', 'error'); return; }
  if (steps > 35000) { showToast('Maximaal 35.000 stappen per dag', 'error'); return; }
  steps = Math.min(Math.max(steps, 0), 35000);

  const activities = [];
  document.querySelectorAll('#activitiesGrid input:checked').forEach(cb => {
    activities.push({ activityId: cb.value, name: cb.dataset.name, bonusSteps: parseInt(cb.dataset.bonus) });
  });

  const withColleagues = document.getElementById('withColleagues').checked;
  const photoShared = document.getElementById('photoShared').checked;

  try {
    const res = await fetch(`${API_URL}/api/entries`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, memberName, date, steps, activities, withColleagues, photoShared })
    });
    if (!res.ok) throw new Error();

    const bonus = activities.reduce((s, a) => s + a.bonusSteps, 0);
    let mult = 1;
    if (withColleagues) mult *= 1.5;
    if (photoShared) mult *= 1.25;
    const total = Math.round((steps + bonus) * mult);

    showToast(`✅ Opgeslagen! ${fmt(total)} stappen`);

    document.getElementById('stepsInput').value = '';
    document.querySelectorAll('#activitiesGrid input:checked').forEach(cb => {
      cb.checked = false; cb.closest('.activity-option').classList.remove('active');
    });
    document.getElementById('withColleagues').checked = false;
    document.getElementById('photoShared').checked = false;
    document.querySelectorAll('.multiplier-option').forEach(el => el.classList.remove('active'));
    updatePreview();
    loadRecentEntries();
  } catch (err) { showToast('Fout bij opslaan. Probeer opnieuw.', 'error'); }
}

// ============ Recent Entries ============
async function loadRecentEntries() {
  const teamId = document.getElementById('teamSelect').value;
  const memberName = document.getElementById('memberSelect').value;
  const container = document.getElementById('recentEntries');

  if (!teamId || !memberName) {
    container.innerHTML = '<p style="color:#888;text-align:center;padding:1rem 0;">Selecteer een team en persoon.</p>';
    return;
  }

  try {
    const entries = await (await fetch(`${API_URL}/api/entries?teamId=${teamId}&memberName=${encodeURIComponent(memberName)}`)).json();

    if (!entries.length) {
      container.innerHTML = '<p style="color:#888;text-align:center;padding:1rem 0;">Nog geen invoer voor deze persoon.</p>';
      return;
    }

    container.innerHTML = `<table class="history-table">
      <thead><tr><th>Datum</th><th>Stappen</th><th>Bonus</th><th>Mult.</th><th>Totaal</th></tr></thead>
      <tbody>${entries.slice(0, 10).map(e => {
        const bonus = e.activities.reduce((s, a) => s + a.bonusSteps, 0);
        const acts = e.activities.map(a => a.name).join(', ');
        let mult = 1;
        if (e.withColleagues) mult *= 1.5;
        if (e.photoShared) mult *= 1.25;
        const total = Math.round((e.steps + bonus) * mult);
        const [y, m, d] = e.date.split('-');
        let multTags = '';
        if (e.withColleagues) multTags += '<span class="multiplier-tag">👥 ×1.5</span>';
        if (e.photoShared) multTags += '<span class="multiplier-tag">📸 ×1.25</span>';
        return `<tr>
          <td>${d}-${m}-${y}</td>
          <td>${fmt(e.steps)}</td>
          <td>${bonus > 0 ? `+${fmt(bonus)} (${acts})` : '—'}</td>
          <td>${multTags || '—'}</td>
          <td style="font-weight:700;color:#2A6085;">${fmt(total)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  } catch (err) { container.innerHTML = '<p style="color:#B0543B;">Fout bij laden recente invoer.</p>'; }
}

document.addEventListener('DOMContentLoaded', init);

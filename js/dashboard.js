const TEAM_COLORS = ['#2A6085', '#B0543B', '#E0A943', '#BFD4DA', '#1D1D1B'];
let teamColorMap = {};

function fmt(n) { return n.toLocaleString('nl-NL'); }
function color(name) { return teamColorMap[name] || '#888'; }

async function loadDashboard() {
  const banner = document.getElementById('loadingBanner');
  banner.classList.add('show');

  try {
    const teamsRaw = await (await fetch(`${API_URL}/api/teams`)).json();
    teamsRaw.forEach((t, i) => { teamColorMap[t.name] = TEAM_COLORS[i % TEAM_COLORS.length]; });
    await Promise.all([loadProgress(), loadTeamStats(), loadTimeline()]);
    banner.classList.remove('show');
  } catch (err) {
    console.error('Dashboard error:', err);
    banner.textContent = '⚠️ Backend wordt opgestart, even geduld...';
    setTimeout(loadDashboard, 5000);
  }
}

async function loadProgress() {
  const data = await (await fetch(`${API_URL}/api/stats/total`)).json();
  const { totalSteps: total, goal } = data;
  const pct = Math.min((total / goal) * 100, 100);
  const remaining = Math.max(goal - total, 0);

  document.getElementById('totalSteps').innerHTML = `${fmt(total)} <span>/ ${fmt(goal)}</span>`;
  document.getElementById('progressBar').style.width = `${Math.max(pct, 2)}%`;
  document.getElementById('progressText').textContent = `${pct.toFixed(1)}%`;

  const sub = document.getElementById('progressSubtitle');
  if (total >= goal) {
    sub.textContent = '🎉 DOEL BEREIKT! Geweldig team!';
    sub.style.color = '#2A6085';
    sub.style.fontWeight = '700';
  } else {
    sub.textContent = `Nog ${fmt(remaining)} stappen te gaan!`;
  }
}

let barChart = null;

async function loadTeamStats() {
  const teams = await (await fetch(`${API_URL}/api/stats/teams`)).json();
  const lb = document.getElementById('teamLeaderboard');

  if (!teams.length) {
    lb.innerHTML = '<p style="color:#888;text-align:center;padding:2rem 0;">Nog geen teams aangemaakt.</p>';
    return;
  }

  lb.innerHTML = teams.map((t, i) => {
    const rc = i < 3 ? `rank-${i+1}` : 'rank-other';
    const top = t.members[0];
    const detail = top ? `Top: ${top.name} (${fmt(top.totalSteps)})` : '';
    return `<div class="leaderboard-item">
      <div class="leaderboard-rank ${rc}">${i+1}</div>
      <div class="leaderboard-info">
        <div class="leaderboard-name">${t.teamName}</div>
        <div class="leaderboard-detail">${detail}</div>
      </div>
      <div class="leaderboard-steps">${fmt(t.totalSteps)}</div>
    </div>`;
  }).join('');

  // Individual top 10
  const all = [];
  teams.forEach(t => t.members.forEach(m => all.push({ ...m, teamName: t.teamName })));
  all.sort((a, b) => b.totalSteps - a.totalSteps);

  const indiv = document.getElementById('individualLeaderboard');
  const top10 = all.slice(0, 10);
  if (!top10.length) {
    indiv.innerHTML = '<p style="color:#888;text-align:center;padding:2rem 0;">Nog geen stappen ingevoerd.</p>';
  } else {
    indiv.innerHTML = top10.map((m, i) => {
      const rc = i < 3 ? `rank-${i+1}` : 'rank-other';
      return `<div class="leaderboard-item">
        <div class="leaderboard-rank ${rc}">${i+1}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${m.name}</div>
          <div class="leaderboard-detail">${m.teamName}</div>
        </div>
        <div class="leaderboard-steps">${fmt(m.totalSteps)}</div>
      </div>`;
    }).join('');
  }

  const ctx = document.getElementById('barChart').getContext('2d');
  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: teams.map(t => t.teamName),
      datasets: [{
        label: 'Totaal stappen',
        data: teams.map(t => t.totalSteps),
        backgroundColor: teams.map(t => color(t.teamName)),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => `${fmt(c.parsed.y)} stappen` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => fmt(v), font: { family: 'Roboto' } }, grid: { color: '#f0f0f0' } },
        x: { ticks: { font: { family: 'Roboto', weight: '500' } }, grid: { display: false } }
      }
    }
  });
}

let lineChart = null;

async function loadTimeline() {
  const timeline = await (await fetch(`${API_URL}/api/stats/timeline`)).json();
  const names = Object.keys(timeline);
  if (!names.length) return;

  const allDates = new Set();
  names.forEach(n => timeline[n].forEach(d => allDates.add(d.date)));
  const sorted = Array.from(allDates).sort();
  if (!sorted.length) return;

  const datasets = names.map(name => {
    const map = {};
    timeline[name].forEach(d => { map[d.date] = d.cumulative; });
    let last = 0;
    const data = sorted.map(date => { if (map[date] !== undefined) last = map[date]; return last; });
    return {
      label: name, data,
      borderColor: color(name),
      backgroundColor: color(name) + '20',
      tension: 0.3, fill: false, pointRadius: 3, borderWidth: 2.5
    };
  });

  const ctx = document.getElementById('lineChart').getContext('2d');
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sorted.map(d => { const p = d.split('-'); return `${p[2]}-${p[1]}`; }),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'Roboto', weight: '500' }, usePointStyle: true } },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt(c.parsed.y)}` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => fmt(v), font: { family: 'Roboto' } }, grid: { color: '#f0f0f0' } },
        x: { ticks: { font: { family: 'Roboto' }, maxRotation: 45 }, grid: { display: false } }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', loadDashboard);
setInterval(loadDashboard, 30000);

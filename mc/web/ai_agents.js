// ============================================================
// TENMON-MC Phase 4: AI Agent Activity Viewer
// ============================================================

async function render() {
  const agentFilter = document.getElementById('agent-filter').value;
  const actionFilter = document.getElementById('action-filter').value;
  const priorityFilter = document.getElementById('priority-filter').value;

  try {
    // agent_activities.json を取得
    const activities = await fetch('./data/agent_activities.json?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .catch(() => []);

    // snapshot.json から最終更新時刻を取得
    const snapshot = await fetch('./data/snapshot.json?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);

    if (snapshot) {
      const ageMin = Math.floor((Date.now() - new Date(snapshot.generated_at_utc).getTime()) / 60000);
      document.getElementById('last-updated').textContent =
        'Last: ' + snapshot.generated_at_jst + ' (' + ageMin + 'min ago)';
    }

    // フィルタリング
    const filtered = activities.filter(a =>
      (!agentFilter || a.agent_name === agentFilter) &&
      (!actionFilter || a.action_type === actionFilter) &&
      (!priorityFilter || a.priority === priorityFilter)
    );

    // 件数表示
    document.getElementById('result-count').textContent =
      filtered.length + ' / ' + activities.length + ' entries';

    // レンダリング
    if (filtered.length === 0) {
      document.getElementById('activity-list').innerHTML =
        '<p style="color:#666; text-align:center; padding:40px;">No activities found.</p>';
      return;
    }

    const html = filtered.map(a => {
      const ack = a.acknowledged_by_owner ? ' acknowledged' : '';
      const refLink = a.reference_url
        ? '<a href="' + escapeHtml(a.reference_url) + '" target="_blank" rel="noopener">Ref</a>'
        : '';

      return '<article class="activity-item priority-' + escapeHtml(a.priority || 'medium') + ack + '">' +
        '<header>' +
          '<span class="agent-badge agent-' + escapeHtml(a.agent_name || '') + '">' + escapeHtml(a.agent_name || 'unknown') + '</span>' +
          '<span class="action-type">' + escapeHtml(a.action_type || '') + '</span>' +
          '<span class="priority-badge">' + escapeHtml(a.priority || 'medium') + '</span>' +
          '<time>' + escapeHtml(a.timestamp || '') + '</time>' +
          (refLink ? '<span class="ref-link">' + refLink + '</span>' : '') +
        '</header>' +
        '<h3>' + escapeHtml(a.title || 'Untitled') + '</h3>' +
        '<p>' + escapeHtml(a.content || '') + '</p>' +
        (a.target_area ? '<small>Target: ' + escapeHtml(a.target_area) + '</small>' : '') +
        (a.agent_version ? '<small class="version">v' + escapeHtml(a.agent_version) + '</small>' : '') +
      '</article>';
    }).join('');

    document.getElementById('activity-list').innerHTML = html;

  } catch (e) {
    document.getElementById('activity-list').innerHTML =
      '<p style="color:#c96a6a; text-align:center; padding:40px;">Error: ' + escapeHtml(e.message) + '</p>';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

render();
setInterval(render, 30000);

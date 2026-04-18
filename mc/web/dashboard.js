// TENMON-MC Phase 3 Dashboard
// データ取得と Chart.js レンダリング

async function fetchJSON(path) {
  const res = await fetch(path + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchText(path) {
  const res = await fetch(path + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// 時系列JSONをChart.js形式に変換
function aggregateMetric(timeseriesData, section, metricKey) {
  const points = timeseriesData
    .filter(d => d.section === section && d.metric_key === metricKey)
    .map(d => ({ 
      x: new Date(d.timestamp),
      y: parseFloat(d.metric_value) || 0 
    }));
  return points;
}

function buildLineChart(canvasId, label, color, dataPoints) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: label,
        data: dataPoints,
        borderColor: color,
        backgroundColor: color + '33',
        tension: 0.2,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'time', time: { unit: 'hour' }, grid: { color: '#333' }, ticks: { color: '#999' } },
        y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#999' } }
      },
      plugins: {
        legend: { labels: { color: '#c9a14a' } }
      }
    }
  });
}

function buildBarChart(canvasId, label, labels, values, color) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: label, data: values, backgroundColor: color }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: '#333' }, ticks: { color: '#999' } },
        y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#999' } }
      },
      plugins: {
        legend: { labels: { color: '#c9a14a' } }
      }
    }
  });
}

async function render() {
  try {
    const snapshot = await fetchJSON('./data/snapshot.json');
    const timeseries = await fetchJSON('./data/timeseries/last_7days.json').catch(() => []);
    const report = await fetchText('./data/report.txt');

    // Stat カード
    document.querySelector('#stat-users .num').textContent = 
      snapshot.sections.founder.total_users || '-';
    document.querySelector('#stat-active .num').textContent = 
      snapshot.sections.founder.active_last_7days || '-';
    document.querySelector('#stat-kantei .num').textContent = 
      snapshot.sections.founder.total_kantei || '-';
    document.querySelector('#stat-uptime .num').textContent = 
      (snapshot.sections.infra.uptime || 'unknown').replace('up ', '');
    document.querySelector('#stat-errors .num').textContent = 
      snapshot.sections.infra.error_count_24h || '0';

    // Alerts (report.txt から抽出)
    const alertMatch = report.match(/ALERTS.*?└/s);
    const alertLines = alertMatch ? (alertMatch[0].match(/\[(CRIT|HIGH|MED|LOW)\]/g) || []).length : 0;
    document.querySelector('#stat-alerts .num').textContent = alertLines;

    // チャート（既存のChart.jsインスタンスを破棄してから再描画）
    Chart.helpers.each(Chart.instances, (instance) => { instance.destroy(); });

    if (timeseries.length > 0) {
      buildLineChart('chart-users', 'Total Users', '#c9a14a', 
        aggregateMetric(timeseries, 'founder', 'total_users'));
      buildLineChart('chart-active', 'Active Users', '#4a9b4a',
        aggregateMetric(timeseries, 'founder', 'active_last_7days'));
      buildLineChart('chart-kantei', 'Kantei Count', '#d4a853',
        aggregateMetric(timeseries, 'founder', 'total_kantei'));
      buildLineChart('chart-synapse', 'Synapse Log', '#9b6fc9',
        aggregateMetric(timeseries, 'learning', 'synapse_log_24h'));
      buildLineChart('chart-learning', 'Growth Events', '#6fc9a1',
        aggregateMetric(timeseries, 'learning', 'growth_ledger_24h'));
      buildLineChart('chart-errors', 'Error Count', '#c96a6a',
        aggregateMetric(timeseries, 'infra', 'error_count_24h'));
    }

    // §13-16: 新指標 Stat カード
    const dq = snapshot.sections.dialogue_quality || {};
    document.querySelector('#stat-satori .num').textContent = 
      (dq.satori_avg_score_pct || '0') + '%';
    document.querySelector('#stat-omega .num').textContent = 
      dq.satori_omega_compliant_24h || '0';
    document.querySelector('#stat-khs .num').textContent = 
      dq.khs_core_applied_24h || '0';
    document.querySelector('#stat-hisho .num').textContent = 
      dq.kotodama_hisho_hits_24h || '0';

    // §13-16: 新指標チャート
    if (timeseries.length > 0) {
      buildLineChart('chart-khs', 'KHS Applied', '#d4a853',
        aggregateMetric(timeseries, 'dialogue_quality', 'khs_core_applied_24h'));
      buildLineChart('chart-axes', 'Truth Axes', '#9b6fc9',
        aggregateMetric(timeseries, 'dialogue_quality', 'truth_axes_unique_24h'));
      buildLineChart('chart-memory', 'Memory Proj', '#6fc9a1',
        aggregateMetric(timeseries, 'dialogue_quality', 'memory_projection_24h'));
      buildLineChart('chart-satori', 'SATORI %', '#c96a6a',
        aggregateMetric(timeseries, 'dialogue_quality', 'satori_avg_score_pct'));
    }

    // 宿分布バーチャート
    const shukuDist = snapshot.sections.founder.shuku_distribution || {};
    const shukuLabels = Object.keys(shukuDist).map(s => s + '宿');
    const shukuValues = Object.values(shukuDist);
    if (shukuLabels.length > 0) {
      buildBarChart('chart-shuku', 'Users per Shuku', shukuLabels, shukuValues, '#c9a14a');
    }

    // テキストレポート
    document.getElementById('report').textContent = report;

    // 最終更新
    const ageMin = Math.floor((Date.now() - new Date(snapshot.generated_at_utc).getTime()) / 60000);
    document.getElementById('last-updated').textContent = 
      `Last: ${snapshot.generated_at_jst} (${ageMin}min ago)`;

  } catch (e) {
    document.getElementById('report').textContent = 'Error: ' + e.message;
  }
}

render();
setInterval(render, 60000);

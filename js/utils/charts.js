// ============================================================
// charts.js — Motor de gráficos SVG ligero (sin dependencias)
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

window.Charts = (() => {

  const COLORS = [
    '#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa',
    '#34d399', '#fb923c', '#f87171', '#38bdf8', '#c084fc',
  ];

  function _color(i) {
    return COLORS[i % COLORS.length];
  }

  // ---- Bar Chart ----

  function barChart(data, options = {}) {
    const {
      width = 500,
      height = 260,
      barColor = null,
      showValues = true,
      label = '',
    } = options;

    if (!data || data.length === 0) {
      return `<div class="chart-empty">Sin datos para mostrar</div>`;
    }

    const padding = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barW = Math.min(40, (chartW / data.length) * 0.6);
    const gap = (chartW - barW * data.length) / (data.length + 1);

    let svg = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      const val = Math.round(maxVal - (maxVal / 4) * i);
      svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>`;
      svg += `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" class="chart-label">${val}</text>`;
    }

    // Bars
    data.forEach((d, i) => {
      const x = padding.left + gap + i * (barW + gap);
      const barH = (d.value / maxVal) * chartH;
      const y = padding.top + chartH - barH;
      const color = barColor || _color(i);

      svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${color}" class="chart-bar">
        <animate attributeName="height" from="0" to="${barH}" dur="0.6s" fill="freeze"/>
        <animate attributeName="y" from="${padding.top + chartH}" to="${y}" dur="0.6s" fill="freeze"/>
      </rect>`;

      if (showValues) {
        svg += `<text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" class="chart-value">${d.value}</text>`;
      }

      // Label
      svg += `<text x="${x + barW / 2}" y="${height - padding.bottom + 18}" text-anchor="middle" class="chart-label" transform="rotate(-30 ${x + barW / 2} ${height - padding.bottom + 18})">${d.label}</text>`;
    });

    if (label) {
      svg += `<text x="${width / 2}" y="${height - 4}" text-anchor="middle" class="chart-title">${label}</text>`;
    }

    svg += '</svg>';
    return `<div class="chart-container">${svg}</div>`;
  }

  // ---- Donut Chart ----

  function donutChart(data, options = {}) {
    const {
      size = 220,
      thickness = 35,
      showLegend = true,
      centerText = '',
      centerSubText = '',
    } = options;

    if (!data || data.length === 0 || data.every(d => d.value === 0)) {
      return `<div class="chart-empty">Sin datos para mostrar</div>`;
    }

    const cx = size / 2;
    const cy = size / 2;
    const radius = (size - thickness) / 2 - 5;
    const total = data.reduce((s, d) => s + d.value, 0);

    let svg = `<svg class="chart-svg" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;

    let startAngle = -90;
    data.forEach((d, i) => {
      if (d.value === 0) return;
      const pct = d.value / total;
      const angle = pct * 360;
      const endAngle = startAngle + angle;
      const largeArc = angle > 180 ? 1 : 0;

      const x1 = cx + radius * Math.cos((startAngle * Math.PI) / 180);
      const y1 = cy + radius * Math.sin((startAngle * Math.PI) / 180);
      const x2 = cx + radius * Math.cos((endAngle * Math.PI) / 180);
      const y2 = cy + radius * Math.sin((endAngle * Math.PI) / 180);

      svg += `<path d="M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}"
        fill="none" stroke="${_color(i)}" stroke-width="${thickness}" stroke-linecap="round"
        class="chart-arc" style="--delay: ${i * 0.15}s"/>`;

      startAngle = endAngle;
    });

    // Center text
    if (centerText) {
      svg += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" class="chart-center-text">${centerText}</text>`;
    }
    if (centerSubText) {
      svg += `<text x="${cx}" y="${cy + 16}" text-anchor="middle" class="chart-center-sub">${centerSubText}</text>`;
    }

    svg += '</svg>';

    let legend = '';
    if (showLegend) {
      legend = '<div class="chart-legend">';
      data.forEach((d, i) => {
        if (d.value === 0) return;
        const pct = ((d.value / total) * 100).toFixed(1);
        legend += `<div class="chart-legend-item">
          <span class="chart-legend-dot" style="background:${_color(i)}"></span>
          <span class="chart-legend-label">${d.label}</span>
          <span class="chart-legend-value">${d.value} (${pct}%)</span>
        </div>`;
      });
      legend += '</div>';
    }

    return `<div class="chart-container chart-donut-wrap">${svg}${legend}</div>`;
  }

  // ---- Line Chart ----

  function lineChart(data, options = {}) {
    const {
      width = 500,
      height = 220,
      lineColor = '#4ade80',
      fillGradient = true,
      showDots = true,
      label = '',
    } = options;

    if (!data || data.length === 0) {
      return `<div class="chart-empty">Sin datos para mostrar</div>`;
    }

    const padding = { top: 20, right: 20, bottom: 40, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const stepX = chartW / Math.max(data.length - 1, 1);

    let points = [];
    data.forEach((d, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartH - (d.value / maxVal) * chartH;
      points.push({ x, y, ...d });
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    let svg = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

    // Gradient fill
    if (fillGradient) {
      svg += `<defs><linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.01"/>
      </linearGradient></defs>`;
      const fillD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;
      svg += `<path d="${fillD}" fill="url(#lineGrad)"/>`;
    }

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      const val = Math.round(maxVal - (maxVal / 4) * i);
      svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.07)"/>`;
      svg += `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" class="chart-label">${val}</text>`;
    }

    // Line
    svg += `<path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="chart-line"/>`;

    // Dots + Labels
    points.forEach((p, i) => {
      if (showDots) {
        svg += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${lineColor}" stroke="#1a1b26" stroke-width="2" class="chart-dot"/>`;
      }
      if (data.length <= 15) {
        svg += `<text x="${p.x}" y="${height - padding.bottom + 16}" text-anchor="middle" class="chart-label">${p.label}</text>`;
      }
    });

    if (label) {
      svg += `<text x="${width / 2}" y="${height - 2}" text-anchor="middle" class="chart-title">${label}</text>`;
    }

    svg += '</svg>';
    return `<div class="chart-container">${svg}</div>`;
  }

  // ---- Mini stat number ----

  function statCard(value, label, icon, color = '#4ade80') {
    return `<div class="stat-card" style="--accent:${color}">
      <div class="stat-icon">${icon}</div>
      <div class="stat-info">
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    </div>`;
  }

  return { barChart, donutChart, lineChart, statCard, COLORS };
})();

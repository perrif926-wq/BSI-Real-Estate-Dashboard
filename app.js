const STORAGE_KEY = 'real-estate-portfolio-v2';
const API_URL = window.__REAL_ESTATE_API_URL__ || '';

const sampleProperties = [
  {
    id: crypto.randomUUID(),
    property_name: 'Riverfront Loft',
    address: '120 Main St',
    property_type: 'Residential',
    purchase_price: 320000,
    monthly_rent: 2800,
    annual_expenses: 16800,
    occupancy_rate: 95,
    acquisition_date: '2021-06-09',
    notes: 'Stable tenant with renewals in progress.'
  },
  {
    id: crypto.randomUUID(),
    property_name: 'Harbor Retail',
    address: '45 Harbor Ave',
    property_type: 'Commercial',
    purchase_price: 610000,
    monthly_rent: 4200,
    annual_expenses: 24400,
    occupancy_rate: 88,
    acquisition_date: '2019-04-12',
    notes: 'Strong foot traffic with one lease renewal pending.'
  }
];

let properties = [];
let selectedPropertyId = null;
let editingId = null;
let filters = { search: '', type: 'all', occupancy: 'all' };

const form = document.getElementById('propertyForm');
const metricsGrid = document.getElementById('metricsGrid');
const tableBody = document.getElementById('propertiesTableBody');
const detailPanel = document.getElementById('detailPanel');
const csvInput = document.getElementById('csvImport');
const exportButton = document.getElementById('exportCsv');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const occupancyFilter = document.getElementById('occupancyFilter');
const resetFiltersButton = document.getElementById('resetFilters');
const clearFormButton = document.getElementById('clearFormButton');
const rentChart = document.getElementById('rentChart');
const occupancyChart = document.getElementById('occupancyChart');
const brandLogo = document.getElementById('brandLogo');
const logoUpload = document.getElementById('logoUpload');
const changeLogoBtn = document.getElementById('changeLogo');
const resetLogoBtn = document.getElementById('resetLogo');
const propertyPhotoUpload = document.getElementById('propertyPhotoUpload');
const CONFIG_LOGO = window.__REAL_ESTATE_LOGO_URL__ || 'logo.svg';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(0)}%`;
}

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/__+/g, '_')
    .trim();
}

function coerceNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[$,]/g, '').trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePropertyRow(row) {
  const propertyType = String(row.property_type || row.type || 'Residential').trim() || 'Residential';
  return {
    id: row.id || crypto.randomUUID(),
    property_name: String(row.property_name || row.name || '').trim(),
    address: String(row.address || row.location || '').trim(),
    property_type: propertyType,
    purchase_price: coerceNumber(row.purchase_price || row.purchaseprice || row.price || row.cost),
    monthly_rent: coerceNumber(row.monthly_rent || row.rent || row.monthlyrent),
    mortgage_balance: coerceNumber(row.mortgage_balance || row.mortgagebalance || row.loan_balance || row.loanbalance),
    monthly_mortgage_payment: coerceNumber(row.monthly_mortgage_payment || row.monthlymortgagepayment || row.mortgage_payment || row.mortgagepayment),
    annual_expenses: coerceNumber(row.annual_expenses || row.expenses || row.annualexpenses),
    occupancy_rate: coerceNumber(row.occupancy_rate || row.occupancy || row.occupancypercent),
    acquisition_date: String(row.acquisition_date || row.acquisitiondate || row.purchase_date || '').trim(),
    notes: String(row.notes || row.comment || '').trim(),
    photos: row.photos || [],
    tasks: row.tasks || []
  };
}

function parseCsvText(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    current.push(field);
    field = '';
  };

  const pushRow = () => {
    if (current.some((value) => value !== '')) {
      rows.push(current);
    }
    current = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      pushField();
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      pushField();
      pushRow();
    } else {
      field += char;
    }
  }

  if (field !== '' || current.length) {
    pushField();
    pushRow();
  }

  return rows;
}

async function loadProperties() {
  if (API_URL) {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Cloud sync unavailable, using local data.', error);
    }
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return sampleProperties.map(p => ({ ...p, photos: p.photos || [], tasks: p.tasks || [] }));
  try {
    const parsed = JSON.parse(stored);
    return (Array.isArray(parsed) ? parsed : []).map(p => ({ ...p, photos: p.photos || [], tasks: p.tasks || [] }));
  } catch {
    return sampleProperties.map(p => ({ ...p, photos: p.photos || [], tasks: p.tasks || [] }));
  }
}

async function saveProperties() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));

  if (API_URL) {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(properties)
      });
    } catch (error) {
      console.warn('Cloud sync failed.', error);
    }
  }
}

function addPhotosToProperty(propertyId, dataUrls) {
  properties = properties.map((p) => {
    if (p.id !== propertyId) return p;
    const existing = Array.isArray(p.photos) ? p.photos.slice() : [];
    const merged = existing.concat(dataUrls);
    return { ...p, photos: merged };
  });
  saveProperties();
  render();
}

function removePhotoFromProperty(propertyId, index) {
  properties = properties.map((p) => {
    if (p.id !== propertyId) return p;
    const copy = Array.isArray(p.photos) ? p.photos.slice() : [];
    copy.splice(index, 1);
    return { ...p, photos: copy };
  });
  saveProperties();
  render();
}

function addTaskToProperty(propertyId, task) {
  properties = properties.map((p) => {
    if (p.id !== propertyId) return p;
    const existing = Array.isArray(p.tasks) ? p.tasks.slice() : [];
    existing.unshift(task);
    return { ...p, tasks: existing };
  });
  saveProperties();
  render();
}

function toggleTaskCompleted(propertyId, taskId) {
  properties = properties.map((p) => {
    if (p.id !== propertyId) return p;
    const tasks = (p.tasks || []).map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    return { ...p, tasks };
  });
  saveProperties();
  render();
}

function deleteTask(propertyId, taskId) {
  properties = properties.map((p) => {
    if (p.id !== propertyId) return p;
    const tasks = (p.tasks || []).filter(t => t.id !== taskId);
    return { ...p, tasks };
  });
  saveProperties();
  render();
}

function getFilteredProperties() {
  return properties.filter((item) => {
    const searchMatch = `${item.property_name} ${item.address}`.toLowerCase().includes(filters.search.toLowerCase());
    const typeMatch = filters.type === 'all' || item.property_type === filters.type;
    const occupancyMatch = filters.occupancy === 'all' || Number(item.occupancy_rate || 0) >= Number(filters.occupancy);
    return searchMatch && typeMatch && occupancyMatch;
  });
}

function calculateMetrics() {
  const totalMonthlyRent = properties.reduce((acc, item) => acc + Number(item.monthly_rent || 0), 0);
  const totalAnnualExpenses = properties.reduce((acc, item) => acc + Number(item.annual_expenses || 0), 0);
  const annualRent = totalMonthlyRent * 12;
  const noi = annualRent - totalAnnualExpenses;
  const avgOccupancy = properties.length ? properties.reduce((acc, item) => acc + Number(item.occupancy_rate || 0), 0) / properties.length : 0;
  return {
    propertyCount: properties.length,
    monthlyRent: totalMonthlyRent,
    annualRent,
    noi,
    avgOccupancy
  };
}

function renderMetrics() {
  const metrics = calculateMetrics();
  metricsGrid.innerHTML = `
    <article class="metric-card">
      <h3>Properties</h3>
      <div class="value">${metrics.propertyCount}</div>
    </article>
    <article class="metric-card">
      <h3>Total monthly rent</h3>
      <div class="value">${formatCurrency(metrics.monthlyRent)}</div>
    </article>
    <article class="metric-card">
      <h3>Estimated annual NOI</h3>
      <div class="value">${formatCurrency(metrics.noi)}</div>
    </article>
    <article class="metric-card">
      <h3>Average occupancy</h3>
      <div class="value">${formatPercent(metrics.avgOccupancy)}</div>
    </article>
  `;
}

function renderChart(svg, values, color) {
  svg.innerHTML = '';
  const width = 320;
  const height = 180;
  const padding = 24;
  const maxValue = Math.max(...values.map((item) => item.value), 1);
  const gap = 12;
  const barWidth = (width - padding * 2 - gap * (values.length - 1)) / values.length;

  const defs = `<defs><linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#052a5b"/><stop offset="100%" stop-color="#6e7790"/></linearGradient></defs>`;
  const lines = Array.from({ length: 4 }, (_, index) => {
    const y = padding + ((height - padding * 2) / 3) * index;
    return `<line class="grid-line" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" />`;
  }).join('');

  const bars = values.map((item, index) => {
    const barHeight = (item.value / maxValue) * (height - padding * 2);
    const x = padding + index * (barWidth + gap);
    const y = height - padding - barHeight;
    return `<g><rect class="bar" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="8" /><text class="axis-label" x="${x + barWidth / 2}" y="${height - 8}" text-anchor="middle">${item.label}</text></g>`;
  }).join('');

  svg.innerHTML = defs + lines + bars;
}

function renderCharts() {
  const filtered = getFilteredProperties();
  const rentValues = filtered.slice(0, 6).map((item) => ({ label: item.property_name.split(' ')[0], value: Number(item.monthly_rent || 0) }));
  const occupancyValues = filtered.slice(0, 6).map((item) => ({ label: item.property_name.split(' ')[0], value: Number(item.occupancy_rate || 0) }));
  renderChart(rentChart, rentValues, '#46c2ff');
  renderChart(occupancyChart, occupancyValues, '#87f3a8');
}

function renderDetailPanel() {
  const selectedProperty = properties.find((item) => item.id === selectedPropertyId);
  if (!selectedProperty) {
    detailPanel.innerHTML = '<div class="empty-state">Select a property to see its details.</div>';
    return;
  }

  const noi = Number(selectedProperty.monthly_rent || 0) * 12 - Number(selectedProperty.annual_expenses || 0);
  const photosHtml = (selectedProperty.photos || []).map((url, idx) => `
      <div class="photo-thumb-wrap">
        <img src="${url}" class="photo-thumb" alt="photo-${idx}" />
        <button class="photo-delete" data-remove-photo="${idx}" title="Remove photo">×</button>
      </div>
    `).join('');

  const tasksHtml = (selectedProperty.tasks || []).map((t) => `
      <div class="task-item">
        <input type="checkbox" ${t.completed ? 'checked' : ''} aria-label="toggle task" />
        <div class="task-title">${t.title} ${t.assignee ? `<small>— ${t.assignee}</small>` : ''}</div>
        <div>${t.due_date || ''}</div>
        <button class="action-btn" data-toggle-task="${t.id}">Toggle</button>
        <button class="delete-btn" data-delete-task="${t.id}">Delete</button>
      </div>
    `).join('');

  detailPanel.innerHTML = `
    <div class="detail-card">
      <h3>${selectedProperty.property_name}</h3>
      <div class="detail-meta">
        <span class="detail-chip">${selectedProperty.property_type}</span>
        <span class="detail-chip">${selectedProperty.address}</span>
      </div>
      <p><strong>Purchase price:</strong> ${formatCurrency(selectedProperty.purchase_price)}</p>
      <p><strong>Monthly rent:</strong> ${formatCurrency(selectedProperty.monthly_rent)}</p>
      <p><strong>Mortgage balance:</strong> ${formatCurrency(selectedProperty.mortgage_balance || 0)}</p>
      <p><strong>Monthly mortgage payment:</strong> ${formatCurrency(selectedProperty.monthly_mortgage_payment || 0)}</p>
      <p><strong>Annual expenses:</strong> ${formatCurrency(selectedProperty.annual_expenses)}</p>
      <p><strong>Occupancy:</strong> ${formatPercent(selectedProperty.occupancy_rate)}</p>
      <p><strong>Estimated NOI:</strong> ${formatCurrency(noi)}</p>
      <p><strong>Acquisition date:</strong> ${selectedProperty.acquisition_date || 'Not provided'}</p>
      <p><strong>Notes:</strong> ${selectedProperty.notes || 'No notes yet.'}</p>
      <div class="form-actions">
        <button class="action-btn" data-edit="${selectedProperty.id}" type="button">Edit</button>
      </div>
    </div>

    <div class="detail-card">
      <h3>Photos</h3>
      <div class="photo-gallery">${photosHtml || '<div class="empty-state">No photos yet.</div>'}</div>
      <div style="margin-top:8px;">
        <button class="button ghost" data-add-photo type="button">Add photo</button>
      </div>
    </div>

    <div class="detail-card">
      <h3>Tasks</h3>
      <form class="task-form" onsubmit="return false;">
        <input name="task_title" placeholder="Task title" />
        <input name="task_assignee" placeholder="Assignee" />
        <input type="date" name="task_due" />
        <button class="button primary" data-add-task type="button">Add</button>
      </form>
      <div class="task-list">${tasksHtml || '<div class="empty-state">No tasks yet.</div>'}</div>
    </div>
  `;
}

function renderTable() {
  const filtered = getFilteredProperties();
  tableBody.innerHTML = filtered.length ? filtered.map((item) => `
    <tr>
      <td>${item.property_name}</td>
      <td>${item.address}</td>
      <td>${item.property_type}</td>
      <td>${formatCurrency(item.monthly_rent)}</td>
      <td>${formatPercent(item.occupancy_rate)}</td>
      <td>${formatCurrency(Number(item.monthly_rent || 0) * 12 - Number(item.annual_expenses || 0))}</td>
      <td>
        <button class="action-btn" data-view="${item.id}" type="button">View</button>
        <button class="action-btn" data-edit="${item.id}" type="button">Edit</button>
        <button class="delete-btn" data-delete="${item.id}" type="button">Delete</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="empty-state">No properties match the current filters.</td></tr>';
}

function resetForm() {
  form.reset();
  editingId = null;
  form.querySelector('input[name="id"]').value = '';
}

function populateForm(property) {
  const formElements = form.elements;
  formElements.namedItem('id').value = property.id;
  formElements.namedItem('property_name').value = property.property_name || '';
  formElements.namedItem('address').value = property.address || '';
  formElements.namedItem('property_type').value = property.property_type || 'Residential';
  formElements.namedItem('acquisition_date').value = property.acquisition_date || '';
  formElements.namedItem('purchase_price').value = property.purchase_price || 0;
  formElements.namedItem('monthly_rent').value = property.monthly_rent || 0;
  formElements.namedItem('mortgage_balance').value = property.mortgage_balance || 0;
  formElements.namedItem('monthly_mortgage_payment').value = property.monthly_mortgage_payment || 0;
  formElements.namedItem('annual_expenses').value = property.annual_expenses || 0;
  formElements.namedItem('occupancy_rate').value = property.occupancy_rate || 0;
  formElements.namedItem('notes').value = property.notes || '';
}

function setEditMode(propertyId) {
  const property = properties.find((item) => item.id === propertyId);
  if (!property) return;
  editingId = propertyId;
  populateForm(property);
  selectedPropertyId = propertyId;
  renderDetailPanel();
}

function render() {
  renderMetrics();
  renderCharts();
  renderTable();
  renderDetailPanel();
}

function loadLogo() {
  try {
    const custom = localStorage.getItem('custom_logo');
    if (brandLogo) {
      brandLogo.src = custom || CONFIG_LOGO || 'logo.svg';
    }
  } catch (e) {
    /* ignore */
  }
}

if (changeLogoBtn) {
  changeLogoBtn.addEventListener('click', () => {
    if (logoUpload) logoUpload.click();
  });
}

if (logoUpload) {
  logoUpload.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUrl = reader.result;
        localStorage.setItem('custom_logo', dataUrl);
        if (brandLogo) brandLogo.src = dataUrl;
      } catch (err) {
        console.error('Failed to save logo', err);
      }
    };
    reader.readAsDataURL(file);
  });
}

if (resetLogoBtn) {
  resetLogoBtn.addEventListener('click', () => {
    localStorage.removeItem('custom_logo');
    if (brandLogo) brandLogo.src = CONFIG_LOGO || 'logo.svg';
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const normalized = {
    id: data.id || crypto.randomUUID(),
    property_name: data.property_name,
    address: data.address,
    property_type: data.property_type,
    purchase_price: Number(data.purchase_price || 0),
    monthly_rent: Number(data.monthly_rent || 0),
    mortgage_balance: Number(data.mortgage_balance || 0),
    monthly_mortgage_payment: Number(data.monthly_mortgage_payment || 0),
    annual_expenses: Number(data.annual_expenses || 0),
    occupancy_rate: Number(data.occupancy_rate || 0),
    acquisition_date: data.acquisition_date,
    notes: data.notes
  };

  const isEditing = Boolean(editingId || data.id);
  if (isEditing) {
    const targetId = editingId || normalized.id;
    const existing = properties.find(p => p.id === targetId) || { photos: [], tasks: [] };
    normalized.photos = existing.photos || [];
    normalized.tasks = existing.tasks || [];
    properties = properties.map((item) => item.id === targetId ? normalized : item);
    selectedPropertyId = targetId;
  } else {
    normalized.photos = [];
    normalized.tasks = [];
    properties = [normalized, ...properties];
    selectedPropertyId = normalized.id;
  }

  editingId = null;
  await saveProperties();
  resetForm();
  render();
});

tableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();

  if (button.dataset.view) {
    selectedPropertyId = button.dataset.view;
    renderDetailPanel();
    return;
  }

  if (button.dataset.edit) {
    setEditMode(button.dataset.edit);
    return;
  }

  if (button.dataset.delete) {
    const id = button.dataset.delete;
    properties = properties.filter((item) => item.id !== id);
    if (selectedPropertyId === id) {
      selectedPropertyId = properties[0]?.id || null;
    }
    saveProperties();
    render();
  }
});

// Detail panel actions: edit, add/remove photos, and task management
detailPanel.addEventListener('click', (event) => {
  const btn = event.target.closest('button');
  if (!btn) return;
  event.preventDefault();

  // Edit property
  if (btn.dataset.edit) {
    setEditMode(btn.dataset.edit);
    return;
  }

  // Add photo (triggers hidden file input)
  if (btn.dataset.addPhoto) {
    if (propertyPhotoUpload) propertyPhotoUpload.click();
    return;
  }

  // Remove photo
  if (btn.dataset.removePhoto !== undefined) {
    const idx = Number(btn.dataset.removePhoto);
    if (Number.isFinite(idx) && selectedPropertyId) {
      removePhotoFromProperty(selectedPropertyId, idx);
    }
    return;
  }

  // Task actions
  if (btn.dataset.addTask) {
    const form = detailPanel.querySelector('.task-form');
    if (!form) return;
    const title = form.querySelector('input[name="task_title"]').value.trim();
    const assignee = form.querySelector('input[name="task_assignee"]').value.trim();
    const due = form.querySelector('input[name="task_due"]').value || '';
    if (!title) return;
    const task = { id: crypto.randomUUID(), title, assignee, due_date: due, completed: false };
    if (selectedPropertyId) addTaskToProperty(selectedPropertyId, task);
    form.reset();
    return;
  }

  if (btn.dataset.toggleTask) {
    const taskId = btn.dataset.toggleTask;
    if (selectedPropertyId) toggleTaskCompleted(selectedPropertyId, taskId);
    return;
  }

  if (btn.dataset.deleteTask) {
    const taskId = btn.dataset.deleteTask;
    if (selectedPropertyId) deleteTask(selectedPropertyId, taskId);
    return;
  }
});

// Handle photo file input change
if (propertyPhotoUpload) {
  propertyPhotoUpload.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const readers = files.map(f => new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then((dataUrls) => {
      const targetId = selectedPropertyId || editingId;
      if (targetId) addPhotosToProperty(targetId, dataUrls);
      propertyPhotoUpload.value = '';
    });
  });
}

searchInput.addEventListener('input', (event) => {
  filters.search = event.target.value;
  render();
});

typeFilter.addEventListener('change', (event) => {
  filters.type = event.target.value;
  render();
});

occupancyFilter.addEventListener('change', (event) => {
  filters.occupancy = event.target.value;
  render();
});

resetFiltersButton.addEventListener('click', () => {
  filters = { search: '', type: 'all', occupancy: 'all' };
  searchInput.value = '';
  typeFilter.value = 'all';
  occupancyFilter.value = 'all';
  render();
});

clearFormButton.addEventListener('click', () => {
  resetForm();
});

csvInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const text = reader.result;
    const rows = parseCsvText(text);
    if (!rows.length) {
      csvInput.value = '';
      return;
    }

    const headers = rows[0].map((header) => normalizeHeader(String(header || '').replace(/^\uFEFF/, '')));
    console.warn('CSV import headers:', headers);
    const importedRows = rows.slice(1)
      .filter((row) => row.some((value) => value.trim()))
      .map((row) => {
        const rowObject = {};
        headers.forEach((header, index) => {
          rowObject[header] = (row[index] || '').trim();
        });

        if (!rowObject.property_name) {
          console.warn('Imported row missing property_name:', rowObject);
        }

        const normalized = normalizePropertyRow(rowObject);
        return {
          ...normalized,
          property_name: normalized.property_name || 'Untitled Property',
          property_type: normalized.property_type || 'Residential'
        };
      });

    properties = [...importedRows, ...properties];
    await saveProperties();
    render();
    csvInput.value = '';
  };
  reader.readAsText(file);
});

exportButton.addEventListener('click', () => {
  const rows = [
    ['property_name', 'address', 'property_type', 'purchase_price', 'monthly_rent', 'annual_expenses', 'occupancy_rate', 'acquisition_date', 'notes'],
    ...properties.map((item) => [
      item.property_name,
      item.address,
      item.property_type,
      item.purchase_price,
      item.monthly_rent,
      item.annual_expenses,
      item.occupancy_rate,
      item.acquisition_date,
      item.notes
    ])
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'properties.csv';
  link.click();
  URL.revokeObjectURL(url);
});

(async function init() {
  properties = await loadProperties();
  if (!selectedPropertyId && properties.length) {
    selectedPropertyId = properties[0].id;
  }
  render();
})();

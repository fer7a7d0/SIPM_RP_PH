/*
  Control de Produccion - Frontend principal
  Este archivo concentra:
  - Estado global de la app
  - Validaciones de captura
  - Integracion con API de Google Apps Script
  - Render de dashboard y exportacion CSV local
*/

// Reemplazar con la URL del despliegue de Apps Script (Web App).
const API_BASE_URL = "https://script.google.com/macros/s/AKfycbzH47tQDA6yodj1_Fu6lZAiy9HnUnL89RCAozgNOp2ZUtdO2DpKLY8MJPlsL8bSHvB6/exec";

const APP_STATE = {
  operators: [],
  activities: [
    "Desvalvulado",
    "Prueba Hidrostatica (PH)",
    "Lavado",
    "Valvulado",
    "Pintura",
    "Reparaciones Minimas"
  ],
  shiftOptions: ["Matutino", "Vespertino", "Nocturno"],
  localRecords: [],
  dashboard: {
    monthKey: "",
    totalMonth: 0,
    totalDay: 0,
    balanceDay: 0,
    monthlyReception: 0,
    monthlyDelivered: 0,
    byActivityMonth: {},
    byShiftMonth: {},
    byOperatorMonth: [],
    byActivity: {},
    byShift: {},
    byOperator: []
  },
  consultation: {
    records: [],
    editingRecordId: ""
  },
  duplicateCache: new Set()
};

const DOM = {
  currentDate: document.getElementById("currentDate"),
  currentTime: document.getElementById("currentTime"),
  operatorSelect: document.getElementById("operator"),
  shiftSelect: document.getElementById("shift"),
  activitySelect: document.getElementById("activity"),
  quantityInput: document.getElementById("quantity"),
  observationsInput: document.getElementById("observations"),
  captureUserInput: document.getElementById("captureUser"),
  productionForm: document.getElementById("productionForm"),
  formMessage: document.getElementById("formMessage"),
  saveButton: document.getElementById("saveButton"),
  downloadCsvButton: document.getElementById("downloadCsvButton"),
  tabCapture: document.getElementById("tabCapture"),
  tabDashboard: document.getElementById("tabDashboard"),
  tabConsulta: document.getElementById("tabConsulta"),
  consultationStartDate: document.getElementById("consultationStartDate"),
  consultationStartDatePicker: document.getElementById("consultationStartDatePicker"),
  consultationStartDatePickerButton: document.getElementById("consultationStartDatePickerButton"),
  consultationEndDate: document.getElementById("consultationEndDate"),
  consultationEndDatePicker: document.getElementById("consultationEndDatePicker"),
  consultationEndDatePickerButton: document.getElementById("consultationEndDatePickerButton"),
  consultationSearchButton: document.getElementById("consultationSearchButton"),
  consultationModeMessage: document.getElementById("consultationModeMessage"),
  consultationMessage: document.getElementById("consultationMessage"),
  consultationTotal: document.getElementById("consultationTotal"),
  consultationTableHead: document.getElementById("consultationTableHead"),
  consultationTableBody: document.getElementById("consultationTableBody"),
  recordEditor: document.getElementById("recordEditor"),
  recordEditorForm: document.getElementById("recordEditorForm"),
  recordEditorDate: document.getElementById("recordEditorDate"),
  recordEditorOperator: document.getElementById("recordEditorOperator"),
  recordEditorShift: document.getElementById("recordEditorShift"),
  recordEditorActivity: document.getElementById("recordEditorActivity"),
  recordEditorQuantity: document.getElementById("recordEditorQuantity"),
  recordEditorCaptureUser: document.getElementById("recordEditorCaptureUser"),
  recordEditorObservations: document.getElementById("recordEditorObservations"),
  recordEditorMessage: document.getElementById("recordEditorMessage"),
  saveRecordChangesButton: document.getElementById("saveRecordChangesButton"),
  cancelRecordEditButton: document.getElementById("cancelRecordEditButton"),
  captureScreen: document.getElementById("captureScreen"),
  dashboardScreen: document.getElementById("dashboardScreen"),
  consultaScreen: document.getElementById("consultaScreen"),
  monthSelector: document.getElementById("monthSelector"),
  refreshDashboardButton: document.getElementById("refreshDashboardButton"),
  kpiTotalDay: document.getElementById("kpiTotalDay"),
  kpiTotalMonth: document.getElementById("kpiTotalMonth"),
  kpiBalanceDay: document.getElementById("kpiBalanceDay"),
  kpiMonthReception: document.getElementById("kpiMonthReception"),
  kpiMonthDelivered: document.getElementById("kpiMonthDelivered"),
  kpiMonthLabel: document.getElementById("kpiMonthLabel"),
  kpiFlowMonthLabel: document.getElementById("kpiFlowMonthLabel"),
  activityListDay: document.getElementById("activityListDay"),
  shiftListDay: document.getElementById("shiftListDay"),
  operatorTableBodyDay: document.getElementById("operatorTableBodyDay"),
  activityListMonth: document.getElementById("activityListMonth"),
  shiftListMonth: document.getElementById("shiftListMonth"),
  operatorTableBodyMonth: document.getElementById("operatorTableBodyMonth")
};

function initApp() {
  bindEvents();
  renderStaticActivities();
  initializeDashboardFilters();
  startClock();
  loadInitialData();
}

function initializeDashboardFilters() {
  if (DOM.monthSelector) {
    DOM.monthSelector.value = getCurrentMonthKey();
  }
}

function bindEvents() {
  DOM.productionForm.addEventListener("submit", onSubmitProduction);
  DOM.downloadCsvButton.addEventListener("click", exportDailyCsvFromServer);
  DOM.tabCapture.addEventListener("click", () => activateScreen("capture"));
  DOM.tabDashboard.addEventListener("click", () => {
    activateScreen("dashboard");
    loadDashboard();
  });
  DOM.tabConsulta.addEventListener("click", () => {
    activateScreen("consulta");
    const today = formatDateForMexico(formatDateKey(new Date()));
    DOM.consultationStartDate.value = today;
    DOM.consultationEndDate.value = "";
    DOM.consultationEndDatePicker.value = "";
    loadConsultation();
  });
  DOM.consultationSearchButton.addEventListener("click", () => loadConsultation());
  DOM.consultationStartDate.addEventListener("change", invalidateConsultationResults);
  DOM.consultationEndDate.addEventListener("change", invalidateConsultationResults);
  DOM.consultationStartDatePickerButton.addEventListener("click", () => openConsultationDatePicker("start"));
  DOM.consultationEndDatePickerButton.addEventListener("click", () => openConsultationDatePicker("end"));
  DOM.consultationStartDatePicker.addEventListener("change", () => syncConsultationDatePicker("start"));
  DOM.consultationEndDatePicker.addEventListener("change", () => syncConsultationDatePicker("end"));
  DOM.consultationTableBody.addEventListener("click", onConsultationAction);
  DOM.recordEditorForm.addEventListener("submit", onSaveRecordChanges);
  DOM.cancelRecordEditButton.addEventListener("click", () => DOM.recordEditor.close());
  DOM.refreshDashboardButton.addEventListener("click", loadDashboard);
  DOM.monthSelector.addEventListener("change", loadDashboard);
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateForMexico(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function openConsultationDatePicker(which) {
  const textInput = which === "start" ? DOM.consultationStartDate : DOM.consultationEndDate;
  const datePicker = which === "start" ? DOM.consultationStartDatePicker : DOM.consultationEndDatePicker;
  datePicker.value = parseMexicoDate(textInput.value);

  if (typeof datePicker.showPicker === "function") {
    datePicker.showPicker();
  } else {
    datePicker.focus();
    datePicker.click();
  }
}

function syncConsultationDatePicker(which) {
  const textInput = which === "start" ? DOM.consultationStartDate : DOM.consultationEndDate;
  const datePicker = which === "start" ? DOM.consultationStartDatePicker : DOM.consultationEndDatePicker;
  textInput.value = formatDateForMexico(datePicker.value);
  invalidateConsultationResults();
}

function parseMexicoDate(value) {
  const match = String(value || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return "";
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return "";
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

function shiftDateKey(dateKey, deltaDays) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) {
    return "";
  }

  const parts = dateKey.split("-").map(Number);
  const shifted = new Date(parts[0], parts[1] - 1, parts[2] + deltaDays);
  return formatDateKey(shifted);
}

function buildExportDateCandidates(serverDate) {
  const localDate = formatDateKey(new Date());
  const ordered = [
    serverDate,
    localDate,
    shiftDateKey(serverDate, -1),
    shiftDateKey(serverDate, 1),
    shiftDateKey(localDate, -1),
    shiftDateKey(localDate, 1)
  ].filter((value) => Boolean(value));

  return [...new Set(ordered)];
}

function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  DOM.currentDate.textContent = now.toLocaleDateString("es-EC");
  DOM.currentTime.textContent = now.toLocaleTimeString("es-EC");
}

function activateScreen(target) {
  const screens = {
    capture: DOM.captureScreen,
    dashboard: DOM.dashboardScreen,
    consulta: DOM.consultaScreen
  };
  const tabs = {
    capture: DOM.tabCapture,
    dashboard: DOM.tabDashboard,
    consulta: DOM.tabConsulta
  };

  Object.entries(screens).forEach(([name, screen]) => {
    const isActive = name === target;
    screen.classList.toggle("active", isActive);
    screen.setAttribute("aria-hidden", String(!isActive));
    tabs[name].classList.toggle("active", isActive);
    tabs[name].setAttribute("aria-selected", String(isActive));
  });
}

function renderStaticActivities() {
  APP_STATE.activities.forEach((activity) => {
    const option = document.createElement("option");
    option.value = activity;
    option.textContent = activity;
    DOM.activitySelect.appendChild(option);
  });
}

async function loadInitialData() {
  try {
    setFormMessage("Cargando configuracion inicial...", "");

    const data = await callApi("getInitialData", {});
    APP_STATE.operators = (data.operators || []).filter((name) => Boolean(name));

    if (data.activities && data.activities.length > 0) {
      APP_STATE.activities = data.activities;
      repaintActivityOptions();
    }

    repaintOperatorOptions();
    setFormMessage("Sistema listo para registrar produccion.", "success");
  } catch (error) {
    console.error(error);
    setFormMessage("No se pudo cargar la configuracion inicial.", "error");
  }
}

function repaintOperatorOptions() {
  DOM.operatorSelect.innerHTML = '<option value="">Selecciona un operador</option>';

  APP_STATE.operators.forEach((operator) => {
    const option = document.createElement("option");
    option.value = operator;
    option.textContent = operator;
    DOM.operatorSelect.appendChild(option);
  });

  repaintCaptureUserOptions();
}

function repaintCaptureUserOptions() {
  DOM.captureUserInput.innerHTML = '<option value="">Selecciona usuario de captura</option>';

  APP_STATE.operators.forEach((operator) => {
    const option = document.createElement("option");
    option.value = operator;
    option.textContent = operator;
    DOM.captureUserInput.appendChild(option);
  });
}

function repaintActivityOptions() {
  DOM.activitySelect.innerHTML = '<option value="">Selecciona una actividad</option>';
  APP_STATE.activities.forEach((activity) => {
    const option = document.createElement("option");
    option.value = activity;
    option.textContent = activity;
    DOM.activitySelect.appendChild(option);
  });
}

async function onSubmitProduction(event) {
  event.preventDefault();

  const payload = buildPayloadFromForm();
  const selectedOperator = payload.operator;
  const selectedCaptureUser = payload.captureUser;
  const validation = validatePayload(payload);

  if (!validation.ok) {
    setFormMessage(validation.message, "error");
    return;
  }

  // Proteccion inmediata de doble clic por huella local del registro.
  if (APP_STATE.duplicateCache.has(payload.duplicateKey)) {
    setFormMessage("Registro duplicado detectado. Verifica antes de guardar de nuevo.", "error");
    return;
  }

  APP_STATE.duplicateCache.add(payload.duplicateKey);

  try {
    DOM.saveButton.disabled = true;
    setFormMessage("Guardando registro...", "");

    const response = await callApi("createProductionRecord", payload);

    APP_STATE.localRecords.push({
      id: response.id,
      ...payload,
      savedAt: new Date().toISOString()
    });

    setFormMessage("Registro guardado correctamente", "success");
    DOM.productionForm.reset();
    DOM.operatorSelect.value = selectedOperator;
    DOM.captureUserInput.value = selectedCaptureUser;
    DOM.activitySelect.focus();
  } catch (error) {
    console.error(error);
    // Si el servidor falla, liberamos la llave local para que el usuario pueda reintentar.
    APP_STATE.duplicateCache.delete(payload.duplicateKey);
    setFormMessage(error.message || "No se pudo guardar el registro.", "error");
  } finally {
    DOM.saveButton.disabled = false;
  }
}

function buildPayloadFromForm() {
  const now = new Date();
  const quantity = Number(DOM.quantityInput.value);
  const operator = DOM.operatorSelect.value.trim();
  const activity = DOM.activitySelect.value.trim();
  const shift = DOM.shiftSelect.value.trim();

  return {
    date: now.toLocaleDateString("es-EC"),
    time: now.toLocaleTimeString("es-EC"),
    operator,
    shift,
    activity,
    quantity,
    observations: DOM.observationsInput.value.trim(),
    captureUser: DOM.captureUserInput.value.trim(),
    duplicateKey: createDuplicateKey({
      operator,
      shift,
      activity,
      quantity,
      minuteBucket: now.toISOString().slice(0, 16)
    }),
    sourceDevice: navigator.userAgent
  };
}

function validatePayload(payload) {
  if (!payload.operator) {
    return { ok: false, message: "Debe seleccionar un operador." };
  }

  if (!payload.shift || !APP_STATE.shiftOptions.includes(payload.shift)) {
    return { ok: false, message: "Debe seleccionar un turno valido." };
  }

  if (!payload.activity) {
    return { ok: false, message: "Debe seleccionar una actividad." };
  }

  if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
    return { ok: false, message: "La cantidad debe ser un numero positivo." };
  }

  if (!Number.isInteger(payload.quantity)) {
    return { ok: false, message: "La cantidad debe ser un numero entero." };
  }

  if (!payload.captureUser) {
    return { ok: false, message: "Debe registrar el usuario que captura." };
  }

  return { ok: true, message: "OK" };
}

function setFormMessage(message, type) {
  DOM.formMessage.textContent = message;
  DOM.formMessage.classList.remove("success", "error");
  if (type) {
    DOM.formMessage.classList.add(type);
  }
}

function createDuplicateKey(parts) {
  // Clave de deduplicacion basada en campos operativos + ventana por minuto.
  return [parts.operator, parts.shift, parts.activity, parts.quantity, parts.minuteBucket]
    .join("|")
    .toLowerCase();
}

async function loadDashboard() {
  try {
    DOM.refreshDashboardButton.disabled = true;
    const selectedMonth = DOM.monthSelector.value || "";

    const data = await callApi("getDailyDashboard", { monthKey: selectedMonth });

    APP_STATE.dashboard.monthKey = data.monthKey || "";
    APP_STATE.dashboard.totalMonth = data.totalMonth || 0;
    APP_STATE.dashboard.byActivityMonth = data.byActivityMonth || {};
    APP_STATE.dashboard.byShiftMonth = data.byShiftMonth || {};
    APP_STATE.dashboard.byOperatorMonth = data.byOperatorMonth || [];
    APP_STATE.dashboard.totalDay = data.totalDay || 0;
    APP_STATE.dashboard.balanceDay = data.balanceDay || 0;
    APP_STATE.dashboard.monthlyReception = data.monthlyReception || 0;
    APP_STATE.dashboard.monthlyDelivered = data.monthlyDelivered || 0;
    APP_STATE.dashboard.byActivity = data.byActivity || {};
    APP_STATE.dashboard.byShift = data.byShift || {};
    APP_STATE.dashboard.byOperator = data.byOperator || [];

    renderDashboard();
  } catch (error) {
    console.error(error);
    setFormMessage("No se pudo actualizar el dashboard.", "error");
  } finally {
    DOM.refreshDashboardButton.disabled = false;
  }
}

function renderDashboard() {
  DOM.kpiTotalDay.textContent = String(APP_STATE.dashboard.totalDay);
  DOM.kpiTotalMonth.textContent = String(APP_STATE.dashboard.totalMonth);
  DOM.kpiBalanceDay.textContent = String(APP_STATE.dashboard.balanceDay);
  DOM.kpiMonthReception.textContent = String(APP_STATE.dashboard.monthlyReception);
  DOM.kpiMonthDelivered.textContent = String(APP_STATE.dashboard.monthlyDelivered);
  DOM.kpiMonthLabel.textContent = APP_STATE.dashboard.monthKey
    ? `Periodo ${APP_STATE.dashboard.monthKey}`
    : "Periodo --";
  DOM.kpiFlowMonthLabel.textContent = APP_STATE.dashboard.monthKey
    ? `Periodo ${APP_STATE.dashboard.monthKey}`
    : "Periodo --";

  if (DOM.monthSelector.value !== APP_STATE.dashboard.monthKey && APP_STATE.dashboard.monthKey) {
    DOM.monthSelector.value = APP_STATE.dashboard.monthKey;
  }

  renderStatList(DOM.activityListDay, APP_STATE.activities, APP_STATE.dashboard.byActivity);
  renderStatList(DOM.shiftListDay, APP_STATE.shiftOptions, APP_STATE.dashboard.byShift);
  renderOperatorTable(DOM.operatorTableBodyDay, APP_STATE.dashboard.byOperator);

  renderStatList(DOM.activityListMonth, APP_STATE.activities, APP_STATE.dashboard.byActivityMonth);
  renderStatList(DOM.shiftListMonth, APP_STATE.shiftOptions, APP_STATE.dashboard.byShiftMonth);
  renderOperatorTable(DOM.operatorTableBodyMonth, APP_STATE.dashboard.byOperatorMonth);
}

function renderStatList(targetElement, keys, valuesMap) {
  targetElement.innerHTML = "";
  keys.forEach((key) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${key}</span><strong>${valuesMap[key] || 0}</strong>`;
    targetElement.appendChild(li);
  });
}

function renderOperatorTable(targetElement, rows) {
  targetElement.innerHTML = "";
  rows.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.operator}</td>
      <td>${item.total}</td>
    `;
    targetElement.appendChild(tr);
  });
}

async function loadConsultation(successMessage) {
  const startDate = parseMexicoDate(DOM.consultationStartDate.value);
  const endDateValue = DOM.consultationEndDate.value.trim();
  const endDate = endDateValue ? parseMexicoDate(endDateValue) : "";
  if (!startDate || (endDateValue && !endDate)) {
    setConsultationMessage("Ingresa las fechas en formato dd/mm/aaaa.", "error");
    return;
  }
  if (endDate && startDate > endDate) {
    setConsultationMessage("La fecha inicial no puede ser posterior a la fecha final.", "error");
    return;
  }

  const isSingleDate = !endDate;
  DOM.consultationSearchButton.disabled = true;
  DOM.consultationTableBody.replaceChildren();
  setConsultationMessage("Cargando registros...", "");
  DOM.consultationModeMessage.textContent = isSingleDate
    ? `Registros individuales del ${formatDateForMexico(startDate)}. Puedes editarlos o eliminarlos.`
    : `Cantidades acumuladas del ${formatDateForMexico(startDate)} al ${formatDateForMexico(endDate)}. Esta consulta es de solo lectura.`;

  try {
    const records = isSingleDate
      ? await callApi("getRecordsByDate", { date: startDate })
      : await callApi("getRecordsByDateRange", { startDate, endDate });
    APP_STATE.consultation.records = Array.isArray(records) ? records : [];
    renderConsultation(isSingleDate);
    setConsultationMessage(successMessage || (APP_STATE.consultation.records.length
      ? `${APP_STATE.consultation.records.length} registro(s) encontrado(s).`
      : "No hay registros para el periodo seleccionado."), successMessage ? "success" : "");
  } catch (error) {
    console.error(error);
    APP_STATE.consultation.records = [];
    renderConsultation(isSingleDate);
    setConsultationMessage(error.message || "No se pudieron cargar los registros.", "error");
  } finally {
    DOM.consultationSearchButton.disabled = false;
  }
}

function invalidateConsultationResults() {
  APP_STATE.consultation.records = [];
  DOM.consultationTableHead.replaceChildren();
  DOM.consultationTableBody.replaceChildren();
  DOM.consultationTotal.textContent = "0";

  const startDate = parseMexicoDate(DOM.consultationStartDate.value);
  const endDateValue = DOM.consultationEndDate.value.trim();
  const endDate = endDateValue ? parseMexicoDate(endDateValue) : "";
  if (!startDate || (endDateValue && !endDate) || (endDate && startDate > endDate)) {
    DOM.consultationModeMessage.textContent = "Ingresa una fecha Desde valida y, si deseas un rango, una fecha Hasta igual o posterior.";
  } else if (!endDate) {
    DOM.consultationModeMessage.textContent = `Fecha seleccionada: ${formatDateForMexico(startDate)}. Presiona Consultar para ver sus registros.`;
  } else {
    DOM.consultationModeMessage.textContent = `Rango seleccionado: ${formatDateForMexico(startDate)} al ${formatDateForMexico(endDate)}. La consulta sera de solo lectura.`;
  }
  setConsultationMessage("", "");
}

function renderConsultation(isSingleDate) {
  const headers = isSingleDate
    ? ["Actividad", "Cantidad", "Acciones"]
    : ["Actividad", "Cantidad acumulada"];
  DOM.consultationTableHead.replaceChildren();
  DOM.consultationTableBody.replaceChildren();

  const headerRow = document.createElement("tr");
  headers.forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  DOM.consultationTableHead.appendChild(headerRow);

  const total = APP_STATE.consultation.records.reduce((sum, record) => sum + Number(record.quantity || 0), 0);
  DOM.consultationTotal.textContent = String(total);

  if (!isSingleDate) {
    const groups = new Map();
    APP_STATE.consultation.records.forEach((record) => {
      const key = JSON.stringify([record.operator, record.shift, record.activity]);
      const group = groups.get(key) || {
        operator: record.operator,
        shift: record.shift,
        activity: record.activity,
        quantity: 0
      };
      group.quantity += Number(record.quantity || 0);
      groups.set(key, group);
    });

    [...groups.values()]
      .sort((a, b) => compareConsultationActivities(a, b)
        || String(a.operator || "").localeCompare(String(b.operator || ""), "es"))
      .forEach((record) => {
        const row = document.createElement("tr");
        [record.activity, String(record.quantity)].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value || "";
          row.appendChild(cell);
        });
        DOM.consultationTableBody.appendChild(row);
      });
  } else {
    [...APP_STATE.consultation.records]
      .sort((a, b) => compareConsultationActivities(a, b)
        || String(a.time || "").localeCompare(String(b.time || ""))
        || String(a.operator || "").localeCompare(String(b.operator || ""), "es"))
      .forEach((record) => {
        const row = document.createElement("tr");
        [record.activity, String(record.quantity)].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value || "";
          row.appendChild(cell);
        });

        const actions = document.createElement("td");
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "btn-secondary btn-small";
        editButton.dataset.action = "edit";
        editButton.dataset.id = record.id;
        editButton.setAttribute("aria-label", "Editar registro");
        editButton.title = "Editar";
        editButton.textContent = "✎";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn-danger btn-small";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.id = record.id;
        deleteButton.setAttribute("aria-label", "Eliminar registro");
        deleteButton.title = "Eliminar";
        deleteButton.textContent = "×";
        actions.append(editButton, deleteButton);
        row.appendChild(actions);
        DOM.consultationTableBody.appendChild(row);
      });
  }

  if (DOM.consultationTableBody.children.length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = headers.length;
    emptyCell.className = "empty-state";
    emptyCell.textContent = "Sin registros para mostrar.";
    emptyRow.appendChild(emptyCell);
    DOM.consultationTableBody.appendChild(emptyRow);
  }
}

function compareConsultationActivities(a, b) {
  const activityA = String(a.activity || "");
  const activityB = String(b.activity || "");
  const indexA = APP_STATE.activities.indexOf(activityA);
  const indexB = APP_STATE.activities.indexOf(activityB);
  const positionA = indexA === -1 ? APP_STATE.activities.length : indexA;
  const positionB = indexB === -1 ? APP_STATE.activities.length : indexB;

  return positionA - positionB
    || activityA.localeCompare(activityB, "es", { numeric: true, sensitivity: "base" });
}

function onConsultationAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const record = APP_STATE.consultation.records.find((item) => String(item.id) === button.dataset.id);
  if (!record) {
    setConsultationMessage("No se encontro el registro seleccionado. Actualiza la consulta.", "error");
    return;
  }

  if (button.dataset.action === "edit") {
    openRecordEditor(record);
  } else if (button.dataset.action === "delete") {
    deleteConsultationRecord(record);
  }
}

function openRecordEditor(record) {
  APP_STATE.consultation.editingRecordId = record.id;
  DOM.recordEditorDate.textContent = `Fecha: ${record.date} | Hora: ${record.time}`;
  setSelectOptions(DOM.recordEditorOperator, [...APP_STATE.operators, record.operator], record.operator);
  setSelectOptions(DOM.recordEditorShift, APP_STATE.shiftOptions, record.shift);
  setSelectOptions(DOM.recordEditorActivity, [...APP_STATE.activities, record.activity], record.activity);
  setSelectOptions(DOM.recordEditorCaptureUser, [...APP_STATE.operators, record.captureUser], record.captureUser);
  DOM.recordEditorQuantity.value = String(record.quantity);
  DOM.recordEditorObservations.value = record.observations || "";
  setRecordEditorMessage("", "");
  DOM.recordEditor.showModal();
}

function setSelectOptions(select, values, selectedValue) {
  select.replaceChildren();
  [...new Set(values.filter(Boolean))].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.value = selectedValue;
}

async function onSaveRecordChanges(event) {
  event.preventDefault();
  const quantity = Number(DOM.recordEditorQuantity.value);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    setRecordEditorMessage("La cantidad debe ser un numero entero positivo.", "error");
    return;
  }

  DOM.saveRecordChangesButton.disabled = true;
  setRecordEditorMessage("Guardando cambios...", "");
  try {
    await callApi("updateProductionRecord", {
      id: APP_STATE.consultation.editingRecordId,
      date: parseMexicoDate(DOM.consultationStartDate.value),
      operator: DOM.recordEditorOperator.value,
      shift: DOM.recordEditorShift.value,
      activity: DOM.recordEditorActivity.value,
      quantity,
      observations: DOM.recordEditorObservations.value.trim(),
      captureUser: DOM.recordEditorCaptureUser.value
    });
    DOM.recordEditor.close();
    await loadConsultation("Registro actualizado correctamente.");
  } catch (error) {
    console.error(error);
    setRecordEditorMessage(error.message || "No se pudo actualizar el registro.", "error");
  } finally {
    DOM.saveRecordChangesButton.disabled = false;
  }
}

async function deleteConsultationRecord(record) {
  if (!window.confirm(`¿Eliminar el registro de ${record.activity} (${record.quantity} cilindros)?`)) {
    return;
  }
  DOM.consultationTableBody.querySelectorAll("button[data-action]").forEach((button) => {
    button.disabled = true;
  });
  try {
    await callApi("deleteProductionRecord", {
      id: record.id,
      date: parseMexicoDate(DOM.consultationStartDate.value)
    });
    await loadConsultation("Registro eliminado correctamente.");
  } catch (error) {
    console.error(error);
    setConsultationMessage(error.message || "No se pudo eliminar el registro.", "error");
    DOM.consultationTableBody.querySelectorAll("button[data-action]").forEach((button) => {
      button.disabled = false;
    });
  }
}

function setConsultationMessage(message, type) {
  DOM.consultationMessage.textContent = message;
  DOM.consultationMessage.classList.remove("success", "error");
  if (type) {
    DOM.consultationMessage.classList.add(type);
  }
}

function setRecordEditorMessage(message, type) {
  DOM.recordEditorMessage.textContent = message;
  DOM.recordEditorMessage.classList.remove("success", "error");
  if (type) {
    DOM.recordEditorMessage.classList.add(type);
  }
}

async function callApi(action, payload) {
  if (!API_BASE_URL || API_BASE_URL === "PEGAR_AQUI_URL_WEB_APP") {
    throw new Error("Debes configurar API_BASE_URL en app.js con tu URL de Apps Script.");
  }

  // Usamos text/plain para evitar preflight CORS, pero conservando un cuerpo JSON.
  const requestBody = JSON.stringify({
    action,
    payload: payload || {}
  });

  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: requestBody,
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error("Error de red al contactar la API.");
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error("La API no devolvio un JSON valido. Revisa el despliegue de Apps Script.");
  }

  if (!body.ok) {
    throw new Error(body.message || "Error en el servidor.");
  }

  return body.data;
}

function exportCsvFromLocalRecords(suppressMessage) {
  if (APP_STATE.localRecords.length === 0) {
    if (!suppressMessage) {
      setFormMessage("No hay registros locales para exportar.", "error");
    }
    return false;
  }

  const headers = [
    "ID",
    "Fecha",
    "Hora",
    "Operador",
    "Turno",
    "Actividad",
    "Cantidad",
    "Observaciones",
    "Usuario captura"
  ];

  const lines = APP_STATE.localRecords.map((row) => [
    row.id,
    row.date,
    row.time,
    row.operator,
    row.shift,
    row.activity,
    row.quantity,
    sanitizeCsv(row.observations),
    sanitizeCsv(row.captureUser)
  ]);

  const fileDate = formatDateKey(new Date());
  downloadCsvFile(headers, lines, `produccion_local_${fileDate}.csv`);

  if (!suppressMessage) {
    setFormMessage("Archivo CSV local generado correctamente.", "success");
  }
  return true;
}

async function exportDailyCsvFromServer() {
  DOM.downloadCsvButton.disabled = true;
  setFormMessage("Generando CSV diario...", "");

  try {
    const dashboard = await callApi("getDailyDashboard", { monthKey: DOM.monthSelector.value || "" });
    const serverDate = dashboard.date || formatDateKey(new Date());
    const candidateDates = buildExportDateCandidates(serverDate);

    let records = [];
    let matchedDate = "";

    for (const dateKey of candidateDates) {
      const attempt = await callApi("getRecordsByDate", { date: dateKey });
      if (Array.isArray(attempt) && attempt.length > 0) {
        records = attempt;
        matchedDate = dateKey;
        break;
      }
    }

    if (!records || records.length === 0) {
      setFormMessage(`No hay registros del dia para exportar. Fechas consultadas: ${candidateDates.join(", ")}.`, "error");
      return;
    }

    const headers = [
      "ID",
      "Fecha",
      "Hora",
      "Operador",
      "Turno",
      "Actividad",
      "Cantidad",
      "Observaciones",
      "Usuario captura"
    ];

    const lines = records.map((row) => [
      sanitizeCsv(row.id),
      sanitizeCsv(row.date),
      sanitizeCsv(row.time),
      sanitizeCsv(row.operator),
      sanitizeCsv(row.shift),
      sanitizeCsv(row.activity),
      row.quantity,
      sanitizeCsv(row.observations),
      sanitizeCsv(row.captureUser)
    ]);

    downloadCsvFile(headers, lines, `produccion_dia_${matchedDate}.csv`);
    setFormMessage(`CSV diario generado correctamente (${matchedDate}).`, "success");
  } catch (error) {
    console.error(error);

    const exportedLocal = exportCsvFromLocalRecords(true);
    if (exportedLocal) {
      setFormMessage("No se pudo consultar el dia en servidor. Se descargo CSV local de respaldo.", "error");
      return;
    }

    setFormMessage("No se pudo descargar el CSV diario.", "error");
  } finally {
    DOM.downloadCsvButton.disabled = false;
  }
}

function downloadCsvFile(headers, lines, fileName) {
  const csv = [headers.join(","), ...lines.map((line) => line.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();

  URL.revokeObjectURL(url);
}

function sanitizeCsv(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

initApp();

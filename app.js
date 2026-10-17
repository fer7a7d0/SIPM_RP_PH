/*
  Control de Produccion - Frontend principal
  Este archivo concentra:
  - Estado global de la app
  - Validaciones de captura
  - Integracion con API de Google Apps Script
  - Render de dashboard y exportacion CSV local
*/

// Reemplazar con la URL del despliegue de Apps Script (Web App).
const API_BASE_URL = "https://script.google.com/macros/s/AKfycbzZrMvY7WTpdzLM-jw1toZn772H5ckJgVuZbtxfbEq-T-tk3DfewM-QUqlZwekPvSyA/exec";
const APP_TIME_ZONE = "America/Monterrey";
const NUMBER_FORMATTER = new Intl.NumberFormat("es-MX");

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
    byOperatorMonth: []
  },
  consultation: {
    records: [],
    editingRecordId: "",
    startCalendarMonth: "",
    endCalendarMonth: ""
  },
  productionCalendarMonth: "",
  duplicateCache: new Set()
};

const DOM = {
  currentDate: document.getElementById("currentDate"),
  currentTime: document.getElementById("currentTime"),
  productionDate: document.getElementById("productionDate"),
  productionDatePickerButton: document.getElementById("productionDatePickerButton"),
  productionDateCalendar: document.getElementById("productionDateCalendar"),
  productionDateMonthLabel: document.getElementById("productionDateMonthLabel"),
  productionDateCalendarGrid: document.getElementById("productionDateCalendarGrid"),
  productionDatePreviousMonth: document.getElementById("productionDatePreviousMonth"),
  productionDateNextMonth: document.getElementById("productionDateNextMonth"),
  productionDateTodayButton: document.getElementById("productionDateTodayButton"),
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
  consultationStartDatePickerButton: document.getElementById("consultationStartDatePickerButton"),
  consultationStartDateCalendar: document.getElementById("consultationStartDateCalendar"),
  consultationStartDateMonthLabel: document.getElementById("consultationStartDateMonthLabel"),
  consultationStartDateCalendarGrid: document.getElementById("consultationStartDateCalendarGrid"),
  consultationStartDatePreviousMonth: document.getElementById("consultationStartDatePreviousMonth"),
  consultationStartDateNextMonth: document.getElementById("consultationStartDateNextMonth"),
  consultationStartDateTodayButton: document.getElementById("consultationStartDateTodayButton"),
  consultationEndDate: document.getElementById("consultationEndDate"),
  consultationEndDatePickerButton: document.getElementById("consultationEndDatePickerButton"),
  consultationEndDateCalendar: document.getElementById("consultationEndDateCalendar"),
  consultationEndDateMonthLabel: document.getElementById("consultationEndDateMonthLabel"),
  consultationEndDateCalendarGrid: document.getElementById("consultationEndDateCalendarGrid"),
  consultationEndDatePreviousMonth: document.getElementById("consultationEndDatePreviousMonth"),
  consultationEndDateNextMonth: document.getElementById("consultationEndDateNextMonth"),
  consultationEndDateTodayButton: document.getElementById("consultationEndDateTodayButton"),
  consultationSearchButton: document.getElementById("consultationSearchButton"),
  consultationMessage: document.getElementById("consultationMessage"),
  consultationTableHead: document.getElementById("consultationTableHead"),
  consultationTableBody: document.getElementById("consultationTableBody"),
  consultationTableFoot: document.getElementById("consultationTableFoot"),
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
  activityListMonth: document.getElementById("activityListMonth"),
  shiftListMonth: document.getElementById("shiftListMonth"),
  operatorTableBodyMonth: document.getElementById("operatorTableBodyMonth")
};

function initApp() {
  bindEvents();
  renderStaticActivities();
  initializeDashboardFilters();
  DOM.productionDate.value = formatDateForMexico(formatDateKey(new Date()));
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
    closeConsultationDateCalendars();
    loadConsultation();
  });
  DOM.consultationSearchButton.addEventListener("click", () => loadConsultation());
  DOM.consultationStartDate.addEventListener("change", onConsultationStartDateChange);
  DOM.consultationEndDate.addEventListener("change", invalidateConsultationResults);
  DOM.consultationStartDatePickerButton.addEventListener("click", () => openConsultationDateCalendar("start"));
  DOM.consultationEndDatePickerButton.addEventListener("click", () => openConsultationDateCalendar("end"));
  DOM.consultationStartDateCalendarGrid.addEventListener("click", (event) => onConsultationCalendarClick(event, "start"));
  DOM.consultationEndDateCalendarGrid.addEventListener("click", (event) => onConsultationCalendarClick(event, "end"));
  DOM.consultationStartDatePreviousMonth.addEventListener("click", () => shiftConsultationCalendarMonth("start", -1));
  DOM.consultationStartDateNextMonth.addEventListener("click", () => shiftConsultationCalendarMonth("start", 1));
  DOM.consultationStartDateTodayButton.addEventListener("click", () => selectConsultationToday("start"));
  DOM.consultationEndDatePreviousMonth.addEventListener("click", () => shiftConsultationCalendarMonth("end", -1));
  DOM.consultationEndDateNextMonth.addEventListener("click", () => shiftConsultationCalendarMonth("end", 1));
  DOM.consultationEndDateTodayButton.addEventListener("click", () => selectConsultationToday("end"));
  DOM.productionDatePickerButton.addEventListener("click", () => openConsultationDateCalendar("production"));
  DOM.productionDateCalendarGrid.addEventListener("click", (event) => onConsultationCalendarClick(event, "production"));
  DOM.productionDatePreviousMonth.addEventListener("click", () => shiftConsultationCalendarMonth("production", -1));
  DOM.productionDateNextMonth.addEventListener("click", () => shiftConsultationCalendarMonth("production", 1));
  DOM.productionDateTodayButton.addEventListener("click", selectProductionToday);
  window.addEventListener("resize", positionOpenConsultationDateCalendars);
  document.addEventListener("click", onConsultationCalendarOutsideClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeConsultationDateCalendars();
    }
  });
  DOM.consultationTableBody.addEventListener("click", onConsultationAction);
  DOM.recordEditorForm.addEventListener("submit", onSaveRecordChanges);
  DOM.cancelRecordEditButton.addEventListener("click", () => DOM.recordEditor.close());
  DOM.refreshDashboardButton.addEventListener("click", loadDashboard);
  DOM.monthSelector.addEventListener("change", loadDashboard);
}

function getCurrentMonthKey() {
  return formatDateKey(new Date()).slice(0, 7);
}

function formatDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDateForMexico(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function openConsultationDateCalendar(which) {
  const textInput = which === "production"
    ? DOM.productionDate
    : which === "start" ? DOM.consultationStartDate : DOM.consultationEndDate;
  const calendar = which === "production"
    ? DOM.productionDateCalendar
    : which === "start" ? DOM.consultationStartDateCalendar : DOM.consultationEndDateCalendar;
  const button = which === "production"
    ? DOM.productionDatePickerButton
    : which === "start" ? DOM.consultationStartDatePickerButton : DOM.consultationEndDatePickerButton;
  const selectedDate = parseMexicoDate(textInput.value);
  const month = selectedDate ? selectedDate.slice(0, 7) : formatDateKey(new Date()).slice(0, 7);

  closeConsultationDateCalendars();
  setConsultationCalendarMonth(which, month);
  calendar.hidden = false;
  button.setAttribute("aria-expanded", "true");
  renderConsultationDateCalendar(which);
  positionConsultationDateCalendar(calendar);
}

function positionOpenConsultationDateCalendars() {
  [DOM.consultationStartDateCalendar, DOM.consultationEndDateCalendar, DOM.productionDateCalendar]
    .filter((calendar) => !calendar.hidden)
    .forEach(positionConsultationDateCalendar);
}

function positionConsultationDateCalendar(calendar) {
  const control = calendar.parentElement;
  const controlRect = control.getBoundingClientRect();
  const calendarRect = calendar.getBoundingClientRect();
  const viewportPadding = 8;
  const maxLeft = Math.max(viewportPadding, window.innerWidth - calendarRect.width - viewportPadding);
  const left = Math.min(Math.max(controlRect.left, viewportPadding), maxLeft);

  calendar.style.left = `${left - controlRect.left}px`;
  calendar.style.right = "auto";
}

function closeConsultationDateCalendars() {
  DOM.consultationStartDateCalendar.hidden = true;
  DOM.consultationEndDateCalendar.hidden = true;
  DOM.productionDateCalendar.hidden = true;
  DOM.consultationStartDatePickerButton.setAttribute("aria-expanded", "false");
  DOM.consultationEndDatePickerButton.setAttribute("aria-expanded", "false");
  DOM.productionDatePickerButton.setAttribute("aria-expanded", "false");
}

function onConsultationCalendarOutsideClick(event) {
  if (!event.target.closest(".date-picker-control")) {
    closeConsultationDateCalendars();
  }
}

function setConsultationCalendarMonth(which, monthKey) {
  if (which === "production") {
    APP_STATE.productionCalendarMonth = monthKey;
  } else if (which === "start") {
    APP_STATE.consultation.startCalendarMonth = monthKey;
  } else {
    APP_STATE.consultation.endCalendarMonth = monthKey;
  }
}

function getConsultationCalendarMonth(which) {
  if (which === "production") {
    return APP_STATE.productionCalendarMonth;
  }
  return which === "start"
    ? APP_STATE.consultation.startCalendarMonth
    : APP_STATE.consultation.endCalendarMonth;
}

function shiftConsultationCalendarMonth(which, delta) {
  const currentMonth = getConsultationCalendarMonth(which);
  const [year, month] = currentMonth.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  setConsultationCalendarMonth(which, `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`);
  renderConsultationDateCalendar(which);
}

function renderConsultationDateCalendar(which) {
  const monthKey = getConsultationCalendarMonth(which);
  const [year, month] = monthKey.split("-").map(Number);
  const textInput = which === "production"
    ? DOM.productionDate
    : which === "start" ? DOM.consultationStartDate : DOM.consultationEndDate;
  const selectedDate = parseMexicoDate(textInput.value);
  const calendar = which === "production"
    ? DOM.productionDateCalendar
    : which === "start" ? DOM.consultationStartDateCalendar : DOM.consultationEndDateCalendar;
  const monthLabel = which === "production"
    ? DOM.productionDateMonthLabel
    : which === "start" ? DOM.consultationStartDateMonthLabel : DOM.consultationEndDateMonthLabel;
  const grid = which === "production"
    ? DOM.productionDateCalendarGrid
    : which === "start" ? DOM.consultationStartDateCalendarGrid : DOM.consultationEndDateCalendarGrid;
  const monthDate = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mondayOffset = (monthDate.getUTCDay() + 6) % 7;

  monthLabel.textContent = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(monthDate);
  grid.replaceChildren();

  ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach((weekday) => {
    const heading = document.createElement("span");
    heading.className = "calendar-weekday";
    heading.textContent = weekday;
    grid.appendChild(heading);
  });

  for (let blank = 0; blank < mondayOffset; blank += 1) {
    const emptyCell = document.createElement("span");
    emptyCell.className = "calendar-empty";
    emptyCell.setAttribute("aria-hidden", "true");
    grid.appendChild(emptyCell);
  }

  const today = formatDateKey(new Date());
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayButton = document.createElement("button");
    dayButton.type = "button";
    dayButton.className = "calendar-day";
    dayButton.dataset.date = dateKey;
    dayButton.textContent = String(day);
    dayButton.setAttribute("aria-label", new Intl.DateTimeFormat("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(date));
    if (dateKey === selectedDate) {
      dayButton.classList.add("selected");
      dayButton.setAttribute("aria-pressed", "true");
    }
    if (dateKey === today) {
      dayButton.classList.add("today");
    }
    grid.appendChild(dayButton);
  }

  while (grid.children.length % 7 !== 0) {
    const emptyCell = document.createElement("span");
    emptyCell.className = "calendar-empty";
    emptyCell.setAttribute("aria-hidden", "true");
    grid.appendChild(emptyCell);
  }
  const dateType = which === "production" ? "de producción" : which === "start" ? "inicial" : "final";
  calendar.setAttribute("aria-label", `Calendario de fecha ${dateType}, ${monthLabel.textContent}`);
}

function onConsultationCalendarClick(event, which) {
  const dayButton = event.target.closest("button[data-date]");
  if (!dayButton) {
    return;
  }
  const input = which === "production"
    ? DOM.productionDate
    : which === "start" ? DOM.consultationStartDate : DOM.consultationEndDate;
  input.value = formatDateForMexico(dayButton.dataset.date);
  closeConsultationDateCalendars();
  if (which === "production") {
    return;
  }
  if (which === "start") {
    onConsultationStartDateChange();
  } else {
    invalidateConsultationResults();
  }
}

function selectProductionToday() {
  DOM.productionDate.value = formatDateForMexico(formatDateKey(new Date()));
  closeConsultationDateCalendars();
}

function selectConsultationToday(which) {
  const input = which === "start" ? DOM.consultationStartDate : DOM.consultationEndDate;
  input.value = formatDateForMexico(formatDateKey(new Date()));
  closeConsultationDateCalendars();
  if (which === "start") {
    onConsultationStartDateChange();
  } else {
    invalidateConsultationResults();
  }
}

function onConsultationStartDateChange() {
  if (parseMexicoDate(DOM.consultationStartDate.value)) {
    DOM.consultationEndDate.value = "";
  }
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
  const shifted = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + deltaDays));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
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
  DOM.currentDate.textContent = now.toLocaleDateString("es-MX", { timeZone: APP_TIME_ZONE });
  DOM.currentTime.textContent = now.toLocaleTimeString("es-MX", { timeZone: APP_TIME_ZONE });
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
  const activityOptions = Array.from(DOM.activitySelect.options).filter((option) => option.value);
  const currentActivityIndex = activityOptions.findIndex((option) => option.value === payload.activity);
  const nextActivityIndex = (currentActivityIndex + 1) % activityOptions.length;
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
    DOM.productionDate.value = formatDateForMexico(payload.date);
    DOM.operatorSelect.value = selectedOperator;
    DOM.captureUserInput.value = selectedCaptureUser;
    DOM.activitySelect.value = activityOptions[nextActivityIndex].value;
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
    date: parseMexicoDate(DOM.productionDate.value),
    time: now.toLocaleTimeString("es-MX", { timeZone: APP_TIME_ZONE }),
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
      minuteBucket: new Intl.DateTimeFormat("sv-SE", {
        timeZone: APP_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }).format(now)
    }),
    sourceDevice: navigator.userAgent
  };
}

function validatePayload(payload) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    return { ok: false, message: "Debe seleccionar una fecha valida." };
  }

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

    renderDashboard();
  } catch (error) {
    console.error(error);
    setFormMessage("No se pudo actualizar el dashboard.", "error");
  } finally {
    DOM.refreshDashboardButton.disabled = false;
  }
}

function renderDashboard() {
  DOM.kpiTotalDay.textContent = formatQuantity(APP_STATE.dashboard.totalDay);
  DOM.kpiTotalMonth.textContent = formatQuantity(APP_STATE.dashboard.totalMonth);
  DOM.kpiBalanceDay.textContent = formatQuantity(APP_STATE.dashboard.balanceDay);
  DOM.kpiMonthReception.textContent = formatQuantity(APP_STATE.dashboard.monthlyReception);
  DOM.kpiMonthDelivered.textContent = formatQuantity(APP_STATE.dashboard.monthlyDelivered);
  DOM.kpiMonthLabel.textContent = APP_STATE.dashboard.monthKey
    ? `Periodo ${APP_STATE.dashboard.monthKey}`
    : "Periodo --";
  DOM.kpiFlowMonthLabel.textContent = APP_STATE.dashboard.monthKey
    ? `Periodo ${APP_STATE.dashboard.monthKey}`
    : "Periodo --";

  if (DOM.monthSelector.value !== APP_STATE.dashboard.monthKey && APP_STATE.dashboard.monthKey) {
    DOM.monthSelector.value = APP_STATE.dashboard.monthKey;
  }

  renderStatList(DOM.activityListMonth, APP_STATE.activities, APP_STATE.dashboard.byActivityMonth);
  renderStatList(DOM.shiftListMonth, APP_STATE.shiftOptions, APP_STATE.dashboard.byShiftMonth);
  renderOperatorTable(DOM.operatorTableBodyMonth, APP_STATE.dashboard.byOperatorMonth);
}

function renderStatList(targetElement, keys, valuesMap) {
  targetElement.innerHTML = "";
  keys.forEach((key) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${key}</span><strong>${formatQuantity(valuesMap[key] || 0)}</strong>`;
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
      <td>${formatQuantity(item.total)}</td>
    `;
    targetElement.appendChild(tr);
  });
}

function formatQuantity(value) {
  return NUMBER_FORMATTER.format(Number(value));
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
  DOM.consultationTableHead.replaceChildren();
  DOM.consultationTableFoot.replaceChildren();
  setConsultationMessage("Cargando registros...", "");

  try {
    const records = isSingleDate
      ? await callApi("getRecordsByDate", { date: startDate })
      : await callApi("getRecordsByDateRange", { startDate, endDate });
    APP_STATE.consultation.records = Array.isArray(records) ? records : [];
    renderConsultation(isSingleDate);
    setConsultationMessage(successMessage || "", successMessage ? "success" : "");
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
  DOM.consultationTableFoot.replaceChildren();
  setConsultationMessage("", "");
}

function renderConsultation(isSingleDate) {
  const headers = isSingleDate
    ? ["Actividad", "Cantidad", ""]
    : ["Actividad", "Cantidad acumulada"];
  DOM.consultationTableHead.replaceChildren();
  DOM.consultationTableBody.replaceChildren();
  DOM.consultationTableFoot.replaceChildren();

  const headerRow = document.createElement("tr");
  headers.forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    if (isSingleDate && text === "") {
      th.setAttribute("aria-label", "Acciones");
    }
    headerRow.appendChild(th);
  });
  DOM.consultationTableHead.appendChild(headerRow);

  const total = APP_STATE.consultation.records.reduce((sum, record) => sum + Number(record.quantity || 0), 0);

  if (!isSingleDate) {
    const groups = new Map();
    APP_STATE.consultation.records.forEach((record) => {
      const key = String(record.activity || "");
      const group = groups.get(key) || {
        activity: record.activity,
        quantity: 0
      };
      group.quantity += Number(record.quantity || 0);
      groups.set(key, group);
    });
    [...groups.values()]
      .sort(compareConsultationActivities)
      .forEach((record) => {
        const row = document.createElement("tr");
        [record.activity, formatQuantity(Number(record.quantity || 0))].forEach((value) => {
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
        row.dataset.recordId = record.id;
        [record.activity, formatQuantity(Number(record.quantity || 0))].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value || "";
          row.appendChild(cell);
        });

        const actions = document.createElement("td");
        actions.className = "consultation-actions";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "btn-secondary btn-small";
        editButton.dataset.action = "edit";
        editButton.dataset.id = record.id;
        editButton.setAttribute("aria-label", "Editar registro");
        editButton.title = "Editar";
        editButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="m14 5 5 5M4 20l4-.8L19 8.2 15.8 5 4.8 16 4 20Z"></path></svg>';

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn-danger btn-small";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.id = record.id;
        deleteButton.setAttribute("aria-label", "Eliminar registro");
        deleteButton.title = "Eliminar";
        deleteButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M5 7h14M9 7V5h6v2m3 0-1 13H7L6 7m4 4v6m4-6v6"></path></svg>';
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

  const totalRow = document.createElement("tr");
  const totalLabel = document.createElement("th");
  totalLabel.scope = "row";
  totalLabel.colSpan = headers.length - 1;
  totalLabel.textContent = "Total";
  const totalValue = document.createElement("td");
  totalValue.id = "consultationTotal";
  totalValue.textContent = formatQuantity(total);
  totalRow.append(totalLabel, totalValue);
  if (isSingleDate) {
    totalRow.appendChild(document.createElement("td"));
  }
  DOM.consultationTableFoot.appendChild(totalRow);
}

function updateConsultationRecordRow(record) {
  const row = findConsultationRecordRow(record.id);
  if (!row) {
    throw new Error("No se encontro la fila del registro actualizado en la consulta.");
  }

  row.children[0].textContent = record.activity || "";
  row.children[1].textContent = formatQuantity(Number(record.quantity || 0));

  const sortedRecords = [...APP_STATE.consultation.records].sort((a, b) => compareConsultationActivities(a, b)
    || String(a.time || "").localeCompare(String(b.time || ""))
    || String(a.operator || "").localeCompare(String(b.operator || ""), "es"));
  const recordIndex = sortedRecords.findIndex((item) => String(item.id) === String(record.id));
  const nextRecord = sortedRecords[recordIndex + 1];
  const nextRow = nextRecord
    ? findConsultationRecordRow(nextRecord.id)
    : null;
  DOM.consultationTableBody.insertBefore(row, nextRow);
  updateConsultationTotal();
}

function findConsultationRecordRow(recordId) {
  return [...DOM.consultationTableBody.querySelectorAll("tr[data-record-id]")]
    .find((row) => row.dataset.recordId === String(recordId));
}

function updateConsultationTotal() {
  const total = APP_STATE.consultation.records.reduce((sum, record) => sum + Number(record.quantity || 0), 0);
  const totalValue = DOM.consultationTableFoot.querySelector("#consultationTotal");
  if (!totalValue) {
    throw new Error("No se encontro el total de la consulta actual.");
  }
  totalValue.textContent = formatQuantity(total);
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
  const activeElement = DOM.recordEditor.ownerDocument.activeElement;
  if (DOM.recordEditor.contains(activeElement)) {
    activeElement.blur();
  }
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
  const recordId = APP_STATE.consultation.editingRecordId;
  const record = APP_STATE.consultation.records.find((item) => String(item.id) === String(recordId));
  if (!record) {
    setRecordEditorMessage("El registro ya no esta en la consulta actual. Cierra y vuelve a buscar.", "error");
    return;
  }
  if (!findConsultationRecordRow(recordId)) {
    setRecordEditorMessage("No se encontro la fila del registro en la consulta actual.", "error");
    return;
  }

  DOM.saveRecordChangesButton.disabled = true;
  setRecordEditorMessage("Guardando cambios...", "");
  try {
    await callApi("updateProductionRecord", {
      id: recordId,
      date: parseMexicoDate(DOM.consultationStartDate.value),
      operator: DOM.recordEditorOperator.value,
      shift: DOM.recordEditorShift.value,
      activity: DOM.recordEditorActivity.value,
      quantity,
      observations: DOM.recordEditorObservations.value.trim(),
      captureUser: DOM.recordEditorCaptureUser.value
    });
    Object.assign(record, {
      operator: DOM.recordEditorOperator.value,
      shift: DOM.recordEditorShift.value,
      activity: DOM.recordEditorActivity.value,
      quantity,
      observations: DOM.recordEditorObservations.value.trim(),
      captureUser: DOM.recordEditorCaptureUser.value
    });
    updateConsultationRecordRow(record);
    DOM.recordEditor.close();
    setConsultationMessage("Registro actualizado correctamente.", "success");
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
  const row = findConsultationRecordRow(record.id);
  if (!row) {
    setConsultationMessage("No se encontro la fila del registro en la consulta actual.", "error");
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
    APP_STATE.consultation.records = APP_STATE.consultation.records
      .filter((item) => String(item.id) !== String(record.id));
    row.remove();
    if (APP_STATE.consultation.records.length === 0) {
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 3;
      emptyCell.className = "empty-state";
      emptyCell.textContent = "Sin registros para mostrar.";
      emptyRow.appendChild(emptyCell);
      DOM.consultationTableBody.appendChild(emptyRow);
    }
    updateConsultationTotal();
    DOM.consultationTableBody.querySelectorAll("button[data-action]").forEach((button) => {
      button.disabled = false;
    });
    setConsultationMessage("Registro eliminado correctamente.", "success");
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

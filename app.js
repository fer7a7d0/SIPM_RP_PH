/*
  Control de Produccion - Frontend principal
    APP_STATE.dashboard.monthlyFlowSelectedActivities = new Set(
      activityNames.filter(isDefaultMonthlyFlowActivity).map(getMonthlyFlowActivityKey)
    );
  - Estado global de la app
    const availableActivityKeys = new Set(activityNames.map(getMonthlyFlowActivityKey));
  - Validaciones de captura
      [...APP_STATE.dashboard.monthlyFlowSelectedActivities].filter((key) => availableActivityKeys.has(key))
  - Render de dashboard y exportacion CSV local
*/

// Reemplazar con la URL del despliegue de Apps Script (Web App).
const API_BASE_URL = "https://script.google.com/macros/s/AKfycbxjNEChoA7H0_U4YH1Iow-YMF1wFtSrkhJookVm-aFOrk0Y94FMQDvaZ3jOTpSSsLm9/exec";
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
    averageDailyMonth: 0,
    balanceDay: 0,
    monthlyReception: 0,
    monthlyDelivered: 0,
    monthlyPH: 0,
    monthlyFlowByMonth: [],
    monthlyFlowSelectedActivities: null,
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
  recordEditorCalendarMonth: "",
  monthlyFlowChartYear: "",
  duplicateCache: new Set()
};

const DOM = {
  currentDate: document.getElementById("currentDate"),
  currentTime: document.getElementById("currentTime"),
  productionDate: document.getElementById("productionDate"),
  productionDateDisplay: document.getElementById("productionDateDisplay"),
  productionDatePickerButton: document.getElementById("productionDatePickerButton"),
  productionDateCalendar: document.getElementById("productionDateCalendar"),
  productionDateMonthLabel: document.getElementById("productionDateMonthLabel"),
  productionDateCalendarGrid: document.getElementById("productionDateCalendarGrid"),
  productionDatePreviousMonth: document.getElementById("productionDatePreviousMonth"),
  productionDateNextMonth: document.getElementById("productionDateNextMonth"),
  productionDateTodayButton: document.getElementById("productionDateTodayButton"),
  recordEditorDatePickerButton: document.getElementById("recordEditorDatePickerButton"),
  recordEditorDateCalendar: document.getElementById("recordEditorDateCalendar"),
  recordEditorDateMonthLabel: document.getElementById("recordEditorDateMonthLabel"),
  recordEditorDateCalendarGrid: document.getElementById("recordEditorDateCalendarGrid"),
  recordEditorDatePreviousMonth: document.getElementById("recordEditorDatePreviousMonth"),
  recordEditorDateNextMonth: document.getElementById("recordEditorDateNextMonth"),
  recordEditorDateTodayButton: document.getElementById("recordEditorDateTodayButton"),
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
  consultationStartDateDisplay: document.getElementById("consultationStartDateDisplay"),
  consultationStartDatePickerButton: document.getElementById("consultationStartDatePickerButton"),
  consultationStartDateCalendar: document.getElementById("consultationStartDateCalendar"),
  consultationStartDateMonthLabel: document.getElementById("consultationStartDateMonthLabel"),
  consultationStartDateCalendarGrid: document.getElementById("consultationStartDateCalendarGrid"),
  consultationStartDatePreviousMonth: document.getElementById("consultationStartDatePreviousMonth"),
  consultationStartDateNextMonth: document.getElementById("consultationStartDateNextMonth"),
  consultationStartDateTodayButton: document.getElementById("consultationStartDateTodayButton"),
  consultationEndDate: document.getElementById("consultationEndDate"),
  consultationEndDateDisplay: document.getElementById("consultationEndDateDisplay"),
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
  recordEditorTime: document.getElementById("recordEditorTime"),
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
  kpiAverageDailyMonth: document.getElementById("kpiAverageDailyMonth"),
  kpiTotalMonth: document.getElementById("kpiTotalMonth"),
  kpiBalanceDay: document.getElementById("kpiBalanceDay"),
  kpiMonthReception: document.getElementById("kpiMonthReception"),
  kpiMonthDelivered: document.getElementById("kpiMonthDelivered"),
  kpiMonthPH: document.getElementById("kpiMonthPH"),
  monthlyFlowChartYear: document.getElementById("monthlyFlowChartYear"),
  monthlyFlowChartActivityFilter: document.getElementById("monthlyFlowChartActivityFilter"),
  monthlyFlowChartActivityOptions: document.getElementById("monthlyFlowChartActivityOptions"),
  monthlyFlowChartSelectedCount: document.getElementById("monthlyFlowChartSelectedCount"),
  monthlyFlowChartSelectAll: document.getElementById("monthlyFlowChartSelectAll"),
  monthlyFlowChartDeselectAll: document.getElementById("monthlyFlowChartDeselectAll"),
  monthlyFlowChartPlot: document.getElementById("monthlyFlowChartPlot"),
  monthlyFlowChartSvg: document.getElementById("monthlyFlowChartSvg"),
  monthlyFlowChartTooltip: document.getElementById("monthlyFlowChartTooltip"),
  shiftTableBodyMonth: document.getElementById("shiftTableBodyMonth"),
  shiftTableTotalMonth: document.getElementById("shiftTableTotalMonth"),
  operatorTableBodyMonth: document.getElementById("operatorTableBodyMonth"),
  operatorTableTotalMonth: document.getElementById("operatorTableTotalMonth")
};

function initApp() {
  bindEvents();
  renderStaticActivities();
  initializeDashboardFilters();
  DOM.productionDate.value = formatDateForMexico(formatDateKey(new Date()));
  syncDateDisplayFromValue("production");
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
  DOM.productionDateDisplay.addEventListener("click", () => openConsultationDateCalendar("production"));
  DOM.consultationStartDateDisplay.addEventListener("click", () => openConsultationDateCalendar("start"));
  DOM.consultationEndDateDisplay.addEventListener("click", () => openConsultationDateCalendar("end"));
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
    syncDateDisplayFromValue("start");
    syncDateDisplayFromValue("end");
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
  DOM.recordEditorDatePickerButton.addEventListener("click", () => openConsultationDateCalendar("editor"));
  DOM.recordEditorDateCalendarGrid.addEventListener("click", (event) => onConsultationCalendarClick(event, "editor"));
  DOM.recordEditorDatePreviousMonth.addEventListener("click", () => shiftConsultationCalendarMonth("editor", -1));
  DOM.recordEditorDateNextMonth.addEventListener("click", () => shiftConsultationCalendarMonth("editor", 1));
  DOM.recordEditorDateTodayButton.addEventListener("click", selectRecordEditorToday);
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
  DOM.monthlyFlowChartYear.addEventListener("change", drawMonthlyFlowChart);
  DOM.monthlyFlowChartActivityOptions.addEventListener("change", onMonthlyFlowActivityChange);
  DOM.monthlyFlowChartSelectAll.addEventListener("click", () => setAllMonthlyFlowActivities(true));
  DOM.monthlyFlowChartDeselectAll.addEventListener("click", () => setAllMonthlyFlowActivities(false));
  window.addEventListener("resize", drawMonthlyFlowChart);
  document.addEventListener("click", onMonthlyFlowChartOutsideClick);
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
  const textInput = which === "editor"
    ? DOM.recordEditorDate
    : which === "production" ? DOM.productionDate
      : which === "start" ? DOM.consultationStartDate : DOM.consultationEndDate;
  const calendar = which === "editor"
    ? DOM.recordEditorDateCalendar
    : which === "production" ? DOM.productionDateCalendar
      : which === "start" ? DOM.consultationStartDateCalendar : DOM.consultationEndDateCalendar;
  const button = which === "editor"
    ? DOM.recordEditorDatePickerButton
    : which === "production" ? DOM.productionDatePickerButton
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
  [DOM.consultationStartDateCalendar, DOM.consultationEndDateCalendar, DOM.productionDateCalendar, DOM.recordEditorDateCalendar]
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
  DOM.recordEditorDateCalendar.hidden = true;
  DOM.consultationStartDatePickerButton.setAttribute("aria-expanded", "false");
  DOM.consultationEndDatePickerButton.setAttribute("aria-expanded", "false");
  DOM.productionDatePickerButton.setAttribute("aria-expanded", "false");
  DOM.recordEditorDatePickerButton.setAttribute("aria-expanded", "false");
}

function onConsultationCalendarOutsideClick(event) {
  if (!event.target.closest(".date-picker-control")) {
    closeConsultationDateCalendars();
  }
}

function setConsultationCalendarMonth(which, monthKey) {
  if (which === "editor") {
    APP_STATE.recordEditorCalendarMonth = monthKey;
  } else if (which === "production") {
    APP_STATE.productionCalendarMonth = monthKey;
  } else if (which === "start") {
    APP_STATE.consultation.startCalendarMonth = monthKey;
  } else {
    APP_STATE.consultation.endCalendarMonth = monthKey;
  }
}

function getConsultationCalendarMonth(which) {
  if (which === "editor") {
    return APP_STATE.recordEditorCalendarMonth;
  }
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
  const textInput = which === "editor"
    ? DOM.recordEditorDate
    : which === "production" ? DOM.productionDate
      : which === "start" ? DOM.consultationStartDate : DOM.consultationEndDate;
  const selectedDate = parseMexicoDate(textInput.value);
  const calendar = which === "editor"
    ? DOM.recordEditorDateCalendar
    : which === "production" ? DOM.productionDateCalendar
      : which === "start" ? DOM.consultationStartDateCalendar : DOM.consultationEndDateCalendar;
  const monthLabel = which === "editor"
    ? DOM.recordEditorDateMonthLabel
    : which === "production" ? DOM.productionDateMonthLabel
      : which === "start" ? DOM.consultationStartDateMonthLabel : DOM.consultationEndDateMonthLabel;
  const grid = which === "editor"
    ? DOM.recordEditorDateCalendarGrid
    : which === "production" ? DOM.productionDateCalendarGrid
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
  const dateType = which === "editor" ? "del registro"
    : which === "production" ? "de producción" : which === "start" ? "inicial" : "final";
  calendar.setAttribute("aria-label", `Calendario de fecha ${dateType}, ${monthLabel.textContent}`);
}

function onConsultationCalendarClick(event, which) {
  const dayButton = event.target.closest("button[data-date]");
  if (!dayButton) {
    return;
  }
  const input = which === "editor"
    ? DOM.recordEditorDate
    : which === "production" ? DOM.productionDate
      : which === "start" ? DOM.consultationStartDate : DOM.consultationEndDate;
  input.value = formatDateForMexico(dayButton.dataset.date);
  if (which !== "editor") {
    syncDateDisplayFromValue(which);
  }
  closeConsultationDateCalendars();
  if (which === "production" || which === "editor") {
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
  syncDateDisplayFromValue("production");
  closeConsultationDateCalendars();
}

function selectRecordEditorToday() {
  DOM.recordEditorDate.value = formatDateForMexico(formatDateKey(new Date()));
  closeConsultationDateCalendars();
}

function selectConsultationToday(which) {
  const input = which === "start" ? DOM.consultationStartDate : DOM.consultationEndDate;
  input.value = formatDateForMexico(formatDateKey(new Date()));
  syncDateDisplayFromValue(which);
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
    syncDateDisplayFromValue("end");
  }
  invalidateConsultationResults();
}

function getDateControl(which) {
  if (which === "production") {
    return {
      valueInput: DOM.productionDate,
      displayInput: DOM.productionDateDisplay
    };
  }
  if (which === "start") {
    return {
      valueInput: DOM.consultationStartDate,
      displayInput: DOM.consultationStartDateDisplay
    };
  }
  return {
    valueInput: DOM.consultationEndDate,
    displayInput: DOM.consultationEndDateDisplay
  };
}

function syncDateDisplayFromValue(which) {
  const { valueInput, displayInput } = getDateControl(which);
  displayInput.value = valueInput.value || "";
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
    syncDateDisplayFromValue("production");
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
    APP_STATE.dashboard.byShiftMonth = data.byShiftMonth || {};
    APP_STATE.dashboard.byOperatorMonth = data.byOperatorMonth || [];
    APP_STATE.dashboard.averageDailyMonth = data.averageDailyMonth || 0;
    APP_STATE.dashboard.balanceDay = data.balanceDay || 0;
    APP_STATE.dashboard.monthlyReception = data.monthlyReception || 0;
    APP_STATE.dashboard.monthlyDelivered = data.monthlyDelivered || 0;
    APP_STATE.dashboard.monthlyPH = data.monthlyPH || 0;
    APP_STATE.dashboard.monthlyFlowByMonth = data.monthlyFlowByMonth || [];

    renderDashboard();
  } catch (error) {
    console.error(error);
    setFormMessage("No se pudo actualizar el dashboard.", "error");
  } finally {
    DOM.refreshDashboardButton.disabled = false;
  }
}

function renderDashboard() {
  DOM.kpiAverageDailyMonth.textContent = formatQuantity(Math.round(APP_STATE.dashboard.averageDailyMonth));
  DOM.kpiTotalMonth.textContent = formatQuantity(APP_STATE.dashboard.totalMonth);
  DOM.kpiBalanceDay.textContent = formatQuantity(APP_STATE.dashboard.balanceDay);
  DOM.kpiMonthReception.textContent = formatQuantity(APP_STATE.dashboard.monthlyReception);
  DOM.kpiMonthDelivered.textContent = formatQuantity(APP_STATE.dashboard.monthlyDelivered);
  DOM.kpiMonthPH.textContent = formatQuantity(APP_STATE.dashboard.monthlyPH);
  renderMonthlyFlowChart();

  if (DOM.monthSelector.value !== APP_STATE.dashboard.monthKey && APP_STATE.dashboard.monthKey) {
    DOM.monthSelector.value = APP_STATE.dashboard.monthKey;
  }

  renderShiftTable(DOM.shiftTableBodyMonth, APP_STATE.shiftOptions, APP_STATE.dashboard.byShiftMonth);
  renderOperatorTable(DOM.operatorTableBodyMonth, APP_STATE.dashboard.byOperatorMonth);
  const totalMonth = formatQuantity(APP_STATE.dashboard.totalMonth);
  DOM.shiftTableTotalMonth.textContent = totalMonth;
  DOM.operatorTableTotalMonth.textContent = totalMonth;
}

function renderMonthlyFlowChart() {
  const historicalData = APP_STATE.dashboard.monthlyFlowByMonth || [];
  const activityNames = getMonthlyFlowActivityNames(historicalData);
  const currentYear = formatDateKey(new Date()).slice(0, 4);
  const availableYears = [...new Set(historicalData.map((month) => String(month.monthKey).slice(0, 4)))];
  if (!availableYears.includes(currentYear)) {
    availableYears.push(currentYear);
  }
  availableYears.sort((yearA, yearB) => Number(yearB) - Number(yearA));

  const previousYear = DOM.monthlyFlowChartYear.value || APP_STATE.monthlyFlowChartYear;
  DOM.monthlyFlowChartYear.replaceChildren();
  availableYears.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    DOM.monthlyFlowChartYear.appendChild(option);
  });
  APP_STATE.monthlyFlowChartYear = availableYears.includes(previousYear) ? previousYear : availableYears[0];
  DOM.monthlyFlowChartYear.value = APP_STATE.monthlyFlowChartYear;

  if (APP_STATE.dashboard.monthlyFlowSelectedActivities === null) {
    APP_STATE.dashboard.monthlyFlowSelectedActivities = new Set(
      activityNames.filter(isDefaultMonthlyFlowActivity).map(getMonthlyFlowActivityKey)
    );
  } else {
    const availableActivityKeys = new Set(activityNames.map(getMonthlyFlowActivityKey));
    APP_STATE.dashboard.monthlyFlowSelectedActivities = new Set(
      [...APP_STATE.dashboard.monthlyFlowSelectedActivities].filter((key) => availableActivityKeys.has(key))
    );
  }

  renderMonthlyFlowActivityOptions(activityNames);
  drawMonthlyFlowChart();
}

function getMonthlyFlowActivityNames(historicalData) {
  const candidates = [...new Set([
    ...historicalData.flatMap((month) => Object.keys(month.activities || {})),
    ...APP_STATE.activities
  ].filter(Boolean))];
  const seenKeys = new Set();
  return candidates.filter((activity) => {
    const key = getMonthlyFlowActivityKey(activity);
    if (seenKeys.has(key)) {
      return false;
    }
    seenKeys.add(key);
    return true;
  }).sort((activityA, activityB) => getMonthlyFlowActivityLabel(activityA)
    .localeCompare(getMonthlyFlowActivityLabel(activityB), "es", { numeric: true, sensitivity: "base" }));
}

function isDefaultMonthlyFlowActivity(activity) {
  const normalized = normalizeMonthlyFlowActivity(activity);
  return normalized.startsWith("01 recepcion de cilindros")
    || normalized.startsWith("11 entrega de cilindros")
    || normalized === "05 ph"
    || normalized === "prueba hidrostatica (ph)";
}

function normalizeMonthlyFlowActivity(activity) {
  return String(activity || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getMonthlyFlowActivityLabel(activity) {
  return activity;
}

function getMonthlyFlowActivityKey(activity) {
  const normalized = normalizeMonthlyFlowActivity(activity);
  if (normalized.startsWith("01 recepcion de cilindros")) {
    return "01 recepcion de cilindros";
  }
  if (normalized.startsWith("11 entrega de cilindros")) {
    return "11 entrega de cilindros";
  }
  if (normalized === "05 ph" || normalized === "prueba hidrostatica (ph)") {
    return "05 ph";
  }
  return normalized;
}

function getMonthlyFlowActivityColor(activity, activityNames) {
  const index = Math.max(0, activityNames.indexOf(activity));
  return `var(--chart-series-${(index % 12) + 1})`;
}

function renderMonthlyFlowActivityOptions(activityNames) {
  DOM.monthlyFlowChartActivityOptions.replaceChildren();
  activityNames.forEach((activity) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.activity = activity;
    checkbox.dataset.activityKey = getMonthlyFlowActivityKey(activity);
    checkbox.checked = APP_STATE.dashboard.monthlyFlowSelectedActivities.has(checkbox.dataset.activityKey);

    const swatch = document.createElement("span");
    swatch.className = "monthly-flow-chart-activity-swatch";
    swatch.style.backgroundColor = getMonthlyFlowActivityColor(activity, activityNames);
    swatch.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.textContent = getMonthlyFlowActivityLabel(activity);
    label.append(checkbox, swatch, text);
    DOM.monthlyFlowChartActivityOptions.appendChild(label);
  });
  updateMonthlyFlowActivityCount();
}

function onMonthlyFlowActivityChange(event) {
  const checkbox = event.target.closest("input[type='checkbox'][data-activity]");
  if (!checkbox) {
    return;
  }
  if (checkbox.checked) {
    APP_STATE.dashboard.monthlyFlowSelectedActivities.add(checkbox.dataset.activityKey);
  } else {
    APP_STATE.dashboard.monthlyFlowSelectedActivities.delete(checkbox.dataset.activityKey);
  }
  updateMonthlyFlowActivityCount();
  drawMonthlyFlowChart();
}

function setAllMonthlyFlowActivities(selected) {
  const checkboxes = [...DOM.monthlyFlowChartActivityOptions.querySelectorAll("input[data-activity]")];
  APP_STATE.dashboard.monthlyFlowSelectedActivities = new Set(
    selected ? checkboxes.map((checkbox) => checkbox.dataset.activityKey) : []
  );
  checkboxes.forEach((checkbox) => {
    checkbox.checked = selected;
  });
  updateMonthlyFlowActivityCount();
  drawMonthlyFlowChart();
}

function updateMonthlyFlowActivityCount() {
  const count = APP_STATE.dashboard.monthlyFlowSelectedActivities.size;
  DOM.monthlyFlowChartSelectedCount.textContent = `${count} ${count === 1 ? "seleccionada" : "seleccionadas"}`;
}

function getMonthlyFlowActivityValue(month, activity) {
  const activityKey = getMonthlyFlowActivityKey(activity);
  const matchingActivities = Object.entries(month.activities || {})
    .filter(([name]) => getMonthlyFlowActivityKey(name) === activityKey);
  if (matchingActivities.length > 0) {
    return matchingActivities.reduce((total, [, value]) => total + (Number(value) || 0), 0);
  }
  const normalized = normalizeMonthlyFlowActivity(activity);
  if (normalized.startsWith("01 recepcion de cilindros")) {
    return Number(month.reception) || 0;
  }
  if (normalized.startsWith("11 entrega de cilindros")) {
    return Number(month.delivered) || 0;
  }
  return 0;
}

function drawMonthlyFlowChart() {
  const historicalData = APP_STATE.dashboard.monthlyFlowByMonth || [];

  const year = DOM.monthlyFlowChartYear.value || APP_STATE.monthlyFlowChartYear;
  APP_STATE.monthlyFlowChartYear = year;
  const monthMap = new Map(historicalData.map((item) => [item.monthKey, item]));
  const yearMonths = Array.from({ length: 12 }, (_, index) => {
    const monthKey = `${year}-${String(index + 1).padStart(2, "0")}`;
    const values = monthMap.get(monthKey) || {};
    return {
      monthKey,
      monthNumber: index + 1,
      activities: values.activities || {},
      reception: Number(values.reception) || 0,
      delivered: Number(values.delivered) || 0
    };
  });
  const allActivityNames = getMonthlyFlowActivityNames(historicalData);
  const selectedActivityKeys = [...(APP_STATE.dashboard.monthlyFlowSelectedActivities || [])];
  const selectedActivities = selectedActivityKeys
    .map((key) => allActivityNames.find((activity) => getMonthlyFlowActivityKey(activity) === key))
    .filter(Boolean);
  const canShowActivityAverage = selectedActivities.length === 1;
  const months = yearMonths.filter((month) => selectedActivities.some((activity) => getMonthlyFlowActivityValue(month, activity) > 0));
  const averageByActivity = new Map(selectedActivities.map((activity) => {
    const values = months.map((month) => getMonthlyFlowActivityValue(month, activity)).filter((value) => value > 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    return [activity, values.length ? total / values.length : 0];
  }));
  const averageEntries = canShowActivityAverage
    ? selectedActivities
      .map((activity) => ({ activity, average: averageByActivity.get(activity) || 0 }))
      .filter((entry) => entry.average > 0)
    : [];
  const maxValue = Math.max(0,
    ...months.flatMap((month) => selectedActivities.map((activity) => getMonthlyFlowActivityValue(month, activity))),
    ...averageEntries.map((entry) => entry.average)
  );
  const compactFormatter = new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 });
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const isMobile = DOM.monthlyFlowChartPlot.clientWidth < 440;
  const baseWidth = DOM.monthlyFlowChartPlot.clientWidth || 320;
  const plotLeft = isMobile ? 30 : 42;
  const plotRight = 10;
  const minimumGroupWidth = selectedActivities.length
    ? Math.min(110, Math.max(28, 12 + selectedActivities.length * 7))
    : 0;
  const width = Math.max(
    baseWidth,
    (minimumGroupWidth * Math.max(months.length, 1)) + plotLeft + plotRight + 20
  );
  const height = isMobile ? 250 : 286;
  const plotTop = averageEntries.length ? 28 : 12;
  const plotBottom = height - 38;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = width - plotLeft - plotRight;
  const groupWidth = plotWidth / Math.max(months.length, 1);
  const activityGap = Math.min(3, groupWidth * 0.04);
  const barWidth = selectedActivities.length ? Math.min(18, Math.max(1, ((groupWidth - 4) / selectedActivities.length) * 0.72)) : 0;

  DOM.monthlyFlowChartTooltip.hidden = true;
  DOM.monthlyFlowChartSvg.style.width = `${width}px`;
  DOM.monthlyFlowChartSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  DOM.monthlyFlowChartSvg.setAttribute("aria-label", months.length
    ? `Actividades seleccionadas de ${months.length} meses con registros de ${year}`
    : `Sin registros para las actividades seleccionadas en ${year}`);
  DOM.monthlyFlowChartSvg.replaceChildren();

  if (months.length > 0) {
    for (let tick = 0; tick <= 4; tick += 1) {
      const fraction = tick / 4;
      const y = plotBottom - fraction * plotHeight;
      const tickValue = maxValue * fraction;
      const line = createMonthlyFlowSvgElement("line", {
        x1: plotLeft,
        x2: width - plotRight,
        y1: y,
        y2: y,
        class: "monthly-flow-chart-gridline"
      });
      const label = createMonthlyFlowSvgElement("text", {
        x: plotLeft - 7,
        y: y + 4,
        class: "monthly-flow-chart-axis-label",
        "text-anchor": "end"
      }, compactFormatter.format(tickValue));
      DOM.monthlyFlowChartSvg.append(line, label);
    }
  }

  months.forEach((month, index) => {
    const center = plotLeft + groupWidth * (index + 0.5);
    const barsWidth = selectedActivities.length * barWidth + Math.max(0, selectedActivities.length - 1) * activityGap;
    const firstBarX = center - barsWidth / 2;
    selectedActivities.forEach((activity, activityIndex) => {
      const value = getMonthlyFlowActivityValue(month, activity);
      const label = getMonthlyFlowActivityLabel(activity);
      const color = getMonthlyFlowActivityColor(activity, allActivityNames);
      const x = firstBarX + activityIndex * (barWidth + activityGap);
      appendMonthlyFlowBar(month, monthNames[month.monthNumber - 1], value, label, color, x, barWidth, maxValue, plotBottom, plotHeight);
    });

    const monthLabel = createMonthlyFlowSvgElement("text", {
      x: center,
      y: height - 10,
      class: "monthly-flow-chart-month-label",
      "text-anchor": "middle"
    }, monthNames[month.monthNumber - 1]);
    DOM.monthlyFlowChartSvg.appendChild(monthLabel);
  });

  if (averageEntries.length > 0 && months.length > 0) {
    averageEntries.forEach((entry) => {
      const label = getMonthlyFlowActivityTooltipLabel(entry.activity);
      const monthsWithRecords = months.filter((month) => getMonthlyFlowActivityValue(month, entry.activity) > 0).length;
      const color = getMonthlyFlowActivityColor(entry.activity, allActivityNames);
      const lineY = plotBottom - (entry.average / maxValue) * plotHeight;
      const line = createMonthlyFlowSvgElement("line", {
        x1: plotLeft,
        x2: width - plotRight,
        y1: lineY,
        y2: lineY,
        class: "monthly-flow-chart-average-line",
        stroke: color,
        tabindex: 0,
        role: "img",
        "aria-label": `${label}: promedio mensual ${formatMonthlyFlowAverage(entry.average)} cilindros en ${monthsWithRecords} meses`
      });
      const tooltipText = `${label}: promedio ${formatMonthlyFlowAverage(entry.average)} cilindros/mes (${monthsWithRecords} ${monthsWithRecords === 1 ? "mes" : "meses"})`;
      addMonthlyFlowChartTooltipEvents(line, tooltipText);
      DOM.monthlyFlowChartSvg.appendChild(line);

      appendMonthlyFlowAverageValueLabel(entry.average, lineY, plotLeft, width - plotRight, plotTop, plotBottom);
    });
  }

  if (selectedActivities.length === 0 || months.length === 0) {
    const emptyLabel = createMonthlyFlowSvgElement("text", {
      x: plotLeft + plotWidth / 2,
      y: plotTop + plotHeight / 2,
      class: "monthly-flow-chart-empty-label",
      "text-anchor": "middle"
    }, selectedActivities.length === 0 ? "Selecciona una actividad para mostrarla" : "Sin registros para las actividades seleccionadas");
    DOM.monthlyFlowChartSvg.appendChild(emptyLabel);
  }
}

function createMonthlyFlowSvgElement(name, attributes, text) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function formatMonthlyFlowAverage(value) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(value);
}

function appendMonthlyFlowAverageValueLabel(average, lineY, plotLeft, plotRight, plotTop, plotBottom) {
  const labelText = `Promedio: ${formatQuantity(Math.round(average))}`;
  const valueLabel = createMonthlyFlowSvgElement("text", {
    class: "monthly-flow-chart-average-value-label",
    fill: "var(--color-text)",
    "text-anchor": "end",
    "aria-label": labelText
  }, labelText);
  DOM.monthlyFlowChartSvg.appendChild(valueLabel);

  const labelWidth = valueLabel.getBBox().width;
  const labelHeight = valueLabel.getBBox().height;
  const paddingX = 5;
  const paddingY = 3;
  const lineGap = 6;
  const placeAboveLine = lineY - plotTop >= labelHeight + paddingY * 2 + lineGap;
  let labelY = placeAboveLine
    ? lineY - paddingY - lineGap
    : lineY + labelHeight + paddingY + lineGap;
  const candidateXs = [plotRight - 5, plotLeft + (plotRight - plotLeft) * 0.78, plotLeft + (plotRight - plotLeft) * 0.55, plotLeft + (plotRight - plotLeft) * 0.32];
  const otherLabels = [...DOM.monthlyFlowChartSvg.querySelectorAll(".monthly-flow-chart-axis-label, .monthly-flow-chart-month-label")]
    .map((element) => element.getBoundingClientRect());
  let chosenX = candidateXs[0];
  let lowestOverlap = Infinity;

  candidateXs.forEach((x) => {
    const left = DOM.monthlyFlowChartSvg.getBoundingClientRect().left + x - labelWidth;
    const right = DOM.monthlyFlowChartSvg.getBoundingClientRect().left + x;
    const top = DOM.monthlyFlowChartSvg.getBoundingClientRect().top + labelY - labelHeight;
    const bottom = DOM.monthlyFlowChartSvg.getBoundingClientRect().top + labelY;
    const overlap = otherLabels.reduce((area, rect) => {
      const width = Math.max(0, Math.min(right, rect.right) - Math.max(left, rect.left));
      const height = Math.max(0, Math.min(bottom, rect.bottom) - Math.max(top, rect.top));
      return area + width * height;
    }, 0);
    if (overlap < lowestOverlap) {
      lowestOverlap = overlap;
      chosenX = x;
    }
  });

  valueLabel.setAttribute("x", String(chosenX));
  valueLabel.setAttribute("y", String(labelY));
  let textBounds = valueLabel.getBBox();
  const lineClearance = placeAboveLine
    ? lineY - lineGap - (textBounds.y + textBounds.height + paddingY)
    : textBounds.y - paddingY - lineY - lineGap;
  if (lineClearance < 0) {
    labelY += placeAboveLine ? lineClearance : -lineClearance;
    valueLabel.setAttribute("y", String(labelY));
    textBounds = valueLabel.getBBox();
  }
  const background = createMonthlyFlowSvgElement("rect", {
    class: "monthly-flow-chart-average-value-background",
    x: String(textBounds.x - paddingX),
    y: String(textBounds.y - paddingY),
    width: String(textBounds.width + paddingX * 2),
    height: String(textBounds.height + paddingY * 2),
    rx: "4",
    "aria-hidden": "true"
  });
  DOM.monthlyFlowChartSvg.insertBefore(background, valueLabel);
}

function addMonthlyFlowChartTooltipEvents(element, text) {
  element.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") {
      showMonthlyFlowChartTooltip(element, text, event);
    }
  });
  element.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") {
      DOM.monthlyFlowChartTooltip.hidden = true;
    }
  });
  element.addEventListener("focus", () => showMonthlyFlowChartTooltip(element, text));
  element.addEventListener("blur", () => {
    DOM.monthlyFlowChartTooltip.hidden = true;
  });
  element.addEventListener("click", (event) => showMonthlyFlowChartTooltip(element, text, event));
}

function appendMonthlyFlowBar(month, monthName, value, seriesLabel, color, x, width, maxValue, plotBottom, plotHeight) {
  const barHeight = maxValue ? (value / maxValue) * plotHeight : 0;
  const minimumHitHeight = 10;
  const rectHeight = value > 0 ? Math.max(barHeight, 1) : minimumHitHeight;
  const bar = createMonthlyFlowSvgElement("rect", {
    x,
    y: plotBottom - rectHeight,
    width,
    height: rectHeight,
    rx: 2,
    class: `monthly-flow-chart-bar ${value > 0 ? "" : "monthly-flow-chart-zero-bar"}`,
    tabindex: value > 0 ? 0 : -1,
    role: "img",
    "aria-label": `${monthName}: ${seriesLabel}, ${formatQuantity(value)} cilindros`
  });
  bar.style.fill = value > 0 ? color : "transparent";
  const tooltipLabel = getMonthlyFlowActivityTooltipLabel(seriesLabel);
  const tooltipText = `${tooltipLabel}: ${formatQuantity(value)} cilindros`;
  addMonthlyFlowChartTooltipEvents(bar, tooltipText);
  DOM.monthlyFlowChartSvg.appendChild(bar);
}

function getMonthlyFlowActivityTooltipLabel(activity) {
  const normalized = normalizeMonthlyFlowActivity(activity);
  if (normalized.startsWith("01 recepcion de cilindros")) {
    return "Recepción";
  }
  if (normalized.startsWith("11 entrega de cilindros")) {
    return "Entregados";
  }
  if (normalized === "05 ph" || normalized === "prueba hidrostatica (ph)") {
    return "PH";
  }
  return activity;
}

function showMonthlyFlowChartTooltip(bar, text, event) {
  const tooltip = DOM.monthlyFlowChartTooltip;
  const plotRect = DOM.monthlyFlowChartPlot.getBoundingClientRect();
  const barRect = bar.getBoundingClientRect();
  tooltip.textContent = text;
  tooltip.hidden = false;

  const pointerX = event && Number.isFinite(event.clientX)
    ? event.clientX - plotRect.left
    : barRect.left - plotRect.left + barRect.width / 2;
  const pointerY = event && Number.isFinite(event.clientY)
    ? event.clientY - plotRect.top
    : barRect.top - plotRect.top;
  const padding = 6;
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  const candidates = [
    { left: pointerX + 10, top: pointerY - tooltipHeight - 9 },
    { left: pointerX + 10, top: pointerY + 9 },
    { left: pointerX - tooltipWidth - 10, top: pointerY - tooltipHeight - 9 },
    { left: pointerX - tooltipWidth - 10, top: pointerY + 9 }
  ];
  const chartLabelRects = [...DOM.monthlyFlowChartSvg.querySelectorAll(".monthly-flow-chart-axis-label, .monthly-flow-chart-month-label")]
    .map((label) => {
      const rect = label.getBoundingClientRect();
      return {
        left: rect.left - plotRect.left,
        right: rect.right - plotRect.left,
        top: rect.top - plotRect.top,
        bottom: rect.bottom - plotRect.top
      };
    });
  const placements = candidates.map((candidate) => {
    const left = Math.max(padding, Math.min(candidate.left, plotRect.width - tooltipWidth - padding));
    const top = Math.max(padding, Math.min(candidate.top, plotRect.height - tooltipHeight - padding));
    const overlap = chartLabelRects.reduce((area, label) => {
      const overlapWidth = Math.max(0, Math.min(left + tooltipWidth, label.right) - Math.max(left, label.left));
      const overlapHeight = Math.max(0, Math.min(top + tooltipHeight, label.bottom) - Math.max(top, label.top));
      return area + overlapWidth * overlapHeight;
    }, 0);
    return { left, top, overlap };
  }).sort((placementA, placementB) => placementA.overlap - placementB.overlap);

  tooltip.style.left = `${placements[0].left}px`;
  tooltip.style.top = `${placements[0].top}px`;
}

function onMonthlyFlowChartOutsideClick(event) {
  if (!event.target.closest(".monthly-flow-chart-plot")) {
    DOM.monthlyFlowChartTooltip.hidden = true;
  }
  if (!event.target.closest("#monthlyFlowChartActivityFilter")) {
    DOM.monthlyFlowChartActivityFilter.open = false;
  }
}

function renderShiftTable(targetElement, keys, valuesMap) {
  targetElement.replaceChildren();
  keys.forEach((key) => {
    const row = document.createElement("tr");
    const shiftCell = document.createElement("td");
    const quantityCell = document.createElement("td");
    shiftCell.textContent = key;
    quantityCell.textContent = formatQuantity(valuesMap[key] || 0);
    row.append(shiftCell, quantityCell);
    targetElement.appendChild(row);
  });
}

function renderOperatorTable(targetElement, rows) {
  targetElement.replaceChildren();
  rows.forEach((item) => {
    const tr = document.createElement("tr");
    const operatorCell = document.createElement("td");
    const quantityCell = document.createElement("td");
    operatorCell.textContent = item.operator;
    quantityCell.textContent = formatQuantity(item.total);
    tr.append(operatorCell, quantityCell);
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
  DOM.recordEditorDate.value = formatDateForMexico(record.date);
  DOM.recordEditorTime.textContent = `Hora: ${record.time}`;
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
  const date = parseMexicoDate(DOM.recordEditorDate.value);
  if (!date) {
    setRecordEditorMessage("Debe ingresar una fecha valida en formato dd/mm/aaaa.", "error");
    return;
  }
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
      date,
      originalDate: record.date,
      operator: DOM.recordEditorOperator.value,
      shift: DOM.recordEditorShift.value,
      activity: DOM.recordEditorActivity.value,
      quantity,
      observations: DOM.recordEditorObservations.value.trim(),
      captureUser: DOM.recordEditorCaptureUser.value
    });
    Object.assign(record, {
      date,
      operator: DOM.recordEditorOperator.value,
      shift: DOM.recordEditorShift.value,
      activity: DOM.recordEditorActivity.value,
      quantity,
      observations: DOM.recordEditorObservations.value.trim(),
      captureUser: DOM.recordEditorCaptureUser.value
    });
    if (isRecordDateInConsultationRange(record.date)) {
      updateConsultationRecordRow(record);
    } else {
      removeConsultationRecordFromResults(record.id);
    }
    DOM.recordEditor.close();
    setConsultationMessage("Registro actualizado correctamente.", "success");
  } catch (error) {
    console.error(error);
    setRecordEditorMessage(error.message || "No se pudo actualizar el registro.", "error");
  } finally {
    DOM.saveRecordChangesButton.disabled = false;
  }
}

function isRecordDateInConsultationRange(date) {
  const startDate = parseMexicoDate(DOM.consultationStartDate.value);
  const endDate = parseMexicoDate(DOM.consultationEndDate.value);
  if (!startDate) {
    return true;
  }
  return endDate ? date >= startDate && date <= endDate : date === startDate;
}

function removeConsultationRecordFromResults(recordId) {
  const row = findConsultationRecordRow(recordId);
  if (row) {
    row.remove();
  }
  APP_STATE.consultation.records = APP_STATE.consultation.records
    .filter((item) => String(item.id) !== String(recordId));
  if (APP_STATE.consultation.records.length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = DOM.consultationTableHead.querySelectorAll("th").length || 3;
    emptyCell.className = "empty-state";
    emptyCell.textContent = "Sin registros para mostrar.";
    emptyRow.appendChild(emptyCell);
    DOM.consultationTableBody.appendChild(emptyRow);
  }
  updateConsultationTotal();
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

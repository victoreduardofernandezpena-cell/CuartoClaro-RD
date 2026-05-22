import { firebaseConfig } from "./firebase-config.js";

const pesos = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2
});

const storageKey = "cuartoclaro-state-v2";
const firebaseReady = isFirebaseConfigured(firebaseConfig);
let firebaseService = null;
let firebaseLoadError = null;
if (firebaseReady) {
  try {
    const { createFirebaseService } = await import("./firebase-service.js");
    firebaseService = createFirebaseService(firebaseConfig);
  } catch (error) {
    firebaseLoadError = error;
  }
}
const palette = ["#0f8b6f", "#2457a6", "#d95f43", "#7a5cba", "#b95034", "#c28d2c", "#128c7e", "#8a6f2a"];

const initialState = {
  monthlyBudget: 0,
  usdRate: 59,
  categories: [],
  goals: [],
  expenses: [],
  chartMode: "category",
  dark: false
};

const savedState = readSavedState();
let state = savedState ? mergeState(savedState) : structuredClone(initialState);
let currentUser = null;
let cloudSaveTimer = null;

const elements = {
  themeToggle: document.querySelector("#themeToggle"),
  themeText: document.querySelector("#themeText"),
  usdAmount: document.querySelector("#usdAmount"),
  dopResult: document.querySelector("#dopResult"),
  spentMetric: document.querySelector("#spentMetric"),
  spentDelta: document.querySelector("#spentDelta"),
  availableMetric: document.querySelector("#availableMetric"),
  savingsMetric: document.querySelector("#savingsMetric"),
  savingsDelta: document.querySelector("#savingsDelta"),
  weeklyMetric: document.querySelector("#weeklyMetric"),
  dailyMetric: document.querySelector("#dailyMetric"),
  topCategoryMetric: document.querySelector("#topCategoryMetric"),
  sidebarBalance: document.querySelector("#sidebarBalance"),
  alertMetric: document.querySelector("#alertMetric"),
  alertTitle: document.querySelector("#alertTitle"),
  alertCopy: document.querySelector("#alertCopy"),
  expenseChart: document.querySelector("#expenseChart"),
  expenseForm: document.querySelector("#expenseForm"),
  categoryForm: document.querySelector("#categoryForm"),
  formMessage: document.querySelector("#formMessage"),
  expenseCategory: document.querySelector("#expenseCategory"),
  categoryFilter: document.querySelector("#categoryFilter"),
  periodFilter: document.querySelector("#periodFilter"),
  searchFilter: document.querySelector("#searchFilter"),
  minAmountFilter: document.querySelector("#minAmountFilter"),
  expenseList: document.querySelector("#expenseList"),
  budgetBars: document.querySelector("#budgetBars"),
  goalList: document.querySelector("#goalList"),
  categoryGrid: document.querySelector("#categoryGrid"),
  increaseBudget: document.querySelector("#increaseBudget"),
  exportButton: document.querySelector("#exportButton"),
  whatsappButton: document.querySelector("#whatsappButton"),
  authScreen: document.querySelector("#authScreen"),
  authMessage: document.querySelector("#authMessage"),
  googleLoginButton: document.querySelector("#googleLoginButton"),
  emailAuthForm: document.querySelector("#emailAuthForm"),
  localModeButton: document.querySelector("#localModeButton"),
  userName: document.querySelector("#userName"),
  logoutButton: document.querySelector("#logoutButton"),
  chartButtons: document.querySelectorAll("[data-chart]")
};

function mergeState(saved) {
  const merged = { ...initialState, ...saved };
  merged.categories = saved.categories || initialState.categories;
  merged.goals = saved.goals || initialState.goals;
  merged.expenses = saved.expenses || initialState.expenses;
  return merged;
}

function isFirebaseConfigured(config) {
  return Boolean(
    config?.apiKey &&
      config?.projectId &&
      !config.apiKey.includes("PEGA_AQUI") &&
      !config.projectId.includes("PEGA_AQUI")
  );
}

function readSavedState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch (error) {
    localStorage.removeItem(storageKey);
    return null;
  }
}

function persist() {
  const cleanState = serializeState();
  localStorage.setItem(storageKey, JSON.stringify(cleanState));

  if (!currentUser || !firebaseService) return;
  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(() => {
    firebaseService.saveUserState(currentUser.uid, cleanState).catch((error) => {
      showMessage(`No se pudo sincronizar: ${error.message}`, true);
    });
  }, 500);
}

function serializeState() {
  return {
    monthlyBudget: state.monthlyBudget,
    usdRate: state.usdRate,
    categories: state.categories,
    goals: state.goals,
    expenses: state.expenses,
    chartMode: state.chartMode,
    dark: state.dark
  };
}

function replaceState(nextState) {
  state = mergeState(nextState || initialState);
  renderSelectors();
  document.querySelector("#budgetTitle").textContent = pesos.format(state.monthlyBudget);
  elements.chartButtons.forEach((item) => item.classList.toggle("active", item.dataset.chart === state.chartMode));
  renderAll();
}

async function loadCloudState(user) {
  if (!firebaseService) return;
  try {
    const cloudState = await firebaseService.loadUserState(user.uid);
    if (cloudState) {
      replaceState(cloudState);
    } else {
      await firebaseService.saveUserState(user.uid, serializeState());
    }
  } catch (error) {
    showMessage(`No se pudieron cargar tus datos: ${error.message}`, true);
  }
}

function totalSpent(expenses = state.expenses) {
  return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
}

function categorySpent(name) {
  return state.expenses
    .filter((expense) => expense.category === name)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
}

function expensesThisWeek() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  return state.expenses.filter((expense) => new Date(`${expense.date}T12:00:00`) >= sevenDaysAgo);
}

function biggestCategory() {
  return state.categories
    .map((category) => ({ name: category.name, spent: categorySpent(category.name) }))
    .sort((a, b) => b.spent - a.spent)[0];
}

function updateConverter() {
  const usd = Number(elements.usdAmount.value || 0);
  elements.dopResult.textContent = pesos.format(usd * state.usdRate);
}

function renderMetrics() {
  const spent = totalSpent();
  const available = Math.max(state.monthlyBudget - spent, 0);
  const percent = state.monthlyBudget > 0 ? precisePercent(spent, state.monthlyBudget) : "0";
  const totalSaved = state.goals.reduce((sum, goal) => sum + goal.saved, 0);
  const weeklySpent = totalSpent(expensesThisWeek());
  const dailyAverage = spent / Math.max(new Date().getDate(), 1);
  const topCategory = biggestCategory();

  elements.spentMetric.textContent = pesos.format(spent);
  elements.availableMetric.textContent = pesos.format(available);
  elements.spentDelta.textContent = `${percent}% del presupuesto`;
  elements.savingsMetric.textContent = pesos.format(totalSaved);
  elements.savingsDelta.textContent = `${state.goals.length} metas activas`;
  elements.weeklyMetric.textContent = pesos.format(weeklySpent);
  elements.dailyMetric.textContent = pesos.format(dailyAverage);
  elements.topCategoryMetric.textContent = topCategory ? topCategory.name : "Sin datos";
  elements.sidebarBalance.textContent = pesos.format(available);

  const warning = Number(percent) >= 80;
  elements.alertMetric.classList.toggle("warning", warning);
  elements.alertTitle.textContent = warning ? "Cuidado" : "Todo bien";
  elements.alertCopy.textContent = warning
    ? "Ya pasaste el 80% del presupuesto mensual."
    : "Tus gastos estan dentro del plan.";
}

function renderSelectors() {
  const currentExpenseCategory = elements.expenseCategory.value;
  const currentFilter = elements.categoryFilter.value || "Todas";
  const options = state.categories
    .map((category) => `<option value="${category.name}">${category.name}</option>`)
    .join("");

  elements.expenseCategory.innerHTML = options || `<option value="">Agrega una categoria</option>`;
  elements.categoryFilter.innerHTML = `<option value="Todas">Todas</option>${options}`;
  elements.expenseCategory.value = currentExpenseCategory || state.categories[0]?.name || "";
  elements.categoryFilter.value = currentFilter;
}

function getFilteredExpenses() {
  const selected = elements.categoryFilter.value || "Todas";
  const period = elements.periodFilter.value;
  const search = elements.searchFilter.value.trim().toLowerCase();
  const min = Number(elements.minAmountFilter.value || 0);
  const today = new Date();

  return state.expenses
    .filter((expense) => selected === "Todas" || expense.category === selected)
    .filter((expense) => {
      const date = new Date(`${expense.date}T12:00:00`);
      if (period === "today") return date.toDateString() === today.toDateString();
      if (period === "week") {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        return date >= sevenDaysAgo;
      }
      return true;
    })
    .filter((expense) => expense.description.toLowerCase().includes(search))
    .filter((expense) => Number(expense.amount) >= min)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderExpenses() {
  const expenses = getFilteredExpenses();

  if (!expenses.length) {
    elements.expenseList.innerHTML = `<div class="empty-state">No hay gastos con esos filtros todavia.</div>`;
    return;
  }

  elements.expenseList.innerHTML = expenses
    .map(
      (expense) => `
        <article class="expense-item">
          <div>
            <strong>${escapeHtml(expense.description)}</strong>
            <span>${expense.category} - ${new Date(`${expense.date}T12:00:00`).toLocaleDateString("es-DO", {
              day: "numeric",
              month: "short"
            })}</span>
          </div>
          <div class="amount">${pesos.format(expense.amount)}</div>
        </article>
      `
    )
    .join("");
}

function renderBudgets() {
  if (!state.categories.length) {
    elements.budgetBars.innerHTML = `<div class="empty-state">Agrega una categoria para crear tu primer presupuesto.</div>`;
    return;
  }

  elements.budgetBars.innerHTML = state.categories
    .map((category) => {
      const spent = categorySpent(category.name);
      const percent = category.budget > 0 ? precisePercent(spent, category.budget) : "0";
      return `
        <article class="budget-item">
          <div class="panel-heading">
            <strong>${category.name}</strong>
            <span>${percent}%</span>
          </div>
          <div class="progress-track" aria-label="${percent}% usado">
            <div class="progress-fill ${Number(percent) >= 85 ? "hot" : ""}" style="--value: ${percent}%"></div>
          </div>
          <small>${pesos.format(spent)} de ${pesos.format(category.budget)}</small>
        </article>
      `;
    })
    .join("");
}

function renderGoals() {
  if (!state.goals.length) {
    elements.goalList.innerHTML = `<div class="empty-state">Tus metas de ahorro apareceran aqui cuando las agregues.</div>`;
    return;
  }

  elements.goalList.innerHTML = state.goals
    .map((goal) => {
      const percent = goal.target > 0 ? precisePercent(goal.saved, goal.target) : "0";
      return `
        <article class="goal-item">
          <div class="panel-heading">
            <strong>${goal.name}</strong>
            <span>${percent}%</span>
          </div>
          <div class="progress-track" aria-label="${percent}% completado">
            <div class="progress-fill" style="--value: ${percent}%"></div>
          </div>
          <small>${pesos.format(goal.saved)} de ${pesos.format(goal.target)}</small>
        </article>
      `;
    })
    .join("");
}

function renderCategories() {
  if (!state.categories.length) {
    elements.categoryGrid.innerHTML = `<div class="empty-state">No hay categorias todavia. Crea una para empezar.</div>`;
    return;
  }

  elements.categoryGrid.innerHTML = state.categories
    .map((category) => {
      const spent = categorySpent(category.name);
      const percent = category.budget > 0 ? precisePercent(spent, category.budget) : "0";
      return `
        <article class="category-card" style="--category-color: ${category.color}">
          <div>
            <strong>${category.name}</strong>
            <span>${percent}% usado de ${pesos.format(category.budget)}</span>
          </div>
          <div class="amount">${pesos.format(spent)}</div>
        </article>
      `;
    })
    .join("");
}

function drawChart() {
  const canvas = elements.expenseChart;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(330 * ratio);
  ctx.scale(ratio, ratio);
  const width = rect.width;
  const height = 330;
  ctx.clearRect(0, 0, width, height);
  ctx.font = "13px Inter, system-ui, sans-serif";
  ctx.fillStyle = getCss("--muted");

  if (state.chartMode === "trend") {
    drawTrend(ctx, width, height);
    return;
  }

  if (!state.categories.length || !state.expenses.length) {
    drawEmptyChart(ctx, width, height);
    return;
  }

  const data = state.categories.map((category) => ({
    ...category,
    spent: categorySpent(category.name),
    percent: category.budget > 0 ? precisePercent(categorySpent(category.name), category.budget) : "0"
  }));
  const max = Math.max(...data.map((item) => item.spent), 1);
  const barGap = width < 620 ? 8 : 16;
  const barWidth = Math.max(28, (width - 30 - barGap * (data.length - 1)) / data.length);

  data.forEach((item, index) => {
    const x = 15 + index * (barWidth + barGap);
    const barHeight = Math.max((item.spent / max) * 210, 8);
    const y = height - 78 - barHeight;
    ctx.fillStyle = item.color;
    roundedRect(ctx, x, y, barWidth, barHeight, 10);
    ctx.fill();
    ctx.fillStyle = getCss("--ink");
    ctx.fillText(`${item.percent}%`, x, Math.max(18, y - 8));
    ctx.fillStyle = getCss("--muted");
    ctx.fillText(item.name.slice(0, width < 620 ? 4 : 10), x, height - 42);
    ctx.fillText(shortMoney(item.spent), x, height - 20);
  });
}

function drawTrend(ctx, width, height) {
  if (!state.expenses.length) {
    drawEmptyChart(ctx, width, height);
    return;
  }

  const byDate = state.expenses.reduce((map, expense) => {
    map[expense.date] = (map[expense.date] || 0) + expense.amount;
    return map;
  }, {});
  const points = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));
  const max = Math.max(...points.map((point) => point.amount), 1);
  const left = 30;
  const bottom = height - 56;
  const usableWidth = width - 60;
  const usableHeight = 220;

  ctx.strokeStyle = getCss("--line");
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = bottom - (usableHeight / 3) * i;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();
  }

  ctx.strokeStyle = getCss("--accent");
  ctx.lineWidth = 4;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = left + (usableWidth / Math.max(points.length - 1, 1)) * index;
    const y = bottom - (point.amount / max) * usableHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  points.forEach((point, index) => {
    const x = left + (usableWidth / Math.max(points.length - 1, 1)) * index;
    const y = bottom - (point.amount / max) * usableHeight;
    ctx.fillStyle = getCss("--accent-2");
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = getCss("--muted");
    ctx.fillText(shortMoney(point.amount), x - 14, y - 12);
  });
}

function drawEmptyChart(ctx, width, height) {
  ctx.fillStyle = getCss("--muted");
  ctx.textAlign = "center";
  ctx.fillText("Agrega tus primeros gastos para ver el grafico.", width / 2, height / 2);
  ctx.textAlign = "left";
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function shortMoney(value) {
  if (value >= 1000) return `RD$${Math.round(value / 1000)}k`;
  return `RD$${value}`;
}

function precisePercent(value, total) {
  const percent = (Number(value) / Number(total)) * 100;
  if (!Number.isFinite(percent)) return "0";
  if (percent > 99 && percent < 100) return percent.toFixed(1);
  if (Number.isInteger(percent)) return String(percent);
  return percent.toFixed(1);
}

function getCss(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function renderTheme() {
  document.body.classList.toggle("dark", state.dark);
  elements.themeText.textContent = state.dark ? "Modo claro" : "Modo oscuro";
}

function bumpMetrics() {
  document.querySelectorAll(".metric, .summary-strip article").forEach((item) => {
    item.classList.remove("bump");
    requestAnimationFrame(() => item.classList.add("bump"));
  });
}

function showMessage(text, isError = false) {
  elements.formMessage.textContent = text;
  elements.formMessage.classList.toggle("error", isError);
  elements.formMessage.classList.add("show");
  window.setTimeout(() => elements.formMessage.classList.remove("show"), 2600);
}

function showAuthMessage(text, isError = false) {
  elements.authMessage.textContent = text;
  elements.authMessage.classList.toggle("error", isError);
  elements.authMessage.classList.add("show");
}

function setSession(user) {
  currentUser = user;
  elements.authScreen.classList.toggle("hidden", Boolean(user) || !firebaseReady);
  elements.userName.textContent = user ? user.displayName || user.email || "Cuenta activa" : "Modo local";
  elements.logoutButton.hidden = !user;
}

function exportCsv() {
  const rows = [["Fecha", "Descripcion", "Categoria", "Monto RD$"], ...state.expenses.map((expense) => [
    expense.date,
    expense.description,
    expense.category,
    expense.amount
  ])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "gastos-cuartoclaro-rd.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function shareWhatsApp() {
  const spent = pesos.format(totalSpent());
  const available = pesos.format(Math.max(state.monthlyBudget - totalSpent(), 0));
  const message = `Resumen CuartoClaro RD: gastado ${spent}, disponible ${available}.`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function renderAll(animate = false) {
  renderTheme();
  updateConverter();
  renderMetrics();
  renderExpenses();
  renderBudgets();
  renderGoals();
  renderCategories();
  drawChart();
  persist();
  if (animate) bumpMetrics();
}

elements.expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const description = data.get("description").trim();
  const amount = Number(data.get("amount"));

  if (!description || amount <= 0 || !data.get("category")) {
    showMessage("Agrega una categoria y revisa el monto.", true);
    return;
  }

  state.expenses.unshift({
    description,
    category: data.get("category"),
    amount,
    date: new Date().toISOString().slice(0, 10)
  });
  event.currentTarget.reset();
  showMessage("Gasto agregado correctamente.");
  renderAll(true);
});

elements.categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = data.get("name").trim();
  const budget = Number(data.get("budget"));

  if (state.categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
    showMessage("Esa categoria ya existe.", true);
    return;
  }

  state.categories.push({
    name,
    budget,
    color: palette[state.categories.length % palette.length]
  });
  event.currentTarget.reset();
  renderSelectors();
  showMessage("Categoria agregada.");
  renderAll(true);
});

elements.usdAmount.addEventListener("input", updateConverter);
elements.categoryFilter.addEventListener("change", renderExpenses);
elements.periodFilter.addEventListener("change", renderExpenses);
elements.searchFilter.addEventListener("input", renderExpenses);
elements.minAmountFilter.addEventListener("input", renderExpenses);
elements.exportButton.addEventListener("click", exportCsv);
elements.whatsappButton.addEventListener("click", shareWhatsApp);
elements.localModeButton.addEventListener("click", () => {
  elements.authScreen.classList.add("hidden");
  showAuthMessage("Modo local activo. Tus datos se guardan solo en este navegador.");
});

elements.googleLoginButton.addEventListener("click", async () => {
  if (!firebaseService) {
    showAuthMessage("Primero pega tus credenciales reales en firebase-config.js.", true);
    return;
  }

  try {
    showAuthMessage("Abriendo Google...");
    await firebaseService.signInGoogle();
  } catch (error) {
    showAuthMessage(error.message, true);
  }
});

elements.emailAuthForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!firebaseService) {
    showAuthMessage("Primero pega tus credenciales reales en firebase-config.js.", true);
    return;
  }

  const submitter = event.submitter;
  const action = submitter?.dataset.authAction || "login";
  const data = new FormData(event.currentTarget);
  const email = data.get("email");
  const password = data.get("password");

  try {
    showAuthMessage(action === "register" ? "Creando cuenta..." : "Iniciando sesion...");
    if (action === "register") {
      await firebaseService.registerEmail(email, password);
    } else {
      await firebaseService.signInEmail(email, password);
    }
  } catch (error) {
    showAuthMessage(error.message, true);
  }
});

elements.logoutButton.addEventListener("click", async () => {
  if (!firebaseService || !currentUser) {
    setSession(null);
    return;
  }

  await firebaseService.signOut();
});

elements.themeToggle.addEventListener("click", () => {
  state.dark = !state.dark;
  renderAll();
});

elements.increaseBudget.addEventListener("click", () => {
  state.monthlyBudget += 5000;
  document.querySelector("#budgetTitle").textContent = pesos.format(state.monthlyBudget);
  renderAll(true);
});

elements.chartButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.chartMode = button.dataset.chart;
    elements.chartButtons.forEach((item) => item.classList.toggle("active", item === button));
    drawChart();
    persist();
  });
});

window.addEventListener("resize", drawChart);

renderSelectors();
document.querySelector("#budgetTitle").textContent = pesos.format(state.monthlyBudget);
renderAll();

if (firebaseService) {
  firebaseService.onAuthStateChanged(async (user) => {
    setSession(user);
    if (user) {
      showAuthMessage("Cuenta conectada. Cargando tus datos...");
      await loadCloudState(user);
      elements.authScreen.classList.add("hidden");
    }
  });
} else {
  setSession(null);
  elements.authScreen.classList.remove("hidden");
  if (firebaseLoadError) {
    showAuthMessage(`No se pudo cargar Firebase: ${firebaseLoadError.message}`, true);
  }
}

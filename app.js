const pesos = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2
});

const palette = ["#0f8b6f", "#2457a6", "#d95f43", "#7a5cba", "#b95034", "#c28d2c", "#128c7e", "#8a6f2a"];

const initialState = {
  monthlyBudget: 85000,
  usdRate: 59,
  categories: [
    { name: "Comida", budget: 22000, color: "#0f8b6f" },
    { name: "Transporte", budget: 13500, color: "#2457a6" },
    { name: "Hogar", budget: 18000, color: "#d95f43" },
    { name: "Servicios", budget: 10500, color: "#7a5cba" },
    { name: "Salud", budget: 8000, color: "#b95034" },
    { name: "Ocio", budget: 13000, color: "#c28d2c" }
  ],
  goals: [
    { name: "Fondo de emergencia", target: 120000, saved: 56500 },
    { name: "Inicial vehiculo", target: 250000, saved: 83000 },
    { name: "Viaje familiar", target: 95000, saved: 41000 },
    { name: "Educacion", target: 75000, saved: 21500 },
    { name: "Inversion inicial", target: 180000, saved: 49500 }
  ],
  expenses: [
    { description: "Supermercado Nacional", category: "Comida", amount: 6250, date: "2026-05-21" },
    { description: "Combustible", category: "Transporte", amount: 3200, date: "2026-05-20" },
    { description: "Luz y agua", category: "Servicios", amount: 4875, date: "2026-05-18" },
    { description: "Farmacia", category: "Salud", amount: 1420, date: "2026-05-17" },
    { description: "Almuerzo oficina", category: "Comida", amount: 850, date: "2026-05-16" },
    { description: "Internet hogar", category: "Hogar", amount: 2850, date: "2026-05-15" },
    { description: "Cine", category: "Ocio", amount: 2100, date: "2026-05-12" }
  ],
  chartMode: "category",
  dark: false
};

const savedState = readSavedState();
const state = savedState ? mergeState(savedState) : initialState;

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
  chartButtons: document.querySelectorAll("[data-chart]")
};

function mergeState(saved) {
  const merged = { ...initialState, ...saved };
  merged.categories = mergeByName(initialState.categories, saved.categories || []);
  merged.goals = mergeByName(initialState.goals, saved.goals || []);
  merged.expenses = saved.expenses || initialState.expenses;
  return merged;
}

function readSavedState() {
  try {
    return JSON.parse(localStorage.getItem("cuartoclaro-state") || "null");
  } catch (error) {
    localStorage.removeItem("cuartoclaro-state");
    return null;
  }
}

function mergeByName(defaultItems, savedItems) {
  const map = new Map(defaultItems.map((item) => [item.name.toLowerCase(), item]));
  savedItems.forEach((item) => map.set(item.name.toLowerCase(), item));
  return Array.from(map.values());
}

function persist() {
  localStorage.setItem("cuartoclaro-state", JSON.stringify(state));
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
  const percent = Math.round((spent / state.monthlyBudget) * 100);
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

  const warning = percent >= 80;
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

  elements.expenseCategory.innerHTML = options;
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
  elements.budgetBars.innerHTML = state.categories
    .map((category) => {
      const spent = categorySpent(category.name);
      const percent = Math.round((spent / category.budget) * 100);
      return `
        <article class="budget-item">
          <div class="panel-heading">
            <strong>${category.name}</strong>
            <span>${percent}%</span>
          </div>
          <div class="progress-track" aria-label="${percent}% usado">
            <div class="progress-fill ${percent >= 85 ? "hot" : ""}" style="--value: ${percent}%"></div>
          </div>
          <small>${pesos.format(spent)} de ${pesos.format(category.budget)}</small>
        </article>
      `;
    })
    .join("");
}

function renderGoals() {
  elements.goalList.innerHTML = state.goals
    .map((goal) => {
      const percent = Math.round((goal.saved / goal.target) * 100);
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
  elements.categoryGrid.innerHTML = state.categories
    .map((category) => {
      const spent = categorySpent(category.name);
      const percent = Math.round((spent / category.budget) * 100);
      return `
        <article class="category-card" style="--category-color: ${category.color}">
          <div>
            <strong>${category.name}</strong>
            <span>${percent}% usado - presupuesto ${pesos.format(category.budget)}</span>
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

  const data = state.categories.map((category) => ({
    ...category,
    spent: categorySpent(category.name),
    percent: Math.round((categorySpent(category.name) / category.budget) * 100)
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

  if (!description || amount <= 0) {
    showMessage("Revisa la descripcion y el monto.", true);
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

const setupForm = document.getElementById("setup-form");
const budgetInput = document.getElementById("budget-input");
const itemsInput = document.getElementById("items-input");
const sessionSection = document.getElementById("session");
const addItemForm = document.getElementById("add-item-form");
const newItemInput = document.getElementById("new-item-input");
const itemList = document.getElementById("item-list");
const emptyState = document.getElementById("empty-state");
const itemsRemainingEl = document.getElementById("items-remaining");
const itemsPurchasedEl = document.getElementById("items-purchased");
const budgetTotalEl = document.getElementById("budget-total");
const budgetSpentEl = document.getElementById("budget-spent");
const budgetRemainingEl = document.getElementById("budget-remaining");
const budgetAlert = document.getElementById("budget-alert");
const resetButton = document.getElementById("reset-session");
const priceDialog = document.getElementById("price-dialog");
const priceDialogItem = document.getElementById("price-dialog-item");
const priceForm = document.getElementById("price-form");
const priceInput = document.getElementById("price-input");
const cancelPriceButton = document.getElementById("cancel-price");
const dialogBackdrop = document.getElementById("dialog-backdrop");
const itemTemplate = document.getElementById("item-template");

let idCounter = 0;
const state = {
  budget: 0,
  items: [],
  sessionActive: false,
};

let dialogContext = {
  itemId: null,
  action: null,
};

function formatCurrency(value) {
  const number = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(number);
}

function parseItems(listValue) {
  if (!listValue) return [];
  return listValue
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map(createItem);
}

function createItem(name) {
  return {
    id: `item-${++idCounter}`,
    name,
    status: "pending",
    price: null,
  };
}

function syncIdCounter() {
  const maxId = state.items.reduce((max, item) => {
    const parts = item.id.split("-");
    const numeric = Number.parseInt(parts[parts.length - 1], 10);
    if (Number.isFinite(numeric)) {
      return Math.max(max, numeric);
    }
    return max;
  }, 0);
  idCounter = maxId;
}

function calculateSpent() {
  return state.items.reduce((total, item) => {
    if (item.status === "bought" && typeof item.price === "number") {
      return total + item.price;
    }
    return total;
  }, 0);
}

function setSessionActive(active) {
  state.sessionActive = active;
  sessionSection.hidden = !active;
}

function resetSession() {
  state.budget = 0;
  state.items = [];
  idCounter = 0;
  setSessionActive(false);
  budgetInput.value = "";
  itemsInput.value = "";
  render();
}

function initializeSession(budgetValue, initialItems) {
  state.budget = budgetValue;
  state.items = initialItems;
  syncIdCounter();
  setSessionActive(true);
  render();
}

function renderBudgetSummary() {
  const spent = calculateSpent();
  const remaining = state.budget - spent;

  budgetTotalEl.textContent = formatCurrency(state.budget);
  budgetSpentEl.textContent = formatCurrency(spent);
  budgetRemainingEl.textContent = formatCurrency(remaining);
}

function renderList() {
  itemList.innerHTML = "";
  if (state.items.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const fragment = document.createDocumentFragment();
  state.items.forEach((item) => {
    const node = itemTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = item.id;
    node.dataset.status = item.status;

    const nameEl = node.querySelector(".item-name");
    nameEl.textContent = item.name;

    const statusEl = node.querySelector(".item-status");
    statusEl.textContent = item.status === "bought" ? "Purchased" : "Pending";
    statusEl.dataset.status = item.status;

    const priceEl = node.querySelector(".item-price");
    if (item.status === "bought" && typeof item.price === "number") {
      priceEl.textContent = `Price: ${formatCurrency(item.price)}`;
    } else {
      priceEl.textContent = "Awaiting price";
    }

    fragment.appendChild(node);
  });

  itemList.appendChild(fragment);
}

function renderListSummary() {
  const pendingCount = state.items.filter((item) => item.status !== "bought").length;
  const purchasedCount = state.items.length - pendingCount;

  itemsRemainingEl.textContent = `${pendingCount} pending`;
  itemsPurchasedEl.textContent = `${purchasedCount} purchased`;
}

function buildSuggestion() {
  const spent = calculateSpent();
  if (spent <= state.budget) {
    if (state.budget === 0) {
      return "Set a budget to unlock tracking and suggestions.";
    }
    const remaining = state.budget - spent;
    if (remaining <= state.budget * 0.1) {
      return `Only ${formatCurrency(remaining)} left. Prioritize essentials or look for deals on discretionary items.`;
    }
    if (state.items.length === 0) {
      return "Your list is empty. Add a few items to start planning.";
    }
    return "You're on track. Keep an eye on prices as you go.";
  }

  const overBy = spent - state.budget;
  const boughtItems = state.items.filter((item) => item.status === "bought");
  const highest = [...boughtItems].sort((a, b) => (b.price || 0) - (a.price || 0))[0];
  if (highest) {
    return `You're over budget by ${formatCurrency(overBy)}. Consider a store-brand alternative for "${highest.name}" or adjust another recent purchase.`;
  }
  return `Spending exceeds your budget by ${formatCurrency(overBy)}. Review your cart for swaps or removals.`;
}

function renderBudgetAlert() {
  const spent = calculateSpent();
  const message = buildSuggestion();
  budgetAlert.textContent = "";
  budgetAlert.classList.remove("over");

  if (!state.sessionActive) {
    budgetAlert.textContent = "";
    budgetAlert.hidden = true;
    return;
  }

  if (state.items.length === 0) {
    budgetAlert.textContent = message;
    budgetAlert.hidden = message.trim().length === 0;
    return;
  }

  if (spent > state.budget) {
    budgetAlert.textContent = message;
    budgetAlert.classList.add("over");
    budgetAlert.hidden = message.trim().length === 0;
  } else if (spent > state.budget * 0.9) {
    budgetAlert.textContent = message;
    budgetAlert.hidden = message.trim().length === 0;
  } else {
    budgetAlert.textContent = message;
    budgetAlert.hidden = message.trim().length === 0;
  }
}

function render() {
  renderBudgetSummary();
  renderList();
  renderListSummary();
  renderBudgetAlert();
}

function openPriceDialog(itemId, action) {
  dialogContext = { itemId, action };
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;
  priceDialogItem.textContent = item.name;
  priceInput.value = item.price ?? "";
  priceDialog.hidden = false;
  priceInput.focus({ preventScroll: true });
}

function closePriceDialog() {
  dialogContext = { itemId: null, action: null };
  priceDialog.hidden = true;
  priceForm.reset();
}

function upsertItemPrice(itemId, priceValue, action) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;
  item.price = priceValue;
  if (action === "buy" && priceValue >= 0) {
    item.status = "bought";
  }
  render();
}

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const budgetValue = Number.parseFloat(budgetInput.value);
  if (Number.isNaN(budgetValue) || budgetValue < 0) {
    budgetInput.focus();
    return;
  }

  const items = parseItems(itemsInput.value);
  initializeSession(budgetValue, items);
});

resetButton.addEventListener("click", () => {
  resetSession();
  budgetInput.focus();
});

addItemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = newItemInput.value.trim();
  if (!value) return;
  state.items.push(createItem(value));
  newItemInput.value = "";
  render();
  newItemInput.focus();
});

itemList.addEventListener("click", (event) => {
  const actionButton = event.target.closest("button");
  if (!actionButton) return;
  const itemNode = actionButton.closest(".item");
  if (!itemNode) return;
  const { id } = itemNode.dataset;

  if (actionButton.classList.contains("action-buy")) {
    openPriceDialog(id, "buy");
  } else if (actionButton.classList.contains("action-update")) {
    openPriceDialog(id, "update");
  } else if (actionButton.classList.contains("action-undo")) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    item.status = "pending";
    item.price = null;
    render();
  } else if (actionButton.classList.contains("action-remove")) {
    state.items = state.items.filter((entry) => entry.id !== id);
    render();
  }
});

priceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const priceValue = Number.parseFloat(priceInput.value);
  if (Number.isNaN(priceValue) || priceValue < 0) {
    priceInput.focus();
    return;
  }
  upsertItemPrice(dialogContext.itemId, priceValue, dialogContext.action);
  closePriceDialog();
});

cancelPriceButton.addEventListener("click", () => {
  closePriceDialog();
});

dialogBackdrop.addEventListener("click", () => {
  closePriceDialog();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !priceDialog.hidden) {
    closePriceDialog();
  }
});

render();

const STORAGE_KEY = "amphibianAcademyState";
const GAME_ID = "make10";
const TARGET_SUM = 10;
const TOTAL_ROUNDS = 10;
const BASE_FLIES = 5;
const PERFECT_BONUS = 50;
const PERFECT_UNLOCK_INTERVAL = 5;

const ITEM_CATALOG = [
  { id: "hat-lily-cap", slot: "hat", name: "Lily Cap" },
  { id: "shirt-ripple-tee", slot: "shirt", name: "Ripple Tee" },
  { id: "accessory-reed-charm", slot: "accessory", name: "Reed Charm" },
  { id: "glasses-pond-lens", slot: "glasses", name: "Pond Lens" },
  { id: "hat-crown", slot: "hat", name: "Frog Crown" },
  { id: "shirt-moss-hoodie", slot: "shirt", name: "Moss Hoodie" },
  { id: "accessory-firefly-pin", slot: "accessory", name: "Firefly Pin" },
  { id: "glasses-hero-shades", slot: "glasses", name: "Hero Shades" }
];

const STARTER_UNLOCKS = ["hat-lily-cap", "shirt-ripple-tee"];

const refs = {
  views: Array.from(document.querySelectorAll(".view")),
  navButtons: Array.from(document.querySelectorAll("[data-view]")),
  fliesCounter: document.getElementById("fliesCounter"),
  difficultySelect: document.getElementById("difficultySelect"),
  roundCounter: document.getElementById("roundCounter"),
  scoreCounter: document.getElementById("scoreCounter"),
  perfectCounter: document.getElementById("perfectCounter"),
  bestScoreCounter: document.getElementById("bestScoreCounter"),
  startGameBtn: document.getElementById("startGameBtn"),
  nextRoundBtn: document.getElementById("nextRoundBtn"),
  equationDisplay: document.getElementById("equationDisplay"),
  roundFeedback: document.getElementById("roundFeedback"),
  blockBoard: document.getElementById("blockBoard"),
  sessionRewardPreview: document.getElementById("sessionRewardPreview"),
  rewardHint: document.getElementById("rewardHint"),
  progressBar: document.getElementById("progressBar"),
  unlockMessage: document.getElementById("unlockMessage"),
  slotNodes: Array.from(document.querySelectorAll(".slot")),
  closetDropZone: document.getElementById("closetDropZone")
};

let state = loadState();
let displayedFlies = state.flies;
let fliesAnimationId = null;

let session = {
  active: false,
  round: 0,
  score: 0,
  sessionFlies: 0,
  roundResolved: false,
  blocks: [],
  selectedBlockId: null
};

const uiState = {
  activeView: "home",
  unlockMessage: "No new unlock yet."
};

initialize();

function initialize() {
  bindNavigation();
  bindGameControls();
  bindWardrobeEvents();
  refs.difficultySelect.value = state.settings.difficulty;
  showView("home");
  renderWardrobe();
  renderBlockBoard();
  updateGameUI();
}

function defaultState() {
  return {
    flies: 0,
    unlockedItems: STARTER_UNLOCKS.slice(),
    equipped: {
      hat: null,
      glasses: null,
      shirt: null,
      accessory: null
    },
    gameProgress: {
      [GAME_ID]: {
        bestScore: 0,
        perfectCompleted: 0,
        sessionsPlayed: 0
      }
    },
    settings: {
      difficulty: "easy"
    }
  };
}

function loadState() {
  const fallback = defaultState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    const merged = {
      ...fallback,
      ...parsed,
      equipped: {
        ...fallback.equipped,
        ...(parsed.equipped || {})
      },
      gameProgress: {
        ...fallback.gameProgress,
        ...(parsed.gameProgress || {})
      },
      settings: {
        ...fallback.settings,
        ...(parsed.settings || {})
      }
    };

    merged.unlockedItems = normalizeUnlockedItems(merged.unlockedItems);

    if (merged.unlockedItems.length === 0) {
      merged.unlockedItems = STARTER_UNLOCKS.slice();
    }

    merged.equipped = normalizeEquipped(merged.equipped, merged.unlockedItems);

    return merged;
  } catch (error) {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeUnlockedItems(unlockedItems) {
  if (!Array.isArray(unlockedItems)) {
    return STARTER_UNLOCKS.slice();
  }

  const validIds = new Set(ITEM_CATALOG.map((item) => item.id));
  const unique = [];

  for (const id of unlockedItems) {
    if (validIds.has(id) && !unique.includes(id)) {
      unique.push(id);
    }
  }

  for (const starter of STARTER_UNLOCKS) {
    if (!unique.includes(starter)) {
      unique.push(starter);
    }
  }

  return unique;
}

function normalizeEquipped(equipped, unlockedItems) {
  const unlockedSet = new Set(unlockedItems);
  const result = { ...defaultState().equipped };

  for (const slot of Object.keys(result)) {
    const itemId = equipped[slot];
    if (!itemId) {
      continue;
    }

    const item = getItemById(itemId);
    if (item && item.slot === slot && unlockedSet.has(itemId)) {
      result[slot] = itemId;
    }
  }

  return result;
}

function ensureProgress() {
  if (!state.gameProgress[GAME_ID]) {
    state.gameProgress[GAME_ID] = {
      bestScore: 0,
      perfectCompleted: 0,
      sessionsPlayed: 0
    };
  }
  return state.gameProgress[GAME_ID];
}

function bindNavigation() {
  refs.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      if (view) {
        showView(view);
      }
    });
  });
}

function showView(viewName) {
  uiState.activeView = viewName;

  refs.views.forEach((view) => {
    view.classList.toggle("hidden", view.dataset.view !== viewName);
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  if (viewName === "frog") {
    renderWardrobe();
  }
}

function bindGameControls() {
  refs.difficultySelect.addEventListener("change", () => {
    state.settings.difficulty = refs.difficultySelect.value;
    saveState();
    updateGameUI();
  });

  refs.startGameBtn.addEventListener("click", () => {
    startSession();
  });

  refs.nextRoundBtn.addEventListener("click", () => {
    if (!session.active || !session.roundResolved) {
      return;
    }

    if (session.round >= TOTAL_ROUNDS) {
      finishSession();
      return;
    }

    session.round += 1;
    setupRound();
    updateGameUI();
  });
}

function startSession() {
  session = {
    active: true,
    round: 1,
    score: 0,
    sessionFlies: 0,
    roundResolved: false,
    blocks: [],
    selectedBlockId: null
  };

  uiState.unlockMessage = "No new unlock yet.";
  refs.startGameBtn.textContent = "Restart Session";
  refs.nextRoundBtn.disabled = true;
  setupRound();
  updateGameUI();
}

function setupRound() {
  session.blocks = createRoundBlocks(state.settings.difficulty, session.round);
  session.roundResolved = false;
  session.selectedBlockId = null;
  refs.equationDisplay.textContent = "__ + __ = 10";
  setRoundFeedback("Combine two blocks to begin.", "");
  renderBlockBoard();
}

function createRoundBlocks(difficulty, round) {
  const config = {
    easy: { count: 4, min: 0, max: 10 },
    medium: { count: 5, min: 0, max: 12 },
    hard: { count: 6, min: 0, max: 14 }
  }[difficulty] || { count: 4, min: 0, max: 10 };

  const left = randomInt(0, 10);
  const right = TARGET_SUM - left;

  const values = [left, right];

  while (values.length < config.count) {
    values.push(randomInt(config.min, config.max));
  }

  const shuffled = shuffle(values);
  return shuffled.map((value, index) => ({
    id: `r${round}-b${index}-${Math.random().toString(16).slice(2, 6)}`,
    value,
    used: false
  }));
}

function renderBlockBoard() {
  refs.blockBoard.innerHTML = "";

  if (!session.active) {
    const placeholder = document.createElement("p");
    placeholder.textContent = "Press Start Session to begin.";
    refs.blockBoard.appendChild(placeholder);
    return;
  }

  const availableBlocks = session.blocks.filter((block) => !block.used);

  if (availableBlocks.length === 0) {
    const placeholder = document.createElement("p");
    placeholder.textContent = "Round complete.";
    refs.blockBoard.appendChild(placeholder);
    return;
  }

  availableBlocks.forEach((block) => {
    const node = document.createElement("button");
    node.type = "button";
    node.className = "block";
    node.textContent = String(block.value);
    node.dataset.blockId = block.id;
    node.draggable = !session.roundResolved;

    if (session.selectedBlockId === block.id) {
      node.classList.add("selected");
    }

    node.addEventListener("click", () => {
      onBlockClick(block.id);
    });

    node.addEventListener("dragstart", (event) => {
      if (session.roundResolved) {
        event.preventDefault();
        return;
      }

      event.dataTransfer.setData("text/plain", block.id);
      event.dataTransfer.effectAllowed = "move";
      session.selectedBlockId = block.id;
      renderBlockBoard();
    });

    node.addEventListener("dragover", (event) => {
      if (session.roundResolved) {
        return;
      }
      event.preventDefault();
      node.classList.add("drop-target");
    });

    node.addEventListener("dragleave", () => {
      node.classList.remove("drop-target");
    });

    node.addEventListener("drop", (event) => {
      event.preventDefault();
      node.classList.remove("drop-target");
      if (session.roundResolved) {
        return;
      }

      const sourceId = event.dataTransfer.getData("text/plain") || session.selectedBlockId;
      if (!sourceId || sourceId === block.id) {
        return;
      }

      resolveRoundFromBlocks(sourceId, block.id);
    });

    refs.blockBoard.appendChild(node);
  });
}

function onBlockClick(blockId) {
  if (!session.active || session.roundResolved) {
    return;
  }

  if (!session.selectedBlockId) {
    session.selectedBlockId = blockId;
    renderBlockBoard();
    return;
  }

  if (session.selectedBlockId === blockId) {
    session.selectedBlockId = null;
    renderBlockBoard();
    return;
  }

  resolveRoundFromBlocks(session.selectedBlockId, blockId);
}

function resolveRoundFromBlocks(sourceId, targetId) {
  const sourceBlock = session.blocks.find((block) => block.id === sourceId && !block.used);
  const targetBlock = session.blocks.find((block) => block.id === targetId && !block.used);

  if (!sourceBlock || !targetBlock || sourceId === targetId) {
    return;
  }

  const sourceValue = sourceBlock.value;
  const targetValue = targetBlock.value;
  const combinedValue = sourceValue + targetValue;

  sourceBlock.used = true;
  targetBlock.value = combinedValue;

  session.selectedBlockId = null;
  session.roundResolved = true;
  refs.nextRoundBtn.disabled = false;

  refs.equationDisplay.textContent = `${sourceValue} + ${targetValue} = ${combinedValue}`;

  if (combinedValue === TARGET_SUM) {
    session.score += 1;
    session.sessionFlies += BASE_FLIES;
    setRoundFeedback(`Correct! +${BASE_FLIES} flies.`, "good");
  } else {
    setRoundFeedback("Not 10 this round. Try again next round.", "bad");
  }

  renderBlockBoard();
  updateGameUI();
}

function finishSession() {
  if (!session.active) {
    return;
  }

  const progress = ensureProgress();
  progress.sessionsPlayed += 1;
  progress.bestScore = Math.max(progress.bestScore, session.score);

  const perfect = session.score === TOTAL_ROUNDS;
  let earnedFlies = session.score * BASE_FLIES;

  if (perfect) {
    earnedFlies = earnedFlies * 2 + PERFECT_BONUS;
    const previousPerfects = progress.perfectCompleted;
    progress.perfectCompleted += 1;

    const unlockDue = previousPerfects === 0 || progress.perfectCompleted % PERFECT_UNLOCK_INTERVAL === 0;
    if (unlockDue) {
      const unlocked = unlockNextItem();
      if (unlocked) {
        uiState.unlockMessage = `Unlocked: ${unlocked.name}`;
      } else {
        uiState.unlockMessage = "Perfect session! All cosmetics are already unlocked.";
      }
    } else {
      const nextUnlockIn = PERFECT_UNLOCK_INTERVAL - (progress.perfectCompleted % PERFECT_UNLOCK_INTERVAL);
      uiState.unlockMessage = `Perfect session. ${nextUnlockIn} more perfect session(s) until next unlock.`;
    }

    setRoundFeedback(`Perfect ${TOTAL_ROUNDS}/${TOTAL_ROUNDS}!`, "good");
  } else {
    uiState.unlockMessage = "No unlock this session. Keep building your streak.";
    setRoundFeedback(`Session complete: ${session.score}/${TOTAL_ROUNDS}.`, "");
  }

  state.flies += earnedFlies;
  saveState();

  refs.equationDisplay.textContent = "__ + __ = 10";
  refs.rewardHint.textContent = perfect
    ? `Perfect bonus applied: 2x score flies + ${PERFECT_BONUS}.`
    : "Perfect score = 2x flies + 50 bonus.";

  refs.startGameBtn.textContent = "Start New Session";
  refs.nextRoundBtn.disabled = true;

  session.active = false;
  session.roundResolved = false;
  session.selectedBlockId = null;

  renderWardrobe();
  renderBlockBoard();
  updateGameUI(earnedFlies);
}

function updateGameUI(lastEarned = 0) {
  const progress = ensureProgress();

  const roundText = session.active ? `${session.round} / ${TOTAL_ROUNDS}` : `0 / ${TOTAL_ROUNDS}`;
  refs.roundCounter.textContent = roundText;
  refs.scoreCounter.textContent = String(session.score);
  refs.perfectCounter.textContent = String(progress.perfectCompleted);
  refs.bestScoreCounter.textContent = String(progress.bestScore);
  refs.unlockMessage.textContent = uiState.unlockMessage;

  if (session.active) {
    refs.sessionRewardPreview.textContent = `Current Session Flies: ${session.sessionFlies}`;
  } else {
    refs.sessionRewardPreview.textContent = `Last Session Flies: ${lastEarned}`;
  }

  const completedRounds = session.active
    ? session.round - (session.roundResolved ? 0 : 1)
    : 0;
  const progressPercent = Math.min(100, (completedRounds / TOTAL_ROUNDS) * 100);
  refs.progressBar.style.width = `${progressPercent}%`;

  animateFlyCounter(state.flies);
}

function setRoundFeedback(message, tone) {
  refs.roundFeedback.textContent = message;
  refs.roundFeedback.className = "feedback";
  if (tone) {
    refs.roundFeedback.classList.add(tone);
  }
}

function animateFlyCounter(target) {
  if (fliesAnimationId) {
    cancelAnimationFrame(fliesAnimationId);
  }

  const start = displayedFlies;
  const delta = target - start;

  if (delta === 0) {
    refs.fliesCounter.textContent = String(target);
    return;
  }

  const duration = 360;
  const startedAt = performance.now();

  const tick = (now) => {
    const elapsed = now - startedAt;
    const progress = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const nextValue = Math.round(start + delta * eased);
    displayedFlies = nextValue;
    refs.fliesCounter.textContent = String(nextValue);

    if (progress < 1) {
      fliesAnimationId = requestAnimationFrame(tick);
      return;
    }

    displayedFlies = target;
    refs.fliesCounter.textContent = String(target);
  };

  fliesAnimationId = requestAnimationFrame(tick);
}

function unlockNextItem() {
  for (const item of ITEM_CATALOG) {
    if (!state.unlockedItems.includes(item.id)) {
      state.unlockedItems.push(item.id);
      return item;
    }
  }
  return null;
}

function bindWardrobeEvents() {
  refs.slotNodes.forEach((slotNode) => {
    slotNode.addEventListener("dragover", (event) => {
      const payload = parsePayload(event.dataTransfer.getData("text/plain"));
      if (!payload || !payload.itemId) {
        return;
      }

      const item = getItemById(payload.itemId);
      if (!item) {
        return;
      }

      if (item.slot === slotNode.dataset.slot) {
        event.preventDefault();
        slotNode.classList.add("drop-target");
      }
    });

    slotNode.addEventListener("dragleave", () => {
      slotNode.classList.remove("drop-target");
    });

    slotNode.addEventListener("drop", (event) => {
      event.preventDefault();
      slotNode.classList.remove("drop-target");

      const payload = parsePayload(event.dataTransfer.getData("text/plain"));
      if (!payload || !payload.itemId) {
        return;
      }

      equipItem(slotNode.dataset.slot, payload.itemId);
    });
  });

  refs.closetDropZone.addEventListener("dragover", (event) => {
    const payload = parsePayload(event.dataTransfer.getData("text/plain"));
    if (!payload) {
      return;
    }

    event.preventDefault();
    refs.closetDropZone.classList.add("drop-target");
  });

  refs.closetDropZone.addEventListener("dragleave", () => {
    refs.closetDropZone.classList.remove("drop-target");
  });

  refs.closetDropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    refs.closetDropZone.classList.remove("drop-target");

    const payload = parsePayload(event.dataTransfer.getData("text/plain"));
    if (!payload || !payload.originSlot) {
      return;
    }

    unequipItem(payload.originSlot);
  });
}

function renderWardrobe() {
  refs.slotNodes.forEach((slotNode) => {
    const slot = slotNode.dataset.slot;
    const equippedItemId = state.equipped[slot];
    slotNode.innerHTML = "";

    if (equippedItemId) {
      const item = getItemById(equippedItemId);
      if (item) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "slot-item";
        chip.textContent = item.name;
        chip.draggable = true;

        chip.addEventListener("dragstart", (event) => {
          const payload = JSON.stringify({ itemId: item.id, originSlot: slot });
          event.dataTransfer.setData("text/plain", payload);
          event.dataTransfer.effectAllowed = "move";
        });

        slotNode.appendChild(chip);
        return;
      }
    }

    const label = document.createElement("span");
    label.textContent = toTitle(slot);
    slotNode.appendChild(label);
  });

  refs.closetDropZone.innerHTML = "";

  ITEM_CATALOG.forEach((item) => {
    const unlocked = state.unlockedItems.includes(item.id);

    if (!unlocked) {
      const locked = document.createElement("div");
      locked.className = "closet-item locked";
      locked.textContent = `Locked ${toTitle(item.slot)}`;
      refs.closetDropZone.appendChild(locked);
      return;
    }

    const node = document.createElement("button");
    node.type = "button";
    node.className = "closet-item";
    node.draggable = true;

    const equippedBy = findItemEquippedSlot(item.id);
    node.textContent = equippedBy
      ? `${item.name} (${toTitle(item.slot)} equipped)`
      : `${item.name} (${toTitle(item.slot)})`;

    node.addEventListener("dragstart", (event) => {
      const payload = JSON.stringify({ itemId: item.id, originSlot: null });
      event.dataTransfer.setData("text/plain", payload);
      event.dataTransfer.effectAllowed = "move";
    });

    refs.closetDropZone.appendChild(node);
  });
}

function equipItem(slot, itemId) {
  const item = getItemById(itemId);
  if (!item || item.slot !== slot) {
    uiState.unlockMessage = `That item only fits ${toTitle(item ? item.slot : slot)} slot.`;
    updateGameUI();
    return;
  }

  if (!state.unlockedItems.includes(itemId)) {
    return;
  }

  state.equipped[slot] = itemId;
  saveState();
  renderWardrobe();
}

function unequipItem(slot) {
  if (!state.equipped[slot]) {
    return;
  }

  state.equipped[slot] = null;
  saveState();
  renderWardrobe();
}

function findItemEquippedSlot(itemId) {
  for (const [slot, equippedId] of Object.entries(state.equipped)) {
    if (equippedId === itemId) {
      return slot;
    }
  }
  return null;
}

function parsePayload(raw) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function getItemById(id) {
  return ITEM_CATALOG.find((item) => item.id === id) || null;
}

function toTitle(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const cloned = array.slice();
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

const STORAGE_KEY = "amphibianAcademyStatePhaser";
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const TOTAL_ROUNDS = 10;
const BASE_FLIES = 8;
const PERFECT_BONUS = 50;

const OP_SYMBOL = {
  add: "+",
  subtract: "-",
  multiply: "x",
  divide: "/"
};

class GameStore {
  constructor() {
    this.state = this.load();
  }

  defaultState() {
    return {
      flies: 0,
      bestScore: 0,
      settings: {
        operation: "mixed",
        difficulty: "easy"
      }
    };
  }

  load() {
    const fallback = this.defaultState();

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw);
      return {
        ...fallback,
        ...parsed,
        settings: {
          ...fallback.settings,
          ...(parsed.settings || {})
        }
      };
    } catch (error) {
      return fallback;
    }
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  addFlies(amount) {
    this.state.flies += Math.max(0, Math.round(amount));
    this.save();
  }

  updateBestScore(score) {
    if (score > this.state.bestScore) {
      this.state.bestScore = score;
      this.save();
    }
  }

  setSetting(key, value) {
    this.state.settings[key] = value;
    this.save();
  }
}

const store = new GameStore();

class BaseScene extends Phaser.Scene {
  createBackdrop() {
    const g = this.add.graphics();

    g.fillGradientStyle(0x97d7ff, 0x97d7ff, 0x58b6d0, 0x58b6d0, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    g.fillStyle(0x67cfa0, 1);
    g.fillEllipse(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.86, GAME_WIDTH * 1.2, 240);

    g.fillStyle(0x4aaf7f, 0.9);
    g.fillEllipse(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.9, GAME_WIDTH * 0.8, 180);
    g.fillEllipse(GAME_WIDTH * 0.75, GAME_HEIGHT * 0.92, GAME_WIDTH * 0.7, 190);

    g.fillStyle(0xffea9e, 0.9);
    g.fillCircle(GAME_WIDTH - 140, 110, 62);

    for (let i = 0; i < 10; i += 1) {
      const x = 80 + i * 120 + Phaser.Math.Between(-18, 18);
      const y = 560 + Phaser.Math.Between(-16, 16);
      g.fillStyle(0x7ec85a, 0.22);
      g.fillCircle(x, y, Phaser.Math.Between(18, 28));
    }
  }

  createTopHud(title, subtitle) {
    const hud = this.add.container(640, 42);

    const bg = this.add.rectangle(0, 0, 1228, 64, 0xe9fff4, 0.9);
    bg.setStrokeStyle(2, 0x1d8c67, 0.36);

    const titleText = this.add.text(-585, -11, title, {
      fontFamily: "Luckiest Guy",
      fontSize: "30px",
      color: "#155741"
    });

    const subtitleText = this.add.text(-585, 15, subtitle, {
      fontFamily: "Baloo 2",
      fontSize: "18px",
      color: "#22644f",
      fontStyle: "700"
    });

    this.fliesHudText = this.add.text(315, -8, "Flies: 0", {
      fontFamily: "Baloo 2",
      fontSize: "25px",
      color: "#5f3b00",
      fontStyle: "800"
    });

    const fliesChip = this.add.rectangle(400, 0, 220, 44, 0xffcf56, 0.95);
    fliesChip.setStrokeStyle(2, 0x9a6311, 0.4);

    this.bestHudText = this.add.text(315, 12, "Best: 0", {
      fontFamily: "Baloo 2",
      fontSize: "19px",
      color: "#2b5535",
      fontStyle: "800"
    });

    hud.add([bg, titleText, subtitleText, fliesChip, this.fliesHudText, this.bestHudText]);
    this.refreshHud();
  }

  refreshHud() {
    if (this.fliesHudText) {
      this.fliesHudText.setText(`Flies: ${store.state.flies}`);
    }
    if (this.bestHudText) {
      this.bestHudText.setText(`Best: ${store.state.bestScore}`);
    }
  }

  createPanel(x, y, width, height) {
    const r = this.add.rectangle(x, y, width, height, 0xecfff4, 0.9);
    r.setStrokeStyle(2, 0x1a9368, 0.28);
    return r;
  }

  createButton(config) {
    const {
      x,
      y,
      width,
      height,
      label,
      onClick,
      tone = "primary",
      disabled = false
    } = config;

    const palette = {
      primary: { fill: 0xffbc43, border: 0x9a6111, text: "#5b3500" },
      ghost: { fill: 0xd8f3e5, border: 0x28795a, text: "#195842" },
      neutral: { fill: 0xe7f9ef, border: 0x2d8664, text: "#1f5f48" }
    };

    const colors = palette[tone] || palette.primary;

    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, colors.fill, 0.96);
    bg.setStrokeStyle(2, colors.border, 0.42);

    const text = this.add.text(0, 0, label, {
      fontFamily: "Baloo 2",
      fontSize: "26px",
      color: colors.text,
      fontStyle: "800"
    });
    text.setOrigin(0.5);

    container.add([bg, text]);

    const api = {
      container,
      bg,
      text,
      enabled: !disabled,
      setEnabled: (value) => {
        api.enabled = value;
        bg.disableInteractive();
        if (value) {
          bg.setInteractive({ useHandCursor: true });
          container.setAlpha(1);
        } else {
          container.setAlpha(0.5);
        }
      },
      setLabel: (value) => {
        text.setText(value);
      }
    };

    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => {
      if (!api.enabled) {
        return;
      }
      container.setScale(1.02);
    });
    bg.on("pointerout", () => {
      container.setScale(1);
    });
    bg.on("pointerdown", () => {
      if (!api.enabled) {
        return;
      }
      onClick();
    });

    api.setEnabled(!disabled);
    return api;
  }
}

class WelcomeScene extends BaseScene {
  constructor() {
    super("WelcomeScene");
  }

  create() {
    this.createBackdrop();
    this.createTopHud("AMPHIBIAN ACADEMY", "Welcome To The Pond");

    this.createPanel(640, 400, 980, 500);

    this.add.text(170, 195, "WELCOME", {
      fontFamily: "Luckiest Guy",
      fontSize: "74px",
      color: "#155f48"
    });

    this.add.text(170, 275, "Drag and merge number blocks to hit the target answer.", {
      fontFamily: "Baloo 2",
      fontSize: "34px",
      color: "#1b6750",
      fontStyle: "700"
    });

    this.add.text(170, 323, "Choose a subject, pick a game, and earn flies for your frog world.", {
      fontFamily: "Baloo 2",
      fontSize: "29px",
      color: "#236953",
      fontStyle: "700"
    });

    this.createButton({
      x: 320,
      y: 432,
      width: 300,
      height: 62,
      label: "Start Adventure",
      onClick: () => this.scene.start("SubjectsScene"),
      tone: "primary"
    });

    this.createButton({
      x: 620,
      y: 432,
      width: 240,
      height: 62,
      label: "Math Games",
      onClick: () => this.scene.start("MathHubScene"),
      tone: "ghost"
    });

    this.add.text(170, 500, "Hackathon focus: polished flow and game feel.", {
      fontFamily: "Baloo 2",
      fontSize: "26px",
      color: "#2a6d58",
      fontStyle: "700"
    });

    this.drawFrogIcon(900, 360);
  }

  drawFrogIcon(x, y) {
    const g = this.add.graphics();
    g.fillStyle(0x54bb71, 0.95);
    g.fillCircle(x, y, 120);

    g.fillStyle(0x78d583, 1);
    g.fillCircle(x - 60, y - 86, 36);
    g.fillCircle(x + 60, y - 86, 36);

    g.fillStyle(0x173f2b, 1);
    g.fillCircle(x - 60, y - 86, 12);
    g.fillCircle(x + 60, y - 86, 12);

    g.fillStyle(0x2f8d5a, 1);
    g.fillRoundedRect(x - 58, y + 20, 116, 36, 14);
  }
}

class SubjectsScene extends BaseScene {
  constructor() {
    super("SubjectsScene");
  }

  create() {
    this.createBackdrop();
    this.createTopHud("SUBJECT PORTAL", "Pick A Learning Path");

    this.createButton({
      x: 110,
      y: 110,
      width: 170,
      height: 52,
      label: "Back",
      tone: "neutral",
      onClick: () => this.scene.start("WelcomeScene")
    });

    this.add.text(190, 145, "Choose your subject", {
      fontFamily: "Luckiest Guy",
      fontSize: "52px",
      color: "#166149"
    });

    this.createSubjectCard(235, 395, {
      title: "Math Marsh",
      body: "Playable now. Arithmetic block merge games.",
      playable: true,
      action: () => this.scene.start("MathHubScene")
    });

    this.createSubjectCard(640, 395, {
      title: "Science Swamp",
      body: "Coming soon. Ecosystem and life-cycle quests.",
      playable: false
    });

    this.createSubjectCard(1045, 395, {
      title: "Reading Reeds",
      body: "Coming soon. Story puzzles and literacy rounds.",
      playable: false
    });
  }

  createSubjectCard(x, y, config) {
    this.createPanel(x, y, 360, 430);

    this.add.text(x - 155, y - 150, config.title, {
      fontFamily: "Luckiest Guy",
      fontSize: "42px",
      color: "#155b46"
    });

    this.add.text(x - 155, y - 85, config.body, {
      fontFamily: "Baloo 2",
      fontSize: "27px",
      color: "#286a54",
      fontStyle: "700",
      wordWrap: { width: 300 }
    });

    if (config.playable) {
      this.createButton({
        x,
        y: y + 145,
        width: 205,
        height: 58,
        label: "Open",
        onClick: config.action,
        tone: "primary"
      });
      return;
    }

    this.createButton({
      x,
      y: y + 145,
      width: 225,
      height: 58,
      label: "Coming Soon",
      onClick: () => {},
      tone: "ghost",
      disabled: true
    });
  }
}

class MathHubScene extends BaseScene {
  constructor() {
    super("MathHubScene");
  }

  create() {
    this.createBackdrop();
    this.createTopHud("MATH GAMES", "Choose A Game");

    this.createButton({
      x: 110,
      y: 110,
      width: 170,
      height: 52,
      label: "Back",
      tone: "neutral",
      onClick: () => this.scene.start("SubjectsScene")
    });

    this.add.text(200, 145, "Math Game Hub", {
      fontFamily: "Luckiest Guy",
      fontSize: "52px",
      color: "#185f48"
    });

    this.createGameCard(340, 395, {
      title: "Pond Merge Arithmetic",
      body: "Drag one number block onto another. They combine using your selected operation.",
      playable: true,
      action: () => this.scene.start("MergeGameScene")
    });

    this.createGameCard(760, 395, {
      title: "Frog Factories",
      body: "Coming soon. Timed operation chains and combo scoring.",
      playable: false
    });

    this.createGameCard(1080, 395, {
      title: "Swamp Showdown",
      body: "Coming soon. Head-to-head battle rounds.",
      playable: false
    });
  }

  createGameCard(x, y, config) {
    const width = config.playable ? 420 : 280;
    this.createPanel(x, y, width, 430);

    this.add.text(x - (width / 2) + 20, y - 150, config.title, {
      fontFamily: "Luckiest Guy",
      fontSize: config.playable ? "40px" : "30px",
      color: "#165f49",
      wordWrap: { width: width - 40 }
    });

    this.add.text(x - (width / 2) + 20, y - 68, config.body, {
      fontFamily: "Baloo 2",
      fontSize: "25px",
      color: "#2a6b56",
      fontStyle: "700",
      wordWrap: { width: width - 40 }
    });

    if (config.playable) {
      this.createButton({
        x,
        y: y + 145,
        width: 210,
        height: 58,
        label: "Play",
        tone: "primary",
        onClick: config.action
      });
      return;
    }

    this.createButton({
      x,
      y: y + 145,
      width: 205,
      height: 58,
      label: "Locked",
      tone: "ghost",
      onClick: () => {},
      disabled: true
    });
  }
}

class MergeGameScene extends BaseScene {
  constructor() {
    super("MergeGameScene");

    this.operationOptions = ["mixed", "add", "subtract", "multiply", "divide"];
    this.difficultyOptions = ["easy", "medium", "hard"];
  }

  create() {
    this.createBackdrop();
    this.createTopHud("POND MERGE ARITHMETIC", "Merge blocks and hit the target");

    this.session = {
      active: false,
      round: 0,
      score: 0,
      flies: 0,
      resolved: false,
      goal: 0,
      operation: "add",
      selectedBlockId: null,
      blocks: []
    };

    this.arenaBounds = new Phaser.Geom.Rectangle(338, 164, 604, 480);
    this.blockIdCounter = 0;

    this.drawLayout();
    this.createSelectors();
    this.createActionButtons();
    this.createArenaElements();
    this.renderArenaIdle();
    this.updateSessionUI();
  }

  drawLayout() {
    this.createButton({
      x: 110,
      y: 110,
      width: 170,
      height: 52,
      label: "Back",
      tone: "neutral",
      onClick: () => this.scene.start("MathHubScene")
    });

    this.createPanel(168, 402, 286, 484);
    this.createPanel(640, 404, 632, 510);
    this.createPanel(1112, 402, 296, 484);

    this.roundText = this.add.text(44, 210, "Round: 0 / 10", {
      fontFamily: "Baloo 2",
      fontSize: "34px",
      color: "#165f49",
      fontStyle: "800"
    });

    this.scoreText = this.add.text(44, 258, "Score: 0", {
      fontFamily: "Baloo 2",
      fontSize: "34px",
      color: "#165f49",
      fontStyle: "800"
    });

    this.sessionFliesText = this.add.text(44, 306, "Session Flies: 0", {
      fontFamily: "Baloo 2",
      fontSize: "31px",
      color: "#165f49",
      fontStyle: "800"
    });

    this.goalEquation = this.add.text(354, 176, "_ + _ = ?", {
      fontFamily: "Luckiest Guy",
      fontSize: "44px",
      color: "#176149"
    });

    this.goalPrompt = this.add.text(354, 230, "Press Start Session to begin.", {
      fontFamily: "Baloo 2",
      fontSize: "30px",
      color: "#286f58",
      fontStyle: "700"
    });

    this.feedbackText = this.add.text(354, 610, "Pick two blocks to merge.", {
      fontFamily: "Baloo 2",
      fontSize: "31px",
      color: "#245f4c",
      fontStyle: "800"
    });

    this.rewardInfo = this.add.text(968, 212, "Correct merges earn flies.", {
      fontFamily: "Baloo 2",
      fontSize: "29px",
      color: "#1a634d",
      fontStyle: "800",
      wordWrap: { width: 270 }
    });

    const barBg = this.add.rectangle(968, 312, 286, 16, 0x126f53, 0.22);
    barBg.setOrigin(0, 0.5);
    this.progressFill = this.add.rectangle(968, 312, 286, 16, 0x22af73, 0.9);
    this.progressFill.setOrigin(0, 0.5);
    this.progressFill.scaleX = 0;

    this.sessionResult = this.add.text(968, 338, "No session yet.", {
      fontFamily: "Baloo 2",
      fontSize: "28px",
      color: "#205f49",
      fontStyle: "800",
      wordWrap: { width: 270 }
    });
  }

  createSelectors() {
    this.operationIndex = this.operationOptions.indexOf(store.state.settings.operation);
    if (this.operationIndex < 0) {
      this.operationIndex = 0;
    }

    this.difficultyIndex = this.difficultyOptions.indexOf(store.state.settings.difficulty);
    if (this.difficultyIndex < 0) {
      this.difficultyIndex = 0;
    }

    this.add.text(44, 360, "Operation", {
      fontFamily: "Baloo 2",
      fontSize: "28px",
      color: "#1d604a",
      fontStyle: "800"
    });

    this.operationValueText = this.add.text(44, 392, this.operationLabel(this.operationOptions[this.operationIndex]), {
      fontFamily: "Baloo 2",
      fontSize: "30px",
      color: "#125a43",
      fontStyle: "800"
    });

    this.createButton({
      x: 178,
      y: 407,
      width: 42,
      height: 38,
      label: "<",
      tone: "ghost",
      onClick: () => this.shiftOperation(-1)
    });

    this.createButton({
      x: 224,
      y: 407,
      width: 42,
      height: 38,
      label: ">",
      tone: "ghost",
      onClick: () => this.shiftOperation(1)
    });

    this.add.text(44, 448, "Difficulty", {
      fontFamily: "Baloo 2",
      fontSize: "28px",
      color: "#1d604a",
      fontStyle: "800"
    });

    this.difficultyValueText = this.add.text(44, 480, this.difficultyLabel(this.difficultyOptions[this.difficultyIndex]), {
      fontFamily: "Baloo 2",
      fontSize: "30px",
      color: "#125a43",
      fontStyle: "800"
    });

    this.createButton({
      x: 178,
      y: 495,
      width: 42,
      height: 38,
      label: "<",
      tone: "ghost",
      onClick: () => this.shiftDifficulty(-1)
    });

    this.createButton({
      x: 224,
      y: 495,
      width: 42,
      height: 38,
      label: ">",
      tone: "ghost",
      onClick: () => this.shiftDifficulty(1)
    });
  }

  createActionButtons() {
    this.startButton = this.createButton({
      x: 114,
      y: 560,
      width: 175,
      height: 54,
      label: "Start",
      tone: "primary",
      onClick: () => this.startSession()
    });

    this.nextButton = this.createButton({
      x: 224,
      y: 560,
      width: 118,
      height: 54,
      label: "Next",
      tone: "neutral",
      onClick: () => this.advanceRound(),
      disabled: true
    });
  }

  createArenaElements() {
    this.arenaBackground = this.add.rectangle(640, 415, 604, 480, 0xd7fbe9, 0.88);
    this.arenaBackground.setStrokeStyle(3, 0x18845f, 0.3);

    this.arenaRing = this.add.graphics();
    this.arenaRing.lineStyle(2, 0x2a9a72, 0.24);

    for (let i = 0; i < 3; i += 1) {
      this.arenaRing.strokeCircle(640, 415, 80 + i * 75);
    }
  }

  renderArenaIdle() {
    this.clearBlocks();
    this.placeholderText = this.add.text(640, 415, "Start Session To Enter Arena", {
      fontFamily: "Luckiest Guy",
      fontSize: "43px",
      color: "#2a755d"
    });
    this.placeholderText.setOrigin(0.5);
  }

  startSession() {
    // Restart safety: remove any existing blocks from a previous active run
    // before resetting the session state.
    this.clearBlocks();

    this.session.active = true;
    this.session.round = 1;
    this.session.score = 0;
    this.session.flies = 0;
    this.session.resolved = false;
    this.session.selectedBlockId = null;
    this.session.goal = 0;
    this.session.blocks = [];

    this.startButton.setLabel("Restart");
    this.nextButton.setEnabled(false);
    this.sessionResult.setText("Session in progress.");
    this.prepareRound();
    this.updateSessionUI();
  }

  advanceRound() {
    if (!this.session.active || !this.session.resolved) {
      return;
    }

    if (this.session.round >= TOTAL_ROUNDS) {
      this.finishSession();
      return;
    }

    this.session.round += 1;
    this.prepareRound();
    this.updateSessionUI();
  }

  prepareRound() {
    if (this.placeholderText) {
      this.placeholderText.destroy();
      this.placeholderText = null;
    }

    this.clearBlocks();

    const op = this.pickOperation();
    const diff = this.difficultyOptions[this.difficultyIndex];
    const roundData = this.generateRound(op, diff);

    this.session.operation = op;
    this.session.goal = roundData.goal;
    this.session.resolved = false;
    this.session.selectedBlockId = null;

    this.goalEquation.setText(`_ ${OP_SYMBOL[op]} _ = ${this.formatValue(roundData.goal)}`);
    this.goalPrompt.setText(`Operation: ${this.operationLabel(op)}. Merge to match target.`);
    this.setFeedback("Drag one block onto another to merge.", "neutral");

    this.session.blocks = roundData.values.map((value, index) => {
      const point = this.spawnPoint(index, roundData.values.length);
      return this.createBlock(value, point);
    });

    this.nextButton.setEnabled(false);
  }

  createBlock(value, point) {
    const id = `b-${this.blockIdCounter}`;
    this.blockIdCounter += 1;

    const size = this.blockSize(value);
    const block = {
      id,
      value,
      size,
      alive: true,
      xHome: point.x,
      yHome: point.y,
      container: null,
      tile: null,
      label: null
    };

    const container = this.add.container(point.x, point.y);
    container.setDepth(5);
    container.blockId = id;

    const tile = this.add.rectangle(0, 0, size, size, this.blockColor(value), 0.95);
    tile.setStrokeStyle(3, 0x1d7f5d, 0.35);

    const label = this.add.text(0, 0, this.formatValue(value), {
      fontFamily: "Luckiest Guy",
      fontSize: this.blockFontSize(value),
      color: "#155d46"
    });
    label.setOrigin(0.5);

    container.add([tile, label]);
    container.setSize(size, size);

    container.setInteractive(
      new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size),
      Phaser.Geom.Rectangle.Contains
    );

    this.input.setDraggable(container);

    container.on("dragstart", () => {
      if (!this.isRoundInteractive()) {
        return;
      }
      container.setDepth(10);
      this.selectBlock(id);
    });

    container.on("drag", (_pointer, dragX, dragY) => {
      if (!this.isRoundInteractive()) {
        return;
      }

      const half = block.size / 2;
      container.x = Phaser.Math.Clamp(dragX, this.arenaBounds.left + half, this.arenaBounds.right - half);
      container.y = Phaser.Math.Clamp(dragY, this.arenaBounds.top + half, this.arenaBounds.bottom - half);
    });

    container.on("dragend", () => {
      if (!this.isRoundInteractive()) {
        return;
      }

      const source = this.getBlockById(id);
      const target = this.findOverlapTarget(source);

      if (target) {
        this.resolveMerge(source, target);
        return;
      }

      this.tweens.add({
        targets: container,
        x: source.xHome,
        y: source.yHome,
        duration: 150,
        ease: "Sine.Out"
      });
    });

    container.on("pointerdown", () => {
      if (!this.isRoundInteractive()) {
        return;
      }
      this.onBlockTap(id);
    });

    block.container = container;
    block.tile = tile;
    block.label = label;

    return block;
  }

  onBlockTap(id) {
    if (!this.session.selectedBlockId) {
      this.selectBlock(id);
      return;
    }

    if (this.session.selectedBlockId === id) {
      this.selectBlock(null);
      return;
    }

    const source = this.getBlockById(this.session.selectedBlockId);
    const target = this.getBlockById(id);

    if (!source || !target) {
      this.selectBlock(null);
      return;
    }

    this.resolveMerge(source, target);
  }

  resolveMerge(source, target) {
    if (!source || !target || !source.alive || !target.alive || source.id === target.id) {
      return;
    }

    if (!this.isRoundInteractive()) {
      return;
    }

    const left = source.value;
    const right = target.value;
    const result = this.operate(left, right, this.session.operation);
    const valid = Number.isFinite(result);

    source.alive = false;
    source.container.disableInteractive();

    this.tweens.add({
      targets: source.container,
      alpha: 0,
      scale: 0.3,
      duration: 120,
      onComplete: () => {
        source.container.destroy();
      }
    });

    if (valid) {
      target.value = result;
      this.redrawBlock(target);
      target.xHome = target.container.x;
      target.yHome = target.container.y;
    }

    this.session.resolved = true;
    this.selectBlock(null);
    this.nextButton.setEnabled(true);

    const equation = `${this.formatValue(left)} ${OP_SYMBOL[this.session.operation]} ${this.formatValue(right)} = ${valid ? this.formatValue(result) : "invalid"}`;
    this.goalPrompt.setText(equation);

    if (valid && this.nearlyEqual(result, this.session.goal)) {
      const gain = this.fliesForRound(this.session.operation, this.difficultyOptions[this.difficultyIndex]);
      this.session.score += 1;
      this.session.flies += gain;
      this.setFeedback(`Direct hit! +${gain} flies.`, "good");
    } else {
      this.setFeedback("Missed target. Try the next round.", "bad");
    }

    this.updateSessionUI();
  }

  redrawBlock(block) {
    block.size = this.blockSize(block.value);
    block.container.setSize(block.size, block.size);
    block.tile.setSize(block.size, block.size);
    block.tile.setDisplaySize(block.size, block.size);
    block.tile.fillColor = this.blockColor(block.value);
    block.label.setText(this.formatValue(block.value));
    block.label.setFontSize(this.blockFontSize(block.value));

    this.tweens.add({
      targets: block.container,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 140,
      yoyo: true,
      ease: "Sine.Out"
    });
  }

  finishSession() {
    if (!this.session.active) {
      return;
    }

    let earned = this.session.flies;
    const perfect = this.session.score === TOTAL_ROUNDS;

    if (perfect) {
      earned += PERFECT_BONUS;
      this.rewardInfo.setText(`Perfect bonus +${PERFECT_BONUS} flies.`);
    } else {
      this.rewardInfo.setText("Session complete. Keep improving your merges.");
    }

    store.addFlies(earned);
    store.updateBestScore(this.session.score);

    this.session.active = false;
    this.session.resolved = false;

    this.startButton.setLabel("Start");
    this.nextButton.setEnabled(false);

    this.sessionResult.setText(`Final: ${this.session.score}/${TOTAL_ROUNDS}. Earned ${earned} flies.`);
    this.goalEquation.setText("_ + _ = ?");
    this.goalPrompt.setText("Press Start Session to begin.");
    this.setFeedback("Session finished. Start again to play another run.", "neutral");

    this.clearBlocks();
    this.renderArenaIdle();
    this.updateSessionUI();
    this.refreshHud();
  }

  shiftOperation(direction) {
    this.operationIndex = this.wrapIndex(this.operationIndex + direction, this.operationOptions.length);
    const mode = this.operationOptions[this.operationIndex];
    this.operationValueText.setText(this.operationLabel(mode));
    store.setSetting("operation", mode);
  }

  shiftDifficulty(direction) {
    this.difficultyIndex = this.wrapIndex(this.difficultyIndex + direction, this.difficultyOptions.length);
    const mode = this.difficultyOptions[this.difficultyIndex];
    this.difficultyValueText.setText(this.difficultyLabel(mode));
    store.setSetting("difficulty", mode);
  }

  updateSessionUI() {
    const roundLabel = this.session.active ? `${this.session.round} / ${TOTAL_ROUNDS}` : `0 / ${TOTAL_ROUNDS}`;
    this.roundText.setText(`Round: ${roundLabel}`);
    this.scoreText.setText(`Score: ${this.session.score}`);
    this.sessionFliesText.setText(`Session Flies: ${this.session.flies}`);

    const completed = this.session.active ? this.session.round - (this.session.resolved ? 0 : 1) : 0;
    const progress = Phaser.Math.Clamp(completed / TOTAL_ROUNDS, 0, 1);
    this.progressFill.scaleX = progress;

    this.refreshHud();
  }

  pickOperation() {
    const mode = this.operationOptions[this.operationIndex];
    if (mode !== "mixed") {
      return mode;
    }

    const pool = ["add", "subtract", "multiply", "divide"];
    return pool[Phaser.Math.Between(0, pool.length - 1)];
  }

  generateRound(operation, difficulty) {
    const pair = this.makePair(operation, difficulty);
    const countByDifficulty = { easy: 4, medium: 5, hard: 6 };
    const total = countByDifficulty[difficulty] || 4;

    const values = [pair.left, pair.right];
    const [min, max] = this.randomRangeForDifficulty(difficulty);

    while (values.length < total) {
      values.push(Phaser.Math.Between(min, max));
    }

    Phaser.Utils.Array.Shuffle(values);

    return {
      goal: pair.goal,
      values
    };
  }

  makePair(operation, difficulty) {
    if (operation === "add") {
      const max = difficulty === "hard" ? 20 : difficulty === "medium" ? 15 : 10;
      const left = Phaser.Math.Between(0, max);
      const right = Phaser.Math.Between(0, max);
      return { left, right, goal: left + right };
    }

    if (operation === "subtract") {
      const max = difficulty === "hard" ? 24 : difficulty === "medium" ? 18 : 12;
      const right = Phaser.Math.Between(0, max);
      const left = Phaser.Math.Between(right, max + right);
      return { left, right, goal: left - right };
    }

    if (operation === "multiply") {
      const max = difficulty === "hard" ? 12 : difficulty === "medium" ? 10 : 8;
      const left = Phaser.Math.Between(0, max);
      const right = Phaser.Math.Between(0, max);
      return { left, right, goal: left * right };
    }

    const divisorMax = difficulty === "hard" ? 10 : difficulty === "medium" ? 9 : 7;
    const quotientMax = difficulty === "hard" ? 12 : difficulty === "medium" ? 10 : 8;
    const right = Phaser.Math.Between(1, divisorMax);
    const goal = Phaser.Math.Between(1, quotientMax);
    return {
      left: right * goal,
      right,
      goal
    };
  }

  randomRangeForDifficulty(difficulty) {
    if (difficulty === "hard") {
      return [0, 20];
    }

    if (difficulty === "medium") {
      return [0, 15];
    }

    return [0, 10];
  }

  fliesForRound(operation, difficulty) {
    let opBonus = 0;
    if (operation === "multiply") {
      opBonus = 2;
    }
    if (operation === "divide") {
      opBonus = 3;
    }

    let difficultyBonus = 0;
    if (difficulty === "medium") {
      difficultyBonus = 2;
    }
    if (difficulty === "hard") {
      difficultyBonus = 4;
    }

    return BASE_FLIES + opBonus + difficultyBonus;
  }

  operate(left, right, operation) {
    if (operation === "add") {
      return left + right;
    }
    if (operation === "subtract") {
      return left - right;
    }
    if (operation === "multiply") {
      return left * right;
    }
    if (right === 0) {
      return Number.NaN;
    }
    return left / right;
  }

  getBlockById(id) {
    return this.session.blocks.find((block) => block.id === id && block.alive) || null;
  }

  findOverlapTarget(source) {
    if (!source || !source.alive) {
      return null;
    }

    const sourceBounds = source.container.getBounds();
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of this.session.blocks) {
      if (!candidate.alive || candidate.id === source.id) {
        continue;
      }

      const overlap = Phaser.Geom.Intersects.RectangleToRectangle(sourceBounds, candidate.container.getBounds());
      if (!overlap) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(source.container.x, source.container.y, candidate.container.x, candidate.container.y);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }

    return best;
  }

  selectBlock(id) {
    this.session.selectedBlockId = id;

    for (const block of this.session.blocks) {
      if (!block.alive) {
        continue;
      }

      const selected = id && block.id === id;
      if (selected) {
        block.tile.setStrokeStyle(4, 0xf3b13f, 0.85);
      } else {
        block.tile.setStrokeStyle(3, 0x1d7f5d, 0.35);
      }
    }
  }

  isRoundInteractive() {
    return this.session.active && !this.session.resolved;
  }

  setFeedback(message, tone) {
    this.feedbackText.setText(message);
    if (tone === "good") {
      this.feedbackText.setColor("#137946");
      return;
    }
    if (tone === "bad") {
      this.feedbackText.setColor("#9d2d3b");
      return;
    }
    this.feedbackText.setColor("#245f4c");
  }

  clearBlocks() {
    for (const block of this.session.blocks) {
      if (block.container && block.container.active) {
        block.container.destroy();
      }
    }
    this.session.blocks = [];
    this.session.selectedBlockId = null;
  }

  spawnPoint(index, total) {
    const columns = total <= 4 ? 2 : 3;
    const rows = Math.ceil(total / columns);
    const col = index % columns;
    const row = Math.floor(index / columns);

    const xStep = this.arenaBounds.width / (columns + 1);
    const yStep = this.arenaBounds.height / (rows + 1);

    return {
      x: this.arenaBounds.left + xStep * (col + 1) + Phaser.Math.Between(-24, 24),
      y: this.arenaBounds.top + yStep * (row + 1) + Phaser.Math.Between(-22, 22)
    };
  }

  blockSize(value) {
    const clamped = Phaser.Math.Clamp(Math.abs(value), 0, 24);
    return 58 + clamped * 2.7;
  }

  blockFontSize(value) {
    if (Math.abs(value) >= 100) {
      return "26px";
    }
    if (Math.abs(value) >= 10) {
      return "30px";
    }
    return "34px";
  }

  blockColor(value) {
    const amount = Phaser.Math.Clamp(Math.abs(value), 0, 24) / 24;
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0xedfff7),
      Phaser.Display.Color.ValueToColor(0xa5e7c8),
      1,
      amount
    );
    return Phaser.Display.Color.GetColor(color.r, color.g, color.b);
  }

  formatValue(value) {
    if (Number.isInteger(value)) {
      return String(value);
    }
    return value.toFixed(2);
  }

  nearlyEqual(left, right) {
    return Math.abs(left - right) < 0.0001;
  }

  operationLabel(mode) {
    if (mode === "mixed") {
      return "Mixed (+ - x /)";
    }
    if (mode === "add") {
      return "Addition (+)";
    }
    if (mode === "subtract") {
      return "Subtraction (-)";
    }
    if (mode === "multiply") {
      return "Multiplication (x)";
    }
    return "Division (/)";
  }

  difficultyLabel(mode) {
    if (mode === "easy") {
      return "Easy";
    }
    if (mode === "medium") {
      return "Medium";
    }
    return "Hard";
  }

  wrapIndex(index, size) {
    if (index < 0) {
      return size - 1;
    }
    if (index >= size) {
      return 0;
    }
    return index;
  }
}

function startGame() {
  if (typeof Phaser === "undefined") {
    const root = document.getElementById("game-root");
    if (root) {
      root.innerHTML = "<p style='padding:1rem;font-weight:700;'>Phaser failed to load. Check internet access and reload.</p>";
    }
    return;
  }

  const config = {
    type: Phaser.AUTO,
    parent: "game-root",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#7fc7ef",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [WelcomeScene, SubjectsScene, MathHubScene, MergeGameScene]
  };

  new Phaser.Game(config);
}

startGame();

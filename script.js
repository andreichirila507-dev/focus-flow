(() => {
  const MODES = {
    focus: { minutes: 25, label: 'Focus' },
    short: { minutes: 5, label: 'Pauză scurtă' },
    long: { minutes: 15, label: 'Pauză lungă' },
  };

  const RING_CIRCUMFERENCE = 2 * Math.PI * 135;

  const timeDisplay = document.getElementById('time-display');
  const activeTaskDisplay = document.getElementById('active-task-display');
  const startPauseBtn = document.getElementById('start-pause-btn');
  const resetBtn = document.getElementById('reset-btn');
  const skipBtn = document.getElementById('skip-btn');
  const ringProgress = document.getElementById('ring-progress');
  const timerCard = document.querySelector('.timer-card');
  const modeBtns = document.querySelectorAll('.mode-btn');
  const streakCount = document.getElementById('streak-count');
  const taskForm = document.getElementById('task-form');
  const taskInput = document.getElementById('task-input');
  const taskList = document.getElementById('task-list');
  const emptyHint = document.getElementById('empty-hint');
  const celebrateLayer = document.getElementById('celebrate-layer');

  ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;

  let state = load();

  let mode = 'focus';
  let secondsLeft = MODES[mode].minutes * 60;
  let totalSeconds = secondsLeft;
  let running = false;
  let intervalId = null;
  let selectedTaskId = state.tasks.find(t => !t.done)?.id ?? null;

  function load() {
    try {
      const raw = localStorage.getItem('focusFlowState');
      if (raw) {
        const parsed = JSON.parse(raw);
        const today = new Date().toDateString();
        if (parsed.streakDate !== today) {
          parsed.streakCount = 0;
          parsed.streakDate = today;
        }
        return parsed;
      }
    } catch (e) {}
    return { tasks: [], streakCount: 0, streakDate: new Date().toDateString() };
  }

  function save() {
    localStorage.setItem('focusFlowState', JSON.stringify(state));
  }

  function render() {
    streakCount.textContent = state.streakCount;

    taskList.innerHTML = '';
    emptyHint.style.display = state.tasks.length === 0 ? 'block' : 'none';

    state.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.done ? ' done' : '') + (task.id === selectedTaskId ? ' selected' : '');
      li.dataset.id = task.id;

      const check = document.createElement('div');
      check.className = 'task-check';
      check.textContent = task.done ? '✓' : '';
      check.addEventListener('click', (e) => {
        e.stopPropagation();
        task.done = !task.done;
        save();
        render();
      });

      const text = document.createElement('span');
      text.className = 'task-text';
      text.textContent = task.text;

      const pomodoros = document.createElement('span');
      pomodoros.className = 'task-pomodoros';
      pomodoros.textContent = task.pomodoros > 0 ? '🍅'.repeat(Math.min(task.pomodoros, 5)) : '';

      const del = document.createElement('button');
      del.className = 'task-delete';
      del.textContent = '✕';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        if (selectedTaskId === task.id) selectedTaskId = null;
        save();
        render();
      });

      li.addEventListener('click', () => {
        selectedTaskId = task.id;
        render();
      });

      li.append(check, text, pomodoros, del);
      taskList.appendChild(li);
    });

    const activeTask = state.tasks.find(t => t.id === selectedTaskId);
    activeTaskDisplay.textContent = activeTask ? activeTask.text : 'Alege un task';
  }

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function updateDisplay() {
    timeDisplay.textContent = formatTime(secondsLeft);
    const progress = 1 - secondsLeft / totalSeconds;
    ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * progress;
    document.title = `${formatTime(secondsLeft)} · ${MODES[mode].label} · Focus Flow`;
  }

  function setMode(newMode) {
    mode = newMode;
    modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === newMode));
    timerCard.className = 'timer-card mode-' + newMode;
    secondsLeft = MODES[newMode].minutes * 60;
    totalSeconds = secondsLeft;
    stopTimer();
    updateDisplay();
  }

  function startTimer() {
    running = true;
    startPauseBtn.textContent = 'Pauză';
    intervalId = setInterval(tick, 1000);
  }

  function stopTimer() {
    running = false;
    startPauseBtn.textContent = 'Start';
    clearInterval(intervalId);
  }

  function tick() {
    secondsLeft--;
    if (secondsLeft <= 0) {
      completeSession();
      return;
    }
    updateDisplay();
  }

  function completeSession() {
    stopTimer();
    secondsLeft = 0;
    updateDisplay();

    if (mode === 'focus') {
      state.streakCount++;
      const task = state.tasks.find(t => t.id === selectedTaskId);
      if (task) task.pomodoros = (task.pomodoros || 0) + 1;
      save();
      celebrate();
      setMode('short');
    } else {
      setMode('focus');
    }
    render();
  }

  function celebrate() {
    const colors = ['#e8623a', '#4a9d8f', '#5b6ee8', '#f2c14e', '#d65db1'];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = 2 + Math.random() * 1.5 + 's';
      piece.style.animationDelay = Math.random() * 0.3 + 's';
      celebrateLayer.appendChild(piece);
      setTimeout(() => piece.remove(), 4000);
    }
  }

  startPauseBtn.addEventListener('click', () => {
    if (running) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  resetBtn.addEventListener('click', () => {
    stopTimer();
    secondsLeft = MODES[mode].minutes * 60;
    totalSeconds = secondsLeft;
    updateDisplay();
  });

  skipBtn.addEventListener('click', () => {
    stopTimer();
    if (mode === 'focus') {
      setMode('short');
    } else {
      setMode('focus');
    }
  });

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    const task = { id: Date.now().toString(), text, done: false, pomodoros: 0 };
    state.tasks.push(task);
    if (!selectedTaskId) selectedTaskId = task.id;
    save();
    render();
    taskInput.value = '';
    taskInput.focus();
  });

  setMode('focus');
  render();
})();

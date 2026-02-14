/* ===========================
   App State
   =========================== */
const state = {
  currentPage: 'landing',
  role: null,           // 'host' or 'participant'
  roomCode: null,
  participants: 1,
  polls: [],            // Array of poll objects
  pollIdCounter: 0,
  simulationIntervals: [],
};

/* ===========================
   Navigation
   =========================== */
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) {
    page.classList.add('active');
    // Re-trigger animation
    const card = page.querySelector('.fade-in');
    if (card) {
      card.style.animation = 'none';
      card.offsetHeight; // reflow
      card.style.animation = '';
    }
  }
  state.currentPage = pageId;

  // Generate room code when navigating to create-room
  if (pageId === 'create-room') {
    generateRoomCode();
  }
}

/* ===========================
   Room Code Generation
   =========================== */
function generateRoomCode() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  state.roomCode = code;
  document.getElementById('room-code-text').textContent = code;
  document.getElementById('share-code').textContent = code;
}

function copyRoomCode() {
  navigator.clipboard.writeText(state.roomCode).then(() => {
    const fb = document.getElementById('copy-feedback');
    fb.textContent = 'Copied to clipboard!';
    setTimeout(() => { fb.textContent = ''; }, 2000);
  });
}

/* ===========================
   Host Enter Room
   =========================== */
function hostEnterRoom() {
  state.role = 'host';
  // Simulate some participants joining
  state.participants = 1;
  enterRoom();
  simulateParticipants();
}

/* ===========================
   Join Room
   =========================== */
function joinRoom() {
  const input = document.getElementById('join-code-input');
  const code = input.value.trim();
  const errorEl = document.getElementById('join-error');

  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    errorEl.textContent = 'Please enter a valid 6-digit code.';
    return;
  }
  errorEl.textContent = '';
  state.roomCode = code;
  state.role = 'participant';
  state.participants = Math.floor(3 + Math.random() * 5); // Simulate existing participants
  enterRoom();
}

/* ===========================
   Enter Room (shared)
   =========================== */
function enterRoom() {
  state.polls = [];
  state.pollIdCounter = 0;

  // Update header
  document.getElementById('header-room-code').textContent = state.roomCode;
  const roleEl = document.getElementById('header-role');
  roleEl.textContent = state.role === 'host' ? 'Host' : 'Participant';
  document.getElementById('participant-count').textContent = state.participants;

  // Welcome message
  const welcomeMsg = state.role === 'host'
    ? 'You are the host. Create a poll using the button below.'
    : 'Waiting for the host to launch a poll...';
  document.getElementById('welcome-role-msg').textContent = welcomeMsg;

  // Show/hide host input
  document.getElementById('host-input-area').style.display = state.role === 'host' ? '' : 'none';

  // Clear chat (except welcome)
  const chat = document.getElementById('room-chat');
  chat.innerHTML = `<div class="chat-welcome"><p>Welcome to the room! <span>${welcomeMsg}</span></p></div>`;

  navigateTo('room');

  // If participant, simulate a poll appearing after a short delay
  if (state.role === 'participant') {
    setTimeout(() => {
      simulateHostPoll();
    }, 2000);
  }
}

/* ===========================
   Leave Room
   =========================== */
function leaveRoom() {
  // Clear all intervals
  state.simulationIntervals.forEach(id => clearInterval(id));
  state.simulationIntervals = [];
  navigateTo('landing');
}

/* ===========================
   Simulate Participants Joining (Host)
   =========================== */
function simulateParticipants() {
  const interval = setInterval(() => {
    if (state.currentPage !== 'room') {
      clearInterval(interval);
      return;
    }
    if (state.participants < 12) {
      state.participants += Math.floor(1 + Math.random() * 2);
      document.getElementById('participant-count').textContent = state.participants;
    } else {
      clearInterval(interval);
    }
  }, 3000);
  state.simulationIntervals.push(interval);
}

/* ===========================
   Poll Creator Modal
   =========================== */
function openPollCreator() {
  document.getElementById('poll-modal').style.display = '';
  document.getElementById('poll-question').value = '';
  // Reset options
  const list = document.getElementById('poll-options-list');
  list.innerHTML = `
    <div class="option-row">
      <input type="text" class="input-field poll-option-input" placeholder="Option 1">
      <button class="btn-remove-option" onclick="removeOption(this)" title="Remove">&times;</button>
    </div>
    <div class="option-row">
      <input type="text" class="input-field poll-option-input" placeholder="Option 2">
      <button class="btn-remove-option" onclick="removeOption(this)" title="Remove">&times;</button>
    </div>`;
  document.getElementById('allow-other').checked = false;
  document.getElementById('enable-timer').checked = false;
  document.getElementById('timer-settings').style.display = 'none';
  document.getElementById('timer-duration').value = '30';
}

function closePollCreator() {
  document.getElementById('poll-modal').style.display = 'none';
}

function addOption() {
  const list = document.getElementById('poll-options-list');
  const count = list.children.length + 1;
  const row = document.createElement('div');
  row.className = 'option-row';
  row.innerHTML = `
    <input type="text" class="input-field poll-option-input" placeholder="Option ${count}">
    <button class="btn-remove-option" onclick="removeOption(this)" title="Remove">&times;</button>`;
  list.appendChild(row);
}

function removeOption(btn) {
  const list = document.getElementById('poll-options-list');
  if (list.children.length > 2) {
    btn.parentElement.remove();
  }
}

// Timer toggle
document.getElementById('enable-timer').addEventListener('change', function() {
  document.getElementById('timer-settings').style.display = this.checked ? '' : 'none';
});

/* ===========================
   Launch Poll (Host)
   =========================== */
function launchPoll() {
  const question = document.getElementById('poll-question').value.trim();
  if (!question) {
    document.getElementById('poll-question').style.borderColor = 'var(--danger)';
    setTimeout(() => document.getElementById('poll-question').style.borderColor = '', 1500);
    return;
  }

  const optionInputs = document.querySelectorAll('.poll-option-input');
  const options = [];
  optionInputs.forEach(inp => {
    const val = inp.value.trim();
    if (val) options.push(val);
  });

  if (options.length < 2) return;

  const allowOther = document.getElementById('allow-other').checked;
  const enableTimer = document.getElementById('enable-timer').checked;
  const timerDuration = enableTimer ? parseInt(document.getElementById('timer-duration').value) || 30 : 0;

  const pollId = ++state.pollIdCounter;
  const poll = {
    id: pollId,
    question,
    options,
    allowOther,
    timerDuration,
    timerRemaining: timerDuration,
    votes: {},       // { optionIndex: count }
    otherVotes: [],  // array of strings
    totalVotes: 0,
    ended: false,
  };

  // Initialize vote counts
  options.forEach((_, i) => { poll.votes[i] = 0; });

  state.polls.push(poll);
  closePollCreator();

  // Render host view (results view)
  renderHostPollBubble(poll);

  // Simulate participant votes
  simulateVotes(poll);
}

/* ===========================
   Render Poll Bubble - Host (Results)
   =========================== */
function renderHostPollBubble(poll) {
  const chat = document.getElementById('room-chat');
  const bubble = document.createElement('div');
  bubble.className = 'poll-bubble';
  bubble.id = `poll-${poll.id}`;
  bubble.innerHTML = buildHostPollHTML(poll);
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;

  // Start timer if enabled
  if (poll.timerDuration > 0) {
    startPollTimer(poll);
  }
}

function buildHostPollHTML(poll) {
  let timerHTML = '';
  if (poll.timerDuration > 0 && !poll.ended) {
    const urgent = poll.timerRemaining <= 10 ? ' urgent' : '';
    timerHTML = `<div class="poll-bubble-timer${urgent}">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <span id="timer-${poll.id}">${poll.timerRemaining}s remaining</span>
    </div>`;
  }

  const total = poll.totalVotes;
  let resultsHTML = '<div class="poll-results">';
  poll.options.forEach((opt, i) => {
    const count = poll.votes[i] || 0;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    resultsHTML += `
      <div class="result-row">
        <div class="result-label">
          <span class="result-label-text">${escapeHtml(opt)}</span>
          <span class="result-count">${count} vote${count !== 1 ? 's' : ''} (${pct}%)</span>
        </div>
        <div class="result-bar-track">
          <div class="result-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  });

  // Show each custom "Other" answer as its own row in results
    if (poll.allowOther && poll.otherVotes.length > 0) {
      // Group other votes by their text
      const otherCounts = {};
      poll.otherVotes.forEach(txt => {
        const key = txt.trim() || 'Other';
        otherCounts[key] = (otherCounts[key] || 0) + 1;
      });
      Object.keys(otherCounts).forEach(answer => {
        const count = otherCounts[answer];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        resultsHTML += `
          <div class="result-row result-row-other">
            <div class="result-label">
              <span class="result-label-text"><em class="other-badge">Custom</em> ${escapeHtml(answer)}</span>
              <span class="result-count">${count} vote${count !== 1 ? 's' : ''} (${pct}%)</span>
            </div>
            <div class="result-bar-track">
              <div class="result-bar-fill result-bar-other" style="width:${pct}%"></div>
            </div>
          </div>`;
      });
    }
  resultsHTML += '</div>';

  const endedBadge = poll.ended ? '<span class="poll-ended-badge">Poll Ended</span>' : '';
  const actions = !poll.ended
    ? `<div class="poll-actions">
        <button class="btn btn-sm btn-danger" onclick="endPoll(${poll.id})">End Poll</button>
        <span style="font-size:0.8rem;color:var(--text-muted);display:flex;align-items:center;">${total} total vote${total !== 1 ? 's' : ''}</span>
      </div>`
    : `<div class="poll-actions"><span style="font-size:0.8rem;color:var(--text-muted);">${total} total vote${total !== 1 ? 's' : ''}</span></div>`;

  return `
    <div class="poll-bubble-question">${escapeHtml(poll.question)}</div>
    ${timerHTML}
    ${resultsHTML}
    ${actions}
    ${endedBadge}`;
}

function updateHostPollBubble(poll) {
  const bubble = document.getElementById(`poll-${poll.id}`);
  if (bubble) {
    bubble.innerHTML = buildHostPollHTML(poll);
  }
}

/* ===========================
   Poll Timer
   =========================== */
function startPollTimer(poll) {
  const interval = setInterval(() => {
    if (poll.ended || state.currentPage !== 'room') {
      clearInterval(interval);
      return;
    }
    poll.timerRemaining--;
    if (poll.timerRemaining <= 0) {
      poll.timerRemaining = 0;
      endPoll(poll.id);
      clearInterval(interval);
    }
    updateHostPollBubble(poll);
  }, 1000);
  state.simulationIntervals.push(interval);
}

/* ===========================
   End Poll
   =========================== */
function endPoll(pollId) {
  const poll = state.polls.find(p => p.id === pollId);
  if (poll && !poll.ended) {
    poll.ended = true;
    updateHostPollBubble(poll);
  }
}

/* ===========================
   Simulate Votes (for Host view)
   =========================== */
function simulateVotes(poll) {
  let votesLeft = Math.floor(state.participants * 0.6 + Math.random() * state.participants * 0.4);

  const interval = setInterval(() => {
    if (poll.ended || votesLeft <= 0 || state.currentPage !== 'room') {
      clearInterval(interval);
      return;
    }

    // Random vote
    if (poll.allowOther && Math.random() < 0.15) {
      const otherAnswers = ['Not sure', 'All of the above', 'Need more info', 'Something else entirely'];
      poll.otherVotes.push(otherAnswers[Math.floor(Math.random() * otherAnswers.length)]);
    } else {
      const idx = Math.floor(Math.random() * poll.options.length);
      poll.votes[idx]++;
    }
    poll.totalVotes++;
    votesLeft--;

    updateHostPollBubble(poll);
    const chat = document.getElementById('room-chat');
    chat.scrollTop = chat.scrollHeight;
  }, 800 + Math.random() * 1500);

  state.simulationIntervals.push(interval);
}

/* ===========================
   Simulate Host Poll (for Participant view)
   =========================== */
function simulateHostPoll() {
  if (state.currentPage !== 'room' || state.role !== 'participant') return;

  const samplePolls = [
    {
      question: 'What topic should we cover next?',
      options: ['JavaScript Frameworks', 'Backend Development', 'DevOps & Cloud', 'Mobile Development'],
      allowOther: true,
      timerDuration: 45,
    },
    {
      question: 'How would you rate this session?',
      options: ['Excellent', 'Good', 'Average', 'Needs Improvement'],
      allowOther: false,
      timerDuration: 30,
    },
    {
      question: 'Preferred meeting time?',
      options: ['Morning (9-12)', 'Afternoon (1-5)', 'Evening (6-9)'],
      allowOther: true,
      timerDuration: 0,
    },
  ];

  const sample = samplePolls[Math.floor(Math.random() * samplePolls.length)];
  const pollId = ++state.pollIdCounter;
  const poll = {
    id: pollId,
    ...sample,
    timerRemaining: sample.timerDuration,
    votes: {},
    otherVotes: [],
    totalVotes: 0,
    ended: false,
    submitted: false,
  };
  sample.options.forEach((_, i) => { poll.votes[i] = 0; });
  state.polls.push(poll);

  renderParticipantPollBubble(poll);

  if (poll.timerDuration > 0) {
    startParticipantTimer(poll);
  }
}

/* ===========================
   Render Poll Bubble - Participant (Voting)
   =========================== */
function renderParticipantPollBubble(poll) {
  const chat = document.getElementById('room-chat');
  const bubble = document.createElement('div');
  bubble.className = 'poll-bubble';
  bubble.id = `poll-${poll.id}`;
  bubble.innerHTML = buildParticipantPollHTML(poll);
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

function buildParticipantPollHTML(poll) {
  if (poll.submitted || poll.ended) {
    return `
      <div class="poll-bubble-question">${escapeHtml(poll.question)}</div>
      <p style="color:var(--text-muted);font-size:0.9rem;">
        ${poll.submitted ? 'Your vote has been submitted. Thank you!' : 'This poll has ended.'}
      </p>
      <span class="poll-ended-badge">${poll.submitted ? 'Voted' : 'Ended'}</span>`;
  }

  let timerHTML = '';
  if (poll.timerDuration > 0) {
    const urgent = poll.timerRemaining <= 10 ? ' urgent' : '';
    timerHTML = `<div class="poll-bubble-timer${urgent}">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <span id="ptimer-${poll.id}">${poll.timerRemaining}s remaining</span>
    </div>`;
  }

  let optionsHTML = '<div class="poll-options">';
  poll.options.forEach((opt, i) => {
    optionsHTML += `
      <button class="poll-option-btn" onclick="selectOption(${poll.id}, ${i}, this)">
        <span class="poll-option-radio"></span>
        ${escapeHtml(opt)}
      </button>`;
  });
  if (poll.allowOther) {
    optionsHTML += `
      <button class="poll-option-btn" onclick="selectOption(${poll.id}, -1, this)">
        <span class="poll-option-radio"></span>
        Other (type your own)
      </button>
      <input type="text" class="poll-other-input" id="other-input-${poll.id}" placeholder="Type your answer..." style="display:none;">`;
  }
  optionsHTML += '</div>';

  return `
    <div class="poll-bubble-question">${escapeHtml(poll.question)}</div>
    ${timerHTML}
    ${optionsHTML}
    <div class="poll-submit-row">
      <button class="btn btn-primary btn-sm" onclick="submitVote(${poll.id})">Submit Vote</button>
    </div>`;
}

/* Participant Timer */
function startParticipantTimer(poll) {
  const interval = setInterval(() => {
    if (poll.ended || poll.submitted || state.currentPage !== 'room') {
      clearInterval(interval);
      return;
    }
    poll.timerRemaining--;
    const timerEl = document.getElementById(`ptimer-${poll.id}`);
    if (timerEl) {
      timerEl.textContent = `${poll.timerRemaining}s remaining`;
      const parent = timerEl.parentElement;
      if (poll.timerRemaining <= 10) parent.classList.add('urgent');
    }
    if (poll.timerRemaining <= 0) {
      poll.ended = true;
      clearInterval(interval);
      const bubble = document.getElementById(`poll-${poll.id}`);
      if (bubble) bubble.innerHTML = buildParticipantPollHTML(poll);
    }
  }, 1000);
  state.simulationIntervals.push(interval);
}

/* ===========================
   Poll Interaction (Participant)
   =========================== */
let selectedOptions = {}; // pollId -> optionIndex

function selectOption(pollId, optionIndex, btn) {
  selectedOptions[pollId] = optionIndex;

  // Update UI
  const bubble = document.getElementById(`poll-${pollId}`);
  bubble.querySelectorAll('.poll-option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  // Show/hide other input
  const otherInput = document.getElementById(`other-input-${pollId}`);
  if (otherInput) {
    otherInput.style.display = optionIndex === -1 ? '' : 'none';
    if (optionIndex === -1) otherInput.focus();
  }
}

function submitVote(pollId) {
  const poll = state.polls.find(p => p.id === pollId);
  if (!poll || poll.submitted || poll.ended) return;

    const selection = selectedOptions[pollId];
    if (selection === undefined) return; // No selection

    // If "Other" was selected, capture the typed text
    if (selection === -1 && poll.allowOther) {
      const otherInput = document.getElementById(`other-input-${pollId}`);
      const otherText = otherInput ? otherInput.value.trim() : '';
      if (!otherText) {
        otherInput.style.borderColor = 'var(--danger)';
        otherInput.placeholder = 'Please type your answer first...';
        otherInput.focus();
        setTimeout(() => { otherInput.style.borderColor = ''; }, 1500);
        return;
      }
      poll.otherVotes.push(otherText);
      poll.totalVotes++;
    } else {
      poll.votes[selection] = (poll.votes[selection] || 0) + 1;
      poll.totalVotes++;
    }

    poll.submitted = true;

  // Update bubble
  const bubble = document.getElementById(`poll-${pollId}`);
  if (bubble) bubble.innerHTML = buildParticipantPollHTML(poll);

  // After some delay, simulate another poll appearing
  setTimeout(() => {
    if (state.currentPage === 'room' && state.role === 'participant') {
      simulateHostPoll();
    }
  }, 5000);
}

/* ===========================
   Utility
   =========================== */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ===========================
   Keyboard support for join code
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
  const joinInput = document.getElementById('join-code-input');
  if (joinInput) {
    joinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') joinRoom();
    });
    // Only allow digits
    joinInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
    });
  }
});

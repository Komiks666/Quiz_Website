document.addEventListener('DOMContentLoaded', () => {
  const sections = Array.from(document.querySelectorAll('body > section'));
  let currentIndex = 0;
  let timerInterval = null;
  let score = 0;

  const totalQuestions = sections.filter(s => s.querySelector('.question-card')).length;

  // ---- Build a results screen and add it as the last "section" ----
  const resultsScreen = document.createElement('section');
  resultsScreen.className = 'results-screen';
  resultsScreen.style.cssText = 'display:none; text-align:center; padding:60px 20px;';
  resultsScreen.innerHTML = `
    <h1>Quiz Complete!</h1>
    <p class="score-text" style="font-size:24px; margin:20px 0;"></p>
    <button class="restart-btn" style="padding:10px 24px; font-size:16px; cursor:pointer;">Restart Quiz</button>
  `;
  document.body.appendChild(resultsScreen);
  sections.push(resultsScreen);

  // ---- Helpers ----
  function isIntro(section) {
    return section.classList.contains('part-one') || section.classList.contains('part-two');
  }

  function isQuestion(section) {
    return !!section.querySelector('.question-card');
  }

  // Reads the "<!-- CORRECT ANSWER: X -->" comment near a question-card,
  // whether it sits inside the card or right after it closes.
  function getCorrectAnswer(card) {
    for (const node of card.childNodes) {
      if (node.nodeType === Node.COMMENT_NODE) {
        const match = node.textContent.match(/CORRECT ANSWER:\s*(.+)/i);
        if (match) return match[1].trim();
      }
    }
    let sib = card.nextSibling;
    while (sib) {
      if (sib.nodeType === Node.COMMENT_NODE) {
        const match = sib.textContent.match(/CORRECT ANSWER:\s*(.+)/i);
        if (match) return match[1].trim();
      }
      if (sib.nodeType === Node.ELEMENT_NODE) break;
      sib = sib.nextSibling;
    }
    return null;
  }

  // ---- Part I: Multiple choice ----
  function setupMultipleChoice(section) {
    const card = section.querySelector('.question-card');
    const correctLetter = getCorrectAnswer(card);
    const buttons = section.querySelectorAll('.options button');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (section.dataset.answered) return;
        section.dataset.answered = 'true';

        const chosen = btn.dataset.letter;
        buttons.forEach(b => (b.disabled = true));

        if (chosen === correctLetter) {
          btn.style.background = '#4caf50';
          btn.style.color = '#fff';
          score++;
        } else {
          btn.style.background = '#f44336';
          btn.style.color = '#fff';
          buttons.forEach(b => {
            if (b.dataset.letter === correctLetter) {
              b.style.background = '#4caf50';
              b.style.color = '#fff';
            }
          });
        }
      });
    });
  }

  // ---- Part II: Fill in the blanks (adds an input, since the HTML has none) ----
  function setupFillBlank(section) {
    const card = section.querySelector('.question-card');
    if (card.querySelector('.answer-input')) return;

    const correctAnswer = getCorrectAnswer(card);

    const area = document.createElement('div');
    area.className = 'answer-area';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'answer-input';
    input.placeholder = 'Type your answer';

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Check';
    submitBtn.className = 'blank-submit';
    submitBtn.style.cssText =
      'margin-top:14px; padding:10px 24px; font-size:0.95rem; font-weight:600; ' +
      'background:#40e0d0; color:#0a192f; border:none; border-radius:8px; cursor:pointer;';

    const feedback = document.createElement('p');
    feedback.className = 'blank-feedback';
    feedback.style.cssText = 'margin-top:12px; font-weight:700;';

    area.appendChild(input);
    card.appendChild(area);
    card.appendChild(submitBtn);
    card.appendChild(feedback);

    function checkAnswer() {
      if (section.dataset.answered) return;
      section.dataset.answered = 'true';
      input.disabled = true;
      submitBtn.disabled = true;

      const userAnswer = input.value.trim().toLowerCase();
      const isCorrect = correctAnswer && userAnswer === correctAnswer.toLowerCase();

      if (isCorrect) {
        score++;
        feedback.textContent = 'Correct!';
        feedback.style.color = '#4caf50';
      } else {
        feedback.textContent = `Incorrect. Correct answer: ${correctAnswer}`;
        feedback.style.color = '#f44336';
      }
    }

    submitBtn.addEventListener('click', checkAnswer);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') checkAnswer();
    });
  }

  // ---- Timer (also drives the progress-fill bar as a countdown) ----
  const TOTAL_TIME = 30;

  function startTimer(section) {
    clearInterval(timerInterval);
    const timerBox = section.querySelector('.timer-box');
    const progressFill = section.querySelector('.progress-fill');
    if (!timerBox) return;

    let timeLeft = TOTAL_TIME;
    timerBox.textContent = `⏱ ${timeLeft} sec`;

    if (progressFill) {
      // Reset instantly to full, then let it drain smoothly over TOTAL_TIME seconds.
      progressFill.style.transition = 'none';
      progressFill.style.width = '100%';
      void progressFill.offsetWidth; // force reflow so the reset actually applies
      progressFill.style.transition = `width ${TOTAL_TIME}s linear`;
      progressFill.style.width = '0%';
    }

    timerInterval = setInterval(() => {
      timeLeft--;
      timerBox.textContent = `⏱ ${timeLeft} sec`;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        goNext();
      }
    }, 1000);
  }

  // ---- Screen switching ----
  function showSection(index) {
    clearInterval(timerInterval);
    sections.forEach((s, i) => {
      s.style.display = i === index ? '' : 'none';
    });
    currentIndex = index;
    const section = sections[index];

    if (section === resultsScreen) {
      resultsScreen.querySelector('.score-text').textContent =
        `You scored ${score} out of ${totalQuestions}`;
      return;
    }

    if (isQuestion(section)) {
      startTimer(section);
    }
  }

  function goNext() {
    if (currentIndex < sections.length - 1) showSection(currentIndex + 1);
  }

  function goPrev() {
    if (currentIndex > 0) showSection(currentIndex - 1);
  }

  // ---- Wire up question sections ----
  sections.forEach(section => {
    if (!isQuestion(section)) return;

    if (section.querySelector('.options')) {
      setupMultipleChoice(section);
    } else {
      setupFillBlank(section);
    }

    const nextBtn = section.querySelector('.next-button');
    const prevBtn = section.querySelector('.previous-button');
    if (nextBtn) nextBtn.addEventListener('click', goNext);
    if (prevBtn) prevBtn.addEventListener('click', goPrev);
  });

  // ---- Wire up intro screens ----
  sections.forEach(section => {
    if (!isIntro(section)) return;
    const startBtn = section.querySelector('.start-btn');
    if (startBtn) startBtn.addEventListener('click', goNext);
  });

  // ---- Restart ----
  resultsScreen.querySelector('.restart-btn').addEventListener('click', () => {
    score = 0;
    sections.forEach(s => {
      delete s.dataset.answered;

      s.querySelectorAll('.options button').forEach(b => {
        b.disabled = false;
        b.style.background = '';
        b.style.color = '';
      });

      const input = s.querySelector('.answer-input');
      if (input) {
        input.value = '';
        input.disabled = false;
      }

      const progressFill = s.querySelector('.progress-fill');
      if (progressFill) {
        progressFill.style.transition = 'none';
        progressFill.style.width = '100%';
      }
      const submitBtn = s.querySelector('.blank-submit');
      if (submitBtn) submitBtn.disabled = false;
      const feedback = s.querySelector('.blank-feedback');
      if (feedback) feedback.textContent = '';
    });
    showSection(0);
  });

  // ---- Keyboard navigation ----
  document.addEventListener('keydown', e => {
    const section = sections[currentIndex];
    if (e.code === 'Space' && isIntro(section)) {
      e.preventDefault();
      goNext();
    } else if (e.key === 'ArrowRight') {
      goNext();
    } else if (e.key === 'ArrowLeft') {
      goPrev();
    }
  });

  // ---- Start ----
  showSection(0);
});


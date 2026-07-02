/* =========================================
   ESPAÇOLASER ALPHAVILLE
   Landing Page — Formulário de Qualificação
   script.js
   ========================================= */

/* ─── Respostas coletadas ─── */
const answers = {
  nome:        '',
  telefone:    '',
  area:        '',
  experiencia: '',
  objecao:     '',
  interesse:   ''
};

/* Mapa: número da pergunta → chave no objeto answers */
const ANSWER_KEYS = {
  3: 'area',
  4: 'experiencia',
  5: 'objecao',
  6: 'interesse'
};

const TOTAL_QUESTIONS = 6;
const WHATSAPP_NUMBER = '5511992259772';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxCoBQeGbm6TFzM3XWK_E4aOXBo2SFFIHGJ2JZsR02w3cSY2-nH4O5z9Tp-XHRsotTo/exec';

let currentStep     = 0;
let isTransitioning = false;

/* ─── Inicialização ─── */
document.addEventListener('DOMContentLoaded', () => {
  setupPhoneMask();
  setupOptionCards();
  setupButtons();
  setupKeyboard();
});

/* ─── Máscara de Telefone (formato brasileiro) ─── */
function setupPhoneMask() {
  const input = document.getElementById('inputPhone');
  if (!input) return;

  input.addEventListener('input', function () {
    const raw = this.value.replace(/\D/g, '').slice(0, 11);
    let masked = '';

    if (raw.length === 0) {
      masked = '';
    } else if (raw.length <= 2) {
      masked = '(' + raw;
    } else if (raw.length <= 6) {
      masked = '(' + raw.slice(0, 2) + ') ' + raw.slice(2);
    } else if (raw.length <= 10) {
      /* Telefone fixo: (XX) XXXX-XXXX */
      masked = '(' + raw.slice(0, 2) + ') ' + raw.slice(2, 6) + '-' + raw.slice(6);
    } else {
      /* Celular: (XX) XXXXX-XXXX */
      masked = '(' + raw.slice(0, 2) + ') ' + raw.slice(2, 7) + '-' + raw.slice(7);
    }

    this.value = masked;
  });
}

/* ─── Seleção de cards de opção ─── */
function setupOptionCards() {
  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', function () {
      const group = this.dataset.q;
      const value = this.dataset.val;

      /* Desmarcar todas as opções do mesmo grupo */
      document.querySelectorAll(`.option-card[data-q="${group}"]`).forEach(c =>
        c.classList.remove('selected')
      );

      /* Marcar a opção clicada */
      this.classList.add('selected');

      /* Persistir resposta no objeto */
      const key = ANSWER_KEYS[parseInt(group)];
      if (key) answers[key] = value;

      /* Ocultar erro da pergunta, se visível */
      hideError(parseInt(group));

      /* Avançar automaticamente após pequeno delay */
      setTimeout(() => goNext(parseInt(group)), 380);
    });
  });
}

/* ─── Configuração de botões ─── */
function setupButtons() {
  document.getElementById('btnStart').addEventListener('click', () => goNext(0));
  document.getElementById('btnWhatsapp').addEventListener('click', openWhatsApp);

  /* Delegação de eventos para todos os [data-next] e [data-prev] */
  document.getElementById('formContainer').addEventListener('click', e => {
    const btnNext = e.target.closest('[data-next]');
    const btnPrev = e.target.closest('[data-prev]');

    if (btnNext) goNext(parseInt(btnNext.dataset.next));
    if (btnPrev) goPrev(parseInt(btnPrev.dataset.prev));
  });
}

/* ─── Navegação por teclado (Enter avança) ─── */
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    /* Não interferir quando um option-card está focado */
    if (document.activeElement && document.activeElement.classList.contains('option-card')) return;

    const active = document.querySelector('.screen.active');
    if (!active || active.dataset.screen === undefined) return;

    goNext(parseInt(active.dataset.screen));
  });
}

/* ─── Avançar etapa ─── */
function goNext(step) {
  if (isTransitioning) return;

  /* Coleta e validação por etapa */
  if (step === 1) {
    const name = document.getElementById('inputName').value.trim();
    if (!name) { showError(1); document.getElementById('inputName').focus(); return; }
    hideError(1);
    answers.nome = name;
  }

  if (step === 2) {
    const raw = document.getElementById('inputPhone').value.replace(/\D/g, '');
    if (raw.length < 10) { showError(2); document.getElementById('inputPhone').focus(); return; }
    hideError(2);
    answers.telefone = document.getElementById('inputPhone').value.trim();
  }

  if (step >= 3 && step <= 6) {
    const selected = document.querySelector(`.option-card[data-q="${step}"].selected`);
    if (!selected) { showError(step); return; }
    hideError(step);
  }

  /* Determinar próxima tela */
  const next = step < TOTAL_QUESTIONS ? step + 1 : 'final';

  if (next === 'final') sendToSheets();

  doTransition(step, next, 'forward');
}

/* ─── Voltar etapa ─── */
function goPrev(step) {
  if (isTransitioning || step <= 1) return;
  doTransition(step, step - 1, 'back');
}

/* ─── Animação de transição entre telas ─── */
function doTransition(from, to, direction) {
  isTransitioning = true;

  const fromEl = document.getElementById(resolveId(from));
  const toEl   = document.getElementById(resolveId(to));

  if (!fromEl || !toEl) { isTransitioning = false; return; }

  const exitClass  = direction === 'forward' ? 'exit-forward' : 'exit-back';
  const enterClass = direction === 'back'    ? 'enter-back'   : null;

  /* Animação de saída da tela atual */
  fromEl.classList.add(exitClass);

  setTimeout(() => {
    fromEl.classList.remove('active', exitClass);

    /* Exibir próxima tela */
    toEl.classList.add('active');
    if (enterClass) {
      toEl.classList.add(enterClass);
      setTimeout(() => toEl.classList.remove(enterClass), 360);
    }

    /* Atualizar estado e UI */
    currentStep = to;
    updateProgress(to);
    scrollUp();
    isTransitioning = false;

    /* Foco automático no primeiro campo de texto */
    const firstInput = toEl.querySelector('.field-input');
    if (firstInput) setTimeout(() => firstInput.focus(), 80);

  }, 230);
}

/* Resolve o ID da tela pelo identificador de etapa */
function resolveId(step) {
  if (step === 'disqualified') return 'screen-disqualified';
  if (step === 'final')        return 'screen-final';
  return `screen-${step}`;
}

/* ─── Barra de Progresso ─── */
function updateProgress(step) {
  const wrapper = document.getElementById('progressWrapper');
  const fill    = document.getElementById('progressFill');
  const label   = document.getElementById('progressLabel');

  const numStep = parseInt(step);
  const isQuestion = numStep >= 1 && numStep <= TOTAL_QUESTIONS;

  if (!isQuestion) {
    wrapper.classList.remove('visible');
    return;
  }

  wrapper.classList.add('visible');
  fill.style.width  = `${(numStep / TOTAL_QUESTIONS) * 100}%`;
  label.textContent = `Pergunta ${numStep} de ${TOTAL_QUESTIONS}`;
}

/* ─── Exibir erro ─── */
function showError(step) {
  const el = document.getElementById(`error-${step}`);
  if (el) el.classList.remove('hidden');

  if (step === 1) document.getElementById('inputName').classList.add('has-error');
  if (step === 2) document.getElementById('inputPhone').classList.add('has-error');
}

/* ─── Ocultar erro ─── */
function hideError(step) {
  const el = document.getElementById(`error-${step}`);
  if (el) el.classList.add('hidden');

  if (step === 1) document.getElementById('inputName').classList.remove('has-error');
  if (step === 2) document.getElementById('inputPhone').classList.remove('has-error');
}

/* ─── Abrir WhatsApp com mensagem completa ─── */
function openWhatsApp() {
  const message = buildMessage();
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/* Monta a mensagem com todas as respostas do lead */
function buildMessage() {
  return `Olá! Acabei de preencher o formulário da Espaçolaser Alphaville. Tenho interesse em realizar uma avaliação!`;
}

/* ─── Encerrar formulário (tela de desqualificação) ─── */
function handleClose() {
  document.getElementById('formContainer').innerHTML = `
    <div style="
      padding: 48px 0;
      text-align: center;
      font-family: 'Poppins', sans-serif;
      animation: enterForward 0.35s ease both;
    ">
      <p style="font-size: 16px; color: #6B7280; line-height: 1.7;">
        Até breve!<br>Quando estiver pronto, estaremos aqui. 👋
      </p>
    </div>
  `;
}

/* ─── Enviar respostas para o Google Sheets ─── */
function sendToSheets() {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'SUA_URL_DO_APPS_SCRIPT_AQUI') return;
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answers)
  }).catch(() => {});
}

/* ─── Rolar suavemente ao topo ─── */
function scrollUp() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

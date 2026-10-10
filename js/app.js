/* ============================================================
   DND 职业性格测试 —— 交互逻辑
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const TYPE_LABEL = {
  choice: '情景抉择',
  multi: '多选任务',
  rank: '直觉排序'
};
const RANK_WEIGHT = [3, 2, 1, 0]; // 第 1~4 顺位的权重
const KEYS = ['A', 'B', 'C', 'D', 'E'];
/* NPC 立绘已落地到本地，随仓库部署，不依赖任何外部图片接口 */
function portraitURL(file) {
  return `img/npc/${file}`;
}

const state = {
  idx: 0,
  answers: [], // 每题：choice=[optIndex] / multi=[optIndex...] / rank=[optIndex...]（按顺位）
  scores: {}
};

/* ---------- 徽章 SVG ---------- */
function emblemSVG(icon, size = 24) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none"
    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
}

/* ---------- 落地页：职业卡片 ---------- */
function renderClassGrid() {
  const grid = $('#classGrid');
  grid.innerHTML = Object.entries(CLASSES).map(([key, c]) => `
    <article class="class-card" style="--c:${c.color}">
      <div class="class-card__emblem">${emblemSVG(c.icon, 30)}</div>
      <h3 class="class-card__name">${c.name}</h3>
      <p class="class-card__en">${c.en}</p>
      <p class="class-card__title">${c.title}</p>
    </article>`).join('');

  $$('.mini-emblem').forEach(el => {
    const c = CLASSES[el.dataset.key];
    if (c) {
      el.style.color = c.color;
      el.style.borderColor = c.color + '66';
      el.innerHTML = emblemSVG(c.icon, 21);
    }
  });
}

/* ---------- 屏幕切换 ---------- */
function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('is-active'));
  $('#' + id).classList.add('is-active');
  window.scrollTo({ top: 0 });
}

/* ---------- 开始 / 重置 ---------- */
function startTest() {
  state.idx = 0;
  state.answers = [];
  state.scores = {};
  buildRunes();
  renderQuestion();
  showScreen('screen-test');
}

document.addEventListener('click', e => {
  const startBtn = e.target.closest('[data-action="start"]');
  if (startBtn) startTest();
});

/* ---------- 进度符文 ---------- */
function buildRunes() {
  $('#progressRunes').innerHTML =
    QUESTIONS.map(() => '<i>◆</i>').join('');
}
function updateProgress() {
  const pct = (state.idx / QUESTIONS.length) * 100;
  $('#progressBar').style.setProperty('--p', pct + '%');
  $('#qIndex').textContent = state.idx + 1;
  const $total = $('#qTotal');
  if ($total) $total.textContent = QUESTIONS.length;
  $$('#progressRunes i').forEach((r, i) =>
    r.classList.toggle('done', i < state.idx));
  $('#btnBack').classList.toggle('visible', state.idx > 0);
}

/* ---------- 渲染题目 ---------- */
function renderQuestion() {
  const i = state.idx;
  const q = QUESTIONS[i];
  updateProgress();

  $('#qType').textContent = TYPE_LABEL[q.type];

  const body = $('#quizBody');
  body.classList.remove('go-out');

  const saved = state.answers[i] || [];

  let optionsHTML = '';
  q.options.forEach((opt, oi) => {
    const isSelected = q.type === 'choice' && saved[0] === oi;
    const isMulti = q.type === 'multi' && saved.includes(oi);
    const rankPos = q.type === 'rank' ? saved.indexOf(oi) : -1;

    let inner;
    if (q.type === 'rank') {
      inner = `
        <span class="rank-badge">${rankPos >= 0 ? rankPos + 1 : ''}</span>
        <span class="option__text">${opt.text}</span>`;
    } else if (q.type === 'multi') {
      inner = `
        <span class="option__key">
          <svg viewBox="0 0 24 24" fill="none" stroke="#241a08" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </span>
        <span class="option__text">${opt.text}</span>`;
    } else {
      inner = `
        <span class="option__key">${KEYS[oi]}</span>
        <span class="option__text">${opt.text}</span>`;
    }

    const cls = ['option',
      q.type === 'multi' ? 'option--multi' : '',
      q.type === 'rank' ? 'option--rank' : '',
      isSelected || isMulti || rankPos >= 0 ? 'selected' : '',
      rankPos >= 0 ? 'ranked' : ''
    ].filter(Boolean).join(' ');

    optionsHTML += `
      <button type="button" class="${cls}" data-oi="${oi}">${inner}</button>`;
  });

  let footHTML = '';
  if (q.type === 'multi') {
    footHTML = `<button class="btn btn--gold" id="btnNext" ${saved.length ? '' : 'disabled'}>
      <span>下一题</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </button>`;
  } else if (q.type === 'rank') {
    footHTML = `
      <button class="link-btn" id="btnReset">重新排序</button>
      <button class="btn btn--gold" id="btnNext" ${saved.length === q.options.length ? '' : 'disabled'}>
        <span>下一题</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>`;
  }

  body.innerHTML = `
    <h2 class="quiz__q">${q.q}</h2>
    ${q.hint ? `<p class="quiz__hint">${q.hint}</p>` : ''}
    <div class="options">${optionsHTML}</div>
    <div class="quiz__foot">${footHTML}</div>`;

  bindOptionEvents();
}

/* ---------- 选项交互 ---------- */
function bindOptionEvents() {
  const i = state.idx;
  const q = QUESTIONS[i];
  const body = $('#quizBody');

  if (q.type === 'choice') {
    $$('.option', body).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.option', body).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.answers[i] = [Number(btn.dataset.oi)];
        setTimeout(goNext, 340);
      });
    });
  }

  if (q.type === 'multi') {
    $$('.option', body).forEach(btn => {
      btn.addEventListener('click', () => {
        const oi = Number(btn.dataset.oi);
        const cur = state.answers[i] || [];
        const pos = cur.indexOf(oi);
        if (pos >= 0) cur.splice(pos, 1); else cur.push(oi);
        state.answers[i] = cur;
        btn.classList.toggle('selected', pos < 0);
        $('#btnNext').disabled = cur.length === 0;
      });
    });
    $('#btnNext').addEventListener('click', goNext);
  }

  if (q.type === 'rank') {
    const current = () => state.answers[i] || [];

    $$('.option', body).forEach(btn => {
      btn.addEventListener('click', () => {
        const oi = Number(btn.dataset.oi);
        const order = current();
        const pos = order.indexOf(oi);
        if (pos >= 0) {
          order.splice(pos, 1); // 再点一次取消，后面顺位自动前移
        } else {
          order.push(oi);
        }
        state.answers[i] = order;
        refreshRankUI();
      });
    });

    $('#btnReset').addEventListener('click', () => {
      state.answers[i] = [];
      refreshRankUI();
    });
    $('#btnNext').addEventListener('click', goNext);
  }
}

function refreshRankUI() {
  const i = state.idx;
  const q = QUESTIONS[i];
  const order = state.answers[i] || [];
  $$('#quizBody .option').forEach(btn => {
    const oi = Number(btn.dataset.oi);
    const pos = order.indexOf(oi);
    btn.classList.toggle('ranked', pos >= 0);
    btn.classList.toggle('selected', pos >= 0);
    $('.rank-badge', btn).textContent = pos >= 0 ? pos + 1 : '';
  });
  $('#btnNext').disabled = order.length !== q.options.length;
}

/* ---------- 翻页 ---------- */
function goNext() {
  const body = $('#quizBody');
  body.classList.add('go-out');
  setTimeout(() => {
    state.idx++;
    if (state.idx >= QUESTIONS.length) {
      computeScores();
      renderResult();
      showScreen('screen-result');
    } else {
      renderQuestion();
    }
  }, 300);
}

$('#btnBack').addEventListener('click', () => {
  if (state.idx === 0) return;
  const body = $('#quizBody');
  body.style.animation = 'qIn .4s reverse both';
  setTimeout(() => {
    body.style.animation = '';
    state.idx--;
    renderQuestion();
  }, 200);
});

/* ---------- 计分 ---------- */
function addScore(p, weight = 1) {
  Object.entries(p).forEach(([k, v]) => {
    state.scores[k] = (state.scores[k] || 0) + v * weight;
  });
}

function computeScores() {
  state.scores = {};
  QUESTIONS.forEach((q, i) => {
    const ans = state.answers[i] || [];
    if (q.type === 'choice') {
      const opt = q.options[ans[0]];
      if (opt) addScore(opt.p);
    } else if (q.type === 'multi') {
      ans.forEach(oi => addScore(q.options[oi].p));
    } else if (q.type === 'rank') {
      ans.forEach((oi, rank) => addScore(q.options[oi].p, RANK_WEIGHT[rank]));
    }
  });
}

/* ---------- 结果 ---------- */
function renderResult() {
  const ranked = Object.entries(state.scores)
    .sort((a, b) => b[1] - a[1]);
  const [topKey, topScore] = ranked[0];
  const [secondKey] = ranked[1];
  const c = CLASSES[topKey];
  const second = CLASSES[secondKey];

  const screen = $('#screen-result');
  screen.style.setProperty('--rc', c.color);

  const top5 = ranked.slice(0, 5);
  const affRows = top5.map(([key, score], idx) => {
    const pct = Math.round((score / topScore) * 100);
    return `
      <div class="aff-row ${idx === 0 ? 'is-top' : ''}">
        <span class="aff-row__name">${CLASSES[key].name}</span>
        <span class="aff-row__track">
          <span class="aff-row__fill" style="--c:${CLASSES[key].color}; transition-delay:${idx * 120}ms"></span>
        </span>
        <span class="aff-row__pct">${pct}%</span>
      </div>`;
  }).join('');

  $('#resultBody').innerHTML = `
    <p class="result__eyebrow">THE DICE HAVE SPOKEN · 命运已揭晓</p>

    <div class="result__seal" style="--rc:${c.color}">${emblemSVG(c.icon, 58)}</div>

    <p class="result__en">${c.en}</p>
    <h1 class="result__name" style="--rc:${c.color}">${c.name}</h1>
    <p class="result__title">${c.title}</p>

    <p class="result__motto">${c.motto}</p>

    <div class="result__card">
      <p class="result__desc">${c.desc}</p>
      <dl class="result__facts">
        <div class="fact"><dt>核心属性</dt><dd>${c.ability}</dd></div>
        <div class="fact"><dt>团队定位</dt><dd>${c.role}</dd></div>
        <div class="fact"><dt>推荐子职</dt><dd>${c.subclass}</dd></div>
      </dl>
      <div class="result__traits">
        ${c.traits.map(t => `<span class="trait" style="--rc:${c.color}">${t}</span>`).join('')}
      </div>
    </div>

    <section class="npc">
      <p class="npc__head">◆ 本职业传奇代表 ◆</p>
      <figure class="npc__card">
        <div class="npc__portrait">
          <span class="npc__emblem" style="color:${c.color}">${emblemSVG(c.icon, 64)}</span>
          <img src="${portraitURL(c.npc.img)}" alt="${c.npc.name}人物立绘" loading="lazy">
          <span class="npc__frame" aria-hidden="true"></span>
        </div>
        <figcaption class="npc__info">
          <h3 class="npc__name">${c.npc.name}</h3>
          <p class="npc__title">${c.npc.title}</p>
          <p class="npc__desc">${c.npc.desc}</p>
        </figcaption>
      </figure>
      <p class="npc__note">人物版权归原作者所有 · 立绘由 AI 依据经典设定想象生成，非官方形象</p>
    </section>

    <div class="affinity">
      <p class="affinity__head">◆ 职业契合度 · TOP 5 ◆</p>
      ${affRows}
    </div>

    <p class="result__note">
      你的灵魂并非单一颜色——第二倾向 <strong>${second.name} · ${second.title}</strong>
      的特质也在你心中占据一席之地。
    </p>

    <div class="result__actions">
      <button class="btn btn--gold" data-action="start">
        <span>重新掷骰</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/></svg>
      </button>
      <button class="btn btn--ghost" id="btnHome">返回序章</button>
    </div>`;

  // 立绘缺失（尚未生成/404）时露出底层职业徽章
  const npcImg = $('.npc__portrait img');
  if (npcImg) {
    const markMissing = () => npcImg.classList.add('is-missing');
    npcImg.addEventListener('error', markMissing);
    if (npcImg.complete && npcImg.naturalWidth === 0) markMissing();
  }

  // 进度条动画（等待 DOM 上屏后再赋宽度）
  requestAnimationFrame(() => {
    $$('.aff-row__fill').forEach((el, idx) => {
      const pct = Math.round((top5[idx][1] / topScore) * 100);
      setTimeout(() => { el.style.width = pct + '%'; }, 120 + idx * 120);
    });
  });

  $('#btnHome').addEventListener('click', () => showScreen('screen-landing'));
}

/* ---------- 初始化 ---------- */
renderClassGrid();

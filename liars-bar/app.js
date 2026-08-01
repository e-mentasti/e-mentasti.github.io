/* ══════════════════════════════════════════════════════════════
   Liar's Bar — calcolatore di probabilità
   Tutto gira nel browser: nessun dato esce da questa pagina.
   ══════════════════════════════════════════════════════════════ */

/* ---------- matematica di base ---------- */

/* Combinazioni: in quanti modi si scelgono k oggetti fra n */
function comb(n, k) {
  if (k < 0 || k > n || n < 0) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

/* Ipergeometrica: pescando k carte da un mazzo di U in cui I sono
   innocenti, probabilità che siano innocenti tutte quante */
function pAllInnocent(I, U, k) {
  if (k <= 0) return 1;
  if (I < k) return 0;
  return comb(I, k) / comb(U, k);
}

/* Binomiale: probabilità di almeno m successi su n prove con probabilità p */
function pAtLeast(n, m, p) {
  if (m <= 0) return 1;
  if (m > n) return 0;
  let tot = 0;
  for (let i = m; i <= n; i++) {
    tot += comb(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
  }
  return tot;
}

/* Percentuali leggibili. Distingue lo zero vero da "molto raro":
   se arrotondassimo a 0% una probabilità dello 0,08% sembrerebbe
   impossibile, e non lo è. */
function pct(x) {
  if (x <= 0) return '0%';
  if (x >= 1) return '100%';
  if (x < 0.005) return '<1%';
  if (x > 0.995) return '>99%';
  return (x * 100).toFixed(x < 0.1 ? 1 : 0) + '%';
}

/* ---------- utilità per i controlli ---------- */

/* Gruppo di bottoni a scelta singola */
function choiceGroup(id, onPick) {
  const box = document.getElementById(id);
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.choice');
    if (!b) return;
    box.querySelectorAll('.choice').forEach((x) => x.classList.remove('is-on'));
    b.classList.add('is-on');
    onPick(b.dataset.v);
  });
  return () => box.querySelector('.is-on').dataset.v;
}

/* Gruppo di contatori +/- */
function stepperGroup(id, limits, onChange) {
  const box = document.getElementById(id);
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.pm');
    if (!b) return;
    const st = b.closest('.stepper');
    const val = st.querySelector('.val');
    const key = st.dataset.k;
    const lim = limits(key);
    const next = Number(val.textContent) + Number(b.dataset.d);
    if (next < lim.min || next > lim.max) return;
    val.textContent = next;
    onChange();
  });
  return () => {
    const out = {};
    box.querySelectorAll('.stepper').forEach((st) => {
      out[st.dataset.k] = Number(st.querySelector('.val').textContent);
    });
    return out;
  };
}

/* ══════════════════ LIAR'S DECK ══════════════════

   Il mazzo è di 20 carte: 6 Re, 6 Regine, 6 Assi, 2 Jolly.
   Gli innocenti di ogni round sono sempre 8: le 6 del tipo del
   tavolo più i 2 Jolly. Tu ne vedi 5, quindi le 15 che non vedi
   contengono esattamente 8 meno i tuoi. Non è una stima.        */

const DECK_INNOCENTS = 8;
const DECK_UNSEEN = 15;
const DECK_MAX = { K: 6, Q: 6, A: 6, J: 2 };

const getTable  = choiceGroup('deck-table', render);
const getPlayed = choiceGroup('deck-played', () => { clampDeckTotal(); render(); });
const getMyGun  = choiceGroup('deck-me', render);
const getHisGun = choiceGroup('deck-him', render);
const getHand   = stepperGroup('deck-hand', (k) => ({ min: 0, max: DECK_MAX[k] }), render);

/* Il totale delle carte calate non può scendere sotto quelle appena calate */
const deckTotalBox = document.getElementById('deck-total');
deckTotalBox.addEventListener('click', (e) => {
  const b = e.target.closest('.pm');
  if (!b) return;
  const val = deckTotalBox.querySelector('.val');
  const next = Number(val.textContent) + Number(b.dataset.d);
  if (next < Number(getPlayed()) || next > DECK_UNSEEN) return;
  val.textContent = next;
  render();
});
function clampDeckTotal() {
  const val = deckTotalBox.querySelector('.val');
  if (Number(val.textContent) < Number(getPlayed())) val.textContent = getPlayed();
}

function renderDeck() {
  const table = getTable();
  const hand = getHand();
  const k = Number(getPlayed());
  const totalPlayed = Number(deckTotalBox.querySelector('.val').textContent);

  const handSize = hand.K + hand.Q + hand.A + hand.J;
  const tally = document.getElementById('deck-tally');
  tally.textContent = handSize + ' / 5 carte';
  tally.className = 'tally ' + (handSize === 5 ? 'ok' : handSize > 5 ? 'err' : '');

  const verdict = document.getElementById('deck-verdict');
  const facts = document.getElementById('deck-facts');

  if (handSize !== 5) {
    verdict.className = 'verdict';
    verdict.innerHTML = '<span class="vhead">—</span><span class="vsub">Inserisci le tue 5 carte</span>';
    document.getElementById('deck-plie').textContent = '—';
    document.getElementById('deck-risk-me').textContent = '—';
    document.getElementById('deck-risk-him').textContent = '—';
    facts.innerHTML = '';
    return;
  }

  /* innocenti in mano tua = carte del tipo del tavolo + jolly */
  const mine = hand[table] + hand.J;
  const I = DECK_INNOCENTS - mine;          // innocenti fra le 15 che non vedi
  const pLie = 1 - pAllInnocent(I, DECK_UNSEEN, k);

  /* il tamburo non si rimescola: camere rimaste = 6 meno i colpi a vuoto */
  const myDeath  = 1 / (6 - Number(getMyGun()));
  const hisDeath = 1 / (6 - Number(getHisGun()));

  const riskMe  = (1 - pLie) * myDeath;     // sbagli, spari tu
  const riskHim = pLie * hisDeath;          // hai ragione, spara lui

  document.getElementById('deck-plie').textContent = pct(pLie);
  document.getElementById('deck-risk-me').textContent = pct(riskMe);
  document.getElementById('deck-risk-him').textContent = pct(riskHim);

  /* fatti certi, non probabilità */
  const forced = Math.max(0, totalPlayed - I);
  const rows = [];
  rows.push(`<li>Fuori dalla tua mano ci sono <b>${I} carte innocenti su 15</b> — il ${Math.round((I / 15) * 100)}% di quello che non vedi.</li>`);
  if (forced > 0) {
    rows.push(`<li class="alert">Sul tavolo ci sono già <b>almeno ${forced} bugie</b>: sono state calate più carte di quanti innocenti esistano. Non è una stima.</li>`);
  }
  rows.push(`<li>Il tuo prossimo sparo: <b>${pct(myDeath)}</b> — ${6 - Number(getMyGun())} camere rimaste. Il suo: <b>${pct(hisDeath)}</b>.</li>`);
  facts.innerHTML = rows.join('');

  /* il confronto che conta davvero */
  /* Nota: con 5 carte in mano gli innocenti fuori sono almeno 3 su 15,
     quindi pLie non arriva mai a 1 e riskMe non è mai zero. Nessuna
     giocata è una bugia certa; il minimo di pLie è il 47%. */
  let cls, head, sub;
  if (riskHim >= riskMe * 1.5) {
    cls = 'go'; head = 'Conviene chiamare';
    sub = `Gli scarichi addosso ${(riskHim / riskMe).toFixed(1)} volte il pericolo che ti prendi.`;
  } else if (riskHim > riskMe) {
    cls = 'meh'; head = 'Margine sottile';
    sub = 'Il conto è appena a tuo favore. Qui decide quello che sai di lui, non la matematica.';
  } else if (riskHim > riskMe * 0.6) {
    cls = 'meh'; head = 'Meglio lasciar correre';
    sub = 'Rischi più di quanto gli fai rischiare. Chiama solo se hai letto qualcosa.';
  } else {
    cls = 'no'; head = 'Non chiamare';
    sub = `Ti prenderesti ${(riskMe / Math.max(riskHim, 0.0001)).toFixed(1)} volte il rischio che gli passi.`;
  }
  verdict.className = 'verdict ' + cls;
  verdict.innerHTML = `<span class="vhead">${head}</span><span class="vsub">${sub}</span>`;
}

/* ══════════════════ LIAR'S DICE ══════════════════

   5 dadi a testa, gli 1 NON sono jolly. I dadi non si perdono:
   si perdono veleni, e il secondo è letale.                     */

const getDicePlayers = choiceGroup('dice-players', renderAll);
const getDiceFace    = choiceGroup('dice-face', renderAll);
const getDiceMyPois  = choiceGroup('dice-me', renderAll);
const getDiceHisPois = choiceGroup('dice-him', renderAll);
const getMyDice      = stepperGroup('dice-mine', () => ({ min: 0, max: 5 }), renderAll);

const qtyBox = document.getElementById('dice-qty');
qtyBox.addEventListener('click', (e) => {
  const b = e.target.closest('.pm');
  if (!b) return;
  const val = qtyBox.querySelector('.val');
  const next = Number(val.textContent) + Number(b.dataset.d);
  const max = 5 * Number(getDicePlayers());
  if (next < 1 || next > max) return;
  val.textContent = next;
  renderAll();
});

function renderDice() {
  const N = Number(getDicePlayers());
  const face = getDiceFace();
  const mine = getMyDice();
  const qty = Number(qtyBox.querySelector('.val').textContent);

  const total = Object.values(mine).reduce((a, b) => a + b, 0);
  const tally = document.getElementById('dice-tally');
  tally.textContent = total + ' / 5 dadi';
  tally.className = 'tally ' + (total === 5 ? 'ok' : total > 5 ? 'err' : '');

  const unknown = 5 * (N - 1);
  const verdict = document.getElementById('dice-verdict');
  const facts = document.getElementById('dice-facts');

  renderDiceGrid(unknown, mine, qty, Number(face));

  if (total !== 5) {
    verdict.className = 'verdict';
    verdict.innerHTML = '<span class="vhead">—</span><span class="vsub">Inserisci i tuoi 5 dadi</span>';
    document.getElementById('dice-ptrue').textContent = '—';
    facts.innerHTML = '';
    return;
  }

  const have = mine[face];
  const need = qty - have;
  const pTrue = pAtLeast(unknown, need, 1 / 6);

  document.getElementById('dice-ptrue').textContent = pct(pTrue);

  /* il veleno non è probabilistico: il secondo bicchiere uccide.
     Peso la prima dose come mezza morte, la seconda come una intera. */
  const costMe  = Number(getDiceMyPois()) === 1 ? 1 : 0.5;
  const costHim = Number(getDiceHisPois()) === 1 ? 1 : 0.5;
  const expMe  = pTrue * costMe;            // puntata vera → bevi tu
  const expHim = (1 - pTrue) * costHim;     // puntata falsa → beve lui

  const rows = [];
  rows.push(`<li>Ne hai già <b>${have}</b>. Perché la puntata regga, fra i <b>${unknown} dadi nascosti</b> ne servono almeno <b>${Math.max(need, 0)}</b>.</li>`);
  rows.push(`<li>Su ${unknown} dadi nascosti, la media di una faccia qualsiasi è <b>${(unknown / 6).toFixed(1)}</b>.</li>`);
  if (need > unknown) rows.push(`<li class="alert">Servono più dadi di quanti ne esistano nascosti: <b>la puntata è impossibile</b>.</li>`);
  else if (need <= 0) rows.push(`<li class="alert">Ce li hai già tutti tu: <b>la puntata è vera comunque</b>. Non chiamare.</li>`);
  if (Number(getDiceMyPois()) === 1) rows.push(`<li class="alert">Hai già un veleno: se sbagli, sei fuori.</li>`);
  if (Number(getDiceHisPois()) === 1) rows.push(`<li class="alert">Lui ha già un veleno: beccarlo lo elimina.</li>`);
  facts.innerHTML = rows.join('');

  let cls, head, sub;
  if (need <= 0) {
    cls = 'no'; head = 'Non chiamare mai';
    sub = 'Hai in mano da solo abbastanza dadi: la puntata è vera a prescindere dagli altri.';
  } else if (need > unknown) {
    cls = 'go'; head = 'Chiama, è impossibile';
    sub = 'Nemmeno con tutti i dadi nascosti a favore la puntata potrebbe reggere.';
  } else if (expHim >= expMe * 1.5) {
    cls = 'go'; head = 'Conviene chiamare';
    sub = `La puntata regge solo nel ${pct(pTrue)} dei casi, e a lui costa più caro che a te.`;
  } else if (expHim > expMe) {
    cls = 'meh'; head = 'Margine sottile';
    sub = 'Appena a tuo favore. Considera piuttosto un rilancio prudente.';
  } else {
    cls = 'no'; head = 'Meglio rilanciare';
    sub = `Chiamare ti espone più di quanto esponga lui. Guarda sotto quali rilanci restano sicuri.`;
  }
  verdict.className = 'verdict ' + cls;
  verdict.innerHTML = `<span class="vhead">${head}</span><span class="vsub">${sub}</span>`;
}

/* Griglia dei rilanci: per ogni puntata possibile, quanto è vera */
const PIPS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function renderDiceGrid(unknown, mine, qty, face) {
  const total = Object.values(mine).reduce((a, b) => a + b, 0);
  const maxQty = unknown + 5;
  const rows = [];

  rows.push('<tr><th></th>' + PIPS.map((p) => `<th>${p}</th>`).join('') + '</tr>');

  for (let q = qty; q <= Math.min(qty + 5, maxQty); q++) {
    const cells = PIPS.map((_, i) => {
      const f = i + 1;
      /* rilancio valido: stessa quantità e faccia più alta, oppure quantità maggiore */
      const legal = q > qty || (q === qty && f > face);
      if (q === qty && f === face) return '<td class="dead">ora</td>';
      if (!legal) return '<td class="dead">·</td>';
      if (total !== 5) return '<td class="dead">—</td>';
      const p = pAtLeast(unknown, q - mine[f], 1 / 6);
      return `<td>${pct(p)}</td>`;
    }).join('');
    rows.push(`<tr class="${q === qty ? 'now' : ''}"><td class="head">${q} dadi</td>${cells}</tr>`);
  }
  document.getElementById('dice-grid').innerHTML = rows.join('');
}

/* ══════════════════ REVOLVER ══════════════════

   6 camere, 1 proiettile, nessun rimescolamento. Da uno stato con
   c camere rimaste, morire entro i prossimi m spari è esattamente m/c. */

function renderRoulette() {
  const rows = ['<tr><th>Colpi a vuoto</th><th>Camere</th><th>Prossimo</th><th>Entro 2</th><th>Entro 3</th></tr>'];
  for (let b = 0; b <= 5; b++) {
    const c = 6 - b;
    const p = (m) => (m > c ? '—' : pct(Math.min(m, c) / c));
    rows.push(`<tr><td class="head">${b}</td><td>${c}</td><td>${p(1)}</td><td>${p(2)}</td><td>${p(3)}</td></tr>`);
  }
  document.getElementById('roul-table').innerHTML = rows.join('');
}

/* ---------- avvio ---------- */

function render() { renderDeck(); }
function renderAll() { renderDeck(); renderDice(); }

document.querySelector('.tabs').addEventListener('click', (e) => {
  const t = e.target.closest('.tab');
  if (!t) return;
  document.querySelectorAll('.tab').forEach((x) => x.classList.remove('is-active'));
  document.querySelectorAll('.panel').forEach((x) => x.classList.remove('is-active'));
  t.classList.add('is-active');
  document.getElementById('panel-' + t.dataset.panel).classList.add('is-active');
});

renderRoulette();
renderAll();

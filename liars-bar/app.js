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

/* Binomiale puntuale: esattamente m successi su n prove */
function pExactly(n, m, p) {
  if (m < 0 || m > n) return 0;
  return comb(n, m) * Math.pow(p, m) * Math.pow(1 - p, n - m);
}

/* Binomiale cumulata: almeno m successi su n prove */
function pAtLeast(n, m, p) {
  if (m <= 0) return 1;
  if (m > n) return 0;
  let tot = 0;
  for (let i = m; i <= n; i++) tot += pExactly(n, i, p);
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

function stepperGroup(id, limits, onChange) {
  const box = document.getElementById(id);
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.pm');
    if (!b) return;
    const st = b.closest('.stepper');
    const val = st.querySelector('.val');
    const lim = limits(st.dataset.k);
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

/* Contatore singolo, con limiti che possono cambiare nel tempo */
function counter(id, limits, onChange) {
  const box = document.getElementById(id);
  const val = box.querySelector('.val');
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.pm');
    if (!b) return;
    const lim = limits();
    const next = Number(val.textContent) + Number(b.dataset.d);
    if (next < lim.min || next > lim.max) return;
    val.textContent = next;
    onChange();
  });
  return {
    get: () => Number(val.textContent),
    clamp: () => {
      const lim = limits();
      const v = Number(val.textContent);
      if (v < lim.min) val.textContent = lim.min;
      if (v > lim.max) val.textContent = lim.max;
    },
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

const getTable  = choiceGroup('deck-table', renderDeck);
const getPlayed = choiceGroup('deck-played', () => { deckTotal.clamp(); renderDeck(); });
const getMyGun  = choiceGroup('deck-me', renderDeck);
const getHisGun = choiceGroup('deck-him', renderDeck);
const getHand   = stepperGroup('deck-hand', (k) => ({ min: 0, max: DECK_MAX[k] }), renderDeck);
const deckTotal = counter('deck-total', () => ({ min: Number(getPlayed()), max: DECK_UNSEEN }), renderDeck);

function renderDeck() {
  const table = getTable();
  const hand = getHand();
  const k = Number(getPlayed());
  const totalPlayed = deckTotal.get();

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

  const mine = hand[table] + hand.J;            // innocenti in mano tua
  const I = DECK_INNOCENTS - mine;              // innocenti fra le 15 che non vedi
  const pLie = 1 - pAllInnocent(I, DECK_UNSEEN, k);

  /* il tamburo non si rimescola: camere rimaste = 6 meno i colpi a vuoto */
  const myDeath  = 1 / (6 - Number(getMyGun()));
  const hisDeath = 1 / (6 - Number(getHisGun()));

  const riskMe  = (1 - pLie) * myDeath;         // sbagli, spari tu
  const riskHim = pLie * hisDeath;              // hai ragione, spara lui

  document.getElementById('deck-plie').textContent = pct(pLie);
  document.getElementById('deck-risk-me').textContent = pct(riskMe);
  document.getElementById('deck-risk-him').textContent = pct(riskHim);

  const forced = Math.max(0, totalPlayed - I);
  const rows = [];
  rows.push(`<li>Fuori dalla tua mano ci sono <b>${I} carte innocenti su 15</b> — il ${Math.round((I / 15) * 100)}% di quello che non vedi.</li>`);
  if (forced > 0) {
    rows.push(`<li class="alert">Sul tavolo ci sono già <b>almeno ${forced} bugie</b>: sono state calate più carte di quanti innocenti esistano. Non è una stima.</li>`);
  }
  rows.push(`<li>Il tuo prossimo sparo: <b>${pct(myDeath)}</b> — ${6 - Number(getMyGun())} camere rimaste. Il suo: <b>${pct(hisDeath)}</b>.</li>`);
  facts.innerHTML = rows.join('');

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
    sub = `Ti prenderesti ${(riskMe / riskHim).toFixed(1)} volte il rischio che gli passi.`;
  }
  verdict.className = 'verdict ' + cls;
  verdict.innerHTML = `<span class="vhead">${head}</span><span class="vsub">${sub}</span>`;
}

/* ══════════════════ LIAR'S DICE ══════════════════

   5 dadi a testa, i dadi non si perdono: si perdono veleni, e il
   secondo è letale.

   Base:        gli 1 valgono solo come 1. Ogni dado nascosto copre
                una faccia data con probabilità 1/6.
   Traditional: gli 1 sono jolly. Per ogni faccia diversa da 1 la
                probabilità raddoppia a 2/6 — ma puntare SUGLI 1
                resta a 1/6, perché un 1 non fa da jolly a se stesso.
                In più si sblocca lo Spot On.                      */

const PIPS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

/* I glifi dei dadi sono minuscoli alla dimensione del testo: vanno ingranditi */
const pip = (f) => `<span class="pipg">${PIPS[f - 1]}</span>`;

const getRules      = choiceGroup('dice-rules', renderDice);
const getDicePlayer = choiceGroup('dice-players', () => { diceQty.clamp(); diceOthers.clamp(); renderDice(); });
const getDiceFace   = choiceGroup('dice-face', renderDice);
const getMyPoison   = choiceGroup('dice-me', renderDice);
const getHisPoison  = choiceGroup('dice-him', renderDice);
const getMyDice     = stepperGroup('dice-mine', () => ({ min: 0, max: 5 }), renderDice);
const diceQty       = counter('dice-qty', () => ({ min: 1, max: 5 * Number(getDicePlayer()) }), renderDice);
const diceOthers    = counter('dice-others', () => ({ min: 0, max: Math.max(0, Number(getDicePlayer()) - 2) }), renderDice);

/* Probabilità che un singolo dado nascosto conti per questa faccia */
function facePpn(face, wild) {
  return wild && face !== 1 ? 2 / 6 : 1 / 6;
}

/* Quanti dei tuoi dadi contano per questa faccia */
function myCount(mine, face, wild) {
  return mine[face] + (wild && face !== 1 ? mine[1] : 0);
}

function renderDice() {
  const wild = getRules() === 'trad';
  const N = Number(getDicePlayer());
  const face = Number(getDiceFace());
  const mine = getMyDice();
  const qty = diceQty.get();
  const unknown = 5 * (N - 1);

  document.getElementById('dice-ruleinfo').innerHTML = wild
    ? 'Gli <b>1 sono jolly</b> e valgono come qualsiasi numero. Si sblocca lo <b>Spot On</b>: dichiarare che la quantità è esatta.'
    : 'Gli <b>1 valgono solo come 1</b>. Le opzioni sono chiamare bugia o rilanciare.';

  document.getElementById('dice-pool').textContent =
    `${unknown} dadi nascosti · ${5 * N} in tutto`;
  document.getElementById('dice-others-row').style.display = wild && N > 2 ? '' : 'none';

  const total = Object.values(mine).reduce((a, b) => a + b, 0);
  const tally = document.getElementById('dice-tally');
  tally.textContent = total + ' / 5 dadi';
  tally.className = 'tally ' + (total === 5 ? 'ok' : total > 5 ? 'err' : '');

  const verdict = document.getElementById('dice-verdict');
  const facts = document.getElementById('dice-facts');
  const opts = document.getElementById('dice-options');

  renderDiceGrid(unknown, mine, qty, face, wild, total === 5);

  if (total !== 5) {
    verdict.className = 'verdict';
    verdict.innerHTML = '<span class="vhead">—</span><span class="vsub">Inserisci i tuoi 5 dadi</span>';
    document.getElementById('dice-ptrue').textContent = '—';
    facts.innerHTML = '';
    opts.innerHTML = '';
    return;
  }

  const p = facePpn(face, wild);
  const have = myCount(mine, face, wild);
  const need = qty - have;
  const pTrue = pAtLeast(unknown, need, p);
  const pSpot = pExactly(unknown, need, p);

  document.getElementById('dice-ptrue').textContent = pct(pTrue);

  /* Convenzione: la prima dose vale mezza morte, la seconda una intera.
     Serve a confrontare situazioni diverse, non è un dato del gioco. */
  const costMe  = Number(getMyPoison()) === 1 ? 1 : 0.5;
  const costHim = Number(getHisPoison()) === 1 ? 1 : 0.5;
  const othersAt1 = wild && N > 2 ? diceOthers.get() : 0;
  const othersCount = Math.max(0, N - 2);
  const costOthers = othersAt1 * 1 + (othersCount - othersAt1) * 0.5;

  /* fatti */
  const rows = [];
  const wildNote = wild && face !== 1 ? ' (compresi i tuoi 1, che fanno da jolly)' : '';
  rows.push(`<li>Ne hai già <b>${have}</b>${wildNote}. Perché la puntata regga, fra i <b>${unknown} dadi nascosti</b> ne servono almeno <b>${Math.max(need, 0)}</b>.</li>`);
  rows.push(`<li>Su ${unknown} dadi nascosti la media per questa faccia è <b>${(unknown * p).toFixed(1)}</b> — ${p > 1 / 6 ? 'il doppio del normale, perché gli 1 contano' : 'una possibilità su sei per dado'}.</li>`);
  if (wild && face === 1) {
    rows.push(`<li class="alert">Stai valutando una puntata <b>sugli 1</b>: sono l'unica faccia che non gode del jolly, quindi resta a 1 su 6. È la più difficile da coprire.</li>`);
  }
  if (need > unknown) rows.push(`<li class="alert">Servono più dadi di quanti ne esistano nascosti: <b>la puntata è impossibile</b>.</li>`);
  else if (need <= 0) rows.push(`<li class="alert">Ce li hai già tutti tu: <b>la puntata è vera comunque</b>.</li>`);
  if (Number(getMyPoison()) === 1) rows.push(`<li class="alert">Hai già un veleno: se sbagli, sei fuori.</li>`);
  if (Number(getHisPoison()) === 1) rows.push(`<li class="alert">Chi ha puntato è già a un veleno: beccarlo lo elimina.</li>`);
  facts.innerHTML = rows.join('');

  /* le tre opzioni, messe a confronto sulla stessa scala */
  const callGain = (1 - pTrue) * costHim;
  const callLoss = pTrue * costMe;
  const callNet = callGain - callLoss;

  const spotGain = pSpot * (costHim + costOthers);
  const spotLoss = (1 - pSpot) * costMe;
  const spotNet = spotGain - spotLoss;

  const best = bestRaise(unknown, mine, qty, face, wild);

  const list = [];
  list.push(optionRow('Chiama bugia', pct(1 - pTrue) + ' che sia falsa', callNet,
    `Se hai ragione beve lui, se sbagli bevi tu.`));
  if (wild) {
    list.push(optionRow('Spot On', pct(pSpot) + ' che sia esatta', spotNet,
      othersCount > 0
        ? `Se azzecchi bevono <b>tutti e ${N - 1} gli altri</b> in una volta: è il moltiplicatore che rende sensata una scommessa così improbabile.`
        : `Se azzecchi beve lui, se sbagli bevi tu. In due al tavolo lo Spot On non moltiplica niente.`));
  }
  if (best) {
    list.push(optionRow('Rilancia', `il più sicuro è ${best.q} × ${pip(best.f)} (${pct(best.p)})`, null,
      `Nessun rischio adesso: passi il problema al prossimo.`));
  }
  opts.innerHTML = list.join('');

  /* verdetto */
  let cls, head, sub;
  if (need <= 0) {
    cls = 'no'; head = 'Non chiamare mai';
    sub = 'Hai in mano da solo abbastanza dadi: la puntata è vera a prescindere dagli altri.';
  } else if (need > unknown) {
    cls = 'go'; head = 'Chiama, è impossibile';
    sub = 'Nemmeno con tutti i dadi nascosti a favore la puntata potrebbe reggere.';
  } else if (wild && spotNet > callNet && spotNet > 0) {
    cls = 'go'; head = 'Prova lo Spot On';
    sub = `Solo ${pct(pSpot)} di riuscita, ma fa bere ${N - 1} persone: conviene più della chiamata secca.`;
  } else if (callNet > 0 && callNet >= Math.abs(spotNet)) {
    cls = 'go'; head = 'Conviene chiamare';
    sub = `La puntata regge solo nel ${pct(pTrue)} dei casi, e il danno che fai supera quello che rischi.`;
  } else if (callNet > -0.05) {
    cls = 'meh'; head = 'Margine sottile';
    sub = 'Chiamare è quasi in pari. Un rilancio sicuro è probabilmente meglio.';
  } else {
    cls = 'no'; head = 'Meglio rilanciare';
    sub = best
      ? `Chiamare ti espone più di quanto esponga lui. Il rilancio più solido è ${best.q} × ${pip(best.f)}, vero nel ${pct(best.p)} dei casi.`
      : 'Chiamare ti espone più di quanto esponga lui.';
  }
  verdict.className = 'verdict ' + cls;
  verdict.innerHTML = `<span class="vhead">${head}</span><span class="vsub">${sub}</span>`;
}

function optionRow(name, stat, net, note) {
  const badge = net === null
    ? '<span class="net neutral">—</span>'
    : `<span class="net ${net > 0.02 ? 'pos' : net < -0.02 ? 'neg' : 'neutral'}">${net > 0 ? '+' : ''}${net.toFixed(2)}</span>`;
  return `<li><div class="ohead"><b>${name}</b>${badge}</div>
    <div class="ostat">${stat}</div><div class="onote">${note}</div></li>`;
}

/* Il rilancio legale con la probabilità più alta di essere già vero */
function bestRaise(unknown, mine, qty, face, wild) {
  let best = null;
  const maxQty = unknown + 5;
  for (let q = qty; q <= Math.min(qty + 5, maxQty); q++) {
    for (let f = 1; f <= 6; f++) {
      const legal = q > qty || (q === qty && f > face);
      if (!legal) continue;
      const p = pAtLeast(unknown, q - myCount(mine, f, wild), facePpn(f, wild));
      if (!best || p > best.p) best = { q, f, p };
    }
  }
  return best;
}

function renderDiceGrid(unknown, mine, qty, face, wild, ready) {
  const maxQty = unknown + 5;
  const best = ready ? bestRaise(unknown, mine, qty, face, wild) : null;
  const rows = ['<tr><th></th>' + PIPS.map((p) => `<th>${p}</th>`).join('') + '</tr>'];

  for (let q = qty; q <= Math.min(qty + 5, maxQty); q++) {
    const cells = PIPS.map((_, i) => {
      const f = i + 1;
      if (q === qty && f === face) return '<td class="dead">ora</td>';
      if (!(q > qty || (q === qty && f > face))) return '<td class="dead">·</td>';
      if (!ready) return '<td class="dead">—</td>';
      const p = pAtLeast(unknown, q - myCount(mine, f, wild), facePpn(f, wild));
      const top = best && best.q === q && best.f === f;
      return `<td class="${top ? 'top' : ''}">${pct(p)}</td>`;
    }).join('');
    rows.push(`<tr class="${q === qty ? 'now' : ''}"><td class="head">${q} dadi</td>${cells}</tr>`);
  }
  document.getElementById('dice-grid').innerHTML = rows.join('');
}

/* ══════════════════ RIFERIMENTO: IL REVOLVER ══════════════════

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

document.querySelector('.tabs').addEventListener('click', (e) => {
  const t = e.target.closest('.tab');
  if (!t) return;
  document.querySelectorAll('.tab').forEach((x) => x.classList.remove('is-active'));
  document.querySelectorAll('.panel').forEach((x) => x.classList.remove('is-active'));
  t.classList.add('is-active');
  document.getElementById('panel-' + t.dataset.panel).classList.add('is-active');
});

renderRoulette();
renderDeck();
renderDice();

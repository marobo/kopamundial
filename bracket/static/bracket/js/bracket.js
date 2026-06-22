(function () {
  "use strict";

  const STORAGE_KEY = "wc2026-bracket-v1";

  const ROUND_LABELS = {
    r32: "Round of 32",
    r16: "Round of 16",
    qf: "Quarter Final",
    sf: "Semi Final",
    final: "Final",
  };

  const LEFT_ROUNDS = ["r32", "r16", "qf", "sf"];
  const RIGHT_ROUNDS = ["sf", "qf", "r16", "r32"];

  const ROUND_COUNTS = { r32: 16, r16: 8, qf: 4, sf: 2, final: 1 };

  const FEEDERS = buildFeeders();

  const teams = JSON.parse(document.getElementById("teams-data").textContent);
  const teamByCode = Object.fromEntries(teams.map((t) => [t.code, t]));

  let state = loadState();
  let pickTarget = null;
  let teamModal = null;

  function buildFeeders() {
    const feeders = {};

    for (let i = 0; i < 8; i++) {
      feeders[`r16-${i}`] = {
        home: `r32-${i * 2}`,
        away: `r32-${i * 2 + 1}`,
      };
    }

    for (let i = 0; i < 4; i++) {
      feeders[`qf-${i}`] = {
        home: `r16-${i * 2}`,
        away: `r16-${i * 2 + 1}`,
      };
    }

    feeders["sf-0"] = { home: "qf-0", away: "qf-1" };
    feeders["sf-1"] = { home: "qf-2", away: "qf-3" };
    feeders.final = { home: "sf-0", away: "sf-1" };

    return feeders;
  }

  function defaultState() {
    const matches = {};
    Object.keys(ROUND_COUNTS).forEach((round) => {
      for (let i = 0; i < ROUND_COUNTS[round]; i++) {
        const id = round === "final" ? "final" : `${round}-${i}`;
        matches[id] = { home: null, away: null, winner: null };
      }
    });
    return { matches };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return parsed.matches ? parsed : defaultState();
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function flagCode(code) {
    const map = {
      USA: "us",
      MEX: "mx",
      CAN: "ca",
      ENG: "gb-eng",
      SCO: "gb-sct",
      IRL: "ie",
      GER: "de",
      FRA: "fr",
      ESP: "es",
      POR: "pt",
      NED: "nl",
      BEL: "be",
      CRO: "hr",
      SUI: "ch",
      AUT: "at",
      NOR: "no",
      SEN: "sn",
      MAR: "ma",
      ALG: "dz",
      CIV: "ci",
      GHA: "gh",
      RSA: "za",
      EGY: "eg",
      TUN: "tn",
      CPV: "cv",
      QAT: "qa",
      SAU: "sa",
      IRN: "ir",
      UZB: "uz",
      JOR: "jo",
      KOR: "kr",
      JPN: "jp",
      AUS: "au",
      NZL: "nz",
      PAN: "pa",
      CRC: "cr",
      HAI: "ht",
      CUW: "cw",
      UKR: "ua",
      TUR: "tr",
      POL: "pl",
      DEN: "dk",
      ARG: "ar",
      BRA: "br",
      URU: "uy",
      COL: "co",
      ECU: "ec",
      PAR: "py",
    };
    return map[code] || code.toLowerCase().slice(0, 2);
  }

  function flagUrl(code) {
    return `https://flagcdn.com/w40/${flagCode(code)}.png`;
  }

  function getWinnerTeam(matchId) {
    const match = state.matches[matchId];
    if (!match || !match.winner) return null;
    return teamByCode[match.winner] || null;
  }

  function refreshBracketFromWinners() {
    Object.entries(FEEDERS).forEach(([targetId, sources]) => {
      const target = state.matches[targetId];
      const newHome = getWinnerTeam(sources.home);
      const newAway = getWinnerTeam(sources.away);
      const homeChanged = (target.home?.code || null) !== (newHome?.code || null);
      const awayChanged = (target.away?.code || null) !== (newAway?.code || null);

      if (homeChanged || awayChanged) {
        target.home = newHome;
        target.away = newAway;
        target.winner = null;
      }
    });
  }

  function getTeamsUsedInRound(roundPrefix) {
    const used = new Set();
    Object.entries(state.matches).forEach(([matchId, match]) => {
      if (!matchId.startsWith(roundPrefix)) return;
      if (match.home?.code) used.add(match.home.code);
      if (match.away?.code) used.add(match.away.code);
    });
    return used;
  }

  function assignTeam(matchId, slot, team) {
    const match = state.matches[matchId];
    const r32Used = getTeamsUsedInRound("r32");
    const isDuplicate =
      team &&
      matchId.startsWith("r32") &&
      r32Used.has(team.code) &&
      match[slot]?.code !== team.code;
    if (isDuplicate) return;

    match[slot] = team;
    match.winner = null;
    saveState();
    renderAll();
  }

  function pickWinner(matchId, slot) {
    const match = state.matches[matchId];
    const team = match[slot];
    if (!team || !match.home || !match.away) return;

    match.winner = match.winner === team.code ? null : team.code;
    refreshBracketFromWinners();
    saveState();
    renderAll();
  }

  function renderTeamRow(matchId, slot) {
    const match = state.matches[matchId];
    const team = match[slot];
    const row = document.createElement("div");
    row.className = "team-row";
    row.dataset.slot = slot;

    if (!team) {
      row.classList.add("empty");
      row.textContent = matchId.startsWith("r32") ? "Select team…" : "—";
      if (matchId.startsWith("r32")) {
        row.addEventListener("click", () => openTeamPicker(matchId, slot));
      }
      return row;
    }

    if (match.winner) {
      row.classList.add(match.winner === team.code ? "winner" : "loser");
    }

    const img = document.createElement("img");
    img.className = "team-flag";
    img.src = flagUrl(team.code);
    img.alt = "";
    img.loading = "lazy";

    const name = document.createElement("span");
    name.className = "team-name";
    name.textContent = team.name;

    row.appendChild(img);
    row.appendChild(name);

    row.addEventListener("click", () => {
      if (matchId.startsWith("r32") && (!match.home || !match.away)) {
        openTeamPicker(matchId, slot);
        return;
      }
      pickWinner(matchId, slot);
    });

    row.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (matchId.startsWith("r32")) {
        assignTeam(matchId, slot, null);
      }
    });

    return row;
  }

  function renderMatchCard(matchId, round) {
    const card = document.createElement("div");
    card.className = "match-card";
    if (round === "final") card.classList.add("match-final");
    card.dataset.matchId = matchId;

    if (round !== "final") {
      const label = document.createElement("div");
      label.className = "match-label";
      label.textContent = ROUND_LABELS[round];
      card.appendChild(label);
    }

    card.appendChild(renderTeamRow(matchId, "home"));
    card.appendChild(renderTeamRow(matchId, "away"));
    return card;
  }

  function renderRound(round, side) {
    const column = document.createElement("div");
    column.className = "bracket-round";
    column.dataset.round = round;

    const half = ROUND_COUNTS[round] / 2;
    const offset = side === "left" ? 0 : half;

    for (let i = 0; i < half; i++) {
      const matchId = round === "final" ? "final" : `${round}-${offset + i}`;
      column.appendChild(renderMatchCard(matchId, round));
    }

    return column;
  }

  function buildBracketDom() {
    const left = document.getElementById("bracket-left");
    const right = document.getElementById("bracket-right");
    left.innerHTML = "";
    right.innerHTML = "";

    LEFT_ROUNDS.forEach((round) => left.appendChild(renderRound(round, "left")));
    RIGHT_ROUNDS.forEach((round) => right.appendChild(renderRound(round, "right")));

    const trophyArea = document.querySelector(".trophy-area");
    const existingFinal = trophyArea.querySelector(".match-final");
    if (existingFinal) existingFinal.remove();
    trophyArea.appendChild(renderMatchCard("final", "final"));
  }

  function renderChampion() {
    const box = document.getElementById("champion-display");
    const winner = getWinnerTeam("final");

    box.innerHTML = "";
    if (!winner) {
      box.innerHTML = '<span class="champion-placeholder">?</span>';
      return;
    }

    const img = document.createElement("img");
    img.className = "team-flag";
    img.src = flagUrl(winner.code);
    img.alt = "";

    const name = document.createElement("span");
    name.textContent = winner.name;

    box.appendChild(img);
    box.appendChild(name);
  }

  function renderAll() {
    buildBracketDom();
    renderChampion();
  }

  function openTeamPicker(matchId, slot) {
    pickTarget = { matchId, slot };
    document.getElementById("teamModalLabel").textContent = "Select Team";
    document.getElementById("team-search").value = "";
    renderTeamList("");
    teamModal.show();
  }

  function renderTeamList(query) {
    const list = document.getElementById("team-list");
    list.innerHTML = "";
    const q = query.trim().toLowerCase();
    const r32Used = getTeamsUsedInRound("r32");
    const currentSlotCode = pickTarget
      ? state.matches[pickTarget.matchId]?.[pickTarget.slot]?.code
      : null;

    const allMatching = teams.filter(
      (team) =>
        !q ||
        team.name.toLowerCase().includes(q) ||
        team.code.toLowerCase().includes(q)
    );

    allMatching.forEach((team) => {
      if (
        pickTarget?.matchId.startsWith("r32") &&
        r32Used.has(team.code) &&
        team.code !== currentSlotCode
      ) {
        return;
      }

      const item = document.createElement("button");
      item.type = "button";
      item.className =
        "list-group-item list-group-item-action d-flex align-items-center gap-2";
      item.innerHTML = `<img class="team-flag" src="${flagUrl(team.code)}" alt=""> <span>${team.name}</span>`;
      item.addEventListener("click", () => {
        assignTeam(pickTarget.matchId, pickTarget.slot, team);
        teamModal.hide();
      });
      list.appendChild(item);
    });
  }

  function resetBracket() {
    if (!confirm("Reset the entire bracket?")) return;
    state = defaultState();
    saveState();
    renderAll();
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function fillRandomTeams() {
    if (!confirm("Fill Round of 32 with random teams? This clears your bracket.")) return;

    state = defaultState();
    const picked = shuffle(teams).slice(0, 32);

    for (let i = 0; i < 16; i++) {
      state.matches[`r32-${i}`].home = picked[i * 2];
      state.matches[`r32-${i}`].away = picked[i * 2 + 1];
    }

    saveState();
    renderAll();
  }

  document.getElementById("btn-reset").addEventListener("click", resetBracket);
  document.getElementById("btn-random").addEventListener("click", fillRandomTeams);
  document.getElementById("team-search").addEventListener("input", (event) => {
    renderTeamList(event.target.value);
  });

  teamModal = new bootstrap.Modal(document.getElementById("teamModal"));

  refreshBracketFromWinners();
  renderAll();
})();

(function () {
  "use strict";

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

  const MOBILE_ROUND_ORDER = [
    { key: "r32", label: "Ronde 32" },
    { key: "r16", label: "Ronde 16" },
    { key: "qf", label: "Kuarter Final" },
    { key: "sf", label: "Semi Final" },
    { key: "final", label: "Final" },
  ];

  let state = { matches: {} };
  let isStaff = false;
  let teams = [];
  let pickTarget = null;
  let teamModal = null;

  function flagCode(code) {
    const map = {
      USA: "us",
      MEX: "mx",
      CAN: "ca",
      ENG: "gb-eng",
      SCO: "gb-sct",
      BIH: "ba",
      SWE: "se",
      CZE: "cz",
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
      COD: "cd",
      QAT: "qa",
      SAU: "sa",
      IRN: "ir",
      UZB: "uz",
      JOR: "jo",
      IRQ: "iq",
      KOR: "kr",
      JPN: "jp",
      AUS: "au",
      NZL: "nz",
      PAN: "pa",
      HAI: "ht",
      CUW: "cw",
      TUR: "tr",
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

  function showError(message) {
    const box = document.getElementById("bracket-error");
    box.textContent = message;
    box.classList.remove("d-none");
  }

  function hideError() {
    document.getElementById("bracket-error").classList.add("d-none");
  }

  function getWinnerTeam(matchId) {
    const match = state.matches[matchId];
    if (!match || !match.winner) return null;
    if (match.home?.code === match.winner) return match.home;
    if (match.away?.code === match.winner) return match.away;
    return null;
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

  async function apiUpdateMatch(matchId, field, teamCode) {
    const response = await fetch("/api/bracket/match/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": window.BRACKET_CSRF || "",
      },
      body: JSON.stringify({
        match_id: matchId,
        field,
        team_code: teamCode,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Update failed");
    }

    state = data;
    if (data.teams) teams = data.teams;
    isStaff = data.is_staff;
    hideError();
    renderAll();
  }

  async function assignTeam(matchId, slot, team) {
    await apiUpdateMatch(matchId, slot, team ? team.code : null);
  }

  async function pickWinner(matchId, slot) {
    const match = state.matches[matchId];
    const team = match[slot];
    if (!team || !match.home || !match.away) return;
    await apiUpdateMatch(matchId, "winner", team.code);
  }

  function renderTeamRow(matchId, slot) {
    const match = state.matches[matchId] || {};
    const team = match[slot];
    const row = document.createElement("div");
    row.className = "team-row";
    row.dataset.slot = slot;

    if (!team) {
      row.classList.add("empty");
      row.textContent =
        isStaff && matchId.startsWith("r32") ? "Select team…" : "—";
      if (isStaff && matchId.startsWith("r32")) {
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

    if (isStaff) {
      row.addEventListener("click", () => {
        if (matchId.startsWith("r32") && (!match.home || !match.away)) {
          openTeamPicker(matchId, slot);
          return;
        }
        pickWinner(matchId, slot).catch((err) => showError(err.message));
      });

      row.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        if (matchId.startsWith("r32")) {
          assignTeam(matchId, slot, null).catch((err) => showError(err.message));
        }
      });
    }

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

  function renderMobileHalf(side, round) {
    const halfBlock = document.createElement("div");
    halfBlock.className = `mobile-bracket-half mobile-bracket-${side}`;

    const halfLabel = document.createElement("div");
    halfLabel.className = "mobile-half-label";
    halfLabel.textContent = side === "left" ? "Left" : "Right";
    halfBlock.appendChild(halfLabel);

    const matches = document.createElement("div");
    matches.className = "mobile-matches";

    const half = ROUND_COUNTS[round] / 2;
    const offset = side === "left" ? 0 : half;
    for (let i = 0; i < half; i++) {
      matches.appendChild(renderMatchCard(`${round}-${offset + i}`, round));
    }

    halfBlock.appendChild(matches);
    return halfBlock;
  }

  function renderMobileList() {
    const container = document.getElementById("bracket-mobile");
    if (!container) return;

    container.innerHTML = "";

    const championSection = document.createElement("div");
    championSection.className = "mobile-champion-section";
    championSection.innerHTML = `
      <div class="trophy-icon" aria-hidden="true">🏆</div>
      <div class="champion-label">Champions</div>
      <div class="champion-box" id="champion-display-mobile"></div>
    `;
    container.appendChild(championSection);

    MOBILE_ROUND_ORDER.forEach(({ key, label }) => {
      const section = document.createElement("section");
      section.className = "mobile-round";
      section.dataset.round = key;

      const heading = document.createElement("h2");
      heading.className = "mobile-round-title";
      heading.textContent = label;
      section.appendChild(heading);

      if (key === "final") {
        const matches = document.createElement("div");
        matches.className = "mobile-matches";
        matches.appendChild(renderMatchCard("final", "final"));
        section.appendChild(matches);
      } else {
        section.appendChild(renderMobileHalf("left", key));
        section.appendChild(renderMobileHalf("right", key));
      }

      container.appendChild(section);
    });
  }

  function renderChampion(containerId) {
    const box = document.getElementById(containerId);
    if (!box) return;

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
    renderMobileList();
    renderChampion("champion-display");
    renderChampion("champion-display-mobile");
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

    teams
      .filter(
        (team) =>
          !q ||
          team.name.toLowerCase().includes(q) ||
          team.code.toLowerCase().includes(q)
      )
      .forEach((team) => {
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
          assignTeam(pickTarget.matchId, pickTarget.slot, team)
            .then(() => teamModal.hide())
            .catch((err) => showError(err.message));
        });
        list.appendChild(item);
      });
  }

  async function loadBracket() {
    const response = await fetch("/api/bracket/");
    if (!response.ok) {
      throw new Error("Failed to load bracket");
    }
    const data = await response.json();
    state = data;
    isStaff = data.is_staff;
    teams = data.teams || [];
    hideError();
    renderAll();
  }

  const modalEl = document.getElementById("teamModal");
  if (modalEl) {
    teamModal = new bootstrap.Modal(modalEl);
    document.getElementById("team-search").addEventListener("input", (event) => {
      renderTeamList(event.target.value);
    });
  }

  loadBracket().catch(() => {
    showError("Could not load bracket data. Please try again later.");
  });
})();

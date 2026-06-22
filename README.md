# World Cup 2026 Bracket

A simple knockout bracket predictor for FIFA World Cup 2026, built with **Django**, **Bootstrap 5**, and **vanilla JavaScript**.

Pick teams in the Round of 32, tap winners to advance through each round, and crown your predicted champion. Your bracket is saved automatically in the browser.

## Features

- Full knockout tree: Round of 32 → Round of 16 → Quarter Finals → Semi Finals → Final
- Click teams to assign Round of 32 slots or pick winners
- Team search modal with flag icons
- Random fill for quick testing
- Bracket persists in `localStorage`

## Requirements

- Python 3.10+
- pip

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

## How to use

1. **Fill Round of 32** — click "Select team…" on any slot, or use **Fill Random Teams**
2. **Pick winners** — once both teams are set, click the team you think will win
3. **Advance** — winners automatically move to the next round
4. **Champion** — pick the Final winner to reveal your predicted champion
5. **Reset** — clears the entire bracket

Right-click a Round of 32 team to remove it.

## Project structure

```
world_cup_2026/
├── manage.py
├── requirements.txt
├── wc2026/              # Django project settings
└── bracket/
    ├── data/teams.json  # 48 qualified teams
    ├── templates/
    └── static/
        ├── css/bracket.css
        └── js/bracket.js
```

## Notes

- This is a **fantasy bracket** — you choose any teams for Round of 32 slots
- Flag images are loaded from [flagcdn.com](https://flagcdn.com)
- No database required — Django serves templates and static files only

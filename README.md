# 🏃 Baweda Escape: Endless Run

A browser-based endless runner game where you play as **Baweda** — a hilariously drunk runner trying to escape a pursuing police officer through city streets.

## 🎮 How to Run

1. Download or clone this project
2. Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge)
3. No server or installation required — runs entirely client-side!

## 🕹️ Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move Left | ← Arrow | Swipe Left / ◀ Button |
| Move Right | → Arrow | Swipe Right / ▶ Button |
| Jump | ↑ Arrow | Swipe Up / ▲ Button |
| Slide | ↓ Arrow | Swipe Down / ▼ Button |
| Pause | Esc / P | ⏸ Button |

## 🧩 Gameplay

- Run through 3 lanes and dodge obstacles
- **Jump** over traffic cones and trash bins
- **Slide** under barriers
- Collect **coins** for bonus points and **powerups** for temporary effects
- The police **chaser** closes in when you hit obstacles — don't get caught!
- Speed increases over time — survive as long as possible

## ⚡ Powerups

| Powerup | Effect |
|---------|--------|
| ⚡ Speed Boost | Run faster for 5 seconds |
| 🐢 Slow Motion | Everything slows down for 5 seconds |
| 🪙 Coin | Instant +50 score bonus |

## 🏗️ Technologies Used

- **HTML5** — Structure and Canvas element
- **CSS3** — Styling, animations, and responsive layout
- **Vanilla JavaScript (ES6+)** — All game logic
- **Canvas 2D API** — Rendering graphics
- **LocalStorage API** — High score persistence
- **Google Fonts** — Bangers + Nunito typefaces

## 📁 Project Structure

```
project-folder/
│
├── index.html      # Game structure and screens
├── style.css       # Visual styling and animations
├── script.js       # Complete game engine and logic
└── README.md       # This file
```

## 📐 Architecture

The game uses a modular component pattern:

- `GameManager` — Central controller, game loop, input, collision orchestration
- `Player` — Movement, jump/slide physics, animation, drawing
- `ObstacleManager` — Spawning, scrolling, lane-clearance guarantee
- `PowerupManager` — Powerup spawning and timed effects
- `CoinManager` — Coin spawning and collection
- `ScoreManager` — Score, multiplier, and localStorage persistence
- `Chaser` — Pursuer behavior and catch condition
- `Road` — Background, buildings, road, and lane line rendering

---

Made as a student game project 🎓

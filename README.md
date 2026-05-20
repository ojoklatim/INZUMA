# Inzuma Pi 🍃

Inzuma Pi is a state-of-the-art, premium AI-powered emotional clarity and reflective companion application. Designed with an elegant, editorial high-contrast aesthetic and modeled after the industry-leading layouts of Claude AI, Inzuma Pi helps users explore their feelings, practice cognitive reframing, and log mental wellness sessions with ease.

---

## 🌟 Key Features

### 1. Ultra-Premium Editorial Interface
- **Claude-Inspired Workspace**: A gorgeous, warm-charcoal minimal workspace featuring elegant Georgia headings and high-contrast typography.
- **Collapsible Sidebar Console**: A dynamic, smoothly transitions side panel (modeled after VS Code/Claude) that collapses to a compact grid (`0px 1fr`) on desktop and slides as a smooth drawer backdrop on mobile.
- **Time-Sensitive Contextual Greetings**: Greets the user dynamically based on local time (e.g., *"Good morning, Brooke"*, *"Good afternoon, Matt"*).
- **Personalized Chat transcripts**: Unlike standard bubble-style chats, both user and assistant responses are beautifully left-aligned in a clean central transcript column (`max-width: 720px`) showing the user's name next to their thoughts.

### 2. High-Contrast Dark Mode Toggle
- Includes a stunning, fully-responsive dark theme override with custom CSS variables.
- Pinned **Sun/Moon Toggle** in the sidebar footer lets users switch modes manually.
- Integrated `prefers-color-scheme` fallback queries automatically respect system OS settings out-of-the-box.

### 3. Voice Reflection System (Speech-to-Text)
- Fully-integrated STT voice reflection that enables hands-free journal logging.
- Renders smooth mic visual pulsing rings during active recordings.
- Handles speech-to-text dictation dynamically both on the home screen console and within active chat sessions.

### 4. Background Sentiment & Mood Metrics
- Deep sentiment engine runs background threads to analyze mood states (`calm`, `anxious`, `neutral`, `mixed`, `crisis`).
- Calculates interactive mood scores, session streaks, average duration, and tracks detailed statistics under a premium **Insights Dashboard**.
- Dynamic colored activity indicators representing active emotion statuses.

### 5. Interactive Post-Session Reflections
- Generates thorough cognitive breakdowns, key takeaways, and mindfulness advice at the end of every conversation.
- Displays summary dashboards via sleek, premium overlays.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Core**: React 18, Vite 8, React Hooks.
- **Design System & Styling**: Pure, high-performance vanilla CSS, custom variables (`tokens.css`), custom animations.
- **Database & Identity Integration**: Integrated with Supabase (`@insforge/shared-schemas`), storing profile metadata, conversational sessions, and message transcripts.

---

## 🚀 Getting Started

### 1. Setup Environment Credentials
Make sure you have your `.env` file configured in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Compile Production Builds
```bash
npm run build
```

---

## 📂 Codebase Layout

- `src/styles/tokens.css` - Global styling system variables, typography definitions, and dark mode class tokens.
- `src/components/layout/` - Shell structures, collapsible `Sidebar.jsx`, and custom responsive layouts.
- `src/components/chat/` - Visual left-aligned chat transcripts, compact dictation areas, suggestion chips, and model controllers.
- `src/components/dashboard/` - Analytical dashboards tracking mood metrics, progress trackers, and activity charts.
- `src/pages/UserDashboard.jsx` - Core canvas orchestrating states, theme mappings, voice observers, and workspace resizing logic.

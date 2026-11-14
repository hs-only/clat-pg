# CLAT PG 2027 – Official Pattern CBT Mock Portal & PYQ Suite

A 100% static, zero-backend web application replicating the **Consortium of NLUs / TCS iON Computer-Based Test (CBT)** exam interface, complete with a **4-Phase Strategic Study Plan**, **PYQ Papers**, **Recent 5/7/9-Judge Constitution Bench Sectional Tests**, **120-Question Full-Length Mock Simulator**, and **Downloadable Score & Explanation Reports (PDF / HTML / CSV)**.

---

## Key Features

1. **Authentic TCS iON / Consortium CBT Interface**:
   - Official Pre-Test Instructions screen with the 5-state palette legend and mandatory candidate declaration checkbox.
   - Split-screen workspace: independently scrollable **Comprehension Passage** on the left (`A-`, `A`, `A+` font-size controls, redacted citation during exam) and **Question + 4 Radio Options** on the right.
   - Live countdown timer (`HH:MM:SS`), Passage Jumper dropdown, `Question Paper` full-view modal, and `Instructions` modal.
   - Exact 5-State TCS iON Question Palette with live counters:
     - **Answered** (Green shield)
     - **Not Answered** (Red inverted shield)
     - **Not Visited** (Gray box)
     - **Marked for Review** (Purple circle)
     - **Answered & Marked for Review** (Purple circle with green check — *considered for evaluation*, matching the real exam).
   - Auto-saves in-progress sessions to `localStorage` every few seconds so accidental page refreshes never lose progress.

2. **Post-Test Review & Downloadable Reports**:
   - Instant evaluation with `+1.00` for correct, `-0.25` for incorrect, and `0.00` for unattempted.
   - Subject-wise accuracy and net score breakdown table.
   - Unlocks the **Full Supreme Court Case Name, Citation, Bench Strength, and Detailed Legal Explanation** for every question.
   - **3 Report Download Formats**:
     - **Print / Save as PDF** (`🖨 PDF Report`)
     - **Standalone Offline HTML Report** (`⬇ HTML` — contains every passage, question, all 4 options, candidate's answer, correct answer, and full explanation)
     - **Excel / Google Sheets CSV Report** (`📊 CSV`)

3. **Built-In Question Bank (264 Questions across 44 Passages in 6 Ready Tests)**:
   - **Full-Length Mock Test 1 (120 Questions / 20 Passages, 120 Mins)**
   - **CLAT PG 2024 – Official Pattern & Landmark Passages (PYQ) (30 Questions / 5 Passages)**
   - **CLAT PG 2022–2023 – High-Yield Landmark Passages (PYQ) (30 Questions / 5 Passages)**
   - **Sectional Test 1: Recent 5, 7 & 9-Judge Constitution Bench Rulings (2023–2025) (30 Questions / 5 Passages)**
   - **Sectional Test 2: Jurisprudence & Legal Theory Masterclass (24 Questions / 4 Passages)**
   - **Sectional Test 3: Criminal (IPC/BNS, CrPC/BNSS, IEA/BSA), Family, Arbitration, International & IPR/IBC (30 Questions / 5 Passages)**

---

## Free Hosting Guide (GitHub Pages or Cloudflare Pages)

Because this app has **zero build steps and zero external dependencies**, it deploys directly out of the box:

### Option A: GitHub Pages (100% Free)
1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial CLAT PG Mock Portal"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch** → Branch: `main` / `/ (root)` → Click **Save**.
4. Your live link will be ready at `https://<your-username>.github.io/<repo-name>/` in ~60 seconds!

### Option B: Cloudflare Pages (100% Free)
1. Go to the Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** (or **Upload assets** directly).
2. Leave **Build command** blank and set **Build output directory** to `/`.
3. Click **Save and Deploy**.

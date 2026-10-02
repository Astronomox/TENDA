<div align="center">

# 🛠️ TENDA — What Was Broken, What Was Fixed, and How to Run It

**A no-jargon guide. If you can copy and paste, you can do this.**

*Fix log date: 1 October 2026 · Big upgrade: 2 October 2026*

</div>

---

## 🆕 Update 3 (2 October 2026) — making it safe for real customers

| Problem | What was done |
|---|---|
| On Render, all data would be **wiped on every restart** | The app now works with a **real database (PostgreSQL)**. A file called `render.yaml` sets up the app *and* the database on Render in one go. Tested on a real PostgreSQL 17 — all tests pass. |
| The login secret could silently be `change-me` | In production the app now **refuses to start** with a weak secret (or with the wipe-able database). Render generates a strong secret automatically. |
| Installing could pull in surprise new versions that break things | Every library is **locked to the exact version that was tested**. |
| The database file was being saved into GitHub | It's **no longer tracked**. The file is still on your computer. |

**Still needs you** (details in [SCALABILITY.md](SCALABILITY.md)):

1. **Get a free database that doesn't get wiped.** Sign up at **neon.tech** (free), create a project, and copy its connection string. On Render: New → Blueprint → pick the repo (it uses the **free** plan), then paste that string into `DATABASE_URL`.
2. **Add your Gemini key**, on a **paid** Google project so customer data isn't used for training.
3. **Sign up for a free uptime monitor** (e.g. UptimeRobot) pointed at `/health`, so you know if the app goes down.

The full enterprise plan (what to build next as you grow) is in **[SCALABILITY.md](SCALABILITY.md)**.

---

## 🆕 Update 2 (2 October 2026) — the big upgrade, in plain English

The backend now does **everything the new TENDA website needs** (the full list is in `BACKEND_README.md`).

### What's new

| Before | Now |
|---|---|
| The website couldn't talk to the backend at all (a browser security rule called **CORS** blocked it) | ✅ Fixed — the website at `tenda-delta.vercel.app` and on your own computer (`localhost:3000`) can connect |
| Only "sales from voice notes" | ✅ **Products**, **customers** and **sales** you can add, edit and delete |
| Voice sales were saved blindly | ✅ The app now **shows what it heard first** (*"2 × Shea Butter for ₦9,000 to Amina?"*) so you can fix mistakes before saving |
| Silent recordings got a confusing answer | ✅ You get *"I couldn't hear anything. Please try again."* |
| The AI said *"I can't see your data"* | ✅ The AI now **reads your own sales, customers and products** before answering — and never anyone else's |
| No reminders | ✅ **Follow-ups**: TENDA works out when each customer usually buys again and tells you who is **overdue** — with a ready-made WhatsApp message |
| One basic total | ✅ A full **dashboard** (today / this week / this month / growth), **charts**, **insights** and **notifications** |
| Logging out didn't really log you out | ✅ It does now — and you stay logged in for 60 minutes, renewed automatically |
| Login failed if you typed `Amina@…` with a capital letter | ✅ Emails are no longer case-sensitive |
| Times were in UTC (1 hour behind Nigeria) | ✅ "Today", "this week" and "this month" all use **Lagos time** |

### Your old data is safe

Your existing sale (the ₦50 keyboards sale) was **copied** into the new system and the totals were checked — they are **exactly the same** before and after. The old table was kept as a backup, and there is also a full copy of the database in `tenda.pre-migration-backup.db`.

### Tested

- ✅ **72 automatic tests** pass (logins, keeping each business's data private, no double-counted sales, follow-up maths, growth %, Lagos time).
- ✅ The official acceptance checklist: **15 passed, 0 failed, 2 skipped**. The 2 skipped steps need the Gemini AI key (and one needs a real recorded voice note), so they **could not be tested yet** — they are not counted as passed.

To run the tests yourself (after Step 2 below):

```
pip install -r requirements-dev.txt
python -m pytest
python scripts/run_acceptance.py
```

### ⚠️ Three things for you to do

1. **Add your Gemini key** to `.env` (Step 4 below). Without it, everything works except the AI chat, voice features and AI summaries.
2. **In `.env`, change `ACCESS_TOKEN_EXPIRE_MINUTES=30` to `ACCESS_TOKEN_EXPIRE_MINUTES=60`** (or delete that line). The new setup expects 60 minutes.
3. **Before going live on Render, read this:** Render **wipes the server's hard drive every time the app restarts or is redeployed**. Because TENDA keeps everything in a file (`tenda.db`) on that drive, **every account, customer and sale would vanish**. The fix is to give it a proper database (Render Postgres, recommended) or a persistent disk. This has **not** been switched yet — it needs your decision. Details in `Readme.md` → *Deploying on Render*.

---

## 📋 Contents

1. [The 30-second summary](#-the-30-second-summary)
2. [How to start the app (step by step)](#-how-to-start-the-app-step-by-step)
3. [The fix log — every problem, explained simply](#-the-fix-log)
4. [Files that were changed](#-files-that-were-changed)
5. [If something still goes wrong](#-if-something-still-goes-wrong)
6. [Glossary — what do these words mean?](#-glossary)

---

## ⏱️ The 30-second summary

| | |
|---|---|
| **What happened?** | You typed `fastapi dev main.py` and got a big red error. |
| **Why?** | Two reasons: **(1)** the command used your computer's *main* Python instead of the project's own private Python (the `venv` folder), and **(2)** even when using the right Python, the app crashed because the secret settings file (`.env`) was missing the AI key. |
| **Is it fixed?** | ✅ Yes. The app now starts. We tested signing up, logging in, and the sales dashboard, and they all work. |
| **Anything left for you to do?** | ⚠️ **One thing:** paste your free Google Gemini key into the `.env` file. Until you do, the app runs fine, but the AI features politely say *"GEMINI_API_KEY is not set"* instead of answering. |

---

## 🚀 How to start the app (step by step)

> 💡 Do these steps in the **Command Prompt** (the black window you were already using).

### Step 1 — Go to the project folder

```
cd C:\Users\HomePC\Downloads\TENDA-upgraded\TENDA-api-main
```

### Step 2 — Switch on the project's private Python ⭐ *(this is the step you were missing)*

```
venv\Scripts\activate
```

✅ **How you know it worked:** the start of the line now shows **`(venv)`**, like this:

```
(venv) C:\Users\HomePC\Downloads\TENDA-upgraded\TENDA-api-main>
```

> 🧠 **Why this matters:** think of `venv` as a lunchbox packed just for this project. Every tool the app needs is inside it. If you skip this step, Windows reaches for the *family fridge* (your main Python) instead, and the right tools aren't there. That was the cause of your original error.
>
> ⚠️ You must do Step 2 **every time** you open a new Command Prompt window.

### Step 3 — Install the tools *(only needed the first time, or after an update)*

```
pip install -r requirements.txt
```

*(This has already been done for you on this computer, so it should finish quickly.)*

### Step 4 — Add your AI key *(one time only)*

1. Go to 👉 **https://aistudio.google.com/app/apikey**, sign in with Google, and click **Create API key**. Copy the long code it shows you.
2. Open the settings file:
   ```
   notepad .env
   ```
3. Scroll to the bottom and find this line:
   ```
   GEMINI_API_KEY=
   ```
4. Paste your key straight after the `=`, with **no spaces and no quote marks**:
   ```
   GEMINI_API_KEY=AIzaSyYourLongKeyGoesHere
   ```
5. Save (**Ctrl + S**) and close Notepad.

> 🔒 **Keep this key secret.** Don't post it online or send it in chats. The `.env` file is already set up so it **won't** be uploaded to GitHub.

### Step 5 — Start the app 🎉

```
fastapi dev main.py
```

You should see something like:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

### Step 6 — Play with it in your web browser

Open 👉 **http://127.0.0.1:8000/docs**

This is a clickable control panel for the app. To try it:

1. Click **POST /auth/register** → **Try it out** → type an email and password → **Execute**.
2. Click the green **Authorize 🔓** button at the top right. Enter your email in **username**, your password in **password**, then click **Authorize**.
3. Now you can try any feature, such as **GET /analytics/summary**.

### Step 7 — Stop the app

Click in the Command Prompt window and press **Ctrl + C**.

---

## 📝 The fix log

Each fix below lists **what you would have noticed**, **what was really wrong**, and **what we did**.

Severity key: 🔴 = stopped the app from working · 🟠 = would cause errors or a safety risk · 🟡 = smaller problem / tidy-up

---

### 🔴 Fix 1 — "To use the fastapi command, please install fastapi[standard]"

| | |
|---|---|
| **What you saw** | The red error message you pasted. |
| **What was really wrong** | The command ran with your computer's *main* Python, which only had a basic version of FastAPI. The `fastapi dev` command needs the "standard" bundle. |
| **What we did** | Changed `fastapi` to `fastapi[standard]` in `requirements.txt` so the full toolkit always gets installed, then installed everything into the project's `venv`. |
| **What you do** | Always run `venv\Scripts\activate` first (Step 2 above). |

---

### 🔴 Fix 2 — The app crashed immediately: "No API key was provided"

| | |
|---|---|
| **What you would have seen** | Even with the right Python, the app crashed before it could start. |
| **What was really wrong** | Your `.env` file held settings for the **website** (Supabase / Next.js), not for this **backend**. The backend looks for `GEMINI_API_KEY`, couldn't find it, and the AI code gave up and took the whole app down with it. |
| **What we did** | **(a)** The app now starts **even without** the AI key. Login, sign-up and the sales dashboard all work; only the AI buttons wait for a key, and they show a clear message instead of crashing. **(b)** Added the missing backend settings to the bottom of `.env`. Your existing website settings were left untouched. |
| **What you do** | Paste your Gemini key (Step 4 above). |

---

### 🟠 Fix 3 — The login secret was a well-known placeholder

| | |
|---|---|
| **What was really wrong** | Logins are protected with a secret password called `SECRET_KEY`. None was set, so the app fell back to the word **`change-me`**. Anyone who knew that could fake a login as any user. |
| **What we did** | Generated a strong random secret and saved it in `.env`. |

---

### 🟠 Fix 4 — Uploading a voice note could overwrite files on the computer

| | |
|---|---|
| **What was really wrong** | When you uploaded audio, the app saved it using **whatever name the sender chose**. A sneaky name like `../../main.py` could make it write over important files. Also, two people uploading `note.mp3` at the same moment would overwrite each other's audio. |
| **What we did** | Each upload is now saved in the computer's temporary folder under a **random name**, then deleted when done. We tested this with a sneaky file name and nothing escaped. |

---

### 🟠 Fix 5 — The voice assistant was being fed made-up numbers

| | |
|---|---|
| **What you would have seen** | Asking *"How are my sales?"* by voice always got an answer about **sales being up 12% from electronics**, even if you sell rice. |
| **What was really wrong** | The code contained a placeholder ("mock") sentence that was never replaced with real data. |
| **What we did** | The voice assistant now looks up **your real totals and top products** from the database before answering. |

---

### 🟠 Fix 6 — Logging in with a non-email username caused a "500 server error"

| | |
|---|---|
| **What you would have seen** | Typing something like `bob` instead of an email in the login box gave a scary *Internal Server Error*. |
| **What we did** | It now gives the normal, friendly *"Incorrect email or password"* message. |

---

### 🟡 Fix 7 — Helpful error messages were being hidden

| | |
|---|---|
| **What was really wrong** | When the AI features hit a known problem (like a missing key), the code wrapped the clear message inside a vague *"500 error"*. |
| **What we did** | Clear messages now reach you unchanged. For example, you'll see *"GEMINI_API_KEY is not set. Add it to the .env file and restart the server."* |

---

### 🟡 Fix 8 — Voice sale logging could break if the AI replied in list form

| | |
|---|---|
| **What was really wrong** | The AI sometimes wraps its answer in a list `[ ... ]`, which the code couldn't read. Uploads with no file name could also crash. |
| **What we did** | The AI is now told clearly to send one sale. If it still sends a list, the app handles it, and uploads without a name no longer crash. |

---

### 🟡 Fix 9 — Tidy-ups

- **Removed an unused tool** (`passlib`) and listed the one actually used (`bcrypt`) in `requirements.txt`.
- **Updated old-style code** in `schemas/transaction.py` that newer versions of Pydantic warn about.
- **`.gitignore` updated** so the `venv` folder, the database file (`*.db`) and temporary audio files are never uploaded to GitHub. Your `.gitignore` said `.venv`, but your folder is named `venv`, so it wasn't being ignored.

---

### 🟡 Fix 10 — The main README gave wrong instructions

The original `Readme.md` had several mistakes that would trip anyone up. All are now corrected:

| The README said… | But really it is… |
|---|---|
| Log in at `/auth/token` | `/auth/login` |
| Chat at `/chat` with a `"message"` field | `/ai/chat` with a `"question"` field |
| Dashboard field `total_sold` | `total_quantity` |
| Python 3.10 or higher | Python **3.12** |
| Clone from `thefullstackguy0/tenda-backend` | `Tolu8459/TENDA-api` |
| A long hand-typed install command (missing pieces) | `pip install -r requirements.txt` |
| `touch .env` (Mac only) | Added the Windows version too |
| One voice note saves several products | One voice note = **one** sale |

---

## 📂 Files that were changed

| File | What changed (in plain words) |
|---|---|
| `services/gemini.py` | App no longer crashes without an AI key; gives a clear message instead |
| `routers/voice.py` | Safe file saving, real business numbers, better error handling |
| `routers/ai.py` | Clear error messages are no longer hidden |
| `routers/auth.py` | Non-email logins get a friendly error instead of a crash |
| `schemas/transaction.py` | Modernised one line of code |
| `requirements.txt` | Correct list of tools to install |
| `.gitignore` | Keeps private and junk files off GitHub |
| `.env` | Added backend settings (your old lines kept). **Not uploaded to GitHub.** |
| `Readme.md` | Wrong instructions corrected |
| `FIXES-AND-SETUP.md` | This file 👋 |

---

## 🆘 If something still goes wrong

| What you see | What to do |
|---|---|
| `To use the fastapi command, please install "fastapi[standard]"` | You skipped Step 2. Run `venv\Scripts\activate`, then try again. |
| `'venv\Scripts\activate' is not recognized` | You're in the wrong folder. Do Step 1 again. |
| `GEMINI_API_KEY is not set` | Do Step 4. **Stop the app (Ctrl + C) and start it again** afterwards. |
| `401 Unauthorized` / `Not authenticated` | You aren't logged in. Click **Authorize 🔓** on the `/docs` page (Step 6). |
| `Email already registered` | That email already has an account. Just log in instead. |
| `[Errno 10048] ... address already in use` | The app is already running in another window. Close that window, or run `fastapi dev main.py --port 8001` and use `http://127.0.0.1:8001/docs`. |
| `API key not valid` (from Google) | The key was copied wrong. Check there are no spaces or quote marks around it in `.env`. |

---

## 📖 Glossary

| Word | Meaning |
|---|---|
| **API / backend** | The "kitchen" of the app. Your phone or website (the "dining room") sends orders here and gets results back. |
| **venv** | A private box holding the exact tools this project needs, kept separate from the rest of your computer. |
| **`.env` file** | A private notepad of passwords and settings the app reads when it starts. Never share it. |
| **Gemini API key** | Your personal pass for using Google's AI. Free to get at aistudio.google.com. |
| **`requirements.txt`** | The shopping list of tools the project needs. `pip install -r requirements.txt` buys everything on the list. |
| **`/docs`** | A web page the app creates automatically, where you can click buttons to try every feature. |
| **Error 401** | "I don't know who you are." Log in first. |
| **Error 500** | "Something broke on the app's side." |
| **Error 503** | "A part of me isn't set up yet" (e.g., the AI key is missing). |

---

<div align="center">

**You're all set. Activate → Start → open `/docs` → have fun. 🎉**

</div>

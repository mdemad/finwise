# FinWise – Smart Financial Planning Dashboard

FinWise is a comprehensive, production-quality financial planning platform designed to model investment projections, emergency fund coverage, retirement sustainability, and early retirement (FIRE) targets, using Apple/Stripe-like glassmorphic UI aesthetic styling.

## 📁 Project Architecture

```
finwise/
├── README.md
├── frontend/                # React Vite TypeScript UI
│   ├── src/
│   │   ├── components/      # GlassCard, CustomInput, Slider, Layout Shell
│   │   ├── context/         # Auth, Theme (Light/Dark), Currency contexts
│   │   ├── pages/           # Dashboard + 9 Calculator screens + Scenario + What-If
│   │   ├── utils/           # Financial mathematical engine & CSV/Print export
│   │   └── hooks/           # useCalculations (Hybrid LocalStorage/API adapter)
└── backend/                 # FastAPI Python Server
    ├── app/
    │   ├── api/             # JWT Auth, Calculation CRUD, AI-ready placeholders
    │   └── models/          # Pydantic schema validation layers
    └── run.py               # Uvicorn server runner
```

---

## 🚀 How to Run Locally

### 1. Run the Frontend (React + Vite)
Inside the `frontend/` directory:

```bash
# 1. Install dependencies
npm install

# 2. Start the hot-reloading Vite dev server
npm run dev
```
Open `http://localhost:5173` in your browser.
*Note: The frontend is equipped with a Hybrid DB adapter. If the backend API isn't running, it will automatically fall back to LocalStorage, allowing you to test login, register, and calculation saving immediately offline.*

### 2. Run the Backend (FastAPI)
Inside the `backend/` directory:

```bash
# 1. Create a Python virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Launch the server
python run.py
```
The FastAPI documentation will be available at `http://localhost:8000/docs`.

---

## 🔗 Connect Supabase PostgreSQL Database (Optional)

To connect the application to your real Supabase Database and Auth:

1. **Create Database Tables**:
   In your Supabase SQL Editor, run:
   ```sql
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email TEXT UNIQUE NOT NULL,
     name TEXT NOT NULL,
     currency TEXT DEFAULT 'USD',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
   );

   CREATE TABLE calculations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     calculator_type TEXT NOT NULL,
     name TEXT NOT NULL,
     inputs JSONB NOT NULL,
     outputs JSONB NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
     favorite BOOLEAN DEFAULT false
   );
   ```

2. **Configure Environment Variables**:
   * Create a `.env` file in the `backend/` folder:
     ```env
     SUPABASE_URL=https://your-project-id.supabase.co
     SUPABASE_KEY=your-supabase-anon-key
     JWT_SECRET=generate-a-strong-random-key
     ```
   * Configure the frontend `.env.local` to point to your backend:
     ```env
     VITE_API_URL=http://localhost:8000
     ```

---

## 📦 How to Push to GitHub

To store this code on GitHub:

```bash
# Initialize git in root folder
cd /Users/mohamedemad/.gemini/antigravity/scratch/finwise
git init

# Add ignore configurations (crucial to avoid node_modules and env leakage)
echo "node_modules/\ndist/\n.env.local\n.env" > .gitignore
echo "venv/\n__pycache__/\n.env" > backend/.gitignore

# Stage all files
git add .

# Create initial commit
git commit -m "feat: initial release of FinWise Financial Planner Dashboard"

# Create a repository on GitHub, then link it
git remote add origin https://github.com/yourusername/finwise.git
git branch -M main
git push -u origin main
```

---

## ☁️ Deployment Guide

### Frontend -> Vercel
1. Install Vercel CLI: `npm install -g vercel`.
2. Navigate to `frontend/` directory and run: `vercel`.
3. Set the Environment Variable `VITE_API_URL` to point to your hosted backend URL.

### Backend -> Render
1. Create a Web Service on Render.
2. Select your GitHub repository.
3. Configure settings:
   * **Environment**: Python
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
4. Under Environment variables, add:
   * `SUPABASE_URL`
   * `SUPABASE_KEY`
   * `JWT_SECRET`

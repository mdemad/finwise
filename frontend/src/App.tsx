import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { AuthGuard } from './components/AuthGuard';

// Pages
import { Dashboard } from './pages/Dashboard';
import { SIPCalculator } from './pages/SIPCalculator';
import { LumpSumCalculator } from './pages/LumpSumCalculator';
import { InflationCalculator } from './pages/InflationCalculator';
import { GoalPlanner } from './pages/GoalPlanner';
import { RetirementPlanner } from './pages/RetirementPlanner';
import { FIRECalculator } from './pages/FIRECalculator';
import { EmergencyFund } from './pages/EmergencyFund';
import { EMICalculator } from './pages/EMICalculator';
import { NetWorthTracker } from './pages/NetWorthTracker';
import { ScenarioComparison } from './pages/ScenarioComparison';
import { WhatIfSimulator } from './pages/WhatIfSimulator';
import { LearningSection } from './pages/LearningSection';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <CurrencyProvider>
            <Layout>
              <Routes>
                {/* Public Dashboards & Calculators */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/sip" element={<SIPCalculator />} />
                <Route path="/lumpsum" element={<LumpSumCalculator />} />
                <Route path="/inflation" element={<InflationCalculator />} />
                <Route path="/goal" element={<GoalPlanner />} />
                <Route path="/retirement" element={<RetirementPlanner />} />
                <Route path="/fire" element={<FIRECalculator />} />
                <Route path="/emergency" element={<EmergencyFund />} />
                <Route path="/emi" element={<EMICalculator />} />
                <Route path="/networth" element={<NetWorthTracker />} />
                <Route path="/scenario" element={<ScenarioComparison />} />
                <Route path="/whatif" element={<WhatIfSimulator />} />
                <Route path="/learning" element={<LearningSection />} />

                {/* Auth */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Protected Profile */}
                <Route
                  path="/profile"
                  element={
                    <AuthGuard>
                      <Profile />
                    </AuthGuard>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </CurrencyProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

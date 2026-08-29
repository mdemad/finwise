import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { AuthGuard } from './components/AuthGuard';

// Route-level Lazy Loading for instantaneous navigation & optimal performance
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const SIPCalculator = lazy(() => import('./pages/SIPCalculator').then(m => ({ default: m.SIPCalculator })));
const LumpSumCalculator = lazy(() => import('./pages/LumpSumCalculator').then(m => ({ default: m.LumpSumCalculator })));
const InflationCalculator = lazy(() => import('./pages/InflationCalculator').then(m => ({ default: m.InflationCalculator })));
const CurrencyDepreciation = lazy(() => import('./pages/CurrencyDepreciation').then(m => ({ default: m.CurrencyDepreciation })));
const GoalPlanner = lazy(() => import('./pages/GoalPlanner').then(m => ({ default: m.GoalPlanner })));
const RetirementPlanner = lazy(() => import('./pages/RetirementPlanner').then(m => ({ default: m.RetirementPlanner })));
const FIRECalculator = lazy(() => import('./pages/FIRECalculator').then(m => ({ default: m.FIRECalculator })));
const EmergencyFund = lazy(() => import('./pages/EmergencyFund').then(m => ({ default: m.EmergencyFund })));
const EMICalculator = lazy(() => import('./pages/EMICalculator').then(m => ({ default: m.EMICalculator })));
const NetWorthTracker = lazy(() => import('./pages/NetWorthTracker').then(m => ({ default: m.NetWorthTracker })));
const ScenarioComparison = lazy(() => import('./pages/ScenarioComparison').then(m => ({ default: m.ScenarioComparison })));
const WhatIfSimulator = lazy(() => import('./pages/WhatIfSimulator').then(m => ({ default: m.WhatIfSimulator })));
const LearningSection = lazy(() => import('./pages/LearningSection').then(m => ({ default: m.LearningSection })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));

import './App.css';

// Minimal, zero-layout-shift loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px] w-full">
    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <CurrencyProvider>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Dashboards & Calculators */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/sip" element={<SIPCalculator />} />
                  <Route path="/lumpsum" element={<LumpSumCalculator />} />
                  <Route path="/inflation" element={<InflationCalculator />} />
                  <Route path="/currency" element={<CurrencyDepreciation />} />
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
              </Suspense>
            </Layout>
          </CurrencyProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

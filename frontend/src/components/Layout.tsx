import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { CurrencyCode, currencies } from '../utils/formatters';
import {
  LayoutDashboard,
  TrendingUp,
  Coins,
  Percent,
  Goal,
  Moon,
  Sun,
  User,
  LogOut,
  FolderLock,
  Flame,
  ShieldAlert,
  Calculator,
  Compass,
  LineChart,
  GitCompare,
  BookOpen,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'SIP Calculator', path: '/sip', icon: TrendingUp },
    { name: 'Lump Sum', path: '/lumpsum', icon: Coins },
    { name: 'Inflation', path: '/inflation', icon: Percent },
    { name: 'Goal Planner', path: '/goal', icon: Goal },
    { name: 'Retirement', path: '/retirement', icon: FolderLock },
    { name: 'FIRE Calculator', path: '/fire', icon: Flame },
    { name: 'Emergency Fund', path: '/emergency', icon: ShieldAlert },
    { name: 'EMI Calculator', path: '/emi', icon: Calculator },
    { name: 'Net Worth', path: '/networth', icon: LineChart },
    { name: 'Scenario Compare', path: '/scenario', icon: GitCompare },
    { name: 'What If Simulator', path: '/whatif', icon: Compass },
    { name: 'Learning Center', path: '/learning', icon: BookOpen },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      
      {/* 1. Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-slate-200/50 dark:border-slate-800/40 p-4 sticky top-0 h-screen z-40">
        {/* Brand Header */}
        <Link to="/" className="flex items-center gap-2 px-3 py-4 mb-6 hover:opacity-90">
          <div className="w-8 h-8 rounded-lg bg-brand-emerald flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
            FinWise
          </span>
        </Link>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-emerald text-white shadow-md shadow-emerald-500/10'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info */}
        {user ? (
          <div className="border-t border-slate-200/50 dark:border-slate-800/40 pt-4 mt-4 flex items-center justify-between gap-2">
            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-500">
                {user.name[0].toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate">{user.name}</span>
                <span className="text-[10px] text-slate-400 truncate">{user.email}</span>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="border-t border-slate-200/50 dark:border-slate-800/40 pt-4 mt-4 flex flex-col gap-2">
            <Link
              to="/login"
              className="text-center font-bold text-xs bg-slate-200/50 dark:bg-slate-900/50 py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-900 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="text-center font-bold text-xs bg-brand-emerald text-white py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}
      </aside>

      {/* 2. Topbar Header & Layout Content (Mobile + Desktop Top Panel) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="glass-panel border-b border-slate-200/50 dark:border-slate-800/40 sticky top-0 z-30 px-6 py-4 flex items-center justify-between h-16">
          
          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/50 rounded-lg cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Page title (Desktop) */}
          <span className="hidden md:inline text-sm font-bold text-slate-400">
            {menuItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
          </span>

          {/* Mobile Brand Label */}
          <Link to="/" className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-brand-emerald flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
              FinWise
            </span>
          </Link>

          {/* Actions Menu */}
          <div className="flex items-center gap-4">
            
            {/* Currency selector */}
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as CurrencyCode)}
              className="bg-slate-200/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/40 text-xs font-semibold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500/80 cursor-pointer"
            >
              {Object.keys(currencies).map(code => (
                <option key={code} value={code}>
                  {code} ({currencies[code as CurrencyCode].symbol})
                </option>
              ))}
            </select>

            {/* Dark mode switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-slate-200/50 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Dropdown Profile (Mobile & header profile) */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 hover:opacity-90 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-500">
                    {user.name[0].toUpperCase()}
                  </div>
                </button>

                {userDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-fadeIn">
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-500">Signed in as</p>
                        <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">
                          {user.name}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        My Profile
                      </Link>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 w-full text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-semibold"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                Login
              </Link>
            )}
          </div>
        </header>

        {/* 3. Mobile Navigation Menu drawer Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            ></div>

            {/* Menu content */}
            <div className="relative flex flex-col w-64 max-w-xs h-full bg-slate-50 dark:bg-slate-950 p-4 border-r border-slate-200 dark:border-slate-800 z-50">
              <div className="flex justify-between items-center mb-6">
                <Link to="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <div className="w-7 h-7 bg-brand-emerald rounded flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
                    FinWise
                  </span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          isActive
                            ? 'bg-brand-emerald text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/50'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </nav>

              {user && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 flex items-center justify-between">
                  <Link to="/profile" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-500">
                      {user.name[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-bold truncate max-w-[120px]">{user.name}</span>
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Page Main Frame container */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full page-transition">
          {children}
        </main>
      </div>
    </div>
  );
};

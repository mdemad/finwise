import React from 'react';

// 1. GlassCard
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={`glass-card rounded-2xl p-6 transition-all duration-300 ${
        hoverable ? 'hover:scale-[1.01] hover:shadow-lg dark:hover:shadow-emerald-950/20 hover:border-emerald-500/20' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// 2. CustomInput
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  prefixSymbol?: string;
  suffixSymbol?: string;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  prefixSymbol,
  suffixSymbol,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</label>
      <div className="relative flex items-center">
        {prefixSymbol && (
          <span className="absolute left-3 text-slate-400 dark:text-slate-500 font-medium">
            {prefixSymbol}
          </span>
        )}
        <input
          className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 outline-none
            ${prefixSymbol ? 'pl-9' : ''} 
            ${suffixSymbol ? 'pr-9' : ''}
            ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/25 bg-red-500/5'
                : 'border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 focus:border-emerald-500 dark:focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10'
            } ${className}`}
          {...props}
        />
        {suffixSymbol && (
          <span className="absolute right-3 text-slate-400 dark:text-slate-500 font-medium text-xs">
            {suffixSymbol}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-red-500 font-medium mt-0.5">{error}</span>}
    </div>
  );
};

// 3. CustomButton
interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  ...props
}) => {
  const baseStyle =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
  
  const variants = {
    primary:
      'bg-brand-emerald text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20 focus:ring-4 focus:ring-emerald-500/20',
    secondary:
      'bg-brand-blue text-white hover:bg-blue-600 shadow-sm shadow-blue-500/10 hover:shadow-blue-500/20 focus:ring-4 focus:ring-blue-500/20',
    danger:
      'bg-red-500 text-white hover:bg-red-600 shadow-sm focus:ring-4 focus:ring-red-500/20',
    ghost:
      'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white/40 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-900 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-900/50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// 4. Slider component
interface SliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  prefixSymbol?: string;
  suffixSymbol?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefixSymbol,
  suffixSymbol,
}) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-sm font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/10">
          {prefixSymbol}
          {value}
          {suffixSymbol}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer appearance-none transition-colors focus:outline-none"
      />
      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
        <span>
          {prefixSymbol}
          {min}
          {suffixSymbol}
        </span>
        <span>
          {prefixSymbol}
          {max}
          {suffixSymbol}
        </span>
      </div>
    </div>
  );
};

// 5. Tooltip
interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 shadow-xl z-50">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  );
};

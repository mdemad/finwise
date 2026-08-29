import React, { useState, useEffect, useCallback } from 'react';

// 1. GlassCard (Crisp, high-performance fintech card)
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
      className={`glass-card rounded-2xl p-6 transition-all duration-150 ${
        hoverable ? 'hover:scale-[1.005] hover:border-emerald-500/30' : ''
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
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <div className="relative flex items-center">
        {prefixSymbol && (
          <span className="absolute left-3 text-slate-400 dark:text-slate-500 font-semibold text-xs pointer-events-none">
            {prefixSymbol}
          </span>
        )}
        <input
          className={`w-full px-3.5 py-2 rounded-xl border text-sm font-semibold transition-colors duration-150 outline-none
            ${prefixSymbol ? 'pl-8' : ''} 
            ${suffixSymbol ? 'pr-8' : ''}
            ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-500/5'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
            } ${className}`}
          {...props}
        />
        {suffixSymbol && (
          <span className="absolute right-3 text-slate-400 dark:text-slate-500 font-semibold text-xs pointer-events-none">
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
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
  
  const variants = {
    primary:
      'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm hover:shadow focus:ring-2 focus:ring-emerald-500/25',
    secondary:
      'bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 shadow-sm focus:ring-2 focus:ring-slate-500/25',
    danger:
      'bg-red-500 text-white hover:bg-red-600 shadow-sm focus:ring-2 focus:ring-red-500/25',
    ghost:
      'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-2 focus:ring-slate-400/20',
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

// 4. Slider with synchronized manual numeric input
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
  // Local string state for the editable input — lets user type freely
  const [inputStr, setInputStr] = useState<string>(String(value));
  // Whether the input is currently focused (to avoid overwriting while typing)
  const [isFocused, setIsFocused] = useState(false);

  // Sync input display when external value changes (e.g., slider drag)
  useEffect(() => {
    if (!isFocused) {
      setInputStr(String(value));
    }
  }, [value, isFocused]);

  // Clamp a value to the allowed range, snapping to the nearest step
  const clamp = useCallback(
    (n: number): number => {
      if (isNaN(n)) return min;
      const snapped = Math.round(n / step) * step;
      return Math.min(max, Math.max(min, snapped));
    },
    [min, max, step]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow only digits, one optional decimal point
    const sanitized = raw.replace(/[^0-9.]/g, '');
    setInputStr(sanitized);

    const parsed = parseFloat(sanitized);
    if (!isNaN(parsed)) {
      const clamped = clamp(parsed);
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(inputStr);
    if (isNaN(parsed) || inputStr.trim() === '') {
      // Reset to current valid value
      setInputStr(String(value));
    } else {
      const clamped = clamp(parsed);
      onChange(clamped);
      setInputStr(String(clamped));
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    onChange(n);
    if (!isFocused) {
      setInputStr(String(n));
    }
  };

  // Format the min/max labels nicely
  const formatLabel = (n: number) => {
    if (n >= 10000000) return `${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)}Cr`;
    if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
    if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
    return String(n);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Label + Manual Input row */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex-shrink-0">
          {label}
        </span>
        {/* Manual numeric input */}
        <div className="relative flex items-center">
          {prefixSymbol && (
            <span className="absolute left-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 pointer-events-none z-10">
              {prefixSymbol}
            </span>
          )}
          <input
            type="text"
            inputMode="numeric"
            value={inputStr}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-label={`${label} manual input`}
            className={`
              w-28 text-right text-sm font-bold rounded-lg py-1.5 
              bg-white text-slate-900 border border-slate-200 
              dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800 
              focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 
              shadow-sm transition-colors duration-150
              ${prefixSymbol ? 'pl-6 pr-2.5' : suffixSymbol ? 'pl-2.5 pr-7' : 'px-2.5'}
            `}
          />
          {suffixSymbol && (
            <span className="absolute right-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 pointer-events-none z-10">
              {suffixSymbol}
            </span>
          )}
        </div>
      </div>

      {/* Range Slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        aria-label={`${label} slider`}
        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer appearance-none focus:outline-none"
      />

      {/* Min / Max labels */}
      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
        <span>
          {prefixSymbol}{formatLabel(min)}{suffixSymbol}
        </span>
        <span>
          {prefixSymbol}{formatLabel(max)}{suffixSymbol}
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
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 shadow-xl z-50">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  );
};

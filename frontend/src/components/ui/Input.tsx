import React, { forwardRef } from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, leftIcon, rightIcon, id, fullWidth = true, helperText, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`input-wrapper ${className}`}>
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {props.required && <span className="input-required">*</span>}
          </label>
        )}
        
        <div className={`input-container ${error ? 'input-error-state' : ''}`}>
          {leftIcon && <div className="input-icon-left">{leftIcon}</div>}
          
          <input
            ref={ref}
            id={inputId}
            className={`input-field ${leftIcon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''}`}
            {...props}
          />
          
          {rightIcon && <div className="input-icon-right">{rightIcon}</div>}
        </div>
        
        {error && <span className="input-error-text">{error}</span>}
        {!error && helperText && <span className="input-helper-text" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

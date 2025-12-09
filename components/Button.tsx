import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  
  const baseStyle = "font-bold py-4 px-6 rounded-xl transition-all duration-300 text-lg flex items-center justify-center gap-2 transform active:scale-95";
  
  const variants = {
    primary: "bg-gradient-to-r from-brand-gold to-yellow-600 text-brand-dark shadow-[0_0_20px_rgba(214,187,86,0.3)] hover:shadow-[0_0_30px_rgba(214,187,86,0.5)] hover:brightness-110",
    secondary: "bg-white/5 backdrop-blur-md border border-white/10 text-brand-light hover:bg-white/10 hover:border-white/20",
    danger: "bg-red-500/80 backdrop-blur-md text-white hover:bg-red-600 border border-red-500/50"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
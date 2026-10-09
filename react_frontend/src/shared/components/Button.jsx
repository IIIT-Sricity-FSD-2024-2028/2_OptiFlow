import React from 'react';

// WHY: A shared Button component keeps our UI perfectly consistent. 
// Using a "variants" dictionary allows us to easily switch button styles 
// just by passing a prop: <Button variant="danger">Delete</Button>

export const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  
  // These styles apply to ALL buttons, no matter what variant they are.
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  // This dictionary maps the 'variant' prop to specific Tailwind color classes.
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border border-transparent',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 border border-gray-300 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent',
    warning: 'bg-amber-100 text-amber-800 hover:bg-amber-200 focus:ring-amber-500 border border-transparent',
    outline: 'bg-transparent text-blue-600 hover:bg-blue-50 focus:ring-blue-500 border border-blue-600',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 border border-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  // Default to primary if a weird variant is passed
  const selectedVariant = variants[variant] || variants.primary;
  const selectedSize = sizes[size] || sizes.md;

  // Combine the base styles, the variant styles, and any custom classes passed in
  const combinedClasses = `${baseStyles} ${selectedSize} ${selectedVariant} ${className}`;

  return (
    <button 
      className={combinedClasses} 
      {...props}
    >
      {children}
    </button>
  );
};

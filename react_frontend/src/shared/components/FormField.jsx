export const FormField = ({
  label,
  required = false,
  error,
  hint,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-slate-800">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
};

const controlBase =
  'w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-md transition-colors focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 disabled:bg-slate-100 disabled:text-slate-400';

export const Input = ({ error, className = '', ...props }) => {
  return (
    <input
      className={`${controlBase} ${
        error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300'
      } ${className}`}
      {...props}
    />
  );
};

export const Select = ({ options, placeholder, error, children, className = '', ...props }) => {
  return (
    <select
      className={`${controlBase} cursor-pointer ${
        error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300'
      } ${className}`}
      {...props}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options
        ? options.map((opt, idx) => {
            const isObj = typeof opt === 'object' && opt !== null;
            const val = isObj ? opt.value : opt;
            const lbl = isObj ? opt.label : opt;
            return <option key={val ?? idx} value={val}>{lbl}</option>;
          })
        : children}
    </select>
  );
};

export const Textarea = ({ rows = 3, error, className = '', ...props }) => {
  return (
    <textarea
      rows={rows}
      className={`${controlBase} resize-y ${
        error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300'
      } ${className}`}
      {...props}
    />
  );
};

export const DatePicker = ({ error, className = '', ...props }) => {
  return (
    <input
      type="date"
      className={`${controlBase} ${
        error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300'
      } ${className}`}
      {...props}
    />
  );
};

type Variant = 'success' | 'error' | 'info' | 'warning';

interface AlertProps {
  message: string;
  variant?: Variant;
  onClose?: () => void;
}

const VARIANT_STYLES: Record<Variant, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
};

export default function Alert({ message, variant = 'info', onClose }: AlertProps) {
  if (!message) return null;
  return (
    <div className={`rounded-xl border p-4 mb-6 text-sm ${VARIANT_STYLES[variant]}`} role="alert">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 mt-0.5">
          {variant === 'success' ? '✅' : variant === 'error' ? '❌' : variant === 'warning' ? '⚠️' : 'ℹ️'}
        </span>
        <p>{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto mt-0.5 text-current opacity-60 hover:opacity-100"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

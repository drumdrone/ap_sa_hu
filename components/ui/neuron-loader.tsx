import { cn } from "@/lib/utils";

type NeuronLoaderProps = {
  size?: number;
  label?: string;
  className?: string;
};

export function NeuronLoader({ size = 80, label, className }: NeuronLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        role="status"
        aria-label={label ?? "Načítám"}
        className="neuron-loader-svg"
      >
        <defs>
          <radialGradient id="neuron-node-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7cc4ff" stopOpacity="1" />
            <stop offset="60%" stopColor="#2196f3" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#15315c" stopOpacity="0.2" />
          </radialGradient>
          <filter id="neuron-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g stroke="#2196f3" strokeWidth="0.6" strokeLinecap="round" filter="url(#neuron-glow)" className="neuron-edges">
          <line x1="50" y1="50" x2="20" y2="22" />
          <line x1="50" y1="50" x2="82" y2="26" />
          <line x1="50" y1="50" x2="16" y2="60" />
          <line x1="50" y1="50" x2="86" y2="62" />
          <line x1="50" y1="50" x2="32" y2="86" />
          <line x1="50" y1="50" x2="70" y2="88" />
          <line x1="20" y1="22" x2="16" y2="60" />
          <line x1="82" y1="26" x2="86" y2="62" />
          <line x1="16" y1="60" x2="32" y2="86" />
          <line x1="86" y1="62" x2="70" y2="88" />
        </g>

        <g fill="url(#neuron-node-grad)" filter="url(#neuron-glow)">
          <circle cx="50" cy="50" r="6" className="neuron-node neuron-node-core" />
          <circle cx="20" cy="22" r="3.2" className="neuron-node neuron-node-1" />
          <circle cx="82" cy="26" r="3.2" className="neuron-node neuron-node-2" />
          <circle cx="16" cy="60" r="2.8" className="neuron-node neuron-node-3" />
          <circle cx="86" cy="62" r="2.8" className="neuron-node neuron-node-4" />
          <circle cx="32" cy="86" r="3.0" className="neuron-node neuron-node-5" />
          <circle cx="70" cy="88" r="3.0" className="neuron-node neuron-node-6" />
        </g>
      </svg>
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}

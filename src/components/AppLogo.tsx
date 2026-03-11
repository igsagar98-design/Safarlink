import { Truck } from 'lucide-react';
import { useMemo, useState } from 'react';

interface AppLogoProps {
  className?: string;
  imageClassName?: string;
  alt?: string;
}

export default function AppLogo({
  className = 'h-10 w-auto',
  imageClassName = '',
  alt = 'Safarlink',
}: AppLogoProps) {
  const sources = useMemo(
    () => ['/safarlink-logo.png', '/safarlink-logo.jpg', '/safarlink-logo.jpeg', '/safarlink-logo.svg', '/logo.png'],
    []
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  return (
    <img
      src={sources[sourceIndex]}
      alt={alt}
      className={`${className} ${imageClassName}`.trim()}
      onError={(event) => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((value) => value + 1);
          return;
        }

        const target = event.currentTarget;
        target.style.display = 'none';
        const fallback = target.nextElementSibling as HTMLElement | null;
        if (fallback) {
          fallback.style.display = 'inline-flex';
        }
      }}
    />
  );
}

export function AppLogoFallback({ label = 'Safarlink' }: { label?: string }) {
  return (
    <span className="hidden items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <Truck className="h-4 w-4 text-primary-foreground" />
      </span>
      <span className="font-display font-bold text-sm">{label}</span>
    </span>
  );
}

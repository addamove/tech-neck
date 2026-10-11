import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SelectControl(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="select-control">
      <select {...props} />
      <ChevronDown size={14} aria-hidden="true" />
    </span>
  );
}

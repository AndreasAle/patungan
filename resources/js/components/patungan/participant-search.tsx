import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ParticipantSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function ParticipantSearch({ value, onChange, placeholder = 'Cari nama kamu...' }: ParticipantSearchProps) {
    return (
        <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className="bg-card focus-visible:border-primary h-12 rounded-2xl border-emerald-100 pl-10 shadow-[0_5px_18px_rgba(13,78,55,0.05)] dark:border-emerald-400/15"
            />
        </div>
    );
}

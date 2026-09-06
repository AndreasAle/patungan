import { cn } from '@/lib/utils';
import type { PaymentStatus as Status } from '@/types';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

interface PaymentStatusProps {
    status: Status;
    countdown?: string | null;
    className?: string;
}

export function PaymentStatus({ status, countdown, className }: PaymentStatusProps) {
    if (status === 'PAID') {
        return (
            <div className={cn('bg-success-soft text-success flex items-center justify-center gap-2 rounded-xl px-4 py-3', className)}>
                <CheckCircle2 className="size-5" />
                <span className="font-semibold">Pembayaran berhasil</span>
            </div>
        );
    }

    if (status === 'PENDING') {
        return (
            <div className={cn('bg-muted text-muted-foreground flex items-center justify-center gap-2 rounded-xl px-4 py-3', className)}>
                <Loader2 className="size-4 animate-spin" />
                <span className="font-medium">Menunggu pembayaran</span>
                {countdown && (
                    <span className="text-foreground inline-flex items-center gap-1 font-semibold tabular-nums">
                        <Clock className="size-3.5" />
                        {countdown}
                    </span>
                )}
            </div>
        );
    }

    const message = status === 'EXPIRED' ? 'QRIS sudah kedaluwarsa.' : 'Pembayaran belum berhasil.';

    return (
        <div className={cn('bg-destructive/10 text-destructive flex items-center justify-center gap-2 rounded-xl px-4 py-3', className)}>
            <XCircle className="size-5" />
            <span className="font-semibold">{message}</span>
        </div>
    );
}

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

interface BottomSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: ReactNode;
}

/**
 * Slides up from the bottom on phones and centres itself on wider screens,
 * which is where most payer interactions happen.
 */
export function BottomSheet({ open, onOpenChange, title, description, children }: BottomSheetProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="bg-foreground/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-50 backdrop-blur-[2px]" />
                <Dialog.Content className="border-border bg-card pb-safe data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom sm:data-[state=open]:slide-in-from-bottom-4 fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-3xl border p-5 shadow-xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
                    <div className="bg-border mx-auto mb-4 h-1.5 w-10 rounded-full sm:hidden" />
                    <Dialog.Title className="text-foreground text-lg font-bold tracking-tight">{title}</Dialog.Title>
                    {description ? (
                        <Dialog.Description className="text-muted-foreground mt-1 text-sm">{description}</Dialog.Description>
                    ) : (
                        <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                    <div className="mt-5">{children}</div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import type { ReactNode } from 'react';

interface DataTableProps {
    headers: string[];
    children: ReactNode;
    empty?: string;
    isEmpty: boolean;
    pagination?: { current_page: number; last_page: number; total: number; routeName: string; params?: Record<string, unknown> };
}

/** Horizontally scrollable table shell shared by the admin screens. */
export function DataTable({ headers, children, empty = 'Belum ada data.', isEmpty, pagination }: DataTableProps) {
    return (
        <div className="border-border bg-card mt-4 overflow-hidden rounded-2xl border">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                    <thead>
                        <tr className="border-border border-b text-left">
                            {headers.map((header) => (
                                <th key={header} className="text-muted-foreground px-4 py-3 font-semibold whitespace-nowrap">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-border divide-y">{children}</tbody>
                </table>
            </div>

            {isEmpty && <p className="text-muted-foreground px-4 py-10 text-center text-sm">{empty}</p>}

            {pagination && pagination.last_page > 1 && (
                <div className="border-border flex items-center justify-between border-t px-4 py-3">
                    <span className="text-muted-foreground text-sm">{pagination.total} data</span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current_page === 1}
                            onClick={() =>
                                router.get(
                                    route(pagination.routeName),
                                    { ...pagination.params, page: pagination.current_page - 1 },
                                    { preserveState: true },
                                )
                            }
                        >
                            Sebelumnya
                        </Button>
                        <span className="text-muted-foreground text-sm">
                            {pagination.current_page} / {pagination.last_page}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current_page === pagination.last_page}
                            onClick={() =>
                                router.get(
                                    route(pagination.routeName),
                                    { ...pagination.params, page: pagination.current_page + 1 },
                                    { preserveState: true },
                                )
                            }
                        >
                            Berikutnya
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

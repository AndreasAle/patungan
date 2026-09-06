import { DataTable } from '@/components/patungan/data-table';
import { Eyebrow } from '@/components/patungan/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, rupiah } from '@/lib/format';
import type { Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: string;
    suspended: boolean;
    patungans_count: number;
    balance: number;
    created_at: string | null;
}

export default function AdminUsers({ users, search }: { users: Paginated<AdminUser>; search: string }) {
    const [term, setTerm] = useState(search);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get(route('admin.users'), { search: term }, { preserveState: true });
    };

    return (
        <AdminLayout>
            <Head title="Admin · Users" />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Eyebrow>Akun terdaftar</Eyebrow>
                    <h1 className="display mt-2.5 text-[22px] sm:text-3xl">Users</h1>
                </div>

                <form onSubmit={submit} className="flex gap-2">
                    <Input
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                        placeholder="Cari nama atau email"
                        className="h-10 w-64 rounded-xl"
                    />
                    <Button type="submit" variant="outline" className="h-10 rounded-xl">
                        Cari
                    </Button>
                </form>
            </div>

            <DataTable
                headers={['Nama', 'Email', 'Role', 'Patungan', 'Saldo', 'Bergabung', 'Status', '']}
                isEmpty={users.data.length === 0}
                empty="Tidak ada user."
                pagination={{ ...users, routeName: 'admin.users', params: { search } }}
            >
                {users.data.map((user) => (
                    <tr key={user.id}>
                        <td className="px-4 py-3 font-medium">{user.name}</td>
                        <td className="text-muted-foreground px-4 py-3">{user.email}</td>
                        <td className="text-muted-foreground px-4 py-3">{user.role}</td>
                        <td className="px-4 py-3 tabular-nums">{user.patungans_count}</td>
                        <td className="px-4 py-3 tabular-nums">{rupiah(user.balance)}</td>
                        <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">{formatDate(user.created_at)}</td>
                        <td className="px-4 py-3">
                            <span className={user.suspended ? 'text-destructive font-semibold' : 'text-success'}>
                                {user.suspended ? 'Dibekukan' : 'Aktif'}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    router.post(
                                        user.suspended ? route('admin.users.restore', user.id) : route('admin.users.suspend', user.id),
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                {user.suspended ? 'Aktifkan' : 'Bekukan'}
                            </Button>
                        </td>
                    </tr>
                ))}
            </DataTable>
        </AdminLayout>
    );
}

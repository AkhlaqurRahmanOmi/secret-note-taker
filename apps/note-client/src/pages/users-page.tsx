import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, apiPage, json, Page, Role, User } from '../api';
import { useAuth } from '../auth';
import { formatDay, indexNo } from '../lib/format';
import { list as listMotion, row } from '../lib/motion';
import { Alert, caption, ConfirmButton, Pager, Select } from '../ui';

const LIMIT = 10;

export function UsersPage() {
  const { user: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [list, setList] = useState<Page<User> | null>(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    apiPage<User>(`/users?page=${page}&limit=${LIMIT}`)
      .then((res) => live && (setList(res), setError('')))
      .catch((err: Error) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [page, version]);

  async function act(run: () => Promise<unknown>) {
    setError('');
    try {
      await run();
      setVersion((v) => v + 1);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const setRole = (u: User, role: Role) =>
    act(() => api(`/users/${u._id}`, { method: 'PATCH', body: json({ role }) }));
  const remove = (u: User) => act(() => api(`/users/${u._id}`, { method: 'DELETE' }));

  const offset = (page - 1) * LIMIT;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-poster font-bold">Users</h1>
          <p className={caption}>{list ? `${list.meta.total} accounts` : 'Loading…'}</p>
        </div>

        {error && (
          <div className="mt-6">
            <Alert>{error}</Alert>
          </div>
        )}

        <div className="mt-8 overflow-x-auto border-t-2 border-ink">
          <table className="w-full min-w-[52rem] text-left text-body">
            <thead>
              <tr className={`border-b border-ink ${caption}`}>
                <th className="w-14 py-3 pr-3 font-semibold">№</th>
                <th className="py-3 pr-4 font-semibold">Name</th>
                <th className="py-3 pr-4 font-semibold">Email</th>
                <th className="py-3 pr-4 font-semibold">Interests</th>
                <th className="py-3 pr-4 font-semibold">Joined</th>
                <th className="py-3 pr-4 font-semibold">Role</th>
                <th className="py-3 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <motion.tbody key={page} variants={listMotion} initial="hidden" animate={list ? 'shown' : 'hidden'}>
              {list?.data.map((u, i) => {
                const self = u._id === me?._id;
                return (
                  <motion.tr key={u._id} variants={row} className="border-b border-rule align-middle">
                    <td className="py-3 pr-3 font-semibold tabular-nums text-field">{indexNo(offset + i + 1)}</td>
                    <td className="py-3 pr-4 font-semibold">
                      {u.name}
                      {self && <span className={`ml-2 text-field ${caption}`}>You</span>}
                    </td>
                    <td className="py-3 pr-4">{u.email}</td>
                    <td className="py-3 pr-4">{u.interests.length ? u.interests.join(', ') : '—'}</td>
                    <td className="whitespace-nowrap py-3 pr-4">{formatDay(u.createdAt)}</td>
                    <td className="py-3 pr-4">
                      {self ? (
                        <span title="You can’t change your own role">Admin</span>
                      ) : (
                        <label>
                          <span className="sr-only">Role for {u.name}</span>
                          <Select value={u.role} onChange={(e) => setRole(u, e.target.value as Role)}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </Select>
                        </label>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {!self && <ConfirmButton label="Delete" confirmLabel="Delete user" onConfirm={() => remove(u)} />}
                    </td>
                  </motion.tr>
                );
              })}
            </motion.tbody>
          </table>
        </div>

        {list && list.meta.totalPages > 1 && (
          <div className="mt-6">
            <Pager page={page} totalPages={list.meta.totalPages} onPage={(p) => setParams({ page: String(p) })} />
          </div>
        )}
      </div>
    </div>
  );
}

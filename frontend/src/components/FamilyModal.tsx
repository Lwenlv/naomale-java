import React from 'react';
import {
  Check,
  Copy,
  Home,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { AuthState, FamilyAccountMember } from '../types';
import {
  createFamily,
  fetchFamilyInvite,
  fetchFamilyMembers,
  joinFamily,
  switchFamily,
} from '../services/data';

interface FamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: AuthState;
  onNotify: (message: string) => void;
  onLogout: () => void;
}

export const FamilyModal: React.FC<FamilyModalProps> = ({ isOpen, onClose, auth, onNotify, onLogout }) => {
  const [newFamilyName, setNewFamilyName] = React.useState('');
  const [inviteInput, setInviteInput] = React.useState('');
  const [inviteCode, setInviteCode] = React.useState('');
  const [members, setMembers] = React.useState<FamilyAccountMember[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const activeFamily = auth.families.find((family) => family.id === auth.activeFamilyId);
  const isOwner = activeFamily?.role === 'owner';

  const refreshFamilyDetails = React.useCallback(async () => {
    if (!auth.activeFamilyId) return;
    try {
      const [code, memberList] = await Promise.all([
        fetchFamilyInvite(auth.activeFamilyId),
        fetchFamilyMembers(auth.activeFamilyId),
      ]);
      setInviteCode(code);
      setMembers(memberList);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [auth.activeFamilyId]);

  React.useEffect(() => {
    if (!isOpen) return;
    setError(null);
    void refreshFamilyDetails();
  }, [isOpen, refreshFamilyDetails]);

  React.useEffect(() => {
    if (!isOpen) {
      setNewFamilyName('');
      setInviteInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const run = async (task: () => Promise<unknown>, successMessage?: string) => {
    setBusy(true);
    setError(null);
    try {
      await task();
      if (successMessage) onNotify(successMessage);
      await refreshFamilyDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      onNotify('邀请码已复制');
    } catch {
      onNotify(`邀请码：${inviteCode}`);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newFamilyName.trim()) return;
    await run(async () => {
      await createFamily(newFamilyName.trim());
      setNewFamilyName('');
    }, '新家庭已创建并切换');
  };

  const handleJoin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteInput.trim()) return;
    await run(async () => {
      await joinFamily(inviteInput.trim());
      setInviteInput('');
    }, '已加入家庭');
  };

  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-stone-200 my-auto flex flex-col max-h-[96vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-700" />
            <h3 className="font-serif-title text-xl font-bold text-stone-900">账号与家庭</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6 flex-1">
          {/* 当前账号 */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-full bg-amber-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {(auth.user.displayName || auth.user.username).slice(0, 1)}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-stone-900 truncate">{auth.user.displayName}</div>
                <div className="text-[11px] text-stone-400 font-mono truncate">@{auth.user.username}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={busy}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-600 hover:text-rose-600 flex items-center gap-1 disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              退出
            </button>
          </div>

          {/* 当前家庭 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-stone-900 font-serif-title">
                <Home className="w-4 h-4 text-amber-700" />
                <span>{activeFamily?.name ?? '当前家庭'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  {isOwner ? '我创建的' : '已加入'}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 font-mono">{auth.activeFamilyId}</span>
            </div>

            <div className="rounded-2xl border border-stone-200 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] text-stone-400 mb-0.5">家庭邀请码</div>
                  <div className="font-mono text-lg font-bold tracking-widest text-stone-800">
                    {inviteCode || '……'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyInvite()}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[11px] font-semibold text-stone-600 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  复制
                </button>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                让家人注册账号后，在下方「加入家庭」填入邀请码，就能共享这个家庭的菜谱、点单和账本。
              </p>

              <div>
                <div className="text-[10px] text-stone-400 mb-1.5">账号成员 ({members.length})</div>
                <div className="space-y-1.5">
                  {members.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center text-[10px] font-bold">
                          {(member.displayName || member.username).slice(0, 1)}
                        </span>
                        <span className="font-medium text-stone-700">{member.displayName}</span>
                        <span className="text-[10px] text-stone-400 font-mono">@{member.username}</span>
                      </span>
                      <span className={`text-[10px] ${member.role === 'owner' ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
                        {member.role === 'owner' ? '主账号' : '成员'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 切换家庭 */}
          <section className="space-y-2">
            <div className="text-sm font-bold text-stone-900 font-serif-title">我的家庭 ({auth.families.length})</div>
            <div className="space-y-2">
              {auth.families.map((family) => {
                const active = family.id === auth.activeFamilyId;
                return (
                  <div
                    key={family.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${
                      active ? 'border-amber-300 bg-amber-50/60' : 'border-stone-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                        {family.name}
                        {active && <Check className="w-3.5 h-3.5 text-amber-700" />}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {family.role === 'owner' ? '我创建的' : '已加入'} · {family.memberCount} 位账号成员
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy || active}
                      onClick={() => void run(() => switchFamily(family.id), `已切换到「${family.name}」`)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-semibold ${
                        active
                          ? 'bg-white border border-amber-200 text-amber-700'
                          : 'bg-stone-800 hover:bg-stone-700 text-white'
                      } disabled:opacity-60`}
                    >
                      {active ? '当前' : '切换'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 创建 / 加入 */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <form onSubmit={(event) => void handleCreate(event)} className="rounded-2xl border border-stone-200 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                创建新家庭
              </div>
              <input
                type="text"
                value={newFamilyName}
                onChange={(event) => setNewFamilyName(event.target.value)}
                placeholder="如：三口之家"
                className="w-full text-xs rounded-xl border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={busy || !newFamilyName.trim()}
                className="w-full py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold disabled:opacity-60"
              >
                创建并切换
              </button>
            </form>

            <form onSubmit={(event) => void handleJoin(event)} className="rounded-2xl border border-stone-200 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                <UserPlus className="w-3.5 h-3.5 text-sky-600" />
                加入家庭
              </div>
              <input
                type="text"
                value={inviteInput}
                onChange={(event) => setInviteInput(event.target.value)}
                placeholder="输入 8 位邀请码"
                className="w-full text-xs font-mono uppercase rounded-xl border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={busy || !inviteInput.trim()}
                className="w-full py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold disabled:opacity-60"
              >
                加入
              </button>
            </form>
          </section>

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-stone-400">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            每个家庭的数据独立保存、互不影响。
          </div>
        </div>
      </div>
    </div>
  );
};

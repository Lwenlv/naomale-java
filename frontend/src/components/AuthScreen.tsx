import React from 'react';
import { ArrowRight, Loader2, Lock, ShieldCheck, User } from 'lucide-react';
import { loginAccount, registerAccount, ApiError } from '../services/data';

type Mode = 'login' | 'register';

/**
 * 登录 / 注册页
 *
 * 账号、家庭保存在服务端数据库；注册后得到自己的家庭，
 * 也可以通过邀请码加入别人的家庭。
 */
export const AuthScreen: React.FC = () => {
  const [mode, setMode] = React.useState<Mode>('login');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [checkingStatus, setCheckingStatus] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    fetch('/api/auth/status')
      .then((response) => response.json())
      .then((payload) => {
        if (!alive) return;
        if (payload?.ok && payload.data?.hasAccounts === false) setMode('register');
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setCheckingStatus(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        await registerAccount({ username, password, displayName: displayName.trim() || undefined });
      } else {
        await loginAccount(username, password);
      }
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] font-sans-body flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center gap-2 mb-5">
          <img
            src="/images/theme-naomale/hero-home.png"
            alt="闹麻了点单 · 今天吃啥，别吵了"
            className="w-full max-w-md h-auto rounded-2xl shadow-sm"
          />
          <p className="text-[11px] tracking-wide text-stone-500">家庭点单 · 多设备实时同步</p>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 shadow-lg overflow-hidden">
          <div className="flex p-1.5 m-4 mb-0 bg-stone-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'login' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'register' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              }`}
            >
              注册主账号
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-xs text-stone-500 leading-relaxed">
              {mode === 'login'
                ? '登录后即可访问你所属家庭的数据。'
                : '第一次使用请注册。注册后会为你创建专属家庭，菜谱与账本自动保存。'}
            </p>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1.5">用户名</label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="2-24 位中文 / 字母 / 数字"
                  className="w-full text-sm rounded-xl border border-stone-200 pl-9 pr-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                  昵称 <span className="text-stone-400 font-normal">（可选，用于家庭内显示）</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="例如：小明"
                  className="w-full text-sm rounded-xl border border-stone-200 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1.5">密码</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 6 位"
                  className="w-full text-sm rounded-xl border border-stone-200 pl-9 pr-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || checkingStatus}
              className="w-full py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{mode === 'register' ? '注册并进入' : '登录'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-start gap-1.5 text-[10px] text-stone-400 leading-relaxed pt-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                账号与家庭数据安全保存，密码加密存储，不会以明文保存。
              </span>
            </div>
          </form>
        </div>

        <p className="text-center text-[10px] text-stone-400 mt-4">
          一个账号可以加入多个家庭，登录后在顶部切换家庭
        </p>
      </div>
    </div>
  );
};

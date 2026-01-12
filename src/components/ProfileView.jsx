import React, { useState } from 'react';

const ProfileView = ({ apiCall, showToast, token, setToken, user, theme, setTheme }) => {
    const [inputToken, setInputToken] = useState(token || '');
    const [newName, setNewName] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [showUsername, setShowUsername] = useState(false);
    const [showIP, setShowIP] = useState(false);

    const handleWebLogin = async () => {
        showToast("Открываем браузер...", "info");
        const res = await window.api.loginViaSite();
        if (res.success && res.token) {
            setToken(res.token);
            setInputToken(res.token);
            showToast("Успешный вход!", "success");
        } else {
            showToast("Вход отменен", "error");
        }
    };

    const handleSaveToken = () => {
        let val = inputToken.trim();
        if (val.includes('user_token=')) {
            val = val.split('user_token=')[1].split(';')[0];
        }
        setToken(val);
        showToast("Токен сохранен", "success");
    };

    const handleChangeName = async () => {
        if (!newName) return;
        const res = await window.api.request({
            url: 'https://cloud.onlysq.ru/api/setme/username',
            method: 'POST',
            headers: {
                'cookie': `user_token=${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: newName })
        });
        console.log('Change name response:', res);
        if (res && (res.ok || res.data?.ok || res.status === 200)) {
            showToast("Никнейм изменен", "success");
            setNewName('');
            window.location.reload();
        } else {
            showToast("Ошибка смены", "error");
        }
    };

    const maskValue = (val) => {
        if (!val) return '';
        if (val.length <= 4) return '••••';
        return val.substring(0, 2) + '•'.repeat(Math.min(val.length - 4, 20)) + val.substring(val.length - 2);
    };

    return (
        <div className="max-w-lg mx-auto overflow-y-auto max-h-[calc(100vh-100px)] custom-scroll px-2">

            <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 rounded-3xl shadow-xl flex flex-col gap-6 relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                <div className="flex flex-col gap-3">
                    <h3 className="text-base font-bold flex items-center gap-2">
                        <span className="material-symbols-rounded text-blue-500">palette</span>
                        Оформление
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setTheme('dark')}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${theme === 'dark' ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-[var(--bg-dark)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
                        >
                            <span className="material-symbols-rounded text-lg">dark_mode</span>
                            <span className="font-medium text-sm">Тёмная</span>
                        </button>
                        <button
                            onClick={() => setTheme('light')}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${theme === 'light' ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-[var(--bg-dark)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
                        >
                            <span className="material-symbols-rounded text-amber-500 text-lg">light_mode</span>
                            <span className="font-medium text-sm">Светлая</span>
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-center">
                    <button onClick={handleWebLogin} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm">
                        <span className="material-symbols-rounded text-xl">login</span>
                        Войти через сайт (Авто)
                    </button>
                    <p className="text-blue-400/60 text-[11px] mt-2 italic">Сессия подхватится автоматически из браузера.</p>
                </div>

                <div className="flex items-center gap-4 text-[var(--text-muted)] text-[10px] tracking-widest">
                    <div className="h-px bg-[var(--border)] flex-1"></div>
                    <span>АККАУНТ</span>
                    <div className="h-px bg-[var(--border)] flex-1"></div>
                </div>

                <div>
                    <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Токен (Cookie)</label>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type={showToken ? "text" : "password"}
                                value={inputToken}
                                onChange={(e) => setInputToken(e.target.value)}
                                placeholder="user_token=..."
                                className="w-full h-11 bg-[var(--bg-dark)] border border-[var(--border)] rounded-xl px-4 text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                            />
                            <button
                                onClick={() => setShowToken(!showToken)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                                type="button"
                            >
                                <span className="material-symbols-rounded text-lg">{showToken ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                        <button onClick={handleSaveToken} className="w-11 h-11 flex items-center justify-center bg-[var(--bg-dark)] hover:bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl transition text-[var(--text-main)] shrink-0">
                            <span className="material-symbols-rounded">save</span>
                        </button>
                    </div>
                </div>

                {user && (
                    <div className="bg-[var(--bg-dark)] rounded-xl p-3 border border-[var(--border)] space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[var(--text-muted)]">Username</span>
                            <div className="flex items-center gap-2">
                                <span className="font-medium font-mono text-[var(--text-main)]">{showUsername ? user.username : maskValue(user.username)}</span>
                                <button onClick={() => setShowUsername(!showUsername)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                                    <span className="material-symbols-rounded text-lg">{showUsername ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[var(--text-muted)]">IP</span>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-[var(--text-muted)] font-mono">{showIP ? user.ip : maskValue(user.ip)}</span>
                                <button onClick={() => setShowIP(!showIP)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                                    <span className="material-symbols-rounded text-lg">{showIP ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {user && (
                    <div className="pb-2">
                        <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Сменить никнейм</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Новый ник..."
                                className="flex-1 h-11 bg-[var(--bg-dark)] border border-[var(--border)] rounded-xl px-4 text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
                            />
                            <button onClick={handleChangeName} className="px-5 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition shadow-lg shadow-blue-900/20 text-sm">
                                Сменить
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileView;

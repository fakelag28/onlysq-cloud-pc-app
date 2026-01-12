import React from 'react';
import { motion } from 'framer-motion';

const Sidebar = ({ currentTab, setTab, user, theme, setTheme }) => {

    const navItems = [
        { id: 'files', icon: 'folder', label: 'Мои файлы' },
        { id: 'music', icon: 'library_music', label: 'Аудио' },
        { id: 'upload', icon: 'cloud_upload', label: 'Загрузить' },
        { id: 'profile', icon: 'person', label: 'Профиль' },
    ];

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <aside className="w-72 bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col p-6 z-20 title-bar-drag transition-colors duration-300">

            <div className="flex items-center gap-3 mb-10 pl-2">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"></path>
                </svg>
                <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-main)] to-[var(--text-muted)]">OnlySQ Cloud</span>
            </div>


            <nav className="flex-1 flex flex-col gap-2 no-drag">
                {navItems.map((item) => {
                    const isActive = currentTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            className={`
                                relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group
                                ${isActive ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'}
                            `}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-blue-600/10 border border-blue-500/20 rounded-xl"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className={`material-symbols-rounded text-2xl relative z-10 transition-colors ${isActive ? 'text-blue-400' : 'group-hover:text-blue-400'}`}>
                                {item.icon}
                            </span>
                            <span className="font-medium relative z-10">{item.label}</span>
                        </button>
                    )
                })}
            </nav>


            <div className="mt-auto flex flex-col gap-4 no-drag">
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-all"
                >
                    <span className="material-symbols-rounded text-xl text-amber-400">
                        {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                    </span>
                    <span className="text-sm font-medium">{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
                </button>

                <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] flex items-center gap-4 hover:bg-[var(--bg-hover)] transition cursor-default">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
                        <span className="material-symbols-rounded text-white">person</span>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-sm truncate">{user ? user.username : 'Гость'}</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

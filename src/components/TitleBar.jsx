import React, { useState, useEffect } from 'react';

const TitleBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    const handleMaximize = () => {
        window.api.maximize();

        setIsMaximized(!isMaximized);
    };

    return (
        <div className="h-10 w-full flex items-center justify-between px-4 bg-[var(--bg-sidebar)]/80 backdrop-blur-md border-b border-[var(--border)] title-bar-drag select-none z-50 transition-colors">

            <div className="flex-1 font-medium text-xs text-[var(--text-muted)] uppercase tracking-widest pl-2">Unofficial OnlySQ Cloud PC App</div>


            <div className="flex items-center gap-1 no-drag">

                <button
                    onClick={() => window.api.toggleDevTools()}
                    title="Toggle Developer Tools"
                    className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors group"
                >
                    <span className="material-symbols-rounded text-[16px]">terminal</span>
                </button>


                <button
                    onClick={() => window.api.reload()}
                    title="Reload App"
                    className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                >
                    <span className="material-symbols-rounded text-[16px]">refresh</span>
                </button>

                <div className="w-px h-4 bg-[var(--border)] mx-2"></div>

                <button
                    onClick={() => window.api.minimize()}
                    className="w-10 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                >
                    <span className="material-symbols-rounded text-[18px]">minimize</span>
                </button>


                <button
                    onClick={handleMaximize}
                    className="w-10 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                >
                    <span className="material-symbols-rounded text-[18px]">{isMaximized ? 'filter_none' : 'crop_square'}</span>
                </button>


                <button
                    onClick={() => window.api.close()}
                    className="w-10 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-red-500 rounded-lg transition-colors group"
                >
                    <span className="material-symbols-rounded text-[18px] group-hover:text-white">close</span>
                </button>
            </div>
        </div>
    );
};

export default TitleBar;

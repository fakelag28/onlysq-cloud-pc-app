import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import FilesView from './components/FilesView';
import UploadView from './components/UploadView';
import ProfileView from './components/ProfileView';
import MusicView from './components/MusicView';
import Toast from './components/Toast';
import TitleBar from './components/TitleBar';

const App = () => {
    const [currentTab, setCurrentTab] = useState('files');
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('user_token'));
    const [toast, setToast] = useState(null);
    const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('app_theme', theme);
    }, [theme]);


    const apiCall = async (endpoint, method = 'GET', body = null) => {
        if (!token) return null;
        try {
            const headers = { 'cookie': `user_token=${token}` };
            if (body && typeof body === 'string' && !body.startsWith('----')) {
                headers['Content-Type'] = 'application/json';
            }

            const res = await window.api.request({
                url: `https://cloud.onlysq.ru${endpoint}`,
                method,
                headers,
                body
            });
            return res;
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    const showToast = (msg, type = 'info') => {
        setToast({ message: msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const checkAuth = async () => {
        if (!token) return;
        const res = await apiCall('/api/me');
        if (res && res.data && res.data.ok) {
            setUser(res.data);
        } else {
            setUser(null);
        }
    };

    useEffect(() => {
        if (token) {
            localStorage.setItem('user_token', token);
            checkAuth();
        } else {
            localStorage.removeItem('user_token');
            setUser(null);
        }
    }, [token]);

    const renderContent = () => {
        switch (currentTab) {
            case 'files': return <FilesView apiCall={apiCall} showToast={showToast} token={token} />;
            case 'upload': return <UploadView apiCall={apiCall} showToast={showToast} token={token} setCurrentTab={setCurrentTab} />;
            case 'music': return <MusicView apiCall={apiCall} showToast={showToast} token={token} />;
            case 'profile': return <ProfileView apiCall={apiCall} showToast={showToast} token={token} setToken={setToken} user={user} theme={theme} setTheme={setTheme} />;
            default: return <FilesView />;
        }
    };


    useEffect(() => {
        if (!token && currentTab !== 'profile') {

        }
    }, [currentTab, token]);

    return (
        <div className="flex h-screen w-full bg-[var(--bg-dark)] text-[var(--text-main)] overflow-hidden transition-colors duration-300">
            <Sidebar currentTab={currentTab} setTab={setCurrentTab} user={user} theme={theme} setTheme={setTheme} />

            <main className="flex-1 flex flex-col relative h-full">
                <TitleBar />

                <div className="flex-1 overflow-hidden relative p-8 pt-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                        >
                            {currentTab === 'profile' ?
                                <ProfileView apiCall={apiCall} showToast={showToast} token={token} setToken={setToken} user={user} theme={theme} setTheme={setTheme} />
                                : renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} />}
            </AnimatePresence>
        </div>
    );
};

export default App;

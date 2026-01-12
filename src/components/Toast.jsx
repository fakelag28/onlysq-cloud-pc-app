import React, { useState } from 'react';

const Toast = ({ message, type }) => {
    const colors = {
        success: 'bg-green-500/10 border-green-500/20 text-green-400',
        error: 'bg-red-500/10 border-red-500/20 text-red-400',
        info: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
    };

    return (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 z-50 animate-bounce-in ${colors[type] || colors.info}`}>
            <span className="material-symbols-rounded">
                {type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
            </span>
            <span className="font-medium">{message}</span>
        </div>
    );
};

export default Toast;

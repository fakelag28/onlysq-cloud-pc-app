import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MusicView = ({ apiCall, showToast, token }) => {
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.15);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [repeatMode, setRepeatMode] = useState('none');
    const [isShuffle, setIsShuffle] = useState(false);
    const [audioBlobUrl, setAudioBlobUrl] = useState(null);
    const [isBuffering, setIsBuffering] = useState(false);

    const audioRef = useRef(null);

    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];

    const playlist = useMemo(() => {
        return files.filter(f => audioExts.includes(f.name.split('.').pop().toLowerCase()));
    }, [files]);

    const loadFiles = useCallback(async () => {
        setIsLoading(true);
        const res = await apiCall('/api/files');
        if (res && res.data && Array.isArray(res.data)) {
            setFiles(res.data);
        }
        setIsLoading(false);
    }, [apiCall]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    const currentTrack = playlist[currentTrackIndex] || null;

    useEffect(() => {
        if (!currentTrack) {
            if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
            setAudioBlobUrl(null);
            return;
        }

        const loadTrack = async () => {
            setIsBuffering(true);
            if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);

            try {
                const res = await window.api.fetchBlob({
                    url: `https://cloud.onlysq.ru/file/${currentTrack.id}?mode=view`,
                    headers: { 'cookie': `user_token=${token}` }
                });

                if (res && res.ok && res.data) {
                    const blob = new Blob([res.data], { type: res.contentType || 'audio/mpeg' });
                    const url = URL.createObjectURL(blob);
                    setAudioBlobUrl(url);
                } else {
                    throw new Error(res?.error || "Failed to fetch blob");
                }
            } catch (e) {
                console.error("Audio preload error", e);
                showToast("Ошибка загрузки трека", "error");
            }
            setIsBuffering(false);
        };

        loadTrack();


    }, [currentTrack?.id, token]);

    useEffect(() => {
        return () => {
            if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
        };
    }, [audioBlobUrl]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const handlePlayPause = () => {
        if (!currentTrack && playlist.length > 0) {
            setCurrentTrackIndex(0);
            setIsPlaying(true);
            return;
        }
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleNext = () => {
        if (playlist.length === 0) return;
        let nextIndex;
        if (isShuffle) {
            nextIndex = Math.floor(Math.random() * playlist.length);
        } else {
            nextIndex = (currentTrackIndex + 1) % playlist.length;
        }
        setCurrentTrackIndex(nextIndex);
        setIsPlaying(true);
    };

    const handlePrev = () => {
        if (playlist.length === 0) return;
        let prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        setCurrentTrackIndex(prevIndex);
        setIsPlaying(true);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        if (repeatMode === 'one') {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        } else if (repeatMode === 'all' || currentTrackIndex < playlist.length - 1 || isShuffle) {
            handleNext();
        } else {
            setIsPlaying(false);
        }
    };

    const formatTime = (time) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e) => {
        const val = parseFloat(e.target.value);
        setCurrentTime(val);
        if (audioRef.current) {
            audioRef.current.currentTime = val;
        }
    };


    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        if (currentTrack && 'MediaMetadata' in window) {
            navigator.mediaSession.metadata = new window.MediaMetadata({
                title: currentTrack.name,
                artist: 'OnlySQ Cloud',
                album: 'Cloud Audio',
                artwork: [
                    { src: 'assets/icon.png', sizes: '512x512', type: 'image/png' }
                ]
            });
        }

        const actions = {
            play: handlePlayPause,
            pause: handlePlayPause,
            previoustrack: handlePrev,
            nexttrack: handleNext,
            seekto: (details) => {
                if (audioRef.current && details.seekTime !== undefined) {
                    audioRef.current.currentTime = details.seekTime;
                }
            }
        };

        Object.entries(actions).forEach(([action, handler]) => {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch (e) { }
        });

        return () => {
            Object.keys(actions).forEach(action => {
                try {
                    navigator.mediaSession.setActionHandler(action, null);
                } catch (e) { }
            });
        };
    }, [currentTrack, handlePlayPause, handleNext, handlePrev]);

    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

        if (audioRef.current && !isNaN(audioRef.current.duration)) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: audioRef.current.duration,
                    playbackRate: audioRef.current.playbackRate,
                    position: audioRef.current.currentTime
                });
            } catch (e) { }
        }
    }, [isPlaying, currentTime, duration]);

    return (
        <div className="h-full flex flex-col gap-6 overflow-hidden">

            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold">Аудио плеер</h2>
                    <p className="text-[var(--text-muted)] text-sm mt-1">{playlist.length} аудио файлов найдено</p>
                </div>
                <button
                    onClick={loadFiles}
                    className="p-3 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] rounded-xl transition text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    title="Обновить"
                >
                    <span className="material-symbols-rounded">refresh</span>
                </button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-8">

                <div className="flex-1 min-h-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-hover)] flex items-center gap-4">
                        <span className="material-symbols-rounded text-blue-400">queue_music</span>
                        <span className="font-semibold">Список воспроизведения</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : playlist.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-4">
                                <span className="material-symbols-rounded text-5xl opacity-20">library_music</span>
                                <p>Аудиофайлы не найдены</p>
                            </div>
                        ) : (
                            playlist.map((track, index) => (
                                <button
                                    key={track.id}
                                    onClick={() => {
                                        setCurrentTrackIndex(index);
                                        setIsPlaying(true);
                                    }}
                                    className={`
                                        w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300
                                        ${currentTrackIndex === index ? 'bg-blue-600/20 border border-blue-500/20' : 'hover:bg-[var(--bg-hover)] border border-transparent'}
                                    `}
                                >
                                    <div className={`
                                        w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                                        ${currentTrackIndex === index ? 'bg-blue-500/30 text-blue-400' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'}
                                    `}>
                                        <span className="material-symbols-rounded">
                                            {currentTrackIndex === index && isPlaying ? 'pause' : 'play_arrow'}
                                        </span>
                                    </div>
                                    <div className="flex-1 text-left min-w-0 py-1">
                                        <p className={`font-medium break-all line-clamp-2 leading-tight ${currentTrackIndex === index ? 'text-blue-400' : 'text-[var(--text-main)]'}`}>
                                            {track.name}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-wider">{track.size}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>


                <div className="w-full lg:w-[400px] bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 flex flex-col items-center justify-center shrink-0 shadow-2xl relative overflow-hidden group">

                    <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-600/20 transition-colors" />
                    <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-600/20 transition-colors" />

                    <div className="w-full h-full flex flex-col items-center justify-between gap-8 z-10">

                        <div className="relative">
                            <motion.div
                                initial={{ rotate: 0 }}
                                className={`
                                    w-56 h-56 rounded-[3rem] bg-gradient-to-br from-blue-500/20 to-purple-600/20 
                                    flex items-center justify-center border border-[var(--border)] shadow-3xl
                                    relative
                                `}
                            >
                                <span className="material-symbols-rounded text-8xl text-blue-400 opacity-50">music_note</span>

                                {isBuffering && (
                                    <div className="absolute inset-0 bg-black/40 rounded-[3rem] flex items-center justify-center backdrop-blur-sm">
                                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </motion.div>


                            <AnimatePresence>
                                {isPlaying && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-1 h-12"
                                    >
                                        {[...Array(12)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className="w-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                                animate={{
                                                    height: isPlaying ? [10, 30, 20, 45, 15, 35, 10] : 4
                                                }}
                                                transition={{
                                                    duration: 1 + (i * 0.1),
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                    delay: i * 0.05
                                                }}
                                            />
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>


                        <div className="text-center w-full">
                            <h3 className="text-xl font-bold truncate px-4">
                                {currentTrack ? currentTrack.name : 'Выберите трек'}
                            </h3>
                            <p className="text-blue-400/60 text-sm mt-1 uppercase tracking-widest font-semibold">
                                {currentTrack ? 'Играет сейчас' : 'Плеер готов'}
                            </p>
                        </div>


                        <div className="w-full space-y-6">

                            <div className="space-y-2">
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 0}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="w-full accent-blue-500 h-1.5 bg-[var(--bg-hover)] rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono tracking-tighter">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>


                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setIsShuffle(!isShuffle)}
                                    className={`p-2 transition-colors ${isShuffle ? 'text-blue-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                >
                                    <span className="material-symbols-rounded">shuffle</span>
                                </button>

                                <div className="flex items-center gap-6">
                                    <button onClick={handlePrev} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                                        <span className="material-symbols-rounded text-3xl">skip_previous</span>
                                    </button>

                                    <button
                                        onClick={handlePlayPause}
                                        className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/40 hover:bg-blue-500 hover:scale-110 active:scale-95 transition-all duration-300"
                                    >
                                        <span className="material-symbols-rounded text-3xl text-white">
                                            {isPlaying ? 'pause' : 'play_arrow'}
                                        </span>
                                    </button>

                                    <button onClick={handleNext} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                                        <span className="material-symbols-rounded text-3xl">skip_next</span>
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        if (repeatMode === 'none') setRepeatMode('all');
                                        else if (repeatMode === 'all') setRepeatMode('one');
                                        else setRepeatMode('none');
                                    }}
                                    className={`p-2 transition-colors ${repeatMode !== 'none' ? 'text-blue-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'} relative`}
                                >
                                    <span className="material-symbols-rounded">
                                        {repeatMode === 'one' ? 'repeat_one' : 'repeat'}
                                    </span>
                                    {repeatMode !== 'none' && <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />}
                                </button>
                            </div>


                            <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-sidebar)] rounded-2xl border border-[var(--border)] group/vol">
                                <span className="material-symbols-rounded text-[var(--text-muted)] group-hover/vol:text-blue-400 transition-colors">
                                    {volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                                </span>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="flex-1 accent-blue-500 h-1 bg-[var(--bg-hover)] rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>


                        <audio
                            ref={audioRef}
                            src={audioBlobUrl}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={handleEnded}
                            autoPlay={isPlaying}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MusicView;

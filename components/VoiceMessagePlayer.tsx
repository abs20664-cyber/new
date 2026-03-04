import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessagePlayerProps {
    src: string;
    duration?: number;
    isMe: boolean;
}

const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({ src, duration: initialDuration, isMe }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(initialDuration || 0);
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => setIsPlaying(false);
        const handleLoadedMetadata = () => {
            if (!initialDuration) setDuration(audio.duration);
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [initialDuration]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;
        const time = Number(e.target.value);
        audio.currentTime = time;
        setCurrentTime(time);
    };

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl min-w-[240px] max-w-[320px] transition-all ${isMe ? 'bg-white/20 backdrop-blur-sm border border-white/10' : 'bg-institutional-100 dark:bg-institutional-800 border border-institutional-200 dark:border-institutional-700'}`}>
            <button 
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95 ${isMe ? 'bg-white text-primary hover:bg-white/90' : 'bg-primary text-white hover:bg-primary-hover'}`}
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
            </button>
            
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <input
                    ref={progressRef}
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className={`w-full h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${isMe ? 'bg-white/30' : 'bg-institutional-300 dark:bg-institutional-600'}`}
                    style={{
                        backgroundSize: `${(currentTime / (duration || 1)) * 100}% 100%`,
                        backgroundImage: isMe 
                            ? `linear-gradient(white, white)` 
                            : `linear-gradient(var(--color-primary), var(--color-primary))`,
                        backgroundRepeat: 'no-repeat'
                    }}
                />
                <div className={`flex justify-between text-[10px] font-bold tracking-wider uppercase ${isMe ? 'text-white/90' : 'text-institutional-500 dark:text-institutional-400'}`}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
            
            <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
        </div>
    );
};

export default VoiceMessagePlayer;

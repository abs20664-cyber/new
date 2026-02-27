import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
    const dimensions = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-14 h-14',
        xl: 'w-20 h-20'
    };

    const iconSizes = {
        sm: 16,
        md: 24,
        lg: 28,
        xl: 40
    };

    const d = dimensions[size];
    const s = iconSizes[size];

    return (
        <motion.div 
            className={`bg-gradient-to-br from-primary to-[#004d26] rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 relative overflow-hidden shrink-0 ${d} ${className}`}
            animate={{ 
                y: [0, -4, 0],
                rotate: [0, 2, -2, 0]
            }}
            transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
            }}
        >
            <motion.div 
                className="absolute top-0 right-0 w-full h-full bg-white/10 rounded-bl-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: 'top right' }}
            />
            <motion.div 
                className="absolute bottom-0 left-0 w-3/4 h-3/4 bg-algeria-red/20 rounded-tr-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                style={{ transformOrigin: 'bottom left' }}
            />
            <motion.svg 
                width={s} 
                height={s} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="relative z-10"
                animate={{ 
                    y: [0, -2, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </motion.svg>
        </motion.div>
    );
};

export default Logo;

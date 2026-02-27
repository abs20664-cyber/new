import React, { createContext, useContext, useState, useEffect } from 'react';

const PlatformContext = createContext<{ isMobile: boolean }>({ isMobile: false });

export const usePlatform = () => useContext(PlatformContext);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        document.body.classList.add('is-mobile');
        document.body.classList.remove('is-desktop');
      } else {
        document.body.classList.add('is-desktop');
        document.body.classList.remove('is-mobile');
      }
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <PlatformContext.Provider value={{ isMobile }}>
      {children}
    </PlatformContext.Provider>
  );
};

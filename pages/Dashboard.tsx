import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlatform } from '../contexts/PlatformContext';
import Classes from './Classes';
import QRIdentity from './QRIdentity';
import AdminRegistry from './AdminRegistry';
import EconomicDashboard from './EconomicDashboard';

interface DashboardProps {
    onNavigate: (path: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const { user } = useAuth();
    const { isMobile } = usePlatform();
    
    if (user?.role === 'admin') {
        return <AdminRegistry />;
    }

    if (user?.role === 'economic') {
        return <EconomicDashboard />;
    }
    
    if (user?.role === 'teacher') {
        return (
            <div className={isMobile ? 'pb-10' : ''}>
                <Classes onNavigate={onNavigate} />
            </div>
        );
    }
    
    return <QRIdentity />;
};

export default Dashboard;
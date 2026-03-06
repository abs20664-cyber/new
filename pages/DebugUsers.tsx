import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { User } from '../types';

const DebugUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const snap = await getDocs(collection(db, collections.users));
                const users = snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
                setUsers(users);
            } catch (e) { console.error("Failed to load users", e); }
        };
        fetchUsers();
    }, []);

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-5">Users in Database</h1>
            <pre>{JSON.stringify(users, null, 2)}</pre>
        </div>
    );
};

export default DebugUsers;

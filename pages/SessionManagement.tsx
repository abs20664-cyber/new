import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, doc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { User, StudentTeacherAssignment, SessionTemplate } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SessionManagement: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [assignments, setAssignments] = useState<StudentTeacherAssignment[]>([]);
    const [templates, setTemplates] = useState<SessionTemplate[]>([]);

    useEffect(() => {
        if (user?.role !== 'economic') {
            navigate('/');
            return;
        }

        const unsubUsers = onSnapshot(collection(db, collections.users), (snap) => {
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
        });

        const unsubAssignments = onSnapshot(collection(db, collections.studentTeacherAssignments), (snap) => {
            setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentTeacherAssignment)));
        });

        const unsubTemplates = onSnapshot(collection(db, collections.sessionTemplates), (snap) => {
            setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as SessionTemplate)));
        });

        return () => { unsubUsers(); unsubAssignments(); unsubTemplates(); };
    }, [user?.role, navigate]);

    const assignStudent = async (studentId: string, teacherId: string) => {
        await addDoc(collection(db, collections.studentTeacherAssignments), { studentId, teacherId });
    };

    const createTemplate = async (teacherId: string, dayOfWeek: number, startTime: string, endTime: string) => {
        await addDoc(collection(db, collections.sessionTemplates), {
            teacherId, dayOfWeek, startTime, endTime, startDate: new Date()
        });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Session Management</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Assign Students to Teachers</h2>
                    <div className="space-y-4">
                        <select className="w-full p-2 border rounded" id="studentSelect">
                            <option value="">Select Student</option>
                            {users.filter(u => u.role === 'student').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select className="w-full p-2 border rounded" id="teacherSelect">
                            <option value="">Select Teacher</option>
                            {users.filter(u => u.role === 'teacher').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button 
                            className="w-full bg-primary text-white p-2 rounded"
                            onClick={() => {
                                const studentId = (document.getElementById('studentSelect') as HTMLSelectElement).value;
                                const teacherId = (document.getElementById('teacherSelect') as HTMLSelectElement).value;
                                if (studentId && teacherId) assignStudent(studentId, teacherId);
                            }}
                        >
                            Assign
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Create Session Template</h2>
                    <div className="space-y-4">
                        <select className="w-full p-2 border rounded" id="teacherTemplateSelect">
                            <option value="">Select Teacher</option>
                            {users.filter(u => u.role === 'teacher').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <input type="number" placeholder="Day of week (0-6)" className="w-full p-2 border rounded" id="dayOfWeek" />
                        <input type="time" className="w-full p-2 border rounded" id="startTime" />
                        <input type="time" className="w-full p-2 border rounded" id="endTime" />
                        <button 
                            className="w-full bg-primary text-white p-2 rounded"
                            onClick={() => {
                                const teacherId = (document.getElementById('teacherTemplateSelect') as HTMLSelectElement).value;
                                const dayOfWeek = parseInt((document.getElementById('dayOfWeek') as HTMLInputElement).value);
                                const startTime = (document.getElementById('startTime') as HTMLInputElement).value;
                                const endTime = (document.getElementById('endTime') as HTMLInputElement).value;
                                if (teacherId && !isNaN(dayOfWeek) && startTime && endTime) createTemplate(teacherId, dayOfWeek, startTime, endTime);
                            }}
                        >
                            Create Template
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionManagement;

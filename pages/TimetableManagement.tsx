import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { RecurringSession, DAYS_OF_WEEK, HOURS_OF_DAY } from '../types';

export default function TimetableManagement() {
    const [recurringSessions, setRecurringSessions] = useState<RecurringSession[]>([]);
    const [editingSession, setEditingSession] = useState<RecurringSession | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'recurring_sessions'), (snap) => {
            setRecurringSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecurringSession)));
        });
        return () => unsub();
    }, []);

    const getSessionForSlot = (day: string, hour: string) => {
        return recurringSessions.find(s => 
            s.dayOfWeek === day && 
            s.startTime.startsWith(hour.split(':')[0]) // Simple check for the hour
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
            <h3 className="text-xl font-black uppercase tracking-tight text-institutional-900 dark:text-white mb-6">Manage Timetable</h3>
            
            {/* Visual Timetable */}
            <div className="mb-8 overflow-x-auto">
                <h4 className="font-bold mb-4">Visual Timetable</h4>
                <table className="w-full border-collapse bg-surface dark:bg-institutional-900 rounded-2xl overflow-hidden border border-institutional-200 dark:border-institutional-800 shadow-soft">
                    <thead>
                        <tr className="bg-institutional-50 dark:bg-institutional-800">
                            <th className="p-3 text-left text-xs font-bold text-institutional-600 dark:text-institutional-300">Day / Hour</th>
                            {HOURS_OF_DAY.map(hour => (
                                <th key={hour} className="p-3 text-center text-xs font-bold text-institutional-600 dark:text-institutional-300">{hour}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS_OF_WEEK.map(day => (
                            <tr key={day} className="border-t border-institutional-100 dark:border-institutional-800">
                                <td className="p-3 text-xs font-bold text-primary">{day}</td>
                                {HOURS_OF_DAY.map(hour => {
                                    const session = getSessionForSlot(day, hour);
                                    return (
                                        <td key={hour} className="p-1 border-l border-institutional-100 dark:border-institutional-800 text-center">
                                            {session ? (
                                                <div className="text-[10px] p-1 bg-primary/10 text-primary rounded font-bold truncate" title={`${session.name} (${session.room})`}>
                                                    {session.name}
                                                </div>
                                            ) : (
                                                <span className="text-institutional-200">-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <form key={editingSession?.id || 'new'} onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const sessionData = {
                    name: fd.get('name'),
                    dayOfWeek: fd.get('dayOfWeek'),
                    startTime: fd.get('startTime'),
                    endTime: fd.get('endTime'),
                    room: fd.get('room'),
                    type: fd.get('type')
                };
                if (editingSession) {
                    await updateDoc(doc(db, 'recurring_sessions', editingSession.id), sessionData);
                    setEditingSession(null);
                } else {
                    await addDoc(collection(db, 'recurring_sessions'), sessionData);
                }
                e.currentTarget.reset();
            }} className="bg-surface dark:bg-institutional-900 p-6 rounded-2xl border border-institutional-200 dark:border-institutional-800 shadow-soft mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input name="name" placeholder="Session Name" defaultValue={editingSession?.name || ''} className="p-3 border rounded-xl bg-surface dark:bg-institutional-800" required />
                    <select name="dayOfWeek" defaultValue={editingSession?.dayOfWeek || 'Monday'} className="p-3 border rounded-xl bg-surface dark:bg-institutional-800" required>
                        {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input name="startTime" type="time" defaultValue={editingSession?.startTime || ''} className="p-3 border rounded-xl bg-surface dark:bg-institutional-800" required />
                    <input name="endTime" type="time" defaultValue={editingSession?.endTime || ''} className="p-3 border rounded-xl bg-surface dark:bg-institutional-800" required />
                    <input name="room" placeholder="Room" defaultValue={editingSession?.room || ''} className="p-3 border rounded-xl bg-surface dark:bg-institutional-800" required />
                    <select name="type" defaultValue={editingSession?.type || 'Cours'} className="p-3 border rounded-xl bg-surface dark:bg-institutional-800" required>
                        <option value="Cours">Cours</option>
                        <option value="TD">TD</option>
                        <option value="Exam">Exam</option>
                    </select>
                </div>
                <div className="flex gap-2 mt-4">
                    <button type="submit" className="px-6 py-3 bg-primary text-white rounded-xl font-bold">{editingSession ? 'Update Session' : 'Add Session'}</button>
                    {editingSession && <button type="button" onClick={() => { setEditingSession(null); }} className="px-6 py-3 bg-institutional-200 text-institutional-900 rounded-xl font-bold">Cancel</button>}
                </div>
            </form>
            <div className="bg-surface dark:bg-institutional-900 p-6 rounded-2xl border border-institutional-200 dark:border-institutional-800 shadow-soft">
                <h4 className="font-bold mb-4">Current Timetable</h4>
                {recurringSessions.map(s => (
                    <div key={s.id} className="flex justify-between p-3 border-b border-institutional-100 dark:border-institutional-800">
                        <span>{s.name} - {s.dayOfWeek} {s.startTime}-{s.endTime} ({s.room})</span>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingSession(s)} className="text-primary">Edit</button>
                            <button onClick={async () => await deleteDoc(doc(db, 'recurring_sessions', s.id))} className="text-danger">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

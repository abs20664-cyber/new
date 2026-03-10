import React, { useState } from 'react';
import { X } from 'lucide-react';
import { DAYS_OF_WEEK, HOURS_OF_DAY, RecurringSession } from '../types';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface RecurringSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: any[];
}

const RecurringSessionModal: React.FC<RecurringSessionModalProps> = ({ isOpen, onClose, teachers }) => {
  const [dayOfWeek, setDayOfWeek] = useState(DAYS_OF_WEEK[0]);
  const [startTime, setStartTime] = useState(HOURS_OF_DAY[0]);
  const [endTime, setEndTime] = useState(HOURS_OF_DAY[1]);
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [type, setType] = useState<'Cours' | 'TD' | 'Exam'>('Cours');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'recurring_sessions'), {
      dayOfWeek,
      startTime,
      endTime,
      teacherId,
      name,
      room,
      type
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Add Recurring Session</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Session Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded" required />
          <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="w-full p-2 border rounded">
            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{day}</option>)}
          </select>
          <div className="flex gap-2">
            <select value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 border rounded">
              {HOURS_OF_DAY.map(time => <option key={time} value={time}>{time}</option>)}
            </select>
            <select value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 border rounded">
              {HOURS_OF_DAY.map(time => <option key={time} value={time}>{time}</option>)}
            </select>
          </div>
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="w-full p-2 border rounded" required>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="text" placeholder="Room" value={room} onChange={e => setRoom(e.target.value)} className="w-full p-2 border rounded" required />
          <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2 border rounded">
            <option value="Cours">Cours</option>
            <option value="TD">TD</option>
            <option value="Exam">Exam</option>
          </select>
          <button type="submit" className="w-full bg-primary text-white p-2 rounded">Add Session</button>
        </form>
      </div>
    </div>
  );
};

export default RecurringSessionModal;

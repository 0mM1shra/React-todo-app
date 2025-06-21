import React, { useState, useEffect } from 'react';
import './App.css';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthForm from './AuthForm';

const getRandomColor = () => {
  const colors = ['#fbbc04', '#34a853', '#4285f4', '#e91e63', '#9c27b0', '#00acc1'];
  return colors[Math.floor(Math.random() * colors.length)];
};

function App() {
  const [user, setUser] = useState(undefined);
  const [tasks, setTasks] = useState([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [time, setTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'tasks'));
      const fetchedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(fetchedTasks);
    };
    fetchTasks();
  }, [user]);

  const addTask = async () => {
    if (!user) return;
    const formattedDate = selectedDate.toLocaleDateString('en-GB');
    const newTask = {
      title: '',
      description: '',
      completed: false,
      editing: true,
      color: getRandomColor(),
      date: formattedDate,
    };
    const docRef = await addDoc(collection(db, 'users', user.uid, 'tasks'), newTask);
    setTasks([{ ...newTask, id: docRef.id }, ...tasks]);
  };

  const saveTask = async (id, title, description) => {
    if (!user) return;
    const taskRef = doc(db, 'users', user.uid, 'tasks', id);
    await updateDoc(taskRef, { title, description, editing: false });
    setTasks(tasks.map(t => (t.id === id ? { ...t, title, description, editing: false } : t)));
  };

  const deleteTask = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'tasks', id));
    setTasks(tasks.filter(task => task.id !== id));
  };

  const toggleEdit = (id) => {
    setTasks(tasks.map(task => task.id === id ? { ...task, editing: true } : task));
  };

  const toggleCompletion = async (id) => {
    if (!user) return;
    const task = tasks.find(t => t.id === id);
    const taskRef = doc(db, 'users', user.uid, 'tasks', id);
    await updateDoc(taskRef, { completed: !task.completed });
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const toggleDescription = (id) => {
    setExpandedDescriptions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]} / ${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return {
      timeStr: `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`,
      ampm,
    };
  };

  const getDateLabel = (date) => {
    const today = new Date();
    const selected = new Date(date);
    const diffTime = selected.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays > 1) return `in ${diffDays} days`;
    return date.toLocaleDateString('en-GB');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const generateCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const daysArray = [];

    for (let i = 0; i < firstDay; i++) daysArray.push(null);
    for (let d = 1; d <= totalDays; d++) daysArray.push(new Date(year, month, d));

    return daysArray;
  };

  const { timeStr, ampm } = formatTime(time);
  const calendarDays = generateCalendar();
  const tasksForSelectedDate = tasks.filter(task => task.date === selectedDate.toLocaleDateString('en-GB'));

  if (user === undefined) {
    return <div style={{ color: 'black', padding: '2rem' }}>Loading user...</div>;
  }

  if (!user) {
    return <AuthForm setUser={setUser} />;
  }

  return (
    <div className="app-container">
      {sidebarOpen && (
        <div className="sidebar">
          <h2>Tasks</h2>
          <ul>
            <li className="active">{selectedDate.toLocaleDateString('en-GB')}</li>
          </ul>
          <div className="calendar">
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="calendar-day">{day}</div>
              ))}
            </div>
            <div className="calendar-days">
              {calendarDays.map((date, index) => {
                const isToday =
                  date &&
                  date.getDate() === time.getDate() &&
                  date.getMonth() === time.getMonth() &&
                  date.getFullYear() === time.getFullYear();
                const isPast = date && date < new Date(new Date().setHours(0, 0, 0, 0));
                const isSelected =
                  date &&
                  selectedDate &&
                  date.toDateString() === selectedDate.toDateString();
                return (
                  <div
                    key={index}
                    className={`calendar-cell ${!date ? 'empty' : isToday ? 'today' : isPast ? 'past' : 'future'} ${isSelected ? 'selected' : ''}`}
                    onClick={() => date && setSelectedDate(date)}
                  >
                    {date?.getDate() || ''}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              <button
                className="logout-button"
                onClick={() => signOut(auth)}
                style={{
                  backgroundColor: '#1db954',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="main-panel">
        <div className="top-header">
          <div className="aurora"></div>
          <div className="hamburger" onClick={toggleSidebar}>☰</div>
          <div className="header-left">
            <h1>{getDateLabel(selectedDate)}</h1>
            <p className="date-text">{formatDate(selectedDate)}</p>
          </div>
          <div className="digital-clock">
            <span className="clock-time">{timeStr}</span>
            <span className="ampm">{ampm}</span>
          </div>
        </div>

        <div className="sticky-panel">
          <div className="sticky-notes">
            <h2 className="upcoming-heading">Upcoming Tasks</h2>
            <div className="add-new" onClick={addTask}>
              <span className="plus-icon">+</span>
            </div>

            {tasksForSelectedDate.map((task) => (
              <div key={task.id} className="sticky-note" style={{ backgroundColor: task.color }}>
                <div className="checkbox">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleCompletion(task.id)}
                  />
                </div>

                {task.editing ? (
                  <>
                    <input
                      placeholder="Add title"
                      value={task.title}
                      onChange={(e) =>
                        setTasks(tasks.map(t => t.id === task.id ? { ...t, title: e.target.value } : t))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveTask(task.id, task.title, task.description);
                        }
                      }}
                    />
                    <hr className="separator" />
                    <textarea
                      placeholder="Add description..."
                      value={task.description}
                      onChange={(e) =>
                        setTasks(tasks.map(t => t.id === task.id ? { ...t, description: e.target.value } : t))
                      }
                    />
                    <div className="actions bottom-right">
                      <button className="save" onClick={() => saveTask(task.id, task.title, task.description)}>Save</button>
                    </div>
                    <div className="actions bottom-left">
                      <svg
                        onClick={() => deleteTask(task.id)}
                        className="icon delete-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="18"
                        height="18"
                      >
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="task-date">{task.date}</p>
                    <h3 className={task.completed ? 'completed-text' : ''}>{task.title}</h3>
                    <hr className="separator" />
                    <div className="description-wrapper">
                      <p className={`description ${expandedDescriptions[task.id] ? 'expanded' : ''} ${task.completed ? 'completed-text' : ''}`}>
                        {task.description}
                      </p>
                      {task.description.length > 100 && (
                        <span className="toggle-desc" onClick={(e) => {
                          e.stopPropagation();
                          toggleDescription(task.id);
                        }}>
                          {expandedDescriptions[task.id] ? 'See less' : '...more'}
                        </span>
                      )}
                    </div>
                    <div className="actions bottom-left">
                      <svg
                        onClick={() => toggleEdit(task.id)}
                        className="icon edit-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="18"
                        height="18"
                      >
                        <path d="M3 17.25V21h3.75l11-11.03-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.41l-2.34-2.34a1.003 1.003 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                      <svg
                        onClick={() => deleteTask(task.id)}
                        className="icon delete-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="18"
                        height="18"
                      >
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

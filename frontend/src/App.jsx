import { useEffect, useState } from 'react';
import Navbar from './components/Navbar.jsx';
import StudentForm from './components/StudentForm.jsx';
import StudentList from './components/StudentList.jsx';

// Backend address comes from frontend/.env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Sends a request to the backend and returns the JSON answer.
// Throws an Error with a readable message if anything goes wrong.
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (networkError) {
    console.error('Network error:', networkError.message);
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  // Read the body as text first, then try to turn it into JSON
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Response was not valid JSON:', parseError.message);
    }
  }

  if (!response.ok) {
    throw new Error((data && data.error) || `Request failed (status ${response.status})`);
  }
  return data;
}

function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editingStudent, setEditingStudent] = useState(null);
  const [banner, setBanner] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // READ: loads all students when the page opens (and again when reloadKey changes)
  useEffect(() => {
    async function loadStudents() {
      try {
        const data = await request('/students');
        setStudents(data);
        setLoadError('');
      } catch (error) {
        setLoadError(error.message);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [reloadKey]);

  // Called by the "Try again" button when loading failed
  function handleRetry() {
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  // CREATE or UPDATE: returns an error message string, or null when it worked
  async function handleSave(formData) {
    setBanner(null);
    try {
      if (editingStudent) {
        const updated = await request(`/students/${editingStudent.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setStudents((current) =>
          current.map((student) => (student.id === updated.id ? updated : student))
        );
        setEditingStudent(null);
        setBanner({ type: 'success', text: 'Student updated successfully' });
      } else {
        const created = await request('/students', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setStudents((current) => [...current, created]);
        setBanner({ type: 'success', text: 'Student added successfully' });
      }
      return null;
    } catch (error) {
      return error.message;
    }
  }

  // Fills the form with the chosen student and scrolls up to it
  function handleEdit(student) {
    setBanner(null);
    setEditingStudent(student);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // DELETE: asks for confirmation first, then removes the student
  async function handleDelete(student) {
    const confirmed = window.confirm(`Delete ${student.name}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setBanner(null);
    setDeletingId(student.id);
    try {
      await request(`/students/${student.id}`, { method: 'DELETE' });
      setStudents((current) => current.filter((item) => item.id !== student.id));
      if (editingStudent && editingStudent.id === student.id) {
        setEditingStudent(null);
      }
      setBanner({ type: 'success', text: 'Student deleted successfully' });
    } catch (error) {
      setBanner({ type: 'error', text: error.message });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Navbar />
      <main className="container">
        {banner && (
          <div className={`banner ${banner.type}`} role="status">
            <span>{banner.text}</span>
            <button
              type="button"
              className="banner-close"
              onClick={() => setBanner(null)}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {/* The key makes React rebuild the form when we switch between add and edit */}
        <StudentForm
          key={editingStudent ? editingStudent.id : 'new'}
          editingStudent={editingStudent}
          onSave={handleSave}
          onCancel={() => setEditingStudent(null)}
        />

        <StudentList
          students={students}
          loading={loading}
          error={loadError}
          onRetry={handleRetry}
          onEdit={handleEdit}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      </main>
    </>
  );
}

export default App;
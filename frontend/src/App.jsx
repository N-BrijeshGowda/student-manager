import { useEffect, useState } from 'react';
import { request, getToken, saveToken, clearToken } from './api.js';
import LoginForm from './components/LoginForm.jsx';
import Navbar from './components/Navbar.jsx';
import StudentForm from './components/StudentForm.jsx';
import StudentList from './components/StudentList.jsx';
import VisitorDetails from './components/VisitorDetails.jsx';

// A visitor's just-added details are kept for this browser tab only
const MY_DETAILS_KEY = 'studentManagerMyDetails';

function readMyDetails() {
  try {
    const saved = sessionStorage.getItem(MY_DETAILS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function storeMyDetails(student) {
  try {
    if (student) {
      sessionStorage.setItem(MY_DETAILS_KEY, JSON.stringify(student));
    } else {
      sessionStorage.removeItem(MY_DETAILS_KEY);
    }
  } catch {
    // The details still show until the page is refreshed
  }
}

function App() {
  // Who is logged in: null for visitors, or { id, role: 'student' | 'admin', name, email }
  const [user, setUser] = useState(null);
  const [checkingLogin, setCheckingLogin] = useState(() => Boolean(getToken()));
  const [showLogin, setShowLogin] = useState(false);
  const [myDetails, setMyDetails] = useState(readMyDetails);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editingStudent, setEditingStudent] = useState(null);
  const [banner, setBanner] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const userId = user ? user.id : null;
  const userRole = user ? user.role : null;

  // When the page opens with a saved token, ask the backend who it belongs to
  useEffect(() => {
    if (!getToken()) {
      return;
    }
    let ignore = false;
    async function checkLogin() {
      try {
        const account = await request('/auth/me');
        if (!ignore) {
          setUser(account);
        }
      } catch (error) {
        if (ignore) {
          return;
        }
        if (error.status === 401) {
          clearToken();
        } else {
          setBanner({ type: 'error', text: error.message });
        }
      } finally {
        if (!ignore) {
          setCheckingLogin(false);
        }
      }
    }
    checkLogin();
    return () => {
      ignore = true;
    };
  }, []);

  // READ: loads all students once someone is logged in (and again when reloadKey changes)
  useEffect(() => {
    if (!userRole) {
      return;
    }
    let ignore = false;
    async function loadStudents() {
      setLoading(true);
      try {
        const data = await request('/students');
        if (!ignore) {
          setStudents(data);
          setLoadError('');
        }
      } catch (error) {
        if (!ignore && !handleAuthError(error)) {
          setLoadError(error.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadStudents();
    return () => {
      ignore = true;
    };
    // handleAuthError only uses state setters, so it does not need to be listed
  }, [userId, userRole, reloadKey]);

  // Forgets the login and shows the given banner message
  function logOut(message) {
    clearToken();
    setUser(null);
    setStudents([]);
    setLoading(true);
    setEditingStudent(null);
    setLoadError('');
    setBanner(message);
  }

  // If the backend says the login is no longer valid, log out and ask to log in again.
  // Returns true when the error was handled here.
  function handleAuthError(error) {
    if (error.status !== 401) {
      return false;
    }
    logOut({ type: 'error', text: error.message });
    setShowLogin(true);
    return true;
  }

  // Called by the "Try again" button when loading failed
  function handleRetry() {
    setReloadKey((current) => current + 1);
  }

  // LOGIN: returns an error message string, or null when it worked
  async function handleLogin(credentials) {
    try {
      const { token, user: account } = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      saveToken(token);
      storeMyDetails(null);
      setMyDetails(null);
      setShowLogin(false);
      setUser(account);
      setBanner({ type: 'success', text: `Welcome, ${account.name}` });
      return null;
    } catch (error) {
      return error.message;
    }
  }

  // CREATE (visitor): saves the visitor's own details without logging in
  async function handleAddMyDetails(formData) {
    setBanner(null);
    try {
      const created = await request('/students', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      storeMyDetails(created);
      setMyDetails(created);
      setBanner({ type: 'success', text: 'Your details were saved' });
      return null;
    } catch (error) {
      return error.message;
    }
  }

  // CREATE or UPDATE (logged in): returns an error message string, or null when it worked.
  // existing is the student being edited, or null to add a new one (admins only).
  async function handleSave(formData, existing) {
    setBanner(null);
    try {
      if (existing) {
        const { token, ...updated } = await request(`/students/${existing.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        // After you change your own password the old token stops working; keep the new one
        if (token) {
          saveToken(token);
        }
        setStudents((current) =>
          current.map((student) => (student.id === updated.id ? updated : student))
        );
        // Close the edit form, unless the admin already switched to another student
        setEditingStudent((current) => (current && current.id === updated.id ? null : current));
        if (userRole === 'student') {
          setUser((current) => ({ ...current, name: updated.name, email: updated.email }));
        }
        setBanner({ type: 'success', text: 'Details updated successfully' });
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
      handleAuthError(error);
      return error.message;
    }
  }

  // Fills the form with the chosen student and scrolls up to it (admins only)
  function handleEdit(student) {
    setBanner(null);
    setEditingStudent(student);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // DELETE: asks for confirmation first, then removes the student (admins only)
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
      if (!handleAuthError(error)) {
        setBanner({ type: 'error', text: error.message });
      }
    } finally {
      setDeletingId(null);
    }
  }

  // What a visitor (not logged in) sees: the add form, their saved details, or the login form
  function renderVisitorView() {
    if (showLogin) {
      return (
        <LoginForm
          initialEmail={myDetails ? myDetails.email : ''}
          onLogin={handleLogin}
          onCancel={() => setShowLogin(false)}
        />
      );
    }
    if (myDetails) {
      return (
        <VisitorDetails
          student={myDetails}
          onLoginClick={() => setShowLogin(true)}
          onClear={() => {
            storeMyDetails(null);
            setMyDetails(null);
            setBanner(null);
          }}
        />
      );
    }
    return (
      <>
        <StudentForm
          key="visitor"
          title="Add Your Details"
          submitLabel="Save My Details"
          student={null}
          passwordRequired
          passwordLabel="Password * (to log in later)"
          onSave={handleAddMyDetails}
        />
        <p className="hint">
          Already added your details?{' '}
          <button type="button" className="link-button" onClick={() => setShowLogin(true)}>
            Log in
          </button>{' '}
          to see other students and edit your details.
        </p>
      </>
    );
  }

  // What a logged-in student sees: their own editable details and the read-only list
  function renderStudentView() {
    const myRecord = students.find((student) => student.id === user.id);
    return (
      <>
        {myRecord && (
          <StudentForm
            key={myRecord.id}
            title="My Details"
            submitLabel="Update My Details"
            student={myRecord}
            passwordRequired={false}
            askCurrentPassword
            passwordLabel="New password (optional)"
            onSave={(formData) => handleSave(formData, myRecord)}
          />
        )}
        {renderList()}
      </>
    );
  }

  // What an admin sees: add/edit form for any student and the full list with actions
  function renderAdminView() {
    return (
      <>
        {/* The key makes React rebuild the form when we switch between add and edit */}
        <StudentForm
          key={editingStudent ? editingStudent.id : 'new'}
          title={editingStudent ? 'Edit Student' : 'Add Student'}
          submitLabel={editingStudent ? 'Update Student' : 'Add Student'}
          student={editingStudent}
          passwordRequired={false}
          passwordLabel={
            editingStudent ? 'New password (optional)' : 'Password (optional, lets them log in)'
          }
          onSave={(formData) => handleSave(formData, editingStudent)}
          onCancel={editingStudent ? () => setEditingStudent(null) : undefined}
        />
        {renderList()}
      </>
    );
  }

  function renderList() {
    return (
      <StudentList
        students={students}
        currentUser={user}
        loading={loading}
        error={loadError}
        onRetry={handleRetry}
        onEdit={handleEdit}
        onDelete={handleDelete}
        deletingId={deletingId}
      />
    );
  }

  function renderView() {
    if (checkingLogin) {
      return <p className="status">Checking your login...</p>;
    }
    if (!user) {
      return renderVisitorView();
    }
    return user.role === 'admin' ? renderAdminView() : renderStudentView();
  }

  return (
    <>
      <Navbar
        user={user}
        onLoginClick={checkingLogin || showLogin ? undefined : () => setShowLogin(true)}
        onLogout={() => logOut({ type: 'success', text: 'You have logged out' })}
      />
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

        {renderView()}
      </main>
    </>
  );
}

export default App;

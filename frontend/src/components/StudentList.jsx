import { useState } from 'react';

// Shows the search box and the table of students.
// Admins get Edit/Delete on every row; students only see the list, with their own row marked.
function StudentList({ students, currentUser, loading, error, onRetry, onEdit, onDelete, deletingId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const isAdmin = currentUser.role === 'admin';

  // Keep only students whose name contains the search text (ignores upper/lower case)
  const visibleStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  function isMe(student) {
    return currentUser.role === 'student' && student.id === currentUser.id;
  }

  // Decides what to show below the toolbar: loading, error, empty, or the table
  function renderBody() {
    if (loading) {
      return <p className="status">Loading students...</p>;
    }

    if (error) {
      return (
        <div className="status status-error">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Try again
          </button>
        </div>
      );
    }

    if (students.length === 0) {
      return (
        <p className="status">
          {isAdmin ? 'No students yet. Add your first student above.' : 'No students yet.'}
        </p>
      );
    }

    if (visibleStudents.length === 0) {
      return <p className="status">No students match "{searchTerm}".</p>;
    }

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Age</th>
              {isAdmin && <th>Can log in</th>}
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((student) => (
              <tr key={student.id} className={isMe(student) ? 'my-row' : undefined}>
                <td>{student.id}</td>
                <td>
                  {student.name}
                  {isMe(student) && <span className="role-badge">you</span>}
                </td>
                <td>{student.email}</td>
                <td>{student.age === null ? '-' : student.age}</td>
                {isAdmin && <td>{student.can_login ? 'Yes' : 'No'}</td>}
                {isAdmin && (
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-small btn-secondary"
                        onClick={() => onEdit(student)}
                        disabled={deletingId === student.id}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-small btn-danger"
                        onClick={() => onDelete(student)}
                        disabled={deletingId === student.id}
                      >
                        {deletingId === student.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className="card">
      <div className="list-toolbar">
        <h2>Students ({students.length})</h2>
        <input
          type="search"
          className="search-input"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          aria-label="Search students by name"
        />
      </div>
      {renderBody()}
    </section>
  );
}

export default StudentList;

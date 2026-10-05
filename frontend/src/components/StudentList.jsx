import { useState } from 'react';

// Shows the search box and the table of students
function StudentList({ students, loading, error, onRetry, onEdit, onDelete, deletingId }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Keep only students whose name contains the search text (ignores upper/lower case)
  const visibleStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

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
      return <p className="status">No students yet. Add your first student above.</p>;
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((student) => (
              <tr key={student.id}>
                <td>{student.id}</td>
                <td>{student.name}</td>
                <td>{student.email}</td>
                <td>{student.age === null ? '-' : student.age}</td>
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
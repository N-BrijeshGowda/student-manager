// Shows a visitor the details they just added, and invites them to log in
function VisitorDetails({ student, onLoginClick, onClear }) {
  return (
    <section className="card">
      <h2>Your Details</h2>

      <dl className="details">
        <dt>Name</dt>
        <dd>{student.name}</dd>
        <dt>Email</dt>
        <dd>{student.email}</dd>
        <dt>Age</dt>
        <dd>{student.age === null ? '-' : student.age}</dd>
      </dl>

      <p className="hint">
        Log in with this email and your password to see other students and edit your details.
      </p>

      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={onLoginClick}>
          Log in
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClear}>
          Not you? Add different details
        </button>
      </div>
    </section>
  );
}

export default VisitorDetails;

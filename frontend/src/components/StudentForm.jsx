import { useState } from 'react';

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 100;
const MIN_AGE = 1;
const MAX_AGE = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_VALUES = { name: '', email: '', age: '' };

// Checks the form values and returns an object of error messages (empty if all is fine)
function validate({ name, email, age }) {
  const errors = {};

  if (name.trim() === '') {
    errors.name = 'Name is required';
  } else if (name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `Name must be at most ${MAX_NAME_LENGTH} characters`;
  }

  if (email.trim() === '') {
    errors.email = 'Email is required';
  } else if (email.trim().length > MAX_EMAIL_LENGTH) {
    errors.email = `Email must be at most ${MAX_EMAIL_LENGTH} characters`;
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Enter a valid email like name@example.com';
  }

  if (age.trim() !== '') {
    const ageNumber = Number(age);
    if (!Number.isInteger(ageNumber) || ageNumber < MIN_AGE || ageNumber > MAX_AGE) {
      errors.age = `Age must be a whole number between ${MIN_AGE} and ${MAX_AGE}`;
    }
  }

  return errors;
}

// Form used for both adding a new student and editing an existing one
function StudentForm({ editingStudent, onSave, onCancel }) {
  const isEditing = Boolean(editingStudent);

  const [values, setValues] = useState(
    editingStudent
      ? {
          name: editingStudent.name,
          email: editingStudent.email,
          age: editingStudent.age === null ? '' : String(editingStudent.age),
        }
      : EMPTY_VALUES
  );
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  // Updates one field as the user types and clears that field's error
  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  // Validates, then sends the data up to App.jsx to be saved
  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    const foundErrors = validate(values);
    setErrors(foundErrors);
    if (Object.keys(foundErrors).length > 0) {
      return;
    }

    setSaving(true);
    const errorMessage = await onSave({
      name: values.name.trim(),
      email: values.email.trim(),
      age: values.age.trim() === '' ? null : Number(values.age),
    });
    setSaving(false);

    if (errorMessage) {
      setSubmitError(errorMessage);
      return;
    }
    if (!isEditing) {
      setValues(EMPTY_VALUES);
    }
  }

  return (
    <section className="card">
      <h2>{isEditing ? 'Edit Student' : 'Add Student'}</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              value={values.name}
              onChange={handleChange}
              placeholder="e.g. Asha Rao"
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <div className="field">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              placeholder="e.g. asha@mail.com"
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="field">
            <label htmlFor="age">Age (optional)</label>
            <input
              id="age"
              name="age"
              type="number"
              value={values.age}
              onChange={handleChange}
              placeholder="e.g. 21"
            />
            {errors.age && <p className="field-error">{errors.age}</p>}
          </div>
        </div>

        {submitError && <p className="form-error">{submitError}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Update Student' : 'Add Student'}
          </button>
          {isEditing && (
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

export default StudentForm;
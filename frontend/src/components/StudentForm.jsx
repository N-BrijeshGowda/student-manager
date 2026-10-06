import { useState } from 'react';

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 100;
const MIN_AGE = 1;
const MAX_AGE = 120;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignores everything after 72 bytes
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_VALUES = { name: '', email: '', age: '', password: '', currentPassword: '' };

// Checks the form values and returns an object of error messages (empty if all is fine)
function validate({ name, email, age, password, currentPassword }, passwordRequired, needsCurrentPassword) {
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

  if (password === '') {
    if (passwordRequired) {
      errors.password = 'Choose a password so you can log in later';
    }
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  } else if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    errors.password = `Password is too long (limit ${MAX_PASSWORD_BYTES} bytes; accented letters and emoji count as more than one)`;
  }

  if (needsCurrentPassword && currentPassword === '') {
    errors.currentPassword = 'Enter your current password to change your email or password';
  }

  return errors;
}

// Form used for adding a new student and for editing an existing one.
//   student          - the student being edited, or null to add a new one
//   passwordRequired - true when a password must be chosen (visitors adding themselves)
//   askCurrentPassword - true for students editing themselves: changing the email or
//                        password then needs their current password
//   passwordLabel    - label for the password field
//   onCancel         - optional; shows a Cancel button when given
function StudentForm({ title, submitLabel, student, passwordRequired, askCurrentPassword, passwordLabel, onSave, onCancel }) {
  const [values, setValues] = useState(
    student
      ? {
          name: student.name,
          email: student.email,
          age: student.age === null ? '' : String(student.age),
          password: '',
          currentPassword: '',
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

    const sensitiveChange =
      askCurrentPassword && (values.password !== '' || values.email.trim() !== student.email);
    const foundErrors = validate(values, passwordRequired, sensitiveChange);
    setErrors(foundErrors);
    if (Object.keys(foundErrors).length > 0) {
      return;
    }

    const formData = {
      name: values.name.trim(),
      email: values.email.trim(),
      age: values.age.trim() === '' ? null : Number(values.age),
    };
    // An empty password means "keep the current one" (or "no login" for admins)
    if (values.password !== '') {
      formData.password = values.password;
    }
    if (sensitiveChange) {
      formData.currentPassword = values.currentPassword;
    }

    setSaving(true);
    const errorMessage = await onSave(formData);
    setSaving(false);

    if (errorMessage) {
      setSubmitError(errorMessage);
      return;
    }
    // Never leave a password sitting in the form after saving
    setValues((current) =>
      student ? { ...current, password: '', currentPassword: '' } : EMPTY_VALUES
    );
  }

  return (
    <section className="card">
      <h2>{title}</h2>

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

          <div className="field">
            <label htmlFor="password">{passwordLabel}</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={handleChange}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          {askCurrentPassword && (
            <div className="field">
              <label htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={values.currentPassword}
                onChange={handleChange}
                placeholder="Needed to change your email or password"
              />
              {errors.currentPassword && <p className="field-error">{errors.currentPassword}</p>}
            </div>
          )}
        </div>

        {submitError && <p className="form-error">{submitError}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : submitLabel}
          </button>
          {onCancel && (
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

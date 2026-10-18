import { useState } from 'react';

const emptyQuestion = (date = '', type = 'DSA') => ({ date, type, questionContent: '', expectedOutput: '' });

export default function CodingQuestionForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  disabled = false,
  onCancel,
  compact = false,
}) {
  const [validationError, setValidationError] = useState('');

  function change(field, nextValue) {
    setValidationError('');
    onChange({ ...value, [field]: nextValue });
  }

  async function submit(event) {
    event.preventDefault();
    if (!value.date || !value.type || !value.questionContent.trim() || !value.expectedOutput.trim()) {
      setValidationError('Complete each field before saving.');
      return;
    }
    setValidationError('');
    await onSubmit({
      ...value,
      questionContent: value.questionContent.trim(),
      expectedOutput: value.expectedOutput.trim(),
    });
  }

  return <form className={`question-form ${compact ? 'question-form-compact' : ''}`} onSubmit={submit}>
    <div className="form-fields-row">
      <label className="form-field date-field">
        <span>Practice date <b aria-hidden="true">*</b></span>
        <input type="date" value={value.date} onChange={(event) => change('date', event.target.value)} required disabled={disabled} />
      </label>
      <label className="form-field type-field">
        <span>Question type <b aria-hidden="true">*</b></span>
        <select value={value.type} onChange={(event) => change('type', event.target.value)} required disabled={disabled}>
          <option value="DSA">DSA</option>
          <option value="INTERVIEW">Interview</option>
        </select>
      </label>
    </div>
    <label className="form-field">
      <span>Question content <b aria-hidden="true">*</b></span>
      <textarea value={value.questionContent} onChange={(event) => change('questionContent', event.target.value)} rows={compact ? 3 : 4} maxLength={10000} placeholder="Describe the problem or interview question..." required disabled={disabled} />
    </label>
    <label className="form-field">
      <span>Expected output <b aria-hidden="true">*</b></span>
      <textarea value={value.expectedOutput} onChange={(event) => change('expectedOutput', event.target.value)} rows={compact ? 2 : 3} maxLength={10000} placeholder="Add an example input and the expected result..." required disabled={disabled} />
    </label>
    {validationError && <p className="form-validation" role="alert">{validationError}</p>}
    <div className="form-actions">
      {onCancel && <button className="button button-secondary" type="button" onClick={onCancel} disabled={disabled}>Cancel</button>}
      <button className="button button-primary" type="submit" disabled={disabled}>
        {disabled && <span className="button-spinner" aria-hidden="true" />}{submitLabel}
      </button>
    </div>
  </form>;
}

export { emptyQuestion };

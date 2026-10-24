'use client';
import { useState } from 'react';
import { submitTakedown } from '../../features/admin/actions/takedown';

export default function TakedownForm() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (done) {
    return (
      <section className="section container">
        <div className="card" style={{ padding: 32, maxWidth: 720, margin: 'auto' }}>
          <h1>Đã tiếp nhận yêu cầu</h1>
          <p>Chúng tôi sẽ xác minh và phản hồi qua email trong thời hạn công bố.</p>
        </div>
      </section>
    );
  }

  const action = async (formData: FormData) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await submitTakedown(formData);
      setDone(true);
    } catch (failure) {
      setError((failure as Error).message || 'Chưa gửi được yêu cầu. Hãy thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section container">
      <form action={action} className="card" style={{ padding: 32, maxWidth: 720, margin: 'auto', display: 'grid', gap: 16 }}>
        <h1>Gửi yêu cầu gỡ nội dung</h1>
        <p className="muted">Dành cho chủ sở hữu quyền hoặc người được ủy quyền.</p>
        <label>
          Họ tên
          <input name="name" className="btn" style={{ width: '100%', justifyContent: 'start' }} required />
        </label>
        <label>
          Email
          <input name="email" className="btn" style={{ width: '100%', justifyContent: 'start' }} type="email" required />
        </label>
        <label>
          URL nội dung
          <input name="url" className="btn" style={{ width: '100%', justifyContent: 'start' }} type="url" required />
        </label>
        <label>
          Mô tả
          <textarea name="description" className="btn" style={{ width: '100%', height: 140, justifyContent: 'start' }} required />
        </label>
        {error && <p role="alert" className="muted">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button>
      </form>
    </section>
  );
}

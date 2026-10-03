import { MessageCircle } from 'lucide-react';
import { listComments } from '@/lib/comments';
import { submitComment } from '@/app/actions/comments';

export async function CommentSection({ storyId }: { storyId: string }) {
  const { items } = await listComments(storyId, { sort: 'new' });

  const addComment = async (formData: FormData) => {
    'use server';
    const content = formData.get('content') as string;
    if (content) {
      await submitComment(storyId, content);
    }
  };

  return (
    <section className="section">
      <h2 className="section-title flex items-center gap-2">
        <MessageCircle size={24} />
        Bình luận
      </h2>
      <div className="card p-4 sm:p-6 space-y-6">
        <form action={addComment} className="flex gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent">
            U
          </div>
          <div className="flex-1 space-y-2">
            <textarea
              name="content"
              required
              className="w-full rounded-md border border-border bg-surface p-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              rows={3}
              placeholder="Bạn nghĩ gì về truyện này? Hãy chia sẻ nhé..."
            />
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary px-6 py-2 text-sm">Gửi bình luận</button>
            </div>
          </div>
        </form>

        <div className="space-y-4 pt-4 border-t border-border">
          {items.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ của bạn!</p>
          ) : (
            items.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-surface-2 flex items-center justify-center font-bold text-accent uppercase">
                  {comment.user.name[0]}
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm">{comment.user.name}</span>
                    <span className="text-xs text-text-muted">
                      {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    {comment.status === 'pending' && (
                      <span className="text-[10px] text-warning bg-warning/10 px-2 py-0.5 rounded">Chờ duyệt</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

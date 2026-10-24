import Image from 'next/image';
import { GeneratedCover } from './GeneratedCover';
export function StoryCover({
  title,
  cover,
  id,
}: {
  title: string;
  cover?: string;
  id?: string;
}) {
  if (!cover) return <GeneratedCover title={title} index={Number(id)} />;
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-md)]">
      <Image
        src={cover}
        alt={`Bìa truyện ${title}`}
        fill
        sizes="(max-width: 640px) 40vw, 240px"
        className="object-cover"
        unoptimized
      />
    </div>
  );
}

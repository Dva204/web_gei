'use client';
import {
  useState,
  useEffect,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BadgeCheck,
  BarChart3,
  Eye,
  MousePointer2,
  Plus,
  Save,
  Settings2,
  ShoppingBag,
  Megaphone,
  Download,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { PageHeader, StatCard } from '@/features/admin/components/common/AdminUI';
import { AdCreative, formatMoney } from '@/features/advertising/components/AdCreative';
import {
  PLACEMENTS,
  PLACEMENT_IDS,
  SOURCE_NAMES,
} from '@/features/advertising/lib/defaults';
import {
  campaignConflicts,
  isCampaignLive,
  localDate,
  resolveAdvertisement,
} from '@/features/advertising/lib/rules';
import { hydrateAdvertising, newId, persistAdvertising, updateAdvertising } from '@/features/advertising/lib/store';
import { useAdvertising } from '@/features/advertising/hooks/useAdvertising';
import { can } from '@/features/admin/lib/permissions';
import { getAdminSession } from '@/features/admin/services/auth';
import type {
  AdDevice,
  AdPlacement,
  AdvertisingCampaign,
  AdvertisingConfig,
  AdvertisingRevenue,
  AdvertisingSlot,
  AffiliateProduct,
} from '@/features/advertising/types';

type Commit = (
  change: (current: AdvertisingConfig) => AdvertisingConfig,
  summary: string,
) => boolean;
const sessionSnapshot = () => {
  return getAdminSession();
};
function subscribeSession(callback: () => void) {
  window.addEventListener('admin-session', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('admin-session', callback);
    window.removeEventListener('storage', callback);
  };
}
export function AdvertisingManager({
  affiliate = false,
}: {
  affiliate?: boolean;
}) {
  const config = useAdvertising();
  const rawSession = useSyncExternalStore(
    subscribeSession,
    sessionSnapshot,
    () => null,
  );
  const user = rawSession;
  useEffect(() => {
    if (user && can(user, 'ads.manage')) void hydrateAdvertising(true).catch(() => undefined);
  }, [user]);
  if (!config)
    return <div className="admin-boot">Đang tải cấu hình quảng cáo…</div>;
  if (!user || !can(user, 'ads.manage'))
    return (
      <div className="admin-empty">
        <BadgeCheck />
        <strong>Chỉ quản trị viên được cấu hình quảng cáo.</strong>
        <Link href="/admin" className="btn">
          Về tổng quan
        </Link>
      </div>
    );
  return <AdvertisingWorkspace config={config} affiliate={affiliate} />;
}
function AdvertisingWorkspace({
  config,
  affiliate,
}: {
  config: AdvertisingConfig;
  affiliate: boolean;
}) {
  const [tab, setTab] = useState(affiliate ? 'products' : 'slots');
  const [notice, setNotice] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const commit: Commit = (change, summary) => {
    try {
      const user = getAdminSession();
      if (!user || !can(user, 'ads.manage'))
        throw new Error('Phiên hiện tại không có quyền sửa quảng cáo.');
      const next = updateAdvertising(change);
      setNotice({
        text: 'Đang đồng bộ cấu hình lên máy chủ…',
      });
      void persistAdvertising(next, summary).then(() => setNotice({ text: 'Đã lưu vào PostgreSQL. Các thiết bị sẽ nhận cấu hình mới.' })).catch((failure) => setNotice({ text: (failure as Error).message, error: true }));
      return true;
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : 'Không thể lưu.',
        error: true,
      });
      return false;
    }
  };
  const tabs = affiliate
    ? [
        { id: 'products', label: 'Sản phẩm', icon: ShoppingBag },
        { id: 'reports', label: 'Báo cáo & doanh thu', icon: BarChart3 },
      ]
    : [
        { id: 'slots', label: 'Vị trí & xem trước', icon: Eye },
        { id: 'campaigns', label: 'Booking trực tiếp', icon: Megaphone },
        { id: 'settings', label: 'Mạng ads & Premium', icon: Settings2 },
        { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
      ];
  const impressions = config.events.filter(
    (event) => event.kind === 'impression',
  ).length;
  const clicks = config.events.filter((event) => event.kind === 'click').length;
  return (
    <div className="ad-admin">
      <PageHeader
        title={affiliate ? 'Affiliate · góc mua sắm' : 'Quảng cáo & nguồn thu'}
        description="Cấu hình đồng bộ PostgreSQL · chưa kết nối API đơn hàng hoặc thanh toán của nền tảng."
        actions={
          <Link
            href={affiliate ? '/admin/quang-cao' : '/admin/affiliate'}
            className="btn"
          >
            {affiliate ? 'Cài đặt quảng cáo' : 'Quản lý affiliate'} →
          </Link>
        }
      />
      <div className="ad-demo-banner">
        <span>
          <BadgeCheck size={20} />
          <strong>Dữ liệu máy chủ</strong>
        </span>
        <p>
          Cấu hình, thống kê nội bộ và doanh thu nhập tay được đồng bộ giữa các
          thiết bị. Không thực thi mã quảng cáo bên thứ ba.
        </p>
        <Link href="/" target="_blank" rel="noopener" className="btn">
          Mở trang đọc ↗
        </Link>
      </div>
      <div className="admin-stats">
        <StatCard
          label="Vị trí đang bật"
          value={`${config.slots.filter((slot) => slot.enabled && slot.source !== 'none').length} / ${config.slots.length}`}
          detail={
            config.enabled ? 'Công tắc tổng đang bật' : 'Công tắc tổng đang tắt'
          }
          icon={Megaphone}
        />
        <StatCard
          label="Hiển thị nội bộ"
          value={String(impressions)}
          detail="Khối hiện ≥ 50% trong 1 giây"
          icon={Eye}
        />
        <StatCard
          label="Lượt nhấn nội bộ"
          value={String(clicks)}
          detail="Không đồng nghĩa đơn hàng hợp lệ"
          icon={MousePointer2}
        />
        <StatCard
          label={affiliate ? 'Sản phẩm đang bật' : 'Booking trong lịch chạy'}
          value={String(
            affiliate
              ? config.products.filter((p) => p.enabled).length
              : config.campaigns.filter((c) => isCampaignLive(c, localDate()))
                  .length,
          )}
          detail={
            config.premiumDemo
              ? 'Premium demo đang ẩn ads'
              : 'Không tự tính doanh thu thật'
          }
          icon={affiliate ? ShoppingBag : BadgeCheck}
        />
      </div>
      {notice && (
        <div
          className={`admin-alert ${notice.error ? 'danger' : 'success'}`}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.text}
        </div>
      )}
      <div
        className="ad-admin-tabs"
        role="tablist"
        aria-label="Chức năng quảng cáo"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`ad-panel-${id}`}
            id={`ad-tab-${id}`}
            key={id}
            onClick={() => {
              setTab(id);
              setNotice(null);
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      <section
        id={`ad-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`ad-tab-${tab}`}
      >
        {tab === 'slots' && <SlotsPanel config={config} commit={commit} />}
        {tab === 'campaigns' && (
          <CampaignsPanel config={config} commit={commit} />
        )}
        {tab === 'products' && (
          <ProductsPanel config={config} commit={commit} />
        )}
        {tab === 'settings' && (
          <SettingsPanel
            key={JSON.stringify([
              config.enabled,
              config.premiumDemo,
              config.premiumHidesAffiliate,
              config.minimumChapterPages,
              config.network,
            ])}
            config={config}
            commit={commit}
          />
        )}
        {tab === 'reports' && <ReportsPanel config={config} commit={commit} />}
      </section>
    </div>
  );
}
function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-card ad-panel">
      <h2>{title}</h2>
      {description && <p className="ad-help">{description}</p>}
      {children}
    </section>
  );
}
function Check({
  label,
  checked,
  onChange,
  name,
  defaultChecked,
  disabled,
}: {
  label: string;
  checked?: boolean;
  onChange?: (value: boolean) => void;
  name?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="ad-check">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={
          onChange ? (event) => onChange(event.target.checked) : undefined
        }
      />
      <span>{label}</span>
    </label>
  );
}
function PlacementPicker({
  value,
  onChange,
}: {
  value: AdPlacement[];
  onChange: (value: AdPlacement[]) => void;
}) {
  return (
    <fieldset className="ad-fieldset">
      <legend>Vị trí hiển thị</legend>
      <div className="ad-check-grid">
        {PLACEMENT_IDS.map((id) => (
          <Check
            key={id}
            label={PLACEMENTS[id].name}
            checked={value.includes(id)}
            onChange={(checked) =>
              onChange(checked ? [...value, id] : value.filter((p) => p !== id))
            }
          />
        ))}
      </div>
    </fieldset>
  );
}
function SlotsPanel({
  config,
  commit,
}: {
  config: AdvertisingConfig;
  commit: Commit;
}) {
  const [placement, setPlacement] = useState<AdPlacement>('home-between');
  return (
    <div className="ad-management-grid">
      <div className="ad-slot-list">
        {config.slots.map((slot) => (
          <SlotEditor
            key={JSON.stringify(slot)}
            slot={slot}
            commit={commit}
            onPreview={() => setPlacement(slot.placement)}
          />
        ))}
      </div>
      <Preview
        config={config}
        placement={placement}
        onPlacement={setPlacement}
      />
    </div>
  );
}
function SlotEditor({
  slot,
  commit,
  onPreview,
}: {
  slot: AdvertisingSlot;
  commit: Commit;
  onPreview: () => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: AdvertisingSlot = {
      ...slot,
      enabled: data.has('enabled'),
      mobile: slot.placement !== 'story-sidebar' && data.has('mobile'),
      desktop: data.has('desktop'),
      source: String(data.get('source')) as AdvertisingSlot['source'],
      format: String(data.get('format')) as AdvertisingSlot['format'],
      minHeight: Number(data.get('minHeight')),
    };
    commit(
      (current) => ({
        ...current,
        slots: current.slots.map((item) =>
          item.placement === slot.placement ? next : item,
        ),
      }),
      `Lưu vị trí: ${PLACEMENTS[slot.placement].name}`,
    );
  }
  return (
    <form className="admin-card ad-panel ad-form" onSubmit={submit}>
      <div className="ad-panel-heading">
        <div>
          <h2>{PLACEMENTS[slot.placement].name}</h2>
          <p className="ad-help">{PLACEMENTS[slot.placement].detail}</p>
        </div>
        <span className="chip">
          {slot.enabled && slot.source !== 'none' ? 'Đang bật' : 'Đang tắt'}
        </span>
      </div>
      <div className="ad-check-row">
        <Check
          name="enabled"
          label="Bật vị trí"
          defaultChecked={slot.enabled}
        />
        <Check
          name="mobile"
          label="Mobile"
          defaultChecked={slot.mobile}
          disabled={slot.placement === 'story-sidebar'}
        />
        <Check name="desktop" label="PC" defaultChecked={slot.desktop} />
      </div>
      {slot.placement === 'story-sidebar' && (
        <p className="ad-help">
          Cột bên luôn bị ẩn trên mobile và màn hình dưới 1024px.
        </p>
      )}
      <div className="ad-form-grid">
        <label>
          Nguồn dự phòng
          <select name="source" defaultValue={slot.source}>
            {Object.entries(SOURCE_NAMES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Định dạng
          <select name="format" defaultValue={slot.format}>
            <option value="banner">Banner</option>
            <option value="native">Native · gọn</option>
          </select>
        </label>
        <label>
          Chiều cao banner tối thiểu (px)
          <input
            name="minHeight"
            type="number"
            min={120}
            max={360}
            required
            defaultValue={slot.minHeight}
          />
        </label>
      </div>
      <p className="ad-help">
        Booking hợp lệ được ưu tiên. Hết lịch / tạm dừng sẽ dùng nguồn dự phòng;
        chọn “Không hiển thị” để ẩn hoàn toàn.
      </p>
      <div className="ad-actions">
        <button className="btn btn-primary">
          <Save size={15} />
          Lưu vị trí
        </button>
        <button type="button" className="btn" onClick={onPreview}>
          <Eye size={15} />
          Xem trước
        </button>
      </div>
    </form>
  );
}
function Preview({
  config,
  placement,
  onPlacement,
}: {
  config: AdvertisingConfig;
  placement: AdPlacement;
  onPlacement: (p: AdPlacement) => void;
}) {
  const [device, setDevice] = useState<AdDevice>('desktop');
  const [date, setDate] = useState(localDate);
  const [pageCount, setPageCount] = useState(12);
  const selection = resolveAdvertisement(
    config,
    placement,
    device,
    date,
    pageCount,
  );
  const slot = config.slots.find((item) => item.placement === placement)!;
  return (
    <aside className="ad-preview-panel">
      <Panel
        title="Xem trước trang đọc"
        description="Áp dụng cấu hình đã lưu. Không ghi lượt hiển thị / nhấn."
      >
        <div className="ad-form">
          <label>
            Vị trí
            <select
              value={placement}
              onChange={(event) =>
                onPlacement(event.target.value as AdPlacement)
              }
            >
              {PLACEMENT_IDS.map((id) => (
                <option key={id} value={id}>
                  {PLACEMENTS[id].name}
                </option>
              ))}
            </select>
          </label>
          <div className="ad-device-buttons">
            <button
              type="button"
              className="btn"
              aria-pressed={device === 'desktop'}
              onClick={() => setDevice('desktop')}
            >
              <Monitor size={16} />
              PC
            </button>
            <button
              type="button"
              className="btn"
              aria-pressed={device === 'mobile'}
              onClick={() => setDevice('mobile')}
            >
              <Smartphone size={16} />
              Mobile
            </button>
          </div>
          <div className="ad-form-grid">
            <label>
              Ngày xem trước
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            {placement === 'chapter-mid' && (
              <label>
                Số ảnh của chap
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={pageCount}
                  onChange={(event) => setPageCount(Number(event.target.value))}
                />
              </label>
            )}
          </div>
        </div>
        <div
          className={`ad-preview-canvas ${device === 'mobile' ? 'ad-preview-mobile' : ''}`}
        >
          {selection &&
          !(placement === 'story-sidebar' && device === 'mobile') ? (
            <AdCreative
              key={`${placement}-${device}-${selection.source}`}
              selection={selection}
              config={config}
              slot={slot}
              preview
            />
          ) : (
            <div className="ad-preview-empty">
              <Eye size={28} />
              <strong>Vị trí đang không hiển thị</strong>
              <p>
                Kiểm tra công tắc tổng, Premium, nguồn, thiết bị, lịch booking
                hoặc độ dài chap.
              </p>
            </div>
          )}
        </div>
        <p className="ad-help">
          {config.premiumDemo
            ? 'Premium demo đang bật.'
            : 'Chế độ người đọc thường.'}{' '}
          Khi không có nội dung, vị trí biến mất và không chừa ô trống.
        </p>
      </Panel>
    </aside>
  );
}
function CampaignsPanel({
  config,
  commit,
}: {
  config: AdvertisingConfig;
  commit: Commit;
}) {
  const [draft, setDraft] = useState<AdvertisingCampaign | null>(null);
  const [search, setSearch] = useState('');
  const today = localDate();
  const create = () =>
    setDraft({
      id: newId(),
      name: '',
      advertiser: '',
      title: '',
      description: '',
      cta: 'Khám phá mẫu',
      image: '',
      placements: ['home-between'],
      mobile: true,
      desktop: true,
      startDate: today,
      endDate: today,
      priority: 10,
      status: 'draft',
      bookingAmount: 0,
      note: '',
    });
  const toggle = (campaign: AdvertisingCampaign) =>
    commit((current) => {
      const next = {
        ...campaign,
        status:
          campaign.status === 'active'
            ? ('paused' as const)
            : ('active' as const),
      };
      if (campaignConflicts(next, current.campaigns).length)
        throw new Error(
          'Booking trùng lịch, vị trí, thiết bị và mức ưu tiên. Hãy chỉnh lịch hoặc mức ưu tiên trước.',
        );
      return {
        ...current,
        campaigns: current.campaigns.map((c) => (c.id === next.id ? next : c)),
      };
    }, `Đổi trạng thái booking: ${campaign.name}`);
  return (
    <div className="ad-panel-stack">
      <div className="ad-toolbar ad-form">
        <label>
          Tìm chiến dịch
          <input
            type="search"
            placeholder="Tên hoặc đối tác…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" onClick={create}>
          <Plus size={16} />
          Tạo booking mẫu
        </button>
      </div>
      {draft && (
        <CampaignForm
          key={draft.id}
          draft={draft}
          config={config}
          commit={commit}
          onClose={() => setDraft(null)}
        />
      )}
      <div className="ad-item-list">
        {config.campaigns
          .filter((c) =>
            `${c.name} ${c.advertiser}`
              .toLocaleLowerCase('vi')
              .includes(search.toLocaleLowerCase('vi')),
          )
          .map((campaign) => (
            <Panel
              key={campaign.id}
              title={campaign.name}
              description={campaign.advertiser}
            >
              <div className="ad-tags">
                <span className="chip">
                  {campaign.status === 'draft'
                    ? 'Bản nháp'
                    : campaign.status === 'paused'
                      ? 'Tạm dừng'
                      : today < campaign.startDate
                        ? 'Đã lên lịch'
                        : today > campaign.endDate
                          ? 'Hết lịch'
                          : 'Đang chạy'}
                </span>
                <span className="chip">Ưu tiên {campaign.priority}</span>
                <span className="chip">
                  {[campaign.mobile && 'Mobile', campaign.desktop && 'PC']
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              <p className="ad-help">
                {campaign.startDate} → {campaign.endDate} · Giá booking ghi chú:{' '}
                {formatMoney(campaign.bookingAmount)}
              </p>
              <p className="ad-help">
                {campaign.placements.map((p) => PLACEMENTS[p].name).join(' / ')}
              </p>
              <div className="ad-actions">
                <button
                  className="btn"
                  onClick={() => setDraft({ ...campaign })}
                >
                  Chỉnh sửa
                </button>
                <button className="btn" onClick={() => toggle(campaign)}>
                  {campaign.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    if (window.confirm(`Xóa booking “${campaign.name}”?`))
                      commit(
                        (current) => ({
                          ...current,
                          campaigns: current.campaigns.filter(
                            (c) => c.id !== campaign.id,
                          ),
                        }),
                        `Xóa booking: ${campaign.name}`,
                      );
                  }}
                >
                  Xóa
                </button>
              </div>
            </Panel>
          ))}
      </div>
      {!config.campaigns.length && (
        <p className="ad-preview-empty">
          Chưa có booking. Tạo banner mẫu đầu tiên để xem trên trang đọc.
        </p>
      )}
    </div>
  );
}
function CampaignForm({
  draft,
  config,
  commit,
  onClose,
}: {
  draft: AdvertisingCampaign;
  config: AdvertisingConfig;
  commit: Commit;
  onClose: () => void;
}) {
  const [value, setValue] = useState(draft);
  const [error, setError] = useState('');
  const field = (
    key: keyof AdvertisingCampaign,
    next: string | number | boolean | AdPlacement[],
  ) => setValue((current) => ({ ...current, [key]: next }));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (value.endDate < value.startDate) {
      setError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
      return;
    }
    if (!value.placements.length || (!value.mobile && !value.desktop)) {
      setError('Chọn ít nhất một vị trí và một thiết bị.');
      return;
    }
    const next = {
      ...value,
      name: value.name.trim(),
      advertiser: value.advertiser.trim(),
      title: value.title.trim(),
      description: value.description.trim(),
      cta: value.cta.trim(),
    };
    if (!next.name || !next.advertiser || !next.title || !next.cta) {
      setError('Tên, đối tác, tiêu đề và nút không được để trống.');
      return;
    }
    if (
      commit((current) => {
        if (campaignConflicts(next, current.campaigns).length)
          throw new Error(
            'Trùng lịch booking ở cùng vị trí / thiết bị / ưu tiên. Hãy đổi mức ưu tiên hoặc lịch.',
          );
        return {
          ...current,
          campaigns: current.campaigns.some((c) => c.id === next.id)
            ? current.campaigns.map((c) => (c.id === next.id ? next : c))
            : [...current.campaigns, next],
        };
      }, `Lưu booking: ${next.name}`)
    )
      onClose();
  }
  return (
    <form onSubmit={submit} className="admin-card ad-panel ad-form">
      <h2>Cấu hình booking</h2>
      <p className="ad-help">
        Booking hợp lệ có ưu tiên cao nhất sẽ hiện. Chưa có link thật; CTA chỉ
        hiển thị thông báo minh họa.
      </p>
      {error && (
        <p className="admin-alert danger" role="alert">
          {error}
        </p>
      )}
      <div className="ad-form-grid">
        <label>
          Tên chiến dịch
          <input
            required
            maxLength={80}
            value={value.name}
            onChange={(e) => field('name', e.target.value)}
          />
        </label>
        <label>
          Đối tác / nhãn hàng
          <input
            required
            maxLength={80}
            value={value.advertiser}
            onChange={(e) => field('advertiser', e.target.value)}
          />
        </label>
      </div>
      <label>
        Tiêu đề banner
        <input
          required
          maxLength={100}
          value={value.title}
          onChange={(e) => field('title', e.target.value)}
        />
      </label>
      <label>
        Mô tả
        <textarea
          maxLength={250}
          rows={3}
          value={value.description}
          onChange={(e) => field('description', e.target.value)}
        />
      </label>
      <ImageField
        value={value.image}
        onChange={(image) => field('image', image)}
      />
      <div className="ad-form-grid">
        <label>
          Nhãn nút
          <input
            required
            maxLength={35}
            value={value.cta}
            onChange={(e) => field('cta', e.target.value)}
          />
        </label>
        <label>
          Trạng thái
          <select
            value={value.status}
            onChange={(e) => field('status', e.target.value)}
          >
            <option value="draft">Bản nháp</option>
            <option value="active">Kích hoạt theo lịch</option>
            <option value="paused">Tạm dừng</option>
          </select>
        </label>
        <label>
          Bắt đầu
          <input
            type="date"
            required
            value={value.startDate}
            onChange={(e) => field('startDate', e.target.value)}
          />
        </label>
        <label>
          Kết thúc (hết ngày)
          <input
            type="date"
            required
            value={value.endDate}
            onChange={(e) => field('endDate', e.target.value)}
          />
        </label>
        <label>
          Ưu tiên (cao hơn hiện trước)
          <input
            type="number"
            required
            min={0}
            max={100}
            value={value.priority}
            onChange={(e) => field('priority', Number(e.target.value))}
          />
        </label>
        <label>
          Giá booking ghi chú (₫)
          <input
            type="number"
            required
            min={0}
            max={1000000000}
            step={1000}
            value={value.bookingAmount}
            onChange={(e) => field('bookingAmount', Number(e.target.value))}
          />
        </label>
      </div>
      <div className="ad-check-row">
        <Check
          label="Mobile"
          checked={value.mobile}
          onChange={(checked) => field('mobile', checked)}
        />
        <Check
          label="PC"
          checked={value.desktop}
          onChange={(checked) => field('desktop', checked)}
        />
      </div>
      <PlacementPicker
        value={value.placements}
        onChange={(placements) => field('placements', placements)}
      />
      <label>
        Ghi chú nội bộ
        <textarea
          rows={2}
          maxLength={400}
          value={value.note}
          onChange={(e) => field('note', e.target.value)}
        />
      </label>
      {campaignConflicts(value, config.campaigns).length > 0 && (
        <p className="admin-alert danger">
          Có booking trùng lịch và ưu tiên. Cần chỉnh trước khi lưu.
        </p>
      )}
      <div className="ad-actions">
        <button className="btn btn-primary">
          <Save size={16} />
          Lưu booking
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Hủy
        </button>
      </div>
    </form>
  );
}
function ImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (image: string) => void;
}) {
  const [error, setError] = useState('');
  async function upload(file?: File) {
    setError('');
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 250 * 1024
    ) {
      setError('Chọn PNG, JPG hoặc WebP tối đa 250 KB.');
      return;
    }
    try {
      const reader = new FileReader();
      const image = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      onChange(image);
    } catch {
      setError('Không đọc được ảnh. Hãy chọn lại.');
    }
  }
  return (
    <div className="ad-image-field">
      <label>
        Ảnh minh họa (tùy chọn)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </label>
      <p className="ad-help">
        Lưu ảnh trong trình duyệt, không upload lên máy chủ. Tổng cấu hình tối
        đa 2 MB.
      </p>
      {error && (
        <p role="alert" className="ad-field-error">
          {error}
        </p>
      )}
      {value && (
        <div className="ad-image-preview">
          <Image
            src={value}
            width={180}
            height={120}
            alt="Ảnh mẫu đã chọn"
            unoptimized
          />
          <button type="button" className="btn" onClick={() => onChange('')}>
            Bỏ ảnh
          </button>
        </div>
      )}
    </div>
  );
}
function ProductsPanel({
  config,
  commit,
}: {
  config: AdvertisingConfig;
  commit: Commit;
}) {
  const [previewPlacement, setPreviewPlacement] =
    useState<AdPlacement>('home-affiliate');
  const [draft, setDraft] = useState<AffiliateProduct | null>(null);
  const [program, setProgram] = useState('all');
  const [search, setSearch] = useState('');
  const products = config.products.filter(
    (p) =>
      (program === 'all' || p.program === program) &&
      p.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
  );
  return (
    <div className="ad-panel-stack">
      <div className="ad-toolbar ad-form">
        <label>
          Tìm sản phẩm
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tên sản phẩm…"
          />
        </label>
        <label>
          Nền tảng
          <select value={program} onChange={(e) => setProgram(e.target.value)}>
            <option value="all">Tất cả</option>
            <option>Shopee</option>
            <option>TikTok Shop</option>
          </select>
        </label>
        <button
          className="btn btn-primary"
          onClick={() =>
            setDraft({
              id: newId(),
              name: '',
              program: 'Shopee',
              description: '',
              price: 0,
              image: '',
              enabled: true,
              placements: ['home-affiliate'],
              targetUrl: '',
            })
          }
        >
          <Plus size={16} />
          Thêm sản phẩm mẫu
        </button>
      </div>
      {draft && (
        <ProductForm
          key={draft.id}
          draft={draft}
          commit={commit}
          onClose={() => setDraft(null)}
        />
      )}
      <p className="ad-help">
        Mỗi vị trí hiện tối đa 3 sản phẩm bật, theo thứ tự tạo. Chọn nguồn “Sản
        phẩm affiliate” tại trang Quảng cáo để gắn vào vị trí khác.
      </p>
      <div className="ad-item-list">
        {products.map((product) => (
          <Panel
            key={product.id}
            title={product.name}
            description={product.description}
          >
            <div className="ad-tags">
              <span className="chip">{product.program}</span>
              <span className="chip">
                {product.enabled ? 'Đang bật' : 'Đã ẩn'}
              </span>
              <strong>{formatMoney(product.price)}</strong>
            </div>
            <p className="ad-help">
              {product.placements.map((p) => PLACEMENTS[p].name).join(' / ')}
            </p>
            <div className="ad-actions">
              <button className="btn" onClick={() => setDraft({ ...product })}>
                Chỉnh sửa
              </button>
              <button
                className="btn"
                onClick={() =>
                  commit(
                    (current) => ({
                      ...current,
                      products: current.products.map((p) =>
                        p.id === product.id ? { ...p, enabled: !p.enabled } : p,
                      ),
                    }),
                    `Đổi hiển thị sản phẩm: ${product.name}`,
                  )
                }
              >
                {product.enabled ? 'Ẩn' : 'Bật'}
              </button>
              <button
                className="btn"
                onClick={() => {
                  if (window.confirm(`Xóa sản phẩm “${product.name}”?`))
                    commit(
                      (current) => ({
                        ...current,
                        products: current.products.filter(
                          (p) => p.id !== product.id,
                        ),
                      }),
                      `Xóa sản phẩm: ${product.name}`,
                    );
                }}
              >
                Xóa
              </button>
            </div>
          </Panel>
        ))}
      </div>
      {!products.length && (
        <p className="ad-preview-empty">Không có sản phẩm phù hợp.</p>
      )}
      <Preview
        config={config}
        placement={previewPlacement}
        onPlacement={setPreviewPlacement}
      />
    </div>
  );
}
function ProductForm({
  draft,
  commit,
  onClose,
}: {
  draft: AffiliateProduct;
  commit: Commit;
  onClose: () => void;
}) {
  const [value, setValue] = useState(draft);
  const [error, setError] = useState('');
  const field = (
    key: keyof AffiliateProduct,
    next: string | number | boolean | AdPlacement[],
  ) => setValue((current) => ({ ...current, [key]: next }));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.name.trim() || !value.placements.length) {
      setError('Nhập tên sản phẩm và chọn ít nhất một vị trí.');
      return;
    }
    const next = {
      ...value,
      name: value.name.trim(),
      description: value.description.trim(),
    };
    if (
      commit(
        (current) => ({
          ...current,
          products: current.products.some((p) => p.id === next.id)
            ? current.products.map((p) => (p.id === next.id ? next : p))
            : [...current.products, next],
        }),
        `Lưu sản phẩm affiliate: ${next.name}`,
      )
    )
      onClose();
  }
  return (
    <form className="admin-card ad-panel ad-form" onSubmit={submit}>
      <h2>Cấu hình sản phẩm affiliate</h2>
      {error && (
        <p role="alert" className="admin-alert danger">
          {error}
        </p>
      )}
      <div className="ad-form-grid">
        <label>
          Tên sản phẩm
          <input
            required
            maxLength={80}
            value={value.name}
            onChange={(e) => field('name', e.target.value)}
          />
        </label>
        <label>
          Nền tảng
          <select
            value={value.program}
            onChange={(e) => field('program', e.target.value)}
          >
            <option>Shopee</option>
            <option>TikTok Shop</option>
          </select>
        </label>
        <label>
          Giá minh họa (₫)
          <input
            type="number"
            required
            min={0}
            max={1000000000}
            step={1000}
            value={value.price}
            onChange={(e) => field('price', Number(e.target.value))}
          />
        </label>
      </div>
      <label>
        Mô tả ngắn
        <textarea
          rows={2}
          maxLength={160}
          value={value.description}
          onChange={(e) => field('description', e.target.value)}
        />
      </label>
      <label>
        Link affiliate HTTPS
        <input
          type="url"
          maxLength={1000}
          placeholder={value.program === 'Shopee' ? 'https://s.shopee.vn/…' : 'https://shop.tiktok.com/…'}
          value={value.targetUrl || ''}
          onChange={(e) => field('targetUrl', e.target.value)}
        />
      </label>
      <ImageField
        value={value.image}
        onChange={(image) => field('image', image)}
      />
      <Check
        label="Bật sản phẩm"
        checked={value.enabled}
        onChange={(checked) => field('enabled', checked)}
      />
      <PlacementPicker
        value={value.placements}
        onChange={(placements) => field('placements', placements)}
      />
      <p className="ad-help">
        Chỉ chấp nhận link HTTPS thuộc Shopee hoặc TikTok. Hệ thống ghi lượt
        nhấn nội bộ, chưa theo dõi đơn hàng hoặc hoa hồng thật.
      </p>
      <div className="ad-actions">
        <button className="btn btn-primary">
          <Save size={16} />
          Lưu sản phẩm
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Hủy
        </button>
      </div>
    </form>
  );
}
function SettingsPanel({
  config,
  commit,
}: {
  config: AdvertisingConfig;
  commit: Commit;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    commit(
      (current) => ({
        ...current,
        enabled: data.has('enabled'),
        premiumDemo: data.has('premiumDemo'),
        premiumHidesAffiliate: data.has('premiumHidesAffiliate'),
        minimumChapterPages: Number(data.get('minimumChapterPages')),
        network: {
          provider: String(
            data.get('provider'),
          ) as AdvertisingConfig['network']['provider'],
          pricing: String(data.get('pricing')) as 'CPM' | 'CPC',
          label: String(data.get('label')).trim(),
          publisherId: String(data.get('publisherId')).trim(),
        },
      }),
      'Lưu cài đặt quảng cáo, mạng ads và Premium demo',
    );
  }
  return (
    <form className="ad-panel-stack ad-form" onSubmit={submit}>
      <Panel
        title="Công tắc & trải nghiệm đọc"
        description="Tắt công tắc tổng sẽ ẩn mọi quảng cáo và affiliate, không chừa khoảng trống."
      >
        <Check
          name="enabled"
          label="Bật hệ thống quảng cáo trên trang đọc"
          defaultChecked={config.enabled}
        />
        <label>
          Chỉ chèn quảng cáo giữa chap khi có ít nhất (ảnh)
          <input
            type="number"
            name="minimumChapterPages"
            required
            min={4}
            max={200}
            defaultValue={config.minimumChapterPages}
          />
        </label>
        <p className="ad-help">
          Một quảng cáo giữa chap, chèn ở ranh giới ảnh. Không popup, không tự
          phát âm thanh, không quảng cáo nổi che nút điều hướng.
        </p>
      </Panel>
      <Panel
        title="Mạng quảng cáo · cấu hình mô phỏng"
        description="Display / AdSense, CPC / CPM và Native Ads là các loại cấu hình, không phải ba nguồn thu cộng dồn cho cùng một lượt xem."
      >
        <div className="ad-form-grid">
          <label>
            Loại mạng
            <select name="provider" defaultValue={config.network.provider}>
              <option>AdSense</option>
              <option>CPC / CPM</option>
              <option>Native Ads</option>
            </select>
          </label>
          <label>
            Mô hình đo lường mẫu
            <select name="pricing" defaultValue={config.network.pricing}>
              <option>CPM</option>
              <option>CPC</option>
            </select>
          </label>
        </div>
        <label>
          Tiêu đề khối mạng ads
          <input
            name="label"
            maxLength={100}
            required
            defaultValue={config.network.label}
          />
        </label>
        <label>
          Mã publisher tham chiếu (không thực thi)
          <input
            name="publisherId"
            maxLength={100}
            placeholder="Để trống ở giai đoạn FE"
            defaultValue={config.network.publisherId}
          />
        </label>
        <p className="ad-help">
          Không nhận hoặc thực thi script / HTML. Bản FE không gửi lượt xem tới
          AdSense hay mạng khác, không tính tiền theo CPC/CPM.
        </p>
      </Panel>
      <Panel
        title="Premium · thử nghiệm tắt quảng cáo"
        description="Đây là công tắc mô phỏng người đọc Premium cho trình duyệt này, không tạo gói mua hoặc quyền truy cập thật."
      >
        <Check
          name="premiumDemo"
          label="Giả lập người đọc Premium"
          defaultChecked={config.premiumDemo}
        />
        <Check
          name="premiumHidesAffiliate"
          label="Premium cũng ẩn gợi ý affiliate"
          defaultChecked={config.premiumHidesAffiliate}
        />
        <p className="ad-help">
          Banner mạng ads và booking luôn được ẩn khi bật Premium demo.
        </p>
      </Panel>
      <div className="ad-actions">
        <button className="btn btn-primary">
          <Save size={16} />
          Lưu cài đặt
        </button>
      </div>
    </form>
  );
}
const revenueStatus = {
  estimated: 'Dự kiến',
  confirmed: 'Đã đối soát (nhập tay)',
  paid: 'Đã nhận (nhập tay)',
};
function downloadFile(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function ReportsPanel({
  config,
  commit,
}: {
  config: AdvertisingConfig;
  commit: Commit;
}) {
  const [days, setDays] = useState('30');
  const [today] = useState(localDate);
  const cutoff =
    days === 'all'
      ? ''
      : localDate(
          new Date(
            new Date(`${today}T00:00:00`).valueOf() -
              (Number(days) - 1) * 86400000,
          ),
        );
  const events = config.events.filter(
    (event) => event.at.slice(0, 10) >= cutoff,
  );
  const revenue = config.revenue.filter((row) => row.date >= cutoff);
  const rows = PLACEMENT_IDS.map((placement) => {
    const items = events.filter((event) => event.placement === placement);
    const impressions = items.filter(
      (event) => event.kind === 'impression',
    ).length;
    const clicks = items.filter((event) => event.kind === 'click').length;
    return {
      placement,
      impressions,
      clicks,
      ctr: impressions ? `${((clicks / impressions) * 100).toFixed(1)}%` : '—',
    };
  });
  function csv() {
    const safe = (value: string | number) =>
      `"${String(value)
        .replace(/^[=+@-]/, (match) => `'${match}`)
        .replaceAll('"', '""')}"`;
    const content = [
      ['Vị trí', 'Hiển thị FE', 'Nhấn FE', 'CTR FE'],
      ...rows.map((row) => [
        PLACEMENTS[row.placement].name,
        row.impressions,
        row.clicks,
        row.ctr,
      ]),
    ]
      .map((row) => row.map(safe).join(','))
      .join('\r\n');
    downloadFile(
      `\uFEFF${content}`,
      `quang-cao-fe-${today}.csv`,
      'text/csv;charset=utf-8',
    );
  }
  function saveRevenue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const entry: AdvertisingRevenue = {
      id: newId(),
      date: String(data.get('date')),
      source: String(data.get('source')) as AdvertisingRevenue['source'],
      amount: Number(data.get('amount')),
      status: String(data.get('status')) as AdvertisingRevenue['status'],
      note: String(data.get('note')).trim(),
    };
    if (
      commit(
        (current) => ({ ...current, revenue: [...current.revenue, entry] }),
        'Thêm doanh thu minh họa nhập tay',
      )
    )
      form.reset();
  }
  return (
    <div className="ad-panel-stack">
      <div className="ad-toolbar ad-form">
        <label>
          Khoảng thời gian
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="7">7 ngày</option>
            <option value="30">30 ngày</option>
            <option value="all">Tất cả</option>
          </select>
        </label>
        <button className="btn" onClick={csv}>
          <Download size={16} />
          Xuất CSV FE
        </button>
        <button
          className="btn"
          onClick={() =>
            downloadFile(
              JSON.stringify({ ...config, events: [], audit: [] }, null, 2),
              'cau-hinh-quang-cao-fe.json',
              'application/json',
            )
          }
        >
          <Download size={16} />
          Tải cấu hình JSON
        </button>
      </div>
      <Panel
        title="Hiệu quả vị trí · dữ liệu trình duyệt"
        description="Không phải báo cáo của AdSense, Shopee hay TikTok Shop. Giữ tối đa 3.000 sự kiện gần nhất; một khối sản phẩm ghi một lượt hiển thị cho mỗi sản phẩm trong khối."
      >
        <div className="ad-report-table">
          <table>
            <thead>
              <tr>
                <th>Vị trí</th>
                <th>Hiển thị FE</th>
                <th>Nhấn FE</th>
                <th>CTR FE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.placement}>
                  <td>{PLACEMENTS[row.placement].name}</td>
                  <td>{row.impressions}</td>
                  <td>{row.clicks}</td>
                  <td>{row.ctr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ad-help">
          CTR FE = lượt nhấn mẫu / lượt hiển thị đo tại đây. Không quy đổi ra
          tiền, không xác nhận đơn mua.
        </p>
        <button
          className="btn"
          onClick={() => {
            if (
              window.confirm(
                'Xóa toàn bộ sự kiện FE của trình duyệt này? Cấu hình vẫn được giữ.',
              )
            )
              commit(
                (current) => ({ ...current, events: [] }),
                'Xóa thống kê quảng cáo FE',
              );
          }}
        >
          Xóa thống kê thử nghiệm
        </button>
      </Panel>
      <Panel title="Tương tác sản phẩm affiliate">
        <div className="ad-report-table">
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Nền tảng</th>
                <th>Hiển thị FE</th>
                <th>Nhấn FE</th>
              </tr>
            </thead>
            <tbody>
              {config.products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.program}</td>
                  <td>
                    {
                      events.filter(
                        (e) =>
                          e.creativeId === product.id &&
                          e.kind === 'impression',
                      ).length
                    }
                  </td>
                  <td>
                    {
                      events.filter(
                        (e) =>
                          e.creativeId === product.id && e.kind === 'click',
                      ).length
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel
        title="Sổ doanh thu nhập tay · minh họa"
        description="Không có đối soát hoặc thanh toán tự động. Giá booking không tự động ghi vào sổ; mọi khoản dưới đây do bạn nhập để thử giao diện."
      >
        <div className="ad-revenue-summary">
          {(['estimated', 'confirmed', 'paid'] as const).map((status) => (
            <div key={status}>
              <small>{revenueStatus[status]}</small>
              <strong>
                {formatMoney(
                  revenue
                    .filter((row) => row.status === status)
                    .reduce((sum, row) => sum + row.amount, 0),
                )}
              </strong>
            </div>
          ))}
        </div>
        <form className="ad-form" onSubmit={saveRevenue}>
          <div className="ad-form-grid">
            <label>
              Ngày
              <input type="date" name="date" required defaultValue={today} />
            </label>
            <label>
              Nguồn
              <select name="source">
                <option value="network">Mạng quảng cáo</option>
                <option value="direct">Booking trực tiếp</option>
                <option>Shopee</option>
                <option>TikTok Shop</option>
              </select>
            </label>
            <label>
              Số tiền (₫)
              <input
                type="number"
                name="amount"
                min={1000}
                max={1000000000}
                step={1000}
                required
              />
            </label>
            <label>
              Trạng thái
              <select name="status">
                {Object.entries(revenueStatus).map(([value, name]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Ghi chú
            <input
              name="note"
              maxLength={200}
              required
              placeholder="Ví dụ: dữ liệu mẫu thử giao diện"
            />
          </label>
          <button className="btn btn-primary">Thêm khoản mẫu</button>
        </form>
        <div className="ad-report-table">
          <table>
            <thead>
              <tr>
                <th>Ngày / nguồn</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {revenue
                .slice()
                .reverse()
                .map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.date}
                      <br />
                      {row.source === 'direct'
                        ? 'Booking'
                        : row.source === 'network'
                          ? 'Mạng ads'
                          : row.source}
                    </td>
                    <td>{formatMoney(row.amount)}</td>
                    <td>{revenueStatus[row.status]}</td>
                    <td>{row.note}</td>
                    <td>
                      <button
                        className="btn"
                        onClick={() => {
                          if (window.confirm('Xóa khoản nhập tay này?'))
                            commit(
                              (current) => ({
                                ...current,
                                revenue: current.revenue.filter(
                                  (r) => r.id !== row.id,
                                ),
                              }),
                              'Xóa khoản doanh thu nhập tay',
                            );
                        }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!revenue.length && (
          <p className="ad-help">
            Chưa có khoản nhập tay trong thời gian đã chọn.
          </p>
        )}
      </Panel>
      <Panel
        title="Lịch sử cài đặt gần đây"
        description="Nhật ký FE trong trình duyệt, không phải nhật ký kiểm toán bảo mật máy chủ."
      >
        <div className="ad-audit-list">
          {config.audit.slice(0, 12).map((row) => (
            <div key={row.id}>
              <span>{row.summary}</span>
              <small>
                {new Date(row.at).toLocaleString('vi-VN')} · {row.userId}
              </small>
            </div>
          ))}
          {!config.audit.length && (
            <p className="ad-help">Chưa có thay đổi cấu hình.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}

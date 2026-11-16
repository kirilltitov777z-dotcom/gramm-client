import { useEffect, useRef, useState } from 'react';
import { Settings2, ImagePlus, Check, X, Sparkles } from 'lucide-react';
import { useApp } from '../store/appStore';
import { telegram, decodeBannerMarker, encodeBannerMarker } from '../telegram/client';
import { FEATURES_COUNT, FEATURES } from '../features/registry';

const GRADIENTS = [
  'linear-gradient(135deg,#4facfe,#6c5ce7,#fd5ba2)',
  'linear-gradient(135deg,#00c9a7,#3fd0ff)',
  'linear-gradient(135deg,#ff7a59,#fd5ba2)',
  'linear-gradient(135deg,#1db954,#0e8f5a)',
];

function randomId() {
  return Math.random().toString(36).slice(2, 8);
}

export default function ProfileView() {
  const me = useApp((s) => s.me);
  const banner = useApp((s) => s.banner);
  const setBanner = useApp((s) => s.setBanner);
  const setBannerModal = useApp((s) => s.setBannerModal);
  const bannerModalOpen = useApp((s) => s.bannerModalOpen);
  const toast = useApp((s) => s.toastMsg);
  const toggleModMenu = useApp((s) => s.toggleModMenu);

  //черновик редактора
  const [image, setImage] = useState(banner?.image ?? '');
  const [gradient, setGradient] = useState(banner?.gradient ?? GRADIENTS[0]);
  const [caption, setCaption] = useState(banner?.caption ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bannerModalOpen) {
      setImage(banner?.image ?? '');
      setGradient(banner?.gradient ?? GRADIENTS[0]);
      setCaption(banner?.caption ?? '');
    }
  }, [bannerModalOpen, banner]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    const id = randomId();
    const next = { image, gradient, caption, v: 1 };
    setBanner(next);
    telegram.saveLocalBanner(next);
    // маркер в bio (виден другим клиентам ГРАММ)
    const marker = image ? encodeBannerMarker(id) : encodeBannerMarker(id);
    const ok = await telegram.setBannerMarker(marker);
    setBannerModal(false);
    toast(ok ? 'Фон сохранён и маркер в bio обновлён' : 'Фон сохранён локально');
  }

  async function syncFromBio() {
    const bio = await telegram.getUserBio('me');
    const marker = decodeBannerMarker(bio);
    if (!marker) return toast('Маркер ГРАММ в bio не найден');
    if (marker.url) {
      setBanner({ image: marker.url, caption: caption || 'Фон профиля', v: 1 });
      toast('Фон загружен из bio');
    } else if (marker.id) {
      const reg = await telegram.fetchBannerRegistry();
      const found = reg[marker.id];
      if (found) { setBanner(found); toast('Фон загружен из реестра'); }
      else toast('Баннер с ID не найден в реестре');
    }
  }

  const displayBanner = banner ?? { gradient: GRADIENTS[0], image: '', caption: '' };
  const ready = FEATURES.filter((f) => f.ready).length;

  return (
    <>
      <header className="header">
        <div className="brand"><span className="brand-logo">✈</span><div className="brand-name">Профиль</div></div>
        <div className="header-spacer" />
        <button className="icon-btn" onClick={() => toggleModMenu(true)}><Settings2 size={18} /></button>
      </header>

      <div className="view">
        <div className="banner" style={displayBanner.image ? undefined : { background: displayBanner.gradient }}>
          {displayBanner.image && <img src={displayBanner.image} alt="баннер" />}
          <div className="banner-cap">{displayBanner.caption || 'Мой профиль в ГРАММ'}</div>
        </div>
        <div className="avatar profile-ava">{(me?.title ?? 'Я')[0]}</div>
        <div className="profile-name">{me?.title ?? 'Мой профиль'}</div>
        <div className="profile-username">{me?.username ? `@${me.username}` : 'ГРАММ · без границ'}</div>

        <div style={{ display: 'flex', gap: 8, margin: '18px 16px' }}>
          <button className="btn ghost" style={{ margin: 0 }} onClick={() => setBannerModal(true)}>
            <ImagePlus size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Фон профиля
          </button>
          <button className="btn ghost" style={{ margin: 0 }} onClick={syncFromBio}>Синхронизировать</button>
        </div>

        <div className="section">
          <div className="section-title">О клиенте</div>
          <div className="card">
            <div className="card-row"><div className="ico"><Sparkles size={17} /></div>
              <div className="row-main"><div className="row-title">ГРАММ v1.0</div><div className="row-desc">Телеграм без границ · MTProto клиент</div></div>
              <span className="pill ready">{ready} готово</span>
            </div>
            <div className="card-row"><div className="ico">⚡</div>
              <div className="row-main"><div className="row-title">{FEATURES_COUNT}+ возможностей</div><div className="row-desc">все в мод-меню</div></div>
            </div>
            <div className="card-row"><div className="ico">🛡</div>
              <div className="row-main"><div className="row-title">Авто-прокси</div><div className="row-desc">Подбор MTProto-узла при запуске</div></div>
            </div>
          </div>
        </div>
      </div>

      {bannerModalOpen && (
        <>
          <div className="overlay" onClick={() => setBannerModal(false)} />
          <div className="modal">
            <h3>Фон профиля</h3>
            <p>Своё фото увидят другие пользователи ГРАММ. Маркер в bio занимает ≤70 символов.</p>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
            <button className="btn ghost" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> Выбрать фото</button>
            {(image || displayBanner.image) && <img src={image || displayBanner.image} alt="предпросмотр" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12, marginTop: 10 }} />}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {GRADIENTS.map((g) => (
                <button key={g} onClick={() => { setGradient(g); setImage(''); }}
                  style={{ width: 38, height: 38, borderRadius: 10, background: g, border: gradient === g && !image ? '2px solid #fff' : 'none' }} />
              ))}
            </div>
            <input className="field" placeholder="Подпись (необязательно)" value={caption} onChange={(e) => setCaption(e.target.value)} />
            <button className="btn" onClick={save}><Check size={16} /> Сохранить</button>
            <button className="btn ghost" onClick={() => setBannerModal(false)}><X size={16} /> Отмена</button>
          </div>
        </>
      )}
    </>
  );
}

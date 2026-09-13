import React, { useState, useEffect } from 'react';
import {
  Globe,
  Image as ImageIcon,
  HelpCircle,
  MessageSquare,
  Upload,
  Plus,
  Star,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const CmsMediaView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sliders' | 'testimonials' | 'faqs' | 'media'>('sliders');
  const [sliders, setSliders] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSliderModalOpen, setIsSliderModalOpen] = useState(false);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);

  // Forms
  const [sliderForm, setSliderForm] = useState({
    title: 'Hajj 1447H / 2026 Season Registrations Open',
    subtitle: 'VIP 5-Star Accommodations Directly Facing The Holy Kaaba',
    image_url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1600&q=80',
    cta_text: 'Explore Hajj Packages',
    cta_link: '/packages',
  });

  const [testimonialForm, setTestimonialForm] = useState({
    author_name: 'Dr. Tariq & Family',
    city: 'London',
    country: 'United Kingdom',
    rating: 5,
    testimonial_text: 'Alhamdulillah, Hajji Original Tours provided an impeccable spiritual journey. The Fairmont clock tower rooms and the private VIP air-conditioned Mina tents made our Hajj peaceful.',
    hajj_year: 2025,
  });

  const [faqForm, setFaqForm] = useState({
    category: 'hajj_guidelines',
    question: 'What is the difference between Shifting and Non-Shifting Hajj packages?',
    answer: 'Non-Shifting means your primary hotel room in Makkah is retained throughout the 5 days of Hajj, allowing you direct access to your room during Tawaf Al-Ifadah. Shifting packages transfer pilgrims to Aziziyah apartments prior to Mina.',
    display_order: 1,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [sldRes, tstRes, faqRes, medRes] = await Promise.all([
        api.getSliders(),
        api.getTestimonials(),
        api.getFaqs(),
        api.getMedia(),
      ]);
      if (sldRes.success) setSliders(sldRes.data);
      if (tstRes.success) setTestimonials(tstRes.data);
      if (faqRes.success) setFaqs(faqRes.data);
      if (medRes.success) setMedia(medRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSlider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createSlider(sliderForm);
      if (res.success) {
        setIsSliderModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create slider');
    }
  };

  const handleCreateTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createTestimonial(testimonialForm);
      if (res.success) {
        setIsTestimonialModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create testimonial');
    }
  };

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createFaq(faqForm);
      if (res.success) {
        setIsFaqModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create FAQ');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('alt_text', file.name);

    try {
      const res = await api.uploadMedia(formData);
      if (res.success) {
        alert('File uploaded to Media Library!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    }
  };

  return (
    <div id="cms-media-view" className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            Website CMS & Media Asset Library
          </h2>
          <p className="text-xs text-stone-500">
            Configure homepage hero banners, traveler testimonials, pilgrim FAQs and digital assets
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'sliders' && (
            <button
              onClick={() => setIsSliderModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Hero Banner</span>
            </button>
          )}
          {activeTab === 'testimonials' && (
            <button
              onClick={() => setIsTestimonialModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Pilgrim Review</span>
            </button>
          )}
          {activeTab === 'faqs' && (
            <button
              onClick={() => setIsFaqModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add FAQ Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('sliders')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'sliders'
              ? 'bg-stone-900 text-white font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Hero Banners ({sliders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('testimonials')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'testimonials'
              ? 'bg-stone-900 text-white font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          <span>Pilgrim Testimonials ({testimonials.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'faqs'
              ? 'bg-stone-900 text-white font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Pilgrim FAQs ({faqs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'media'
              ? 'bg-stone-900 text-white font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Media Library ({media.length})</span>
        </button>
      </div>

      {/* Tab Content: Sliders */}
      {activeTab === 'sliders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sliders.map((sl) => (
            <div
              key={sl.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs flex flex-col justify-between"
            >
              <div className="h-44 bg-stone-900 relative">
                <img
                  src={sl.image_url}
                  alt={sl.title}
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent p-5 flex flex-col justify-end">
                  <Badge variant="gold" className="self-start mb-2">
                    Hero Slide
                  </Badge>
                  <h3 className="text-base font-bold text-white leading-tight">{sl.title}</h3>
                  <p className="text-xs text-stone-300 mt-1 line-clamp-1">{sl.subtitle}</p>
                </div>
              </div>
              <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-600 font-medium">Button: {sl.cta_text}</span>
                <span className="text-emerald-700 font-semibold">● Active on Homepage</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Testimonials */}
      {activeTab === 'testimonials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-2">
                  {Array.from({ length: t.rating || 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-500" />
                  ))}
                </div>
                <p className="text-xs text-stone-700 italic leading-relaxed">
                  "{t.testimonial_text}"
                </p>
              </div>

              <div className="pt-3 mt-4 border-t border-stone-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-900">{t.author_name}</span>
                  <p className="text-[11px] text-stone-500">{t.city}, {t.country}</p>
                </div>
                <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[10px]">
                  Season {t.hajj_year || 2025}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: FAQs */}
      {activeTab === 'faqs' && (
        <div className="space-y-3">
          {faqs.map((f) => (
            <div
              key={f.id}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{f.question}</span>
                </h4>
                <Badge variant="default">{f.category?.replace('_', ' ') || 'General'}</Badge>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed pl-6">{f.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Media Library */}
      {activeTab === 'media' && (
        <div className="space-y-4">
          {/* Uploader Dropzone */}
          <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-stone-300 text-center hover:border-amber-500 transition-colors">
            <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-stone-800">Upload Media Assets</h4>
            <p className="text-xs text-stone-500 mt-0.5">
              JPG, PNG, or PDF files for packages, hotels, brochures, and traveler documentation
            </p>
            <input
              type="file"
              id="file-input-media"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="file-input-media"
              className="inline-block mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer shadow-xs"
            >
              Select File to Upload
            </label>
          </div>

          {/* Media Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {media.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs p-2 space-y-1.5"
              >
                <div className="h-24 bg-stone-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {m.file_path?.endsWith('.pdf') ? (
                    <span className="font-bold text-rose-700 font-mono text-xs">PDF DOCUMENT</span>
                  ) : (
                    <img
                      src={m.file_path}
                      alt={m.alt_text}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
                <p className="text-[11px] font-medium text-stone-800 truncate">{m.file_name}</p>
                <p className="text-[10px] text-stone-400 font-mono">{m.file_type}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add Slider */}
      <Modal
        isOpen={isSliderModalOpen}
        onClose={() => setIsSliderModalOpen(false)}
        title="Add Homepage Hero Slide"
        subtitle="Configure banner title, subtitle, and high-resolution cover image"
      >
        <form onSubmit={handleCreateSlider} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Slide Headline Title *
            </label>
            <input
              type="text"
              required
              value={sliderForm.title}
              onChange={(e) => setSliderForm({ ...sliderForm, title: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Subtitle Text
            </label>
            <input
              type="text"
              value={sliderForm.subtitle}
              onChange={(e) => setSliderForm({ ...sliderForm, subtitle: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Image URL *
            </label>
            <input
              type="url"
              required
              value={sliderForm.image_url}
              onChange={(e) => setSliderForm({ ...sliderForm, image_url: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Button Label
              </label>
              <input
                type="text"
                value={sliderForm.cta_text}
                onChange={(e) => setSliderForm({ ...sliderForm, cta_text: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Target Link
              </label>
              <input
                type="text"
                value={sliderForm.cta_link}
                onChange={(e) => setSliderForm({ ...sliderForm, cta_link: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsSliderModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
            >
              Save Hero Slide
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Testimonial */}
      <Modal
        isOpen={isTestimonialModalOpen}
        onClose={() => setIsTestimonialModalOpen(false)}
        title="Add Pilgrim Testimonial"
        subtitle="Add a customer testimonial to display on the agency portal"
      >
        <form onSubmit={handleCreateTestimonial} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Pilgrim / Family Name *
              </label>
              <input
                type="text"
                required
                value={testimonialForm.author_name}
                onChange={(e) =>
                  setTestimonialForm({ ...testimonialForm, author_name: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                City / Country
              </label>
              <input
                type="text"
                value={`${testimonialForm.city}, ${testimonialForm.country}`}
                onChange={(e) => {
                  const parts = e.target.value.split(',');
                  setTestimonialForm({
                    ...testimonialForm,
                    city: parts[0]?.trim() || '',
                    country: parts[1]?.trim() || '',
                  });
                }}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Star Rating (1 - 5)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={testimonialForm.rating}
                onChange={(e) =>
                  setTestimonialForm({ ...testimonialForm, rating: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Pilgrimage Year
              </label>
              <input
                type="number"
                value={testimonialForm.hajj_year}
                onChange={(e) =>
                  setTestimonialForm({ ...testimonialForm, hajj_year: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Testimonial Text *
              </label>
              <textarea
                rows={3}
                required
                value={testimonialForm.testimonial_text}
                onChange={(e) =>
                  setTestimonialForm({ ...testimonialForm, testimonial_text: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsTestimonialModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
            >
              Publish Testimonial
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add FAQ */}
      <Modal
        isOpen={isFaqModalOpen}
        onClose={() => setIsFaqModalOpen(false)}
        title="Add Pilgrim FAQ"
        subtitle="Provide guidance on rituals, luggage rules, and Saudi requirements"
      >
        <form onSubmit={handleCreateFaq} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Category
            </label>
            <select
              value={faqForm.category}
              onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
            >
              <option value="hajj_guidelines">Hajj Guidelines & Rituals</option>
              <option value="umrah_rules">Umrah Rules & Ihram</option>
              <option value="visa_passports">Saudi Visas & Passports</option>
              <option value="payments_cancellation">Payments & Refunds</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Question *
            </label>
            <input
              type="text"
              required
              value={faqForm.question}
              onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Detailed Answer *
            </label>
            <textarea
              rows={4}
              required
              value={faqForm.answer}
              onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsFaqModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
            >
              Save FAQ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

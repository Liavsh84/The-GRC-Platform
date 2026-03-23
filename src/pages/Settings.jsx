import { useState, useRef } from 'react';
import { Upload, X, Building2, Image } from 'lucide-react';
import { useData } from '../contexts/DataContext';

const Settings = () => {
  const { settings, updateSettings } = useData();
  const [companyName, setCompanyName] = useState(settings?.companyName || '');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => updateSettings({ companyLogo: ev.target.result });
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    updateSettings({ companyLogo: null });
    if (fileRef.current) fileRef.current.value = '';
  };

  const saveName = () => {
    updateSettings({ companyName });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your organization's branding and preferences</p>
      </div>

      {/* Company Name */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={16} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">Organization Name</h3>
        </div>
        <p className="text-sm text-gray-500">Displayed in reports and the application header.</p>
        <div className="flex gap-3">
          <input
            className="input-field flex-1"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Corporation"
          />
          <button onClick={saveName} className={`btn-primary ${saved ? 'bg-green-600 hover:bg-green-700' : ''}`}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Company Logo */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Image size={16} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">Company Logo</h3>
        </div>
        <p className="text-sm text-gray-500">Your logo appears in the header alongside the GRCX logo. Max 2 MB, any image format.</p>

        {settings?.companyLogo ? (
          <div className="flex items-center gap-4">
            <img src={settings.companyLogo} alt="Company logo" className="h-16 max-w-48 object-contain rounded-lg border border-gray-200 bg-gray-50 p-2" />
            <div>
              <p className="text-sm text-green-700 font-medium mb-1">✓ Logo uploaded</p>
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} className="btn-secondary text-sm flex items-center gap-1"><Upload size={13} /> Replace</button>
                <button onClick={removeLogo} className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"><X size={13} /> Remove</button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <Upload size={24} className="text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-600">Click to upload company logo</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG up to 2 MB</p>
          </button>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
      </div>

      {/* Preview */}
      {(settings?.companyLogo || companyName) && (
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Header Preview</p>
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2 w-fit">
            <img src="/grcx-logo.jpg" alt="GRCX" className="h-7 w-7 rounded-lg object-cover" />
            {settings?.companyLogo && (
              <>
                <div className="w-px h-6 bg-gray-200" />
                <img src={settings.companyLogo} alt="Company" className="h-7 max-w-24 object-contain" />
              </>
            )}
            {companyName && <span className="text-sm font-medium text-gray-700">{companyName}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

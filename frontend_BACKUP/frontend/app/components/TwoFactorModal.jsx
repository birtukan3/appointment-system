import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function TwoFactorModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && step === 1) {
      generateSecret();
    }
  }, [isOpen, step]);

  const generateSecret = async () => {
    try {
      const response = await api.post('/users/2fa/generate');
      setSecret(response.data.secret);
      setQrCode(response.data.qrCode);
    } catch (error) {
      toast.error('Failed to generate 2FA secret');
    }
  };

  const enable2FA = async () => {
    setLoading(true);
    try {
      await api.post('/users/2fa/enable', { secret, token });
      toast.success('2FA enabled successfully');
      onClose();
    } catch (error) {
      toast.error('Invalid token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Set Up Two-Factor Authentication</h2>
        
        {step === 1 && qrCode && (
          <>
            <div className="text-center mb-4">
              <img src={qrCode} alt="QR Code" className="mx-auto w-48 h-48" />
              <p className="text-sm text-gray-600 mt-2">Scan this QR code with Google Authenticator</p>
              <p className="text-xs text-gray-500 mt-1">Or enter code: {secret}</p>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
            >
              Next
            </button>
          </>
        )}
        
        {step === 2 && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Enter 6-digit code</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-full px-3 py-2 border rounded-lg text-center text-2xl tracking-widest"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={enable2FA}
                disabled={loading || token.length !== 6}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
              >
                {loading ? 'Enabling...' : 'Enable 2FA'}
              </button>
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
              >
                Back
              </button>
            </div>
          </>
        )}
        
        <button onClick={onClose} className="mt-4 w-full text-gray-500 text-sm hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Modal } from './shared/Modal';
import { Button } from './shared/Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [shopUrl, setShopUrl] = useState('');
    const [apiToken, setApiToken] = useState('');

    useEffect(() => {
        if (isOpen) {
            setShopUrl(localStorage.getItem('shopifyShopUrl') || '');
            setApiToken(localStorage.getItem('shopifyApiToken') || '');
        }
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('shopifyShopUrl', shopUrl);
        localStorage.setItem('shopifyApiToken', apiToken);
        onClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Settings"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Settings</Button>
                </>
            }
        >
            <div className="space-y-6">
                <div>
                    <h4 className="text-md font-medium text-gray-200 mb-4">Shopify Settings</h4>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="shopUrl" className="block text-sm font-medium text-gray-300">Shopify Store URL</label>
                            <input
                                type="text"
                                name="shopUrl"
                                id="shopUrl"
                                value={shopUrl}
                                onChange={(e) => setShopUrl(e.target.value)}
                                className="mt-1 block w-full bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-white"
                                placeholder="your-store.myshopify.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="apiToken" className="block text-sm font-medium text-gray-300">Admin API Access Token</label>
                            <input
                                type="password"
                                name="apiToken"
                                id="apiToken"
                                value={apiToken}
                                onChange={(e) => setApiToken(e.target.value)}
                                className="mt-1 block w-full bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-white"
                                placeholder="shpat_..."
                            />
                        </div>
                        <div className="text-sm text-gray-400 bg-gray-900/50 p-3 rounded-md">
                            <p>To get your Admin API token, create a custom app in your Shopify admin panel.</p>
                            <p className="mt-2">Ensure you grant the following permissions: <code className="text-xs bg-gray-700 p-1 rounded">write_products</code>.</p>
                            <a href="https://help.shopify.com/en/manual/apps/custom-apps" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline mt-2 inline-block">Learn more</a>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default SettingsModal;
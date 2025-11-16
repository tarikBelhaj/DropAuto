import React from 'react';
import { Button } from './shared/Button';
import { PlusIcon } from './icons';

interface DashboardProps {
  onCreateNewProduct: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onCreateNewProduct }) => {
  const recentProducts = [
    { id: 1, name: 'Smart LED Desk Lamp', status: 'Published', url: 'shopify.com/...' },
    { id: 2, name: 'Portable Bluetooth Speaker', status: 'Draft', url: 'shopify.com/...' },
    { id: 3, name: 'Ergonomic Office Chair', status: 'Published', url: 'shopify.com/...' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={onCreateNewProduct}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Create New Product
        </Button>
      </div>
      <div className="bg-gray-800 rounded-lg shadow">
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Recent Products</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Product Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Shopify URL</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {recentProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.status === 'Published' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-400 hover:underline">
                    <a href={`https://${product.url}`} target="_blank" rel="noopener noreferrer">{product.url}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

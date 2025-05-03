import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Store, Plus, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/formatters';

const MarketplaceSettings: React.FC = () => {
  const { selectedProperty } = useProperty();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    marketplace_enabled: false,
    marketplace_price: 0,
    marketplace_status: 'draft' as 'draft' | 'published',
    description: '',
    amenities: [] as string[],
    rules: [] as string[],
    photos: [] as string[]
  });

  useEffect(() => {
    if (selectedProperty?.id) {
      loadPropertyDetails();
    }
  }, [selectedProperty]);

  const loadPropertyDetails = async () => {
    if (!selectedProperty) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: property, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', selectedProperty.id)
        .single();

      if (error) throw error;

      setFormData({
        marketplace_enabled: property.marketplace_enabled || false,
        marketplace_price: property.marketplace_price || 0,
        marketplace_status: property.marketplace_status || 'draft',
        description: property.description || '',
        amenities: property.amenities || [],
        rules: property.rules || [],
        photos: property.photos || []
      });
    } catch (err) {
      console.error('Error loading property details:', err);
      setError('Failed to load property details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      const { error } = await supabase
        .from('properties')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProperty.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving marketplace settings:', err);
      setError('Failed to save marketplace settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAmenityAdd = () => {
    const amenity = prompt('Enter new amenity:');
    if (amenity) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenity]
      }));
    }
  };

  const handleAmenityRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  const handleRuleAdd = () => {
    const rule = prompt('Enter new house rule:');
    if (rule) {
      setFormData(prev => ({
        ...prev,
        rules: [...prev.rules, rule]
      }));
    }
  };

  const handleRuleRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  const handlePhotoAdd = () => {
    const url = prompt('Enter photo URL:');
    if (url) {
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, url]
      }));
    }
  };

  const handlePhotoRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  if (!selectedProperty?.id) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please select a property to manage marketplace settings
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="mt-2 text-gray-600">Loading marketplace settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Marketplace Settings</h1>
        <Button
          variant={formData.marketplace_status === 'published' ? 'success' : 'primary'}
          onClick={() => setFormData(prev => ({
            ...prev,
            marketplace_status: prev.marketplace_status === 'published' ? 'draft' : 'published'
          }))}
          icon={<Store size={16} />}
        >
          {formData.marketplace_status === 'published' ? 'Published' : 'Draft'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
          Settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-800">Basic Settings</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Enable Marketplace Listing</h3>
                <p className="text-sm text-gray-500">Make your property visible in the marketplace</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.marketplace_enabled}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    marketplace_enabled: e.target.checked 
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Price (per month)
              </label>
              <input
                type="number"
                value={formData.marketplace_price}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  marketplace_price: parseFloat(e.target.value) || 0 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  description: e.target.value 
                }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your property..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Amenities</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAmenityAdd}
              icon={<Plus size={16} />}
            >
              Add Amenity
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {formData.amenities.map((amenity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                >
                  <span className="text-sm text-gray-700">{amenity}</span>
                  <button
                    type="button"
                    onClick={() => handleAmenityRemove(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">House Rules</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRuleAdd}
              icon={<Plus size={16} />}
            >
              Add Rule
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formData.rules.map((rule, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                >
                  <span className="text-sm text-gray-700">{rule}</span>
                  <button
                    type="button"
                    onClick={() => handleRuleRemove(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Photos</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePhotoAdd}
              icon={<Plus size={16} />}
            >
              Add Photo
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {formData.photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    {photo ? (
                      <img
                        src={photo}
                        alt={`Property photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePhotoRemove(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={isSaving}
            icon={isSaving ? <Loader2 className="animate-spin" size={16} /> : undefined}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MarketplaceSettings;
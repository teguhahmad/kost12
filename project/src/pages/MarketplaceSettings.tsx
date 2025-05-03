import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Store, Plus, X, Loader2, Image as ImageIcon, Globe, CheckCircle, DoorClosed, Trash, Edit } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/formatters';
import FeatureGuard from '../components/ui/FeatureGuard';

// Facility categories and their items
const FACILITIES = {
  common: {
    title: 'Fasilitas Umum',
    items: [
      'Balcon', 'CCTV', 'Dapur', 'Dispenser', 'Duplikat Gerbang Kos', 'Gazebo',
      'Jemuran', 'Joglo', 'Jual Makanan', 'K. Mandi Luar', 'Kamar Mandi Luar - WC Duduk',
      'Kamar Mandi Luar - WC Jongkok', 'Kartu Akses', 'Kompor', 'Kulkas', 'Laundry',
      'Locker', 'Mesin Cuci', 'Mushola', 'Pengurus Kos', 'Penjaga Kos', 'R. Cuci',
      'R. Jemur', 'R. Keluarga', 'R. Makan', 'R. Santai', 'R. Tamu', 'Rice Cooker',
      'Rooftop', 'TV', 'Taman', 'WiFi'
    ]
  },
  room: {
    title: 'Fasilitas Kamar',
    items: [
      'AC', 'Bantal', 'Cermin', 'Cleaning service', 'Dapur Pribadi', 'Dispenser',
      'Guling', 'Jendela', 'Kasur', 'Keset Toilet', 'Kipas Angin', 'Kos Higienis Mingguan',
      'Kulkas', 'Kursi', 'Lemari Baju', 'Maks. 5 orang/kamar', 'Meja', 'Meja Rias',
      'Meja makan', 'Sofa', 'TV', 'TV Kabel', 'Tidak ada Kasur', 'Ventilasi',
      'Wastafel', 'Water Heater', 'microwave'
    ]
  },
  bathroom: {
    title: 'Fasilitas Kamar Mandi',
    items: [
      'K. Mandi Dalam', 'K. Mandi Luar', 'Air panas', 'Bak mandi', 'Bathtub',
      'Ember mandi', 'Kloset Duduk', 'Kloset Jongkok', 'Shower', 'Wastafel'
    ]
  },
  parking: {
    title: 'Parkir',
    items: [
      'Parkir Mobil', 'Parkir Motor', 'Parkir Motor & Sepeda', 'Parkir Sepeda'
    ]
  }
};

interface RoomType {
  id: string;
  name: string;
  price: number;
  description: string;
  facilities: string[];
}

const MarketplaceSettings: React.FC = () => {
  const { selectedProperty } = useProperty();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showRoomTypeForm, setShowRoomTypeForm] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  
  const [settings, setSettings] = useState({
    marketplace_enabled: false,
    marketplace_status: 'draft' as 'draft' | 'published',
    description: '',
    amenities: [] as string[],
    rules: [] as string[],
    photos: [] as string[]
  });

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [roomTypeForm, setRoomTypeForm] = useState<Partial<RoomType>>({
    name: '',
    price: 0,
    description: '',
    facilities: []
  });

  useEffect(() => {
    if (selectedProperty?.id) {
      loadSettings();
    }
  }, [selectedProperty]);

  const loadSettings = async () => {
    if (!selectedProperty) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', selectedProperty.id)
        .single();

      if (propertyError) throw propertyError;

      // Load room types
      const { data: roomTypesData, error: roomTypesError } = await supabase
        .from('room_types')
        .select('*')
        .eq('property_id', selectedProperty.id);

      if (roomTypesError) throw roomTypesError;

      setSettings({
        marketplace_enabled: property.marketplace_enabled || false,
        marketplace_status: property.marketplace_status || 'draft',
        description: property.description || '',
        amenities: property.amenities || [],
        rules: property.rules || [],
        photos: property.photos || []
      });

      setRoomTypes(roomTypesData || []);
    } catch (err) {
      console.error('Error loading marketplace settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRoomType = async () => {
    if (!selectedProperty) return;

    try {
      setIsSaving(true);
      setError(null);

      const roomTypeData = {
        ...roomTypeForm,
        property_id: selectedProperty.id
      };

      if (editingRoomType) {
        const { error } = await supabase
          .from('room_types')
          .update(roomTypeData)
          .eq('id', editingRoomType.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('room_types')
          .insert([roomTypeData]);

        if (error) throw error;
      }

      await loadSettings();
      setShowRoomTypeForm(false);
      setEditingRoomType(null);
      setRoomTypeForm({
        name: '',
        price: 0,
        description: '',
        facilities: []
      });
    } catch (err) {
      console.error('Error saving room type:', err);
      setError('Failed to save room type');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoomType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room type?')) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('room_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadSettings();
    } catch (err) {
      console.error('Error deleting room type:', err);
      setError('Failed to delete room type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedProperty) return;

    try {
      setIsSaving(true);
      setError(null);

      const { error } = await supabase
        .from('properties')
        .update({
          marketplace_enabled: settings.marketplace_enabled,
          marketplace_status: settings.marketplace_status,
          description: settings.description,
          amenities: settings.amenities,
          rules: settings.rules,
          photos: settings.photos,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProperty.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFacility = (facility: string) => {
    setSettings(prev => ({
      ...prev,
      amenities: prev.amenities.includes(facility)
        ? prev.amenities.filter(f => f !== facility)
        : [...prev.amenities, facility]
    }));
  };

  const toggleRoomTypeFacility = (facility: string) => {
    setRoomTypeForm(prev => ({
      ...prev,
      facilities: prev.facilities?.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...(prev.facilities || []), facility]
    }));
  };

  if (!selectedProperty?.id) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please select a property to manage marketplace settings
      </div>
    );
  }

  return (
    <FeatureGuard 
      feature="marketplace_listing"
      fallback={
        <div className="p-6 text-center text-gray-500">
          Marketplace listing is not available in your current plan.
          Please upgrade to list your property in the marketplace.
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Marketplace</h1>
          <Button
            variant={settings.marketplace_status === 'published' ? 'success' : 'primary'}
            onClick={() => setSettings(prev => ({
              ...prev,
              marketplace_status: prev.marketplace_status === 'published' ? 'draft' : 'published'
            }))}
            icon={<Globe size={16} />}
          >
            {settings.marketplace_status === 'published' ? 'Published' : 'Draft'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative flex items-center">
            <CheckCircle size={20} className="mr-2" />
            Settings saved successfully!
          </div>
        )}

        {/* Room Types */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Tipe Kamar</h2>
            <Button
              onClick={() => {
                setEditingRoomType(null);
                setRoomTypeForm({
                  name: '',
                  price: 0,
                  description: '',
                  facilities: []
                });
                setShowRoomTypeForm(true);
              }}
              icon={<Plus size={16} />}
            >
              Tambah Tipe Kamar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roomTypes.map(roomType => (
                <div key={roomType.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{roomType.name}</h3>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        {formatCurrency(roomType.price)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Edit size={14} />}
                        onClick={() => {
                          setEditingRoomType(roomType);
                          setRoomTypeForm(roomType);
                          setShowRoomTypeForm(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash size={14} />}
                        onClick={() => handleDeleteRoomType(roomType.id)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{roomType.description}</p>
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700">Fasilitas:</h4>
                    <div className="flex flex-wrap gap-2">
                      {roomType.facilities?.map(facility => (
                        <span
                          key={facility}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {facility}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Facilities */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-800">Fasilitas</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {Object.entries(FACILITIES).map(([key, category]) => (
                <div key={key}>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{category.title}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {category.items.map(facility => (
                      <label key={facility} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={settings.amenities.includes(facility)}
                          onChange={() => toggleFacility(facility)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{facility}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            icon={isSaving ? <Loader2 className="animate-spin" size={16} /> : undefined}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Room Type Form Modal */}
        {showRoomTypeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold">
                  {editingRoomType ? 'Edit Tipe Kamar' : 'Tambah Tipe Kamar'}
                </h2>
                <button
                  onClick={() => {
                    setShowRoomTypeForm(false);
                    setEditingRoomType(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Tipe Kamar
                  </label>
                  <input
                    type="text"
                    value={roomTypeForm.name}
                    onChange={(e) => setRoomTypeForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Harga per Bulan
                  </label>
                  <input
                    type="number"
                    value={roomTypeForm.price}
                    onChange={(e) => setRoomTypeForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    value={roomTypeForm.description}
                    onChange={(e) => setRoomTypeForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Fasilitas</h3>
                  <div className="space-y-6">
                    {Object.entries(FACILITIES).map(([key, category]) => (
                      <div key={key}>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{category.title}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {category.items.map(facility => (
                            <label key={facility} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={roomTypeForm.facilities?.includes(facility)}
                                onChange={() => toggleRoomTypeFacility(facility)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{facility}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRoomTypeForm(false);
                      setEditingRoomType(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveRoomType}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : (editingRoomType ? 'Save Changes' : 'Add Room Type')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </FeatureGuard>
  );
};

export default MarketplaceSettings;

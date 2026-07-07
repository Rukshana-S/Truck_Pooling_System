import Autocomplete from 'react-google-autocomplete';

export default function LocationInput({ value, onChange, placeholder, name }) {
  // Try to extract raw string if value is JSON
  let displayValue = value;
  try {
    const parsed = JSON.parse(value);
    if (parsed && parsed.raw) displayValue = parsed.raw;
  } catch(e) {}

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <input
        type="text"
        name={name || 'currentLocation'}
        value={displayValue || ''}
        onChange={(e) => {
          if (onChange) onChange({ target: { name: name || 'currentLocation', value: e.target.value } });
        }}
        placeholder={placeholder || 'Search city...'}
        style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        required
      />
    );
  }

  return (
    <Autocomplete
      apiKey={apiKey}
      onPlaceSelected={(place) => {
        if (onChange) {
          const locObj = {
            city: place.address_components?.find(c => c.types.includes('locality'))?.long_name || '',
            state: place.address_components?.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '',
            coordinates: {
              lat: place.geometry?.location?.lat() || null,
              lng: place.geometry?.location?.lng() || null
            },
            raw: place.formatted_address || place.name || ''
          };
          onChange({
             target: {
               name: name || 'currentLocation',
               value: JSON.stringify(locObj)
             }
          });
        }
      }}
      options={{ types: ['(cities)'], componentRestrictions: { country: 'in' } }}
      defaultValue={displayValue}
      onChange={(e) => {
        if (onChange) onChange({ target: { name: name || 'currentLocation', value: e.target.value } });
      }}
      placeholder={placeholder || 'Search city...'}
      style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
      required
    />
  );
}

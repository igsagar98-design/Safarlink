export type SelectedLocation = {
  address: string;
  lat: number;
  lng: number;
};

type LocationAutocompleteProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
  onSelect: (location: SelectedLocation | null) => void;
};

declare function LocationAutocomplete(props: LocationAutocompleteProps): JSX.Element;

export default LocationAutocomplete;

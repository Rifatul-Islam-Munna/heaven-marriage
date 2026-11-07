import municipalityAreas from '@/staticData/municipality-areas.json';
import municipalityFallbackUpazilas from '@/staticData/municipality-fallback-upazilas.json';

// Curated municipal listing: iqbalhasandev/bangladesh-geo-json v1.0.0 (MIT).
// Mapped to the app's original 64-district/upazila values; use official
// gazettes for corporation status. Bogura municipality is excluded since
// it became Bangladesh's 13th city corporation in May 2026.
export const defaultMunicipalityAreas: LocationEntry[] = municipalityAreas.map(row=>({
 ...row,kind:'area',enabled:true,
}));
export const defaultMunicipalityUpazilas: LocationEntry[] = municipalityFallbackUpazilas.map(row=>({
 ...row,kind:'upazila',enabled:true,
}));

export type LocationKind = 'country'|'district'|'upazila'|'cityCorporation'|'area';
export interface LocationEntry {
  _id?: string;
  kind: LocationKind;
  name: string;
  label: string;
  district?: string;
  cityCorporation?: string;
  upazila?: string;
  parentArea?: string;
  enabled?: boolean;
}
export type LocationResponse = {entries: LocationEntry[]};

export const defaultCityCorporations: Omit<LocationEntry,'_id'>[] = [
  {kind:'cityCorporation',name:'Dhaka North City Corporation',label:'Dhaka North City Corporation',district:'Dhaka'},
  {kind:'cityCorporation',name:'Dhaka South City Corporation',label:'Dhaka South City Corporation',district:'Dhaka'},
  {kind:'cityCorporation',name:'Chattogram City Corporation',label:'Chattogram City Corporation',district:'Chattogram'},
  {kind:'cityCorporation',name:'Khulna City Corporation',label:'Khulna City Corporation',district:'Khulna'},
  {kind:'cityCorporation',name:'Rajshahi City Corporation',label:'Rajshahi City Corporation',district:'Rajshahi'},
  {kind:'cityCorporation',name:'Sylhet City Corporation',label:'Sylhet City Corporation',district:'Sylhet'},
  {kind:'cityCorporation',name:'Barishal City Corporation',label:'Barishal City Corporation',district:'Barishal'},
  {kind:'cityCorporation',name:'Narayanganj City Corporation',label:'Narayanganj City Corporation',district:'Narayanganj'},
  {kind:'cityCorporation',name:'Cumilla City Corporation',label:'Cumilla City Corporation',district:'Cumilla'},
  {kind:'cityCorporation',name:'Rangpur City Corporation',label:'Rangpur City Corporation',district:'Rangpur'},
  {kind:'cityCorporation',name:'Gazipur City Corporation',label:'Gazipur City Corporation',district:'Gazipur'},
  {kind:'cityCorporation',name:'Mymensingh City Corporation',label:'Mymensingh City Corporation',district:'Mymensingh'},
  {kind:'cityCorporation',name:'Bogura City Corporation',label:'Bogura City Corporation',district:'Bogura'},
];

// Examples for city-dwelling members. Admins may add arbitrary further areas.
// "Gulshan" is a neighborhood, never an upazila or city corporation.
export const defaultCityAreas: Omit<LocationEntry,'_id'>[] = [
  {kind:'area',name:'Gulshan',label:'Gulshan',district:'Dhaka',cityCorporation:'Dhaka North City Corporation'},
  {kind:'area',name:'Banani',label:'Banani',district:'Dhaka',cityCorporation:'Dhaka North City Corporation'},
  {kind:'area',name:'Uttara',label:'Uttara',district:'Dhaka',cityCorporation:'Dhaka North City Corporation'},
  {kind:'area',name:'Mirpur',label:'Mirpur',district:'Dhaka',cityCorporation:'Dhaka North City Corporation'},
  {kind:'area',name:'Dhanmondi',label:'Dhanmondi',district:'Dhaka',cityCorporation:'Dhaka South City Corporation'},
  {kind:'area',name:'Motijheel',label:'Motijheel',district:'Dhaka',cityCorporation:'Dhaka South City Corporation'},
  ...defaultMunicipalityAreas,
];

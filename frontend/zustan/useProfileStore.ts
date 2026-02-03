// stores/useProfileStore.ts
import { create } from 'zustand';
import { User } from '@/@types/user';

interface ProfileStore {
  // Form data
  formData: Partial<User>;
  
  // Current step
  currentStep: number;
  
  // Actions
  setCurrentStep: (step: number) => void;
  updateField: (field: keyof User, value: any) => void;
  updateNestedField: (parent: keyof User, field: string, value: any) => void;
  
  // Initialize with existing data
  initializeForm: (data: Partial<User>) => void;
  
  // Get all form data for submission
  getFormData: () => Partial<User>;
  
  // Reset everything
  resetForm: () => void;
}

const getInitialFormData = (): Partial<User> => ({
  name: '',
  userId: '',
  email: '',
  phoneNumber: '',
  gender: '',
  maritalStatus: '',
  age: undefined,
  bloodGroup: '',
  weight: undefined,
  nationality: '',
  address: {
    presentAddress: '',
    permanentAddress: '',
    district: '',
    upazila: '',
    extraInfo: ''
  },
  educationInfo: {
    educationMethod: '',
    highestEducation: '',
    highestEducationBoard: '',
    highestEducationGroup: '',
    highestEducationPassingYear: '',
    currentlyDoingHightEducation: false,
    sSCPassingYear: '',
    sSCPassingGroup: '',
    sSCResult: '',
    hSCPassingYear: '',
    hSCPassingGroup: '',
    hSCResult: ''
  },
  familyInfo: {
    isFatherAlive: false,
    fathersProfession: '',
    isMotherAlive: false,
    mothersProfession: '',
    brotherCount: 0,
    brotherInformation: '',
    sisterCount: 0,
    sisterInformation: '',
    familyFinancial: '',
    familyAssetDetails: '',
    familyReligiousCondition: ''
  },
  personalInformation: {
    outsideClothes: '',
    womenNiqbYear: '',
    manBeard: '',
    manClothAboveAnkels: false,
    prayerFiverTimeFrom: '',
    MissPrayerTime: '',
    maharaNonMahram: '',
    reciteQuran: '',
    fiqhFollow: '',
    digitalMedia: '',
    mentalOrPhysicalIssue: '',
    specialWorkOfDeen: '',
    majarBeliveStatus: '',
    islamicBookName: '',
    islamicScholarsName: '',
    extraInfoHobby: '',
    height: undefined,
    skinTone: '',
    islamicStudy: ''
  },
  occupational: {
    profession: '',
    workingDetails: '',
    salary: ''
  },
  marriageInformationWomen: {
    isGuardiansAgreed: false,
    jobAfterMarriage: '',
    studyAfterMarriage: '',
    thoughtsOnMarriage: ''
  },
  marriageInformationMan: {
    isGuardiansAgreed: false,
    wifeVailAfterMarriage: '',
    allowWifeStudyAfterMarriage: '',
    wifeJobAfterMarriage: '',
    livingPlaceAfterMarriage: '',
    expectedAnyGiftFromMarriage: '',
    thoughtsOnMarriage: ''
  },
  expectedLifePartner: {
    age: '',
    complexion: '',
    height: '',
    education: '',
    district: '',
    upazila: '',
    maritalStatus: '',
    profession: '',
    financialCondition: '',
    expectedQuality: ''
  },
  pledge: {
    youGordianKnowsThis: false,
    allTheInformationTrue: false,
    anyMisInformationWeAreNotKnowing: false
  }
});

export const useProfileStore = create<ProfileStore>((set, get) => ({
  formData: getInitialFormData(),
  currentStep: 0,

  setCurrentStep: (step) => set({ currentStep: step }),

  updateField: (field, value) =>
    set((state) => ({
      formData: {
        ...state.formData,
        [field]: value
      }
    })),

  updateNestedField: (parent, field, value) =>
    set((state) => ({
      formData: {
        ...state.formData,
        [parent]: {
          ...(state.formData[parent] as any),
          [field]: value
        }
      }
    })),

  // Load existing data into form
  initializeForm: (data) =>
    set({
      formData: {
        ...getInitialFormData(),
        ...data
      },
      currentStep: 0
    }),

  // Get all form data (for submission)
  getFormData: () => get().formData,

  // Reset to initial state
  resetForm: () =>
    set({
      formData: getInitialFormData(),
      currentStep: 0
    })
}));

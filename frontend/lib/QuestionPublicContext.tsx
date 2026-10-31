'use client';
import { createContext,useContext } from 'react';
import type { ProfileQuestionSchema } from './profile-questions';
import { defaultQuestions } from './profile-questions';
export const QuestionPublicContext=createContext<ProfileQuestionSchema>(defaultQuestions);
export const useQuestionPublicConfig=()=>useContext(QuestionPublicContext);
// Only the already-filtered public response is provided to public value rows.
export const PublicProfileDataContext=createContext<Record<string,any>|null>(null);
export const usePublicProfileData=()=>useContext(PublicProfileDataContext);

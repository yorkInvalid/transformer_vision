import { writable } from 'svelte/store';

export interface AppState {
  inputText: string;
  temperature: number;
  samplingMode: 'top-k' | 'top-p';
  topK: number;
  topP: number;
}

const initialState: AppState = {
  inputText: '',
  temperature: 0.7,
  samplingMode: 'top-k',
  topK: 50,
  topP: 0.9
};

export const appState = writable<AppState>(initialState);


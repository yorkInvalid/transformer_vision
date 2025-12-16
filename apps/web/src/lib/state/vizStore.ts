/**
 * 可视化组件的状态管理
 */
import { writable } from 'svelte/store';
import type { HoverCell } from '../viz/types';

export const selectedTokenId = writable<string | null>(null);
export const hoverTokenId = writable<string | null>(null);
export const selectedHead = writable<number>(0);
export const hoverCell = writable<HoverCell | null>(null);


/**
 * 可视化组件的状态管理
 */
import { writable } from 'svelte/store';

export const selectedTokenId = writable<string | null>(null);
export const hoverTokenId = writable<string | null>(null);


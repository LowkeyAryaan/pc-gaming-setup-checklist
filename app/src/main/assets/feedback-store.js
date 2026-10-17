/*
 * Device-local feedback comments.
 * This module deliberately has NO network requests and no automatic submissions.
 * Comments are shared across presets and survive app restarts in WebView storage.
 */
(function (root) {
    'use strict';
    const STORAGE_KEY = 'pc-gaming-feedback-comments-v1';
    const MAX_COMMENTS = 100;
    const MAX_LENGTH = 4000;

    function getStorage(storage) {
        if (storage) return storage;
        if (root && root.localStorage) return root.localStorage;
        throw new Error('Local storage is unavailable.');
    }

    function normalize(entry) {
        if (!entry || typeof entry !== 'object') return null;
        const id = typeof entry.id === 'string' ? entry.id.slice(0, 96) : '';
        const text = typeof entry.text === 'string' ? entry.text.trim().slice(0, MAX_LENGTH) : '';
        const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : '';
        if (!id || !text || !Number.isFinite(Date.parse(createdAt))) return null;
        const updatedAt = typeof entry.updatedAt === 'string' && Number.isFinite(Date.parse(entry.updatedAt))
            ? entry.updatedAt : null;
        return { id, text, createdAt, updatedAt };
    }

    function list(storage) {
        let parsed;
        try {
            parsed = JSON.parse(getStorage(storage).getItem(STORAGE_KEY) || '[]');
        } catch (_) {
            parsed = [];
        }
        if (!Array.isArray(parsed)) return [];
        const seen = new Set();
        return parsed.map(normalize).filter(entry => {
            if (!entry || seen.has(entry.id)) return false;
            seen.add(entry.id);
            return true;
        }).slice(0, MAX_COMMENTS);
    }

    function commit(items, storage) {
        getStorage(storage).setItem(STORAGE_KEY, JSON.stringify(items));
    }

    function add(text, storage) {
        const trimmed = String(text || '').trim();
        if (!trimmed) throw new Error('Write a comment before saving.');
        if (trimmed.length > MAX_LENGTH) throw new Error('Comments must be 4,000 characters or fewer.');
        const current = list(storage);
        if (current.length >= MAX_COMMENTS) {
            throw new Error('Your comment list is full (100). Delete an old comment before adding another.');
        }
        const record = {
            id: 'feedback-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9),
            text: trimmed,
            createdAt: new Date().toISOString(),
            updatedAt: null
        };
        commit([record, ...current], storage);
        return record;
    }

    function update(id, text, storage) {
        const trimmed = String(text || '').trim();
        if (!trimmed) throw new Error('Write a comment before saving.');
        if (trimmed.length > MAX_LENGTH) throw new Error('Comments must be 4,000 characters or fewer.');
        const existing = list(storage);
        const position = existing.findIndex(item => item.id === id);
        if (position === -1) throw new Error('Comment not found.');
        existing[position].text = trimmed;
        existing[position].updatedAt = new Date().toISOString();
        commit(existing, storage);
        return existing[position];
    }

    function remove(id, storage) {
        const existing = list(storage);
        if (!existing.some(item => item.id === id)) return false;
        commit(existing.filter(item => item.id !== id), storage);
        return true;
    }

    const API = Object.freeze({ STORAGE_KEY, MAX_COMMENTS, MAX_LENGTH, list, add, update, remove });
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
    else root.PCFeedbackStore = API;
})(typeof window !== 'undefined' ? window : globalThis);

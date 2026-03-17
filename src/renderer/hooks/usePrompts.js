import { useState, useCallback } from 'react';
import { optimizePrompt, getHistory, toggleFavorite, deletePrompt, copyToClipboard, sendToLLM } from '../lib/ipc';

export default function usePrompts() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    const data = await getHistory();
    setHistory(data);
  }, []);

  const optimize = useCallback(async (rawText, category) => {
    setLoading(true);
    try {
      const result = await optimizePrompt(rawText, category);
      await loadHistory();
      return result;
    } finally {
      setLoading(false);
    }
  }, [loadHistory]);

  const toggleFav = useCallback(async (id) => {
    await toggleFavorite(id);
    await loadHistory();
  }, [loadHistory]);

  const remove = useCallback(async (id) => {
    await deletePrompt(id);
    await loadHistory();
  }, [loadHistory]);

  const copy = useCallback((text) => copyToClipboard(text), []);

  const sendLLM = useCallback(async (prompt, provider) => {
    setLoading(true);
    try {
      return await sendToLLM(prompt, provider);
    } finally {
      setLoading(false);
    }
  }, []);

  return { history, loading, loadHistory, optimize, toggleFav, remove, copy, sendLLM };
}

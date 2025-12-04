'use client';

import { useState, useEffect } from 'react';

interface Site {
    id: string;
    name: string;
    url: string;
    username: string;
    app_password?: string;
    created_at?: string;
}

export default function SettingsPage() {
    const [apiKey, setApiKey] = useState('');
    const [hasKey, setHasKey] = useState(false);
    const [isLoadingKey, setIsLoadingKey] = useState(true);

    const [sites, setSites] = useState<Site[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(true);

    const [newSite, setNewSite] = useState({
        name: '',
        url: '',
        username: '',
        app_password: '',
        id: '' // Optional manual ID
    });

    useEffect(() => {
        fetchSettings();
        fetchSites();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            setHasKey(data.has_key);
            if (data.has_key) {
                setApiKey(data.masked_key);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingKey(false);
        }
    };

    const fetchSites = async () => {
        try {
            const res = await fetch('/api/sites');
            const data = await res.json();
            setSites(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingSites(false);
        }
    };

    const saveApiKey = async () => {
        if (!apiKey) return;
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'gemini_api_key', value: apiKey }),
            });
            alert('API Key saved successfully');
            fetchSettings();
        } catch (e) {
            alert('Failed to save API Key');
        }
    };

    const deleteApiKey = async () => {
        if (!confirm('Are you sure you want to delete the API Key?')) return;
        try {
            await fetch('/api/settings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'gemini_api_key' }),
            });
            setApiKey('');
            setHasKey(false);
            alert('API Key deleted');
        } catch (e) {
            alert('Failed to delete API Key');
        }
    };

    const addSite = async () => {
        if (!newSite.name || !newSite.url || !newSite.username || !newSite.app_password) {
            alert('Please fill in all required fields');
            return;
        }
        try {
            await fetch('/api/sites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSite),
            });
            setNewSite({ name: '', url: '', username: '', app_password: '', id: '' });
            fetchSites();
            alert('Site added successfully');
        } catch (e) {
            alert('Failed to add site');
        }
    };

    const deleteSite = async (id: string) => {
        if (!confirm('Are you sure you want to delete this site?')) return;
        try {
            await fetch(`/api/sites/${id}`, {
                method: 'DELETE',
            });
            fetchSites();
        } catch (e) {
            alert('Failed to delete site');
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1b26] text-gray-100 p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <h1 className="text-3xl font-bold mb-8">Settings</h1>

                {/* Gemini API Key Section */}
                <section className="bg-[#1f2937] rounded-lg border border-gray-700 p-6 shadow-lg">
                    <h2 className="text-xl font-semibold mb-2">Gemini API Key 관리</h2>
                    <p className="text-gray-400 text-sm mb-6">Gemini의 API 키를 연결해 문서를 생성할 수 있습니다.</p>

                    <div className="space-y-4">
                        <div className="border border-gray-600 rounded-md p-4 bg-[#252b3b]">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Gemini API Key 설정</label>
                            <label className="block text-xs text-gray-400 mb-1">Gemini API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="****************"
                                    className="flex-1 bg-[#1a1b26] border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                />
                                <button
                                    onClick={saveApiKey}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                                >
                                    저장
                                </button>
                                <button
                                    onClick={deleteApiKey}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
                                >
                                    삭제
                                </button>
                            </div>

                            <div className="mt-4 bg-[#2d3748] p-3 rounded flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <span className="text-blue-400">ℹ️</span>
                                    <span>애드버코더AI를 원활하게 사용하기 위해서는 유료 API 키가 필요합니다. 아래 버튼으로 유료 키 여부를 확인하세요.</span>
                                </div>
                            </div>
                            <button className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white py-2 rounded font-medium transition-colors">
                                유료키 확인하기
                            </button>
                        </div>

                        <div className="border border-gray-600 rounded-md p-4 bg-[#252b3b]">
                            <h3 className="text-sm font-medium text-gray-300 mb-4">Gemini API 연결 상태</h3>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Gemini</span>
                                <span className={hasKey ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                                    {hasKey ? "연결됨" : "연결 안됨"}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Gemini API를 사용하여 고급 자연어 처리 작업을 수행할 수 있습니다.</p>
                        </div>
                    </div>
                </section>

                {/* WordPress Connection Section */}
                <section className="bg-[#1f2937] rounded-lg border border-gray-700 p-6 shadow-lg">
                    <h2 className="text-xl font-semibold mb-2">워드프레스 연결하기</h2>
                    <p className="text-gray-400 text-sm mb-6">문서를 워드프레스에 발행 하시려면 워드프레스를 연결해 주세요.</p>

                    <div className="space-y-6">
                        {/* Add New Blog Form */}
                        <div className="border border-gray-600 rounded-md p-4 bg-[#252b3b]">
                            <h3 className="text-sm font-medium text-gray-300 mb-4">새 블로그 추가</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">블로그 이름 *</label>
                                    <input
                                        type="text"
                                        value={newSite.name}
                                        onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                                        className="w-full bg-[#1a1b26] border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">블로그 URL *</label>
                                    <input
                                        type="text"
                                        value={newSite.url}
                                        onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                                        placeholder="https://example.com"
                                        className="w-full bg-[#1a1b26] border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">블로그 ID *</label>
                                    <input
                                        type="text"
                                        value={newSite.username}
                                        onChange={(e) => setNewSite({ ...newSite, username: e.target.value })}
                                        className="w-full bg-[#1a1b26] border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">애플리케이션 비밀번호 *</label>
                                    <input
                                        type="password"
                                        value={newSite.app_password}
                                        onChange={(e) => setNewSite({ ...newSite, app_password: e.target.value })}
                                        className="w-full bg-[#1a1b26] border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={addSite}
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition-colors"
                                    >
                                        추가
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Registered Blogs List */}
                        <div className="border border-gray-600 rounded-md p-4 bg-[#252b3b]">
                            <h3 className="text-sm font-medium text-gray-300 mb-4">등록된 블로그</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-500 uppercase bg-[#1a1b26]">
                                        <tr>
                                            <th className="px-4 py-3">블로그 이름</th>
                                            <th className="px-4 py-3">URL</th>
                                            <th className="px-4 py-3">연결 상태</th>
                                            <th className="px-4 py-3 text-right">작업</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sites.map((site) => (
                                            <tr key={site.id} className="border-b border-gray-700 hover:bg-[#2d3748]">
                                                <td className="px-4 py-3 font-medium text-white">{site.name}</td>
                                                <td className="px-4 py-3">{site.url}</td>
                                                <td className="px-4 py-3 text-green-500">✔</td>
                                                <td className="px-4 py-3 text-right space-x-2">
                                                    <button className="p-1 hover:text-white transition-colors">📝</button>
                                                    <button
                                                        onClick={() => deleteSite(site.id)}
                                                        className="p-1 hover:text-red-500 transition-colors"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {sites.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                                    등록된 블로그가 없습니다.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}

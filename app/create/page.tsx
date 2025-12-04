'use client';

import { useState, useEffect, useRef } from 'react';
import * as xlsx from 'xlsx';
import { useRouter } from 'next/navigation';

interface Model {
    id: string;
    label: string;
    type: 'text' | 'image';
    default?: boolean;
}

interface Site {
    id: string;
    name: string;
    url: string;
}

export default function CreateProjectPage() {
    const router = useRouter();
    const [projectName, setProjectName] = useState('');
    const [inputMethod, setInputMethod] = useState<'manual' | 'excel'>('manual');
    const [manualTitles, setManualTitles] = useState('');
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [excelPreview, setExcelPreview] = useState<any[]>([]);

    const [textModels, setTextModels] = useState<Model[]>([]);
    const [imageModels, setImageModels] = useState<Model[]>([]);
    const [selectedTextModel, setSelectedTextModel] = useState('');
    const [selectedImageModel, setSelectedImageModel] = useState('');

    const [language, setLanguage] = useState('Korean');
    const [tone, setTone] = useState('Friendly');

    const [useAdditionalPrompt, setUseAdditionalPrompt] = useState(false);
    const [additionalPrompt, setAdditionalPrompt] = useState('');

    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState('');
    const [publishStatus, setPublishStatus] = useState<'draft' | 'publish'>('draft');

    const [useImageGeneration, setUseImageGeneration] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchModels();
        fetchSites();
    }, []);

    const fetchModels = async () => {
        try {
            const res = await fetch('/api/models');
            const data = await res.json();
            setTextModels(data.text_models || []);
            setImageModels(data.image_models || []);

            if (data.text_models?.length > 0) setSelectedTextModel(data.text_models[0].id);
            if (data.image_models?.length > 0) setSelectedImageModel(data.image_models[0].id);
        } catch (e) {
            console.error('Failed to fetch models', e);
        }
    };

    const fetchSites = async () => {
        try {
            const res = await fetch('/api/sites');
            const data = await res.json();
            setSites(data);
            if (data.length > 0) setSelectedSiteId(data[0].id);
        } catch (e) {
            console.error('Failed to fetch sites', e);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setExcelFile(file);

        const buffer = await file.arrayBuffer();
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(sheet);
        setExcelPreview(jsonData.slice(0, 5)); // Preview first 5 rows
    };

    const handleSubmit = async () => {
        if (!projectName) {
            alert('Please enter a project name');
            return;
        }
        if (!selectedSiteId) {
            alert('Please select a site');
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('site_id', selectedSiteId);
            formData.append('text_model_id', selectedTextModel);
            if (useImageGeneration) {
                formData.append('image_model_id', selectedImageModel);
            }

            // Construct System Prompt
            let systemPrompt = `
                Role: You are a professional blog post writer.
                Language: ${language}
                Tone: ${tone}
                Output Format: HTML (body only, no <html> tags)
            `;
            if (useAdditionalPrompt) {
                systemPrompt += `\nAdditional Instructions: ${additionalPrompt}`;
            }
            formData.append('system_prompt', systemPrompt);

            // Handle Input Data
            if (inputMethod === 'excel' && excelFile) {
                formData.append('excel_file', excelFile);
            } else {
                // Convert manual titles to Excel buffer
                const titles = manualTitles.split('\n').filter(t => t.trim());
                if (titles.length === 0) {
                    alert('Please enter at least one title');
                    setIsSubmitting(false);
                    return;
                }
                const ws = xlsx.utils.json_to_sheet(titles.map(t => ({ title: t })));
                const wb = xlsx.utils.book_new();
                xlsx.utils.book_append_sheet(wb, ws, "Titles");
                const excelBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                formData.append('excel_file', blob, 'manual_titles.xlsx');
            }

            const res = await fetch('/api/publish', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                alert(`Project created successfully! Job ID: ${data.job_id}`);
                router.push('/'); // Go to dashboard/home
            } else {
                const err = await res.json();
                alert(`Failed to create project: ${err.error}`);
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1b26] text-gray-100 p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold mb-2">정보성 포스팅 프로젝트 만들기</h1>
                <p className="text-gray-400 text-sm mb-8">새로운 정보성 포스팅을 생성 할 수 있습니다.</p>

                {/* Project Name */}
                <section className="bg-[#1f2937] rounded-lg border border-gray-700 p-6 shadow-lg">
                    <h2 className="text-lg font-semibold mb-4 text-blue-400">정보성 포스팅 설정</h2>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">프로젝트 이름</label>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="프로젝트 이름을 입력하세요"
                            className="w-full bg-[#1a1b26] border border-gray-600 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">프로젝트를 구분할 수 있는 이름을 입력해주세요.</p>
                    </div>

                    {/* Input Method Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">데이터 입력 방식</label>
                        <div className="flex gap-4 mb-4">
                            <button
                                onClick={() => setInputMethod('manual')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${inputMethod === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            >
                                직접 입력 (제목 목록)
                            </button>
                            <button
                                onClick={() => setInputMethod('excel')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${inputMethod === 'excel' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            >
                                엑셀 업로드
                            </button>
                        </div>

                        {inputMethod === 'manual' ? (
                            <div>
                                <textarea
                                    value={manualTitles}
                                    onChange={(e) => setManualTitles(e.target.value)}
                                    placeholder="제목 목록을 입력하세요 (줄바꿈으로 구분)"
                                    className="w-full h-40 bg-[#1a1b26] border border-gray-600 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">각 줄에 하나의 제목을 입력해주세요.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="text-gray-400">
                                        <p className="text-lg mb-2">엑셀 파일을 드래그하거나 클릭하여 업로드하세요</p>
                                        <p className="text-sm">(.xlsx, .xls)</p>
                                    </div>
                                </div>
                                {excelFile && (
                                    <div className="bg-[#252b3b] rounded p-4">
                                        <p className="text-green-400 text-sm mb-2">✓ {excelFile.name} ({Math.round(excelFile.size / 1024)} KB)</p>
                                        {excelPreview.length > 0 && (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left text-gray-400">
                                                    <thead className="text-gray-500 bg-[#1a1b26]">
                                                        <tr>
                                                            {Object.keys(excelPreview[0]).map((key) => (
                                                                <th key={key} className="px-2 py-1">{key}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {excelPreview.map((row, i) => (
                                                            <tr key={i} className="border-b border-gray-700">
                                                                {Object.values(row).map((val: any, j) => (
                                                                    <td key={j} className="px-2 py-1">{String(val)}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <p className="text-xs text-gray-500 mt-2">... 처음 5개 행 미리보기</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Model Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">모델 선택</label>
                        <div className="flex flex-wrap gap-2">
                            {textModels.map(model => (
                                <button
                                    key={model.id}
                                    onClick={() => setSelectedTextModel(model.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${selectedTextModel === model.id ? 'bg-purple-600 border-purple-600 text-white' : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-500'}`}
                                >
                                    {model.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Language & Tone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">언어 선택</label>
                            <div className="flex gap-2">
                                {['Korean', 'English'].map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => setLanguage(lang)}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${language === lang ? 'bg-blue-600 text-white' : 'bg-[#252b3b] text-gray-400 hover:bg-gray-600'}`}
                                    >
                                        {lang === 'Korean' ? '한국어' : '영어'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">포스팅 어투</label>
                            <div className="flex flex-wrap gap-2">
                                {['Friendly', 'Professional', 'Humorous', 'Empathetic'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTone(t)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${tone === t ? 'bg-teal-600 border-teal-600 text-white' : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-500'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Additional Prompt */}
                <section className="bg-[#1f2937] rounded-lg border border-gray-700 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">추가 프롬프트 설정</h2>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input
                                type="checkbox"
                                name="toggle"
                                id="prompt-toggle"
                                checked={useAdditionalPrompt}
                                onChange={(e) => setUseAdditionalPrompt(e.target.checked)}
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-4 checked:border-green-400"
                            />
                            <label htmlFor="prompt-toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${useAdditionalPrompt ? 'bg-green-400' : 'bg-gray-600'}`}></label>
                        </div>
                    </div>

                    {useAdditionalPrompt && (
                        <div className="mt-4">
                            <textarea
                                value={additionalPrompt}
                                onChange={(e) => setAdditionalPrompt(e.target.value)}
                                placeholder="AI에게 전달할 추가 지시사항을 입력하세요..."
                                className="w-full h-32 bg-[#1a1b26] border border-gray-600 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>
                    )}
                </section>

                {/* Publish & Image Settings */}
                <section className="bg-[#1f2937] rounded-lg border border-gray-700 p-6 shadow-lg space-y-6">
                    {/* Publish Settings */}
                    <div>
                        <h2 className="text-lg font-semibold text-white mb-4">발행 설정</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">블로그 선택</label>
                                <select
                                    value={selectedSiteId}
                                    onChange={(e) => setSelectedSiteId(e.target.value)}
                                    className="w-full bg-[#1a1b26] border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                >
                                    {sites.map(site => (
                                        <option key={site.id} value={site.id}>{site.name} ({site.url})</option>
                                    ))}
                                    {sites.length === 0 && <option value="">등록된 블로그가 없습니다</option>}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">발행 상태</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPublishStatus('draft')}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${publishStatus === 'draft' ? 'bg-yellow-600 text-white' : 'bg-[#252b3b] text-gray-400 hover:bg-gray-600'}`}
                                    >
                                        임시저장 (Draft)
                                    </button>
                                    <button
                                        onClick={() => setPublishStatus('publish')}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${publishStatus === 'publish' ? 'bg-green-600 text-white' : 'bg-[#252b3b] text-gray-400 hover:bg-gray-600'}`}
                                    >
                                        즉시 발행 (Publish)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-700" />

                    {/* Image Settings */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">이미지 생성 설정</h2>
                            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                <input
                                    type="checkbox"
                                    id="image-toggle"
                                    checked={useImageGeneration}
                                    onChange={(e) => setUseImageGeneration(e.target.checked)}
                                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-4 checked:border-green-400"
                                />
                                <label htmlFor="image-toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${useImageGeneration ? 'bg-green-400' : 'bg-gray-600'}`}></label>
                            </div>
                        </div>

                        {useImageGeneration && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">이미지 모델</label>
                                <select
                                    value={selectedImageModel}
                                    onChange={(e) => setSelectedImageModel(e.target.value)}
                                    className="w-full bg-[#1a1b26] border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                >
                                    {imageModels.map(model => (
                                        <option key={model.id} value={model.id}>{model.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </section>

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? '프로젝트 생성 중...' : '정보성 포스팅 프로젝트 생성'}
                </button>
            </div>

            <style jsx>{`
                .toggle-checkbox:checked {
                    right: 0;
                    border-color: #68D391;
                }
                .toggle-checkbox:checked + .toggle-label {
                    background-color: #68D391;
                }
            `}</style>
        </div>
    );
}

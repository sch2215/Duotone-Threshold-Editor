import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, SlidersHorizontal, Image as ImageIcon, ArrowDownUp, RotateCcw, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

export default function ImageEditor() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(128);
  const [noise, setNoise] = useState(0);
  const [halftone, setHalftone] = useState(0);
  const [halftoneAngle, setHalftoneAngle] = useState(45);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [blur, setBlur] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [darkColor, setDarkColor] = useState('#f5f5dc'); // Cream
  const [lightColor, setLightColor] = useState('#8b0000'); // Dark Red
  const [transparentLight, setTransparentLight] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const applyEffect = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = img.width;
    canvas.height = img.height;

    // Apply Brightness, Contrast, and Blur
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) blur(${blur}px)`;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const darkRgb = hexToRgb(darkColor);
    const lightRgb = hexToRgb(lightColor);

    const angle = (halftoneAngle * Math.PI) / 180;
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);
    const freq = halftone > 0 ? (Math.PI * 2) / halftone : 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue; // Skip transparent pixels

      // 1. Grayscale
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // 2. Halftone Pattern
      if (halftone > 0) {
        const x = (i / 4) % canvas.width;
        const y = Math.floor((i / 4) / canvas.width);
        const rx = x * cosA - y * sinA;
        const ry = x * sinA + y * cosA;
        const dot = (Math.sin(rx * freq) + Math.sin(ry * freq)) / 2;
        gray = gray + dot * 127;
      }

      // 3. Add Noise
      if (noise > 0) {
        gray += (Math.random() * 2 - 1) * noise;
      }

      // 4. Threshold & Color Mapping
      if (gray < threshold) {
        data[i] = darkRgb.r;
        data[i + 1] = darkRgb.g;
        data[i + 2] = darkRgb.b;
        data[i + 3] = 255;
      } else {
        if (transparentLight) {
          data[i + 3] = 0; // Make transparent
        } else {
          data[i] = lightRgb.r;
          data[i + 1] = lightRgb.g;
          data[i + 2] = lightRgb.b;
          data[i + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [threshold, noise, halftone, halftoneAngle, brightness, contrast, blur, darkColor, lightColor, transparentLight]);

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        applyEffect();
      };
      img.src = imageSrc;
    }
  }, [imageSrc, applyEffect]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'duotone-poster.png';
    link.href = dataUrl;
    link.click();
  };

  const handleReset = () => {
    setThreshold(128);
    setNoise(0);
    setHalftone(0);
    setHalftoneAngle(45);
    setBrightness(100);
    setContrast(100);
    setBlur(0);
    setZoom(1);
    setDarkColor('#f5f5dc');
    setLightColor('#8b0000');
    setTransparentLight(false);
  };

  const handleSwapColors = () => {
    setDarkColor(lightColor);
    setLightColor(darkColor);
  };

  const applyPreset = (dark: string, light: string) => {
    setDarkColor(dark);
    setLightColor(light);
    setTransparentLight(false);
  };

  const colorPresets = [
    { name: '팝아트 1', dark: '#1A1A24', light: '#FF007F', group: 'pop' },
    { name: '팝아트 2', dark: '#4A00E0', light: '#F8E71C', group: 'pop' },
    { name: '팝아트 3', dark: '#D0021B', light: '#50E3C2', group: 'pop' },
    { name: '거친 느낌 1', dark: '#111111', light: '#E65100', group: 'rough' },
    { name: '거친 느낌 2', dark: '#2C3525', light: '#D4C4A8', group: 'rough' },
    { name: '거친 느낌 3', dark: '#2B1B17', light: '#8B0000', group: 'rough' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-neutral-900 text-neutral-100 font-sans">
      {/* Main Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden bg-neutral-950">
        {!imageSrc ? (
          <div className="flex flex-col items-center justify-center space-y-4 text-neutral-500">
            <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center">
              <ImageIcon size={48} className="text-neutral-600" />
            </div>
            <p className="text-lg font-medium">이미지를 열어 작업을 시작하세요</p>
            <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-3 rounded-full transition-colors flex items-center space-x-2">
              <Upload size={20} />
              <span>이미지 열기</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-neutral-800 transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
            />
            
            {/* Zoom Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-neutral-800/90 backdrop-blur p-1.5 rounded-full border border-neutral-700 shadow-lg z-10">
              <button onClick={() => setZoom(z => Math.max(0.25, z - 0.5))} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-full transition-colors" title="축소">
                <ZoomOut size={18} />
              </button>
              <span className="text-xs font-mono w-12 text-center text-neutral-300">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(5, z + 0.5))} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-full transition-colors" title="확대">
                <ZoomIn size={18} />
              </button>
              <div className="w-px h-4 bg-neutral-700 mx-1"></div>
              <button onClick={() => setZoom(1)} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-full transition-colors" title="화면에 맞추기">
                <Maximize size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls Sidebar */}
      <div className="w-full md:w-80 bg-neutral-900 border-t md:border-t-0 md:border-l border-neutral-800 p-6 flex flex-col h-full overflow-y-auto">
        <div className="flex items-center space-x-3 mb-8">
          <SlidersHorizontal className="text-red-500" />
          <h1 className="text-xl font-bold tracking-tight">이중톤(Duotone) 에디터</h1>
        </div>

        <div className="space-y-8 flex-1">
          {/* Upload Control */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">소스 이미지</label>
            <label className="cursor-pointer w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
              <Upload size={18} />
              <span>{imageSrc ? '이미지 교체' : '이미지 열기'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>

          {/* Basic Adjustments */}
          <div className="space-y-4">
            <label className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">기본 조정 (Basic)</label>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs text-neutral-400">명도 (Brightness)</label>
                <span className="text-xs text-neutral-500 font-mono">{brightness}%</span>
              </div>
              <input type="range" min="0" max="200" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-red-500" disabled={!imageSrc} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs text-neutral-400">대비 (Contrast)</label>
                <span className="text-xs text-neutral-500 font-mono">{contrast}%</span>
              </div>
              <input type="range" min="0" max="200" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-red-500" disabled={!imageSrc} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs text-neutral-400">가우시안 흐림 (Gaussian Blur)</label>
                <span className="text-xs text-neutral-500 font-mono">{blur}px</span>
              </div>
              <input type="range" min="0" max="20" step="0.5" value={blur} onChange={(e) => setBlur(Number(e.target.value))} className="w-full accent-red-500" disabled={!imageSrc} />
            </div>
          </div>

          {/* Effects */}
          <div className="space-y-4">
            <label className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">효과 (Effects)</label>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs text-neutral-400">한계값 (Threshold)</label>
                <span className="text-xs text-neutral-500 font-mono">{threshold}</span>
              </div>
              <input type="range" min="0" max="255" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full accent-red-500" disabled={!imageSrc} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs text-neutral-400">하프톤 패턴 (Halftone)</label>
                <span className="text-xs text-neutral-500 font-mono">{halftone}</span>
              </div>
              <input type="range" min="0" max="50" value={halftone} onChange={(e) => setHalftone(Number(e.target.value))} className="w-full accent-red-500" disabled={!imageSrc} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs text-neutral-400">하프톤 각도 (Angle)</label>
                <span className="text-xs text-neutral-500 font-mono">{halftoneAngle}°</span>
              </div>
              <input type="range" min="-90" max="90" value={halftoneAngle} onChange={(e) => setHalftoneAngle(Number(e.target.value))} className="w-full accent-red-500" disabled={!imageSrc || halftone === 0} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs text-neutral-400">노이즈 (Noise)</label>
                <span className="text-xs text-neutral-500 font-mono">{noise}</span>
              </div>
              <input type="range" min="0" max="100" value={noise} onChange={(e) => setNoise(Number(e.target.value))} className="w-full accent-red-500" disabled={!imageSrc} />
            </div>
          </div>

          {/* Color Presets */}
          <div className="space-y-4">
            <label className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">색상 프리셋 (Presets)</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <span className="text-xs text-neutral-500 font-medium">팝아트 (Pop Art)</span>
                <div className="flex flex-col space-y-2">
                  {colorPresets.filter(p => p.group === 'pop').map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyPreset(preset.dark, preset.light)}
                      disabled={!imageSrc}
                      className="flex items-center h-8 rounded overflow-hidden border border-neutral-700 hover:border-neutral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={preset.name}
                    >
                      <div className="w-1/2 h-full" style={{ backgroundColor: preset.dark }}></div>
                      <div className="w-1/2 h-full" style={{ backgroundColor: preset.light }}></div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-neutral-500 font-medium">거친 느낌 (Rough)</span>
                <div className="flex flex-col space-y-2">
                  {colorPresets.filter(p => p.group === 'rough').map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyPreset(preset.dark, preset.light)}
                      disabled={!imageSrc}
                      className="flex items-center h-8 rounded overflow-hidden border border-neutral-700 hover:border-neutral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={preset.name}
                    >
                      <div className="w-1/2 h-full" style={{ backgroundColor: preset.dark }}></div>
                      <div className="w-1/2 h-full" style={{ backgroundColor: preset.light }}></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Color Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">그레이디언트 맵 (Gradient Map)</label>
              <button
                onClick={handleSwapColors}
                disabled={!imageSrc}
                className="text-xs flex items-center space-x-1 text-neutral-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="색상 반전"
              >
                <ArrowDownUp size={14} />
                <span>반전 (Invert)</span>
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg border border-neutral-700">
              <span className="text-sm font-medium">어두운 영역 (Shadows)</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-neutral-500 font-mono uppercase">{darkColor}</span>
                <input
                  type="color"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                  disabled={!imageSrc}
                />
              </div>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${transparentLight ? 'bg-neutral-900 border-neutral-800 opacity-50' : 'bg-neutral-800 border-neutral-700'}`}>
              <span className="text-sm font-medium">밝은 영역 (Highlights)</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-neutral-500 font-mono uppercase">{lightColor}</span>
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                  disabled={!imageSrc || transparentLight}
                />
              </div>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={transparentLight}
                onChange={(e) => setTransparentLight(e.target.checked)}
                disabled={!imageSrc}
                className="rounded border-neutral-700 bg-neutral-800 text-red-500 focus:ring-red-500 focus:ring-offset-neutral-900"
              />
              <span className="text-sm text-neutral-400">밝은 영역 투명화 (Transparent)</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-6 mt-6 border-t border-neutral-800 space-y-3">
          <button
            onClick={handleReset}
            disabled={!imageSrc}
            className="w-full bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:cursor-not-allowed text-white font-medium px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <RotateCcw size={18} />
            <span>초기화 (Reset)</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={!imageSrc}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-white font-medium px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Download size={18} />
            <span>내보내기 (Export)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

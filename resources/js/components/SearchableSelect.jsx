import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function SearchableSelect({ value, onChange, options = [], placeholder = 'Seleccionar...', disabled = false, className = '' }) {
    const { isDark } = useTheme();
    const [open, setOpen]       = useState(false);
    const [query, setQuery]     = useState('');
    const [pos, setPos]         = useState({ top: 0, left: 0, width: 0, openUp: false });
    const triggerRef            = useRef(null);
    const inputRef              = useRef(null);

    const selected = options.find(o => String(o.value) === String(value));

    const filtered = query.trim()
        ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
        : options;

    // Calcular posición al abrir
    const handleOpen = () => {
        if (disabled) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropH = Math.min(filtered.length * 36 + 80, 280);
        const openUp = spaceBelow < dropH && rect.top > dropH;
        setPos({
            top:    openUp ? rect.top - dropH - 4 : rect.bottom + 4,
            left:   rect.left,
            width:  rect.width,
            openUp,
        });
        setOpen(o => !o);
    };

    // Cerrar al hacer click fuera
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (triggerRef.current && !triggerRef.current.contains(e.target)) {
                // Verificar si el click fue dentro del dropdown (portal)
                const dropdown = document.getElementById('searchable-select-dropdown');
                if (dropdown && dropdown.contains(e.target)) return;
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Enfocar input al abrir
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    // Recalcular posición si la ventana cambia de tamaño
    useEffect(() => {
        if (!open) return;
        const handler = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropH = Math.min(filtered.length * 36 + 80, 280);
            const openUp = spaceBelow < dropH && rect.top > dropH;
            setPos({ top: openUp ? rect.top - dropH - 4 : rect.bottom + 4, left: rect.left, width: rect.width, openUp });
        };
        window.addEventListener('resize', handler);
        window.addEventListener('scroll', handler, true);
        return () => { window.removeEventListener('resize', handler); window.removeEventListener('scroll', handler, true); };
    }, [open, filtered.length]);

    const handleSelect = (opt) => {
        onChange(opt.value);
        setOpen(false);
        setQuery('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
    };

    const triggerCls = `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-400 focus:outline-none'}`;

    const dropdown = open && createPortal(
        <div
            id="searchable-select-dropdown"
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
            className={`rounded-lg border shadow-xl ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
        >
            {/* Buscador */}
            <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <Search size={13} className="text-gray-400 flex-shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar..."
                    className={`flex-1 bg-transparent text-sm outline-none ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                />
                {query && (
                    <button type="button" onClick={() => setQuery('')}>
                        <X size={12} className="text-gray-400" />
                    </button>
                )}
            </div>

            {/* Lista */}
            <ul className="max-h-52 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                    <li className={`px-3 py-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Sin resultados</li>
                ) : filtered.map(opt => (
                    <li
                        key={opt.value}
                        onMouseDown={() => handleSelect(opt)}
                        className={`px-3 py-2 text-sm cursor-pointer truncate ${
                            String(opt.value) === String(value)
                                ? isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 font-medium'
                                : isDark ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-50'
                        }`}
                    >
                        {opt.label}
                    </li>
                ))}
            </ul>

            {options.length > 0 && (
                <div className={`px-3 py-1.5 text-xs border-t ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                    {filtered.length} de {options.length} personas
                </div>
            )}
        </div>,
        document.body
    );

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                ref={triggerRef}
                disabled={disabled}
                onClick={handleOpen}
                className={triggerCls}
            >
                <span className={`truncate flex-1 text-left ${!selected ? 'text-gray-400' : ''}`}>
                    {selected ? selected.label : placeholder}
                </span>
                <span className="flex items-center gap-1 flex-shrink-0">
                    {selected && !disabled && (
                        <span onMouseDown={handleClear} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400">
                            <X size={12} />
                        </span>
                    )}
                    <ChevronDown size={14} className={`transition-transform text-gray-400 ${open ? 'rotate-180' : ''}`} />
                </span>
            </button>
            {dropdown}
        </div>
    );
}

import React from 'react';

/**
 * Logo KokiKasir
 * Desain gabungan antara "Topi Koki" dan "Tablet/Monitor" 
 * dengan gaya line-art bernuansa warna hijau giok (emerald).
 */
export default function Logo({ size = 'md', showText = true, className = '' }) {
  const dimensions = {
    sm: { box: 'w-8 h-8', svg: 'w-7 h-7', text: 'text-base font-bold', sub: 'text-[9px]' },
    md: { box: 'w-10 h-10', svg: 'w-9 h-9', text: 'text-lg font-bold', sub: 'text-[10px]' },
    lg: { box: 'w-14 h-14', svg: 'w-12 h-12', text: 'text-2xl font-extrabold', sub: 'text-xs' },
    xl: { box: 'w-20 h-20', svg: 'w-16 h-16', text: 'text-3xl font-extrabold', sub: 'text-sm' },
  }[size] || { box: 'w-10 h-10', svg: 'w-9 h-9', text: 'text-lg font-bold', sub: 'text-[10px]' };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${dimensions.box} rounded-2xl bg-white shadow-sm shadow-emerald-200/60 border border-emerald-100 flex items-center justify-center p-1 relative flex-shrink-0 transition-transform duration-300 hover:scale-105`}>
        <svg
          viewBox="0 0 100 100"
          className={`${dimensions.svg} text-emerald-600`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Tablet Frame */}
          <rect
            x="18"
            y="24"
            width="64"
            height="66"
            rx="14"
            className="fill-white stroke-emerald-600"
            strokeWidth="5"
          />
          
          {/* Screen Area */}
          <rect
            x="26"
            y="33"
            width="48"
            height="40"
            rx="7"
            className="fill-emerald-50 stroke-emerald-500"
            strokeWidth="2.5"
          />
          
          {/* POS Receipt / Graph Lines */}
          <path d="M34 42H52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M34 50H66" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
          <path d="M34 58H46" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          
          {/* Tablet Home Bar */}
          <rect x="42" y="80" width="16" height="3" rx="1.5" className="fill-emerald-600" />

          {/* Chef Hat atop Tablet */}
          <g transform="translate(0, -3)">
            {/* Base band */}
            <rect
              x="34"
              y="20"
              width="32"
              height="7"
              rx="3"
              className="fill-white stroke-emerald-600"
              strokeWidth="3.5"
            />
            {/* Hat Clouds */}
            <path
              d="M35 20C30 15 32 7 41 7C43.5 7 46 8.5 48 11C50 6.5 56.5 5.5 60.5 9.5C64.5 13 64 17.5 63 20"
              className="fill-emerald-50 stroke-emerald-600"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M49 12V19" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1">
            <span className={`${dimensions.text} tracking-tight text-emerald-950 font-black`}>
              Koki<span className="text-emerald-600">Kasir</span>
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5"></span>
          </div>
          <span className={`${dimensions.sub} text-emerald-700/80 font-semibold tracking-wide uppercase`}>
            POS Ramah Koki
          </span>
        </div>
      )}
    </div>
  );
}

import React from 'react'
import { Power } from 'lucide-react'

interface TactileLaunchSwitchProps {
  isRunning: boolean
  onToggle: () => void
}

export function TactileLaunchSwitch({ isRunning, onToggle }: TactileLaunchSwitchProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 select-none">
      {/* Recessed Capsule Socket */}
      <div
        className="tactile-socket rounded-full p-2 flex flex-col items-center justify-center border"
        style={{
          background: '#090C10',
          borderColor: 'rgba(255, 255, 255, 0.06)',
          width: '84px',
          height: '110px',
        }}
      >
        {/* Embossed Hardware Push Button */}
        <button
          onClick={onToggle}
          className="tactile-button relative w-16 h-16 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
          style={{
            background: isRunning
              ? 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)'
              : 'linear-gradient(180deg, #263143 0%, #151C28 100%)',
            border: isRunning
              ? '1.5px solid rgba(255, 51, 75, 0.5)'
              : '1.5px solid rgba(0, 229, 255, 0.4)',
          }}
          aria-label={isRunning ? 'Stop Speed Test' : 'Start Speed Test'}
        >
          {/* LED Ring Indicator on Button Surface */}
          <div
            className="w-1.5 h-1.5 rounded-full mb-1 transition-all"
            style={{
              background: isRunning ? '#FF334B' : '#00E676',
              boxShadow: isRunning
                ? '0 0 8px #FF334B'
                : '0 0 8px #00E676',
            }}
          />

          <Power
            size={22}
            className="transition-colors"
            style={{
              color: isRunning ? '#FF334B' : '#00E5FF',
              filter: isRunning
                ? 'drop-shadow(0 0 6px rgba(255, 51, 75, 0.6))'
                : 'drop-shadow(0 0 6px rgba(0, 229, 255, 0.6))',
            }}
          />

          <span
            className="text-[9px] font-black uppercase tracking-wider font-mono mt-0.5"
            style={{ color: isRunning ? '#FF334B' : '#F8FAFC' }}
          >
            {isRunning ? 'STOP' : 'START'}
          </span>
        </button>
      </div>

      <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#64748B]">
        {isRunning ? 'CLICK TO ABORT' : 'PUSH TO TEST'}
      </span>
    </div>
  )
}

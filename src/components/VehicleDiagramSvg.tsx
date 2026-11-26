import React from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { VehiclePartId, VehicleType, VehicleView } from '../types/models';

interface VehicleDiagramSvgProps {
  vehicleType?: VehicleType;
  view: VehicleView;
  selectedParts: VehiclePartId[];
  onTogglePart: (partId: VehiclePartId) => void;
  partOperationCounts?: Partial<Record<VehiclePartId, number>>;
  t: TranslationDictionary;
}

interface SelectableRegionProps {
  partId: VehiclePartId;
  selected: boolean;
  opCount?: number;
  label: string;
  onToggle: (id: VehiclePartId) => void;
  children: (fill: string, stroke: string, strokeWidth: number) => React.ReactNode;
}

const SelectableRegion: React.FC<SelectableRegionProps> = ({
  partId,
  selected,
  label,
  onToggle,
  children,
}) => {
  const fill = selected ? 'rgba(37, 99, 235, 0.34)' : 'rgba(148, 163, 184, 0.14)';
  const stroke = selected ? '#2563EB' : '#64748B';
  const strokeWidth = selected ? 2.5 : 1.5;

  const handleKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(partId);
    }
  };

  return (
    <g
      data-part-id={partId}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(partId);
      }}
      onKeyDown={handleKeyDown}
      className="cursor-pointer transition-opacity focus:outline-none hover:opacity-85"
    >
      <title>{label}</title>
      {children(fill, stroke, strokeWidth)}
    </g>
  );
};

export const VehicleDiagramSvg: React.FC<VehicleDiagramSvgProps> = ({
  vehicleType = 'car',
  view,
  selectedParts,
  onTogglePart,
  partOperationCounts,
  t,
}) => {
  const isFullRespray = selectedParts.includes('full_respray');
  const isSelected = (id: VehiclePartId) => isFullRespray || selectedParts.includes(id);

  const renderRegion = (
    partId: VehiclePartId,
    renderShape: (fill: string, stroke: string, sw: number) => React.ReactNode
  ) => (
    <SelectableRegion
      key={`${vehicleType}_${view}_${partId}`}
      partId={partId}
      selected={isSelected(partId)}
      opCount={partOperationCounts?.[partId]}
      label={t.parts[partId]}
      onToggle={onTogglePart}
    >
      {renderShape}
    </SelectableRegion>
  );

  // =========================================================================
  // VAN / BUS DIAGRAM (Sprinter / Crafter / Transit)
  // =========================================================================
  if (vehicleType === 'van') {
    if (view === 'top') {
      return (
        <svg viewBox="0 0 320 500" className="w-full max-w-[290px] mx-auto select-none">
          <rect
            x="64"
            y="24"
            width="192"
            height="452"
            rx="28"
            className="fill-slate-100 dark:fill-slate-800/70 stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          {renderRegion('front_bumper', (f, s, sw) => (
            <path d="M80 42 C96 22, 224 22, 240 42 L248 64 L72 64 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('hood', (f, s, sw) => (
            <path d="M84 66 L236 66 L228 116 L92 116 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('hood_inner', (f, s, sw) => (
            <rect x="122" y="76" width="76" height="30" rx="5" fill={f} stroke={s} strokeWidth={sw} strokeDasharray="4 2" />
          ))}
          {renderRegion('front_left_fender', (f, s, sw) => (
            <path d="M64 66 L82 66 L90 116 L64 126 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('front_right_fender', (f, s, sw) => (
            <path d="M238 66 L256 66 L256 126 L230 116 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          <path d="M94 120 L226 120 L216 164 L104 164 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60" strokeWidth="1.2" />
          {renderRegion('left_a_pillar', (f, s, sw) => (
            <path d="M84 118 L94 118 L102 164 L90 164 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('right_a_pillar', (f, s, sw) => (
            <path d="M226 118 L236 118 L230 164 L218 164 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('left_mirror', (f, s, sw) => (
            <rect x="34" y="132" width="26" height="22" rx="6" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('right_mirror', (f, s, sw) => (
            <rect x="260" y="132" width="26" height="22" rx="6" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('front_left_door', (f, s, sw) => (
            <rect x="64" y="130" width="32" height="92" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('front_right_door', (f, s, sw) => (
            <rect x="224" y="130" width="32" height="92" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('van_sliding_door_left', (f, s, sw) => (
            <rect x="64" y="226" width="32" height="106" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('van_sliding_door_right', (f, s, sw) => (
            <rect x="224" y="226" width="32" height="106" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('van_left_upper_panel', (f, s, sw) => (
            <rect x="64" y="336" width="32" height="106" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('van_right_upper_panel', (f, s, sw) => (
            <rect x="224" y="336" width="32" height="106" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('van_high_roof', (f, s, sw) => (
            <rect x="102" y="168" width="116" height="272" rx="10" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('van_rear_left_door', (f, s, sw) => (
            <rect x="74" y="446" width="84" height="18" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('van_rear_right_door', (f, s, sw) => (
            <rect x="162" y="446" width="84" height="18" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('rear_bumper', (f, s, sw) => (
            <path d="M70 466 L250 466 L244 484 C216 490, 104 490, 76 484 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
        </svg>
      );
    }

    if (view === 'front') {
      return (
        <svg viewBox="0 0 360 270" className="w-full max-w-[340px] mx-auto select-none">
          <rect x="44" y="212" width="44" height="44" rx="8" className="fill-slate-700 dark:fill-slate-900" />
          <rect x="272" y="212" width="44" height="44" rx="8" className="fill-slate-700 dark:fill-slate-900" />
          {renderRegion('van_high_roof', (f, s, sw) => (
            <path d="M84 20 C120 10, 240 10, 276 20 L282 72 L78 72 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          <path d="M90 76 L270 76 L282 142 L78 142 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60" strokeWidth="1.5" />
          {renderRegion('right_a_pillar', (f, s, sw) => (
            <path d="M74 74 L90 74 L78 142 L60 142 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('left_a_pillar', (f, s, sw) => (
            <path d="M270 74 L286 74 L300 142 L282 142 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('right_mirror', (f, s, sw) => (
            <rect x="22" y="102" width="32" height="34" rx="6" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('left_mirror', (f, s, sw) => (
            <rect x="306" y="102" width="32" height="34" rx="6" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('hood', (f, s, sw) => (
            <path d="M76 144 L284 144 L270 176 L90 176 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('hood_inner', (f, s, sw) => (
            <rect x="132" y="151" width="96" height="18" rx="4" fill={f} stroke={s} strokeWidth={sw} strokeDasharray="4 2" />
          ))}
          {renderRegion('front_right_fender', (f, s, sw) => (
            <path d="M44 150 L74 144 L86 186 L44 190 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('front_left_fender', (f, s, sw) => (
            <path d="M286 144 L316 150 L316 190 L274 186 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('front_grille', (f, s, sw) => (
            <rect x="116" y="178" width="128" height="28" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('front_bumper', (f, s, sw) => (
            <path d="M38 192 L114 192 L114 210 L246 210 L246 192 L322 192 L318 232 C270 238, 90 238, 42 232 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
        </svg>
      );
    }

    if (view === 'rear') {
      return (
        <svg viewBox="0 0 360 270" className="w-full max-w-[340px] mx-auto select-none">
          <rect x="44" y="212" width="44" height="44" rx="8" className="fill-slate-700 dark:fill-slate-900" />
          <rect x="272" y="212" width="44" height="44" rx="8" className="fill-slate-700 dark:fill-slate-900" />
          {renderRegion('van_high_roof', (f, s, sw) => (
            <path d="M74 20 C120 10, 240 10, 286 20 L292 64 L68 64 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('van_rear_left_door', (f, s, sw) => (
            <rect x="70" y="68" width="108" height="132" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('van_rear_right_door', (f, s, sw) => (
            <rect x="182" y="68" width="108" height="132" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          <rect x="86" y="80" width="76" height="48" rx="4" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/50 pointer-events-none" strokeWidth="1" />
          <rect x="198" y="80" width="76" height="48" rx="4" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/50 pointer-events-none" strokeWidth="1" />
          {renderRegion('trunk_jamb', (f, s, sw) => (
            <rect x="132" y="182" width="96" height="16" rx="4" fill={f} stroke={s} strokeWidth={sw} strokeDasharray="4 2" />
          ))}
          {renderRegion('rear_bumper', (f, s, sw) => (
            <path d="M44 202 L316 202 L312 234 C260 240, 100 240, 48 234 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
        </svg>
      );
    }

    if (view === 'left') {
      return (
        <svg viewBox="0 0 480 280" className="w-full max-w-[430px] mx-auto select-none">
          <circle cx="104" cy="182" r="30" className="fill-slate-700 dark:fill-slate-900 stroke-slate-500" strokeWidth="4" />
          <circle cx="104" cy="182" r="14" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="372" cy="182" r="30" className="fill-slate-700 dark:fill-slate-900 stroke-slate-500" strokeWidth="4" />
          <circle cx="372" cy="182" r="14" className="fill-slate-300 dark:fill-slate-600" />

          {renderRegion('front_bumper', (f, s, sw) => (
            <path d="M22 142 L56 132 L66 178 L24 178 C18 168, 18 152, 22 142 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('hood', (f, s, sw) => (
            <path d="M40 128 L108 106 L108 122 L42 138 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('front_left_fender', (f, s, sw) => (
            <path d="M56 130 L138 118 L142 178 L134 178 A32 32 0 0 0 74 178 L64 178 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('front_left_arch', (f, s, sw) => (
            <path d="M66 178 A40 40 0 0 1 142 178 L132 178 A30 30 0 0 0 76 178 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('left_a_pillar', (f, s, sw) => (
            <path d="M108 104 L152 38 L164 44 L122 106 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('van_high_roof', (f, s, sw) => (
            <path d="M154 32 L442 32 L446 60 L158 60 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('front_left_door', (f, s, sw) => (
            <path d="M142 62 L214 62 L214 174 L144 174 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          <path d="M126 106 L160 66 L206 66 L206 106 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60 pointer-events-none" strokeWidth="1" />
          {renderRegion('left_mirror', (f, s, sw) => (
            <rect x="130" y="92" width="18" height="26" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('van_sliding_door_left', (f, s, sw) => (
            <rect x="218" y="62" width="106" height="112" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('van_left_upper_panel', (f, s, sw) => (
            <path d="M328 62 L444 62 L442 174 L404 174 A32 32 0 0 0 340 174 L328 174 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('rear_left_arch', (f, s, sw) => (
            <path d="M334 178 A40 40 0 0 1 410 178 L400 178 A30 30 0 0 0 344 178 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('left_sill', (f, s, sw) => (
            <rect x="142" y="176" width="192" height="12" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('rear_bumper', (f, s, sw) => (
            <rect x="424" y="150" width="34" height="32" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          <line x1="120" y1="216" x2="360" y2="216" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
          {renderRegion('front_left_jamb', (f, s, sw) => (
            <path d="M148 224 L224 224 L224 268 L140 268 Z M156 230 L148 262 L216 262 L216 230 Z" fill={f} fillRule="evenodd" stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('rear_left_jamb', (f, s, sw) => (
            <path d="M236 224 L326 224 L326 268 L236 268 Z M244 230 L244 262 L318 262 L318 230 Z" fill={f} fillRule="evenodd" stroke={s} strokeWidth={sw} />
          ))}
        </svg>
      );
    }

    // Van right view
    return (
      <svg viewBox="0 0 480 280" className="w-full max-w-[430px] mx-auto select-none">
        <circle cx="108" cy="182" r="30" className="fill-slate-700 dark:fill-slate-900 stroke-slate-500" strokeWidth="4" />
        <circle cx="108" cy="182" r="14" className="fill-slate-300 dark:fill-slate-600" />
        <circle cx="376" cy="182" r="30" className="fill-slate-700 dark:fill-slate-900 stroke-slate-500" strokeWidth="4" />
        <circle cx="376" cy="182" r="14" className="fill-slate-300 dark:fill-slate-600" />

        {renderRegion('rear_bumper', (f, s, sw) => (
          <rect x="22" y="150" width="34" height="32" rx="4" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('van_high_roof', (f, s, sw) => (
          <path d="M38 32 L326 32 L322 60 L34 60 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {renderRegion('van_right_upper_panel', (f, s, sw) => (
          <path d="M36 62 L152 62 L152 174 L140 174 A32 32 0 0 0 76 174 L38 174 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('fuel_door', (f, s, sw) => (
          <rect x="234" y="132" width="18" height="14" rx="3" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('rear_right_arch', (f, s, sw) => (
          <path d="M70 178 A40 40 0 0 1 146 178 L136 178 A30 30 0 0 0 80 178 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('van_sliding_door_right', (f, s, sw) => (
          <rect x="156" y="62" width="106" height="112" rx="3" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('right_sill', (f, s, sw) => (
          <rect x="146" y="176" width="192" height="12" rx="3" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('front_right_door', (f, s, sw) => (
          <path d="M266 62 L338 62 L336 174 L266 174 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        <path d="M274 66 L320 66 L354 106 L274 106 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60 pointer-events-none" strokeWidth="1" />
        {renderRegion('right_mirror', (f, s, sw) => (
          <rect x="332" y="92" width="18" height="26" rx="4" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('right_a_pillar', (f, s, sw) => (
          <path d="M328 38 L372 104 L358 106 L316 44 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('front_right_fender', (f, s, sw) => (
          <path d="M342 118 L424 130 L416 178 L406 178 A32 32 0 0 0 346 178 L338 178 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('front_right_arch', (f, s, sw) => (
          <path d="M338 178 A40 40 0 0 1 414 178 L404 178 A30 30 0 0 0 348 178 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('hood', (f, s, sw) => (
          <path d="M372 106 L440 128 L438 138 L372 122 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('front_bumper', (f, s, sw) => (
          <path d="M424 132 L458 142 C462 152, 462 168, 456 178 L414 178 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        <line x1="120" y1="216" x2="360" y2="216" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
        {renderRegion('rear_right_jamb', (f, s, sw) => (
          <path d="M154 224 L244 224 L244 268 L154 268 Z M162 230 L162 262 L236 262 L236 230 Z" fill={f} fillRule="evenodd" stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('front_right_jamb', (f, s, sw) => (
          <path d="M256 224 L332 224 L340 268 L256 268 Z M264 230 L264 262 L332 262 L324 230 Z" fill={f} fillRule="evenodd" stroke={s} strokeWidth={sw} />
        ))}
      </svg>
    );
  }

  // =========================================================================
  // TRUCK CAB DIAGRAM (Semi / Cab-Over / Фура)
  // =========================================================================
  if (vehicleType === 'truck') {
    if (view === 'top') {
      return (
        <svg viewBox="0 0 320 420" className="w-full max-w-[290px] mx-auto select-none">
          <rect
            x="64"
            y="24"
            width="192"
            height="360"
            rx="22"
            className="fill-slate-100 dark:fill-slate-800/70 stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          {renderRegion('front_bumper', (f, s, sw) => (
            <rect x="64" y="24" width="192" height="24" rx="8" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_front_panel', (f, s, sw) => (
            <rect x="70" y="52" width="180" height="36" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_visor', (f, s, sw) => (
            <rect x="76" y="92" width="168" height="16" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          <path d="M84 110 L236 110 L230 142 L90 142 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60" strokeWidth="1.2" />
          {renderRegion('left_a_pillar', (f, s, sw) => (
            <rect x="66" y="108" width="16" height="36" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('right_a_pillar', (f, s, sw) => (
            <rect x="238" y="108" width="16" height="36" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('left_mirror', (f, s, sw) => (
            <rect x="28" y="114" width="32" height="26" rx="6" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('right_mirror', (f, s, sw) => (
            <rect x="260" y="114" width="32" height="26" rx="6" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('front_left_door', (f, s, sw) => (
            <rect x="64" y="148" width="30" height="84" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('front_right_door', (f, s, sw) => (
            <rect x="226" y="148" width="30" height="84" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_cab_roof', (f, s, sw) => (
            <rect x="98" y="148" width="124" height="132" rx="10" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_sleeper_left', (f, s, sw) => (
            <rect x="64" y="236" width="30" height="58" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_sleeper_right', (f, s, sw) => (
            <rect x="226" y="236" width="30" height="58" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_rear_wall', (f, s, sw) => (
            <rect x="74" y="284" width="172" height="20" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_side_fairing_left', (f, s, sw) => (
            <rect x="64" y="308" width="32" height="72" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_side_fairing_right', (f, s, sw) => (
            <rect x="224" y="308" width="32" height="72" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
        </svg>
      );
    }

    if (view === 'front') {
      return (
        <svg viewBox="0 0 360 300" className="w-full max-w-[340px] mx-auto select-none">
          <rect x="46" y="242" width="46" height="46" rx="8" className="fill-slate-700 dark:fill-slate-900" />
          <rect x="268" y="242" width="46" height="46" rx="8" className="fill-slate-700 dark:fill-slate-900" />
          {renderRegion('truck_cab_roof', (f, s, sw) => (
            <path d="M84 18 C126 6, 234 6, 276 18 L286 62 L74 62 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
          ))}
          {renderRegion('truck_visor', (f, s, sw) => (
            <path d="M68 64 L292 64 L286 80 L74 80 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          <rect x="84" y="84" width="192" height="56" rx="4" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60" strokeWidth="1.5" />
          {renderRegion('right_a_pillar', (f, s, sw) => (
            <rect x="64" y="82" width="18" height="60" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('left_a_pillar', (f, s, sw) => (
            <rect x="278" y="82" width="18" height="60" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('right_mirror', (f, s, sw) => (
            <rect x="24" y="82" width="30" height="58" rx="6" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('left_mirror', (f, s, sw) => (
            <rect x="306" y="82" width="30" height="58" rx="6" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_front_panel', (f, s, sw) => (
            <rect x="64" y="144" width="232" height="36" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('front_grille', (f, s, sw) => (
            <rect x="104" y="182" width="152" height="36" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_fender_right', (f, s, sw) => (
            <rect x="50" y="184" width="48" height="36" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_fender_left', (f, s, sw) => (
            <rect x="262" y="184" width="48" height="36" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('front_bumper', (f, s, sw) => (
            <rect x="44" y="222" width="272" height="30" rx="5" fill={f} stroke={s} strokeWidth={sw} />
          ))}
        </svg>
      );
    }

    if (view === 'rear') {
      return (
        <svg viewBox="0 0 360 290" className="w-full max-w-[340px] mx-auto select-none">
          <rect x="52" y="230" width="46" height="46" rx="8" className="fill-slate-700 dark:fill-slate-900" />
          <rect x="262" y="230" width="46" height="46" rx="8" className="fill-slate-700 dark:fill-slate-900" />
          {renderRegion('truck_cab_roof', (f, s, sw) => (
            <path d="M84 20 C124 8, 236 8, 276 20 L286 64 L74 64 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_sleeper_left', (f, s, sw) => (
            <rect x="68" y="68" width="32" height="122" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_sleeper_right', (f, s, sw) => (
            <rect x="260" y="68" width="32" height="122" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_rear_wall', (f, s, sw) => (
            <rect x="104" y="68" width="152" height="122" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_side_fairing_left', (f, s, sw) => (
            <rect x="60" y="194" width="60" height="42" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_side_fairing_right', (f, s, sw) => (
            <rect x="240" y="194" width="60" height="42" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
        </svg>
      );
    }

    if (view === 'left') {
      return (
        <svg viewBox="0 0 460 295" className="w-full max-w-[430px] mx-auto select-none">
          <circle cx="106" cy="206" r="32" className="fill-slate-700 dark:fill-slate-900 stroke-slate-500" strokeWidth="4" />
          <circle cx="106" cy="206" r="14" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="356" cy="206" r="32" className="fill-slate-700 dark:fill-slate-900 stroke-slate-500" strokeWidth="4" />
          <circle cx="356" cy="206" r="14" className="fill-slate-300 dark:fill-slate-600" />

          {renderRegion('truck_cab_roof', (f, s, sw) => (
            <path d="M74 34 C110 18, 224 18, 248 26 L248 64 L66 64 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_visor', (f, s, sw) => (
            <path d="M46 66 L76 66 L74 80 L44 76 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('left_a_pillar', (f, s, sw) => (
            <rect x="64" y="68" width="16" height="54" rx="2" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          <rect x="82" y="70" width="62" height="50" rx="3" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60 pointer-events-none" strokeWidth="1" />
          {renderRegion('left_mirror', (f, s, sw) => (
            <rect x="44" y="82" width="18" height="36" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_front_panel', (f, s, sw) => (
            <rect x="52" y="124" width="38" height="58" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('front_left_door', (f, s, sw) => (
            <rect x="94" y="70" width="76" height="106" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_sleeper_left', (f, s, sw) => (
            <rect x="174" y="68" width="74" height="114" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('front_bumper', (f, s, sw) => (
            <rect x="42" y="186" width="52" height="28" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_fender_left', (f, s, sw) => (
            <path d="M68 182 A42 42 0 0 1 146 182 L138 182 A34 34 0 0 0 76 182 Z" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_step_left', (f, s, sw) => (
            <rect x="148" y="180" width="42" height="28" rx="3" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          {renderRegion('truck_side_fairing_left', (f, s, sw) => (
            <rect x="196" y="164" width="128" height="46" rx="4" fill={f} stroke={s} strokeWidth={sw} />
          ))}
          <line x1="120" y1="242" x2="340" y2="242" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
          {renderRegion('front_left_jamb', (f, s, sw) => (
            <path d="M180 250 L256 250 L256 290 L180 290 Z M188 256 L188 284 L248 284 L248 256 Z" fill={f} fillRule="evenodd" stroke={s} strokeWidth={sw} />
          ))}
        </svg>
      );
    }

    // Truck right view
    return (
      <svg viewBox="0 0 460 295" className="w-full max-w-[430px] mx-auto select-none">
        <circle cx="104" cy="206" r="32" className="fill-slate-700 dark:fill-slate-900 stroke-slate-500" strokeWidth="4" />
        <circle cx="104" cy="206" r="14" className="fill-slate-300 dark:fill-slate-600" />
        <circle cx="354" cy="206" r="32" className="fill-slate-700 dark:fill-slate-900 stroke-slate-500" strokeWidth="4" />
        <circle cx="354" cy="206" r="14" className="fill-slate-300 dark:fill-slate-600" />

        {renderRegion('truck_cab_roof', (f, s, sw) => (
          <path d="M212 26 C236 18, 350 18, 386 34 L394 64 L212 64 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('truck_visor', (f, s, sw) => (
          <path d="M384 66 L414 66 L416 76 L386 80 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('right_a_pillar', (f, s, sw) => (
          <rect x="380" y="68" width="16" height="54" rx="2" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        <rect x="316" y="70" width="62" height="50" rx="3" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60 pointer-events-none" strokeWidth="1" />
        {renderRegion('right_mirror', (f, s, sw) => (
          <rect x="398" y="82" width="18" height="36" rx="4" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('truck_front_panel', (f, s, sw) => (
          <rect x="370" y="124" width="38" height="58" rx="4" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('front_right_door', (f, s, sw) => (
          <rect x="290" y="70" width="76" height="106" rx="3" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('truck_sleeper_right', (f, s, sw) => (
          <rect x="212" y="68" width="74" height="114" rx="3" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('front_bumper', (f, s, sw) => (
          <rect x="366" y="186" width="52" height="28" rx="4" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('truck_fender_right', (f, s, sw) => (
          <path d="M314 182 A42 42 0 0 1 392 182 L384 182 A34 34 0 0 0 322 182 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('truck_step_right', (f, s, sw) => (
          <rect x="270" y="180" width="42" height="28" rx="3" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('truck_side_fairing_right', (f, s, sw) => (
          <rect x="136" y="164" width="128" height="46" rx="4" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        <line x1="120" y1="242" x2="340" y2="242" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
        {renderRegion('front_right_jamb', (f, s, sw) => (
          <path d="M204 250 L280 250 L280 290 L204 290 Z M212 256 L212 284 L272 284 L272 256 Z" fill={f} fillRule="evenodd" stroke={s} strokeWidth={sw} />
        ))}
      </svg>
    );
  }

  // =========================================================================
  // PASSENGER CAR DIAGRAM (Default 'car')
  // =========================================================================
  if (view === 'top') {
    return (
      <svg viewBox="0 0 320 470" className="w-full max-w-[290px] mx-auto select-none">
        {/* Non-selectable chassis base shadow */}
        <rect x="64" y="24" width="192" height="422" rx="46" className="fill-slate-100 dark:fill-slate-800/70 stroke-slate-300 dark:stroke-slate-700" strokeWidth="1.5" />

        {/* Front Bumper */}
        {renderRegion('front_bumper', (f, s, sw) => (
          <path d="M84 44 C100 22, 220 22, 236 44 L244 66 L76 66 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Hood (outer) */}
        {renderRegion('hood', (f, s, sw) => (
          <path d="M86 68 L234 68 L224 148 L96 148 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Hood Inner Side inset */}
        {renderRegion('hood_inner', (f, s, sw) => (
          <rect x="122" y="88" width="76" height="40" rx="6" fill={f} stroke={s} strokeWidth={sw} strokeDasharray="4 2" />
        ))}

        {/* Front Left & Right Fenders */}
        {renderRegion('front_left_fender', (f, s, sw) => (
          <path d="M64 68 L84 68 L94 148 L64 156 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {renderRegion('front_right_fender', (f, s, sw) => (
          <path d="M236 68 L256 68 L256 156 L226 148 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Windshield (non-selectable decorative glass) */}
        <path d="M98 152 L222 152 L212 198 L108 198 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60" strokeWidth="1.2" />

        {/* A-Pillars (Left & Right windshield pillars) */}
        {renderRegion('left_a_pillar', (f, s, sw) => (
          <path d="M86 150 L98 150 L106 200 L94 200 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {renderRegion('right_a_pillar', (f, s, sw) => (
          <path d="M222 150 L234 150 L226 200 L214 200 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Left & Right Mirrors */}
        {renderRegion('left_mirror', (f, s, sw) => (
          <path d="M40 164 L64 166 L64 186 L42 184 C36 180, 36 168, 40 164 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('right_mirror', (f, s, sw) => (
          <path d="M280 164 L256 166 L256 186 L278 184 C284 180, 284 168, 280 164 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}

        {/* Roof */}
        {renderRegion('roof', (f, s, sw) => (
          <rect x="104" y="202" width="112" height="114" rx="10" fill={f} stroke={s} strokeWidth={sw} />
        ))}

        {/* Front & Rear Doors (Left) */}
        {renderRegion('front_left_door', (f, s, sw) => (
          <path d="M64 160 L98 160 L98 258 L64 258 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {renderRegion('rear_left_door', (f, s, sw) => (
          <path d="M64 262 L98 262 L98 348 L64 348 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Front & Rear Doors (Right) */}
        {renderRegion('front_right_door', (f, s, sw) => (
          <path d="M222 160 L256 160 L256 258 L222 258 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {renderRegion('rear_right_door', (f, s, sw) => (
          <path d="M222 262 L256 262 L256 348 L222 348 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Rear Window */}
        <path d="M108 320 L212 320 L220 358 L100 358 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60" strokeWidth="1.2" />

        {/* C-Pillars (Left & Right rear pillars) */}
        {renderRegion('left_c_pillar', (f, s, sw) => (
          <path d="M94 318 L106 318 L100 360 L88 360 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {renderRegion('right_c_pillar', (f, s, sw) => (
          <path d="M214 318 L226 318 L232 360 L220 360 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Rear Quarters */}
        {renderRegion('rear_left_quarter', (f, s, sw) => (
          <path d="M64 352 L96 352 L94 408 L68 408 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {renderRegion('rear_right_quarter', (f, s, sw) => (
          <path d="M224 352 L256 352 L252 408 L226 408 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Trunk Lid & Rear Spoiler */}
        {renderRegion('trunk_lid', (f, s, sw) => (
          <path d="M98 362 L222 362 L224 406 L96 406 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {renderRegion('rear_spoiler', (f, s, sw) => (
          <rect x="92" y="408" width="136" height="12" rx="4" fill={f} stroke={s} strokeWidth={sw} />
        ))}

        {/* Rear Bumper */}
        {renderRegion('rear_bumper', (f, s, sw) => (
          <path d="M74 422 L246 422 L238 446 C220 454, 100 454, 82 446 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
      </svg>
    );
  }

  if (view === 'front') {
    return (
      <svg viewBox="0 0 360 230" className="w-full max-w-[340px] mx-auto select-none">
        {/* Wheels */}
        <rect x="34" y="168" width="44" height="44" rx="8" className="fill-slate-700 dark:fill-slate-900" />
        <rect x="282" y="168" width="44" height="44" rx="8" className="fill-slate-700 dark:fill-slate-900" />

        {/* Roof */}
        {renderRegion('roof', (f, s, sw) => (
          <path d="M92 32 C120 22, 240 22, 268 32 L256 46 L104 46 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}

        {/* Windshield */}
        <path d="M104 48 L256 48 L274 98 L86 98 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60" strokeWidth="1.5" />

        {/* A-Pillars */}
        {renderRegion('right_a_pillar', (f, s, sw) => (
          <path d="M88 46 L104 46 L84 98 L66 98 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {renderRegion('left_a_pillar', (f, s, sw) => (
          <path d="M256 46 L272 46 L294 98 L276 98 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Mirrors */}
        {renderRegion('right_mirror', (f, s, sw) => (
          <rect x="24" y="84" width="34" height="20" rx="6" fill={f} stroke={s} strokeWidth={sw} />
        ))}
        {renderRegion('left_mirror', (f, s, sw) => (
          <rect x="302" y="84" width="34" height="20" rx="6" fill={f} stroke={s} strokeWidth={sw} />
        ))}

        {/* Hood */}
        {renderRegion('hood', (f, s, sw) => (
          <path d="M80 100 L280 100 L264 134 L96 134 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Hood Inner inset */}
        {renderRegion('hood_inner', (f, s, sw) => (
          <rect x="134" y="107" width="92" height="20" rx="4" fill={f} stroke={s} strokeWidth={sw} strokeDasharray="4 2" />
        ))}

        {/* Front Left & Right Fenders */}
        {renderRegion('front_right_fender', (f, s, sw) => (
          <path d="M36 112 L78 100 L92 136 L36 144 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {renderRegion('front_left_fender', (f, s, sw) => (
          <path d="M282 100 L324 112 L324 144 L268 136 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Headlights decorative */}
        <path d="M44 128 L88 134 L84 148 L42 146 Z" className="fill-amber-200/40 stroke-slate-400" strokeWidth="1" />
        <path d="M272 134 L316 128 L318 146 L276 148 Z" className="fill-amber-200/40 stroke-slate-400" strokeWidth="1" />

        {/* Front Grille */}
        {renderRegion('front_grille', (f, s, sw) => (
          <path d="M126 136 L234 136 L224 166 L136 166 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Front Bumper */}
        {renderRegion('front_bumper', (f, s, sw) => (
          <path d="M32 148 L124 148 L134 170 L226 170 L236 148 L328 148 L326 190 C300 198, 60 198, 34 190 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
      </svg>
    );
  }

  if (view === 'rear') {
    return (
      <svg viewBox="0 0 360 230" className="w-full max-w-[340px] mx-auto select-none">
        {/* Wheels */}
        <rect x="34" y="168" width="44" height="44" rx="8" className="fill-slate-700 dark:fill-slate-900" />
        <rect x="282" y="168" width="44" height="44" rx="8" className="fill-slate-700 dark:fill-slate-900" />

        {/* Roof */}
        {renderRegion('roof', (f, s, sw) => (
          <path d="M92 32 C120 22, 240 22, 268 32 L256 46 L104 46 Z" fill={f} stroke={s} strokeWidth={sw} />
        ))}

        {/* Rear Window */}
        <path d="M106 48 L254 48 L272 95 L88 95 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60" strokeWidth="1.5" />

        {/* Rear C-Pillars */}
        {renderRegion('left_c_pillar', (f, s, sw) => (
          <path d="M88 46 L104 46 L86 95 L68 95 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {renderRegion('right_c_pillar', (f, s, sw) => (
          <path d="M256 46 L272 46 L292 95 L274 95 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Rear Spoiler */}
        {renderRegion('rear_spoiler', (f, s, sw) => (
          <rect x="78" y="96" width="204" height="12" rx="4" fill={f} stroke={s} strokeWidth={sw} />
        ))}

        {/* Trunk Lid */}
        {renderRegion('trunk_lid', (f, s, sw) => (
          <path d="M94 110 L266 110 L256 156 L104 156 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Trunk Jamb / Opening inset */}
        {renderRegion('trunk_jamb', (f, s, sw) => (
          <rect x="126" y="132" width="108" height="20" rx="4" fill={f} stroke={s} strokeWidth={sw} strokeDasharray="4 2" />
        ))}

        {/* Rear Left & Right Quarters */}
        {renderRegion('rear_left_quarter', (f, s, sw) => (
          <path d="M36 108 L90 110 L98 154 L36 154 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {renderRegion('rear_right_quarter', (f, s, sw) => (
          <path d="M270 110 L324 108 L324 154 L262 154 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Taillights */}
        <rect x="44" y="122" width="46" height="16" rx="4" className="fill-rose-500/35 stroke-rose-600/60" strokeWidth="1" />
        <rect x="270" y="122" width="46" height="16" rx="4" className="fill-rose-500/35 stroke-rose-600/60" strokeWidth="1" />

        {/* Rear Bumper */}
        {renderRegion('rear_bumper', (f, s, sw) => (
          <path d="M32 158 L328 158 L324 192 C290 200, 70 200, 36 192 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}
      </svg>
    );
  }

  if (view === 'left') {
    return (
      <svg viewBox="0 0 460 250" className="w-full max-w-[420px] mx-auto select-none">
        {/* Wheels */}
        <circle cx="110" cy="154" r="30" className="fill-slate-700 dark:fill-slate-900 stroke-slate-500" strokeWidth="4" />
        <circle cx="110" cy="154" r="14" className="fill-slate-300 dark:fill-slate-600" />
        <circle cx="354" cy="154" r="30" className="fill-slate-700 dark:fill-slate-900 stroke-slate-500" strokeWidth="4" />
        <circle cx="354" cy="154" r="14" className="fill-slate-300 dark:fill-slate-600" />

        {/* Front Bumper */}
        {renderRegion('front_bumper', (f, s, sw) => (
          <path d="M22 114 L56 102 L68 150 L24 150 C18 140, 18 122, 22 114 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Hood */}
        {renderRegion('hood', (f, s, sw) => (
          <path d="M56 100 L146 84 L146 96 L58 108 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Front Left Fender */}
        {renderRegion('front_left_fender', (f, s, sw) => (
          <path d="M58 106 L146 96 L154 150 L144 150 A34 34 0 0 0 76 150 L68 150 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Front Left Wheel Arch */}
        {renderRegion('front_left_arch', (f, s, sw) => (
          <path d="M68 150 A42 42 0 0 1 152 150 L142 150 A32 32 0 0 0 78 150 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Left A-Pillar */}
        {renderRegion('left_a_pillar', (f, s, sw) => (
          <path d="M148 82 L200 44 L210 52 L162 84 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Roof */}
        {renderRegion('roof', (f, s, sw) => (
          <path d="M202 44 L318 44 L314 52 L208 52 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Left C-Pillar */}
        {renderRegion('left_c_pillar', (f, s, sw) => (
          <path d="M318 44 L366 80 L346 84 L312 52 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Windows */}
        <path d="M168 82 L208 54 L244 54 L244 82 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60" strokeWidth="1" />
        <path d="M250 54 L310 54 L340 82 L250 82 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60" strokeWidth="1" />

        {/* Front Left Door */}
        {renderRegion('front_left_door', (f, s, sw) => (
          <path d="M150 86 L246 86 L246 146 L156 146 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Left Mirror */}
        {renderRegion('left_mirror', (f, s, sw) => (
          <rect x="160" y="76" width="22" height="14" rx="5" fill={f} stroke={s} strokeWidth={sw} />
        ))}

        {/* Rear Left Door */}
        {renderRegion('rear_left_door', (f, s, sw) => (
          <path d="M250 86 L334 86 L316 146 L250 146 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Left Sill */}
        {renderRegion('left_sill', (f, s, sw) => (
          <rect x="150" y="148" width="166" height="12" rx="3" fill={f} stroke={s} strokeWidth={sw} />
        ))}

        {/* Rear Left Quarter */}
        {renderRegion('rear_left_quarter', (f, s, sw) => (
          <path d="M338 86 L402 88 L400 132 L388 150 A34 34 0 0 0 320 150 L318 146 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Rear Left Wheel Arch */}
        {renderRegion('rear_left_arch', (f, s, sw) => (
          <path d="M312 150 A42 42 0 0 1 396 150 L386 150 A32 32 0 0 0 322 150 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Trunk Lid */}
        {renderRegion('trunk_lid', (f, s, sw) => (
          <path d="M368 80 L414 88 L404 100 L360 92 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Rear Bumper */}
        {renderRegion('rear_bumper', (f, s, sw) => (
          <path d="M402 104 L434 108 C440 120, 440 140, 430 150 L392 150 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ))}

        {/* Door Jambs / Openings Schematic Strip */}
        <line x1="120" y1="194" x2="344" y2="194" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
        {renderRegion('front_left_jamb', (f, s, sw) => (
          <path
            d="M150 202 L226 202 L226 242 L138 242 Z M156 208 L148 236 L218 236 L218 208 Z"
            fill={f}
            fillRule="evenodd"
            stroke={s}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        ))}
        {renderRegion('rear_left_jamb', (f, s, sw) => (
          <path
            d="M236 202 L322 202 L308 242 L236 242 Z M244 208 L244 236 L300 236 L312 208 Z"
            fill={f}
            fillRule="evenodd"
            stroke={s}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        ))}
      </svg>
    );
  }

  // Right view (car facing RIGHT)
  return (
    <svg viewBox="0 0 460 250" className="w-full max-w-[420px] mx-auto select-none">
      {/* Wheels */}
      <circle cx="106" cy="154" r="30" className="fill-slate-700 dark:fill-slate-900 stroke-slate-500" strokeWidth="4" />
      <circle cx="106" cy="154" r="14" className="fill-slate-300 dark:fill-slate-600" />
      <circle cx="350" cy="154" r="30" className="fill-slate-700 dark:fill-slate-900 stroke-slate-500" strokeWidth="4" />
      <circle cx="350" cy="154" r="14" className="fill-slate-300 dark:fill-slate-600" />

      {/* Rear Bumper */}
      {renderRegion('rear_bumper', (f, s, sw) => (
        <path d="M26 108 L58 104 L68 150 L30 150 C20 140, 20 120, 26 108 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Trunk Lid */}
      {renderRegion('trunk_lid', (f, s, sw) => (
        <path d="M46 88 L92 80 L100 92 L56 100 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Rear Right Quarter */}
      {renderRegion('rear_right_quarter', (f, s, sw) => (
        <path d="M58 88 L122 86 L142 146 L140 150 A34 34 0 0 0 72 150 L60 132 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Fuel Door on Rear Right Quarter */}
      {renderRegion('fuel_door', (f, s, sw) => (
        <rect x="86" y="96" width="20" height="14" rx="3" fill={f} stroke={s} strokeWidth={sw} />
      ))}

      {/* Rear Right Wheel Arch */}
      {renderRegion('rear_right_arch', (f, s, sw) => (
        <path d="M64 150 A42 42 0 0 1 148 150 L138 150 A32 32 0 0 0 74 150 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Right C-Pillar */}
      {renderRegion('right_c_pillar', (f, s, sw) => (
        <path d="M94 80 L142 44 L148 52 L114 84 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Roof */}
      {renderRegion('roof', (f, s, sw) => (
        <path d="M142 44 L260 44 L254 52 L148 52 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Right A-Pillar */}
      {renderRegion('right_a_pillar', (f, s, sw) => (
        <path d="M260 44 L312 82 L298 84 L254 52 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Windows */}
      <path d="M120 82 L150 54 L210 54 L210 82 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60" strokeWidth="1" />
      <path d="M216 54 L252 54 L292 82 L216 82 Z" className="fill-sky-900/15 dark:fill-sky-300/10 stroke-slate-400/60" strokeWidth="1" />

      {/* Rear Right Door */}
      {renderRegion('rear_right_door', (f, s, sw) => (
        <path d="M126 86 L210 86 L210 146 L144 146 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Front Right Door */}
      {renderRegion('front_right_door', (f, s, sw) => (
        <path d="M214 86 L310 86 L304 146 L214 146 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Right Mirror */}
      {renderRegion('right_mirror', (f, s, sw) => (
        <rect x="278" y="76" width="22" height="14" rx="5" fill={f} stroke={s} strokeWidth={sw} />
      ))}

      {/* Right Sill */}
      {renderRegion('right_sill', (f, s, sw) => (
        <rect x="144" y="148" width="166" height="12" rx="3" fill={f} stroke={s} strokeWidth={sw} />
      ))}

      {/* Front Right Fender */}
      {renderRegion('front_right_fender', (f, s, sw) => (
        <path d="M314 96 L402 106 L392 150 L384 150 A34 34 0 0 0 316 150 L306 150 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Front Right Wheel Arch */}
      {renderRegion('front_right_arch', (f, s, sw) => (
        <path d="M308 150 A42 42 0 0 1 392 150 L382 150 A32 32 0 0 0 318 150 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Hood */}
      {renderRegion('hood', (f, s, sw) => (
        <path d="M314 84 L404 100 L402 108 L314 96 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Front Bumper */}
      {renderRegion('front_bumper', (f, s, sw) => (
        <path d="M404 102 L438 114 C442 122, 442 140, 436 150 L392 150 Z" fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
      ))}

      {/* Door Jambs / Openings Schematic Strip */}
      <line x1="116" y1="194" x2="340" y2="194" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
      {renderRegion('rear_right_jamb', (f, s, sw) => (
        <path
          d="M138 202 L224 202 L224 242 L152 242 Z M148 208 L160 236 L216 236 L216 208 Z"
          fill={f}
          fillRule="evenodd"
          stroke={s}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      ))}
      {renderRegion('front_right_jamb', (f, s, sw) => (
        <path
          d="M234 202 L310 202 L322 242 L234 242 Z M242 208 L242 236 L312 236 L304 208 Z"
          fill={f}
          fillRule="evenodd"
          stroke={s}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
};

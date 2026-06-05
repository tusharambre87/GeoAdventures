import { useState } from "react";

const C = {
  orange:    '#E8692A',
  orangeLt:  '#FDF0E9',
  bg:        '#F5F2EE',
  card:      '#FFFFFF',
  deep:      '#1A1F2E',
  muted:     '#8A8FA8',
  border:    'rgba(26,31,46,0.09)',
  borderMed: 'rgba(26,31,46,0.16)',
} as const;

type PaceOption  = 'relaxed' | 'balanced' | 'packed';
type MealsOption = 'lunch-stop' | 'snacks-only' | 'keep';

const PACE_OPTIONS: Array<{ value: PaceOption; label: string; desc: string }> = [
  { value: 'relaxed',  label: 'Relaxed',  desc: 'Removes one lower-priority stop if you have more than 3' },
  { value: 'balanced', label: 'Balanced', desc: 'Keeps your plan as-is' },
  { value: 'packed',   label: 'Packed',   desc: 'Noted — no stops are added automatically' },
];

const MEAL_OPTIONS: Array<{ value: MealsOption; label: string; desc: string }> = [
  { value: 'lunch-stop',  label: 'Add a lunch stop', desc: 'Inserts a lunch break stop at mid-day if none exists' },
  { value: 'snacks-only', label: 'Snacks only',      desc: 'Removes all unvisited meal stops' },
  { value: 'keep',        label: 'Keep as is',       desc: 'No change to meal stops' },
];

export default function TripPreferencesSheetPreview() {
  const [selectedPace,  setSelectedPace]  = useState<PaceOption>('balanced');
  const [selectedMeals, setSelectedMeals] = useState<MealsOption>('keep');

  return (
    <div style={{
      minHeight:       '100vh',
      backgroundColor: 'rgba(15,18,30,0.55)',
      display:         'flex',
      alignItems:      'flex-end',
      justifyContent:  'center',
      fontFamily:      "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      <div style={{
        backgroundColor:      C.card,
        borderTopLeftRadius:  24,
        borderTopRightRadius: 24,
        width:                '100%',
        maxWidth:             402,
        paddingBottom:        34,
        boxShadow:            '0 -8px 40px rgba(0,0,0,0.18)',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 36, height: 4, backgroundColor: 'rgba(26,31,46,0.15)', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{ padding: '0 20px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: C.deep, letterSpacing: -0.3 }}>
            Adjust your trip
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3, fontWeight: 400 }}>
            Changes apply immediately to remaining stops
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ padding: '20px 20px 0' }}>
          {/* TODAY'S PACE */}
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: 0.6, marginBottom: 10 }}>
            TODAY'S PACE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PACE_OPTIONS.map(opt => {
              const selected = selectedPace === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelectedPace(opt.value)}
                  style={{
                    border:          `1.5px solid ${selected ? C.orange : C.borderMed}`,
                    borderRadius:    12,
                    padding:         '12px 14px',
                    backgroundColor: selected ? C.orangeLt : C.bg,
                    textAlign:       'left',
                    cursor:          'pointer',
                    transition:      'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: selected ? C.orange : C.deep }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: selected ? '#C4561E' : C.muted, marginTop: 3 }}>
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* MEAL STOPS */}
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: 0.6, margin: '24px 0 10px' }}>
            MEAL STOPS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MEAL_OPTIONS.map(opt => {
              const selected = selectedMeals === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelectedMeals(opt.value)}
                  style={{
                    border:          `1.5px solid ${selected ? C.orange : C.borderMed}`,
                    borderRadius:    12,
                    padding:         '12px 14px',
                    backgroundColor: selected ? C.orangeLt : C.bg,
                    textAlign:       'left',
                    cursor:          'pointer',
                    transition:      'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: selected ? C.orange : C.deep }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: selected ? '#C4561E' : C.muted, marginTop: 3 }}>
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ height: 24 }} />
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px 0', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={{
            backgroundColor: C.orange,
            border:          'none',
            borderRadius:    14,
            padding:         '15px 0',
            width:           '100%',
            color:           '#FFFFFF',
            fontWeight:      700,
            fontSize:        15,
            cursor:          'pointer',
            fontFamily:      'inherit',
          }}>
            Apply changes →
          </button>
          <button style={{
            background:  'none',
            border:      'none',
            color:       C.muted,
            fontWeight:  500,
            fontSize:    14,
            cursor:      'pointer',
            padding:     '6px 0',
            fontFamily:  'inherit',
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

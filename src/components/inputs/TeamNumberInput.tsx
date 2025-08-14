import { useEffect } from 'react';
import { Input } from '../ui/input';
import { useQRScoutState, updateValue, useFieldValue, getFieldValue } from '@/store/store';

export function TeamNumberInput() {
  const teamNumber = useQRScoutState(state => {
    const field = state.fieldValues.find(f => f.code === 'team');
    return field?.value ?? '';
  });

  return (
    <Input
      type="text"
      value={teamNumber}
      onChange={e => updateValue('team', e.target.value)}
      placeholder="Enter team number"
    />
  );
}

export function useAutoUpdateTeamNumber(rows: any[]) {
  const robotCode = String(useFieldValue("robot")).trim();
  const matchCode = Number(useFieldValue("match"));
  
  useEffect(() => {
    if (!rows || rows.length === 0) return;

    const header = rows[0];
    const matchRow = rows[matchCode];

    if (!matchRow) {
      console.warn(`No match row found for match number "${matchCode}"`);
      return;
    }

    const robotIndex = header.findIndex((h: string) => h === robotCode);

    if (robotIndex === -1) {
      console.warn(`Robot code "${robotCode}" not found in header`);
      return;
    }

    const teamNumberRaw = matchRow[robotIndex] ?? "";
    const teamNumber = Number(teamNumberRaw);

    updateValue("team", teamNumber);
  }, [
    rows,
    getFieldValue("robot"), // dependency: robot changes
    getFieldValue("match"), // dependency: match changes
  ]);
}

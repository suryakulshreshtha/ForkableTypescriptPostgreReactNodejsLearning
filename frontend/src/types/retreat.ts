export type RetreatType = 'Progressive' | 'Week Long' | 'Advanced';

export interface Retreat {
  id: number;
  title: string;
  location: string;
  retreat_type: RetreatType;
  start_date: string;
  end_date: string;
  capacity: number;
  registered_count: number;
  created_at: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  currency: string;
  status: 'in_progress' | 'achieved' | 'abandoned';
  notes?: string;
  currentValue: number;
  progressPercent: number;
  amountRemaining: number;
  daysRemaining: number;
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalCreate {
  name: string;
  targetAmount: number;
  targetDate: string;
  currency?: string;
  status?: 'in_progress' | 'achieved' | 'abandoned';
  notes?: string;
}

export interface GoalUpdate {
  name?: string;
  targetAmount?: number;
  targetDate?: string;
  currency?: string;
  status?: 'in_progress' | 'achieved' | 'abandoned';
  notes?: string;
}

export interface GoalsSummary {
  totalTargetAmount: number;
  totalCurrentValue: number;
  overallProgressPercent: number;
  goalCount: number;
  closestGoalId?: string;
  closestGoalName?: string;
  closestGoalProgress?: number;
}

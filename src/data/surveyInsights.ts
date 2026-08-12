export type SurveyInsight = {
  statement: string
  evidence: string
  questionNumber?: number
  respondentCount?: number
}

// Add only verified findings here after the team has reviewed the original survey data.
export const surveyInsights: SurveyInsight[] = []

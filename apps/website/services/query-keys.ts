export const queryKeys = {
  session: ["session"] as const,
  entitlement: (userId: string) => ["entitlement", userId] as const,
  lessonCount: (userId: string) => ["lesson-count", userId] as const,
};

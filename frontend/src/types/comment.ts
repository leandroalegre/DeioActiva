export interface WorkItemComment {
  id: string;
  workItemId: string;
  authorId: string;
  author: { id: string; fullName: string; email: string };
  text: string;
  createdAt: string;
}

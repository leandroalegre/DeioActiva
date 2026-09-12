export interface WorkItemComment {
  id: string;
  workItemId: string;
  authorId: string;
  author: { id: string; fullName: string; email: string };
  text: string;
  // Fecha de seguimiento opcional del comentario (distinta del dueDate de la tarea): permite
  // marcar un pendiente puntual sobre lo que dice el comentario sin crear una tarea nueva.
  dueDate?: string | null;
  resolved: boolean;
  createdAt: string;
}

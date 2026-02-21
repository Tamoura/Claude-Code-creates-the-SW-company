export interface PostResponse {
  id: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    headlineEn: string | null;
  };
  content: string;
  textDirection: string;
  likeCount: number;
  commentCount: number;
  isLikedByMe: boolean;
  createdAt: Date;
}

export interface CommentResponse {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  textDirection: string;
  createdAt: Date;
}

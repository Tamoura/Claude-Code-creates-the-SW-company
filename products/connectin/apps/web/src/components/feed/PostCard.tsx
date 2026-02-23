"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, MessageCircle, Send } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatRelativeTime } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import type { Post } from "@/types";

interface CommentData {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
}

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onToggleLike: (postId: string, isLiked: boolean) => void;
  onEdit?: (postId: string, content: string) => Promise<boolean>;
  onDelete?: (postId: string) => Promise<boolean>;
}

export function PostCard({ post, currentUserId, onToggleLike, onEdit, onDelete }: PostCardProps) {
  const { t } = useTranslation("common");
  const { author, content, textDirection, createdAt, likeCount, commentCount, isLikedByMe } = post;
  const isOwner = currentUserId === author.userId;

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(commentCount);

  const dir = textDirection === "rtl" ? "rtl" : textDirection === "ltr" ? "ltr" : undefined;

  async function handleSaveEdit() {
    if (!onEdit || !editContent.trim()) return;
    setIsSavingEdit(true);
    const ok = await onEdit(post.id, editContent.trim());
    if (ok) setIsEditing(false);
    setIsSavingEdit(false);
  }

  async function handleDelete() {
    if (!onDelete) return;
    setIsDeleting(true);
    await onDelete(post.id);
    setIsDeleting(false);
  }

  async function handleToggleComments() {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setShowComments(true);
    setCommentsLoading(true);
    try {
      const res = await apiClient.get<CommentData[]>(`/feed/posts/${post.id}/comments`);
      if (res.success && res.data) {
        setComments(res.data as CommentData[]);
      }
    } catch {
      // silently fail
    } finally {
      setCommentsLoading(false);
    }
  }

  async function handlePostComment() {
    if (!commentText.trim()) return;
    setIsPostingComment(true);
    try {
      const res = await apiClient.post<CommentData>(`/feed/posts/${post.id}/comment`, {
        content: commentText.trim(),
      });
      if (res.success && res.data) {
        setComments((prev) => [...prev, res.data as CommentData]);
        setCommentText("");
        setLocalCommentCount((c) => c + 1);
      }
    } catch {
      // silently fail
    } finally {
      setIsPostingComment(false);
    }
  }

  return (
    <article
      className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md hover:-translate-y-0.5 transition-all duration-[180ms]"
      aria-label={`Post by ${author.displayName}`}
    >
      {/* Author row */}
      <div className="flex items-center gap-3">
        <UserAvatar displayName={author.displayName} avatarUrl={author.avatarUrl} size="md" />
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100 text-sm leading-snug">
            {author.displayName}
          </p>
          {author.headline && (
            <p className="truncate text-xs text-neutral-500 leading-snug">{author.headline}</p>
          )}
          <p className="text-xs text-neutral-500 mt-0.5">{formatRelativeTime(createdAt)}</p>
        </div>

        {/* Owner actions */}
        {isOwner && !isEditing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setEditContent(content); setIsEditing(true); }}
              aria-label={t("feed.editPost")}
              className="rounded-full p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label={t("feed.deletePost")}
              className="rounded-full p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mt-3 rounded-[10px] bg-red-50 dark:bg-red-900/20 p-3 flex items-center justify-between gap-3">
          <p className="text-sm text-red-700 dark:text-red-400">{t("feed.confirmDeletePost")}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="rounded-full border border-neutral-300 dark:border-neutral-600 px-3 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 disabled:opacity-50"
            >
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
            >
              {isDeleting ? t("actions.loading") : t("actions.delete")}
            </button>
          </div>
        </div>
      )}

      {/* Post content or edit form */}
      {isEditing ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            maxLength={3000}
            className="w-full resize-none rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSavingEdit}
              className="rounded-full border border-neutral-300 dark:border-neutral-600 px-4 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 disabled:opacity-50"
            >
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveEdit()}
              disabled={isSavingEdit || !editContent.trim()}
              className="rounded-full bg-primary-600 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {isSavingEdit ? t("actions.saving") : t("actions.save")}
            </button>
          </div>
        </div>
      ) : (
        <p
          dir={dir}
          className="mt-3 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed"
        >
          {content}
        </p>
      )}

      {/* Engagement actions */}
      <div className="mt-4 flex items-center gap-5 border-t border-neutral-100 dark:border-white/5 pt-3">
        {/* Like button */}
        <button
          type="button"
          onClick={() => onToggleLike(post.id, isLikedByMe)}
          aria-pressed={isLikedByMe}
          aria-label={isLikedByMe ? "Unlike post" : "Like post"}
          className={[
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
            "hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-[180ms]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
            isLikedByMe
              ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600"
              : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5",
          ].join(" ")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill={isLikedByMe ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
          <span>{likeCount > 0 ? likeCount : "Like"}</span>
        </button>

        {/* Comment toggle button */}
        <button
          type="button"
          onClick={() => void handleToggleComments()}
          aria-label={`${localCommentCount} comments`}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-[180ms]"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{localCommentCount > 0 ? localCommentCount : t("actions.comment")}</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 border-t border-neutral-100 dark:border-white/5 pt-3 space-y-3">
          {commentsLoading ? (
            <p className="text-xs text-neutral-500">{t("actions.loading")}</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-neutral-500">{t("feed.noComments")}</p>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <UserAvatar displayName={c.authorName} avatarUrl={c.avatarUrl} size="sm" />
                  <div className="flex-1 rounded-[10px] bg-[#F1F5F9] dark:bg-white/5 px-3 py-2">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {c.authorName}
                    </p>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5">
                      {c.content}
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-1">
                      {formatRelativeTime(c.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handlePostComment(); } }}
              placeholder={t("feed.writeComment")}
              maxLength={1000}
              disabled={isPostingComment}
              className="flex-1 rounded-full border-0 bg-[#F1F5F9] dark:bg-white/5 px-4 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handlePostComment()}
              disabled={isPostingComment || !commentText.trim()}
              aria-label={t("actions.submit")}
              className="rounded-full bg-primary-600 p-2 text-white disabled:opacity-60 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-[180ms]"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

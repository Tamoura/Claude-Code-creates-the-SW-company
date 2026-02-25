"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Hash } from "lucide-react";
import { apiClient } from "@/lib/api";
import { PostCard } from "@/components/feed/PostCard";
import type { Post } from "@/types";

/**
 * Hashtag feed page.
 * Shows all posts containing the given hashtag.
 */
export default function HashtagPage() {
  const params = useParams();
  const tag = typeof params?.tag === "string" ? params.tag : "";

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tag) return;
    let cancelled = false;
    setIsLoading(true);
    async function fetchPosts() {
      const res = await apiClient.get<Post[]>(`/hashtags/${tag}`);
      if (cancelled) return;
      if (res.success && res.data) {
        setPosts(res.data as Post[]);
      } else {
        setError("Failed to load posts");
      }
      setIsLoading(false);
    }
    fetchPosts();
    return () => { cancelled = true; };
  }, [tag]);

  function handleToggleLike(_postId: string, _isLiked: boolean) {
    // TODO: wire up like toggle
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-6 shadow-apple-md">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
            <Hash className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              #{tag}
            </h1>
            <p className="text-sm text-neutral-500">{posts.length} posts</p>
          </div>
        </div>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div
          role="status"
          aria-busy="true"
          className="flex items-center justify-center py-16"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : error ? (
        <p className="text-center text-sm text-red-600 py-8">{error}</p>
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-neutral-500 py-8">No posts yet for #{tag}</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onToggleLike={handleToggleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}

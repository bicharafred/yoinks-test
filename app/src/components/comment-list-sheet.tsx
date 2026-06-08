import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import ClapsIcon from "@/assets/icons/claps.svg";
import SendIcon from "@/assets/icons/share.svg";
import CloseIcon from "@/assets/icons/x.small.svg";
import type { Author, Comment, Moment } from "@/gql/graphql";
import { useComments } from "@/hooks/useComments";
import { getVisitorProfilePush } from "@/navigation/author-profile-route-params";
import { APP_TAB_PROFILE_HREF } from "@/navigation/app-tabs.config";
import { BottomSheet } from "./bottom-sheet";

const MAX_COMMENT_LENGTH = 500;

// ── Mention parsing ────────────────────────────────────────────────────────────
type Segment = { type: "text" | "mention"; value: string };

// Matches @handle only when preceded by start-of-string or whitespace.
// Group 1 captures optional leading whitespace; group 2 captures the @handle.
const MENTION_RE = /(?:^|\s)(@[a-zA-Z0-9._]{1,30})/g;

function parseCommentSegments(text: string): Segment[] {
  const result: Segment[] = [];
  let lastEnd = 0;
  MENTION_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MENTION_RE.exec(text)) !== null) {
    const fullMatch = match[0]; // may include a leading space
    const mention = match[1]; // just "@handle"
    const mentionStart = match.index + fullMatch.length - mention.length;
    if (mentionStart > lastEnd) {
      result.push({ type: "text", value: text.slice(lastEnd, mentionStart) });
    }
    result.push({ type: "mention", value: mention });
    lastEnd = match.index + fullMatch.length;
  }
  if (lastEnd < text.length) {
    result.push({ type: "text", value: text.slice(lastEnd) });
  }
  return result;
}

interface CommentTextProps {
  text: string;
  onMentionPress: (mention: string) => void;
}

const CommentText = ({ text, onMentionPress }: CommentTextProps) => {
  const segments = parseCommentSegments(text);
  return (
    <Text style={styles.commentText}>
      {segments.map((seg, i) =>
        seg.type === "mention" ? (
          <Text key={i} style={styles.mentionText} onPress={() => onMentionPress(seg.value)}>
            {seg.value}
          </Text>
        ) : (
          <Text key={i}>{seg.value}</Text>
        ),
      )}
    </Text>
  );
};

// ── Reply type ─────────────────────────────────────────────────────────────────
// A Comment with a guaranteed non-null parentCommentId.
// Replies are now served by the server via commentsByMoment (same collection as
// top-level comments) and derived in the sheet from the comments state.
type Reply = Comment & { parentCommentId: string };

// ── Shared helper ──────────────────────────────────────────────────────────────
function getRelativeTime(createdAt: number): string {
  const diff = Math.floor(Date.now() / 1000) - createdAt;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── ReplyItem ──────────────────────────────────────────────────────────────────
type ReplyItemProps = {
  reply: Reply;
  onMentionPress: (mention: string) => void;
  onAuthorPress?: (author: Reply["author"]) => void;
};

const ReplyItem = ({ reply, onMentionPress, onAuthorPress }: ReplyItemProps) => {
  const { theme } = useUnistyles();
  const [clapCount, setClapCount] = useState(0);
  const hasClapped = clapCount > 0;

  return (
    <View style={styles.replyRow}>
      {/* Spacer: 40px = parent avatar width, aligns reply under parent text */}
      <View style={styles.replyIndent} />
      <Pressable onPress={() => onAuthorPress?.(reply.author)} hitSlop={4}>
        <Image
          source={
            reply.author.avatar
              ? { uri: reply.author.avatar }
              : require("@/assets/images/avatar.png")
          }
          style={styles.replyAvatar}
          contentFit="cover"
        />
      </Pressable>
      <View style={styles.commentBody}>
        <View style={styles.nameRow}>
          <Pressable onPress={() => onAuthorPress?.(reply.author)}>
            <Text style={styles.authorName} numberOfLines={1}>
              {reply.author.name}
            </Text>
          </Pressable>
          <Text style={styles.timestamp}>{getRelativeTime(reply.createdAt)}</Text>
        </View>
        <CommentText text={reply.text} onMentionPress={onMentionPress} />
      </View>
      <Pressable
        onPress={() => setClapCount((c) => c + 1)}
        style={styles.clapButton}
        accessibilityRole="button"
        accessibilityLabel="Clap for this reply"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ClapsIcon
          width={18}
          height={18}
          color={
            hasClapped
              ? theme.colors.foundation.foreground.brand.tertiary
              : theme.colors.foundation.foreground.tertiary
          }
        />
        {hasClapped && <Text style={styles.clapCount}>{clapCount}</Text>}
      </Pressable>
    </View>
  );
};

// ── CommentItem ────────────────────────────────────────────────────────────────
// Expanded/collapsed state is controlled by the parent (CommentListSheet) so
// it can auto-expand a comment when a new reply is submitted to it.
type CommentItemProps = {
  comment: Comment;
  replies: Reply[];
  repliesExpanded: boolean;
  onToggleReplies: () => void;
  onReply: (comment: Comment) => void;
  onMentionPress: (mention: string) => void;
  onAuthorPress?: (author: Comment["author"]) => void;
};

const CommentItem = ({
  comment,
  replies,
  repliesExpanded,
  onToggleReplies,
  onReply,
  onMentionPress,
  onAuthorPress,
}: CommentItemProps) => {
  const { theme } = useUnistyles();
  const [clapCount, setClapCount] = useState(0);
  const hasClapped = clapCount > 0;
  const hasReplies = replies.length > 0;

  return (
    <View style={styles.commentContainer}>
      <View style={styles.commentRow}>
        <Pressable onPress={() => onAuthorPress?.(comment.author)} hitSlop={4}>
          <Image
            source={
              comment.author?.avatar
                ? { uri: comment.author.avatar }
                : require("@/assets/images/avatar.png")
            }
            style={styles.avatar}
            contentFit="cover"
          />
        </Pressable>

        <View style={styles.commentBody}>
          <View style={styles.nameRow}>
            <Pressable onPress={() => onAuthorPress?.(comment.author)}>
              <Text style={styles.authorName} numberOfLines={1}>
                {comment.author?.name ?? "Unknown"}
              </Text>
            </Pressable>
            <Text style={styles.timestamp}>
              {getRelativeTime(comment.createdAt)}
            </Text>
          </View>
          <CommentText text={comment.text} onMentionPress={onMentionPress} />

          {/* Reply + view-replies actions row */}
          <View style={styles.commentActions}>
            <Pressable
              onPress={() => onReply(comment)}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Reply to ${comment.author?.name ?? "comment"}`}
            >
              <Text style={styles.replyAction}>Reply</Text>
            </Pressable>

            {hasReplies && (
              <Pressable
                onPress={onToggleReplies}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel={
                  repliesExpanded ? "Hide replies" : `View ${replies.length} replies`
                }
              >
                <Text style={styles.viewReplies}>
                  {repliesExpanded
                    ? "Hide replies"
                    : `View replies (${replies.length})`}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable
          onPress={() => setClapCount((c) => c + 1)}
          style={styles.clapButton}
          accessibilityRole="button"
          accessibilityLabel="Clap for this comment"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ClapsIcon
            width={22}
            height={22}
            color={
              hasClapped
                ? theme.colors.foundation.foreground.brand.tertiary
                : theme.colors.foundation.foreground.tertiary
            }
          />
          {hasClapped && <Text style={styles.clapCount}>{clapCount}</Text>}
        </Pressable>
      </View>

      {repliesExpanded &&
        replies.map((reply) => (
          <ReplyItem
            key={reply.id}
            reply={reply}
            onMentionPress={onMentionPress}
            onAuthorPress={onAuthorPress}
          />
        ))}
    </View>
  );
};

// ── Reply mode ─────────────────────────────────────────────────────────────────
type ReplyTarget = { commentId: string; authorName: string } | null;

// ── CommentListSheet ───────────────────────────────────────────────────────────
interface CommentListSheetProps {
  visible: boolean;
  onClose: () => void;
  moment: Moment;
  currentAuthor: Pick<Author, "id" | "name" | "avatar"> | undefined;
  // Called after each successfully submitted comment or reply so the parent
  // Moment card can increment its optimistic comment count immediately.
  onCommentSubmitted?: () => void;
}

export const CommentListSheet = ({
  visible,
  onClose,
  moment,
  currentAuthor,
  onCommentSubmitted,
}: CommentListSheetProps) => {
  const { comments, isLoading, isSubmitting, nextToken, fetchComments, submitComment, submitReply } =
    useComments(moment.id);

  const [inputText, setInputText] = useState("");
  const [replyTarget, setReplyTarget] = useState<ReplyTarget>(null);
  // Keyed by commentId; controls expand/collapse for each comment's reply list.
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<string>>(new Set());

  const inputRef = useRef<TextInput>(null);
  const { theme } = useUnistyles();
  const router = useRouter();

  const authorsByHandle = useMemo(() => {
    const map: Record<string, Pick<Author, "id" | "name" | "avatar">> = {};
    if (moment.author?.id) {
      const key = (moment.author.name ?? "").split(" ")[0].toLowerCase();
      if (key) map[key] = moment.author;
    }
    for (const c of comments) {
      if (c.author?.id) {
        const key = (c.author.name ?? "").split(" ")[0].toLowerCase();
        if (key) map[key] = c.author as Pick<Author, "id" | "name" | "avatar">;
      }
    }
    return map;
  }, [comments, moment.author]);

  const handleMentionPress = useCallback(
    (mention: string) => {
      const handle = mention.slice(1).toLowerCase();
      const author = authorsByHandle[handle];
      if (author) router.push(getVisitorProfilePush(author));
    },
    [authorsByHandle, router],
  );

  const displayComments = useMemo(
    () =>
      comments.map((c) =>
        c.author?.id === currentAuthor?.id
          ? {
              ...c,
              author: {
                ...c.author,
                name: currentAuthor.name ?? c.author?.name,
                avatar: currentAuthor.avatar ?? c.author?.avatar,
              },
            }
          : c,
      ),
    [comments, currentAuthor],
  );

  const topLevelComments = useMemo(
    () => displayComments.filter((c) => !c.parentCommentId),
    [displayComments],
  );

  const repliesByParentId = useMemo<Record<string, Reply[]>>(() => {
    const map: Record<string, Reply[]> = {};
    for (const c of displayComments) {
      if (c.parentCommentId) {
        (map[c.parentCommentId] ??= []).push(c as Reply);
      }
    }
    return map;
  }, [displayComments]);

  useEffect(() => {
    if (visible) {
      fetchComments(null);
    } else {
      setInputText("");
      setReplyTarget(null);
    }
  }, [visible]);

  const handleLoadMore = () => {
    if (nextToken && !isLoading) {
      fetchComments(nextToken);
    }
  };

  // Enters reply mode: sets the target comment, pre-fills @mention, focuses input.
  const handleReply = useCallback((comment: Comment) => {
    const authorName = comment.author?.name ?? "User";
    setReplyTarget({ commentId: comment.id, authorName });
    setInputText(`@${authorName} `);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
    setInputText("");
  }, []);

  const toggleReplies = useCallback((commentId: string) => {
    setExpandedReplyIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }, []);

  const handleAuthorPress = useCallback(
    (author: Comment["author"]) => {
      if (!author?.id) return;
      if (currentAuthor?.id && author.id === currentAuthor.id) {
        router.push(APP_TAB_PROFILE_HREF);
        return;
      }
      router.push(getVisitorProfilePush(author));
    },
    [currentAuthor, router],
  );

  const handleSubmit = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !currentAuthor || isSubmitting) return;

    setInputText("");

    if (replyTarget) {
      const result = await submitReply(trimmed, currentAuthor, replyTarget.commentId);
      inputRef.current?.blur();
      if (result) {
        setExpandedReplyIds((prev) => new Set([...prev, replyTarget.commentId]));
        setReplyTarget(null);
        onCommentSubmitted?.();
      }
    } else {
      const success = await submitComment(trimmed, currentAuthor);
      inputRef.current?.blur();
      if (success) {
        onCommentSubmitted?.();
      }
    }
  };

  const canPost = inputText.trim().length > 0 && !!currentAuthor && !isSubmitting;

  const placeholder = replyTarget
    ? `Reply to ${replyTarget.authorName}...`
    : "Add a comment...";

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={0.65} keyboardAware>
      <Text style={styles.headerTitle}>Comments</Text>

      {isLoading && comments.length === 0 ? (
        <ActivityIndicator
          style={styles.loader}
          color={theme.colors.foundation.foreground.tertiary}
        />
      ) : (
        <FlatList
          data={topLevelComments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              replies={repliesByParentId[item.id] ?? []}
              repliesExpanded={expandedReplyIds.has(item.id)}
              onToggleReplies={() => toggleReplies(item.id)}
              onReply={handleReply}
              onMentionPress={handleMentionPress}
              onAuthorPress={handleAuthorPress}
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            inputText.trim().length === 0 ? (
              <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
            ) : null
          }
          ListFooterComponent={
            isLoading && comments.length > 0 ? (
              <ActivityIndicator
                style={styles.footerLoader}
                color={theme.colors.foundation.foreground.tertiary}
              />
            ) : null
          }
        />
      )}

      {/* "Replying to {name}" banner — visible only in reply mode */}
      {replyTarget && (
        <View style={styles.replyBanner}>
          <Text style={styles.replyBannerText}>
            Replying to{" "}
            <Text style={styles.replyBannerName}>{replyTarget.authorName}</Text>
          </Text>
          <Pressable
            onPress={handleCancelReply}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Cancel reply"
          >
            <CloseIcon
              width={16}
              height={16}
              color={theme.colors.foundation.foreground.tertiary}
            />
          </Pressable>
        </View>
      )}

      {/* Character counter: appears when close to the 500-char limit */}
      {inputText.length >= MAX_COMMENT_LENGTH - 50 && (
        <Text
          style={[
            styles.charCounter,
            inputText.length >= MAX_COMMENT_LENGTH - 10 && styles.charCounterWarning,
          ]}
        >
          {inputText.length}/{MAX_COMMENT_LENGTH}
        </Text>
      )}

      {/* Input row: user avatar + pill input + send button */}
      <View style={styles.inputRow}>
        <Image
          source={
            currentAuthor?.avatar
              ? { uri: currentAuthor.avatar }
              : require("@/assets/images/avatar.png")
          }
          style={styles.currentUserAvatar}
          contentFit="cover"
        />
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor={styles.placeholderColor.color}
          value={inputText}
          onChangeText={(t) => setInputText(t.slice(0, MAX_COMMENT_LENGTH))}
          maxLength={MAX_COMMENT_LENGTH}
          multiline
          textAlignVertical="top"
          blurOnSubmit={false}
        />
        {canPost && (
          <Pressable
            onPress={handleSubmit}
            style={styles.sendButton}
            accessibilityLabel={replyTarget ? "Post reply" : "Post comment"}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.common.white} />
            ) : (
              <SendIcon width={18} height={18} color={theme.colors.common.white} />
            )}
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create((theme) => ({
  headerTitle: {
    fontSize: 17, // raw — standard iOS navigation title size
    fontWeight: "700",
    color: theme.colors.foundation.foreground.primary,
    textAlign: "center",
    marginBottom: theme.spacing.normal,
  },
  loader: {
    marginTop: theme.spacing.xlarge,
  },
  listContent: {
    paddingBottom: theme.spacing.xsmall,
  },

  // ── Top-level comment ─────────────────────────────────────────────────────────
  commentContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.foundation.background.alpha10,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: theme.spacing.small,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20, // raw — half of 40 for a perfect circle
    flexShrink: 0,
    marginRight: theme.spacing.small,
  },
  commentBody: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xsmall,
    marginBottom: theme.spacing.xxsmall,
    flexWrap: "wrap",
  },
  authorName: {
    fontSize: 14, // raw
    fontWeight: "600",
    color: theme.colors.foundation.foreground.primary,
    flexShrink: 1,
  },
  timestamp: {
    fontSize: 12, // raw — de-emphasised metadata
    color: theme.colors.foundation.foreground.tertiary,
  },
  commentText: {
    fontSize: 14, // raw
    color: theme.colors.foundation.foreground.secondary,
    lineHeight: 20, // raw
  },
  mentionText: {
    color: theme.colors.foundation.foreground.brand.tertiary,
    fontWeight: "600",
  },
  // Small actions row below the comment body: "Reply" + optional "View replies"
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.normal,
    marginTop: theme.spacing.xxsmall,
  },
  // Small muted "Reply" text — matches the timestamp de-emphasis level.
  replyAction: {
    fontSize: 13, // raw — same as viewReplies for visual consistency
    fontWeight: "600",
    color: theme.colors.foundation.foreground.tertiary,
  },
  // "View replies (N)" / "Hide replies" toggle — coral accent signals interactivity.
  viewReplies: {
    fontSize: 13, // raw
    color: theme.colors.foundation.foreground.brand.tertiary,
  },
  clapButton: {
    paddingLeft: theme.spacing.small,
    paddingTop: theme.spacing.xxsmall,
    alignItems: "center",
    gap: theme.spacing.xxsmall,
  },
  clapCount: {
    fontSize: 11, // raw — small label below the icon
    color: theme.colors.foundation.foreground.tertiary,
    textAlign: "center",
  },

  // ── Reply rows ────────────────────────────────────────────────────────────────
  replyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: theme.spacing.xsmall,
    paddingBottom: theme.spacing.small,
  },
  // 40px spacer matches the parent avatar width — standard nested reply indent.
  replyIndent: {
    width: 40, // raw — must match avatar width exactly
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14, // raw — half of 28 for a perfect circle
    flexShrink: 0,
    marginRight: theme.spacing.small,
  },

  // ── Empty / footer states ─────────────────────────────────────────────────────
  emptyText: {
    textAlign: "center",
    color: theme.colors.foundation.foreground.tertiary,
    marginTop: theme.spacing.xlarge,
    fontSize: 20,
    fontWeight: "700",
  },
  footerLoader: {
    marginVertical: theme.spacing.normal,
  },

  // ── Reply mode banner ─────────────────────────────────────────────────────────
  // Appears between the list and the input row when the user is replying.
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xsmall,
    paddingVertical: theme.spacing.xsmall,
    borderTopWidth: 1,
    borderTopColor: theme.colors.foundation.background.alpha10,
  },
  replyBannerText: {
    fontSize: 13, // raw — de-emphasised, same scale as metadata text
    color: theme.colors.foundation.foreground.tertiary,
  },
  replyBannerName: {
    fontWeight: "600",
    color: theme.colors.foundation.foreground.secondary,
  },

  // ── Input row ─────────────────────────────────────────────────────────────────
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.small,
    paddingTop: theme.spacing.small,
    borderTopWidth: 1,
    borderTopColor: theme.colors.foundation.background.alpha10,
  },
  currentUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18, // raw — half of 36 for a perfect circle
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    minHeight: 40, // raw — single-line starting height
    maxHeight: 120, // raw — ~3 lines before scrolling
    borderRadius: theme.spacing.xxlarge, // 28px — pill shape
    borderWidth: 1,
    borderColor: theme.colors.foundation.background.secondary,
    paddingHorizontal: theme.spacing.normal,
    paddingTop: 10, // raw — vertical centering in multiline pill
    paddingBottom: 10, // raw — matches paddingTop
    color: theme.colors.foundation.foreground.primary,
    fontSize: 14, // raw
  },
  placeholderColor: {
    color: theme.colors.foundation.foreground.tertiary,
  },
  charCounter: {
    fontSize: 12, // raw — de-emphasised metadata scale
    color: theme.colors.foundation.foreground.tertiary,
    textAlign: "right",
    paddingHorizontal: theme.spacing.xsmall,
    paddingBottom: theme.spacing.xxsmall,
  },
  charCounterWarning: {
    color: theme.colors.foundation.error.foreground.primary,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18, // raw — circle; half of 36
    backgroundColor: theme.colors.foundation.foreground.brand.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },
}));
